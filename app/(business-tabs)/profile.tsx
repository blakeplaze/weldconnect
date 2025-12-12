import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import { Building2, MapPin, Mail, Phone, LogOut, CheckCircle, Camera, Trophy, TrendingUp, DollarSign, Globe, Lock, Star } from 'lucide-react-native';
import { geocodeCity } from '@/lib/geocoding';
import { pickImage, updateProfilePicture } from '@/lib/uploadImage';

interface Review {
  id: string;
  rating: number;
  review_text: string;
  created_at: string;
  customer: {
    full_name: string;
  };
  jobs: {
    title: string;
  };
}

interface Business {
  id: string;
  business_name: string;
  city: string;
  state: string;
  description: string | null;
  website: string | null;
  is_subscribed: boolean;
  subscription_expires_at: string | null;
  radius_miles: number;
  latitude: number | null;
  longitude: number | null;
}

interface BusinessStats {
  totalBids: number;
  jobsWon: number;
  acceptanceRate: number;
  averageBidAmount: number;
}

export default function BusinessProfile() {
  const { userProfile, session, signOut, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const [business, setBusiness] = useState<Business | null>(null);
  const [stats, setStats] = useState<BusinessStats | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (session) {
      console.log('Profile: Loading business for user', session.user.id);
      loadBusiness(session.user.id);
    } else {
      console.log('Profile: No session, stopping load');
      setLoading(false);
    }
  }, [authLoading, session]);

  const loadBusiness = async (userId: string) => {
    try {
      console.log('Profile: Querying businesses for owner_id:', userId);
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', userId)
        .maybeSingle();

      console.log('Profile: Query result:', { data, error });

      if (error) {
        console.error('Profile: Query error:', error);
        setLoading(false);
        return;
      }

      if (data) {
        setBusiness(data);
        setBusinessName(data.business_name);
        setCity(data.city);
        setState(data.state);
        setDescription(data.description || '');
        setWebsite(data.website || '');
        setRadiusMiles(data.radius_miles || 25);
        setEditing(false);
        loadBusinessStats(data.id);
        loadReviews(userId);
      } else {
        setEditing(true);
      }
    } catch (err) {
      console.error('Error loading business:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          customer:profiles!reviews_customer_id_fkey(full_name),
          jobs(title)
        `)
        .eq('business_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      setReviews(data as any || []);
    } catch (err) {
      console.error('Error loading reviews:', err);
    }
  };

  const loadBusinessStats = async (businessId: string) => {
    try {
      const { data: bids, error: bidsError } = await supabase
        .from('bids')
        .select('id, amount, job_id')
        .eq('business_id', businessId);

      if (bidsError) throw bidsError;

      const totalBids = bids?.length || 0;

      const bidAmounts = bids?.map(b => Number(b.amount)) || [];
      const averageBidAmount = bidAmounts.length > 0
        ? bidAmounts.reduce((sum, amt) => sum + amt, 0) / bidAmounts.length
        : 0;

      let jobsWon = 0;
      if (bids && bids.length > 0) {
        const bidIds = bids.map(b => b.id);
        const { data: wonJobs, error: wonJobsError } = await supabase
          .from('jobs')
          .select('id, winning_bid_id')
          .not('winning_bid_id', 'is', null)
          .in('winning_bid_id', bidIds);

        if (wonJobsError) throw wonJobsError;
        jobsWon = wonJobs?.length || 0;
      }

      const acceptanceRate = totalBids > 0 ? (jobsWon / totalBids) * 100 : 0;

      setStats({
        totalBids,
        jobsWon,
        acceptanceRate,
        averageBidAmount,
      });
    } catch (err) {
      console.error('Error loading business stats:', err);
    }
  };

  const saveBusiness = async () => {
    if (!businessName || !city || !state) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const coords = await geocodeCity(city.trim().toLowerCase(), state.trim().toUpperCase());

      if (business) {
        const { error } = await supabase
          .from('businesses')
          .update({
            business_name: businessName,
            city: city.trim().toLowerCase(),
            state: state.trim().toUpperCase(),
            description,
            website: website.trim() || null,
            radius_miles: radiusMiles,
            latitude: coords?.latitude || null,
            longitude: coords?.longitude || null,
          })
          .eq('id', business.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('businesses').insert({
          owner_id: session!.user.id,
          business_name: businessName,
          city: city.trim().toLowerCase(),
          state: state.trim().toUpperCase(),
          description,
          website: website.trim() || null,
          radius_miles: radiusMiles,
          latitude: coords?.latitude || null,
          longitude: coords?.longitude || null,
        });

        if (error) throw error;
      }

      Alert.alert('Success', 'Business profile saved successfully');
      if (session) {
        await loadBusiness(session.user.id);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save business profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async () => {
    if (!business || !session) return;

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();

      if (!authSession?.access_token) {
        Alert.alert('Error', 'You must be logged in to subscribe');
        return;
      }

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const baseUrl = Platform.OS === 'web' ? window.location.origin : 'myapp://';

      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession.access_token}`,
        },
        body: JSON.stringify({
          price_id: 'price_1SdFlq4ZBWOAXTA3OetSbVpL',
          mode: 'subscription',
          success_url: `${baseUrl}/(business-tabs)/profile?success=true`,
          cancel_url: `${baseUrl}/(business-tabs)/profile?canceled=true`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      if (data.url) {
        if (Platform.OS === 'web') {
          window.location.href = data.url;
        } else {
          await WebBrowser.openBrowserAsync(data.url);
        }
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      Alert.alert('Error', err.message || 'Failed to start checkout');
    }
  };

  const handleUploadProfilePicture = async () => {
    if (!session?.user.id) return;

    try {
      setUploadingImage(true);
      const image = await pickImage();

      if (image) {
        await updateProfilePicture(session.user.id, image.uri);
        await refreshProfile();
        Alert.alert('Success', 'Profile picture updated successfully');
      }
    } catch (error: any) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', error.message || 'Failed to upload profile picture');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      Alert.alert('Success', 'Password updated successfully');
      setChangingPassword(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      Alert.alert('Error', error.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/auth/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const isSubscribed =
    business?.is_subscribed &&
    business?.subscription_expires_at &&
    new Date(business.subscription_expires_at) > new Date();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarWrapper}>
          <View style={styles.avatarContainer}>
            {userProfile?.profile_picture_url ? (
              <Image
                source={{ uri: userProfile.profile_picture_url }}
                style={styles.avatarImage}
              />
            ) : (
              <Building2 size={48} color="#fff" />
            )}
          </View>
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={handleUploadProfilePicture}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Camera size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        <Text style={styles.name}>{userProfile?.full_name}</Text>
        <Text style={styles.userType}>Business Owner</Text>
        {session?.user.created_at && (
          <Text style={styles.accountDate}>
            Member since {new Date(session.user.created_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </Text>
        )}
      </View>

      {business && !editing && stats && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <Trophy size={24} color="#007AFF" />
              </View>
              <Text style={styles.statValue}>{stats.jobsWon}</Text>
              <Text style={styles.statLabel}>Jobs Won</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <TrendingUp size={24} color="#34C759" />
              </View>
              <Text style={styles.statValue}>{stats.acceptanceRate.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Acceptance Rate</Text>
            </View>

            <View style={styles.statCard}>
              <View style={styles.statIconContainer}>
                <DollarSign size={24} color="#FF9500" />
              </View>
              <Text style={styles.statValue}>${stats.averageBidAmount.toFixed(0)}</Text>
              <Text style={styles.statLabel}>Avg Bid Amount</Text>
            </View>
          </View>
        </View>
      )}

      {business && !editing && userProfile && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Reviews</Text>
          {userProfile.review_count > 0 ? (
            <>
              <View style={styles.ratingSummary}>
                <View style={styles.ratingScore}>
                  <Text style={styles.ratingNumber}>
                    {userProfile.average_rating?.toFixed(1) || '0.0'}
                  </Text>
                  <View style={styles.starsDisplay}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={20}
                        color={star <= (userProfile.average_rating || 0) ? '#FFD700' : '#CCC'}
                        fill={star <= (userProfile.average_rating || 0) ? '#FFD700' : 'none'}
                      />
                    ))}
                  </View>
                  <Text style={styles.reviewCount}>
                    Based on {userProfile.review_count} {userProfile.review_count === 1 ? 'review' : 'reviews'}
                  </Text>
                </View>
              </View>

              {reviews.length > 0 && (
                <View style={styles.reviewsList}>
                  {(reviewsExpanded ? reviews : reviews.slice(0, 1)).map((review) => (
                    <View key={review.id} style={styles.reviewCard}>
                      <View style={styles.reviewHeader}>
                        <View>
                          <Text style={styles.reviewerName}>
                            {(review.customer as any)?.full_name?.split(' ')[0] || 'Anonymous'}
                          </Text>
                          <Text style={styles.reviewJobTitle}>
                            Job: {(review.jobs as any)?.title || 'Unknown'}
                          </Text>
                        </View>
                        <View style={styles.reviewStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={14}
                              color={star <= review.rating ? '#FFD700' : '#CCC'}
                              fill={star <= review.rating ? '#FFD700' : 'none'}
                            />
                          ))}
                        </View>
                      </View>
                      {review.review_text && (
                        <Text style={styles.reviewText}>{review.review_text}</Text>
                      )}
                      <Text style={styles.reviewDate}>
                        {new Date(review.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                  ))}

                  {reviews.length > 1 && (
                    <TouchableOpacity
                      style={styles.expandButton}
                      onPress={() => setReviewsExpanded(!reviewsExpanded)}
                    >
                      <Text style={styles.expandButtonText}>
                        {reviewsExpanded
                          ? 'Show Less'
                          : `Show ${reviews.length - 1} More ${reviews.length - 1 === 1 ? 'Review' : 'Reviews'}`
                        }
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          ) : (
            <View style={styles.noReviewsCard}>
              <Star size={48} color="#CCC" />
              <Text style={styles.noReviewsText}>No reviews yet</Text>
              <Text style={styles.noReviewsSubtext}>
                Complete jobs to receive customer reviews
              </Text>
            </View>
          )}
        </View>
      )}

      {business && !editing && (
        <>
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Business Information</Text>
              <TouchableOpacity onPress={() => setEditing(true)}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Building2 size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Business Name</Text>
                  <Text style={styles.infoValue}>{business.business_name}</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <MapPin size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Location</Text>
                  <Text style={styles.infoValue}>
                    {business.city}, {business.state}
                  </Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Travel Radius</Text>
                  <Text style={styles.infoValue}>{business.radius_miles} miles</Text>
                </View>
              </View>

              {business.description && (
                <View style={styles.infoRow}>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Description</Text>
                    <Text style={styles.infoValue}>{business.description}</Text>
                  </View>
                </View>
              )}

              {business.website && (
                <View style={styles.infoRow}>
                  <Globe size={20} color="#666" />
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Website</Text>
                    <Text style={styles.infoValue}>{business.website}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            {isSubscribed ? (
              <View style={styles.subscriptionCard}>
                <CheckCircle size={32} color="#34C759" />
                <Text style={styles.subscriptionTitle}>Active Subscription</Text>
                <Text style={styles.subscriptionText}>
                  Expires:{' '}
                  {new Date(business.subscription_expires_at!).toLocaleDateString()}
                </Text>
              </View>
            ) : (
              <View style={styles.subscriptionCard}>
                <Text style={styles.subscriptionTitle}>No Active Subscription</Text>
                <Text style={styles.subscriptionText}>
                  Subscribe to access jobs and place bids
                </Text>
                <TouchableOpacity
                  style={styles.subscribeButton}
                  onPress={handleSubscribe}
                >
                  <Text style={styles.subscribeButtonText}>
                    Subscribe - $99/year
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}

      {editing && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {business ? 'Edit Business' : 'Set Up Business Profile'}
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Your Business Name"
                value={businessName}
                onChangeText={setBusinessName}
                editable={!saving}
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>City *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="City"
                  value={city}
                  onChangeText={setCity}
                  editable={!saving}
                />
              </View>
              <View style={[styles.inputGroup, styles.flex1]}>
                <Text style={styles.label}>State *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="State"
                  value={state}
                  onChangeText={setState}
                  editable={!saving}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Brief description of your services..."
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Website</Text>
              <TextInput
                style={styles.input}
                placeholder="https://your-website.com"
                value={website}
                onChangeText={setWebsite}
                keyboardType="url"
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>How far are you willing to travel?</Text>
              <View style={styles.radiusSelector}>
                {[5, 10, 25, 50].map((radius) => (
                  <TouchableOpacity
                    key={radius}
                    style={[
                      styles.radiusOption,
                      radiusMiles === radius && styles.radiusOptionSelected,
                    ]}
                    onPress={() => setRadiusMiles(radius)}
                    disabled={saving}
                  >
                    <Text
                      style={[
                        styles.radiusOptionText,
                        radiusMiles === radius && styles.radiusOptionTextSelected,
                      ]}
                    >
                      {radius} mi
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={saveBusiness}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Save Business Profile</Text>
              )}
            </TouchableOpacity>

            {business && (
              <TouchableOpacity
                onPress={() => setEditing(false)}
                disabled={saving}
              >
                <Text style={styles.cancelLink}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Mail size={20} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{session?.user.email}</Text>
            </View>
          </View>

          {userProfile?.phone && (
            <View style={styles.infoRow}>
              <Phone size={20} color="#666" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{userProfile.phone}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>

        {!changingPassword ? (
          <TouchableOpacity
            style={styles.changePasswordButton}
            onPress={() => setChangingPassword(true)}
          >
            <Lock size={20} color="#007AFF" />
            <Text style={styles.changePasswordText}>Change Password</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.passwordForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Password</Text>
              <TextInput
                style={styles.input}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor="#999"
                secureTextEntry
                editable={!updatingPassword}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor="#999"
                secureTextEntry
                editable={!updatingPassword}
              />
            </View>

            <View style={styles.passwordActions}>
              <TouchableOpacity
                style={[styles.passwordButton, styles.savePasswordButton]}
                onPress={handleChangePassword}
                disabled={updatingPassword}
              >
                {updatingPassword ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.savePasswordButtonText}>Update Password</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.passwordButton, styles.cancelPasswordButton]}
                onPress={() => {
                  setChangingPassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={updatingPassword}
              >
                <Text style={styles.cancelPasswordButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <LogOut size={20} color="#FF3B30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 24,
    paddingTop: 32,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  avatarContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  userType: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
  },
  accountDate: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 4,
    fontStyle: 'italic',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  editLink: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoContent: {
    flex: 1,
    gap: 4,
  },
  infoLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  subscriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  subscriptionText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  subscribeButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  subscribeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelLink: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF3B30',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  radiusSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  radiusOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
    alignItems: 'center',
  },
  radiusOptionSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#007AFF',
  },
  radiusOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  radiusOptionTextSelected: {
    color: '#fff',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  changePasswordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  changePasswordText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  passwordForm: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 16,
  },
  passwordActions: {
    gap: 12,
    marginTop: 8,
  },
  passwordButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  savePasswordButton: {
    backgroundColor: '#007AFF',
  },
  savePasswordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelPasswordButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  cancelPasswordButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  ratingSummary: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
  },
  ratingScore: {
    alignItems: 'center',
    gap: 12,
  },
  ratingNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  starsDisplay: {
    flexDirection: 'row',
    gap: 4,
  },
  reviewCount: {
    fontSize: 14,
    color: '#666',
  },
  reviewsList: {
    gap: 12,
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  reviewJobTitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2,
  },
  reviewText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  reviewDate: {
    fontSize: 12,
    color: '#999',
  },
  noReviewsCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 48,
    alignItems: 'center',
    gap: 12,
  },
  noReviewsText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  noReviewsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  expandButton: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 4,
  },
  expandButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#007AFF',
  },
});

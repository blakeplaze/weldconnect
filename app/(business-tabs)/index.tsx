import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { MapPin, DollarSign, X, CheckCircle } from 'lucide-react-native';
import { calculateDistance, geocodeCity } from '@/lib/geocoding';

interface Job {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  distance?: number;
  job_image_url: string | null;
  myBidAmount?: number;
}

interface Business {
  id: string;
  business_name: string;
  city: string;
  state: string;
  is_subscribed: boolean;
  subscription_expires_at: string | null;
  radius_miles: number;
  latitude: number | null;
  longitude: number | null;
}

export default function AvailableJobs() {
  const { session, loading: authLoading } = useAuth();
  const { theme } = useTheme();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [bidError, setBidError] = useState('');

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (session) {
      console.log('Available Jobs: Loading jobs for user', session.user.id);
      loadBusiness();
    } else {
      console.log('Available Jobs: No session, stopping load');
      setLoading(false);
    }
  }, [authLoading, session]);

  useFocusEffect(
    useCallback(() => {
      if (session) {
        loadBusiness();
      }
    }, [session])
  );

  const loadBidsForJobs = async (jobs: Job[], businessId: string): Promise<Job[]> => {
    try {
      const jobIds = jobs.map((job) => job.id);
      const { data: bids, error } = await supabase
        .from('bids')
        .select('job_id, amount')
        .eq('business_id', businessId)
        .in('job_id', jobIds);

      if (error) throw error;

      const bidMap = new Map<string, number>();
      bids?.forEach((bid) => {
        bidMap.set(bid.job_id, bid.amount);
      });

      return jobs.map((job) => ({
        ...job,
        myBidAmount: bidMap.get(job.id),
      }));
    } catch (err) {
      console.error('Error loading bids:', err);
      return jobs;
    }
  };

  const loadBusiness = async () => {
    try {
      console.log('Available Jobs: Loading business for user', session?.user.id);
      const { data, error } = await supabase
        .from('businesses')
        .select('*')
        .eq('owner_id', session?.user.id)
        .maybeSingle();

      console.log('Available Jobs: Business data:', data);
      console.log('Available Jobs: Business error:', error);

      if (error) throw error;
      setBusiness(data);

      if (data) {
        await loadJobs(data);
      } else {
        console.log('Available Jobs: No business found');
      }
    } catch (err) {
      console.error('Error loading business:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadJobs = async (businessData: Business) => {
    try {
      console.log('Available Jobs: Fetching jobs...');
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      console.log('Available Jobs: Raw jobs data:', data);
      console.log('Available Jobs: Jobs error:', error);

      if (error) throw error;

      let businessLat = businessData.latitude;
      let businessLon = businessData.longitude;

      console.log('Available Jobs: Business location:', { businessLat, businessLon, radius: businessData.radius_miles });

      if (!businessLat || !businessLon) {
        const coords = await geocodeCity(businessData.city, businessData.state);
        if (coords) {
          businessLat = coords.latitude;
          businessLon = coords.longitude;
          console.log('Available Jobs: Geocoded business location:', coords);
        }
      }

      if (businessLat && businessLon) {
        const jobsWithDistance = await Promise.all(
          (data || []).map(async (job) => {
            let jobLat = job.latitude;
            let jobLon = job.longitude;

            if (!jobLat || !jobLon) {
              const coords = await geocodeCity(job.city, job.state);
              if (coords) {
                jobLat = coords.latitude;
                jobLon = coords.longitude;
              }
            }

            if (jobLat && jobLon) {
              const distance = calculateDistance(
                businessLat!,
                businessLon!,
                jobLat,
                jobLon
              );
              return { ...job, distance };
            }
            return { ...job, distance: undefined };
          })
        );

        console.log('Available Jobs: Jobs with distance:', jobsWithDistance.map(j => ({ title: j.title, distance: j.distance })));

        const filteredJobs = jobsWithDistance.filter(
          (job) => job.distance !== undefined && job.distance <= businessData.radius_miles
        );

        console.log('Available Jobs: Filtered jobs (within radius):', filteredJobs.length);

        filteredJobs.sort((a, b) => (a.distance || 0) - (b.distance || 0));

        const jobsWithBids = await loadBidsForJobs(filteredJobs, businessData.id);
        setJobs(jobsWithBids);
      } else {
        console.log('Available Jobs: No business coordinates, using city fallback');
        const fallbackJobs = (data || []).filter(job =>
          job.city.toLowerCase() === businessData.city.toLowerCase()
        );
        console.log('Available Jobs: Fallback jobs:', fallbackJobs.length);
        const jobsWithBids = await loadBidsForJobs(fallbackJobs, businessData.id);
        setJobs(jobsWithBids);
      }
    } catch (err) {
      console.error('Error loading jobs:', err);
    } finally {
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (business) {
      loadJobs(business);
    }
  };

  const openBidModal = (job: Job) => {
    setSelectedJob(job);
    setBidAmount('');
    setBidNotes('');
    setBidError('');
    setShowBidModal(true);
  };

  const submitBid = async () => {
    if (!selectedJob || !business) {
      console.log('Missing selectedJob or business');
      return;
    }

    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      console.log('Invalid bid amount:', bidAmount);
      return;
    }

    console.log('Submitting bid:', {
      job_id: selectedJob.id,
      business_id: business.id,
      amount: parseFloat(bidAmount),
      notes: bidNotes,
    });

    setSubmittingBid(true);
    try {
      // Check if business already has a bid for this job
      const { data: existingBid, error: checkError } = await supabase
        .from('bids')
        .select('id')
        .eq('job_id', selectedJob.id)
        .eq('business_id', business.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingBid) {
        setBidError('You have already submitted a bid for this job. You cannot submit another bid.');
        setSubmittingBid(false);
        return;
      }

      const { data, error } = await supabase.from('bids').insert({
        job_id: selectedJob.id,
        business_id: business.id,
        amount: parseFloat(bidAmount),
        notes: bidNotes,
      }).select();

      console.log('Bid insert result:', { data, error });

      if (error) throw error;

      const { error: updateError } = await supabase
        .from('jobs')
        .update({ status: 'bidding' })
        .eq('id', selectedJob.id);

      console.log('Job status update result:', { updateError });

      if (updateError) throw updateError;

      console.log('Bid submitted successfully, showing success modal');
      setShowBidModal(false);
      setShowSuccessModal(true);
      onRefresh();

      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2500);
    } catch (err: any) {
      console.error('Error submitting bid:', err);
      alert('Error: ' + (err.message || 'Failed to submit bid'));
    } finally {
      setSubmittingBid(false);
    }
  };

  const isSubscribed =
    business?.is_subscribed &&
    business?.subscription_expires_at &&
    new Date(business.subscription_expires_at) > new Date();

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!business) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No business profile found</Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
          Please set up your business profile
        </Text>
      </View>
    );
  }

  if (!isSubscribed) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>Subscription Required</Text>
        <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
          Subscribe to access jobs and place bids
        </Text>
      </View>
    );
  }

  const renderJob = ({ item }: { item: Job }) => (
    <View style={[styles.jobCard, { backgroundColor: theme.colors.card }]}>
      {item.job_image_url && (
        <Image source={{ uri: item.job_image_url }} style={styles.jobImage} />
      )}
      <Text style={[styles.jobTitle, { color: theme.colors.text }]}>{item.title}</Text>
      <Text style={[styles.jobDescription, { color: theme.colors.textSecondary }]} numberOfLines={3}>
        {item.description}
      </Text>
      <View style={styles.jobFooter}>
        <View style={styles.locationContainer}>
          <MapPin size={16} color={theme.colors.textSecondary} />
          <View>
            <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
              {item.city}, {item.state}
            </Text>
            {item.distance !== undefined && (
              <Text style={[styles.distanceText, { color: theme.colors.primary }]}>
                {item.distance.toFixed(1)} miles away
              </Text>
            )}
          </View>
        </View>
        <TouchableOpacity
          style={[
            styles.bidButton,
            { backgroundColor: theme.colors.primary },
            item.myBidAmount !== undefined && { backgroundColor: theme.colors.textSecondary, opacity: 0.7 },
          ]}
          onPress={() => openBidModal(item)}
          disabled={item.myBidAmount !== undefined}
        >
          <DollarSign size={16} color="#fff" />
          <Text style={styles.bidButtonText}>
            {item.myBidAmount !== undefined
              ? `$${item.myBidAmount.toFixed(2)}`
              : 'Place Bid'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={jobs}
        renderItem={renderJob}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>No jobs available</Text>
            <Text style={[styles.emptySubtext, { color: theme.colors.textSecondary }]}>
              Check back later for new opportunities in {business.city}
            </Text>
          </View>
        }
      />

      <Modal
        visible={showBidModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowBidModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Place Your Bid</Text>
              <TouchableOpacity onPress={() => setShowBidModal(false)}>
                <X size={24} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.jobTitleInModal, { color: theme.colors.textSecondary }]}>{selectedJob?.title}</Text>

            {bidError ? (
              <View style={[styles.errorContainer, { backgroundColor: theme.colors.error + '20', borderLeftColor: theme.colors.error }]}>
                <Text style={[styles.errorText, { color: theme.colors.error }]}>{bidError}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Bid Amount ($) *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.colors.input || theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="0.00"
                placeholderTextColor={theme.colors.textSecondary}
                value={bidAmount}
                onChangeText={setBidAmount}
                keyboardType="decimal-pad"
                editable={!submittingBid}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.colors.text }]}>Notes (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.colors.input || theme.colors.background, borderColor: theme.colors.border, color: theme.colors.text }]}
                placeholder="Additional details about your bid..."
                placeholderTextColor={theme.colors.textSecondary}
                value={bidNotes}
                onChangeText={setBidNotes}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                editable={!submittingBid}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.primary },
                submittingBid && styles.buttonDisabled,
              ]}
              onPress={submitBid}
              disabled={submittingBid}
            >
              {submittingBid ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Bid</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showSuccessModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.successOverlay}>
          <View style={[styles.successContent, { backgroundColor: theme.colors.card }]}>
            <CheckCircle size={64} color={theme.colors.success} />
            <Text style={[styles.successTitle, { color: theme.colors.text }]}>Bid Submitted!</Text>
            <Text style={[styles.successMessage, { color: theme.colors.textSecondary }]}>
              Your bid has been submitted successfully
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  jobCard: {
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  jobImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 8,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  jobDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  jobFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 14,
  },
  distanceText: {
    fontSize: 12,
    marginTop: 2,
  },
  bidButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bidButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  bidButtonDisabled: {
    opacity: 0.7,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  jobTitleInModal: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 20,
  },
  errorContainer: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputGroup: {
    gap: 8,
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  successOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successContent: {
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    maxWidth: 300,
    gap: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  successMessage: {
    fontSize: 16,
    textAlign: 'center',
  },
});

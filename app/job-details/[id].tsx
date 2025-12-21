import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { localDb } from '@/lib/localDb';
import { MapPin, DollarSign, Clock, CheckCircle, Award, MessageCircle, Star } from 'lucide-react-native';
import JobAwardConfirmModal from '@/components/JobAwardConfirmModal';
import JobAwardSuccessModal from '@/components/JobAwardSuccessModal';
import ReviewModal from '@/components/ReviewModal';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';

interface Job {
  id: string;
  title: string;
  description: string;
  city: string;
  state: string;
  address: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  status: string;
  winning_bid_id: string | null;
  created_at: string;
  job_image_url: string | null;
}

interface Bid {
  id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  business_id: string;
  business: {
    business_name: string;
    owner_id: string;
  };
  average_rating?: number;
  review_count?: number;
}

export default function JobDetails() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const [job, setJob] = useState<Job | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [awarding, setAwarding] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [winningBid, setWinningBid] = useState<{ businessName: string; amount: number } | undefined>();
  const [hasReview, setHasReview] = useState(false);
  const [winningBusiness, setWinningBusiness] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const loadJobDetails = async () => {
    try {
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', id)
        .single();

      if (jobError) throw jobError;
      setJob(jobData);

      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select(
          `
          id,
          amount,
          notes,
          created_at,
          business_id,
          business:businesses(business_name, owner_id)
        `
        )
        .eq('job_id', id)
        .order('amount', { ascending: true });

      if (bidsError) throw bidsError;

      const normalizedBids = await Promise.all((bidsData || []).map(async (bid: any) => {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('average_rating, review_count')
          .eq('id', Array.isArray(bid.business) ? bid.business[0].owner_id : bid.business.owner_id)
          .maybeSingle();

        return {
          ...bid,
          business: Array.isArray(bid.business) ? bid.business[0] : bid.business,
          average_rating: profileData?.average_rating || 0,
          review_count: profileData?.review_count || 0,
        };
      }));

      setBids(normalizedBids);

      // Check if there's a winning bid and get business info
      if (jobData.winning_bid_id) {
        const winningBidData = normalizedBids.find(b => b.id === jobData.winning_bid_id);
        if (winningBidData) {
          setWinningBusiness({
            id: winningBidData.business.owner_id,
            name: winningBidData.business.business_name,
          });
        }

        // Check if customer has already left a review
        const { data: reviewData } = await supabase
          .from('reviews')
          .select('id')
          .eq('job_id', id)
          .eq('customer_id', userProfile?.id)
          .maybeSingle();

        setHasReview(!!reviewData);
      }
    } catch (err) {
      console.error('Error loading job details:', err);
      Alert.alert('Error', 'Failed to load job details');
    } finally {
      setLoading(false);
    }
  };

  const calculateAverage = () => {
    if (bids.length === 0) return 0;
    const sum = bids.reduce((acc, bid) => acc + bid.amount, 0);
    return sum / bids.length;
  };

  const handleAwardJob = () => {
    if (bids.length === 0) {
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmAwardJob = async () => {
    setAwarding(true);
    try {
      throw new Error('Job awarding is not available in demo mode');

      const winningBidId = data?.[0]?.v_winner_bid_id;
      const winningBidAmount = data?.[0]?.v_winner_amount;

      if (winningBidId) {
        const winningBidData = bids.find(b => b.id === winningBidId);
        if (winningBidData) {
          setWinningBid({
            businessName: winningBidData.business.business_name,
            amount: winningBidAmount || winningBidData.amount,
          });
        }
      }

      setShowConfirmModal(false);
      setShowSuccessModal(true);
      await loadJobDetails();
    } catch (err: any) {
      console.error('Error awarding job:', err);
      setShowConfirmModal(false);
    } finally {
      setAwarding(false);
    }
  };

  const handleMessageBusiness = async (bid: Bid) => {
    if (!userProfile?.id || !job?.id) return;

    try {
      const { data: existingConversation, error: findError } = await supabase
        .from('conversations')
        .select('id')
        .eq('job_id', job.id)
        .eq('business_id', bid.business.owner_id)
        .maybeSingle();

      if (findError) throw findError;

      if (existingConversation) {
        router.push(`/chat/${existingConversation.id}`);
      } else {
        const { data: newConversation, error: createError } = await supabase
          .from('conversations')
          .insert({
            job_id: job.id,
            customer_id: userProfile.id,
            business_id: bid.business.owner_id,
          })
          .select('id')
          .single();

        if (createError) throw createError;
        router.push(`/chat/${newConversation.id}`);
      }
    } catch (error) {
      console.error('Error opening conversation:', error);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.errorText, { color: theme.colors.textSecondary }]}>Job not found</Text>
      </View>
    );
  }

  const average = calculateAverage();
  const isAwarded = job.status === 'awarded';
  const isCompleted = job.status === 'completed';
  const isOpen = job.status === 'open';

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.card, borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.colors.primary }]}>← Back</Text>
        </TouchableOpacity>
        <View style={[styles.statusContainer, { backgroundColor: theme.colors.background }]}>
          {isCompleted || isAwarded ? (
            <CheckCircle size={20} color={theme.colors.success} />
          ) : (
            <Clock size={20} color={theme.colors.warning} />
          )}
          <Text style={[styles.status, { color: theme.colors.warning, marginLeft: 6 }, (isAwarded || isCompleted) && { color: theme.colors.success }]}>
            {job.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.title, { color: theme.colors.text }]}>{job.title}</Text>
        <View style={styles.locationRow}>
          <MapPin size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.location, { color: theme.colors.textSecondary, marginLeft: 4 }]}>
            {job.city}, {job.state}
          </Text>
        </View>
      </View>

      {job.job_image_url && (
        <View style={[styles.imageCard, { backgroundColor: theme.colors.card }]}>
          <Image source={{ uri: job.job_image_url }} style={styles.jobImage} resizeMode="cover" />
        </View>
      )}

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Description</Text>
        <Text style={[styles.description, { color: theme.colors.text }]}>{job.description}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Bids Received ({bids.length})</Text>

        {bids.length > 0 && (
          <View style={styles.averageContainer}>
            <Award size={20} color={theme.colors.warning} />
            <Text style={[styles.averageLabel, { color: theme.colors.textSecondary, marginLeft: 8 }]}>Average Bid:</Text>
            <Text style={[styles.averageAmount, { color: theme.colors.warning, marginLeft: 8 }]}>${average.toFixed(2)}</Text>
          </View>
        )}

        {bids.length === 0 ? (
          <Text style={[styles.noBidsText, { color: theme.colors.textSecondary }]}>No bids yet</Text>
        ) : (
          <View style={styles.bidsList}>
            {bids.map((bid, index) => (
              <View
                key={bid.id}
                style={[
                  styles.bidItem,
                  { backgroundColor: theme.colors.background, borderColor: 'transparent' },
                  job.winning_bid_id === bid.id && { backgroundColor: '#e8f5e9', borderColor: theme.colors.success },
                  index > 0 && { marginTop: 12 },
                ]}
              >
                <View style={styles.bidHeader}>
                  <View style={styles.businessInfo}>
                    <Text style={[styles.businessName, { color: theme.colors.text }]}>{bid.business.business_name}</Text>
                    {bid.review_count > 0 && (
                      <View style={styles.ratingRow}>
                        <View style={styles.starsContainer}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              size={12}
                              color={star <= (bid.average_rating || 0) ? '#FFD700' : '#CCC'}
                              fill={star <= (bid.average_rating || 0) ? '#FFD700' : 'none'}
                            />
                          ))}
                        </View>
                        <Text style={[styles.ratingText, { color: theme.colors.textSecondary }]}>
                          {bid.average_rating?.toFixed(1)} ({bid.review_count})
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.bidAmountContainer}>
                    <DollarSign size={16} color={theme.colors.primary} />
                    <Text style={[styles.bidAmount, { color: theme.colors.primary, marginLeft: 4 }]}>${bid.amount.toFixed(2)}</Text>
                  </View>
                </View>
                {bid.notes && (
                  <Text style={[styles.bidNotes, { color: theme.colors.textSecondary }]}>{bid.notes}</Text>
                )}
                <TouchableOpacity
                  style={[styles.messageButton, { backgroundColor: '#F0F8FF' }]}
                  onPress={() => handleMessageBusiness(bid)}
                >
                  <MessageCircle size={16} color={theme.colors.primary} />
                  <Text style={[styles.messageButtonText, { color: theme.colors.primary, marginLeft: 6 }]}>Message</Text>
                </TouchableOpacity>
                {job.winning_bid_id === bid.id && (
                  <View style={styles.winnerBadge}>
                    <CheckCircle size={14} color={theme.colors.success} />
                    <Text style={[styles.winnerText, { color: theme.colors.success, marginLeft: 4 }]}>WINNER</Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}
      </View>

      {isOpen && bids.length > 0 && (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={[styles.awardButton, { backgroundColor: theme.colors.primary }]}
            onPress={handleAwardJob}
          >
            <Award size={20} color="#fff" />
            <Text style={[styles.awardButtonText, { marginLeft: 8 }]}>Award Job to Winner</Text>
          </TouchableOpacity>
          <Text style={[styles.awardHint, { color: theme.colors.textSecondary }]}>
            The bid closest to the average will automatically win
          </Text>
        </View>
      )}

      {isCompleted && !hasReview && winningBusiness && (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={() => setShowReviewModal(true)}
          >
            <Star size={20} color="#fff" />
            <Text style={[styles.reviewButtonText, { marginLeft: 8 }]}>Leave Review</Text>
          </TouchableOpacity>
        </View>
      )}

      {(isAwarded || isCompleted) && job.address && (
        <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Job Contact Details</Text>
          <Text style={[styles.contactInfo, { color: theme.colors.textSecondary }]}>
            These details have been shared with the winning bidder
          </Text>
          {job.address && (
            <Text style={[styles.detailText, { color: theme.colors.text }]}>Address: {job.address}</Text>
          )}
          {job.contact_name && (
            <Text style={[styles.detailText, { color: theme.colors.text }]}>Contact: {job.contact_name}</Text>
          )}
          {job.contact_phone && (
            <Text style={[styles.detailText, { color: theme.colors.text }]}>Phone: {job.contact_phone}</Text>
          )}
        </View>
      )}

      <JobAwardConfirmModal
        visible={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmAwardJob}
        averageAmount={average}
        bidCount={bids.length}
        loading={awarding}
      />

      <JobAwardSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        winningBid={winningBid}
      />

      {winningBusiness && userProfile?.id && (
        <ReviewModal
          visible={showReviewModal}
          jobId={id as string}
          businessId={winningBusiness.id}
          businessName={winningBusiness.name}
          customerId={userProfile.id}
          onClose={() => setShowReviewModal(false)}
          onSuccess={loadJobDetails}
        />
      )}
    </ScrollView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    paddingVertical: 8,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  status: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  location: {
    fontSize: 16,
  },
  card: {
    padding: 16,
    marginBottom: 8,
  },
  imageCard: {
    marginBottom: 8,
    overflow: 'hidden',
  },
  jobImage: {
    width: '100%',
    height: 250,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  averageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff9e6',
    borderRadius: 8,
    marginBottom: 16,
  },
  averageLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  averageAmount: {
    fontSize: 20,
    fontWeight: '700',
  },
  noBidsText: {
    fontSize: 16,
    textAlign: 'center',
    paddingVertical: 24,
  },
  bidsList: {},
  bidItem: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
  },
  bidHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  businessInfo: {
    flex: 1,
    gap: 4,
  },
  businessName: {
    fontSize: 16,
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 1,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  bidAmountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bidAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  bidNotes: {
    fontSize: 14,
    fontStyle: 'italic',
    marginTop: 4,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  messageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  winnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  winnerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  awardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  awardButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  awardHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFD700',
    paddingVertical: 16,
    borderRadius: 12,
  },
  reviewButtonText: {
    color: '#000',
    fontSize: 18,
    fontWeight: '600',
  },
  contactInfo: {
    fontSize: 14,
    marginBottom: 12,
  },
  detailText: {
    fontSize: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 18,
  },
});

import { useState } from 'react';
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
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useJobs } from '@/contexts/DatabaseContext';
import { localDb } from '@/lib/localDb';
import { MapPin, DollarSign, X, CheckCircle } from 'lucide-react-native';

export default function AvailableJobs() {
  const { userProfile } = useAuth();
  const { theme } = useTheme();
  const { jobs, loading, refresh } = useJobs({ status: 'open' });
  const [refreshing, setRefreshing] = useState(false);
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [bidNotes, setBidNotes] = useState('');
  const [submittingBid, setSubmittingBid] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const openBidModal = (job: any) => {
    setSelectedJob(job);
    setBidAmount('');
    setBidNotes('');
    setShowBidModal(true);
  };

  const submitBid = async () => {
    if (!selectedJob || !userProfile) return;
    if (!bidAmount || parseFloat(bidAmount) <= 0) return;

    setSubmittingBid(true);
    try {
      await localDb.createApplication({
        job_id: selectedJob.id,
        business_id: userProfile.id,
        bid_amount: parseFloat(bidAmount),
        message: bidNotes,
        status: 'pending',
      });

      setShowBidModal(false);
      setShowSuccessModal(true);
      await refresh();

      setTimeout(() => {
        setShowSuccessModal(false);
      }, 2500);
    } catch (err: any) {
      console.error('Error submitting bid:', err);
      alert('Error: Failed to submit bid');
    } finally {
      setSubmittingBid(false);
    }
  };

  const renderJob = ({ item }: { item: any }) => (
    <View style={[styles.jobCard, { backgroundColor: theme.colors.card }]}>
      <Text style={[styles.jobTitle, { color: theme.colors.text }]}>{item.title}</Text>
      <Text style={[styles.jobDescription, { color: theme.colors.textSecondary }]} numberOfLines={3}>
        {item.description}
      </Text>
      <View style={styles.jobFooter}>
        <View style={styles.locationContainer}>
          <MapPin size={16} color={theme.colors.textSecondary} />
          <Text style={[styles.locationText, { color: theme.colors.textSecondary }]}>
            {item.location}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bidButton, { backgroundColor: theme.colors.primary }]}
          onPress={() => openBidModal(item)}
        >
          <DollarSign size={16} color="#fff" />
          <Text style={styles.bidButtonText}>Place Bid</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.budgetRow}>
        <Text style={[styles.budgetLabel, { color: theme.colors.textSecondary }]}>Budget:</Text>
        <Text style={[styles.budgetText, { color: theme.colors.primary }]}>
          ${item.budget_min} - ${item.budget_max}
        </Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

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
              Check back later for new opportunities
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
  budgetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  budgetLabel: {
    fontSize: 14,
  },
  budgetText: {
    fontSize: 16,
    fontWeight: '600',
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

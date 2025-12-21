import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Star } from 'lucide-react-native';
import { localDb } from '@/lib/localDb';
import { useTheme } from '@/contexts/ThemeContext';

interface ReviewModalProps {
  visible: boolean;
  jobId: string;
  businessId: string;
  businessName: string;
  customerId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReviewModal({
  visible,
  jobId,
  businessId,
  businessName,
  customerId,
  onClose,
  onSuccess,
}: ReviewModalProps) {
  const { theme } = useTheme();
  const [rating, setRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      setError('Please select a star rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { error: submitError } = await supabase
        .from('reviews')
        .insert({
          job_id: jobId,
          business_id: businessId,
          customer_id: customerId,
          rating,
          review_text: reviewText.trim(),
        });

      if (submitError) throw submitError;

      setRating(0);
      setReviewText('');
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error submitting review:', err);
      setError(err.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setRating(0);
    setReviewText('');
    setError('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.title, { color: theme.colors.text }]}>Rate {businessName}</Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            How was your experience with this business?
          </Text>

          <View style={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                disabled={submitting}
              >
                <Star
                  size={40}
                  color={star <= rating ? theme.colors.warning : theme.colors.border}
                  fill={star <= rating ? theme.colors.warning : 'none'}
                />
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            style={[
              styles.textInput,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.input || theme.colors.card,
                color: theme.colors.text,
              },
            ]}
            placeholder="Write your review (optional)"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            numberOfLines={4}
            value={reviewText}
            onChangeText={setReviewText}
            editable={!submitting}
          />

          {error ? <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text> : null}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: theme.colors.input || theme.colors.card }]}
              onPress={handleClose}
              disabled={submitting}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: theme.colors.primary },
                submitting && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color={theme.colors.card} />
              ) : (
                <Text style={[styles.submitButtonText, { color: theme.colors.card }]}>Submit Review</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Award } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface JobAwardConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  averageAmount: number;
  bidCount: number;
  loading?: boolean;
}

export default function JobAwardConfirmModal({
  visible,
  onClose,
  onConfirm,
  averageAmount,
  bidCount,
  loading = false,
}: JobAwardConfirmModalProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.colors.card }]}>
          <View style={styles.iconContainer}>
            <Award size={60} color={theme.colors.warning} />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>Award This Job?</Text>
          <Text style={[styles.message, { color: theme.colors.text }]}>
            The bid closest to the average amount of ${averageAmount.toFixed(2)} will be automatically selected as the winner.
          </Text>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            Total bids: {bidCount}
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: theme.colors.primary }, loading && styles.buttonDisabled]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.card} />
              ) : (
                <Text style={[styles.confirmButtonText, { color: theme.colors.card }]}>Award Job</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.cancelButton, { marginTop: 12 }]}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.textSecondary }]}>Cancel</Text>
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
  modal: {
    borderRadius: 20,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
  },
  confirmButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

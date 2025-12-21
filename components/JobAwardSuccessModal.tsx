import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface JobAwardSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  winningBid?: {
    businessName: string;
    amount: number;
  };
}

export default function JobAwardSuccessModal({
  visible,
  onClose,
  winningBid,
}: JobAwardSuccessModalProps) {
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
            <CheckCircle size={80} color={theme.colors.success} />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>Job Awarded Successfully!</Text>
          <Text style={[styles.message, { color: theme.colors.text }]}>
            {winningBid
              ? `The job has been awarded to ${winningBid.businessName} with a bid of $${winningBid.amount.toFixed(2)}.`
              : 'The job has been awarded to the winning bidder.'}
          </Text>
          <Text style={[styles.subMessage, { color: theme.colors.textSecondary }]}>
            Contact details have been shared with the winner.
          </Text>

          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.success }]}
            onPress={onClose}
          >
            <Text style={[styles.buttonText, { color: theme.colors.card }]}>Done</Text>
          </TouchableOpacity>
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
  subMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

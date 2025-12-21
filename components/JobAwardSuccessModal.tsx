import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CheckCircle } from 'lucide-react-native';

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
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <View style={styles.iconContainer}>
            <CheckCircle size={80} color="#34C759" />
          </View>

          <Text style={styles.title}>Job Awarded Successfully!</Text>
          <Text style={styles.message}>
            {winningBid
              ? `The job has been awarded to ${winningBid.businessName} with a bid of $${winningBid.amount.toFixed(2)}.`
              : 'The job has been awarded to the winning bidder.'}
          </Text>
          <Text style={styles.subMessage}>
            Contact details have been shared with the winner.
          </Text>

          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
          >
            <Text style={styles.buttonText}>Done</Text>
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
    backgroundColor: '#fff',
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
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  subMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#34C759',
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

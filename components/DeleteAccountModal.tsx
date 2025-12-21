import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { AlertTriangle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting: boolean;
}

export default function DeleteAccountModal({
  visible,
  onClose,
  onConfirm,
  isDeleting,
}: DeleteAccountModalProps) {
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
            <AlertTriangle size={48} color={theme.colors.error} />
          </View>

          <Text style={[styles.title, { color: theme.colors.text }]}>Delete Account</Text>

          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            This action cannot be undone. This will permanently delete your account, cancel any active subscriptions, and remove all your data including:
          </Text>

          <View style={[styles.listContainer, { backgroundColor: theme.colors.input || theme.colors.card }]}>
            <Text style={[styles.listItem, { color: theme.colors.textSecondary }]}>• Profile information</Text>
            <Text style={[styles.listItem, { color: theme.colors.textSecondary }]}>• Job posts and bids</Text>
            <Text style={[styles.listItem, { color: theme.colors.textSecondary }]}>• Messages and conversations</Text>
            <Text style={[styles.listItem, { color: theme.colors.textSecondary }]}>• Reviews and ratings</Text>
            <Text style={[styles.listItem, { color: theme.colors.textSecondary }]}>• Active subscriptions</Text>
          </View>

          <Text style={[styles.warning, { color: theme.colors.error }]}>
            Are you sure you want to delete your account?
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.input || theme.colors.card }]}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, { backgroundColor: theme.colors.error }, isDeleting && styles.deleteButtonDisabled]}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color={theme.colors.card} />
              ) : (
                <Text style={[styles.deleteButtonText, { color: theme.colors.card }]}>Delete Account</Text>
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
  modal: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  listContainer: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  listItem: {
    fontSize: 14,
    lineHeight: 24,
  },
  warning: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

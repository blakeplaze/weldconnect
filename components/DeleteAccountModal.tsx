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
            <AlertTriangle size={48} color="#dc2626" />
          </View>

          <Text style={styles.title}>Delete Account</Text>

          <Text style={styles.message}>
            This action cannot be undone. This will permanently delete your account, cancel any active subscriptions, and remove all your data including:
          </Text>

          <View style={styles.listContainer}>
            <Text style={styles.listItem}>• Profile information</Text>
            <Text style={styles.listItem}>• Job posts and bids</Text>
            <Text style={styles.listItem}>• Messages and conversations</Text>
            <Text style={styles.listItem}>• Reviews and ratings</Text>
            <Text style={styles.listItem}>• Active subscriptions</Text>
          </View>

          <Text style={styles.warning}>
            Are you sure you want to delete your account?
          </Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
              disabled={isDeleting}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
              onPress={onConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.deleteButtonText}>Delete Account</Text>
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
    backgroundColor: '#fff',
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
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 15,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
  },
  listContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  listItem: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 24,
  },
  warning: {
    fontSize: 16,
    fontWeight: '600',
    color: '#dc2626',
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
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  deleteButton: {
    backgroundColor: '#dc2626',
  },
  deleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

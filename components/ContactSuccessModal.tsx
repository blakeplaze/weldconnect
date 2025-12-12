import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface ContactSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  homeRoute: string;
}

export default function ContactSuccessModal({
  visible,
  onClose,
  homeRoute,
}: ContactSuccessModalProps) {
  const router = useRouter();

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
        router.push(homeRoute as any);
      }, 2500);

      return () => clearTimeout(timer);
    }
  }, [visible, onClose, router, homeRoute]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <CheckCircle size={80} color="#10b981" strokeWidth={2} />
          </View>
          <Text style={styles.title}>Message Sent!</Text>
          <Text style={styles.message}>
            Thank you for contacting us. We'll get back to you soon.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => {
              onClose();
              router.push(homeRoute as any);
            }}
          >
            <Text style={styles.buttonText}>Go to Home</Text>
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
  content: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: '#2563eb',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

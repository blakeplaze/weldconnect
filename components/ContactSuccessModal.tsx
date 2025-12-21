import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { CheckCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';

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
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.content, { backgroundColor: theme.colors.card }]}>
          <View style={styles.iconContainer}>
            <CheckCircle size={80} color={theme.colors.success} strokeWidth={2} />
          </View>
          <Text style={[styles.title, { color: theme.colors.text }]}>Message Sent!</Text>
          <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
            Thank you for contacting us. We'll get back to you soon.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            onPress={() => {
              onClose();
              router.push(homeRoute as any);
            }}
          >
            <Text style={[styles.buttonText, { color: theme.colors.card }]}>Go to Home</Text>
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
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

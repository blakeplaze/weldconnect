import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChevronDown, ChevronUp, Mail, HelpCircle, Clock, Trash2 } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import ContactSuccessModal from '@/components/ContactSuccessModal';
import DeleteAccountModal from '@/components/DeleteAccountModal';
import { useAuth } from '@/contexts/AuthContext';

interface FAQ {
  question: string;
  answer: string;
}

const faqs: FAQ[] = [
  {
    question: 'Why can\'t I see available jobs?',
    answer: 'To view and bid on available jobs, your business profile must have an active subscription. You can subscribe to a plan through your profile page.',
  },
  {
    question: 'How do I post a job?',
    answer: 'Navigate to the "Post Job" tab, fill in the job details including title, description, and location. Add photos if needed, then submit. Your job will be visible to businesses in your area.',
  },
  {
    question: 'How do businesses bid on my job?',
    answer: 'Once you post a job, nearby businesses will receive notifications and can submit bids with their proposed price and timeline. You\'ll see all bids on your job details page.',
  },
  {
    question: 'How do I select a winning bid?',
    answer: 'View your job from "My Jobs" tab, review all the bids, and tap "Award Job" on your preferred bid. The business will be notified and you can coordinate through the messaging system.',
  },
  {
    question: 'How do I message a business?',
    answer: 'After awarding a job, you can message the business directly through the "Messages" tab. You\'ll see all your conversations there.',
  },
  {
    question: 'Can I edit or delete a job after posting?',
    answer: 'You cannot edit a job after posting, but you can delete it from the job details page if needed. Note that this will remove all associated bids.',
  },
  {
    question: 'How do I set my service radius as a business?',
    answer: 'In your profile, set your preferred service radius. You\'ll only see jobs within this distance from your business location.',
  },
  {
    question: 'What happens after I submit a bid?',
    answer: 'The customer will be notified of your bid. If they select your bid, you\'ll receive a notification and can start coordinating with them via messages.',
  },
  {
    question: 'How do I update my profile?',
    answer: 'Go to the "Profile" tab where you can update your business information, contact details, profile picture, and service preferences.',
  },
];

const COOLDOWN_MINUTES = 20;

export default function Help() {
  const { session } = useAuth();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState<number | null>(null);
  const [isCheckingCooldown, setIsCheckingCooldown] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    checkCooldown();
  }, []);

  useEffect(() => {
    if (cooldownRemaining !== null && cooldownRemaining > 0) {
      const interval = setInterval(() => {
        setCooldownRemaining((prev) => {
          if (prev === null || prev <= 0) {
            clearInterval(interval);
            return null;
          }
          return prev - 1;
        });
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [cooldownRemaining]);

  const checkCooldown = async () => {
    if (!session?.user) {
      setIsCheckingCooldown(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('contact_form_submissions')
        .select('submitted_at')
        .eq('user_id', session.user.id)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const lastSubmission = new Date(data.submitted_at);
        const now = new Date();
        const minutesSinceLastSubmission = Math.floor(
          (now.getTime() - lastSubmission.getTime()) / (1000 * 60)
        );

        if (minutesSinceLastSubmission < COOLDOWN_MINUTES) {
          setCooldownRemaining(COOLDOWN_MINUTES - minutesSinceLastSubmission);
        }
      }
    } catch (error) {
      console.error('Error checking cooldown:', error);
    } finally {
      setIsCheckingCooldown(false);
    }
  };

  const toggleFAQ = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleSubmit = async () => {
    console.log('handleSubmit called');
    setErrorMessage(null);

    if (!session?.user) {
      console.log('No user found');
      setErrorMessage('You must be logged in to send a message');
      return;
    }

    console.log('User:', session.user.id);

    if (cooldownRemaining !== null && cooldownRemaining > 0) {
      console.log('Cooldown active:', cooldownRemaining);
      setErrorMessage(
        `You can submit another message in ${cooldownRemaining} minute${cooldownRemaining !== 1 ? 's' : ''}.`
      );
      return;
    }

    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      console.log('Empty fields');
      setErrorMessage('Please fill in all fields');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log('Invalid email');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    console.log('Starting submission');
    setIsSubmitting(true);

    try {
      console.log('Inserting into database');
      const { error: dbError } = await supabase
        .from('contact_form_submissions')
        .insert({
          user_id: session.user.id,
          name: name.trim(),
          email: email.trim(),
          subject: subject.trim(),
          message: message.trim(),
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw dbError;
      }

      console.log('Database insert successful');

      const { error: emailError } = await supabase.functions.invoke('send-contact-email', {
        body: { name, email, subject, message },
      });

      if (emailError) {
        console.error('Error sending email:', emailError);
      }

      console.log('Showing success modal');
      setShowSuccessModal(true);
      setName('');
      setEmail('');
      setSubject('');
      setMessage('');
      setCooldownRemaining(COOLDOWN_MINUTES);
    } catch (error) {
      console.error('Error sending message:', error);
      setErrorMessage('Failed to send message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormDisabled = cooldownRemaining !== null && cooldownRemaining > 0;

  const handleDeleteAccount = async () => {
    if (!session?.user) return;

    setIsDeleting(true);

    try {
      const { error } = await supabase.functions.invoke('delete-account', {
        method: 'POST',
      });

      if (error) throw error;

    } catch (error) {
      console.error('Error deleting account:', error);
      setErrorMessage('Failed to delete account. Please try again or contact support.');
      setShowDeleteModal(false);
      setIsDeleting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ContactSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        homeRoute="/(business-tabs)"
      />
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        isDeleting={isDeleting}
      />
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <HelpCircle size={32} color="#2563eb" />
          <Text style={styles.headerTitle}>Help & Support</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>

          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqItem}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                {expandedIndex === index ? (
                  <ChevronUp size={20} color="#2563eb" />
                ) : (
                  <ChevronDown size={20} color="#666" />
                )}
              </View>
              {expandedIndex === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <View style={styles.contactHeader}>
            <Mail size={24} color="#2563eb" />
            <Text style={styles.sectionTitle}>Support</Text>
          </View>
          <Text style={styles.contactSubtitle}>
            Can't find what you're looking for? Send us a message and we'll get back to you as soon as possible.
          </Text>

          {isFormDisabled && (
            <View style={styles.cooldownBanner}>
              <Clock size={20} color="#f59e0b" />
              <Text style={styles.cooldownText}>
                You can submit another message in {cooldownRemaining} minute{cooldownRemaining !== 1 ? 's' : ''}
              </Text>
            </View>
          )}

          {errorMessage && (
            <View style={styles.errorBanner}>
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          <View style={styles.form}>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={[styles.input, isFormDisabled && styles.inputDisabled]}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#999"
              editable={!isFormDisabled}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, isFormDisabled && styles.inputDisabled]}
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@example.com"
              placeholderTextColor="#999"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isFormDisabled}
            />

            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={[styles.input, isFormDisabled && styles.inputDisabled]}
              value={subject}
              onChangeText={setSubject}
              placeholder="What is this regarding?"
              placeholderTextColor="#999"
              editable={!isFormDisabled}
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.messageInput, isFormDisabled && styles.inputDisabled]}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us more..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!isFormDisabled}
            />

            <TouchableOpacity
              style={[
                styles.submitButton,
                (isSubmitting || isFormDisabled) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting || isFormDisabled}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Send Message</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.dangerSection}>
          <View style={styles.dangerHeader}>
            <Trash2 size={24} color="#dc2626" />
            <Text style={styles.dangerTitle}>Danger Zone</Text>
          </View>
          <Text style={styles.dangerSubtitle}>
            Once you delete your account, there is no going back. This will cancel any active subscriptions and permanently delete all your data.
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => setShowDeleteModal(true)}
          >
            <Trash2 size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
    paddingBottom: 24,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginLeft: 12,
  },
  section: {
    backgroundColor: '#fff',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 12,
    lineHeight: 20,
  },
  contactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  contactSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 24,
    lineHeight: 20,
  },
  form: {
    marginTop: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1f2937',
    backgroundColor: '#fff',
  },
  messageInput: {
    minHeight: 120,
    paddingTop: 12,
  },
  submitButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cooldownBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef3c7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  cooldownText: {
    fontSize: 14,
    color: '#92400e',
    marginLeft: 8,
    flex: 1,
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  errorBanner: {
    backgroundColor: '#fee2e2',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 14,
    color: '#991b1b',
  },
  dangerSection: {
    backgroundColor: '#fff',
    marginTop: 16,
    marginBottom: 32,
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#fee2e2',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dangerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#dc2626',
    marginLeft: 8,
  },
  dangerSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 20,
    lineHeight: 20,
  },
  deleteButton: {
    backgroundColor: '#dc2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

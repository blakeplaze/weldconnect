import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';

export default function PrivacyPolicy() {
  const router = useRouter();
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
      <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Privacy Policy</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={[styles.lastUpdated, { color: theme.colors.textSecondary }]}>Last Updated: December 12, 2024</Text>

        <Text style={[styles.intro, { color: theme.colors.text }]}>
          This Privacy Policy describes how we collect, use, and protect your information when you use our job marketplace application.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>1. Information We Collect</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          We collect the following types of information:
        </Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Account Information: Name, email address, phone number, and profile pictures</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Job Information: Job postings, bids, messages, and transaction history</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Location Data: Approximate location for matching jobs with nearby service providers</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Device Information: Device type, operating system, and push notification tokens</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Usage Data: How you interact with our app and services</Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>2. How We Use Your Information</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          We use your information to:
        </Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Provide and maintain our services</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Connect customers with service providers</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Send notifications about jobs, bids, and messages</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Process payments and subscriptions</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Improve our services and user experience</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Prevent fraud and ensure platform security</Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>3. Data Storage and Security</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          Your data is stored securely using industry-standard encryption and security practices. We use Supabase for data storage, which implements:
        </Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Encrypted data transmission (SSL/TLS)</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Secure database access controls</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Regular security audits and updates</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Row-level security policies to protect your data</Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>4. Data Sharing</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          We do not sell your personal information. We only share your data:
        </Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• With other users as necessary to facilitate job matching (e.g., your profile is visible to potential clients)</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• With payment processors to handle transactions</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• When required by law or to protect our rights</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• With your explicit consent</Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>5. Your Rights</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          You have the right to:
        </Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Access your personal information</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Update or correct your information</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Delete your account and associated data</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Opt out of push notifications</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Request a copy of your data</Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>6. Children's Privacy</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          Our service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately, and we will delete such information from our systems.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>7. Push Notifications</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          We may send you push notifications about new jobs, bids, messages, and other important updates. You can disable these at any time through your device settings.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>8. Location Data</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          We collect approximate location data to match jobs with nearby service providers. Location data is used only for this purpose and is not shared with third parties for marketing purposes.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>9. Data Retention</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          We retain your information for as long as your account is active or as needed to provide services. If you delete your account, we will delete your personal information within 30 days, except as required by law or for legitimate business purposes.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>10. Third-Party Services</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          Our app uses the following third-party services:
        </Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Supabase (database and authentication)</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Stripe (payment processing)</Text>
        <Text style={[styles.bulletPoint, { color: theme.colors.text }]}>• Expo (push notifications)</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          These services have their own privacy policies governing the use of your information.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>11. Changes to This Policy</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last Updated" date.
        </Text>

        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>12. Contact Us</Text>
        <Text style={[styles.sectionText, { color: theme.colors.text }]}>
          If you have any questions about this Privacy Policy or your data, please contact us through the Help section in the app.
        </Text>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  lastUpdated: {
    fontSize: 14,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  intro: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 8,
  },
  bulletPoint: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 6,
    paddingLeft: 8,
  },
  bottomSpacing: {
    height: 40,
  },
});

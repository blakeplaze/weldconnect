import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Wrench, Clock } from 'lucide-react-native';

export default function CustomerHome() {
  const { userProfile } = useAuth();
  const { theme } = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.welcomeText, { color: 'rgba(255, 255, 255, 0.9)' }]}>Welcome back,</Text>
        <Text style={[styles.nameText, { color: '#fff' }]}>{userProfile?.full_name}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Wrench size={32} color={theme.colors.primary} />
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>How WeldConnect Works</Text>
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.text }]}>Post your welding job with details</Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.text }]}>
              Local welding businesses will submit bids
            </Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.text }]}>
              The average bid wins automatically
            </Text>
          </View>
          <View style={styles.step}>
            <View style={[styles.stepNumber, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.colors.text }]}>
              Winner gets access to full job details
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Clock size={24} color={theme.colors.warning} />
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Quick Tips</Text>
        <Text style={[styles.tipText, { color: theme.colors.textSecondary }]}>
          • Be detailed in your job description{'\n'}
          • Include photos if possible{'\n'}
          • Specify your location and timeline{'\n'}
          • Multiple bids lead to fair pricing
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 32,
  },
  welcomeText: {
    fontSize: 16,
  },
  nameText: {
    fontSize: 28,
    fontWeight: '700',
    marginTop: 4,
  },
  card: {
    margin: 16,
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  stepContainer: {
    gap: 16,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: 16,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
  },
});

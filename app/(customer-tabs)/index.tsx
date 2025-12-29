import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { Wrench, Clock, Download } from 'lucide-react-native';
import { useRouter } from 'expo-router';

export default function CustomerHome() {
  const { userProfile } = useAuth();
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcomeText}>Welcome back,</Text>
        <Text style={styles.nameText}>{userProfile?.full_name}</Text>
      </View>

      <View style={styles.card}>
        <Wrench size={32} color="#007AFF" />
        <Text style={styles.cardTitle}>How WeldConnect Works</Text>
        <View style={styles.stepContainer}>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>1</Text>
            </View>
            <Text style={styles.stepText}>Post your welding job with details</Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>2</Text>
            </View>
            <Text style={styles.stepText}>
              Local welding businesses will submit bids
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>3</Text>
            </View>
            <Text style={styles.stepText}>
              The average bid wins automatically
            </Text>
          </View>
          <View style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>4</Text>
            </View>
            <Text style={styles.stepText}>
              Winner gets access to full job details
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Clock size={24} color="#FF9500" />
        <Text style={styles.cardTitle}>Quick Tips</Text>
        <Text style={styles.tipText}>
          • Be detailed in your job description{'\n'}
          • Include photos if possible{'\n'}
          • Specify your location and timeline{'\n'}
          • Multiple bids lead to fair pricing
        </Text>
      </View>

      <TouchableOpacity
        style={styles.exportButton}
        onPress={() => router.push('/migration-export')}
      >
        <Download size={24} color="#fff" />
        <Text style={styles.exportButtonText}>Export My Data</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 24,
    paddingTop: 32,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  nameText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    gap: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
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
    backgroundColor: '#007AFF',
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
    color: '#333',
  },
  tipText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  exportButton: {
    backgroundColor: '#34C759',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});

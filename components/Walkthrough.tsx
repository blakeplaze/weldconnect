import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Briefcase,
  MessageCircle,
  DollarSign,
  Star,
  MapPin,
  Bell,
  ArrowRight,
  X,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

interface WalkthroughStep {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

interface WalkthroughProps {
  visible: boolean;
  onComplete: () => void;
  userType: 'customer' | 'business';
}

export default function Walkthrough({ visible, onComplete, userType }: WalkthroughProps) {
  const { theme } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const customerSteps: WalkthroughStep[] = [
    {
      icon: <Briefcase color="#4CAF50" size={64} />,
      title: 'Post Your Jobs',
      description: 'Create detailed job postings with photos, locations, and requirements. Local welding businesses will be notified instantly.',
      color: '#4CAF50',
    },
    {
      icon: <DollarSign color="#FF9800" size={64} />,
      title: 'Receive Competitive Bids',
      description: 'Get bids from qualified welding professionals in your area. Compare prices, ratings, and business profiles.',
      color: '#FF9800',
    },
    {
      icon: <Star color="#FFC107" size={64} />,
      title: 'Choose the Best',
      description: 'Award jobs to the best bidder with our intelligent matching system that considers ratings, reviews, and bid amounts.',
      color: '#FFC107',
    },
    {
      icon: <MessageCircle color="#2196F3" size={64} />,
      title: 'Stay Connected',
      description: 'Chat directly with businesses, share updates, and coordinate project details in real-time.',
      color: '#2196F3',
    },
    {
      icon: <Star color="#9C27B0" size={64} />,
      title: 'Rate & Review',
      description: 'After job completion, rate your experience and help other customers make informed decisions.',
      color: '#9C27B0',
    },
  ];

  const businessSteps: WalkthroughStep[] = [
    {
      icon: <MapPin color="#4CAF50" size={64} />,
      title: 'Set Your Service Area',
      description: 'Define your service radius and location. Jobs within your area will appear automatically on your feed.',
      color: '#4CAF50',
    },
    {
      icon: <Bell color="#FF5722" size={64} />,
      title: 'Get Job Notifications',
      description: 'Receive instant push notifications when new jobs are posted in your service area. Never miss an opportunity.',
      color: '#FF5722',
    },
    {
      icon: <DollarSign color="#FF9800" size={64} />,
      title: 'Submit Bids',
      description: 'Review job details and submit competitive bids. Add notes to highlight your expertise and stand out.',
      color: '#FF9800',
    },
    {
      icon: <Star color="#FFC107" size={64} />,
      title: 'Build Your Reputation',
      description: 'Earn 5-star ratings and positive reviews. Higher ratings increase your chances of winning bids.',
      color: '#FFC107',
    },
    {
      icon: <MessageCircle color="#2196F3" size={64} />,
      title: 'Communicate Directly',
      description: 'Chat with customers, clarify project requirements, and coordinate schedules through our messaging system.',
      color: '#2196F3',
    },
  ];

  const steps = userType === 'customer' ? customerSteps : businessSteps;
  const currentStepData = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={handleSkip}
    >
      <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.9)' }]}>
        <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleSkip}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X color={theme.colors.textSecondary} size={24} />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.iconContainer}>
              {currentStepData.icon}
            </View>

            <Text style={[styles.title, { color: theme.colors.text }]}>
              {currentStepData.title}
            </Text>

            <Text style={[styles.description, { color: theme.colors.textSecondary }]}>
              {currentStepData.description}
            </Text>

            <View style={styles.dotsContainer}>
              {steps.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        index === currentStep
                          ? currentStepData.color
                          : theme.colors.border,
                      width: index === currentStep ? 24 : 8,
                    },
                  ]}
                />
              ))}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <View style={styles.buttonContainer}>
              {currentStep > 0 && (
                <TouchableOpacity
                  style={[
                    styles.button,
                    styles.secondaryButton,
                    { borderColor: theme.colors.border },
                  ]}
                  onPress={handlePrevious}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      styles.secondaryButtonText,
                      { color: theme.colors.textSecondary },
                    ]}
                  >
                    Back
                  </Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[
                  styles.button,
                  styles.primaryButton,
                  { backgroundColor: currentStepData.color },
                  currentStep === 0 && styles.fullWidthButton,
                ]}
                onPress={handleNext}
              >
                <Text style={[styles.buttonText, styles.primaryButtonText]}>
                  {isLastStep ? 'Get Started' : 'Next'}
                </Text>
                {!isLastStep && <ArrowRight color="#FFFFFF" size={20} />}
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
              <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
                Skip Tour
              </Text>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: width * 0.9,
    maxWidth: 400,
    maxHeight: height * 0.8,
    borderRadius: 24,
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10,
    padding: 8,
  },
  scrollContent: {
    padding: 32,
    paddingTop: 56,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  footer: {
    padding: 24,
    paddingTop: 16,
    gap: 12,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  fullWidthButton: {
    flex: 1,
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    borderWidth: 2,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  secondaryButtonText: {},
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

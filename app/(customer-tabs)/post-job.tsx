import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import JobPostSuccessModal from '@/components/JobPostSuccessModal';
import { geocodeCity } from '@/lib/geocoding';
import { pickImage, uploadJobImage } from '@/lib/uploadImage';
import { Camera, X } from 'lucide-react-native';

const COOLDOWN_MINUTES = 2;
const COOLDOWN_MS = COOLDOWN_MINUTES * 60 * 1000;

export default function PostJob() {
  const { session, userProfile, refreshProfile } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [address, setAddress] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [userProfile?.last_job_posted_at]);

  const checkCooldown = () => {
    if (!userProfile?.last_job_posted_at) {
      setCooldownRemaining(0);
      return;
    }

    const lastPostedAt = new Date(userProfile.last_job_posted_at).getTime();
    const now = Date.now();
    const timeSincePost = now - lastPostedAt;
    const remaining = COOLDOWN_MS - timeSincePost;

    if (remaining > 0) {
      setCooldownRemaining(Math.ceil(remaining / 1000));
    } else {
      setCooldownRemaining(0);
    }
  };

  const formatCooldownTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePickImage = async () => {
    try {
      setUploadingImage(true);
      const image = await pickImage();
      if (image) {
        setSelectedImage(image.uri);
      }
    } catch (error: any) {
      setError(error.message || 'Failed to pick image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setSelectedImage(null);
  };

  const handleSubmit = async () => {
    setError('');

    if (cooldownRemaining > 0) {
      setError(
        `Please wait ${formatCooldownTime(cooldownRemaining)} before posting another job`
      );
      return;
    }

    if (!title || !description || !city || !state) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      console.log('Starting job post...');
      const coords = await geocodeCity(city.trim().toLowerCase(), state.trim().toUpperCase());
      console.log('Geocoding complete:', coords);

      let jobImageUrl: string | null = null;
      if (selectedImage && session?.user.id) {
        console.log('Uploading image...');
        try {
          jobImageUrl = await uploadJobImage(session.user.id, selectedImage);
          console.log('Image uploaded:', jobImageUrl);
        } catch (imageError: any) {
          console.error('Image upload failed:', imageError);
          setError(`Failed to upload image: ${imageError.message}`);
          setLoading(false);
          return;
        }
      }

      console.log('Inserting job...');
      const { error: insertError } = await supabase.from('jobs').insert({
        customer_id: session?.user.id,
        title,
        description,
        city: city.trim().toLowerCase(),
        state: state.trim().toUpperCase(),
        address,
        contact_name: contactName,
        contact_phone: contactPhone,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
        job_image_url: jobImageUrl,
        status: 'open',
      });

      if (insertError) throw insertError;
      console.log('Job inserted successfully');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ last_job_posted_at: new Date().toISOString() })
        .eq('id', session?.user.id);

      if (updateError) throw updateError;

      await refreshProfile();

      setTitle('');
      setDescription('');
      setCity('');
      setState('');
      setAddress('');
      setContactName('');
      setContactPhone('');
      setSelectedImage(null);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('Error posting job:', err);
      setError(err.message || 'Failed to post job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <JobPostSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        onViewJobs={() => {
          setShowSuccessModal(false);
          router.push('/(customer-tabs)/my-jobs');
        }}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Post a Welding Job</Text>
          <Text style={styles.headerSubtitle}>
            Describe your project and local businesses will bid on it
          </Text>
        </View>

        {cooldownRemaining > 0 && (
          <View style={styles.cooldownBanner}>
            <Text style={styles.cooldownText}>
              Next job post available in: {formatCooldownTime(cooldownRemaining)}
            </Text>
          </View>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Title *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Fence Gate Repair"
              value={title}
              onChangeText={setTitle}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the welding work needed, materials, timeline, etc."
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Job Photo (Optional)</Text>
            {selectedImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={handleRemoveImage}
                  disabled={loading}
                >
                  <X size={20} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.imagePickerButton}
                onPress={handlePickImage}
                disabled={loading || uploadingImage}
              >
                {uploadingImage ? (
                  <ActivityIndicator size="small" color="#007AFF" />
                ) : (
                  <>
                    <Camera size={32} color="#007AFF" />
                    <Text style={styles.imagePickerText}>Add Photo</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>City *</Text>
              <TextInput
                style={styles.input}
                placeholder="City"
                value={city}
                onChangeText={setCity}
                editable={!loading}
              />
            </View>
            <View style={[styles.inputGroup, styles.flex1]}>
              <Text style={styles.label}>State *</Text>
              <TextInput
                style={styles.input}
                placeholder="State"
                value={state}
                onChangeText={setState}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={styles.input}
              placeholder="Full address (shared with winner only)"
              value={address}
              onChangeText={setAddress}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Contact name (shared with winner only)"
              value={contactName}
              onChangeText={setContactName}
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Contact phone (shared with winner only)"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (loading || cooldownRemaining > 0) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={loading || cooldownRemaining > 0}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {cooldownRemaining > 0
                  ? `Wait ${formatCooldownTime(cooldownRemaining)}`
                  : 'Post Job'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    backgroundColor: '#007AFF',
    padding: 24,
    paddingTop: 32,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    marginTop: 8,
  },
  form: {
    padding: 16,
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  input: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  textArea: {
    minHeight: 120,
    paddingTop: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex1: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  error: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    margin: 16,
    marginBottom: 0,
    textAlign: 'center',
  },
  cooldownBanner: {
    backgroundColor: '#fff3cd',
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
    padding: 16,
    margin: 16,
    marginBottom: 0,
    borderRadius: 8,
  },
  cooldownText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  imagePickerButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  imagePickerText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

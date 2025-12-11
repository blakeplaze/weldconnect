import { supabase } from './supabase';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

export async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (permissionResult.granted === false) {
    throw new Error('Permission to access photos is required');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled) {
    return null;
  }

  return result.assets[0];
}

export async function uploadProfilePicture(
  userId: string,
  imageUri: string
): Promise<string> {
  try {
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${userId}/profile.${fileExt}`;

    let fileData: Blob | File;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      fileData = await response.blob();
    } else {
      const response = await fetch(imageUri);
      fileData = await response.blob();
    }

    const { error: uploadError } = await supabase.storage
      .from('profile-pictures')
      .upload(fileName, fileData, {
        contentType: `image/${fileExt}`,
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('profile-pictures')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function updateProfilePicture(
  userId: string,
  imageUri: string
): Promise<void> {
  const publicUrl = await uploadProfilePicture(userId, imageUri);

  const { error } = await supabase
    .from('profiles')
    .update({ profile_picture_url: publicUrl })
    .eq('id', userId);

  if (error) throw error;
}

export async function uploadJobImage(
  userId: string,
  imageUri: string
): Promise<string> {
  try {
    const fileExt = imageUri.split('.').pop()?.toLowerCase() || 'jpg';
    const timestamp = Date.now();
    const fileName = `${userId}/job-${timestamp}.${fileExt}`;

    let fileData: Blob | File;

    if (Platform.OS === 'web') {
      const response = await fetch(imageUri);
      fileData = await response.blob();
    } else {
      const response = await fetch(imageUri);
      fileData = await response.blob();
    }

    const { error: uploadError } = await supabase.storage
      .from('job-images')
      .upload(fileName, fileData, {
        contentType: `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('job-images')
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading job image:', error);
    throw error;
  }
}

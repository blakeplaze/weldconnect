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

export async function uploadImage(
  imageUri: string,
  bucket: string
): Promise<string> {
  try {
    console.log('uploadImage called with URI:', imageUri);

    let fileExt = 'jpg';
    if (!imageUri.startsWith('blob:') && imageUri.includes('.')) {
      const parts = imageUri.split('/').pop()?.split('.');
      if (parts && parts.length > 1) {
        fileExt = parts[parts.length - 1].split('?')[0].toLowerCase();
      }
    }

    const timestamp = Date.now();
    const fileName = `${timestamp}.${fileExt}`;
    console.log('Target filename:', fileName);

    let fileData: Blob;

    try {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      fileData = await response.blob();
      console.log('Blob created, size:', fileData.size, 'type:', fileData.type);
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError);
      throw new Error(`Failed to load image: ${fetchError.message}`);
    }

    console.log('Uploading to storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, {
        contentType: fileData.type || `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    console.log('Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

export async function uploadJobImage(
  userId: string,
  imageUri: string
): Promise<string> {
  try {
    console.log('uploadJobImage called with URI:', imageUri);

    // For blob URLs (web), just use jpg. For file URIs, extract the extension.
    let fileExt = 'jpg';
    if (!imageUri.startsWith('blob:') && imageUri.includes('.')) {
      const parts = imageUri.split('/').pop()?.split('.');
      if (parts && parts.length > 1) {
        fileExt = parts[parts.length - 1].split('?')[0].toLowerCase();
      }
    }

    const timestamp = Date.now();
    const fileName = `${userId}/job-${timestamp}.${fileExt}`;
    console.log('Target filename:', fileName);

    let fileData: Blob;

    try {
      const response = await fetch(imageUri);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      fileData = await response.blob();
      console.log('Blob created, size:', fileData.size, 'type:', fileData.type);
    } catch (fetchError: any) {
      console.error('Fetch error:', fetchError);
      throw new Error(`Failed to load image: ${fetchError.message}`);
    }

    console.log('Uploading to storage...');
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('job-images')
      .upload(fileName, fileData, {
        contentType: fileData.type || `image/${fileExt}`,
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    console.log('Upload successful:', uploadData);

    const { data: urlData } = supabase.storage
      .from('job-images')
      .getPublicUrl(fileName);

    console.log('Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading job image:', error);
    throw error;
  }
}

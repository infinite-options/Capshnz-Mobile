import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Alert,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as AuthSession from 'expo-auth-session';
import GooglePhotosService from '../services/GooglePhotosService';
import axios from 'axios';

// Configure redirect URI based on platform
const redirectUri =
  Platform.OS === "web"
    ? "http://localhost:19006"
    : AuthSession.makeRedirectUri({
        scheme: "com.capshnz.mobile",
        path: "oauth",
      });

const SCOPE = "https://www.googleapis.com/auth/photospicker.mediaitems.readonly";

export default function GooglePhotos() {
  const navigation = useNavigation();
  const route = useRoute();
  const [userData, setUserData] = useState(route.params || {});
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [pickerOpened, setPickerOpened] = useState(false);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const authenticated = await GooglePhotosService.isAuthenticated();
      setIsAuthenticated(authenticated);
      
      if (authenticated) {
        // Don't auto-open picker, let user click button
        setLoading(false);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      const success = await GooglePhotosService.signIn();
      
      if (success) {
        setIsAuthenticated(true);
        // Auto-open photo picker after sign in
        setTimeout(() => openPhotoPicker(), 500);
      } else {
        Alert.alert('Sign In Failed', 'Could not sign in to Google Photos');
        setLoading(false);
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in to Google Photos');
      setLoading(false);
    }
  };

  const openPhotoPicker = async () => {
    try {
      setLoading(true);
      console.log('Creating Photo Picker session...');
      
      const session = await GooglePhotosService.createPhotoPickerSession();
      
      if (!session || !session.pickerUri) {
        throw new Error('Failed to create photo picker session');
      }

      console.log('Opening Photo Picker at:', session.pickerUri);
      
      // Store session ID for later use
      setSessionId(session.id);
      
      // Open the picker in a new window/tab
      if (Platform.OS === 'web') {
        const pickerWindow = window.open(session.pickerUri, '_blank', 'width=800,height=600');
        
        if (!pickerWindow) {
          Alert.alert('Popup Blocked', 'Please allow popups for this site');
          setLoading(false);
          return;
        }

        setPickerOpened(true);
        setLoading(false);
        
        Alert.alert(
          'Photo Picker Opened',
          'After selecting your photos in the popup window, close it and click "Load Selected Photos" button here.',
          [{ text: 'OK' }]
        );
        
      } else {
        // For mobile, open in browser
        await Linking.openURL(session.pickerUri);
        setLoading(false);
        Alert.alert(
          'Photo Picker Opened',
          'After selecting photos in your browser, return to this app and tap Refresh to load them.'
        );
      }
    } catch (error) {
      console.error('Error opening photo picker:', error);
      Alert.alert('Error', 'Failed to open Google Photos picker');
      setLoading(false);
    }
  };

  const loadSelectedPhotos = async () => {
    if (!sessionId) {
      Alert.alert('Error', 'No active picker session. Please open the picker first.');
      return;
    }

    setLoading(true);
    
    try {
      console.log('Loading selected photos from session:', sessionId);
      
      const photos = await GooglePhotosService.fetchSelectedPhotos(sessionId);
      
      console.log('Raw photos from service:', photos);
      
      if (photos && photos.length > 0) {
        const formattedPhotos = photos.map((photo, index) => {
          console.log(`Photo ${index + 1} data:`, photo);
          
          // Check different possible URL fields
          const baseUrl = photo.url || photo.baseUrl || photo.fullSizeUrl;
          
          if (!baseUrl) {
            console.error('No URL found for photo:', photo);
          }
          
          return {
            id: photo.id,
            name: photo.name || photo.filename || `Photo ${index + 1}`,
            url: baseUrl,
            thumbnailUrl: photo.thumbnailUrl || baseUrl,
            mimeType: photo.mimeType,
            source: 'google_photos',
            rawPhoto: photo, // Keep raw data for debugging
          };
        });
        
        console.log('Formatted photos:', formattedPhotos);
        
        setSelectedPhotos(formattedPhotos);
        setLoading(false);
        setPickerOpened(false);
      } else {
        setLoading(false);
        Alert.alert('No Photos Selected', 'No photos were found. Make sure you selected and confirmed photos in the picker.');
      }
    } catch (error) {
      console.error('Error fetching selected photos:', error);
      setLoading(false);
      
      if (error.message && error.message.includes('400')) {
        Alert.alert(
          'No Photos Selected', 
          'Please select and confirm at least one photo in the Google Photos picker popup.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', `Failed to load photos: ${error.message}`);
      }
    }
  };

  const handleConfirm = async () => {
    if (selectedPhotos.length === 0) {
      Alert.alert('No Photos', 'Please select at least one photo');
      return;
    }

    // Check if photos have valid URLs
    const invalidPhotos = selectedPhotos.filter(p => !p.url || p.url === 'undefined' || p.url.includes('undefined'));
    if (invalidPhotos.length > 0) {
      console.error('Photos with invalid URLs:', invalidPhotos);
      Alert.alert(
        'Invalid Photo URLs',
        'Some photos don\'t have valid URLs. This might be a bug with the Google Photos Picker API. Please try selecting photos again.',
        [
          { text: 'OK' },
          { 
            text: 'Show Debug Info', 
            onPress: () => {
              console.log('All selected photos:', selectedPhotos);
              Alert.alert('Debug Info', JSON.stringify(selectedPhotos[0], null, 2));
            }
          }
        ]
      );
      return;
    }

    setLoading(true);
    
    try {
      const formData = new FormData();
      
      // Get access token for downloading
      const accessToken = await GooglePhotosService.getValidAccessToken();
      
      // Download and add all photos to FormData
      for (let i = 0; i < selectedPhotos.length; i++) {
        const photo = selectedPhotos[i];
        
        try {
          console.log(`Downloading photo ${i + 1}/${selectedPhotos.length} from Google Photos...`);
          
          // Use fullSizeUrl with download parameter
          const downloadUrl = photo.rawPhoto?.fullSizeUrl || photo.fullSizeUrl || photo.url;
          
          console.log('Photo URL:', downloadUrl);
          
          if (!downloadUrl || downloadUrl === 'undefined') {
            throw new Error('Photo has no valid URL');
          }
          
          // Add download parameter
          const urlWithDownload = downloadUrl.includes('=d') ? downloadUrl : `${downloadUrl}=d`;
          
          // Try to download with fetch
          const response = await fetch(urlWithDownload, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
            mode: 'cors',
          });
          
          if (!response.ok) {
            console.error(`Download failed: ${response.status} ${response.statusText}`);
            throw new Error(`HTTP ${response.status}: Cannot download from Google Photos. The Photo Picker API URLs are not downloadable.`);
          }
          
          const blob = await response.blob();
          
          console.log(`Downloaded photo ${i + 1}, size: ${blob.size} bytes, type: ${blob.type}`);
          
          // Verify it's actually an image
          if (!blob.type.startsWith('image/') && blob.size < 100000) {
            throw new Error('Downloaded file is not a valid image');
          }
          
          // Create a File object from the blob
          const file = new File([blob], photo.name || `photo_${i + 1}.jpg`, {
            type: blob.type || photo.mimeType || 'image/jpeg'
          });
          
          formData.append('file', file, photo.name || `photo_${i + 1}.jpg`);
          
        } catch (downloadError) {
          console.error(`Error downloading photo ${i + 1}:`, downloadError);
          
          Alert.alert(
            'Download Failed',
            `Cannot download photos from Google Photos Picker API. The URLs provided by Google Photos Picker are not downloadable.\n\nWould you like to try uploading from your device instead?`,
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Use Device Photos', 
                onPress: () => {
                  navigation.navigate('SelectFromDevice', userData);
                }
              }
            ]
          );
          
          setLoading(false);
          return;
        }
      }
      
      console.log('Uploading', selectedPhotos.length, 'photos to S3...');
      
      // Log FormData contents for debugging
      console.log('FormData entries:');
      for (let pair of formData.entries()) {
        console.log(pair[0], pair[1]);
      }
      
      // Upload to backend (same endpoint as SelectFromDevice)
      const response = await axios.post(
        'http://192.168.40.230:4030/api/v2/uploadDeviceImage',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          timeout: 60000,
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`Upload progress: ${percentCompleted}%`);
          },
        }
      );

      console.log('Upload response:', response.data);

      const uploadedImages = response.data.images || response.data.image_url;

      if (uploadedImages && uploadedImages.length > 0) {
        const uploadedPhotos = uploadedImages.map(img => ({
          id: img.image_uid,
          name: img.filename,
          url: img.image_url,
          thumbnailUrl: img.image_url,
          source: 'google_photos_s3',
        }));

        const updatedUserData = {
          ...userData,
          deckSelected: true,
          deckTitle: "Google Photos",
          deckUID: "google-photos-" + Date.now(),
          deckThumbnail_url: uploadedPhotos[0]?.url,
          selectedPhotos: uploadedPhotos,
          isApi: true,
        };

        setLoading(false);
        
        navigation.reset({
          index: 0,
          routes: [{ name: 'WaitingRoom', params: { ...updatedUserData } }],
        });
      } else {
        throw new Error('No images returned from server');
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert(
        'Upload Failed',
        error.response?.data?.message || error.message || 'Failed to upload photos. Please try again.'
      );
      setLoading(false);
    }
  };

  const handleRemovePhoto = (id) => {
    setSelectedPhotos(prev => prev.filter(photo => photo.id !== id));
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading Google Photos...</Text>
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.heading}>Google Photos</Text>
        <Text style={styles.subtitle}>Sign in to access your photos</Text>
        <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
          <Text style={styles.signInButtonText}>Sign in with Google</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Google Photos</Text>
      
      {selectedPhotos.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>
            {pickerOpened ? 'Click "Load Selected Photos" after selecting photos in the popup' : 'No photos selected'}
          </Text>
          
          {!pickerOpened && (
            <TouchableOpacity style={styles.refreshButton} onPress={openPhotoPicker}>
              <Text style={styles.refreshButtonText}>Open Google Photos Picker</Text>
            </TouchableOpacity>
          )}
          
          {pickerOpened && sessionId && (
            <TouchableOpacity 
              style={styles.refreshButton} 
              onPress={loadSelectedPhotos}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.refreshButtonText}>Load Selected Photos</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <FlatList
            data={selectedPhotos}
            keyExtractor={(item) => item.id}
            numColumns={3}
            renderItem={({ item }) => (
              <View style={styles.imageContainer}>
                <Image source={{ uri: item.thumbnailUrl || item.url }} style={styles.image} />
                <TouchableOpacity 
                  style={styles.removeButton}
                  onPress={() => handleRemovePhoto(item.id)}
                >
                  <Text style={styles.removeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={styles.imageList}
          />
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.addMoreButton} onPress={openPhotoPicker}>
              <Text style={styles.addMoreButtonText}>Select More</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm ({selectedPhotos.length})</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#C8DAD8',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#666',
  },
  signInButton: {
    backgroundColor: '#4285F4',
    padding: 15,
    borderRadius: 10,
    width: '80%',
    marginBottom: 15,
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cancelButton: {
    padding: 15,
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  imageList: {
    paddingBottom: 100,
  },
  imageContainer: {
    position: 'relative',
    margin: 5,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 8,
  },
  removeButton: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: 'red',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  addMoreButton: {
    backgroundColor: '#666',
    padding: 15,
    borderRadius: 10,
    flex: 1,
    marginRight: 10,
  },
  addMoreButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  confirmButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    flex: 1,
  },
  confirmButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  refreshButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
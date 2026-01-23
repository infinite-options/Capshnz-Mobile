import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import GooglePhotosService from '../services/GooglePhotosService';

const DeviceDeck = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [userData, setUserData] = useState(route.params || {});
    const [selectedImages, setSelectedImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStatus, setUploadStatus] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        checkGoogleDriveAuth();
    }, []);

    // Auto-retry when returning from authentication
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', async () => {
            console.log(' Screen focused, checking authentication status...');
            const authenticated = await GooglePhotosService.isAuthenticated();
            console.log(' Auth status on focus:', authenticated);
            
            if (authenticated && !isAuthenticated) {
                console.log(' Newly authenticated! Auto-retrying upload...');
                setIsAuthenticated(true);
                // If images were already selected, retry upload
                if (selectedImages.length > 0) {
                    setTimeout(() => handleConfirm(), 500);
                }
            }
        });

        return unsubscribe;
    }, [navigation, isAuthenticated, selectedImages]);

    const checkGoogleDriveAuth = async () => {
        try {
            const authenticated = await GooglePhotosService.isAuthenticated();
            setIsAuthenticated(authenticated);
            
            if (authenticated) {
                // If already authenticated, proceed to pick images
                pickImages();
            } else {
                // Show authentication required message
                Alert.alert(
                    'Google Drive Required',
                    'Please sign in with Google to upload images to your Drive',
                    [
                        { text: 'Cancel', onPress: () => navigation.goBack() },
                        { 
                            text: 'Sign In', 
                            onPress: async () => {
                                // Navigate to GooglePhotos screen for authentication
                                navigation.navigate('GooglePhotos', {
                                    returnTo: 'SelectFromDevice',
                                    onAuthSuccess: () => {
                                        setIsAuthenticated(true);
                                        pickImages();
                                    }
                                });
                            }
                        }
                    ]
                );
                setLoading(false);
            }
        } catch (error) {
            console.error('Error checking Google Drive authentication:', error);
            setLoading(false);
        }
    };

    const pickImages = async () => {
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (!permissionResult.granted) {
                Alert.alert(
                    'Permission Required',
                    'Permission to access the media library is required',
                    [
                        { text: 'Cancel', onPress: () => navigation.goBack() },
                        { text: 'Retry', onPress: () => pickImages() }
                    ]
                );
                setLoading(false);
                return;
            }

            let result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsMultipleSelection: true,
                quality: 1,
                selectionLimit: 10,
            });

            if (result.canceled) {
                Alert.alert(
                    'No Images Selected',
                    'Please select at least one image',
                    [
                        { text: 'Go Back', onPress: () => navigation.goBack() },
                        { text: 'Try Again', onPress: () => pickImages() }
                    ]
                );
                setLoading(false);
                return;
            }

            if (result.assets.length > 0) {
                const selectedPhotos = result.assets.map((asset, index) => ({
                    id: `local_${Date.now()}_${index}`,
                    name: asset.fileName || `Photo ${index + 1}`,
                    uri: asset.uri,
                    type: asset.type || 'image/jpeg',
                    width: asset.width,
                    height: asset.height,
                }));

                setSelectedImages(selectedPhotos);
                setLoading(false);
            }
        } catch (error) {
            console.error('Error picking images:', error);
            Alert.alert(
                'Error',
                'Failed to select images. Please try again.',
                [
                    { text: 'Go Back', onPress: () => navigation.goBack() },
                    { text: 'Retry', onPress: () => pickImages() }
                ]
            );
            setLoading(false);
        }
    };

    // Upload image to Google Drive
    const uploadToGoogleDrive = async (imageUri, fileName) => {
        try {
            const accessToken = await GooglePhotosService.getValidAccessToken();
            
            // Read file as base64
            let fileData;
            let mimeType = 'image/jpeg';
            
            if (Platform.OS === 'web') {
                // For web, fetch blob
                const response = await fetch(imageUri);
                const blob = await response.blob();
                fileData = blob;
                mimeType = blob.type || 'image/jpeg';
            } else {
                // For native, read file as base64
                const base64 = await FileSystem.readAsStringAsync(imageUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                
                // Convert base64 to blob for upload
                const byteCharacters = atob(base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                fileData = new Blob([byteArray], { type: 'image/jpeg' });
            }

            // Step 1: Create file metadata on Google Drive
            const metadata = {
                name: fileName,
                mimeType: mimeType,
            };

            const metadataResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json; charset=UTF-8',
                },
                body: JSON.stringify(metadata),
            });

            if (!metadataResponse.ok) {
                throw new Error(`Failed to create Drive file: ${metadataResponse.status}`);
            }

            // Get upload URL from Location header
            const uploadUrl = metadataResponse.headers.get('Location');
            
            if (!uploadUrl) {
                throw new Error('No upload URL received from Google Drive');
            }

            // Step 2: Upload file content
            const uploadResponse = await fetch(uploadUrl, {
                method: 'PUT',
                headers: {
                    'Content-Type': mimeType,
                },
                body: fileData,
            });

            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload file content: ${uploadResponse.status}`);
            }

            const driveFile = await uploadResponse.json();
            
            // Step 3: Make the file publicly accessible
            try {
                await fetch(`https://www.googleapis.com/drive/v3/files/${driveFile.id}/permissions`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        role: 'reader',
                        type: 'anyone'
                    })
                });
                console.log(`✅ Made file ${driveFile.id} publicly accessible`);
            } catch (permError) {
                console.warn('⚠️ Could not make file public:', permError);
            }
            
            // Return Drive file info with direct image URL
            return {
                id: driveFile.id,
                name: driveFile.name,
                webViewLink: `https://drive.google.com/file/d/${driveFile.id}/view`,
                // Use direct image URL that works without authentication
                url: `https://drive.google.com/uc?export=view&id=${driveFile.id}`,
                webContentLink: `https://drive.google.com/uc?id=${driveFile.id}&export=download`,
                thumbnailLink: `https://drive.google.com/thumbnail?id=${driveFile.id}&sz=w400-h400`,
            };
        } catch (error) {
            console.error('Error uploading to Google Drive:', error);
            throw error;
        }
    };

    const handleConfirm = async () => {
        console.log(' Confirm button clicked!');
        console.log('Selected images:', selectedImages.length);
        
        if (selectedImages.length === 0) {
            Alert.alert('No Images', 'Please select at least one image');
            return;
        }

        // Check authentication before uploading
        console.log(' Checking authentication...');
        const authenticated = await GooglePhotosService.isAuthenticated();
        console.log(' Authentication status:', authenticated);
        
        if (!authenticated) {
            console.log(' Not authenticated, navigating to GooglePhotos...');
            
            // Directly navigate to GooglePhotos for sign-in
            navigation.navigate('GooglePhotos', {
                returnTo: 'SelectFromDevice',
                onAuthSuccess: () => {
                    console.log(' Auth success callback received');
                    setIsAuthenticated(true);
                    // Retry upload after authentication
                    setTimeout(() => handleConfirm(), 500);
                }
            });
            return;
        }

        console.log('Starting upload...');
        setUploading(true);
        setUploadProgress(0);
        
        try {
            console.log(' Inside try block, creating uploadedPhotos array...');
            // Upload images to Google Drive
            const uploadedPhotos = [];
            
            console.log(' Starting loop for', selectedImages.length, 'images');
            for (let i = 0; i < selectedImages.length; i++) {
                const image = selectedImages[i];
                const progress = Math.round(((i + 1) / selectedImages.length) * 100);
                setUploadProgress(progress);
                setUploadStatus(`Uploading to Google Drive: ${i + 1}/${selectedImages.length}`);
                
                console.log(`Uploading image ${i + 1}/${selectedImages.length}:`, image.uri);
                
                try {
                    // Upload to Google Drive
                    const fileName = `captionz_${Date.now()}_${i}.jpg`;
                    console.log(' Calling uploadToGoogleDrive with fileName:', fileName);
                    const driveFile = await uploadToGoogleDrive(image.uri, fileName);
                    console.log(' Upload successful, got driveFile:', driveFile);
                    
                    // Store Drive file info for backend
                    uploadedPhotos.push({
                        id: driveFile.id,
                        name: fileName,
                        url: driveFile.webContentLink,
                        thumbnailUrl: driveFile.thumbnailLink,
                        webViewLink: driveFile.webViewLink,
                        type: image.type || 'image/jpeg',
                        width: image.width,
                        height: image.height,
                        source: 'device_drive',
                    });
                    
                } catch (uploadError) {
                    console.error(`Failed to upload image ${i + 1}:`, uploadError);
                    console.error('Error stack:', uploadError.stack);
                    // Continue with other images
                }
            }
            
            console.log(' Upload loop complete. Uploaded', uploadedPhotos.length, 'images');
            
            if (uploadedPhotos.length === 0) {
                console.error(' No images were uploaded successfully');
                throw new Error('No images were uploaded successfully to Google Drive');
            }
            
            setUploadStatus(`Saving to database: ${uploadedPhotos.length} images`);
            
            // Now save the Drive URLs to your backend
            for (let i = 0; i < uploadedPhotos.length; i++) {
                const photo = uploadedPhotos[i];
                
                try {
                    const response = await axios.post(
                        'http://192.168.40.230:4030/api/v2/uploadDeviceImage',
                        {
                            drive_file_id: photo.id,
                            drive_file_name: photo.name,
                            drive_url: photo.url,
                            drive_thumbnail_url: photo.thumbnailUrl,
                            drive_web_view_link: photo.webViewLink,
                            source: 'google_drive',
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            timeout: 10000,
                        }
                    );
                    
                    if (response.data && response.data.image_uid) {
                        uploadedPhotos[i].backend_uid = response.data.image_uid;
                    }
                    
                } catch (backendError) {
                    console.error('Failed to save to backend:', backendError);
                    // Continue - we already have the Drive URL
                }
            }
            
            const updatedUserData = {
                ...userData,
                deckSelected: true,
                deckTitle: "Select from device",
                deckUID: "500-000011", // Unique deck UID for device images
                deckThumbnail_url: uploadedPhotos[0]?.thumbnailUrl || uploadedPhotos[0]?.url, // Use first image as thumbnail
                selectedPhotos: uploadedPhotos,
                isApi: true, // Set to true so it goes through the same flow as other API decks
            };

            navigation.reset({
                index: 0,
                routes: [{ name: 'WaitingRoom', params: { ...updatedUserData } }],
            });
            
        } catch (error) {
            console.error(' ERROR in handleConfirm:', error);
            console.error(' Error message:', error.message);
            console.error(' Error stack:', error.stack);
            Alert.alert(
                'Upload Failed',
                `Failed to upload images: ${error.message}\n\nPlease try again.`,
                [
                    { text: 'OK' }
                ]
            );
        } finally {
            console.log(' Cleaning up, setting uploading to false');
            setUploading(false);
            setUploadProgress(0);
        }
    };

    const handleRemoveImage = (id) => {
        setSelectedImages(prev => prev.filter(img => img.id !== id));
    };

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Selected Images from Device</Text>
            
            {loading ? (
                <ActivityIndicator size="large" color="#0000ff" />
            ) : selectedImages.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No images selected</Text>
                    <TouchableOpacity style={styles.retryButton} onPress={pickImages}>
                        <Text style={styles.retryButtonText}>Select Images</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <FlatList
                        data={selectedImages}
                        keyExtractor={(item) => item.id}
                        numColumns={3}
                        renderItem={({ item }) => (
                            <View style={styles.imageContainer}>
                                <Image source={{ uri: item.uri }} style={styles.image} />
                                <TouchableOpacity 
                                    style={styles.removeButton}
                                    onPress={() => handleRemoveImage(item.id)}
                                >
                                    <Text style={styles.removeButtonText}>✕</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        contentContainerStyle={styles.imageList}
                    />
                    
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity 
                            style={styles.addMoreButton} 
                            onPress={pickImages}
                            disabled={uploading}
                        >
                            <Text style={styles.addMoreButtonText}>Add More Images</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                            style={[styles.confirmButton, uploading && styles.confirmButtonDisabled]} 
                            onPress={handleConfirm}
                            disabled={uploading}
                        >
                            {uploading ? (
                                <View style={styles.uploadingContainer}>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={styles.confirmButtonText}>
                                        {uploadStatus || `Uploading... ${uploadProgress}%`}
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.confirmButtonText}>
                                    Confirm ({selectedImages.length})
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#C8DAD8',
    },
    heading: {
        fontSize: 24,
        fontWeight: 'normal',
        marginBottom: 20,
        textAlign: 'center',
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
    confirmButtonDisabled: {
        backgroundColor: '#999',
    },
    uploadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginLeft: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        marginBottom: 20,
    },
    retryButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
    },
    retryButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default DeviceDeck;
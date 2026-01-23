import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, Alert, StyleSheet, FlatList, ActivityIndicator, Platform } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';

const DeviceDeck = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const [userData, setUserData] = useState(route.params || {});
    const [selectedImages, setSelectedImages] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');

    const pickImages = async () => {
        try {
            if (Platform.OS === 'web') {
                // Web: Use DocumentPicker
                const result = await DocumentPicker.getDocumentAsync({
                    type: 'image/*',
                    multiple: true,
                    copyToCacheDirectory: false,
                });

                if (result.canceled) {
                    return;
                }

                const newPhotos = result.assets ? result.assets.map((asset, index) => ({
                    id: `local_${Date.now()}_${index}`,
                    name: asset.name,
                    uri: asset.uri,
                    type: asset.mimeType || 'image/jpeg',
                    file: asset.file, // Important for web
                })) : [];

                setSelectedImages(prev => [...prev, ...newPhotos]);
            } else {
                // Mobile (iOS/Android): Use ImagePicker
                const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
                
                if (!permissionResult.granted) {
                    Alert.alert(
                        'Permission Required',
                        'Permission to access the media library is required'
                    );
                    return;
                }

                let result = await ImagePicker.launchImageLibraryAsync({
                    mediaTypes: ImagePicker.MediaTypeOptions.Images,
                    allowsMultipleSelection: true,
                    quality: 0.8,
                    selectionLimit: 10,
                });

                if (result.canceled) {
                    return;
                }

                if (result.assets && result.assets.length > 0) {
                    const newPhotos = result.assets.map((asset, index) => ({
                        id: `local_${Date.now()}_${index}`,
                        name: asset.fileName || `Photo_${index + 1}.jpg`,
                        uri: asset.uri,
                        type: asset.type || 'image/jpeg',
                    }));

                    setSelectedImages(prev => [...prev, ...newPhotos]);
                }
            }
        } catch (error) {
            console.error('Error picking images:', error);
            Alert.alert('Error', 'Failed to select images. Please try again.');
        }
    };

    const handleRemoveImage = (id) => {
        setSelectedImages(prev => prev.filter(img => img.id !== id));
    };

    const handleConfirm = async () => {
        if (selectedImages.length === 0) {
            Alert.alert('No Images', 'Please select at least one image');
            return;
        }

        setUploading(true);
        
        try {
            const formData = new FormData();
            
            // Add all images to FormData
            for (let i = 0; i < selectedImages.length; i++) {
                const image = selectedImages[i];
                
                if (Platform.OS === 'web' && image.file) {
                    // Web: Use the File object directly
                    formData.append('file', image.file, image.name);
                } else {
                    // Mobile: Use the URI-based format
                    const uriParts = image.uri.split('.');
                    const fileType = uriParts[uriParts.length - 1].toLowerCase();
                    
                    formData.append('file', {
                        uri: image.uri,
                        name: image.name || `photo_${i}.${fileType}`,
                        type: `image/${fileType}`,
                    });
                }
            }

            setUploadProgress(`Uploading ${selectedImages.length} image(s) to server...`);

            console.log('Uploading images:', selectedImages.length);
            console.log('Platform:', Platform.OS);

            // Upload to backend
            const response = await axios.post(
                'http://192.168.40.230:4030/api/v2/uploadDeviceImage',
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                    timeout: 60000,
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
                source: 'device_s3',
            }));

            const updatedUserData = {
                ...userData,
                deckSelected: true,
                deckTitle: "My Device Photos",
                deckUID: "device-" + Date.now(),
                deckThumbnail_url:  uploadedPhotos[0]?.url || "https://img.icons8.com/fluency/96/upload-to-cloud.png",
                selectedPhotos: uploadedPhotos,
                isApi: true,
            };

            setUserData(updatedUserData);
            navigation.push('WaitingRoom', {...updatedUserData });
        } else {
            throw new Error('No images returned from server');
        }
        
        } catch (error) {
            console.error('Upload error:', error);
            console.error('Error response:', error.response?.data);
            Alert.alert(
                'Upload Failed',
                error.response?.data?.message || error.message || 'Failed to upload images. Please try again.'
            );
        } finally {
            setUploading(false);
            setUploadProgress('');
        }
    };
    
        return (
        <View style={styles.container}>
            <Text style={styles.heading}>Select Images from Device</Text>
            
            {selectedImages.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No images selected</Text>
                    <TouchableOpacity 
                        style={styles.selectButton} 
                        onPress={pickImages}
                        disabled={uploading}
                    >
                        <Text style={styles.selectButtonText}>Select Images</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <>
                    <Text style={styles.selectedCount}>
                        {selectedImages.length} image(s) selected
                    </Text>
                    
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
                                    disabled={uploading}
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
                            <Text style={styles.addMoreButtonText}>Add More</Text>
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
                                        Uploading...
                                    </Text>
                                </View>
                            ) : (
                                <Text style={styles.confirmButtonText}>
                                    Upload ({selectedImages.length})
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
    selectedCount: {
        fontSize: 16,
        color: '#666',
        marginBottom: 10,
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
    selectButton: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 10,
        paddingHorizontal: 30,
    },
    selectButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default DeviceDeck;
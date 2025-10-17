// Camera Screen
// Capture photos for food logging

import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import { uploadFoodPhotos } from '../../api/food'

const MAX_PHOTOS = 5

export function CameraScreen({ navigation }: any) {
  const [facing, setFacing] = useState<CameraType>('back')
  const [permission, requestPermission] = useCameraPermissions()
  const [photos, setPhotos] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const cameraRef = useRef<CameraView>(null)

  // Request camera permissions
  if (!permission) {
    return <View style={styles.container} />
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>
            📸 Camera Permission Required
          </Text>
          <Text style={styles.permissionSubtext}>
            EverMed needs camera access to photograph your meals for food
            tracking
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={requestPermission}
          >
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const takePicture = async () => {
    if (!cameraRef.current || photos.length >= MAX_PHOTOS) return

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
      })

      if (photo) {
        setPhotos([...photos, photo.uri])
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to take picture')
    }
  }

  const pickFromGallery = async () => {
    if (photos.length >= MAX_PHOTOS) {
      Alert.alert('Maximum Reached', `You can only add up to ${MAX_PHOTOS} photos per meal`)
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setPhotos([...photos, result.assets[0].uri])
    }
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  const handleUpload = async (mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    if (photos.length === 0) {
      Alert.alert('No Photos', 'Please take at least one photo')
      return
    }

    setIsUploading(true)
    try {
      const result = await uploadFoodPhotos(photos, mealType)
      Alert.alert(
        'Success',
        `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} logged! AI analysis in progress...`,
        [
          {
            text: 'View Meals',
            onPress: () => {
              setPhotos([])
              navigation.navigate('FoodList')
            },
          },
        ]
      )
    } catch (error: any) {
      Alert.alert('Upload Failed', error.message || 'Failed to upload photos')
    } finally {
      setIsUploading(false)
    }
  }

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'))
  }

  if (photos.length > 0) {
    // Photo review mode
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setPhotos([])}
          >
            <Text style={styles.headerButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {photos.length}/{MAX_PHOTOS} Photos
          </Text>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={pickFromGallery}
            disabled={photos.length >= MAX_PHOTOS}
          >
            <Text
              style={[
                styles.headerButtonText,
                photos.length >= MAX_PHOTOS && styles.headerButtonDisabled,
              ]}
            >
              Add More
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal style={styles.photoScroll}>
          {photos.map((uri, index) => (
            <View key={index} style={styles.photoContainer}>
              <Image source={{ uri }} style={styles.photoPreview} />
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removePhoto(index)}
              >
                <Text style={styles.removeButtonText}>×</Text>
              </TouchableOpacity>
              <Text style={styles.photoNumber}>Photo {index + 1}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.mealTypeContainer}>
          <Text style={styles.mealTypeTitle}>What meal is this?</Text>
          <View style={styles.mealTypeButtons}>
            <TouchableOpacity
              style={styles.mealTypeButton}
              onPress={() => handleUpload('breakfast')}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.mealTypeEmoji}>🌅</Text>
                  <Text style={styles.mealTypeText}>Breakfast</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mealTypeButton}
              onPress={() => handleUpload('lunch')}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.mealTypeEmoji}>☀️</Text>
                  <Text style={styles.mealTypeText}>Lunch</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.mealTypeButtons}>
            <TouchableOpacity
              style={styles.mealTypeButton}
              onPress={() => handleUpload('dinner')}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.mealTypeEmoji}>🌙</Text>
                  <Text style={styles.mealTypeText}>Dinner</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.mealTypeButton}
              onPress={() => handleUpload('snack')}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.mealTypeEmoji}>🍎</Text>
                  <Text style={styles.mealTypeText}>Snack</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    )
  }

  // Camera mode
  return (
    <View style={styles.container}>
      <CameraView style={styles.camera} facing={facing} ref={cameraRef}>
        <View style={styles.cameraOverlay}>
          <View style={styles.cameraHeader}>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cameraButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.cameraTitle}>Take Food Photo</Text>
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={toggleCameraFacing}
            >
              <Text style={styles.cameraButtonText}>Flip</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.cameraFooter}>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickFromGallery}
            >
              <Text style={styles.galleryButtonText}>📷 Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={takePicture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.galleryButton} />
          </View>
        </View>
      </CameraView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#f9fafb',
  },
  permissionText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionSubtext: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 32,
    textAlign: 'center',
    lineHeight: 24,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
  },
  cameraTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  cameraButton: {
    padding: 8,
  },
  cameraButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  cameraFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 48,
  },
  galleryButton: {
    width: 80,
  },
  galleryButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#2563eb',
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#2563eb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#2563eb',
    fontWeight: '600',
  },
  headerButtonDisabled: {
    opacity: 0.4,
  },
  photoScroll: {
    flex: 1,
    backgroundColor: '#000',
  },
  photoContainer: {
    marginHorizontal: 8,
    position: 'relative',
  },
  photoPreview: {
    width: 300,
    height: 400,
    borderRadius: 12,
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 24,
    color: '#fff',
    fontWeight: 'bold',
  },
  photoNumber: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mealTypeContainer: {
    backgroundColor: '#fff',
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  mealTypeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  mealTypeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  mealTypeButton: {
    flex: 1,
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    minHeight: 80,
    justifyContent: 'center',
  },
  mealTypeEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  mealTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})

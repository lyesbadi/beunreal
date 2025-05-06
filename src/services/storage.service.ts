import { Preferences } from "@capacitor/preferences";
import { PhotoData } from "./camera.service";

// Key for photos in storage
const PHOTOS_STORAGE_KEY = "photos";

/**
 * Save a photo to storage
 * @param photo Photo data to save
 */
export const savePhoto = async (photo: PhotoData): Promise<void> => {
  try {
    // Get existing photos
    const photos = await getPhotos();

    // Add new photo at the beginning of the array
    photos.unshift(photo);

    // Save updated photos array
    await Preferences.set({
      key: PHOTOS_STORAGE_KEY,
      value: JSON.stringify(photos),
    });
  } catch (error) {
    console.error("Error saving photo:", error);
    throw error;
  }
};

/**
 * Get all photos from storage
 * @returns Array of photo data
 */
export const getPhotos = async (): Promise<PhotoData[]> => {
  try {
    const result = await Preferences.get({ key: PHOTOS_STORAGE_KEY });

    if (result.value) {
      return JSON.parse(result.value);
    }

    return [];
  } catch (error) {
    console.error("Error getting photos:", error);
    return [];
  }
};

/**
 * Delete a photo from storage
 * @param photoId ID of the photo to delete
 */
export const deletePhoto = async (photoId: string): Promise<void> => {
  try {
    // Get existing photos
    const photos = await getPhotos();

    // Filter out the photo to delete
    const updatedPhotos = photos.filter((photo) => photo.id !== photoId);

    // Save updated photos array
    await Preferences.set({
      key: PHOTOS_STORAGE_KEY,
      value: JSON.stringify(updatedPhotos),
    });
  } catch (error) {
    console.error("Error deleting photo:", error);
    throw error;
  }
};

/**
 * Delete all photos from storage
 */
export const deleteAllPhotos = async (): Promise<void> => {
  try {
    await Preferences.set({
      key: PHOTOS_STORAGE_KEY,
      value: JSON.stringify([]),
    });
  } catch (error) {
    console.error("Error deleting all photos:", error);
    throw error;
  }
};

/**
 * Get a single photo by ID
 * @param photoId ID of the photo to get
 * @returns Photo data or null if not found
 */
export const getPhotoById = async (photoId: string): Promise<PhotoData | null> => {
  try {
    const photos = await getPhotos();
    const photo = photos.find((p) => p.id === photoId);

    return photo || null;
  } catch (error) {
    console.error("Error getting photo by ID:", error);
    return null;
  }
};

import { Camera, CameraResultType, CameraSource, Photo, CameraOptions } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";

export interface PhotoOptions extends Partial<CameraOptions> {
  source?: CameraSource;
}

export interface PhotoData {
  id: string;
  webPath: string;
  timestamp: number;
  dataUrl?: string;
}

/**
 * Take a picture using the device camera
 * @param options Camera options
 * @returns Promise with the photo data
 */
export const takePicture = async (options: PhotoOptions = {}): Promise<Photo> => {
  // Set default options
  const defaultOptions: CameraOptions = {
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    saveToGallery: false,
    correctOrientation: true,
    width: 1200,
    height: 1600,
    presentationStyle: "fullscreen",
  };

  // Merge default options with provided options
  const cameraOptions: CameraOptions = { ...defaultOptions, ...options };

  try {
    // Request camera permissions
    const permissionStatus = await Camera.checkPermissions();

    if (permissionStatus.camera !== "granted") {
      await Camera.requestPermissions();
    }

    // Take the picture
    const photo = await Camera.getPhoto(cameraOptions);

    // If we're on the web platform, we need to get a dataUrl for storage
    if (Capacitor.getPlatform() === "web") {
      if (photo.webPath) {
        const response = await fetch(photo.webPath);
        const blob = await response.blob();
        const reader = new FileReader();

        const dataUrlPromise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            photo.dataUrl = reader.result as string;
            resolve(photo.dataUrl);
          };
        });

        reader.readAsDataURL(blob);
        await dataUrlPromise;
      }
    }

    return photo;
  } catch (error) {
    console.error("Error taking picture:", error);
    throw error;
  }
};

/**
 * Convert a dataUrl to a blob
 * @param dataUrl The dataUrl to convert
 * @returns Blob object
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
};

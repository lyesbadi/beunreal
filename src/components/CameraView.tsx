import React, { useState } from "react";
import { IonButton, IonIcon, IonSpinner, IonText, IonGrid, IonRow, IonCol } from "@ionic/react";
import { camera, flash, flashOff, sync, close } from "ionicons/icons";
import { takePicture, PhotoData } from "../services/camera.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import { savePhoto } from "../services/storage.service";
import "./CameraView.css";

interface CameraViewProps {
  onPhotoTaken?: (photo: PhotoData) => void;
  onClose?: () => void;
}

const CameraView: React.FC<CameraViewProps> = ({ onPhotoTaken, onClose }) => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);

  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const photo = await takePicture({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        width: 1200,
        height: 1600,
        correctOrientation: true,
        presentationStyle: "fullscreen",
        promptLabelHeader: "Take a BeUnreal Photo",
        promptLabelCancel: "Cancel",
        promptLabelPhoto: "Take Photo",
        saveToGallery: false,
      });

      if (photo && photo.webPath) {
        setPhotoUrl(photo.webPath);

        // Save the photo to storage
        const timestamp = new Date().getTime();
        const photoData: PhotoData = {
          id: timestamp.toString(),
          webPath: photo.webPath,
          timestamp: timestamp,
          dataUrl: photo.dataUrl,
        };

        await savePhoto(photoData);

        // Notify parent component
        if (onPhotoTaken) {
          onPhotoTaken(photoData);
        }
      }
    } catch (error) {
      console.error("Error taking photo", error);
      setError("Failed to take photo. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPhotoUrl(null);
    setError(null);
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  return (
    <div className="camera-view">
      {onClose && (
        <IonButton fill="clear" color="light" className="close-button" onClick={onClose}>
          <IonIcon slot="icon-only" icon={close} />
        </IonButton>
      )}

      <IonGrid className="camera-container">
        <IonRow className="ion-justify-content-center ion-align-items-center">
          <IonCol size="12" className="ion-text-center">
            {isLoading ? (
              <div className="loading-container">
                <IonSpinner name="crescent" />
                <IonText color="medium">
                  <p>Taking photo...</p>
                </IonText>
              </div>
            ) : error ? (
              <div className="error-container">
                <IonText color="danger">
                  <p>{error}</p>
                </IonText>
                <IonButton onClick={handleReset} color="medium">
                  Try Again
                </IonButton>
              </div>
            ) : photoUrl ? (
              <div className="photo-preview-container">
                <img src={photoUrl} alt="Captured" className="photo-preview" />
                <div className="photo-actions ion-padding-top">
                  <IonButton onClick={handleReset} color="medium" shape="round">
                    <IonIcon slot="start" icon={sync}></IonIcon>
                    Take Another
                  </IonButton>
                </div>
              </div>
            ) : (
              <div className="camera-prompt">
                <h2>Ready to BeUnreal?</h2>
                <p>Capture your moment now!</p>
                <div className="camera-actions">
                  <IonButton onClick={toggleFlash} fill="clear" color={flashEnabled ? "warning" : "medium"}>
                    <IonIcon icon={flashEnabled ? flash : flashOff} slot="icon-only" />
                  </IonButton>
                  <IonButton
                    onClick={handleTakePhoto}
                    shape="round"
                    size="large"
                    color="primary"
                    className="capture-button"
                  >
                    <IonIcon slot="icon-only" icon={camera}></IonIcon>
                  </IonButton>
                </div>
              </div>
            )}
          </IonCol>
        </IonRow>
      </IonGrid>
    </div>
  );
};

export default CameraView;

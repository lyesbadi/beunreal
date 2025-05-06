import React, { useState } from "react";
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButton,
  IonIcon,
  IonToast,
  IonGrid,
  IonRow,
  IonCol,
  IonText,
  IonSpinner,
} from "@ionic/react";
import { camera, flash, flashOff, syncOutline } from "ionicons/icons";
import { takePicture } from "../services/camera.service";
import { savePhoto } from "../services/storage.service";
import { CameraResultType, CameraSource } from "@capacitor/camera";
import "./Home.css";

const Home: React.FC = () => {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>("");
  const [flashEnabled, setFlashEnabled] = useState<boolean>(false);

  const handleTakePhoto = async () => {
    try {
      setIsLoading(true);
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
        await savePhoto({
          id: timestamp.toString(),
          webPath: photo.webPath,
          timestamp: timestamp,
          dataUrl: photo.dataUrl,
        });

        setToastMessage("Photo saved successfully!");
        setShowToast(true);
      }
    } catch (error) {
      console.error("Error taking photo", error);
      setToastMessage("Failed to take photo");
      setShowToast(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setPhotoUrl(null);
  };

  const toggleFlash = () => {
    setFlashEnabled(!flashEnabled);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>BeUnreal</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen className="ion-padding">
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
              ) : photoUrl ? (
                <div className="photo-preview-container">
                  <img src={photoUrl} alt="Captured" className="photo-preview" />
                  <div className="photo-actions ion-padding-top">
                    <IonButton onClick={handleReset} color="medium" shape="round">
                      <IonIcon slot="start" icon={syncOutline}></IonIcon>
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

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={2000}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default Home;

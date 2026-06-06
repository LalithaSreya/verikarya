import React, { useRef, useState, useEffect } from 'react';

export const CameraCapture = ({ onCapture, onClear }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraError, setCameraError] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Initialize camera stream
  const startCamera = async () => {
    setIsInitializing(true);
    setCameraError(null);
    try {
      // Clean up previous stream if any
      stopCamera();

      // Request camera only
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Prefer rear camera on mobile
          width: { ideal: 640 },
          height: { ideal: 480 }
        },
        audio: false
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      let errorMsg = 'Could not access the camera.';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Camera permission denied. Please grant permission in your browser settings.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'No camera found on this device.';
      }
      setCameraError(errorMsg);
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  // Start camera on mount
  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Take photo snapshot
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      // Set canvas size matching the video feed
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Get base64 data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // 85% quality compress
      setCapturedImage(dataUrl);
      
      // Stop the camera feed to save battery/power
      stopCamera();

      // Notify parent component
      if (onCapture) {
        onCapture(dataUrl);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    if (onClear) {
      onClear();
    }
    startCamera();
  };

  return (
    <div className="camera-box">
      {/* Hidden canvas for snapshot rasterizing */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {cameraError && (
        <div className="alert alert-danger" style={{ width: '100%' }}>
          <div>⚠️ {cameraError}</div>
          <button className="btn btn-outline btn-sm" onClick={startCamera} style={{ marginTop: 'var(--spacing-sm)' }}>
            Try Again
          </button>
        </div>
      )}

      {!capturedImage && !cameraError && (
        <div style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-preview"
          />
          {isInitializing && <p className="text-muted" style={{ margin: 'var(--spacing-sm) 0' }}>Initializing camera feed...</p>}
          
          <div className="camera-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={capturePhoto}
              disabled={isInitializing || !stream}
            >
              📷 Take Photo
            </button>
          </div>
        </div>
      )}

      {capturedImage && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src={capturedImage}
            alt="Captured verification proof"
            className="camera-captured-image"
          />
          <div className="camera-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={retakePhoto}
            >
              🔄 Retake
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraCapture;

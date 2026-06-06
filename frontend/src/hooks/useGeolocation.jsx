import { useState, useCallback } from 'react';

export const useGeolocation = () => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const getLocation = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        const errorMsg = 'Geolocation is not supported by your browser';
        setError(errorMsg);
        reject(errorMsg);
        return;
      }

      setLoading(true);
      setError(null);

      // High accuracy options for geofencing
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(loc);
          setLoading(false);
          resolve(loc);
        },
        (err) => {
          let errorMsg = 'Failed to retrieve your location';
          if (err.code === 1) {
            errorMsg = 'Location permission denied. Please allow location access in your browser settings.';
          } else if (err.code === 2) {
            errorMsg = 'Location unavailable or offline.';
          } else if (err.code === 3) {
            errorMsg = 'Location request timed out.';
          }
          setError(errorMsg);
          setLoading(false);
          reject(errorMsg);
        },
        options
      );
    });
  }, []);

  return {
    location,
    error,
    loading,
    getLocation
  };
};
export default useGeolocation;

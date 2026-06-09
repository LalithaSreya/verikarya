import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal } from 'react-native';
import { api } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/globalStyles';
import CameraCapture from '../components/CameraCapture';
import MapWidget from '../components/MapWidget';
import * as Location from 'expo-location';

export default function VisitSubmitScreen({ route, navigation }) {
  const { visitId } = route.params;
  const [visit, setVisit] = useState(null);
  const [userLoc, setUserLoc] = useState(null);
  const [distance, setDistance] = useState(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [bypassLoading, setBypassLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [showCamera, setShowCamera] = useState(false);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000; // Radius of the earth in m
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance in m
    return Math.round(d);
  };

  const trackUserLocation = async (targetLat, targetLng) => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied. Location is required for field audits.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      setUserLoc({ lat: latitude, lng: longitude });

      if (targetLat && targetLng) {
        const dist = calculateDistance(latitude, longitude, targetLat, targetLng);
        setDistance(dist);
      }
    } catch (err) {
      console.error('Error tracking location:', err);
    }
  };

  useEffect(() => {
    const fetchVisitAndLoc = async () => {
      try {
        const res = await api.get('/visits');
        const found = res.data.data.find(v => v._id === visitId);
        setVisit(found);
        
        if (found) {
          if (found.targetLocation) {
            await trackUserLocation(found.targetLocation.lat, found.targetLocation.lng);
          }
          if (found.status === 'started') {
            const codeRes = await api.post(`/visits/${visitId}/request-code`);
            if (codeRes.data.success) {
              setVerificationCode(codeRes.data.code);
            }
          }
        }
      } catch (err) {
        console.error('Error in fetch:', err);
        alert('Failed to load visit details.');
      } finally {
        setLoading(false);
      }
    };

    fetchVisitAndLoc();
  }, [visitId]);

  const handleStartVisit = async () => {
    setStartLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied. Location is required.');
        setStartLoading(false);
        return;
      }
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      setUserLoc({ lat: latitude, lng: longitude });

      const res = await api.post(`/visits/${visitId}/start`, {
        location: {
          lat: latitude,
          lng: longitude
        }
      });

      if (res.data.success) {
        alert('Audit visit started successfully!');
        // Request code immediately
        const codeRes = await api.post(`/visits/${visitId}/request-code`);
        if (codeRes.data.success) {
          setVerificationCode(codeRes.data.code);
        }
        setVisit(res.data.data);
        if (res.data.data.targetLocation) {
          const dist = calculateDistance(latitude, longitude, res.data.data.targetLocation.lat, res.data.data.targetLocation.lng);
          setDistance(dist);
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to start visit.');
    } finally {
      setStartLoading(false);
    }
  };

  const handleBypassLocation = async () => {
    if (!userLoc) {
      alert('Unable to fetch your current GPS coordinates. Please wait for a GPS lock.');
      return;
    }
    setBypassLoading(true);
    try {
      const res = await api.put(`/visits/${visitId}/bypass-location`, {
        location: {
          lat: userLoc.lat,
          lng: userLoc.lng
        }
      });
      if (res.data.success) {
        alert('Bypassed geofence by setting target coordinates to your current coordinates!');
        setVisit(res.data.data);
        setDistance(0);
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update target location.');
    } finally {
      setBypassLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!photo) {
      alert('A photo proof capture is required.');
      return;
    }

    if (!userLoc) {
      alert('Unable to fetch your current GPS coordinates. Please try again.');
      return;
    }

    if (!verificationCode) {
      alert('Verification code not generated. Please try starting the visit or reloading.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/visits/${visitId}/submit`, {
        location: {
          lat: userLoc.lat,
          lng: userLoc.lng
        },
        photo,
        verificationCode,
        notes: notes.trim()
      });

      if (res.data.success) {
        alert(`Visit submitted successfully!\nVerification Code: ${verificationCode}`);
        navigation.navigate('EmployeeDashboard');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit visit evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!visit) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Visit not found.</Text>
      </View>
    );
  }

  const isWithinGeofence = distance !== null && distance <= 100;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Map Widget Card */}
      <View style={globalStyles.card}>
        <Text style={[globalStyles.title, { fontSize: 16 }]}>{visit.clientName}</Text>
        <Text style={styles.description}>{visit.purpose}</Text>

        <MapWidget 
          userLocation={userLoc} 
          targetLocation={visit.targetLocation} 
          clientName={visit.clientName} 
        />

        {/* Geofence Status Badge */}
        <View style={styles.geofenceRow}>
          <Text style={styles.geofenceLabel}>Geofence Verification Status:</Text>
          {distance === null ? (
            <Text style={[styles.statusText, { color: COLORS.warning }]}>Finding location...</Text>
          ) : isWithinGeofence ? (
            <Text style={[styles.statusText, { color: COLORS.success }]}>
              ✓ IN RANGE ({distance}m away)
            </Text>
          ) : (
            <Text style={[styles.statusText, { color: COLORS.danger }]}>
              ❌ OUT OF RANGE ({distance}m away)
            </Text>
          )}
        </View>
        {!isWithinGeofence && distance !== null && (
          <Text style={styles.warningText}>
            You must be within 100 meters of the client location to complete this visit.
          </Text>
        )}
      </View>

      {/* Conditional UI based on Visit Status */}
      {visit.status === 'pending' ? (
        <View style={globalStyles.card}>
          <Text style={[globalStyles.title, { fontSize: 16, marginBottom: 12 }]}>
            🚀 Start Audit Session
          </Text>
          <Text style={styles.description}>
            You must punch your starting location to initialize this audit session before uploading verification proofs.
          </Text>
          <TouchableOpacity 
            style={globalStyles.btn} 
            onPress={handleStartVisit}
            disabled={startLoading}
          >
            {startLoading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={globalStyles.btnText}>Start Audit (Punch GPS)</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        /* Upload Form Card */
        <View style={globalStyles.card}>
          <Text style={[globalStyles.title, { fontSize: 16, marginBottom: 12 }]}>
            📸 Capture Evidence Proof (Code: {verificationCode || 'N/A'})
          </Text>

          {photo ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photo }} style={styles.photoPreview} />
              <TouchableOpacity 
                style={styles.retakeBtn} 
                onPress={() => setShowCamera(true)}
                disabled={submitting}
              >
                <Text style={styles.retakeText}>Retake Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity 
              style={styles.cameraPlaceholder} 
              onPress={() => setShowCamera(true)}
              disabled={submitting || !isWithinGeofence}
            >
              <Text style={[styles.cameraPlaceholderText, !isWithinGeofence ? { color: COLORS.textMuted } : null]}>
                📷 Capture Client Site Photo
              </Text>
              <Text style={styles.cameraSubtext}>Direct camera capture required (No gallery uploads)</Text>
            </TouchableOpacity>
          )}

          <View style={[globalStyles.inputGroup, { marginTop: 16 }]}>
            <Text style={globalStyles.label}>Execution Notes (Optional)</Text>
            <TextInput
              style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="Add comments, client sign-off remarks, or deliverables..."
              multiline
              numberOfLines={4}
              value={notes}
              onChangeText={setNotes}
              disabled={submitting}
            />
          </View>

          <TouchableOpacity 
            style={[globalStyles.btn, !isWithinGeofence ? { backgroundColor: COLORS.textMuted } : null]} 
            onPress={handleSubmit}
            disabled={submitting || !isWithinGeofence}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={globalStyles.btnText}>Submit Visit Evidence</Text>
            )}
          </TouchableOpacity>

          {/* Testing Bypass Option */}
          {!isWithinGeofence && distance !== null && (
            <View style={{ marginTop: 16, borderTopWidth: 1, borderColor: COLORS.border, paddingTop: 16 }}>
              <TouchableOpacity 
                style={[globalStyles.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.primary }]} 
                onPress={handleBypassLocation}
                disabled={bypassLoading}
              >
                {bypassLoading ? (
                  <ActivityIndicator color={COLORS.primary} size="small" />
                ) : (
                  <Text style={[globalStyles.btnText, { color: COLORS.primary }]}>🔧 Testing Bypass: Set Current GPS as Target</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Camera modal */}
      <Modal visible={showCamera} animationType="slide">
        <CameraCapture 
          onCapture={(capturedPhoto) => {
            setPhoto(capturedPhoto);
            setShowCamera(false);
          }} 
          onCancel={() => setShowCamera(false)} 
        />
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: COLORS.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  errorText: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '600',
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  geofenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  geofenceLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '800',
  },
  warningText: {
    fontSize: 11,
    color: COLORS.danger,
    marginTop: 6,
    fontWeight: '600',
  },
  cameraPlaceholder: {
    height: 160,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  cameraPlaceholderText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 6,
  },
  cameraSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  photoContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  photoPreview: {
    width: '100%',
    height: 200,
    backgroundColor: '#000000',
    resizeMode: 'contain',
  },
  retakeBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  retakeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});

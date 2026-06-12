import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal } from 'react-native';
import { AuthContext, api } from '../context/AuthContext';
import { globalStyles } from '../styles/globalStyles';
import CameraCapture from '../components/CameraCapture';
import * as ImagePicker from 'expo-image-picker';
import MapWidget from '../components/MapWidget';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

export default function VisitSubmitScreen({ route, navigation }) {
  const { colors, theme } = useContext(AuthContext);
  const COLORS = colors;
  const styles = getStyles(colors);
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

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access library was denied. We need gallery permissions to select photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setPhoto(`data:image/jpeg;base64,${result.assets[0].base64}`);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      alert('Failed to pick an image from gallery.');
    }
  };

  const getBackendUrl = () => {
    const base = api.defaults.baseURL || 'https://verikarya.onrender.com/api';
    return base.endsWith('/api') ? base.slice(0, -4) : base;
  };

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return null;
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://') || photoPath.startsWith('data:')) {
      return photoPath;
    }
    const backend = getBackendUrl();
    return `${backend}${photoPath}`;
  };

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

  const fetchVisitDetails = async () => {
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

  useEffect(() => {
    fetchVisitDetails();
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

  const handleSaveProgress = async () => {
    setSubmitting(true);
    try {
      const payload = {
        photo: photo || null,
        notes: notes.trim()
      };
      
      if (userLoc) {
        payload.location = {
          lat: userLoc.lat,
          lng: userLoc.lng
        };
      }

      const res = await api.post(`/visits/${visitId}/progress`, payload);

      if (res.data.success) {
        alert('Daily progress saved successfully!');
        setVisit(res.data.data);
        setPhoto(null);
        setNotes('');
        // Re-calculate geofence values just in case
        if (res.data.data.targetLocation && userLoc) {
          const dist = calculateDistance(userLoc.lat, userLoc.lng, res.data.data.targetLocation.lat, res.data.data.targetLocation.lng);
          setDistance(dist);
        }
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save progress.');
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
      {/* Back button and title */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="arrow-back" size={16} color={COLORS.textMain} style={{ marginRight: 4 }} />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>On-Site Audit Workspace</Text>
      </View>

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
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="checkmark-circle" size={14} color={COLORS.success} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: COLORS.success }]}>
                IN RANGE ({distance}m away)
              </Text>
            </View>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="close-circle" size={14} color={COLORS.danger} style={{ marginRight: 4 }} />
              <Text style={[styles.statusText, { color: COLORS.danger }]}>
                OUT OF RANGE ({distance}m away)
              </Text>
            </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="rocket-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[globalStyles.title, { fontSize: 16, marginBottom: 0 }]}>
              Start Audit Session
            </Text>
          </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="camera-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[globalStyles.title, { fontSize: 16, marginBottom: 0 }]}>
              Capture Evidence Proof (Code: {verificationCode || 'N/A'})
            </Text>
          </View>

          {photo ? (
            <View style={styles.photoContainer}>
              <Image source={{ uri: photo }} style={styles.photoPreview} />
              <View style={styles.retakeBtnRow}>
                <TouchableOpacity 
                  style={styles.retakeBtnItem} 
                  onPress={() => setShowCamera(true)}
                  disabled={submitting}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="camera" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.retakeText}>Retake</Text>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.retakeBtnItem, { borderLeftWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]} 
                  onPress={handlePickImage}
                  disabled={submitting}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name="image-outline" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.retakeText}>Gallery</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.uploadOptionsRow}>
              <TouchableOpacity 
                style={[styles.uploadOptionBtn, !isWithinGeofence ? { opacity: 0.5 } : null]} 
                onPress={() => setShowCamera(true)}
                disabled={submitting || !isWithinGeofence}
              >
                <Ionicons name="camera-outline" size={28} color={COLORS.primary} style={{ marginBottom: 8 }} />
                <Text style={[styles.uploadOptionText, !isWithinGeofence ? { color: COLORS.textMuted } : null]}>Capture Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.uploadOptionBtn, !isWithinGeofence ? { opacity: 0.5 } : null]} 
                onPress={handlePickImage}
                disabled={submitting || !isWithinGeofence}
              >
                <Ionicons name="image-outline" size={28} color={COLORS.primary} style={{ marginBottom: 8 }} />
                <Text style={[styles.uploadOptionText, !isWithinGeofence ? { color: COLORS.textMuted } : null]}>Upload Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[globalStyles.inputGroup, { marginTop: 16 }]}>
            <Text style={globalStyles.label}>Execution Notes / Remarks</Text>
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

          {/* Action Buttons Row */}
          <View style={styles.btnRow}>
            <TouchableOpacity 
              style={[globalStyles.btn, styles.progressBtn]} 
              onPress={handleSaveProgress}
              disabled={submitting}
            >
              <Text style={styles.progressBtnText}>Save Progress</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[globalStyles.btn, styles.completeBtn, !isWithinGeofence ? { backgroundColor: COLORS.textMuted } : null]} 
              onPress={handleSubmit}
              disabled={submitting || !isWithinGeofence}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={globalStyles.btnText}>Complete Visit</Text>
              )}
            </TouchableOpacity>
          </View>

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
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="build-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
                    <Text style={[globalStyles.btnText, { color: COLORS.primary }]}>Testing Bypass: Set Current GPS as Target</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Previous Submissions History List */}
      {visit && visit.progressHistory && visit.progressHistory.length > 0 && (
        <View style={globalStyles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Ionicons name="time-outline" size={16} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[globalStyles.title, { fontSize: 16, marginBottom: 0 }]}>
              Previous Days' Submissions ({visit.progressHistory.length})
            </Text>
          </View>
          <View style={styles.timeline}>
            {visit.progressHistory.map((progress, idx) => (
              <View key={idx} style={styles.timelineItem}>
                <View style={styles.timelineBullet} />
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineIndex}>Update #{idx + 1}</Text>
                    <Text style={styles.timelineTime}>
                      {new Date(progress.timestamp).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={styles.timelineNotes}>{progress.notes || 'Progress update logged.'}</Text>
                  {progress.distance !== undefined && (
                    <Text style={styles.timelineMeta}>
                      GPS Accuracy: {progress.distance}m from target coordinates
                    </Text>
                  )}
                  {progress.photoPath ? (
                    <Image 
                      source={{ uri: getPhotoUrl(progress.photoPath) }} 
                      style={styles.timelinePhoto} 
                    />
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Camera modal */}
      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
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

const getStyles = (COLORS) => StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
  },
  backBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: 12,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
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
    height: 140,
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
    fontSize: 14,
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
  btnRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  progressBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  progressBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  completeBtn: {
    flex: 1.2,
    backgroundColor: COLORS.success || '#10B981',
  },
  timeline: {
    marginTop: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 80,
  },
  timelineBullet: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
    marginTop: 6,
    marginRight: 12,
    zIndex: 2,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
    borderLeftWidth: 1.5,
    borderLeftColor: COLORS.border,
    paddingLeft: 12,
    marginLeft: -17, // Shift overlap to center bullet on line
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineIndex: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  timelineTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  timelineNotes: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
  },
  timelineMeta: {
    fontSize: 11,
    color: COLORS.secondary,
    fontWeight: '600',
    marginTop: 2,
  },
  timelinePhoto: {
    width: 120,
    height: 90,
    borderRadius: 6,
    marginTop: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  uploadOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  uploadOptionBtn: {
    flex: 1,
    height: 120,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: COLORS.bg,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  uploadOptionIcon: {
    fontSize: 28,
    marginBottom: 8,
  },
  uploadOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
  },
  retakeBtnRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  retakeBtnItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

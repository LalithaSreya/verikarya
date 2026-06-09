import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Modal } from 'react-native';
import { api } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/globalStyles';
import CameraCapture from '../components/CameraCapture';

export default function TaskSubmitScreen({ route, navigation }) {
  const { taskId } = route.params;
  const [task, setTask] = useState(null);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState(null); // base64
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  
  // Verification Code State
  const [verificationCode, setVerificationCode] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);

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

  const fetchTaskDetails = async () => {
    try {
      const res = await api.get(`/tasks`);
      const found = res.data.data.find(t => t._id === taskId);
      setTask(found);
      
      if (found) {
        const isCodeRequired = found.requireCode !== false;
        if (isCodeRequired) {
          setCodeLoading(true);
          try {
            const codeRes = await api.post(`/tasks/${taskId}/request-code`);
            if (codeRes.data.success) {
              setVerificationCode(codeRes.data.code);
            }
          } catch (err) {
            console.error('Error generating verification code:', err);
          } finally {
            setCodeLoading(false);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching task details:', err);
      alert('Failed to load task details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const handleSubmit = async () => {
    const isCodeRequired = task.requireCode !== false;
    
    if (isCodeRequired && !verificationCode) {
      alert('Verification code not generated. Please try again.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/tasks/${taskId}/submit`, {
        photo: photo || null,
        verificationCode: isCodeRequired ? verificationCode : null,
        notes: notes.trim()
      });

      if (res.data.success) {
        const confirmMsg = isCodeRequired 
          ? `Task submitted successfully!\nVerification Code: ${verificationCode}` 
          : 'Task submitted successfully without code!';
        alert(confirmMsg);
        navigation.navigate('EmployeeDashboard');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit task evidence.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveProgress = async () => {
    setSubmitting(true);
    try {
      const res = await api.post(`/tasks/${taskId}/progress`, {
        photo: photo || null,
        notes: notes.trim()
      });

      if (res.data.success) {
        alert('Daily progress saved successfully!');
        setTask(res.data.data);
        setPhoto(null);
        setNotes('');
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

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Task not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Back button and title */}
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backBtn} onPress={navigation.goBack}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Task Verification Workspace</Text>
      </View>

      {/* Header Info */}
      <View style={globalStyles.card}>
        <View style={styles.badgeRow}>
          <View style={[globalStyles.badge, { backgroundColor: '#FEF3C7' }]}>
            <Text style={[globalStyles.badgeText, { color: COLORS.warning }]}>
              {task.priority} Priority
            </Text>
          </View>
          <Text style={styles.deadlineText}>
            Due: {new Date(task.deadline).toLocaleDateString()}
          </Text>
        </View>
        
        <Text style={globalStyles.title}>{task.title}</Text>
        <Text style={styles.description}>{task.description}</Text>
        
        <View style={styles.metaRow}>
          <Text style={styles.metaText}>Assigned by: <Text style={{ fontWeight: 'bold' }}>{task.assignedBy?.name || 'Manager'}</Text></Text>
        </View>
      </View>

      {/* Verification Code Box (Conditional) */}
      {task.requireCode !== false && (
        <View style={globalStyles.card}>
          <Text style={[globalStyles.title, { fontSize: 16, marginBottom: 8 }]}>
            🔐 Verification Code
          </Text>
          {codeLoading ? (
            <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 12 }} />
          ) : (
            <View style={styles.codeContainer}>
              <Text style={styles.codeLabel}>VERIKARYA SYSTEM CODE</Text>
              <Text style={styles.codeText}>{verificationCode || 'Not Generated'}</Text>
            </View>
          )}
        </View>
      )}

      {/* Submission Form */}
      <View style={globalStyles.card}>
        <Text style={[globalStyles.title, { fontSize: 16, marginBottom: 12 }]}>
          📸 Work Evidence Input
        </Text>

        {/* Photo preview/placeholder */}
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
            disabled={submitting}
          >
            <Text style={styles.cameraPlaceholderText}>📷 Capture Front Photo Proof</Text>
            <Text style={styles.cameraSubtext}>Direct camera capture required (No gallery uploads)</Text>
          </TouchableOpacity>
        )}

        {/* Notes Input */}
        <View style={[globalStyles.inputGroup, { marginTop: 16 }]}>
          <Text style={globalStyles.label}>Execution Notes / Comments</Text>
          <TextInput
            style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Add comments, daily progress updates, or remarks..."
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
            style={[globalStyles.btn, styles.completeBtn]} 
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={globalStyles.btnText}>Complete Task</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Previous Submissions History List */}
      {task.progressHistory && task.progressHistory.length > 0 && (
        <View style={globalStyles.card}>
          <Text style={[globalStyles.title, { fontSize: 16, marginBottom: 12 }]}>
            ⏳ Previous Days' Submissions ({task.progressHistory.length})
          </Text>
          <View style={styles.timeline}>
            {task.progressHistory.map((progress, idx) => (
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

const styles = StyleSheet.create({
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
  badgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  deadlineText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
  },
  description: {
    fontSize: 14,
    color: COLORS.textMuted,
    lineHeight: 20,
    marginBottom: 12,
  },
  metaRow: {
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 10,
  },
  metaText: {
    fontSize: 12,
    color: COLORS.textMuted,
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
  codeContainer: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 4,
  },
  codeLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    fontWeight: '700',
    letterSpacing: 1,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 2,
    color: COLORS.primary,
    marginTop: 4,
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
  timelinePhoto: {
    width: 120,
    height: 90,
    borderRadius: 6,
    marginTop: 8,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});

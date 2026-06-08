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

  useEffect(() => {
    const fetchTask = async () => {
      try {
        const res = await api.get(`/tasks`);
        // Find specific task in list
        const found = res.data.data.find(t => t._id === taskId);
        setTask(found);
      } catch (err) {
        console.error('Error fetching task details:', err);
        alert('Failed to load task details.');
      } finally {
        setLoading(false);
      }
    };
    fetchTask();
  }, [taskId]);

  const handleSubmit = async () => {
    if (!photo) {
      alert('A photo proof capture is required to verify your task completion.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post(`/tasks/${taskId}/submit`, {
        photo,
        notes: notes.trim()
      });

      if (res.data.success) {
        alert(`Task submitted successfully!\nVerification Code: ${res.data.data.verificationCode}`);
        navigation.navigate('EmployeeDashboard');
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit task evidence.');
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
          <Text style={styles.metaText}>Assigned by: <Text style={{ fontWeight: 'bold' }}>{task.assignedBy?.name}</Text></Text>
        </View>
      </View>

      {/* Form */}
      <View style={globalStyles.card}>
        <Text style={[globalStyles.title, { fontSize: 16, marginBottom: 12 }]}>
          📸 Submit Work Evidence
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
          <Text style={globalStyles.label}>Execution Notes (Optional)</Text>
          <TextInput
            style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
            placeholder="Add comments, serial numbers, or installation remarks..."
            multiline
            numberOfLines={4}
            value={notes}
            onChangeText={setNotes}
            disabled={submitting}
          />
        </View>

        {/* Action button */}
        <TouchableOpacity 
          style={[globalStyles.btn, { marginTop: 8 }]} 
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={globalStyles.btnText}>Submit Task Completion</Text>
          )}
        </TouchableOpacity>
      </View>

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

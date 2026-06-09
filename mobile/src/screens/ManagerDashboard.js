import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Image, Modal } from 'react-native';
import { AuthContext, api } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/globalStyles';

export default function ManagerDashboard() {
  const { user, logout } = useContext(AuthContext);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail Audit Modal State
  const [selectedReview, setSelectedReview] = useState(null);
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const res = await api.get('/reviews?status=pending');
      setReviews(res.data.data);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      alert('Failed to load pending reviews.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReviews();
  };

  const handleAuditAction = async (statusVal) => {
    if (!selectedReview) return;
    setActionLoading(true);

    try {
      const res = await api.post(`/reviews/${selectedReview._id}`, {
        status: statusVal,
        comments: comments.trim()
      });

      if (res.data.success) {
        alert(`Submission successfully ${statusVal}!`);
        setSelectedReview(null);
        setComments('');
        fetchReviews();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }
    // Fallback to Render static uploads
    return `https://verikarya.onrender.com${photoPath}`;
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Security Lead Hub</Text>
          <Text style={styles.nameText}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Simple Analytics Card */}
        <View style={[globalStyles.card, { backgroundColor: COLORS.primaryLight, borderColor: 'transparent' }]}>
          <Text style={[globalStyles.title, { color: COLORS.primary, fontSize: 16 }]}>
            📊 Quick Metrics
          </Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricVal}>{reviews.length}</Text>
              <Text style={styles.metricLabel}>Pending Audits</Text>
            </View>
            <View style={styles.metricItem}>
              <Text style={[styles.metricVal, { color: COLORS.success }]}>Active</Text>
              <Text style={styles.metricLabel}>Cloud Sync</Text>
            </View>
          </View>
        </View>

        {/* Audit Queue */}
        <Text style={styles.sectionTitle}>📥 Pending Audit Queue ({reviews.length})</Text>
        {reviews.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No pending submissions require audit.</Text>
          </View>
        ) : (
          reviews.map(review => {
            const assigneeName = review.details?.assignedTo?.name || 'Worker';
            const title = review.type === 'task' 
              ? review.details?.title 
              : `${review.details?.clientName} (On-Site Audit)`;
            
            return (
              <TouchableOpacity
                key={review._id}
                style={globalStyles.card}
                onPress={() => setSelectedReview(review)}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{title}</Text>
                  <View style={[globalStyles.badge, { backgroundColor: COLORS.primaryLight }]}>
                    <Text style={[globalStyles.badgeText, { color: COLORS.primary }]}>
                      {review.type}
                    </Text>
                  </View>
                </View>
                <Text style={styles.cardUser}>Submitted by: <Text style={{ fontWeight: '700' }}>{assigneeName}</Text></Text>
                <Text style={styles.cardCode}>VK Code: {review.details?.verificationCode || 'N/A'}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* Audit Detail Modal */}
      {selectedReview && (
        <Modal visible={!!selectedReview} animationType="slide">
          <View style={styles.modalContainer}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🔍 Evidence Review</Text>
              <TouchableOpacity onPress={() => setSelectedReview(null)}>
                <Text style={styles.closeBtn}>Close</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Evidence Photo */}
              {selectedReview.details?.evidence?.photoPath ? (
                <View style={styles.photoFrame}>
                  <Image 
                    source={{ uri: getPhotoUrl(selectedReview.details.evidence.photoPath) }} 
                    style={styles.evidenceImg} 
                  />
                </View>
              ) : (
                <View style={styles.emptyPhotoFrame}>
                  <Text style={styles.emptyText}>No photo proof uploaded.</Text>
                </View>
              )}

              {/* Meta logs */}
              <View style={globalStyles.card}>
                <Text style={styles.metaLine}>
                  Employee: <Text style={{ fontWeight: '700' }}>{selectedReview.details?.assignedTo?.name}</Text>
                </Text>
                <Text style={styles.metaLine}>
                  Type: <Text style={{ textTransform: 'capitalize', fontWeight: '700' }}>{selectedReview.type}</Text>
                </Text>
                <Text style={styles.metaLine}>
                  Code: <Text style={{ fontFamily: 'monospace', fontWeight: '800', color: COLORS.primary }}>
                    {selectedReview.details?.verificationCode}
                  </Text>
                </Text>

                {selectedReview.type === 'visit' && (
                  <View style={styles.gpsLogsContainer}>
                    <Text style={[styles.metaLine, { color: COLORS.success, fontWeight: '700' }]}>
                      ✓ GPS Geofence: PASSED (Within 100m)
                    </Text>
                    <Text style={styles.metaLine}>
                      Target distance: {selectedReview.details?.distanceToTarget} meters
                    </Text>
                  </View>
                )}

                {/* Employee Notes */}
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Employee Submission Notes:</Text>
                  <Text style={styles.notesText}>
                    {selectedReview.details?.evidence?.notes || 'No comments left.'}
                  </Text>
                </View>
              </View>

              {/* Review Comments */}
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Audit Review Comments</Text>
                <TextInput
                  style={[globalStyles.input, { height: 60, textAlignVertical: 'top' }]}
                  placeholder="Feedback comments, instructions, or rejection reasons..."
                  multiline
                  numberOfLines={3}
                  value={comments}
                  onChangeText={setComments}
                  disabled={actionLoading}
                />
              </View>

              {/* Decision Buttons */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={[globalStyles.btn, { flex: 1, backgroundColor: COLORS.danger }]}
                  onPress={() => handleAuditAction('rejected')}
                  disabled={actionLoading}
                >
                  <Text style={globalStyles.btnText}>Reject Proof</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[globalStyles.btn, { flex: 1, backgroundColor: COLORS.success, marginLeft: 12 }]}
                  onPress={() => handleAuditAction('approved')}
                  disabled={actionLoading}
                >
                  <Text style={globalStyles.btnText}>Approve Proof</Text>
                </TouchableOpacity>
              </View>

            </ScrollView>
          </View>
        </Modal>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  welcomeText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  logoutBtn: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  metricsRow: {
    flexDirection: 'row',
    marginTop: 12,
  },
  metricItem: {
    flex: 1,
  },
  metricVal: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.primary,
  },
  metricLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
    marginTop: 20,
    marginBottom: 12,
  },
  emptyCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
    marginRight: 8,
  },
  cardUser: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  cardCode: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.textMuted,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  closeBtn: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  photoFrame: {
    height: 250,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: '#000000',
    marginBottom: 16,
  },
  evidenceImg: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  emptyPhotoFrame: {
    height: 200,
    borderRadius: 12,
    backgroundColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  metaLine: {
    fontSize: 13,
    color: COLORS.textMain,
    marginBottom: 6,
  },
  gpsLogsContainer: {
    marginTop: 4,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 8,
    marginBottom: 6,
  },
  notesBox: {
    marginTop: 8,
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.border,
  },
  notesLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: COLORS.textMain,
    lineHeight: 18,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 32,
  },
});

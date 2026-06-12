import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, RefreshControl, Image, Modal, Platform } from 'react-native';
import { AuthContext, api } from '../context/AuthContext';
import { globalStyles } from '../styles/globalStyles';
import { Ionicons } from '@expo/vector-icons';

export default function ManagerDashboard() {
  const { user, logout, colors, theme, toggleTheme } = useContext(AuthContext);
  const COLORS = colors;
  const styles = getStyles(colors);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'assign' | 'logs'
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);

  // Detail Audit Modal State
  const [selectedReview, setSelectedReview] = useState(null);
  const [comments, setComments] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Assignment Form State
  const [assignType, setAssignType] = useState('task'); // 'task' | 'audit'
  const [employeeSelectVisible, setEmployeeSelectVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null); // { _id, name }
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Task form inputs
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskPriority, setTaskPriority] = useState('medium'); // 'low' | 'medium' | 'high'
  const [taskDeadline, setTaskDeadline] = useState(''); // YYYY-MM-DD
  const [taskClientPhone, setTaskClientPhone] = useState('');
  
  // Audit form inputs
  const [auditClient, setAuditClient] = useState('');
  const [auditPurpose, setAuditPurpose] = useState('');
  const [auditLat, setAuditLat] = useState('');
  const [auditLng, setAuditLng] = useState('');
  const [auditDeadline, setAuditDeadline] = useState(''); // YYYY-MM-DD
  const [auditClientPhone, setAuditClientPhone] = useState('');

  const loadAllData = async () => {
    try {
      setLoading(true);
      // 1. Fetch pending reviews
      const reviewsRes = await api.get('/reviews?status=pending');
      setReviews(reviewsRes.data.data);

      // 2. Fetch employees list
      const employeesRes = await api.get('/auth/employees');
      setEmployees(employeesRes.data.data);

      // 3. Fetch attendance logs
      const historyRes = await api.get('/attendance/history');
      setHistory(historyRes.data.data);
    } catch (err) {
      console.error('Error loading manager data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Initialize default deadline (today + 3 days)
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 3);
    const dateStr = defaultDate.toISOString().split('T')[0];
    setTaskDeadline(dateStr);
    setAuditDeadline(dateStr);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
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
        loadAllData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit review decision.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!taskTitle || !taskDesc || !selectedEmployee || !taskDeadline) {
      alert('Please fill in all fields and select an employee.');
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await api.post('/tasks', {
        title: taskTitle.trim(),
        description: taskDesc.trim(),
        assignedTo: selectedEmployee._id,
        priority: taskPriority,
        deadline: taskDeadline,
        clientPhone: taskClientPhone.trim()
      });
      if (res.data.success) {
        alert('Compliance Task assigned successfully!');
        setTaskTitle('');
        setTaskDesc('');
        setTaskClientPhone('');
        setSelectedEmployee(null);
        loadAllData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to assign task.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleCreateAudit = async () => {
    const latVal = parseFloat(auditLat);
    const lngVal = parseFloat(auditLng);

    if (!auditClient || !auditPurpose || !selectedEmployee || isNaN(latVal) || isNaN(lngVal) || !auditDeadline) {
      alert('Please fill in all fields with valid coordinates.');
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await api.post('/visits', {
        clientName: auditClient.trim(),
        purpose: auditPurpose.trim(),
        assignedTo: selectedEmployee._id,
        targetLocation: {
          lat: latVal,
          lng: lngVal
        },
        deadline: auditDeadline,
        clientPhone: auditClientPhone.trim()
      });
      if (res.data.success) {
        alert('On-Site Audit scheduled successfully!');
        setAuditClient('');
        setAuditPurpose('');
        setAuditLat('');
        setAuditLng('');
        setAuditClientPhone('');
        setSelectedEmployee(null);
        loadAllData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to schedule audit.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const getPhotoUrl = (photoPath) => {
    if (!photoPath) return '';
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }
    return `https://verikarya.onrender.com${photoPath}`;
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderQueueContent = () => {
    return (
      <ScrollView
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Simple Analytics Card */}
        <View style={[globalStyles.card, { backgroundColor: COLORS.primaryLight, borderColor: 'transparent' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="stats-chart" size={18} color={COLORS.primary} style={{ marginRight: 6 }} />
            <Text style={[globalStyles.title, { color: COLORS.primary, fontSize: 16, marginBottom: 0 }]}>
              Quick Metrics
            </Text>
          </View>
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 8 }}>
          <Ionicons name="download-outline" size={18} color={COLORS.textMain} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>Pending Audit Queue ({reviews.length})</Text>
        </View>
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
                    <Text style={[globalStyles.badgeText, { color: COLORS.primary, textTransform: 'uppercase' }]}>
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
    );
  };

  const renderAssignForm = () => {
    return (
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View style={styles.formToggleContainer}>
          <TouchableOpacity 
            style={[styles.formToggleBtn, assignType === 'task' ? styles.activeFormToggleBtn : null]}
            onPress={() => setAssignType('task')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="clipboard-outline" size={16} color={assignType === 'task' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.formToggleText, assignType === 'task' ? styles.activeFormToggleText : null]}>Assign Task</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.formToggleBtn, assignType === 'audit' ? styles.activeFormToggleBtn : null]}
            onPress={() => setAssignType('audit')}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="location-outline" size={16} color={assignType === 'audit' ? COLORS.primary : COLORS.textMuted} style={{ marginRight: 6 }} />
              <Text style={[styles.formToggleText, assignType === 'audit' ? styles.activeFormToggleText : null]}>Assign Audit</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Selected Employee Picker */}
        <View style={globalStyles.inputGroup}>
          <Text style={globalStyles.label}>Select Assignee</Text>
          <TouchableOpacity 
            style={styles.pickerButton}
            onPress={() => setEmployeeSelectVisible(true)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="person-outline" size={16} color={COLORS.textMain} style={{ marginRight: 6 }} />
              <Text style={styles.pickerButtonText}>
                {selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.email})` : 'Select an Employee...'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {assignType === 'task' ? (
          <View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Task Title</Text>
              <TextInput 
                style={globalStyles.input}
                placeholder="e.g. Configure Firewall security policies"
                value={taskTitle}
                onChangeText={setTaskTitle}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Task Description</Text>
              <TextInput 
                style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe compliance verification requirements..."
                multiline
                numberOfLines={3}
                value={taskDesc}
                onChangeText={setTaskDesc}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Priority Level</Text>
              <View style={styles.priorityContainer}>
                {['low', 'medium', 'high'].map(p => (
                  <TouchableOpacity 
                    key={p} 
                    style={[styles.priorityBtn, taskPriority === p ? styles.activePriorityBtn : null]}
                    onPress={() => setTaskPriority(p)}
                  >
                    <Text style={[styles.priorityBtnText, taskPriority === p ? styles.activePriorityBtnText : null]}>
                      {p.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Deadline Date (YYYY-MM-DD)</Text>
              <TextInput 
                style={globalStyles.input}
                placeholder="YYYY-MM-DD"
                value={taskDeadline}
                onChangeText={setTaskDeadline}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Client WhatsApp Number</Text>
              <TextInput 
                style={globalStyles.input}
                placeholder="e.g. +919876543210 or 9876543210"
                keyboardType="phone-pad"
                value={taskClientPhone}
                onChangeText={setTaskClientPhone}
              />
            </View>

            <TouchableOpacity 
              style={[globalStyles.btn, { marginTop: 12 }]}
              onPress={handleCreateTask}
              disabled={formSubmitting}
            >
              {formSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={globalStyles.btnText}>Assign Compliance Task</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Client Name</Text>
              <TextInput 
                style={globalStyles.input}
                placeholder="e.g. Apex Corp Headquarters"
                value={auditClient}
                onChangeText={setAuditClient}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Audit Purpose</Text>
              <TextInput 
                style={[globalStyles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Describe server room audit or biometric lock checks..."
                multiline
                numberOfLines={3}
                value={auditPurpose}
                onChangeText={setAuditPurpose}
              />
            </View>
            
            <View style={styles.coordinatesRow}>
              <View style={[globalStyles.inputGroup, { flex: 1 }]}>
                <Text style={globalStyles.label}>Latitude</Text>
                <TextInput 
                  style={globalStyles.input}
                  placeholder="e.g. 12.9716"
                  keyboardType="numeric"
                  value={auditLat}
                  onChangeText={setAuditLat}
                />
              </View>
              <View style={[globalStyles.inputGroup, { flex: 1, marginLeft: 12 }]}>
                <Text style={globalStyles.label}>Longitude</Text>
                <TextInput 
                  style={globalStyles.input}
                  placeholder="e.g. 77.5946"
                  keyboardType="numeric"
                  value={auditLng}
                  onChangeText={setAuditLng}
                />
              </View>
            </View>

            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Deadline Date (YYYY-MM-DD)</Text>
              <TextInput 
                style={globalStyles.input}
                placeholder="YYYY-MM-DD"
                value={auditDeadline}
                onChangeText={setAuditDeadline}
              />
            </View>
            <View style={globalStyles.inputGroup}>
              <Text style={globalStyles.label}>Client WhatsApp Number</Text>
              <TextInput 
                style={globalStyles.input}
                placeholder="e.g. +919876543210 or 9876543210"
                keyboardType="phone-pad"
                value={auditClientPhone}
                onChangeText={setAuditClientPhone}
              />
            </View>

            <TouchableOpacity 
              style={[globalStyles.btn, { marginTop: 12 }]}
              onPress={handleCreateAudit}
              disabled={formSubmitting}
            >
              {formSubmitting ? <ActivityIndicator color="#FFF" /> : <Text style={globalStyles.btnText}>Schedule On-Site Audit</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    );
  };

  const renderLogsContent = () => {
    return (
      <ScrollView 
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
          <Ionicons name="calendar-outline" size={18} color={COLORS.textMain} style={{ marginRight: 6 }} />
          <Text style={[styles.sectionTitle, { marginBottom: 0, marginTop: 0 }]}>Employee Attendance Logs ({history.length})</Text>
        </View>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No attendance records logged.</Text>
          </View>
        ) : (
          history.map(record => (
            <View key={record._id} style={globalStyles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.logEmployeeName}>{record.user?.name}</Text>
                <Text style={styles.logDate}>{record.date}</Text>
              </View>
              
              <View style={styles.logPunchesRow}>
                <View style={styles.logPunchBox}>
                  <Text style={styles.logPunchTitle}>Clock-In</Text>
                  <Text style={styles.logPunchTime}>{formatTime(record.checkIn)}</Text>
                  <Text style={styles.logPunchMeta}>Code: {record.checkInCode || 'N/A'}</Text>
                  <Text style={styles.logPunchMeta}>Distance: {record.checkInDistance ? `${Math.round(record.checkInDistance)}m` : '---'}</Text>
                </View>
                
                <View style={[styles.logPunchBox, { borderLeftWidth: 1, borderColor: COLORS.border }]}>
                  <Text style={styles.logPunchTitle}>Clock-Out</Text>
                  <Text style={styles.logPunchTime}>{formatTime(record.checkOut)}</Text>
                  <Text style={styles.logPunchMeta}>Code: {record.checkOutCode || 'N/A'}</Text>
                  <Text style={styles.logPunchMeta}>Distance: {record.checkOutDistance ? `${Math.round(record.checkOutDistance)}m` : '---'}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'queue':
        return renderQueueContent();
      case 'assign':
        return renderAssignForm();
      case 'logs':
        return renderLogsContent();
      default:
        return null;
    }
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
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity 
            style={styles.headerBtn} 
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={18} color={COLORS.textMain} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderTabContent()}

      {/* Custom Bottom Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setActiveTab('queue')}
        >
          <Ionicons 
            name={activeTab === 'queue' ? 'layers' : 'layers-outline'} 
            size={22} 
            color={activeTab === 'queue' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, activeTab === 'queue' ? styles.activeTabLabel : null]}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setActiveTab('assign')}
        >
          <Ionicons 
            name={activeTab === 'assign' ? 'add-circle' : 'add-circle-outline'} 
            size={22} 
            color={activeTab === 'assign' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, activeTab === 'assign' ? styles.activeTabLabel : null]}>Assign</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setActiveTab('logs')}
        >
          <Ionicons 
            name={activeTab === 'logs' ? 'calendar' : 'calendar-outline'} 
            size={22} 
            color={activeTab === 'logs' ? COLORS.primary : COLORS.textMuted} 
          />
          <Text style={[styles.tabLabel, activeTab === 'logs' ? styles.activeTabLabel : null]}>Attendance</Text>
        </TouchableOpacity>
      </View>

      {/* Audit Detail Modal */}
      {selectedReview && (
        <Modal visible={!!selectedReview} animationType="slide" onRequestClose={() => setSelectedReview(null)}>
          <View style={styles.modalContainer}>
            
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
                <Ionicons name="search-outline" size={20} color={COLORS.primary} style={{ marginRight: 8 }} />
                <Text style={[styles.modalTitle, { marginBottom: 0 }]}>Evidence Review</Text>
              </View>
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
                  Employee: <Text style={{ fontWeight: '700' }}>{selectedReview.details?.assignedTo?.name || 'Worker'}</Text>
                </Text>
                <Text style={styles.metaLine}>
                  Type: <Text style={{ textTransform: 'capitalize', fontWeight: '700' }}>{selectedReview.type}</Text>
                </Text>
                <Text style={styles.metaLine}>
                  Code: <Text style={{ fontFamily: 'monospace', fontWeight: '800', color: COLORS.primary }}>
                    {selectedReview.details?.verificationCode || 'N/A'}
                  </Text>
                </Text>

                {selectedReview.type === 'visit' && (
                  <View style={styles.gpsLogsContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                      <Ionicons name="checkmark-circle" size={14} color={COLORS.success} style={{ marginRight: 4 }} />
                      <Text style={[styles.metaLine, { color: COLORS.success, fontWeight: '700', marginBottom: 0 }]}>
                        GPS Geofence: PASSED (Within 100m)
                      </Text>
                    </View>
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

      {/* Employee Select Modal */}
      <Modal visible={employeeSelectVisible} animationType="slide" transparent onRequestClose={() => setEmployeeSelectVisible(false)}>
        <View style={styles.selectModalOverlay}>
          <View style={styles.selectModalContent}>
            <Text style={styles.selectModalTitle}>Select Employee</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              {employees.length === 0 ? (
                <Text style={{ textAlign: 'center', padding: 20, color: COLORS.textMuted }}>No employees found.</Text>
              ) : (
                employees.map(emp => (
                  <TouchableOpacity 
                    key={emp._id}
                    style={styles.selectModalItem}
                    onPress={() => {
                      setSelectedEmployee(emp);
                      setEmployeeSelectVisible(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="person-outline" size={14} color={COLORS.textMain} style={{ marginRight: 6 }} />
                      <Text style={styles.selectModalItemText}>{emp.name}</Text>
                    </View>
                    <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{emp.email}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity 
              style={[globalStyles.btn, { backgroundColor: COLORS.danger, marginTop: 12 }]}
              onPress={() => setEmployeeSelectVisible(false)}
            >
              <Text style={globalStyles.btnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const getStyles = (COLORS) => StyleSheet.create({
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBtn: {
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
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
  tabBar: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: Platform.OS === 'ios' ? 32 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    paddingTop: 8,
    paddingBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeTabLabel: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  formToggleContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.border,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  formToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeFormToggleBtn: {
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  formToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeFormToggleText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  pickerButton: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
  },
  pickerButtonText: {
    fontSize: 14,
    color: COLORS.textMain,
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: COLORS.card,
  },
  activePriorityBtn: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  priorityBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activePriorityBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  coordinatesRow: {
    flexDirection: 'row',
  },
  selectModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  selectModalContent: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
  },
  selectModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 16,
  },
  selectModalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  selectModalItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  logEmployeeName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  logDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  logPunchesRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  logPunchBox: {
    flex: 1,
    paddingHorizontal: 8,
  },
  logPunchTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    marginBottom: 4,
  },
  logPunchTime: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 2,
  },
  logPunchMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
});

import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { AuthContext, api } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/globalStyles';
import CameraCapture from '../components/CameraCapture';
import * as Location from 'expo-location';

export default function EmployeeDashboard({ navigation }) {
  const { user, logout } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);
  const [visits, setVisits] = useState([]);
  const [attendance, setAttendance] = useState(null); // today's attendance record
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'tasks' | 'visits'

  // Camera punch state
  const [showCamera, setShowCamera] = useState(false);
  const [cameraMode, setCameraMode] = useState('in'); // 'in' | 'out'
  const [punchLoading, setPunchLoading] = useState(false);
  const [punchMessage, setPunchMessage] = useState('');

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // 1. Fetch attendance status
      const attRes = await api.get('/attendance/status');
      setAttendance(attRes.data.data);

      // 2. Fetch tasks
      const tasksRes = await api.get('/tasks');
      setTasks(tasksRes.data.data.filter(t => t.status !== 'completed'));

      // 3. Fetch visits
      const visitsRes = await api.get('/visits');
      setVisits(visitsRes.data.data.filter(v => v.status !== 'completed'));

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const handlePunchPress = (mode) => {
    setCameraMode(mode);
    setShowCamera(true);
  };

  const handleCameraCapture = async (photoBase64) => {
    setShowCamera(false);
    setPunchLoading(true);
    setPunchMessage(cameraMode === 'in' ? 'Clocking In...' : 'Clocking Out...');

    try {
      // 1. Request GPS Location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied. Location is required to verify attendance.');
        setPunchLoading(false);
        return;
      }

      // 2. Get high-accuracy GPS coordinates
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;

      // 3. Submit to backend
      const endpoint = cameraMode === 'in' ? '/attendance/clock-in' : '/attendance/clock-out';
      const res = await api.post(endpoint, {
        lat: latitude,
        lng: longitude,
        photo: photoBase64
      });

      if (res.data.success) {
        alert(`Success! Generated verification code: ${res.data.data.checkInCode || res.data.data.checkOutCode}`);
        loadDashboardData();
      }
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to submit attendance punch.');
    } finally {
      setPunchLoading(false);
      setPunchMessage('');
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={[styles.loadingText, { marginTop: 12 }]}>Loading your dashboard...</Text>
      </View>
    );
  }

  // Determine current shift state
  const isClockedIn = attendance && attendance.checkIn && !attendance.checkOut;
  const isShiftDone = attendance && attendance.checkIn && attendance.checkOut;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'attendance':
        return (
          <ScrollView 
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {/* Attendance card */}
            <View style={globalStyles.card}>
              <Text style={[globalStyles.title, { fontSize: 16 }]}>🕒 Shift Tracker</Text>
              
              {isShiftDone ? (
                <View style={styles.shiftDoneContainer}>
                  <Text style={styles.shiftDoneText}>Shift Completed Today</Text>
                  <Text style={styles.shiftTimeDetails}>
                    In: {formatTime(attendance.checkIn)} | Out: {formatTime(attendance.checkOut)}
                  </Text>
                </View>
              ) : isClockedIn ? (
                <View>
                  <Text style={styles.activeShiftText}>Currently On Duty</Text>
                  <Text style={styles.shiftTimeDetails}>Clocked in at: {formatTime(attendance.checkIn)}</Text>
                  
                  <TouchableOpacity 
                    style={[globalStyles.btn, { backgroundColor: COLORS.danger, marginTop: 16 }]}
                    onPress={() => handlePunchPress('out')}
                    disabled={punchLoading}
                  >
                    <Text style={globalStyles.btnText}>Clock-Out</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.inactiveShiftText}>Off Duty</Text>
                  <Text style={styles.shiftTimeDetails}>You are currently clocked out.</Text>
                  
                  <TouchableOpacity 
                    style={[globalStyles.btn, { backgroundColor: COLORS.success, marginTop: 16 }]}
                    onPress={() => handlePunchPress('in')}
                    disabled={punchLoading}
                  >
                    <Text style={globalStyles.btnText}>Clock-In</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Dashboard Summary card */}
            <View style={[globalStyles.card, { marginTop: 16 }]}>
              <Text style={styles.infoTitle}>📊 Daily Tasks Overview</Text>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned Desk Tasks</Text>
                <Text style={styles.infoValue}>{tasks.length} pending</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned Field Visits</Text>
                <Text style={styles.infoValue}>{visits.length} pending</Text>
              </View>
              
              <Text style={[styles.shiftTimeDetails, { marginTop: 12, textAlign: 'center', fontStyle: 'italic' }]}>
                Use the bottom navigation tabs to access desk tasks and field visits.
              </Text>
            </View>
          </ScrollView>
        );
      case 'tasks':
        return (
          <ScrollView 
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <Text style={styles.sectionTitle}>📋 Assigned Desk Tasks ({tasks.length})</Text>
            {tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No pending desk tasks assigned.</Text>
              </View>
            ) : (
              tasks.map(task => (
                <TouchableOpacity 
                  key={task._id} 
                  style={globalStyles.card}
                  onPress={() => navigation.navigate('TaskSubmit', { taskId: task._id })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{task.title}</Text>
                    <View style={[globalStyles.badge, { backgroundColor: '#FEF3C7' }]}>
                      <Text style={[globalStyles.badgeText, { color: COLORS.warning }]}>Task</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc} numberOfLines={3}>{task.description}</Text>
                  <Text style={styles.cardDeadline}>
                    Due: {new Date(task.deadline).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        );
      case 'visits':
        return (
          <ScrollView 
            contentContainerStyle={{ padding: 16 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <Text style={styles.sectionTitle}>📍 Field Client Visits ({visits.length})</Text>
            {visits.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No pending field visits assigned.</Text>
              </View>
            ) : (
              visits.map(visit => (
                <TouchableOpacity 
                  key={visit._id} 
                  style={globalStyles.card}
                  onPress={() => navigation.navigate('VisitSubmit', { visitId: visit._id })}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{visit.clientName}</Text>
                    <View style={[globalStyles.badge, { backgroundColor: COLORS.primaryLight }]}>
                      <Text style={[globalStyles.badgeText, { color: COLORS.primary }]}>Visit</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc} numberOfLines={3}>{visit.purpose}</Text>
                  <Text style={styles.cardDeadline}>
                    Due: {new Date(visit.deadline).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        );
      default:
        return null;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.nameText}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {renderTabContent()}

      {/* Custom Bottom Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setActiveTab('attendance')}
        >
          <Text style={styles.tabIcon}>🕒</Text>
          <Text style={[styles.tabLabel, activeTab === 'attendance' ? styles.activeTabLabel : null]}>Shift</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setActiveTab('tasks')}
        >
          <Text style={styles.tabIcon}>📋</Text>
          <Text style={[styles.tabLabel, activeTab === 'tasks' ? styles.activeTabLabel : null]}>Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setActiveTab('visits')}
        >
          <Text style={styles.tabIcon}>📍</Text>
          <Text style={[styles.tabLabel, activeTab === 'visits' ? styles.activeTabLabel : null]}>Visits</Text>
        </TouchableOpacity>
      </View>

      {/* Camera modal popup */}
      <Modal visible={showCamera} animationType="slide">
        <CameraCapture 
          onCapture={handleCameraCapture} 
          onCancel={() => setShowCamera(false)} 
        />
      </Modal>

      {/* Loading Modal overlay during location fetch/punch */}
      <Modal visible={punchLoading} transparent>
        <View style={styles.overlayContainer}>
          <View style={styles.loadingModal}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingModalText}>{punchMessage}</Text>
          </View>
        </View>
      </Modal>

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
  loadingText: {
    fontSize: 14,
    color: COLORS.textMuted,
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
  shiftDoneContainer: {
    alignItems: 'center',
    padding: 16,
  },
  shiftDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.success,
  },
  activeShiftText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  inactiveShiftText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  shiftTimeDetails: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
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
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
    flex: 1,
    marginRight: 8,
  },
  cardDesc: {
    fontSize: 13,
    color: COLORS.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardDeadline: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.danger,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModal: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  loadingModalText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  tabBar: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 18 : 8,
    paddingTop: 8,
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
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  infoLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
});

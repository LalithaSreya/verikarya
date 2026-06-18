import React, { useState, useEffect, useContext, useRef } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal, Platform } from 'react-native';
import { AuthContext, api } from '../context/AuthContext';
import CameraCapture from '../components/CameraCapture';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

const getCurrentLocationHelper = async () => {
  const hasServices = await Location.hasServicesEnabledAsync();
  if (!hasServices) {
    throw new Error('GPS/Location services are disabled on your device. Please enable them in your settings.');
  }
  
  try {
    return await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      timeout: 8000
    });
  } catch (highAccError) {
    console.warn('High accuracy location fetch failed, trying balanced accuracy:', highAccError);
    try {
      return await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeout: 5000
      });
    } catch (balancedError) {
      console.warn('Balanced accuracy location fetch failed, trying last known position:', balancedError);
      const lastKnown = await Location.getLastKnownPositionAsync();
      if (lastKnown) {
        return lastKnown;
      }
      throw new Error('Unable to obtain GPS coordinates. Please ensure you have a clear sky view or check location settings.');
    }
  }
};

export default function EmployeeDashboard({ navigation }) {
  const { user, logout, colors, theme, toggleTheme } = useContext(AuthContext);
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
  const [bypassLoading, setBypassLoading] = useState(false);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const styles = getStyles(colors);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      // 1. Fetch attendance status
      const attRes = await api.get('/attendance/today');
      if (isMountedRef.current) setAttendance(attRes.data.data);

      // 2. Fetch tasks
      const tasksRes = await api.get('/tasks');
      if (isMountedRef.current) setTasks(tasksRes.data.data.filter(t => t.status !== 'completed'));

      // 3. Fetch visits
      const visitsRes = await api.get('/visits');
      if (isMountedRef.current) setVisits(visitsRes.data.data.filter(v => v.status !== 'completed'));

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
        setRefreshing(false);
      }
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
    setPunchMessage(cameraMode === 'in' ? 'Generating Secure Code...' : 'Generating Secure Code...');

    try {
      // 1. Request GPS Location permissions
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied. Location is required to verify attendance.');
        if (isMountedRef.current) setPunchLoading(false);
        return;
      }

      // 2. Get GPS coordinates using helper
      let location = await getCurrentLocationHelper();
      const { latitude, longitude } = location.coords;

      // 3. Request verification code from backend first
      const actionType = cameraMode === 'in' ? 'checkin' : 'checkout';
      const codeRes = await api.post('/attendance/request-code', { action: actionType });
      if (!codeRes.data.success) {
        alert('Failed to generate verification code.');
        if (isMountedRef.current) setPunchLoading(false);
        return;
      }
      const verificationCode = codeRes.data.code;

      // 4. Submit punch to backend
      if (isMountedRef.current) {
        setPunchMessage(cameraMode === 'in' ? 'Clocking In...' : 'Clocking Out...');
      }
      const endpoint = cameraMode === 'in' ? '/attendance/checkin' : '/attendance/checkout';
      const res = await api.post(endpoint, {
        photo: photoBase64,
        verificationCode,
        location: {
          lat: latitude,
          lng: longitude
        }
      });

      if (res.data.success) {
        alert(`Success! Attendance verified. Verification code: ${verificationCode}`);
        if (isMountedRef.current) loadDashboardData();
      }
    } catch (err) {
      alert(err.message || err.response?.data?.error || 'Failed to submit attendance punch.');
    } finally {
      if (isMountedRef.current) {
        setPunchLoading(false);
        setPunchMessage('');
      }
    }
  };

  const handleBypassOfficeLocation = async () => {
    setBypassLoading(true);
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        alert('Permission to access location was denied. Location is required.');
        if (isMountedRef.current) setBypassLoading(false);
        return;
      }
      let location = await getCurrentLocationHelper();
      const { latitude, longitude } = location.coords;

      const res = await api.put('/auth/office-location', {
        location: {
          lat: latitude,
          lng: longitude
        }
      });

      if (res.data.success) {
        alert('Office location successfully updated to your current coordinates! You can now clock in/out.');
      }
    } catch (err) {
      alert(err.message || err.response?.data?.error || 'Failed to update office location.');
    } finally {
      if (isMountedRef.current) setBypassLoading(false);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '---';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
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
            <View style={styles.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="time" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                <Text style={styles.cardHeaderTitle}>Shift Tracker</Text>
              </View>
              
              {isShiftDone ? (
                <View style={styles.shiftDoneContainer}>
                  <Ionicons name="checkmark-circle" size={48} color={colors.success} style={{ marginBottom: 8 }} />
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
                    style={[styles.btn, { backgroundColor: colors.danger, marginTop: 16 }]}
                    onPress={() => handlePunchPress('out')}
                    disabled={punchLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="log-out-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnText}>Clock-Out</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={styles.inactiveShiftText}>Off Duty</Text>
                  <Text style={styles.shiftTimeDetails}>You are currently clocked out.</Text>
                  
                  <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: colors.success, marginTop: 16 }]}
                    onPress={() => handlePunchPress('in')}
                    disabled={punchLoading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="log-in-outline" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.btnText}>Clock-In</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Testing Bypass Option */}
              {!isShiftDone && (
                <View style={{ marginTop: 16, borderTopWidth: 1, borderColor: colors.border, paddingTop: 16 }}>
                  <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.primary }]} 
                    onPress={handleBypassOfficeLocation}
                    disabled={bypassLoading}
                    activeOpacity={0.7}
                  >
                    {bypassLoading ? (
                      <ActivityIndicator color={colors.primary} size="small" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="build-outline" size={16} color={colors.primary} style={{ marginRight: 6 }} />
                        <Text style={[styles.btnText, { color: colors.primary }]}>Testing Bypass: Set Current GPS as Office</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Dashboard Summary card */}
            <View style={[styles.card, { marginTop: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <Ionicons name="pie-chart" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
                <Text style={styles.infoTitle}>Daily Operations Overview</Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned Tasks</Text>
                <Text style={styles.infoValue}>{tasks.length} pending</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Assigned Field Audits</Text>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="clipboard" size={20} color={colors.primary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>Assigned Desk Tasks ({tasks.length})</Text>
            </View>
            
            {tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={32} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyText}>No pending desk tasks assigned.</Text>
              </View>
            ) : (
              tasks.map(task => (
                <TouchableOpacity 
                  key={task._id} 
                  style={styles.card}
                  onPress={() => navigation.navigate('TaskSubmit', { taskId: task._id })}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{task.title}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>Task</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc} numberOfLines={3}>{task.description}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="calendar-outline" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                    <Text style={styles.cardDeadline}>
                      Due: {new Date(task.deadline).toLocaleDateString()}
                    </Text>
                  </View>
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
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="location" size={20} color={colors.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.sectionTitle}>On-Site Audits & Solution Deployments ({visits.length})</Text>
            </View>
            
            {visits.length === 0 ? (
              <View style={styles.emptyCard}>
                <Ionicons name="compass-outline" size={32} color={colors.textMuted} style={{ marginBottom: 6 }} />
                <Text style={styles.emptyText}>No pending field visits assigned.</Text>
              </View>
            ) : (
              visits.map(visit => (
                <TouchableOpacity 
                  key={visit._id} 
                  style={styles.card}
                  onPress={() => navigation.navigate('VisitSubmit', { visitId: visit._id })}
                  activeOpacity={0.9}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{visit.clientName}</Text>
                    <View style={[styles.badge, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.badgeText, { color: colors.primary }]}>Visit</Text>
                    </View>
                  </View>
                  <Text style={styles.cardDesc} numberOfLines={3}>{visit.purpose}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Ionicons name="calendar-outline" size={14} color={colors.danger} style={{ marginRight: 4 }} />
                    <Text style={styles.cardDeadline}>
                      Due: {new Date(visit.deadline).toLocaleDateString()}
                    </Text>
                  </View>
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
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      
      {/* Header bar */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Hello,</Text>
          <Text style={styles.nameText}>{user?.name}</Text>
        </View>
        
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity 
            style={styles.headerBtn} 
            onPress={toggleTheme}
            activeOpacity={0.7}
          >
            <Ionicons name={theme === 'light' ? 'moon-outline' : 'sunny-outline'} size={18} color={colors.textMain} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.logoutBtn} 
            onPress={logout}
            activeOpacity={0.7}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderTabContent()}

      {/* Custom Bottom Tab Navigation Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setActiveTab('attendance')}
        >
          <Ionicons 
            name={activeTab === 'attendance' ? 'time' : 'time-outline'} 
            size={22} 
            color={activeTab === 'attendance' ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabLabel, activeTab === 'attendance' ? styles.activeTabLabel : null]}>Shift</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setActiveTab('tasks')}
        >
          <Ionicons 
            name={activeTab === 'tasks' ? 'clipboard' : 'clipboard-outline'} 
            size={22} 
            color={activeTab === 'tasks' ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabLabel, activeTab === 'tasks' ? styles.activeTabLabel : null]}>Tasks</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.tabItem}
          onPress={() => setActiveTab('visits')}
        >
          <Ionicons 
            name={activeTab === 'visits' ? 'location' : 'location-outline'} 
            size={22} 
            color={activeTab === 'visits' ? colors.primary : colors.textMuted} 
          />
          <Text style={[styles.tabLabel, activeTab === 'visits' ? styles.activeTabLabel : null]}>Audits</Text>
        </TouchableOpacity>
      </View>

      {/* Camera modal popup */}
      <Modal visible={showCamera} animationType="slide" onRequestClose={() => setShowCamera(false)}>
        <CameraCapture 
          onCapture={handleCameraCapture} 
          onCancel={() => setShowCamera(false)} 
        />
      </Modal>

      {/* Loading Modal overlay during location fetch/punch */}
      <Modal visible={punchLoading} transparent onRequestClose={() => {}}>
        <View style={styles.overlayContainer}>
          <View style={styles.loadingModal}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingModalText}>{punchMessage}</Text>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const getStyles = (colors) => StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  welcomeText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textMain,
  },
  headerBtn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutBtn: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMain,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textMain,
  },
  shiftDoneContainer: {
    alignItems: 'center',
    padding: 16,
  },
  shiftDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.success,
  },
  activeShiftText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  inactiveShiftText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textMuted,
  },
  shiftTimeDetails: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  btn: {
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textMain,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: colors.textMuted,
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
    color: colors.textMain,
    flex: 1,
    marginRight: 8,
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 99,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  cardDesc: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardDeadline: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
  },
  overlayContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingModal: {
    backgroundColor: colors.card,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingModalText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain,
  },
  tabBar: {
    flexDirection: 'row',
    height: 65,
    backgroundColor: colors.card,
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
    borderColor: colors.border,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabLabel: {
    color: colors.primary,
    fontWeight: '800',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.textMain,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.textMuted,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMain,
  },
});

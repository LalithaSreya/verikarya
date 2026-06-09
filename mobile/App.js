import React, { useContext, useEffect } from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, Text, BackHandler } from 'react-native';
import { AuthProvider, AuthContext } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import EmployeeDashboard from './src/screens/EmployeeDashboard';
import ManagerDashboard from './src/screens/ManagerDashboard';
import TaskSubmitScreen from './src/screens/TaskSubmitScreen';
import VisitSubmitScreen from './src/screens/VisitSubmitScreen';
import { COLORS } from './src/styles/globalStyles';

function AppContent() {
  const { isAuthenticated, isManager, loading } = useContext(AuthContext);
  const [currentScreen, setCurrentScreen] = React.useState({ name: 'Home', params: {} });
  const [history, setHistory] = React.useState([]);

  const navigate = (screenName, params = {}) => {
    setHistory([...history, currentScreen]);
    setCurrentScreen({ name: screenName, params });
  };

  const goBack = React.useCallback(() => {
    if (history.length > 0) {
      const prev = history[history.length - 1];
      setHistory(history.slice(0, -1));
      setCurrentScreen(prev);
    }
  }, [history]);

  // Hook into physical/hardware back button (Android)
  useEffect(() => {
    const handleBackPress = () => {
      if (history.length > 0) {
        goBack();
        return true; // prevent default (exiting the app)
      }
      return false; // allow default (exit the app)
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => {
      subscription.remove();
    };
  }, [history, goBack]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Text style={{ color: COLORS.textMuted, fontSize: 15, fontWeight: '600' }}>
          Initializing VeriKarya...
        </Text>
      </View>
    );
  }

  // Authentication Guard
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Screen Dispatcher based on active user role
  const renderScreen = () => {
    if (isManager) {
      return <ManagerDashboard />;
    }

    switch (currentScreen.name) {
      case 'Home':
      case 'EmployeeDashboard':
        return <EmployeeDashboard navigation={{ navigate }} />;
      case 'TaskSubmit':
        return (
          <TaskSubmitScreen 
            route={{ params: currentScreen.params }} 
            navigation={{ navigate, goBack }} 
          />
        );
      case 'VisitSubmit':
        return (
          <VisitSubmitScreen 
            route={{ params: currentScreen.params }} 
            navigation={{ navigate, goBack }} 
          />
        );
      default:
        return <EmployeeDashboard navigation={{ navigate }} />;
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.card} />
      {renderScreen()}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
});

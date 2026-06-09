import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from '../context/AuthContext';
import { COLORS, globalStyles } from '../styles/globalStyles';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee'); // 'employee' | 'manager'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login } = useContext(AuthContext);

  const handleGoogleSignIn = async () => {
    setError('');
    setSubmitting(true);
    try {
      const redirectUri = Linking.createURL('oauth');
      const authUrl = `https://verikarya.vercel.app/login?redirect_uri=${encodeURIComponent(redirectUri)}&role=${role}&clean=true`;
      await Linking.openURL(authUrl);
    } catch (err) {
      setError('Failed to open web browser. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await login(email.trim(), password);
      if (!res.success) {
        setError(res.error || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Connection error. Is the server running?');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: COLORS.bg }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.cardContainer}>
          
          {/* Logo */}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoIconText}>VK</Text>
            </View>
            <Text style={styles.logoText}>VeriKarya</Text>
            <Text style={styles.logoSubText}>
              Workforce Verification & Performance Management
            </Text>
          </View>

          {/* Role selector tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, role === 'employee' ? styles.activeTab : null]}
              onPress={() => setRole('employee')}
              disabled={submitting}
            >
              <Text style={[styles.tabText, role === 'employee' ? styles.activeTabText : null]}>
                🧑‍💼 Employee
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, role === 'manager' ? styles.activeTab : null]}
              onPress={() => setRole('manager')}
              disabled={submitting}
            >
              <Text style={[styles.tabText, role === 'manager' ? styles.activeTabText : null]}>
                💼 Manager
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Alert */}
          {error ? (
            <View style={styles.alertDanger}>
              <Text style={styles.alertText}>⚠️ {error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Email Address</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="e.g. employee@verikarya.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              disabled={submitting}
            />
          </View>

          <View style={globalStyles.inputGroup}>
            <Text style={globalStyles.label}>Password</Text>
            <TextInput
              style={globalStyles.input}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              disabled={submitting}
            />
          </View>

          <TouchableOpacity 
            style={[globalStyles.btn, { marginTop: 8 }]} 
            onPress={handleLogin}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={globalStyles.btnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity 
            style={styles.googleBtn} 
            onPress={handleGoogleSignIn}
            disabled={submitting}
          >
            <Text style={styles.googleBtnText}>Sign In with Google</Text>
          </TouchableOpacity>

          {/* Helper note */}
          <View style={styles.noteContainer}>
            <Text style={styles.noteText}>Demo Credentials:</Text>
            <Text style={styles.noteDetails}>
              employee@verikarya.com / password123{"\n"}
              manager@verikarya.com / password123
            </Text>
          </View>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  cardContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoIcon: {
    width: 60,
    height: 60,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  logoIconText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  logoSubText: {
    fontSize: 12,
    color: COLORS.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.bg,
    borderRadius: 8,
    padding: 4,
    marginBottom: 24,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: COLORS.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '700',
  },
  alertDanger: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  alertText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  noteContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    paddingTop: 16,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  noteDetails: {
    fontSize: 11,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 16,
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleBtnText: {
    color: '#1F2937',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 8,
  },
});

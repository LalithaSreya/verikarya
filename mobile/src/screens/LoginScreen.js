import React, { useState, useContext } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import * as Linking from 'expo-linking';
import { AuthContext } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee'); // 'employee' | 'manager'
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { login, colors, theme, toggleTheme } = useContext(AuthContext);
  const styles = getStyles(colors);

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
      style={{ flex: 1, backgroundColor: colors.bg }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Theme Switcher Button */}
        <TouchableOpacity 
          style={styles.themeToggle} 
          onPress={toggleTheme}
          activeOpacity={0.7}
        >
          <Ionicons 
            name={theme === 'light' ? 'moon' : 'sunny'} 
            size={22} 
            color={colors.textMain} 
          />
        </TouchableOpacity>

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
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name="person-outline" 
                  size={16} 
                  color={role === 'employee' ? colors.primary : colors.textMuted} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabText, role === 'employee' ? styles.activeTabText : null]}>
                  Employee
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, role === 'manager' ? styles.activeTab : null]}
              onPress={() => setRole('manager')}
              disabled={submitting}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons 
                  name="briefcase-outline" 
                  size={16} 
                  color={role === 'manager' ? colors.primary : colors.textMuted} 
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.tabText, role === 'manager' ? styles.activeTabText : null]}>
                  Manager
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Error Alert */}
          {error ? (
            <View style={styles.alertDanger}>
              <Ionicons name="warning-outline" size={16} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={styles.alertText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. employee@verikarya.com"
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              editable={!submitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              editable={!submitting}
            />
            <TouchableOpacity 
              style={styles.showPasswordRow}
              onPress={() => setShowPassword(!showPassword)}
              disabled={submitting}
              activeOpacity={0.7}
            >
              <View style={[
                styles.checkbox, 
                showPassword && styles.checkboxChecked
              ]}>
                {showPassword && (
                  <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                )}
              </View>
              <Text style={styles.showPasswordText}>
                Show Password
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.btn, { marginTop: 8 }]} 
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.btnText}>Sign In</Text>
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
            activeOpacity={0.8}
          >
            <Ionicons name="logo-google" size={18} color={theme === 'dark' ? '#FFFFFF' : '#1F2937'} style={{ marginRight: 8 }} />
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

const getStyles = (colors) => StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  themeToggle: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 12 : 24,
    right: 24,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  cardContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
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
    backgroundColor: colors.primary,
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
    color: colors.textMain,
  },
  logoSubText: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
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
    backgroundColor: colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  activeTabText: {
    color: colors.primary,
    fontWeight: '700',
  },
  alertDanger: {
    backgroundColor: colors.theme === 'dark' ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textMain,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: colors.textMain,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  noteContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingTop: 16,
    alignItems: 'center',
  },
  noteText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    marginBottom: 4,
  },
  noteDetails: {
    fontSize: 11,
    color: colors.textMuted,
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
    backgroundColor: colors.border,
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
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
    color: colors.textMain,
    fontSize: 14,
    fontWeight: '700',
  },
  showPasswordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.card,
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  showPasswordText: {
    fontSize: 13,
    color: colors.textMuted,
    marginLeft: 8,
    fontWeight: '500',
  },
});

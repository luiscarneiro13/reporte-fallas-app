import React, { useState, useRef, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from '../i18n';
import { loginRequest } from '../api/auth';
import useAuthStore from '../store/authStore';
import { NotificationContext } from '../contexts/NotificationContext';
import { APP_VERSION } from '../constants';
import { COLORS } from '../constants/colors';

export default function LoginScreen({ navigation }) {
  const { t, locale } = useTranslation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setPendingRoute = useAuthStore((s) => s.setPendingRoute);
  const clearPendingRoute = useAuthStore((s) => s.clearPendingRoute);
  const { expoPushToken } = useContext(NotificationContext);
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState(null);
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [loading]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(t('auth.fill_fields'));
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await loginRequest(email.trim(), password, locale, expoPushToken);
      const { token, user } = res.data.data;
      setAuth(token, user, user?.roles ?? []);

      // El linking de React Navigation manejará la navegación automáticamente

    } catch (err) {
      const errorCode = err?.response?.data?.error_code;
      if (errorCode === 'OPERATOR_WITHOUT_EMPLOYEE') {
        setError(err?.response?.data?.message || t('auth.invalid_credentials'));
      } else {
        const msg = err?.response?.data?.message || t('auth.invalid_credentials');
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradient}
    >
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <Image
                source={require('../../assets/icon.png')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>

            {/* Title */}
            <Text style={styles.title}>Servicios Casmar</Text>
            <Text style={styles.subtitle}>{t('auth.system_access')}</Text>

            {/* Email */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder={t('auth.email')}
                placeholderTextColor="#a0aec0"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
              />
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <TextInput
                style={styles.input}
                placeholder={t('auth.password')}
                placeholderTextColor="#a0aec0"
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color="#a0aec0"
                />
              </TouchableOpacity>
            </View>

            {error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#e53e3e" style={{ marginRight: 6 }} />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.btnLogin}
              onPress={handleLogin}
              activeOpacity={0.85}
              disabled={loading}
            >
              <LinearGradient
                colors={loading ? ['#718096', '#718096'] : [COLORS.primary, COLORS.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btnGradient}
              >
                {loading
                  ? <Animated.View style={{ transform: [{ rotate: spin }] }}>
                      <Ionicons name="sync-outline" size={20} color="#fff" />
                    </Animated.View>
                  : <Text style={styles.btnText}>{t('auth.sign_in')}</Text>
                }
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.versionText}>v{APP_VERSION}</Text>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 20,
    paddingVertical: 45,
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 30,
    elevation: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 16,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 26,
    color: '#2d3748',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    color: '#718096',
    marginBottom: 24,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    marginBottom: 18,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2d3748',
  },
  eyeButton: {
    paddingHorizontal: 12,
  },
  btnLogin: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  btnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: '#fed7d7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: '#e53e3e',
    fontWeight: '500',
  },
  versionText: {
    textAlign: 'center',
    fontSize: 11,
    color: '#cbd5e0',
    marginTop: 16,
  },
});

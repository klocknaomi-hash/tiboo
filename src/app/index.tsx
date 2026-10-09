/**
 * Sign In Screen Route ('/')
 *
 * Clean onboarding & sign-in screen:
 * - Top: Tiboo app-icon tile, wordmark and tagline
 * - Tiboo account sign-in (email + password, for Tiboo's own servers)
 * - "or" divider, then Google sign-in (Apple sign-in comes with the App Store release)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { useRouter } from 'expo-router';
import { showToast } from '@/context/ToastContext';
import { TibooLogo } from '@/components/common';
import { APP_BRAND } from '@/constants/agentConfig';

/**
 * 4-Color Official Google Brand SVG Icon
 */
const GoogleBrandIcon = ({ size = 22 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <Path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <Path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <Path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </Svg>
);

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  // Demo flow: the real call to Tiboo's auth server is still to be wired
  const handleAccountSignIn = () => {
    if (!canSubmit) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      showToast('Signed in successfully');
      router.replace('/(tabs)/chat' as any);
    }, 600);
  };

  const handleGoogleSignIn = () => {
    showToast('Signed in successfully');
    router.replace('/(tabs)/chat' as any);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.content}>
          {/* Brand: app-icon tile, wordmark, tagline */}
          <View style={styles.brand}>
            <View style={styles.tileShadow}>
              <TibooLogo variant="tile" size={84} />
            </View>
            <Text style={styles.wordmark}>{APP_BRAND.name}</Text>
            <Text style={styles.tagline}>Your AI companion for everyday goals</Text>
          </View>

          {/* Tiboo account sign-in */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={Colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
            />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={Colors.textMuted}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={handleAccountSignIn}
            />
            <Pressable
              onPress={handleAccountSignIn}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.primaryButton,
                !canSubmit && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Sign in with your Tiboo account">
              {loading ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Sign in</Text>
              )}
            </Pressable>
            <Pressable onPress={() => showToast('Account creation coming soon')} hitSlop={8}>
              <Text style={styles.linkText}>Create a Tiboo account</Text>
            </Pressable>
          </View>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Third-party sign-in */}
          <Pressable
            onPress={handleGoogleSignIn}
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel="Continue with Google">
            <View style={styles.buttonContent}>
              <View style={styles.iconWrapper}>
                <GoogleBrandIcon size={20} />
              </View>
              <Text style={styles.secondaryButtonText}>Continue with Google</Text>
            </View>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  brand: {
    alignItems: 'center',
    marginBottom: 36,
  },
  tileShadow: {
    borderRadius: 20,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 18,
  },
  wordmark: {
    fontSize: 34,
    fontFamily: Typography.bold,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  tagline: {
    marginTop: 6,
    fontSize: 15,
    fontFamily: Typography.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  form: {
    gap: 10,
  },
  input: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.inputBg,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: Typography.regular,
    color: Colors.textPrimary,
  },
  primaryButton: {
    height: 50,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: Typography.semibold,
    color: Colors.white,
  },
  linkText: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: Typography.medium,
    color: Colors.primary,
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    fontFamily: Typography.medium,
    color: Colors.textMuted,
  },
  secondaryButton: {
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: Typography.semibold,
    color: Colors.textPrimary,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    marginRight: 10,
  },
});

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/colors';
import { Typography } from '@/constants/theme';
import { saveUserProfile } from '@/lib/auth';

/**
 * Auth Callback Route ('/auth/callback')
 *
 * Dedicated OAuth return handler:
 * - Displays a sleek violet branded loading screen
 * - Exchanges PKCE authorization code or implicit tokens if routed via deep link
 * - Confirms session and redirects to main chat screen ('/(tabs)/chat')
 * - Redirects back to sign-in screen ('/') if session is missing or on error
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    code?: string;
    access_token?: string;
    refresh_token?: string;
    error?: string;
    error_description?: string;
  }>();

  useEffect(() => {
    let isMounted = true;

    async function handleAuthReturn() {
      try {
        let code = params.code;
        let accessToken = params.access_token;
        let refreshToken = params.refresh_token;
        let errorMsg = params.error_description || params.error;

        // Support web window location hash & search params
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          if (window.location.hash) {
            const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
            accessToken = accessToken || hashParams.get('access_token') || undefined;
            refreshToken = refreshToken || hashParams.get('refresh_token') || undefined;
            errorMsg =
              errorMsg ||
              hashParams.get('error_description') ||
              hashParams.get('error') ||
              undefined;
          }
          if (window.location.search) {
            const searchParams = new URLSearchParams(window.location.search);
            code = code || searchParams.get('code') || undefined;
            errorMsg =
              errorMsg ||
              searchParams.get('error_description') ||
              searchParams.get('error') ||
              undefined;
          }
        }

        if (errorMsg) {
          console.error('[AuthCallback] Error received in URL:', errorMsg);
          if (isMounted) router.replace('/');
          return;
        }

        // 1. Authorization Code PKCE exchange
        if (code) {
          console.log('[AuthCallback] Exchanging code from deep link params...');
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            console.error('[AuthCallback] exchangeCodeForSession failed:', error);
            if (isMounted) router.replace('/');
            return;
          }
          if (data.user) {
            await saveUserProfile(data.user);
          }
          if (isMounted) router.replace('/(tabs)/chat' as any);
          return;
        }

        // 2. Token hash fragment params (if parsed by router)
        if (accessToken && refreshToken) {
          console.log('[AuthCallback] Setting session from deep link tokens...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) {
            console.error('[AuthCallback] setSession failed:', error);
            if (isMounted) router.replace('/');
            return;
          }
          if (data.user) {
            await saveUserProfile(data.user);
          }
          if (isMounted) router.replace('/(tabs)/chat' as any);
          return;
        }

        // 3. Check existing Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (isMounted) router.replace('/(tabs)/chat' as any);
          return;
        }

        // Grace period for asynchronous storage / listener sync
        const timer = setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          if (!isMounted) return;
          if (retrySession) {
            router.replace('/(tabs)/chat' as any);
          } else {
            router.replace('/');
          }
        }, 1200);

        return () => clearTimeout(timer);
      } catch (err) {
        console.error('[AuthCallback] Unexpected error:', err);
        if (isMounted) router.replace('/');
      }
    }

    handleAuthReturn();

    return () => {
      isMounted = false;
    };
  }, [params, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.white} />
      <Text style={styles.title}>Connexion à Tiboo...</Text>
      <Text style={styles.subtitle}>Finalisation de votre session</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.primary, // Sleek violet background
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 20,
    fontSize: 18,
    fontFamily: Typography.semibold,
    color: Colors.white,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: Typography.regular,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
  },
});

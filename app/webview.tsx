import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { ArrowLeft, ArrowRight } from 'lucide-react-native';
import { useApp } from '@/contexts/AppContext';

export default function AppWebViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ title?: string; url?: string }>();
  const { colors, isRTL } = useApp();
  const [loading, setLoading] = useState(true);

  const pageTitle = typeof params.title === 'string' && params.title.trim() ? params.title : 'KADO';
  const pageUrl = typeof params.url === 'string' ? params.url : '';

  const isValidUrl = /^https?:\/\//i.test(pageUrl);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={colors.background === '#0D0D0D' ? 'light-content' : 'dark-content'} />
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.background }}>
        <View style={[styles.header, { borderBottomColor: colors.borderLight }]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.borderLight }]}>
            {isRTL ? <ArrowRight size={20} color={colors.text} /> : <ArrowLeft size={20} color={colors.text} />}
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {pageTitle}
          </Text>
          <View style={{ width: 40 }} />
        </View>
      </SafeAreaView>

      {!isValidUrl ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.textSecondary }]}>الرابط غير صالح</Text>
        </View>
      ) : (
        <View style={styles.webviewWrap}>
          {loading && (
            <View style={[styles.loaderOverlay, { backgroundColor: colors.background }]}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          )}
          <WebView
            source={{ uri: pageUrl }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            startInLoadingState
            javaScriptEnabled
            domStorageEnabled
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700' as const,
    textAlign: 'center',
  },
  webviewWrap: {
    flex: 1,
    overflow: 'hidden',
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '500' as const,
    textAlign: 'center',
  },
});

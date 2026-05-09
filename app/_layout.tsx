import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ActivityIndicator, StyleSheet, View, I18nManager, Platform } from "react-native";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { PushNotificationBootstrap } from "@/components/PushNotificationBootstrap";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function DirectionWrapper({ children }: { children: React.ReactNode }) {
  const { isRTL } = useApp();

  useEffect(() => {
    if (Platform.OS === 'web') {
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    }
    I18nManager.allowRTL(true);
    I18nManager.forceRTL(isRTL);
  }, [isRTL]);

  return (
    <View style={[styles.root, { direction: isRTL ? 'rtl' : 'ltr' }]}>
      {children}
    </View>
  );
}

function RootLayoutNav() {
  const pathname = usePathname();
  const { colors, language } = useApp();
  const [showRouteLoader, setShowRouteLoader] = useState(false);
  const lastPathRef = useRef<string | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (lastPathRef.current === null) {
      lastPathRef.current = pathname;
      return;
    }
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;
    setShowRouteLoader(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setShowRouteLoader(false), 280);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [pathname]);

  return (
    <>
      <Stack screenOptions={{ headerBackTitle: "Back" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="auth/login" options={{ headerShown: false }} />
        <Stack.Screen name="auth/register" options={{ headerShown: false }} />
        <Stack.Screen name="auth/otp" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
        <Stack.Screen name="auth/forgot-otp" options={{ headerShown: false }} />
        <Stack.Screen name="auth/reset-password" options={{ headerShown: false }} />
        <Stack.Screen name="auth/email-login" options={{ headerShown: false }} />
        <Stack.Screen name="auth-loading" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="(customer-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(merchant-tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="merchant-register" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="merchant-pending" options={{ headerShown: false }} />
        <Stack.Screen
          name="product/[id]"
          options={{
            headerShown: false,
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="chat/[chatId]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="store/[storeId]"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen name="cart" options={{ headerShown: false }} />
        <Stack.Screen name="order-success" options={{ headerShown: false }} />
        <Stack.Screen name="review-product" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="order-detail/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="city-browse" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      {showRouteLoader && (
        <View pointerEvents="none" style={styles.routeLoaderOverlay}>
          <View style={[styles.routeLoaderCard, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        </View>
      )}
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={styles.root}>
        <AppProvider>
          <DirectionWrapper>
            <>
              <PushNotificationBootstrap />
              <RootLayoutNav />
            </>
          </DirectionWrapper>
        </AppProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  routeLoaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  routeLoaderCard: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    width: 52,
    height: 52,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
});

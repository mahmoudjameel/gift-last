import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { LayoutDashboard, Receipt, Boxes, MessageSquareText, Store } from 'lucide-react-native';
import CustomTabBar from '@/components/CustomTabBar';
import { useApp } from '@/contexts/AppContext';
import KadoLoader from '@/components/KadoLoader';

export default function MerchantTabLayout() {
  const { t, isLoading, colors } = useApp();

  // لا تُزلِع <Tabs> أثناء التحميل — إزالتها ثم إعادة تركيبها تمرّر state غير معرّف إلى StackRouter.getRehydratedState → Cannot read property 'stale' of undefined
  return (
    <View style={styles.flex}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t('orders'),
          tabBarIcon: ({ color, size }) => <Receipt size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: t('products'),
          tabBarIcon: ({ color, size }) => <Boxes size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: t('messages'),
          tabBarIcon: ({ color, size }) => <MessageSquareText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: t('store'),
          tabBarIcon: ({ color, size }) => <Store size={size} color={color} />,
        }}
      />
      </Tabs>
      {isLoading ? (
        <View
          style={[styles.loadingOverlay, { backgroundColor: colors.background }]}
          pointerEvents="auto"
        >
          <KadoLoader size={72} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
});

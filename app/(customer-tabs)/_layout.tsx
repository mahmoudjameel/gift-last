import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { House, Heart, MessageSquareText, CircleUserRound } from 'lucide-react-native';
import CustomTabBar from '@/components/CustomTabBar';
import { useApp } from '@/contexts/AppContext';
import KadoLoader from '@/components/KadoLoader';

export default function CustomerTabLayout() {
  const { t, isLoading, colors } = useApp();

  return (
    <View style={styles.flex}>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, size }) => <House size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="my-list"
        options={{
          title: t('myList'),
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
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
        name="profile"
        options={{
          title: t('account'),
          tabBarIcon: ({ color, size }) => <CircleUserRound size={size} color={color} />,
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

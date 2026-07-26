import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Platform, View } from 'react-native';

export default function TabLayout() {
  const { isDark } = useColorScheme();
  const theme = Colors[isDark ? 'dark' : 'light'];
  const [userRole, setUserRole] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState<number | undefined>(undefined);
  const [deliveryCount, setDeliveryCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    async function getUserRole() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          if (profile) {
            setUserRole(profile.role);
          }
        }
      } catch (err) {
        console.error('Error fetching user role:', err);
      }
    }
    getUserRole();
    fetchBadgeCounts();

    const channel = supabase
      .channel('badge-counts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'repair_jobs' }, () => {
        fetchBadgeCounts();
      })
      .subscribe();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          setUserRole(profile?.role ?? null);
        } catch {
          setUserRole(null);
        }
        fetchBadgeCounts();
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchBadgeCounts() {
    try {
      const { count: pending } = await supabase
        .from('repair_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'รอชำระ');
      setPendingCount(pending && pending > 0 ? pending : undefined);

      const { count: paid } = await supabase
        .from('repair_jobs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ชำระแล้ว');
      setDeliveryCount(paid && paid > 0 ? paid : undefined);
    } catch (err) {
      console.error('Badge count error:', err);
    }
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.tint,
        tabBarInactiveTintColor: theme.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.tabBackground,
          borderTopWidth: 1,
          borderTopColor: theme.border,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: isDark ? 0.3 : 0.06,
          shadowRadius: 10,
          height: Platform.OS === 'ios' ? 90 : 72,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 2,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'รายการซ่อม',
          tabBarBadge: pendingCount,
          tabBarBadgeStyle: {
            backgroundColor: theme.badge,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
          },
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Ionicons size={22} name={focused ? "clipboard" : "clipboard-outline"} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'ภาพรวม',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Ionicons size={22} name={focused ? "bar-chart" : "bar-chart-outline"} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="receive"
        options={{
          title: 'รับเครื่อง',
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: theme.primary,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -14,
                elevation: 4,
                shadowColor: theme.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.35,
                shadowRadius: 6,
              }}>
              <Feather size={22} name="plus" color="#FFFFFF" />
            </View>
          ),
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: '700',
            color: theme.primary,
            marginTop: 2,
          },
        }}
      />
      <Tabs.Screen
        name="customer"
        options={{
          title: 'ลูกค้าs',
          tabBarBadge: deliveryCount,
          tabBarBadgeStyle: {
            backgroundColor: theme.badge,
            color: '#FFFFFF',
            fontSize: 10,
            fontWeight: 'bold',
          },
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Feather size={22} name={focused ? "check-square" : "square"} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'โปรไฟล์',
          tabBarIcon: ({ color, focused }) => (
            <View className="items-center justify-center">
              <Ionicons size={22} name={focused ? "person" : "person-outline"} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen name="employee" options={{ href: null }} />
    </Tabs>
  );
}

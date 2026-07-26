import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // Check if profile is complete (phone, first_name, last_name)
          const { data } = await supabase
            .from('profiles')
            .select('phone, first_name, last_name')
            .eq('id', session.user.id)
            .single();
          
          if (data && data.phone && data.first_name && data.last_name) {
            router.replace('/(tabs)');
          } else {
            router.replace('/(auth)/login');
          }
        } else {
          router.replace('/(auth)/login');
        }
      } catch (err) {
        router.replace('/(auth)/login');
      }
    }
    checkSession();
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#D32F2F" />
    </View>
  );
}

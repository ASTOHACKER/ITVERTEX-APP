import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface UserProfile {
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  email: string;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { colorScheme, setColorScheme } = useColorScheme();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      fetchProfile();
    }, [])
  );

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn("Profile fetch error:", error.message);
      }

      const firstName = profileData?.first_name || user.user_metadata?.first_name || user.user_metadata?.full_name?.split(' ')[0] || '';
      const lastName = profileData?.last_name || user.user_metadata?.last_name || user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || '';

      setProfile({
        first_name: firstName,
        last_name: lastName,
        phone: profileData?.phone || user.phone || '',
        role: profileData?.role || 'Staff',
        email: user.email || '',
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/(auth)/login');
    } catch (error: any) {
      Alert.alert('ข้อผิดพลาด', error.message);
    }
  };

  const getInitials = () => {
    if (!profile) return '';
    return (profile.first_name?.[0] || '') + (profile.last_name?.[0] || '');
  };

  if (loading && !profile) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50 dark:bg-slate-900">
        <ActivityIndicator size="large" color="#D32F2F" />
        <Text className="mt-3 text-slate-500 dark:text-slate-400 text-base">กำลังโหลดโปรไฟล์...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-slate-50 dark:bg-slate-900">
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />
      
      <ScrollView className="flex-1" bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header Section */}
        <View className="bg-red-700 dark:bg-slate-800 pb-10 border-b border-transparent dark:border-slate-700">
          <SafeAreaView>
            <View className="px-6 mb-5" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 20 : 20 }}>
              <Text className="text-[22px] font-extrabold text-white">ตั้งค่า</Text>
              <Text className="text-sm text-white/80 mt-0.5">{profile?.first_name} {profile?.last_name}</Text>
            </View>
            
            <View className="items-center">
              <View className="w-[100px] h-[100px] rounded-full bg-red-50 dark:bg-slate-700 justify-center items-center mb-4 shadow-sm elevation-5">
                <Text className="text-[32px] font-bold text-red-700 dark:text-red-400">{getInitials().toUpperCase()}</Text>
              </View>
              <Text className="text-[22px] font-bold text-white">{profile?.email}</Text>
              <View className="flex-row items-center bg-white/20 dark:bg-white/10 px-4 py-1.5 rounded-full mt-2">
                <Ionicons name="headset-outline" size={14} color="#ffffff" style={{ marginRight: 4 }} />
                <Text className="text-sm text-white font-semibold">{profile?.role === 'Staff' ? 'พนักงาน • Staff' : profile?.role}</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* Content Section */}
        <View className="p-4 -mt-5">
          
          {/* Theme Selector Card */}
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 shadow-sm elevation-2">
            <Text className="text-lg font-bold text-red-700 dark:text-red-400 mb-4">ธีมแอปพลิเคชัน (Theme)</Text>
            
            <View className="flex-row gap-2">
              <TouchableOpacity 
                onPress={() => setColorScheme('light')}
                className={`flex-1 py-3 px-2 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                  colorScheme === 'light' 
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-500' 
                    : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Ionicons name="sunny-outline" size={18} color={colorScheme === 'light' ? '#D32F2F' : '#94a3b8'} />
                <Text className={`text-xs font-bold ${colorScheme === 'light' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  โหมดสว่าง
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setColorScheme('dark')}
                className={`flex-1 py-3 px-2 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                  colorScheme === 'dark' 
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-500' 
                    : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Ionicons name="moon-outline" size={18} color={colorScheme === 'dark' ? '#D32F2F' : '#94a3b8'} />
                <Text className={`text-xs font-bold ${colorScheme === 'dark' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  โหมดมืด
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                onPress={() => setColorScheme('system')}
                className={`flex-1 py-3 px-2 rounded-xl border flex-row items-center justify-center gap-1.5 ${
                  (colorScheme as string) === 'system' 
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-500' 
                    : 'bg-slate-50 dark:bg-slate-700/50 border-slate-200 dark:border-slate-700'
                }`}
              >
                <Ionicons name="desktop-outline" size={18} color={(colorScheme as string) === 'system' ? '#D32F2F' : '#94a3b8'} />
                <Text className={`text-xs font-bold ${(colorScheme as string) === 'system' ? 'text-red-700 dark:text-red-400' : 'text-slate-600 dark:text-slate-300'}`}>
                  ตามระบบ
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contact Card */}
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 shadow-sm elevation-2">
            <Text className="text-lg font-bold text-red-700 dark:text-red-400 mb-6">ข้อมูลติดต่อ</Text>
            
            <View className="flex-row items-center mb-5">
              <Ionicons name="call-outline" size={20} color="#94a3b8" />
              <View className="ml-4">
                <Text className="text-xs text-slate-400 mb-1">เบอร์โทรศัพท์</Text>
                <Text className="text-base text-slate-800 dark:text-slate-100">{profile?.phone || '-'}</Text>
              </View>
            </View>
            
            <View className="flex-row items-center mb-5">
              <Ionicons name="mail-outline" size={20} color="#94a3b8" />
              <View className="ml-4">
                <Text className="text-xs text-slate-400 mb-1">อีเมล</Text>
                <Text className="text-base text-slate-800 dark:text-slate-100">{profile?.email || '-'}</Text>
              </View>
            </View>
          </View>

          {/* Action Card */}
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 shadow-sm elevation-2">
            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => router.push('/profile')}>
              <View className="flex-row items-center">
                <Ionicons name="person-outline" size={24} color="#D32F2F" />
                <Text className="text-base text-slate-800 dark:text-slate-100 ml-4 font-medium">แก้ไขโปรไฟล์</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
            
            <View className="h-px bg-slate-100 dark:bg-slate-700 my-2" />

            {profile?.role === 'Manager' && (
              <>
                <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => router.push('/(tabs)/employee')}>
                  <View className="flex-row items-center">
                    <Ionicons name="people-outline" size={24} color="#D32F2F" />
                    <Text className="text-base text-slate-800 dark:text-slate-100 ml-4 font-medium">จัดการพนักงาน</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
                </TouchableOpacity>
                <View className="h-px bg-slate-100 dark:bg-slate-700 my-2" />
              </>
            )}

            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => router.push('/report-error')}>
              <View className="flex-row items-center">
                <Ionicons name="bug-outline" size={24} color="#D32F2F" />
                <Text className="text-base text-slate-800 dark:text-slate-100 ml-4 font-medium">แจ้งปัญหาระบบ / Error Logs</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
            
            <View className="h-px bg-slate-100 dark:bg-slate-700 my-2" />
            
            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={handleLogout}>
              <View className="flex-row items-center">
                <Ionicons name="log-out-outline" size={24} color="#D32F2F" style={{ transform: [{ rotateY: '180deg' }] }} />
                <Text className="text-base text-red-700 dark:text-red-400 ml-4 font-medium">ออกจากระบบ</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          {/* Testing & Developer Tools Card */}
          <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 shadow-sm elevation-2">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-red-700 dark:text-red-400">เครื่องมือทดสอบระบบ (Testing Tools)</Text>
              <View className="bg-red-50 dark:bg-red-950/40 px-2.5 py-1 rounded-full">
                <Text className="text-[10px] font-bold text-red-700 dark:text-red-400">DEV LAB</Text>
              </View>
            </View>
            
            {/* Signature V1 */}
            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => router.push('/signing-test')}>
              <View className="flex-row items-center">
                <Ionicons name="pencil-outline" size={22} color="#475569" />
                <Text className="text-sm text-slate-800 dark:text-slate-100 ml-3 font-medium">ทดสอบลายเซ็น V1 (Standard)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <View className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

            {/* Signature V2 */}
            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => router.push('/signing-test2')}>
              <View className="flex-row items-center">
                <Ionicons name="create-outline" size={22} color="#475569" />
                <Text className="text-sm text-slate-800 dark:text-slate-100 ml-3 font-medium">ทดสอบลายเซ็น V2 (Modal & Doc)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <View className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

            {/* Device Insert Test */}
            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => router.push('/device_insert_test')}>
              <View className="flex-row items-center">
                <Ionicons name="hardware-chip-outline" size={22} color="#475569" />
                <Text className="text-sm text-slate-800 dark:text-slate-100 ml-3 font-medium">ทดสอบบันทึกข้อมูลอุปกรณ์ (Device)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <View className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

            {/* Repair Job Insert Test V1 */}
            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => router.push('/repair_job_insert_test')}>
              <View className="flex-row items-center">
                <Ionicons name="build-outline" size={22} color="#475569" />
                <Text className="text-sm text-slate-800 dark:text-slate-100 ml-3 font-medium">ทดสอบงานซ่อม V1 (Repair Job)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <View className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

            {/* Repair Job Insert Test V2 */}
            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => router.push('/repair_job_insert_test_v2')}>
              <View className="flex-row items-center">
                <Ionicons name="hammer-outline" size={22} color="#475569" />
                <Text className="text-sm text-slate-800 dark:text-slate-100 ml-3 font-medium">ทดสอบงานซ่อม V2 (Advanced)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>

            <View className="h-px bg-slate-100 dark:bg-slate-700 my-1" />

            {/* Slips Test */}
            <TouchableOpacity className="flex-row items-center justify-between py-3" onPress={() => router.push('/slips')}>
              <View className="flex-row items-center">
                <Ionicons name="receipt-outline" size={22} color="#475569" />
                <Text className="text-sm text-slate-800 dark:text-slate-100 ml-3 font-medium">ทดสอบประวัติสลิปโอนเงิน (SlipOK)</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

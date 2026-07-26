import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
  TextInput,
  KeyboardAvoidingView} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  async function fetchProfile() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        router.replace('/(auth)/login');
        return;
      }

      setUserId(user.id);
      setEmail(user.email || '');

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) console.warn('Profile fetch error:', error.message);

      setFirstName(profileData?.first_name || user.user_metadata?.first_name || '');
      setLastName(profileData?.last_name || user.user_metadata?.last_name || '');
      setPhone(profileData?.phone || user.phone || '');
      setRole(profileData?.role || 'Staff');
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อและนามสกุล');
      return;
    }
    if (!phone.trim()) {
      showAlert('ข้อผิดพลาด', 'กรุณากรอกเบอร์โทรศัพท์');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim()})
        .eq('id', userId);

      if (error) throw error;
      showAlert('สำเร็จ', 'บันทึกข้อมูลโปรไฟล์เรียบร้อยแล้ว');
    } catch (err: any) {
      showAlert('ล้มเหลว', err.message || 'ไม่สามารถบันทึกข้อมูลได้');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase();
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 justify-center items-center bg-slate-50">
        <ActivityIndicator size="large" color="#D32F2F" />
        <Text className="mt-3 text-slate-500 text-base">กำลังโหลดโปรไฟล์...</Text>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1" bounces={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Header Section */}
          <View className="bg-[#D32F2F] pb-10">
            <SafeAreaView>
              <View className="px-4 mb-5" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12 }}>
                <TouchableOpacity onPress={() => router.back()} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="chevron-back" size={24} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 16, marginLeft: 4 }}>กลับ</Text>
                </TouchableOpacity>
              </View>

              <View className="items-center">
                <View className="w-[100px] h-[100px] rounded-full bg-white justify-center items-center mb-4 shadow-sm elevation-5">
                  <Text className="text-[32px] font-bold text-[#D32F2F]">{getInitials()}</Text>
                </View>
                <Text className="text-[22px] font-bold text-white mb-3">{firstName} {lastName}</Text>
                <View className="flex-row items-center bg-white/20 px-4 py-1.5 rounded-full">
                  <Ionicons name="shield-checkmark" size={14} color="#fff" style={{ marginRight: 4 }} />
                  <Text className="text-sm text-white font-semibold">{role}</Text>
                </View>
              </View>
            </SafeAreaView>
          </View>

          {/* Edit Form */}
          <View className="p-4 -mt-5">
            <View className="bg-white rounded-2xl p-6 mb-4 shadow-sm elevation-2">
              <Text className="text-lg font-bold text-slate-800 mb-6">แก้ไขข้อมูลส่วนตัว</Text>

              <View className="mb-5">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-semibold ml-1">ชื่อจริง</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl h-12 px-4 text-[15px] text-slate-800"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="กรอกชื่อจริง"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View className="mb-5">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-semibold ml-1">นามสกุล</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl h-12 px-4 text-[15px] text-slate-800"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="กรอกนามสกุล"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View className="mb-5">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-semibold ml-1">เบอร์โทรศัพท์</Text>
                <TextInput
                  className="bg-white border border-slate-200 rounded-xl h-12 px-4 text-[15px] text-slate-800"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="08X-XXX-XXXX"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>

              <View className="mb-5">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-semibold ml-1">อีเมล</Text>
                <View className="bg-slate-100 border border-slate-200 rounded-xl h-12 px-4 justify-center">
                  <Text style={{ color: '#64748b', fontSize: 15 }}>{email}</Text>
                </View>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 4, marginLeft: 4 }}>อีเมลไม่สามารถเปลี่ยนแปลงได้</Text>
              </View>

              <TouchableOpacity
                className={`bg-[#D32F2F] rounded-2xl py-4 flex-row items-center justify-center mt-2 shadow-sm elevation-4 ${saving ? "opacity-70" : ""}`}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                    <Text className="text-white text-base font-bold">บันทึกข้อมูล</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}


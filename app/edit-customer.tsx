import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  StatusBar,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function EditCustomerScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const [customerName, setCustomerName] = useState('');
  const [tel, setTel] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isEditMode = !!id;

  useEffect(() => {
    loadCustomerData();
  }, [id]);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  async function loadCustomerData() {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        showAlert('ข้อผิดพลาด', 'คุณต้องเข้าสู่ระบบก่อน');
        router.replace('/(auth)/login');
        return;
      }

      if (id) {
        const { data: customer, error: fetchError } = await supabase
          .from('customer')
          .select('*')
          .eq('customer_id', parseInt(id))
          .single();

        if (fetchError) {
          showAlert('ผิดพลาด', 'ไม่พบข้อมูลลูกค้าที่ต้องการแก้ไข');
          router.back();
        } else if (customer) {
          const fullName = [customer.first_name, customer.last_name]
            .filter(Boolean)
            .join(' ');
          setCustomerName(fullName);
          setTel(customer.tel || '');
        }
      }
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!customerName.trim()) {
      showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อลูกค้า');
      return;
    }
    if (!tel.trim()) {
      showAlert('ข้อผิดพลาด', 'กรุณากรอกเบอร์โทรศัพท์');
      return;
    }

    setIsSaving(true);

    const trimmedName = customerName.trim();
    const spaceIndex = trimmedName.indexOf(' ');
    let firstName = trimmedName;
    let lastName = '';

    if (spaceIndex !== -1) {
      firstName = trimmedName.substring(0, spaceIndex).trim();
      lastName = trimmedName.substring(spaceIndex + 1).trim();
    }

    try {
      if (id) {
        const { data, error } = await supabase
          .from('customer')
          .update({
            first_name: firstName,
            last_name: lastName,
            tel: tel.trim()})
          .eq('customer_id', parseInt(id))
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('ไม่สามารถแก้ไขข้อมูลได้ (อาจติดสิทธิ์ RLS)');
        }
        showAlert('สำเร็จ', 'แก้ไขข้อมูลลูกค้าเรียบร้อยแล้ว');
      } else {
        const { data, error } = await supabase
          .from('customer')
          .insert([
            {
              first_name: firstName,
              last_name: lastName,
              tel: tel.trim()}
          ])
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('ไม่สามารถเพิ่มข้อมูลได้ (อาจติดสิทธิ์ RLS)');
        }
        showAlert('สำเร็จ', 'เพิ่มข้อมูลลูกค้าเรียบร้อยแล้ว');
      }
      router.back();
    } catch (err: any) {
      showAlert('ล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) {
      showAlert('แจ้งเตือน', 'ไม่สามารถลบลูกค้าใหม่ที่ยังไม่ได้บันทึกได้');
      return;
    }

    const performDelete = async () => {
      setIsSaving(true);
      try {
        const { error } = await supabase
          .from('customer')
          .delete()
          .eq('customer_id', parseInt(id));

        if (error) throw error;
        showAlert('สำเร็จ', 'ลบข้อมูลลูกค้าเรียบร้อยแล้ว');
        router.back();
      } catch (err: any) {
        showAlert('ล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
      } finally {
        setIsSaving(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm("คุณต้องการลบข้อมูลลูกค้ารายนี้ใช่หรือไม่?");
      if (confirmDelete) {
        performDelete();
      }
    } else {
      Alert.alert(
        "ยืนยันการลบ",
        "คุณต้องการลบข้อมูลลูกค้ารายนี้ใช่หรือไม่?",
        [
          { text: "ยกเลิก", style: "cancel" },
          { text: "ลบ", style: "destructive", onPress: performDelete }
        ]
      );
    }
  };

  const handleClear = () => {
    setCustomerName('');
    setTel('');
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#D32F2F]">
        <View className="flex-1 justify-center items-center bg-slate-50">
          <ActivityIndicator size="large" color="#D32F2F" />
          <Text className="mt-3 text-slate-500 text-[15px] font-semibold">กำลังโหลดข้อมูลลูกค้า...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#D32F2F]">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 bg-[#D32F2F]" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12 }}>
        <TouchableOpacity className="p-1 -ml-1" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">
          {isEditMode ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-4 pb-10">

          {/* Icon Badge */}
          <View className="w-[72px] h-[72px] rounded-full bg-red-50 justify-center items-center mb-6 mt-2 border-2 border-red-200">
            <Ionicons name={isEditMode ? 'person' : 'person-add'} size={32} color="#D32F2F" />
          </View>

          {/* Form Card */}
          <View className="bg-white rounded-2xl p-5 w-full mb-6 shadow-sm elevation-2 border border-slate-100">
            <View className="mb-5">
              <Text className="text-[13px] text-slate-500 mb-2 ml-1 font-semibold">ชื่อ-นามสกุล</Text>
              <View className="flex-row items-center bg-[#faf8f8] border border-slate-200 rounded-xl px-3.5 h-[50px]">
                <Ionicons name="person-outline" size={20} color="#D32F2F" className="mr-2.5" />
                <TextInput
                  className="flex-1 h-full text-[15px] text-slate-800"
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="เช่น สมชาย มีสุข"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View className="mb-5">
              <Text className="text-[13px] text-slate-500 mb-2 ml-1 font-semibold">เบอร์โทรศัพท์</Text>
              <View className="flex-row items-center bg-[#faf8f8] border border-slate-200 rounded-xl px-3.5 h-[50px]">
                <Ionicons name="call-outline" size={20} color="#D32F2F" className="mr-2.5" />
                <TextInput
                  className="flex-1 h-full text-[15px] text-slate-800"
                  value={tel}
                  onChangeText={setTel}
                  placeholder="0XX-XXX-XXXX"
                  placeholderTextColor="#94a3b8"
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <TouchableOpacity
            className={`bg-[#D32F2F] rounded-2xl py-4 w-full flex-row items-center justify-center shadow-md elevation-4 mb-4 ${isSaving ? "opacity-70" : ""}`}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            {isSaving ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text className="text-white text-base font-bold">
                  {isEditMode ? 'บันทึกการแก้ไข' : 'เพิ่มลูกค้าใหม่'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View className="flex-row w-full gap-3">
            {isEditMode && (
              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center py-3.5 rounded-xl border border-red-200 bg-red-50 ${isSaving ? "opacity-70" : ""}`}
                onPress={handleDelete}
                disabled={isSaving}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
                <Text className="text-red-500 text-sm font-semibold">ลบลูกค้า</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              className="flex-1 flex-row items-center justify-center py-3.5 rounded-xl border border-slate-200 bg-slate-50"
              onPress={handleClear}
            >
              <Ionicons name="refresh-outline" size={18} color="#64748b" style={{ marginRight: 6 }} />
              <Text className="text-slate-500 text-sm font-semibold">ล้างข้อมูล</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


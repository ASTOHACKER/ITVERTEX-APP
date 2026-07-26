import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
}

export default function DeviceInsertTestScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [usersList, setUsersList] = useState<UserProfile[]>([]);

  // Form States
  const [deviceId, setDeviceId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [deviceType, setDeviceType] = useState('Notebook');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [includedAccessories, setIncludedAccessories] = useState('');
  const [warrantyYears, setWarrantyYears] = useState('1');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [importantSoftware, setImportantSoftware] = useState('');
  const [devicePassword, setDevicePassword] = useState('');

  // Initial setup: Generate random device_id and fetch users
  useEffect(() => {
    generateRandomDeviceId();
    fetchProfiles();
    setDefaultWarrantyEndDate();
  }, []);

  const generateRandomDeviceId = () => {
    // Generate a random 9-digit bigint-safe number
    const randId = Math.floor(100000000 + Math.random() * 900000000).toString();
    setDeviceId(randId);
  };

  const setDefaultWarrantyEndDate = () => {
    // Default to 1 year from today in YYYY-MM-DD format
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setWarrantyEndDate(`${yyyy}-${mm}-${dd}`);
  };

  const fetchProfiles = async () => {
    try {
      setFetchingUsers(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, phone');
      
      if (error) throw error;
      if (data) setUsersList(data);
    } catch (err: any) {
      console.warn('Error fetching profiles:', err.message);
    } finally {
      setFetchingUsers(false);
    }
  };

  const autofillCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCustomerId(session.user.id);
        showAlert('สำเร็จ', 'กรอก ID ของคุณที่เข้าสู่ระบบปัจจุบันเรียบร้อยแล้ว');
      } else {
        showAlert('ล้มเหลว', 'ไม่พบการเข้าสู่ระบบปัจจุบัน กรุณาเข้าสู่ระบบก่อน');
      }
    } catch (err: any) {
      showAlert('ข้อผิดพลาด', err.message);
    }
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleReset = () => {
    generateRandomDeviceId();
    setCustomerId('');
    setDeviceType('Notebook');
    setBrand('');
    setModel('');
    setIncludedAccessories('');
    setWarrantyYears('1');
    setDefaultWarrantyEndDate();
    setSerialNumber('');
    setImportantSoftware('');
    setDevicePassword('');
  };

  const handleInsert = async () => {
    if (!deviceId.trim()) {
      showAlert('ข้อผิดพลาด', 'กรุณาระบุ Device ID (Bigint)');
      return;
    }

    setLoading(true);
    try {
      // Validate customer_id if provided
      let finalCustomerId: string | null = customerId.trim();
      if (finalCustomerId === '') {
        finalCustomerId = null;
      }

      // Check date format if provided
      let finalWarrantyEndDate: string | null = warrantyEndDate.trim();
      if (finalWarrantyEndDate === '') {
        finalWarrantyEndDate = null;
      } else {
        // Simple regex validation for YYYY-MM-DD
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(finalWarrantyEndDate)) {
          showAlert('ข้อผิดพลาด', 'รูปแบบวันที่สิ้นสุดประกันไม่ถูกต้อง กรุณาใช้ YYYY-MM-DD');
          setLoading(false);
          return;
        }
      }

      const payload = {
        device_id: parseInt(deviceId, 10),
        customer_id: finalCustomerId,
        device_type: deviceType.trim() || null,
        brand: brand.trim() || null,
        model: model.trim() || null,
        included_accessories: includedAccessories.trim() || null,
        warranty_years: warrantyYears.trim() ? parseInt(warrantyYears, 10) : null,
        warranty_end_date: finalWarrantyEndDate,
        serial_number: serialNumber.trim() || null,
        important_software: importantSoftware.trim() || null,
        device_password: devicePassword.trim() || null,
      };

      const { error } = await supabase
        .from('device')
        .insert([payload]);

      if (error) throw error;

      showAlert(
        'สำเร็จ!',
        `เพิ่มข้อมูล Device ID: ${deviceId} เข้าสู่ระบบเรียบร้อยแล้ว`
      );
      // Automatically generate a new ID for the next insert
      generateRandomDeviceId();
    } catch (err: any) {
      console.error(err);
      showAlert('บันทึกล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const deviceTypes = ['Notebook', 'Desktop', 'Printer', 'Monitor', 'Smartphone', 'Tablet', 'Other'];

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 h-14 bg-red-700">
        <TouchableOpacity onPress={() => router.back()} className="p-1">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Device Insert Test</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} bounces={false}>
          
          <View className="flex-row items-center p-3 mb-4 rounded-xl border border-red-300 bg-red-50">
            <Ionicons name="flask-outline" size={24} color="#D32F2F" style={{ marginRight: 8 }} />
            <Text className="flex-1 text-sm text-red-800 leading-5">
              หน้านี้สำหรับใช้ทดสอบการ Insert ข้อมูลลงตาราง <Text style={{ fontWeight: 'bold' }}>public.device</Text> ในฐานข้อมูลตาม Schema ที่กำหนด
            </Text>
          </View>

          {/* Customer Selection Section */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm elevation-2">
            <Text className="text-base font-bold text-red-700 mb-3">1. เลือกเจ้าของอุปกรณ์ (customer_id)</Text>
            
            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity className="flex-row items-center bg-red-700 py-1.5 px-3 rounded-full" onPress={autofillCurrentUser}>
                <Ionicons name="person-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text className="text-xs font-semibold text-white">ใช้ ID ตัวเอง</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center bg-slate-500 py-1.5 px-3 rounded-full" onPress={fetchProfiles}>
                <Ionicons name="refresh-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text className="text-xs font-semibold text-white">โหลดรายชื่อผู้ใช้</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-[13px] font-medium text-slate-500 mb-1.5">รายชื่อผู้ใช้จากระบบ (แตะเพื่อเลือก):</Text>
            {fetchingUsers ? (
              <ActivityIndicator size="small" color="#D32F2F" style={{ marginVertical: 8 }} />
            ) : usersList.length === 0 ? (
              <Text className="text-xs italic text-slate-400 mb-3">ไม่พบรายชื่อโปรไฟล์ในระบบ</Text>
            ) : (
              <View className="mb-3 py-1">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {usersList.map((user) => (
                    <TouchableOpacity
                      key={user.id}
                      className={`py-2 px-3 rounded-lg border ${customerId === user.id ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200'}`}
                      onPress={() => setCustomerId(user.id)}
                    >
                      <Text className={`text-[13px] font-semibold ${customerId === user.id ? 'text-red-800' : 'text-slate-700'}`}>
                        {user.first_name} {user.last_name}
                      </Text>
                      <Text className={`text-[10px] mt-0.5 ${customerId === user.id ? 'text-red-800' : 'text-slate-400'}`}>
                        ID: {user.id.slice(0, 8)}...
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">customer_id (UUID)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
                placeholder="กรอก UUID หรือเลือกจากรายชื่อด้านบน"
                value={customerId}
                onChangeText={setCustomerId}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Device Detail Section */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm elevation-2">
            <Text className="text-base font-bold text-red-700 mb-3">2. ข้อมูลอุปกรณ์ (Device Info)</Text>

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">device_id (Bigint) *</Text>
              <View className="flex-row items-center">
                <TextInput
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 mr-2"
                  placeholder="เช่น 123456789"
                  value={deviceId}
                  onChangeText={setDeviceId}
                  keyboardType="numeric"
                />
                <TouchableOpacity className="bg-sky-600 py-2.5 px-4 rounded-lg justify-center" onPress={generateRandomDeviceId}>
                  <Text className="text-white text-sm font-semibold">สุ่ม ID</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-[13px] font-medium text-slate-500 mb-1.5">ประเภทอุปกรณ์ (device_type)</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {deviceTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  className={`py-1.5 px-3 rounded-2xl ${deviceType === type ? 'bg-red-700' : 'bg-slate-100'}`}
                  onPress={() => setDeviceType(type)}
                >
                  <Text className={`text-[13px] font-medium ${deviceType === type ? 'text-white' : 'text-slate-500'}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">ยี่ห้อ (brand)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
                placeholder="เช่น Dell, Apple, HP"
                value={brand}
                onChangeText={setBrand}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">รุ่น (model)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
                placeholder="เช่น Inspiron 15, MacBook Air"
                value={model}
                onChangeText={setModel}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">ซีเรียลนัมเบอร์ (serial_number)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
                placeholder="ระบุรหัสประจำตัวเครื่อง"
                value={serialNumber}
                onChangeText={setSerialNumber}
                autoCapitalize="characters"
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">รหัสผ่านเครื่อง (device_password)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
                placeholder="ระบุรหัสผ่านเข้าเครื่องคอมพิวเตอร์"
                value={devicePassword}
                onChangeText={setDevicePassword}
                secureTextEntry={false}
              />
            </View>
          </View>

          {/* Warranty & Extras Section */}
          <View className="bg-white rounded-2xl p-4 mb-4 shadow-sm elevation-2">
            <Text className="text-base font-bold text-red-700 mb-3">3. ข้อมูลอื่น ๆ และการรับประกัน</Text>

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">อุปกรณ์ที่ติดมาด้วย (included_accessories)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
                placeholder="เช่น สายชาร์จ, กระเป๋า, เมาส์"
                value={includedAccessories}
                onChangeText={setIncludedAccessories}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">โปรแกรมสำคัญ (important_software)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
                placeholder="เช่น MS Office, Adobe Premiere"
                value={importantSoftware}
                onChangeText={setImportantSoftware}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">จำนวนปีรับประกัน (warranty_years)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
                placeholder="เช่น 1, 2, 3"
                value={warrantyYears}
                onChangeText={setWarrantyYears}
                keyboardType="numeric"
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] font-medium text-slate-500 mb-1.5">วันที่สิ้นสุดรับประกัน (warranty_end_date)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900"
                placeholder="รูปแบบ YYYY-MM-DD เช่น 2027-07-16"
                value={warrantyEndDate}
                onChangeText={setWarrantyEndDate}
              />
            </View>
          </View>

          {/* Form Actions */}
          <View className="gap-3 mb-6">
            <TouchableOpacity
              className="bg-red-700 py-3 rounded-lg items-center justify-center flex-row"
              onPress={handleInsert}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text className="text-white text-base font-bold">Insert (เพิ่มข้อมูล)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-slate-200 py-3 rounded-lg items-center justify-center flex-row"
              onPress={handleReset}
              disabled={loading}
            >
              <Ionicons name="trash-outline" size={20} color="#334155" style={{ marginRight: 6 }} />
              <Text className="text-slate-700 text-base font-bold">ล้างค่าฟอร์ม</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}



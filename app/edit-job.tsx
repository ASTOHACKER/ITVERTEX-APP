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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function EditJobScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();

  // Form states
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [accessories, setAccessories] = useState('');
  const [warrantyYears, setWarrantyYears] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [importantPrograms, setImportantPrograms] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('รอชำระ');

  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const statusOptions = ['รอชำระ', 'กำลังซ่อม', 'ชำระแล้ว', 'ส่งมอบแล้ว', 'ยกเลิก'];

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  useEffect(() => {
    if (jobId) fetchJob();
    else setLoading(false);
  }, [jobId]);

  async function fetchJob() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('repair_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (error) throw error;

      if (data) {
        setCustomerName(data.customer_name || '');
        setPhone(data.phone || '');
        setDeviceType(data.device_type || '');
        setBrand(data.brand || '');
        setModel(data.model || '');
        setSerialNumber(data.serial_number || '');
        setSymptoms(data.symptoms || '');
        setAccessories(data.accessories || '');
        setWarrantyYears(data.warranty_years?.toString() || '');
        setWarrantyEndDate(data.warranty_end_date || '');
        setImportantPrograms(data.important_programs || '');
        setPassword(data.password || '');
        setStatus(data.status || 'รอชำระ');
      }
    } catch (err: any) {
      console.error(err);
      showAlert('ข้อผิดพลาด', 'ไม่สามารถโหลดข้อมูลงานซ่อมได้');
    } finally {
      setLoading(false);
    }
  }

  const handleSave = async () => {
    if (!customerName.trim()) {
      showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อลูกค้า');
      return;
    }
    if (!phone.trim()) {
      showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกเบอร์โทร');
      return;
    }
    if (!deviceType.trim()) {
      showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกประเภทอุปกรณ์');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        customer_name: customerName.trim(),
        phone: phone.trim(),
        device_type: deviceType.trim(),
        brand: brand.trim(),
        model: model.trim(),
        serial_number: serialNumber.trim(),
        symptoms: symptoms.trim(),
        accessories: accessories.trim() || 'ไม่มี',
        warranty_years: parseInt(warrantyYears) || 0,
        warranty_end_date: warrantyEndDate.trim() || null,
        important_programs: importantPrograms.trim(),
        password: password.trim(),
        status: status};

      const { data, error } = await supabase
        .from('repair_jobs')
        .update(updateData)
        .eq('id', jobId)
        .select();

      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('ไม่สามารถอัปเดตข้อมูลได้ (อาจติดสิทธิ์ RLS)');
      }

      showAlert('สำเร็จ', 'บันทึกข้อมูลงานซ่อมเรียบร้อยแล้ว');
      router.back();
    } catch (err: any) {
      console.error(err);
      showAlert('ล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#D32F2F]">
        <View className="flex-1 justify-center items-center bg-slate-50">
          <ActivityIndicator size="large" color="#D32F2F" />
          <Text className="mt-3 text-slate-500 text-base">กำลังโหลดข้อมูล...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#D32F2F]">
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 bg-[#D32F2F]" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12 }}>
        <TouchableOpacity className="p-1" onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">แก้ไขงานซ่อม</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-4 pb-10" bounces={false}>

          {/* Customer Info Section */}
          <View className="rounded-2xl p-5 mb-4 border border-sky-100 bg-white shadow-sm elevation-2">
            <Text className="text-base font-bold text-sky-600 mb-4">ข้อมูลลูกค้า</Text>

            <View className="mb-4">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ชื่อ-นามสกุล *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="เช่น สมชาย มีสุข"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View className="mb-4">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">เบอร์โทรศัพท์ *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                value={phone}
                onChangeText={setPhone}
                placeholder="0XX-XXX-XXXX"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Device Info Section */}
          <View className="rounded-2xl p-5 mb-4 border border-orange-100 bg-white shadow-sm elevation-2">
            <Text className="text-base font-bold text-orange-600 mb-4">ข้อมูลอุปกรณ์</Text>

            <View className="mb-4">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ประเภทอุปกรณ์ *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                value={deviceType}
                onChangeText={setDeviceType}
                placeholder="Notebook / Desktop / Printer"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View className="flex-row">
              <View className="mb-4 flex-1 mr-2">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ยี่ห้อ</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                  value={brand}
                  onChangeText={setBrand}
                  placeholder="เช่น ASUS"
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View className="mb-4 flex-1">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">รุ่น</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                  value={model}
                  onChangeText={setModel}
                  placeholder="เช่น ROG Strix G15"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View className="mb-4">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">หมายเลขเครื่อง (S/N)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                value={serialNumber}
                onChangeText={setSerialNumber}
                placeholder="S/N ตามหน้าเครื่อง"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View className="mb-4">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">อาการเสีย</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl h-[90px] px-4 py-3 text-slate-800 text-[15px]" style={{ textAlignVertical: "top" }}
                value={symptoms}
                onChangeText={setSymptoms}
                placeholder="อธิบายอาการเสียของเครื่อง..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={3}
              />
            </View>

            <View className="mb-4">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">อุปกรณ์ที่ติดมา</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                value={accessories}
                onChangeText={setAccessories}
                placeholder="เช่น สายชาร์จ, เมาส์"
                placeholderTextColor="#94a3b8"
              />
            </View>

            <View className="flex-row">
              <View className="mb-4 flex-1 mr-2">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ระยะประกัน (ปี)</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                  value={warrantyYears}
                  onChangeText={setWarrantyYears}
                  placeholder="ปี"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                />
              </View>
              <View className="mb-4 flex-1">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">วันสิ้นสุดประกัน</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                  value={warrantyEndDate}
                  onChangeText={setWarrantyEndDate}
                  placeholder="2026-12-31"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>

            <View className="flex-row">
              <View className="mb-4 flex-1 mr-2">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">โปรแกรมสำคัญ</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                  value={importantPrograms}
                  onChangeText={setImportantPrograms}
                  placeholderTextColor="#94a3b8"
                />
              </View>
              <View className="mb-4 flex-1">
                <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">รหัสเข้าเครื่อง</Text>
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 text-slate-800 text-[15px]"
                  value={password}
                  onChangeText={setPassword}
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          </View>

          {/* Status Section */}
          <View className="rounded-2xl p-5 mb-4 border border-indigo-100 bg-white shadow-sm elevation-2">
            <Text className="text-base font-bold text-indigo-600 mb-4">สถานะงาน</Text>
            <View className="flex-row flex-wrap gap-2">
              {statusOptions.map((opt) => {
                const isSelected = status === opt;
                return (
                  <TouchableOpacity
                    key={opt}
                    className={`px-3.5 py-2 rounded-full border ${isSelected ? "bg-[#D32F2F] border-[#D32F2F]" : "bg-slate-100 border-slate-200"}`}
                    onPress={() => setStatus(opt)}
                  >
                    <Text className={`text-[13px] font-semibold ${isSelected ? "text-white" : "text-slate-500"}`}>{opt}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Save Button */}
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
                <Ionicons name="save-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text className="text-white text-base font-bold">บันทึกข้อมูล</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity className="rounded-2xl py-3.5 items-center justify-center mt-3 border border-slate-200 bg-white" onPress={() => router.back()}>
            <Text className="text-slate-500 text-base font-semibold">ยกเลิก</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}


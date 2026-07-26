import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

// ponytail: YAGNI - inline states, automatic job number generation, standard TextInputs
export default function ReceiveScreen() {
  const router = useRouter();

  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [brandModel, setBrandModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [importantPrograms, setImportantPrograms] = useState('');
  const [password, setPassword] = useState('');
  const [warrantyYears, setWarrantyYears] = useState('');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [accessories, setAccessories] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [technicianName, setTechnicianName] = useState('');
  const [saving, setSaving] = useState(false);
  const [isConfirmModalVisible, setConfirmModalVisible] = useState(false);

  const resetForm = () => {
    setCustomerName('');
    setPhone('');
    setDeviceType('');
    setBrandModel('');
    setSerialNumber('');
    setImportantPrograms('');
    setPassword('');
    setWarrantyYears('');
    setWarrantyEndDate('');
    setAccessories('');
    setSymptoms('');
    setTechnicianName('');
  };

  const deviceTypes = ['Notebook', 'Desktop', 'Printer', 'Monitor', 'Other'];

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    if (cleaned.length <= 10) {
      setPhone(cleaned);
    }
  };

  const formatPhoneNumber = (num: string) => {
    if (!num) return '';
    if (num.length === 9 && num.startsWith('0')) { // 02-xxx-xxxx
        return `${num.slice(0, 2)}-${num.slice(2, 5)}-${num.slice(5)}`;
    }
    if (num.length === 10) { // 0xx-xxx-xxxx
        return `${num.slice(0, 3)}-${num.slice(3, 6)}-${num.slice(6)}`;
    }
    return num;
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const generateJobNumber = () => {
    const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const randPart = Math.floor(100 + Math.random() * 900);
    return `REP-${datePart}-${randPart}`;
  };

  const attemptSave = () => {
    const phoneDigits = phone.replace(/[^0-9]/g, '');
    if (!customerName.trim()) {
      showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อลูกค้า');
      return;
    }
    if (phoneDigits.length < 9 || phoneDigits.length > 10) {
      showAlert('เบอร์โทรไม่ถูกต้อง', 'กรุณากรอกเบอร์โทรศัพท์ 9 หรือ 10 หลัก');
      return;
    }
    if (!deviceType.trim()) {
      showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณาเลือกหรือกรอกประเภทอุปกรณ์');
      return;
    }
    // All checks passed, show confirmation
    setConfirmModalVisible(true);
  };

  const handleSave = async () => {
    setConfirmModalVisible(false);
    if (!customerName.trim() || !phone.trim() || !deviceType.trim()) {
      showAlert('ข้อมูลไม่ครบถ้วน', 'กรุณากรอกชื่อลูกค้า เบอร์โทร และประเภทอุปกรณ์');
      return;
    }

    try {
      setSaving(true);
      const jobNumber = generateJobNumber();
      const parts = brandModel.trim().split(' ');
      const brand = parts[0] || '';
      const model = parts.slice(1).join(' ') || '';

      const { data, error } = await supabase
        .from('repair_jobs')
        .insert({
          job_number: jobNumber,
          customer_name: customerName,
          phone: phone,
          device_type: deviceType,
          brand: brand,
          model: model,
          serial_number: serialNumber,
          important_programs: importantPrograms,
          password: password,
          warranty_years: parseInt(warrantyYears) || 0,
          warranty_end_date: warrantyEndDate ? warrantyEndDate : null,
          accessories: accessories || 'ไม่มี',
          symptoms: symptoms,
          technician_name: technicianName.trim() || null,
          items: [],
          status: 'รอชำระ'
        })
        .select()
        .single();

      if (error) throw error;

      resetForm();

      if (Platform.OS === 'web') {
        window.alert('สำเร็จ\n\nบันทึกงานซ่อมใหม่เรียบร้อยแล้ว (' + jobNumber + ')');
        router.replace('/(tabs)');
      } else {
        Alert.alert('สำเร็จ', 'บันทึกงานซ่อมใหม่เรียบร้อยแล้ว', [
          {
            text: 'ดูใบเสร็จ',
            onPress: () => {
              router.push({
                pathname: '/receipt',
                params: { jobId: data.id }
              });
            }
          },
          {
            text: 'ตกลง',
            onPress: () => router.replace('/(tabs)')
          }
        ]);
      }
    } catch (error: any) {
      console.error(error);
      showAlert('บันทึกล้มเหลว', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-red-700 dark:bg-slate-900">
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 bg-red-700 dark:bg-slate-800 border-b border-transparent dark:border-slate-700" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12 }}>
        <TouchableOpacity className="p-1 -ml-1" onPress={handleBack}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">รับเครื่องซ่อมใหม่</Text>
        <View style={{ width: 28 }} />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerStyle={{ padding: 16, paddingBottom: 40 }} bounces={false}>

          {/* ข้อมูลลูกค้า (Customer Info) */}
          <View className="rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <Text className="text-base font-bold text-red-700 dark:text-red-400 mb-4">ข้อมูลลูกค้า</Text>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">ชื่อ-นามสกุล</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                placeholder="เช่น สมชาย มีสุข"
                placeholderTextColor="#94a3b8"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">เบอร์โทรศัพท์</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                placeholder="0XX-XXX-XXXX"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={formatPhoneNumber(phone)}
                onChangeText={handlePhoneChange}
                maxLength={12} // 0xx-xxx-xxxx format
              />
            </View>
          </View>

          {/* ช่างดูแล (Technician) */}
          <View className="rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <Text className="text-base font-bold text-red-700 dark:text-red-400 mb-4">ช่างดูแล</Text>
            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">ชื่อช่างผู้รับผิดชอบ</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                placeholder="เช่น สมชาย (เว้นว่างได้)"
                placeholderTextColor="#94a3b8"
                value={technicianName}
                onChangeText={setTechnicianName}
              />
            </View>
          </View>

          {/* ข้อมูลอุปกรณ์ (Device Info) */}
          <View className="rounded-2xl p-5 mb-4 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm">
            <Text className="text-base font-bold text-red-700 dark:text-red-400 mb-4">ข้อมูลอุปกรณ์</Text>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">ประเภทอุปกรณ์ *</Text>
              <View className="flex-row flex-wrap gap-2 mb-2">
                {deviceTypes.map((type) => (
                  <TouchableOpacity
                    key={type}
                    className={`px-4 py-2 rounded-[20px] border ${deviceType === type ? 'bg-red-700 border-red-700' : 'bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}
                    onPress={() => setDeviceType(type)}
                  >
                    <Text className={`text-[13px] font-semibold ${deviceType === type ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                placeholder="หรือพิมพ์ประเภทอื่น..."
                placeholderTextColor="#94a3b8"
                value={deviceType}
                onChangeText={setDeviceType}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">ยี่ห้อและรุ่น</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                placeholder="เช่น ASUS ROG Strix G15"
                placeholderTextColor="#94a3b8"
                value={brandModel}
                onChangeText={setBrandModel}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">Serial Number</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                placeholder="S/N ตามหน้าเครื่อง"
                placeholderTextColor="#94a3b8"
                value={serialNumber}
                onChangeText={setSerialNumber}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">โปรแกรมสำคัญ</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-[100px] px-4 py-3 text-slate-800 dark:text-slate-100 text-[15px]"
                style={{ textAlignVertical: 'top' }}
                multiline
                numberOfLines={3}
                value={importantPrograms}
                onChangeText={setImportantPrograms}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">รหัสเข้าเครื่อง</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">ระยะประกัน (ปี)</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                placeholder="ปี"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={warrantyYears}
                onChangeText={setWarrantyYears}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">วันที่สิ้นสุดประกัน</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                placeholder="2026-12-31"
                placeholderTextColor="#94a3b8"
                value={warrantyEndDate}
                onChangeText={setWarrantyEndDate}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">อุปกรณ์ที่ติดมา</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-12 px-4 text-slate-800 dark:text-slate-100 text-[15px]"
                value={accessories}
                onChangeText={setAccessories}
              />
            </View>

            <View className="mb-4">
              <Text className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 font-medium">อาการเบื้องต้น</Text>
              <TextInput
                className="bg-slate-50 dark:bg-slate-700/70 border border-slate-200 dark:border-slate-600 rounded-xl h-[100px] px-4 py-3 text-slate-800 dark:text-slate-100 text-[15px]"
                style={{ textAlignVertical: 'top' }}
                placeholder="อธิบายอาการเสียของเครื่อง..."
                placeholderTextColor="#94a3b8"
                multiline
                numberOfLines={4}
                value={symptoms}
                onChangeText={setSymptoms}
              />
            </View>

            {/* Signatures */}
            <View className="mt-2 mb-5">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">ลายเซ็นลูกค้า</Text>
              <View className="bg-white border border-slate-200 rounded-xl h-[120px] mt-1.5" />
            </View>

            <View className="mt-2 mb-5">
              <Text className="text-xs text-slate-500 mb-1.5 font-medium">ลายเซ็นพนักงาน</Text>
              <View className="bg-white border border-slate-200 rounded-xl h-[120px] mt-1.5" />
            </View>

          </View>

          {/* Action Button */}
          <TouchableOpacity className="bg-red-700 rounded-2xl py-4 flex-row items-center justify-center mt-2 shadow-md elevation-4 shadow-red-700/30" onPress={attemptSave} disabled={saving} activeOpacity={0.8}>
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
                <Text className="text-white text-base font-bold">บันทึกและสร้างใบรับซ่อม (PDF)</Text>
              </>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Confirmation Modal */}
      <Modal
        visible={isConfirmModalVisible}
        transparent={true}
        animationType="fade"
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <View className="w-[90%] bg-white rounded-[20px] p-6 items-center shadow-md elevation-5">
            <Ionicons name="information-circle-outline" size={40} color="#0284c7" style={{ alignSelf: 'center', marginBottom: 12 }}/>
            <Text className="text-lg font-bold text-slate-800 mb-3">ยืนยันข้อมูล</Text>
            <Text className="text-[15px] text-slate-700 text-left mb-6 w-full leading-[22px]">
              <Text style={{fontWeight: 'bold'}}>ลูกค้า:</Text> {customerName}{'\n'}
              <Text style={{fontWeight: 'bold'}}>เบอร์โทร:</Text> {formatPhoneNumber(phone)}{'\n'}
              <Text style={{fontWeight: 'bold'}}>อุปกรณ์:</Text> {deviceType} - {brandModel || 'ไม่ระบุรุ่น'}
            </Text>
            <View className="flex-row justify-between w-full">
              <TouchableOpacity className="flex-1 p-3 rounded-xl bg-slate-100 items-center mr-2" onPress={() => setConfirmModalVisible(false)}>
                <Text className="text-slate-500 font-bold">แก้ไข</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className={`flex-[1.5] p-3 rounded-xl bg-red-700 items-center ml-2 ${saving ? 'opacity-70' : ''}`}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-bold">ยืนยันและบันทึก</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}



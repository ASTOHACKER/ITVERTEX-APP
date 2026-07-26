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

export default function RepairJobInsertTestScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Form States
  const [jobNumber, setJobNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [deviceType, setDeviceType] = useState('Notebook');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [password, setPassword] = useState('');
  const [importantPrograms, setImportantPrograms] = useState('');
  const [accessories, setAccessories] = useState('ไม่มี');
  const [symptoms, setSymptoms] = useState('');
  const [status, setStatus] = useState('รอชำระ');
  const [technicianName, setTechnicianName] = useState('');
  const [warrantyYears, setWarrantyYears] = useState('1');
  const [warrantyEndDate, setWarrantyEndDate] = useState('');
  const [itemsJson, setItemsJson] = useState('[\n  {\n    "name": "ค่าบริการตรวจเช็ค",\n    "price": 300,\n    "qty": 1\n  }\n]');

  useEffect(() => {
    generateRandomJobNumber();
    setDefaultWarrantyEndDate();
  }, []);

  const generateRandomJobNumber = () => {
    const date = new Date();
    const yy = String(date.getFullYear()).slice(-2);
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const randNum = String(Math.floor(100 + Math.random() * 900));
    setJobNumber(`REP-${yy}${mm}${dd}-${randNum}`);
  };

  const setDefaultWarrantyEndDate = () => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setWarrantyEndDate(`${yyyy}-${mm}-${dd}`);
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const handleReset = () => {
    generateRandomJobNumber();
    setCustomerName('');
    setPhone('');
    setDeviceType('Notebook');
    setBrand('');
    setModel('');
    setSerialNumber('');
    setPassword('');
    setImportantPrograms('');
    setAccessories('ไม่มี');
    setSymptoms('');
    setStatus('รอชำระ');
    setTechnicianName('');
    setWarrantyYears('1');
    setDefaultWarrantyEndDate();
    setItemsJson('[\n  {\n    "name": "ค่าบริการตรวจเช็ค",\n    "price": 300,\n    "qty": 1\n  }\n]');
  };

  const handleInsert = async () => {
    if (!jobNumber.trim()) {
      showAlert('ข้อผิดพลาด', 'กรุณาระบุเลขแจ้งซ่อม (Job Number)');
      return;
    }
    if (!customerName.trim()) {
      showAlert('ข้อผิดพลาด', 'กรุณาระบุชื่อลูกค้า');
      return;
    }
    if (!phone.trim()) {
      showAlert('ข้อผิดพลาด', 'กรุณาระบุเบอร์โทรศัพท์ลูกค้า');
      return;
    }

    setLoading(true);
    try {
      // Validate itemsJson format
      let parsedItems = [];
      if (itemsJson.trim()) {
        try {
          parsedItems = JSON.parse(itemsJson);
          if (!Array.isArray(parsedItems)) {
            showAlert('ข้อผิดพลาด', 'รูปแบบ Items ต้องเป็น JSON Array เท่านั้น');
            setLoading(false);
            return;
          }
        } catch (e) {
          showAlert('ข้อผิดพลาด', 'รูปแบบ JSON ของ Items ไม่ถูกต้อง');
          setLoading(false);
          return;
        }
      }

      // Check date format if provided
      let finalWarrantyEndDate: string | null = warrantyEndDate.trim();
      if (finalWarrantyEndDate === '') {
        finalWarrantyEndDate = null;
      } else {
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(finalWarrantyEndDate)) {
          showAlert('ข้อผิดพลาด', 'รูปแบบวันที่สิ้นสุดประกันไม่ถูกต้อง กรุณาใช้ YYYY-MM-DD');
          setLoading(false);
          return;
        }
      }

      const payload = {
        job_number: jobNumber.trim(),
        customer_name: customerName.trim(),
        phone: phone.trim(),
        device_type: deviceType.trim() || null,
        brand: brand.trim() || null,
        model: model.trim() || null,
        serial_number: serialNumber.trim() || null,
        password: password.trim() || null,
        important_programs: importantPrograms.trim() || null,
        accessories: accessories.trim() || 'ไม่มี',
        symptoms: symptoms.trim() || null,
        status: status.trim(),
        technician_name: technicianName.trim() || null,
        warranty_years: warrantyYears.trim() ? parseInt(warrantyYears, 10) : 0,
        warranty_end_date: finalWarrantyEndDate,
        items: parsedItems,
      };

      const { error } = await supabase
        .from('repair_jobs')
        .insert([payload]);

      if (error) throw error;

      showAlert(
        'สำเร็จ!',
        `เพิ่มข้อมูล Repair Job: ${jobNumber} เรียบร้อยแล้ว`
      );
      handleReset();
    } catch (err: any) {
      console.error(err);
      showAlert('บันทึกล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const deviceTypes = ['Notebook', 'Desktop', 'Printer', 'Monitor', 'Smartphone', 'Tablet', 'Other'];
  const statuses = ['รอชำระ', 'กำลังซ่อม', 'ชำระแล้ว', 'ส่งมอบแล้ว', 'ยกเลิก', 'แจ้งปัญหา'];

  return (
    <SafeAreaView className="flex-1 bg-[#D32F2F]">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 bg-[#D32F2F]" style={{ paddingTop: Platform.OS === 'android' ? 36 : 12 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/15 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Repair Job Insert Test</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        className="flex-1 bg-slate-50"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }} bounces={false}>
          
          <View className="flex-row items-center bg-white border border-red-200 rounded-xl p-4 mb-4">
            <Ionicons name="flask-outline" size={24} color="#D32F2F" style={{ marginRight: 8 }} />
            <Text className="text-[13px] text-slate-600 flex-1 leading-relaxed">
              หน้านี้สำหรับใช้ทดสอบการ Insert ข้อมูลลงตาราง <Text style={{ fontWeight: 'bold' }}>public.repair_jobs</Text> ในฐานข้อมูลตาม Schema ของแอปพลิเคชัน
            </Text>
          </View>

          {/* Job details */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">1. ข้อมูลรหัสงาน (Job Identification)</Text>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">เลขใบแจ้งซ่อม (job_number) *</Text>
              <View className="flex-row items-center">
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 flex-1 mr-2"
                  placeholder="เช่น REP-260717-123"
                  value={jobNumber}
                  onChangeText={setJobNumber}
                />
                <TouchableOpacity className="bg-sky-600 py-2.5 px-4 rounded-lg justify-center" onPress={generateRandomJobNumber}>
                  <Text className="text-white text-[14px] font-semibold">สุ่มรหัส</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Customer Selection Section */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">2. ข้อมูลลูกค้า (Customer Info)</Text>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ชื่อลูกค้า (customer_name) *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น นายสมชาย ดีใจ"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">เบอร์โทรศัพท์ (phone) *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น 0812345678"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Device Detail Section */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">3. ข้อมูลอุปกรณ์ (Device Detail)</Text>

            <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ประเภทอุปกรณ์ (device_type)</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {deviceTypes.map((type) => (
                <TouchableOpacity
                  key={type}
                  className={`py-1.5 px-3 rounded-2xl ${deviceType === type ? 'bg-[#D32F2F]' : 'bg-slate-100'}`}
                  onPress={() => setDeviceType(type)}
                >
                  <Text className={`text-[13px] font-medium ${deviceType === type ? 'text-white' : 'text-slate-500'}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ยี่ห้อ (brand)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น Dell, Apple, HP"
                value={brand}
                onChangeText={setBrand}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">รุ่น (model)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น Inspiron 15, MacBook Air"
                value={model}
                onChangeText={setModel}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ซีเรียลนัมเบอร์ (serial_number)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น S/N 12345678X"
                value={serialNumber}
                onChangeText={setSerialNumber}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">รหัสผ่านเครื่อง (password)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น 1234 หรือ 'ไม่มี'"
                value={password}
                onChangeText={setPassword}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">โปรแกรมสำคัญ (important_programs)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น MS Office, Photoshop"
                value={importantPrograms}
                onChangeText={setImportantPrograms}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">อุปกรณ์ที่ติดมาด้วย (accessories)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น สายชาร์จ, กระเป๋า"
                value={accessories}
                onChangeText={setAccessories}
              />
            </View>
          </View>

          {/* Repair Info Section */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">4. รายละเอียดงานซ่อม (Repair Details)</Text>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">อาการเสีย (symptoms)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 min-h-[60px]"
                placeholder="เช่น เปิดไม่ติด, หน้าจอแตก"
                multiline
                value={symptoms}
                onChangeText={setSymptoms}
              />
            </View>

            <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">สถานะ (status)</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {statuses.map((s) => (
                <TouchableOpacity
                  key={s}
                  className={`py-1.5 px-3 rounded-2xl ${status === s ? 'bg-[#D32F2F]' : 'bg-slate-100'}`}
                  onPress={() => setStatus(s)}
                >
                  <Text className={`text-[13px] font-medium ${status === s ? 'text-white' : 'text-slate-500'}`}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ช่างผู้รับผิดชอบ (technician_name)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น ช่างวิชัย, ช่างเจ"
                value={technicianName}
                onChangeText={setTechnicianName}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ระยะเวลาประกัน/ปี (warranty_years)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น 1 หรือ 0"
                value={warrantyYears}
                onChangeText={setWarrantyYears}
                keyboardType="numeric"
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">วันสิ้นสุดการประกัน (warranty_end_date) [YYYY-MM-DD]</Text>
              <View className="flex-row items-center">
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 flex-1 mr-2"
                  placeholder="เช่น YYYY-MM-DD"
                  value={warrantyEndDate}
                  onChangeText={setWarrantyEndDate}
                />
                <TouchableOpacity className="bg-slate-500 py-2.5 px-4 rounded-lg justify-center" onPress={setDefaultWarrantyEndDate}>
                  <Text className="text-white text-[14px] font-semibold">+1 ปี</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Spare Parts and Items Section */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">5. รายการอะไหล่และค่าบริการ (items - JSONB Array)</Text>
            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">กรอกรูปแบบ JSON Array</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[12px] text-slate-900 min-h-[120px]"
                style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' }}
                placeholder="ป้อน JSON Array รายการซ่อม"
                multiline
                value={itemsJson}
                onChangeText={setItemsJson}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View className="gap-3 mb-6">
            <TouchableOpacity
              className="bg-[#D32F2F] py-3 rounded-lg items-center justify-center flex-row"
              onPress={handleInsert}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 6 }} />
                  <Text className="text-white text-[16px] font-bold">บันทึกข้อมูล (Insert)</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              className="bg-slate-200 py-3 rounded-lg items-center justify-center flex-row"
              onPress={handleReset}
              disabled={loading}
            >
              <Ionicons name="refresh-outline" size={20} color="#64748b" style={{ marginRight: 6 }} />
              <Text className="text-slate-500 text-[16px] font-bold">ล้างข้อมูล (Reset)</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

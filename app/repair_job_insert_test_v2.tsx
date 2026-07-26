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

interface DeviceItem {
  device_id: number;
  device_type?: string;
  brand?: string;
  model?: string;
}

export default function RepairJobInsertTestV2Screen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [fetchingDevices, setFetchingDevices] = useState(false);
  const [devicesList, setDevicesList] = useState<DeviceItem[]>([]);

  // Form States
  const [jobId, setJobId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [quotationId, setQuotationId] = useState('');
  const [symptom, setSymptom] = useState('');
  const [appointmentDate, setAppointmentDate] = useState('');
  const [staffReceiveSignature, setStaffReceiveSignature] = useState('');
  const [techInspectSignature, setTechInspectSignature] = useState('');
  const [techRepairSignature, setTechRepairSignature] = useState('');
  const [customerReceiveSignature, setCustomerReceiveSignature] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [slipImage, setSlipImage] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [statusId, setStatusId] = useState('1'); // Default to 1

  useEffect(() => {
    generateRandomJobId();
    setDefaultAppointmentDate();
    fetchDevices();
  }, []);

  const generateRandomJobId = () => {
    // Generate a random 9-digit bigint-safe number
    const randId = Math.floor(100000000 + Math.random() * 900000000).toString();
    setJobId(randId);
  };

  const setDefaultAppointmentDate = () => {
    // Default to 7 days from today in YYYY-MM-DD format
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    setAppointmentDate(`${yyyy}-${mm}-${dd}`);
  };

  const fetchDevices = async () => {
    try {
      setFetchingDevices(true);
      const { data, error } = await supabase
        .from('device')
        .select('device_id, device_type, brand, model')
        .limit(20);
      
      if (error) throw error;
      if (data) setDevicesList(data);
    } catch (err: any) {
      console.warn('Error fetching devices:', err.message);
    } finally {
      setFetchingDevices(false);
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
    generateRandomJobId();
    setDeviceId('');
    setQuotationId('');
    setSymptom('');
    setDefaultAppointmentDate();
    setStaffReceiveSignature('');
    setTechInspectSignature('');
    setTechRepairSignature('');
    setCustomerReceiveSignature('');
    setTotalAmount('');
    setSlipImage('');
    setPaymentDate('');
    setPaymentMethodId('');
    setStatusId('1');
  };

  const handleInsert = async () => {
    if (!jobId.trim()) {
      showAlert('ข้อผิดพลาด', 'กรุณาระบุ Job ID (Bigint)');
      return;
    }

    setLoading(true);
    try {
      // Validate dates
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      
      let finalAppointmentDate: string | null = appointmentDate.trim();
      if (finalAppointmentDate === '') {
        finalAppointmentDate = null;
      } else if (!datePattern.test(finalAppointmentDate)) {
        showAlert('ข้อผิดพลาด', 'รูปแบบวันนัดหมายไม่ถูกต้อง กรุณาใช้ YYYY-MM-DD');
        setLoading(false);
        return;
      }

      let finalPaymentDate: string | null = paymentDate.trim();
      if (finalPaymentDate === '') {
        finalPaymentDate = null;
      } else if (!datePattern.test(finalPaymentDate)) {
        showAlert('ข้อผิดพลาด', 'รูปแบบวันที่ชำระเงินไม่ถูกต้อง กรุณาใช้ YYYY-MM-DD');
        setLoading(false);
        return;
      }

      // Parse payload types
      const payload = {
        job_id: parseInt(jobId, 10),
        device_id: deviceId.trim() ? parseInt(deviceId, 10) : null,
        quotation_id: quotationId.trim() ? parseInt(quotationId, 10) : null,
        symptom: symptom.trim() || null,
        appointment_date: finalAppointmentDate,
        staff_receive_signature: staffReceiveSignature.trim() || null,
        tech_inspect_signature: techInspectSignature.trim() || null,
        tech_repair_signature: techRepairSignature.trim() || null,
        customer_receive_signature: customerReceiveSignature.trim() || null,
        total_amount: totalAmount.trim() ? parseFloat(totalAmount) : null,
        slip_image: slipImage.trim() || null,
        payment_date: finalPaymentDate,
        payment_method_id: paymentMethodId.trim() ? parseInt(paymentMethodId, 10) : null,
        status_id: statusId.trim() ? parseInt(statusId, 10) : null,
      };

      const { error } = await supabase
        .from('repair_job')
        .insert([payload]);

      if (error) throw error;

      showAlert(
        'สำเร็จ!',
        `เพิ่มข้อมูล Repair Job (Singular) ID: ${jobId} ลงตาราง public.repair_job เรียบร้อยแล้ว`
      );
      handleReset();
    } catch (err: any) {
      console.error(err);
      showAlert('บันทึกล้มเหลว', err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
    { id: '1', label: '1 (รอชำระ)' },
    { id: '2', label: '2 (กำลังซ่อม)' },
    { id: '3', label: '3 (ชำระแล้ว)' },
    { id: '4', label: '4 (ส่งมอบแล้ว)' },
    { id: '5', label: '5 (ยกเลิก)' },
    { id: '6', label: '6 (แจ้งปัญหา)' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#D32F2F]">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 bg-[#D32F2F]" style={{ paddingTop: Platform.OS === 'android' ? 36 : 12 }}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/15 items-center justify-center">
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Repair Job Singular Insert Test</Text>
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
              หน้านี้สำหรับใช้ทดสอบการ Insert ข้อมูลลงตาราง <Text style={{ fontWeight: 'bold' }}>public.repair_job (ตารางเดี่ยว)</Text> ในฐานข้อมูลตาม Schema ของระบบ
            </Text>
          </View>

          {/* Job ID section */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">1. ข้อมูลหลัก (Primary Key)</Text>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">job_id (Bigint) *</Text>
              <View className="flex-row items-center">
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 flex-1 mr-2"
                  placeholder="เช่น 123456789"
                  value={jobId}
                  onChangeText={setJobId}
                  keyboardType="numeric"
                />
                <TouchableOpacity className="bg-sky-600 py-2.5 px-4 rounded-lg justify-center" onPress={generateRandomJobId}>
                  <Text className="text-white text-[14px] font-semibold">สุ่ม ID</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Foreign Key: Device selection */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">2. เชื่อมโยงอุปกรณ์ (device_id {"->"} public.device)</Text>
            
            <View className="flex-row gap-2 mb-3">
              <TouchableOpacity className="bg-[#D32F2F] py-1.5 px-3 rounded-lg flex-row items-center" onPress={fetchDevices}>
                <Ionicons name="refresh-outline" size={16} color="#fff" style={{ marginRight: 4 }} />
                <Text className="text-white text-[12px] font-semibold">โหลดรายชื่ออุปกรณ์</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">รายชื่ออุปกรณ์ในระบบ (แตะเพื่อเลือก):</Text>
            {fetchingDevices ? (
              <ActivityIndicator size="small" color="#D32F2F" style={{ marginVertical: 8 }} />
            ) : devicesList.length === 0 ? (
              <Text className="text-[12px] text-slate-400 italic mb-3">ไม่พบข้อมูลอุปกรณ์ในระบบ</Text>
            ) : (
              <View className="mb-3 py-1">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                  {devicesList.map((dev) => (
                    <TouchableOpacity
                      key={dev.device_id}
                      className={`py-2 px-3 rounded-lg border ${deviceId === dev.device_id.toString() ? 'bg-red-50 border-red-300' : 'bg-slate-100 border-slate-200'}`}
                      onPress={() => setDeviceId(dev.device_id.toString())}
                    >
                      <Text className={`text-[13px] font-semibold ${deviceId === dev.device_id.toString() ? 'text-red-800' : 'text-slate-700'}`}>
                        {dev.brand} {dev.model || 'Unknown'}
                      </Text>
                      <Text className={`text-[10px] mt-0.5 ${deviceId === dev.device_id.toString() ? 'text-red-800' : 'text-slate-400'}`}>
                        ID: {dev.device_id} ({dev.device_type})
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">device_id (Bigint) *</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="กรอก device_id หรือเลือกจากรายการด้านบน"
                value={deviceId}
                onChangeText={setDeviceId}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Job Details Section */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">3. รายละเอียดงานซ่อม (Repair Details)</Text>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">รหัสใบเสนอราคา (quotation_id)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="กรอกตัวเลข quotation_id"
                value={quotationId}
                onChangeText={setQuotationId}
                keyboardType="numeric"
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">อาการเสีย (symptom)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 min-h-[60px]"
                placeholder="ระบุอาการเสียของเครื่อง เช่น จอแตก เปิดไม่ติด"
                multiline
                value={symptom}
                onChangeText={setSymptom}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">วันนัดส่งมอบเครื่อง (appointment_date) [YYYY-MM-DD]</Text>
              <View className="flex-row items-center">
                <TextInput
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900 flex-1 mr-2"
                  placeholder="เช่น YYYY-MM-DD"
                  value={appointmentDate}
                  onChangeText={setAppointmentDate}
                />
                <TouchableOpacity className="bg-slate-500 py-2.5 px-4 rounded-lg justify-center" onPress={setDefaultAppointmentDate}>
                  <Text className="text-white text-[14px] font-semibold">+7 วัน</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">สถานะ (status_id)</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {statusOptions.map((st) => (
                <TouchableOpacity
                  key={st.id}
                  className={`py-1.5 px-3 rounded-2xl ${statusId === st.id ? 'bg-[#D32F2F]' : 'bg-slate-100'}`}
                  onPress={() => setStatusId(st.id)}
                >
                  <Text className={`text-[13px] font-medium ${statusId === st.id ? 'text-white' : 'text-slate-500'}`}>
                    {st.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Signature Details Section */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">4. ลายเซ็นดิจิทัล (Signatures - path/data)</Text>
            <Text className="text-[13px] text-slate-500 mb-3 font-medium italic">
              *หมายเหตุ: ในอนาคตจะเปลี่ยนไปอัปโหลดเก็บเป็นรูปภาพลายเซ็นใน Supabase Storage แทนการบันทึกข้อความลงตารางโดยตรง
            </Text>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ลายเซ็นตอนพนักงานรับเครื่อง (staff_receive_signature)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="กรอกชื่อไฟล์รูปภาพลายเซ็น หรือข้อมูลภาพ"
                value={staffReceiveSignature}
                onChangeText={setStaffReceiveSignature}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ลายเซ็นตอนช่างตรวจสภาพ (tech_inspect_signature)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="กรอกชื่อไฟล์รูปภาพลายเซ็น หรือข้อมูลภาพ"
                value={techInspectSignature}
                onChangeText={setTechInspectSignature}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ลายเซ็นช่างตอนซ่อมเสร็จ (tech_repair_signature)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="กรอกชื่อไฟล์รูปภาพลายเซ็น หรือข้อมูลภาพ"
                value={techRepairSignature}
                onChangeText={setTechRepairSignature}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ลายเซ็นลูกค้ารับเครื่องคืน (customer_receive_signature)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="กรอกชื่อไฟล์รูปภาพลายเซ็น หรือข้อมูลภาพ"
                value={customerReceiveSignature}
                onChangeText={setCustomerReceiveSignature}
              />
            </View>
          </View>

          {/* Payment Section */}
          <View className="bg-white rounded-xl p-4 mb-4 elevation-2 shadow-sm shadow-black/10">
            <Text className="text-[15px] font-bold text-slate-800 mb-3.5">5. ข้อมูลการเงิน (Payment Info)</Text>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ยอดเงินรวม (total_amount)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น 1500.00"
                value={totalAmount}
                onChangeText={setTotalAmount}
                keyboardType="numeric"
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">รูปภาพสลิปโอนเงิน (slip_image)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น slip_260717_123.jpg หรือ URL"
                value={slipImage}
                onChangeText={setSlipImage}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">วันที่ชำระเงิน (payment_date) [YYYY-MM-DD]</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น YYYY-MM-DD"
                value={paymentDate}
                onChangeText={setPaymentDate}
              />
            </View>

            <View className="mb-3">
              <Text className="text-[13px] text-slate-500 mb-1.5 font-medium">ช่องทางการชำระเงิน (payment_method_id)</Text>
              <TextInput
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-[14px] text-slate-900"
                placeholder="เช่น 1 (เงินสด), 2 (โอนเงิน)"
                value={paymentMethodId}
                onChangeText={setPaymentMethodId}
                keyboardType="numeric"
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

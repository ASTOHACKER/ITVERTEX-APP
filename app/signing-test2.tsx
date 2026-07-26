import React, { useRef, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, ScrollView, Modal, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignaturePad, SignaturePadRef } from '../components/signature';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';

const { width } = Dimensions.get('window');

export default function SigningTest2Screen() {
  const router = useRouter();
  const signatureRef = useRef<SignaturePadRef>(null);
  const modalSignatureRef = useRef<SignaturePadRef>(null);

  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Called after ref.current.save() generates PNG base64
  const handleSignature = (signature: string) => {
    setSignatureImage(signature);
    setIsSigning(false);
    setSignatureError(null);
    if (isModalOpen) {
      setIsModalOpen(false);
    }
  };

  const handleEmpty = () => {
    setIsSigning(false);
    Alert.alert('ยังไม่มีลายเซ็น', 'กรุณาเซ็นในกรอบก่อนกดบันทึก');
  };

  const handleSignatureError = (error: Error) => {
    setIsSigning(false);
    setSignatureError(error.message || 'ไม่สามารถเปิดพื้นที่สำหรับเซ็นได้');
  };

  const handleClear = () => {
    if (isModalOpen) {
      modalSignatureRef.current?.clear();
    } else {
      signatureRef.current?.clear();
    }
    setSignatureImage(null);
    setUploadedUrl(null);
    setSignatureError(null);
  };

  const handleConfirm = () => {
    if (isModalOpen) {
      modalSignatureRef.current?.save();
    } else {
      signatureRef.current?.save();
    }
  };

  const handleUndo = () => {
    if (isModalOpen) {
      modalSignatureRef.current?.undo();
    } else {
      signatureRef.current?.undo();
    }
  };

  // Base64 to ArrayBuffer for Supabase Storage
  const base64ToArrayBuffer = (dataUri: string) => {
    const base64 = (dataUri.includes(',') ? dataUri.split(',')[1] : dataUri).replace(/\s/g, '');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
    const bytes = new Uint8Array(Math.floor((base64.length * 3) / 4) - padding);
    let buffer = 0;
    let bits = 0;
    let byteIndex = 0;

    for (const character of base64) {
      if (character === '=') break;
      const value = alphabet.indexOf(character);
      if (value === -1) {
        throw new Error('รูปแบบข้อมูลลายเซ็นไม่ถูกต้อง');
      }

      buffer = (buffer << 6) | value;
      bits += 6;

      if (bits >= 8) {
        bits -= 8;
        if (byteIndex < bytes.length) {
          bytes[byteIndex] = (buffer >> bits) & 0xff;
          byteIndex += 1;
        }
      }
    }

    return bytes.buffer;
  };

  const handleUploadSupabase = async () => {
    if (!signatureImage) return;

    try {
      setUploading(true);
      const fileName = `sig_v2_${Date.now()}.png`;
      const arrayBuffer = base64ToArrayBuffer(signatureImage);

      const { error } = await supabase.storage
        .from('signatures')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (error) {
        Alert.alert('เกิดข้อผิดพลาดในการอัปโหลด', error.message);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);

      setUploadedUrl(publicUrlData.publicUrl);
      Alert.alert('สำเร็จ', 'อัปโหลดลายเซ็นขึ้น Supabase Storage สำเร็จแล้ว!');
    } catch (err: any) {
      Alert.alert('ข้อผิดพลาด', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <StatusBar style="dark" />
      
      {/* Navigation Bar */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center rounded-full bg-slate-100"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-base font-bold text-slate-800">ระบบเซ็นชื่อ V2 (Modal & Document)</Text>
          <Text className="text-xs text-red-600 font-medium">E-Signature Canvas Test 2</Text>
        </View>
        <TouchableOpacity 
          onPress={() => setIsModalOpen(true)}
          className="w-10 h-10 items-center justify-center rounded-full bg-red-50"
        >
          <Ionicons name="expand-outline" size={20} color="#D32F2F" />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 50 }}
        scrollEnabled={!isSigning}
      >
        {/* Document Receipt Mockup Preview */}
        <View className="bg-white rounded-2xl p-5 mb-5 shadow-sm border border-slate-200">
          <View className="flex-row justify-between items-center border-b border-slate-100 pb-3 mb-3">
            <View>
              <Text className="text-lg font-bold text-slate-900">ITVertex Repair Service</Text>
              <Text className="text-xs text-slate-500">ใบรับเครื่องซ่อม / ใบรับบริการ #JOB-2026-008</Text>
            </View>
            <View className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              <Text className="text-xs font-bold text-emerald-700">กำลังดำเนินการ</Text>
            </View>
          </View>

          <View className="space-y-1 mb-4 bg-slate-50 p-3 rounded-xl">
            <Text className="text-xs text-slate-600"><Text className="font-bold">ลูกค้า:</Text> คุณสมชาย ใจดี</Text>
            <Text className="text-xs text-slate-600"><Text className="font-bold">อุปกรณ์:</Text> MacBook Pro 16" (M1 Max)</Text>
            <Text className="text-xs text-slate-600"><Text className="font-bold">อาการ:</Text> เปลี่ยนแบตเตอรี่และทำความสะอาดระบบระบายความร้อน</Text>
          </View>

          {/* Inline Signature Pad Box */}
          <Text className="text-sm font-bold text-slate-700 mb-2">
            ลายเซ็นลูกค้ายืนยันส่งเครื่องซ่อม:
          </Text>

          <View className="h-[220px] rounded-xl overflow-hidden bg-slate-50 border border-slate-200 mb-3 relative">
            <SignaturePad
              ref={signatureRef}
              height={220}
              onOK={handleSignature}
              onEmpty={handleEmpty}
              onBegin={() => setIsSigning(true)}
              onEnd={() => setIsSigning(false)}
              onError={handleSignatureError}
            />
          </View>

          {signatureError ? (
            <Text className="mb-3 text-xs text-red-600 font-semibold">{signatureError}</Text>
          ) : null}

          {/* Action Bar */}
          <View className="flex-row gap-2">
            <TouchableOpacity 
              onPress={handleClear}
              className="flex-1 bg-slate-100 py-2.5 rounded-xl items-center flex-row justify-center gap-1 border border-slate-200"
            >
              <Ionicons name="refresh-outline" size={16} color="#475569" />
              <Text className="text-slate-700 font-bold text-xs">ล้าง</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleUndo}
              className="flex-1 bg-slate-100 py-2.5 rounded-xl items-center flex-row justify-center gap-1 border border-slate-200"
            >
              <Ionicons name="arrow-undo-outline" size={16} color="#475569" />
              <Text className="text-slate-700 font-bold text-xs">ย้อนกลับ</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsModalOpen(true)}
              className="flex-1 bg-slate-100 py-2.5 rounded-xl items-center flex-row justify-center gap-1 border border-slate-200"
            >
              <Ionicons name="expand" size={16} color="#475569" />
              <Text className="text-slate-700 font-bold text-xs">จอใหญ่</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleConfirm}
              className="flex-2 bg-red-700 py-2.5 rounded-xl items-center flex-row justify-center gap-1 shadow-sm px-3"
            >
              <Ionicons name="checkmark-sharp" size={16} color="#ffffff" />
              <Text className="text-white font-bold text-xs">ยืนยันลายเซ็น</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Result & Supabase Attachment Card */}
        {Boolean(signatureImage) ? (
          <View className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100">
            <View className="flex-row items-center gap-2 mb-3">
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text className="text-base font-bold text-emerald-800">ผลลัพธ์ลายเซ็นพร้อมใช้งาน (PNG)</Text>
            </View>

            <View className="border border-slate-200 rounded-xl p-3 bg-slate-50 items-center justify-center mb-4">
              <Image 
                source={{ uri: signatureImage! }} 
                style={{ width: '100%', height: 140 }} 
                contentFit="contain" 
              />
            </View>

            <TouchableOpacity
              onPress={handleUploadSupabase}
              disabled={uploading}
              className={`py-3.5 rounded-xl items-center flex-row justify-center gap-2 shadow-sm ${
                uploading ? 'bg-slate-300' : 'bg-emerald-600'
              }`}
            >
              <Ionicons name="cloud-upload" size={18} color="#ffffff" />
              <Text className="text-white font-bold text-sm">
                {uploading ? 'กำลังบันทึกลายเซ็นขึ้น Cloud...' : 'บันทึกลายเซ็นขึ้น Supabase Storage'}
              </Text>
            </TouchableOpacity>

            {Boolean(uploadedUrl) ? (
              <View className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <Text className="text-xs font-bold text-emerald-800 mb-1">Public Image URL:</Text>
                <Text className="text-xs text-emerald-700 font-mono" numberOfLines={2}>
                  {uploadedUrl}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      {/* Full-Screen Modal Signature Surface */}
      <Modal visible={isModalOpen} animationType="slide" transparent={false}>
        <SafeAreaView className="flex-1 bg-white">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-slate-200 bg-slate-50">
            <Text className="text-base font-bold text-slate-800">โหมดเซ็นชื่อเต็มหน้าจอ (Full Canvas)</Text>
            <TouchableOpacity 
              onPress={() => setIsModalOpen(false)}
              className="p-1.5 rounded-full bg-slate-200"
            >
              <Ionicons name="close" size={22} color="#334155" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 p-3">
            <View className="flex-1 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 bg-white">
              <SignaturePad
                ref={modalSignatureRef}
                onOK={handleSignature}
                onEmpty={handleEmpty}
                onError={handleSignatureError}
              />
            </View>
          </View>

          <View className="p-4 bg-white border-t border-slate-200 flex-row gap-3">
            <TouchableOpacity 
              onPress={handleClear}
              className="flex-1 bg-slate-100 py-3 rounded-xl items-center flex-row justify-center gap-1.5"
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text className="text-red-600 font-bold">ล้างแปรง</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleConfirm}
              className="flex-2 bg-red-700 py-3 rounded-xl items-center flex-row justify-center gap-1.5 px-4 shadow-sm"
            >
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text className="text-white font-bold text-base">บันทึกและปิดหน้าต่าง</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

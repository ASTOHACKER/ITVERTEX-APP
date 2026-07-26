import React, { useRef, useState } from 'react';
import { Alert, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SignaturePad, SignaturePadRef } from '../components/signature';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';

function SigningTestScreen() {
  const router = useRouter();
  const signatureRef = useRef<SignaturePadRef>(null);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  // Called after ref.current.readSignature() reads a non-empty base64 string
  const handleSignature = (signature: string) => {
    setSignatureImage(signature);
    setIsSigning(false);
    setSignatureError(null);
  };

  const handleEmpty = () => {
    setIsSigning(false);
    Alert.alert('ยังไม่มีลายเซ็น', 'กรุณาเซ็นในกรอบก่อนกดบันทึก');
  };

  const handleSignatureError = (error: Error) => {
    setIsSigning(false);
    setSignatureError(error.message || 'ไม่สามารถเปิดพื้นที่สำหรับเซ็นได้');
  };

  // Called after ref.current.clearSignature()
  const handleClear = () => {
    signatureRef.current?.clear();
    setSignatureImage(null);
    setUploadedUrl(null);
    setSignatureError(null);
  };

  const handleConfirm = () => {
    signatureRef.current?.save();
  };

  const handleUndo = () => {
    signatureRef.current?.undo();
  };

  // Convert a PNG data URI to an ArrayBuffer without relying on atob (not available on every Hermes runtime).
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
      const fileName = `sig_${Date.now()}.png`;
      const arrayBuffer = base64ToArrayBuffer(signatureImage);

      const { error } = await supabase.storage
        .from('signatures')
        .upload(fileName, arrayBuffer, {
          contentType: 'image/png',
          upsert: true,
        });

      if (error) {
        alert('เกิดข้อผิดพลาดในการอัปโหลด: ' + error.message);
        console.error(error);
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from('signatures')
        .getPublicUrl(fileName);

      setUploadedUrl(publicUrlData.publicUrl);
      alert('อัปโหลดสำเร็จแล้ว!');
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <StatusBar style="dark" />
      
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 bg-white border-b border-slate-200">
        <TouchableOpacity 
          onPress={() => router.back()} 
          className="w-10 h-10 items-center justify-center rounded-full bg-slate-100"
        >
          <Ionicons name="arrow-back" size={20} color="#334155" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">ทดสอบระบบเซ็นชื่อ (E-Signature)</Text>
        <View className="w-10" />
      </View>

      <ScrollView
        className="flex-1 p-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        scrollEnabled={!isSigning}
      >
        
        <View className="bg-white rounded-2xl p-4 shadow-sm elevation-2 mb-6 border border-slate-100">
          <Text className="text-base font-bold text-slate-700 mb-4">
            กรุณาเซ็นชื่อในกรอบด้านล่าง
          </Text>
          
          {/* Signature Canvas Area */}
          <View className="h-[220px] rounded-xl overflow-hidden bg-white mb-4 relative">
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
            <Text className="mb-4 text-sm text-red-600">{signatureError}</Text>
          ) : null}

          {/* Action Buttons */}
          <View className="flex-row justify-between items-center mt-2 gap-3">
            <TouchableOpacity 
              onPress={handleClear}
              className="flex-1 bg-red-50 border border-red-200 py-3 rounded-xl items-center flex-row justify-center gap-2"
            >
              <Ionicons name="trash-outline" size={18} color="#dc2626" />
              <Text className="text-red-600 font-bold">ล้างทั้งหมด</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleUndo}
              className="flex-1 bg-slate-100 border border-slate-200 py-3 rounded-xl items-center flex-row justify-center gap-2"
            >
              <Ionicons name="arrow-undo-outline" size={18} color="#475569" />
              <Text className="text-slate-600 font-bold">ย้อนกลับ</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleConfirm}
              className="flex-1 bg-sky-600 py-3 rounded-xl items-center flex-row justify-center gap-2 shadow-sm"
            >
              <Ionicons name="checkmark-circle-outline" size={18} color="#ffffff" />
              <Text className="text-white font-bold">บันทึก</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Result Preview */}
        {Boolean(signatureImage) ? (
          <View className="bg-white rounded-2xl p-4 shadow-sm elevation-2 border border-slate-100 items-center">
            <View className="flex-row items-center justify-center mb-4 gap-1.5">
              <Ionicons name="checkmark-circle" size={18} color="#059669" />
              <Text className="text-base font-bold text-emerald-600">ตัวอย่างผลลัพธ์ (Base64 Image)</Text>
            </View>
            
            <View className="border border-slate-200 rounded-lg p-2 bg-slate-50 w-full items-center">
              <Image 
                source={{ uri: signatureImage! }} 
                style={{ width: '100%', height: 150 }} 
                resizeMode="contain" 
              />
            </View>

            <Text className="text-xs text-slate-400 mt-4 text-center px-4">
              *ข้อมูลลายเซ็นนี้สามารถนำไปแปลงเป็นไฟล์รูปภาพอัพโหลดขึ้น Supabase Storage หรือแนบไปกับ PDF ได้ทันที
            </Text>

            {/* Supabase Upload Test Button */}
            <TouchableOpacity
              onPress={handleUploadSupabase}
              disabled={uploading}
              className={`mt-4 w-full py-3.5 rounded-xl items-center flex-row justify-center gap-2 ${
                uploading ? 'bg-slate-300' : 'bg-emerald-600'
              }`}
            >
              <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" />
              <Text className="text-white font-bold text-base">
                {uploading ? 'กำลังอัปโหลด...' : 'ทดสอบอัปโหลดขึ้น Supabase Storage'}
              </Text>
            </TouchableOpacity>

            {Boolean(uploadedUrl) ? (
              <View className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl w-full">
                <Text className="text-xs font-bold text-emerald-800 mb-1">
                  Public URL บน Supabase Storage:
                </Text>
                <Text className="text-xs text-emerald-600 select-all" numberOfLines={2}>
                  {uploadedUrl}
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

export default SigningTestScreen;


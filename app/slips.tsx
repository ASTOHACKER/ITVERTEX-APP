import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, Image,
  ActivityIndicator, Alert, ScrollView,
  FlatList, Modal, Dimensions, Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

// ==============================
// Type สำหรับ record ใน database
// ==============================
type SlipRecord = {
  id: string;
  user_id: string;
  image_url: string;
  uploaded_at: string;
  user_email?: string; // เอาไว้แสดงชื่อเจ้าของ (optional)
};

// ==============================
// SQL ที่ต้องสร้างใน Supabase SQL Editor ก่อนใช้งาน:
//
// CREATE TABLE slips_records (
//   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
//   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
//   image_url TEXT NOT NULL,
//   uploaded_at TIMESTAMPTZ DEFAULT NOW()
// );
//
// -- Enable RLS
// ALTER TABLE slips_records ENABLE ROW LEVEL SECURITY;
//
// CREATE POLICY "Users can view their own slips"
//   ON slips_records FOR SELECT
//   USING (auth.uid() = user_id);
//
// -- Policy: ผู้ใช้ insert record ของตัวเองได้
// CREATE POLICY "Users can insert their own slips"
//   ON slips_records FOR INSERT
//   WITH CHECK (auth.uid() = user_id);
// ==============================

export default function SlipsPage() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mySlips, setMySlips] = useState<SlipRecord[]>([]);
  const [currentUser, setCurrentUser] = useState<{ id: string; email: string } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Popup states
  const [popupVisible, setPopupVisible] = useState(false);
  const [popupTitle, setPopupTitle] = useState('');
  const [popupMessage, setPopupMessage] = useState('');
  const [popupType, setPopupType] = useState<'info' | 'success' | 'error' | 'confirm'>('info');
  const [popupConfirmCallback, setPopupConfirmCallback] = useState<(() => void) | null>(null);

  const showPopup = (
    title: string,
    message: string,
    type: 'info' | 'success' | 'error' | 'confirm' = 'info',
    onConfirm: (() => void) | null = null
  ) => {
    setPopupTitle(title);
    setPopupMessage(message);
    setPopupType(type);
    setPopupConfirmCallback(() => onConfirm);
    setPopupVisible(true);
  };

  const showAlert = (title: string, message: string, type: 'info' | 'success' | 'error' = 'info') => {
    showPopup(title, message, type);
  };

  // โหลด user และดึงประวัติรูปเมื่อเปิดหน้า
  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (user) {
      setCurrentUser({ id: user.id, email: user.email ?? 'unknown' });
      fetchMySlips(user.id);
    } else {
      showAlert('ไม่ได้เข้าสู่ระบบ', 'กรุณา Login ก่อนใช้งาน', 'error');
    }
  };

  // ==============================
  // ดึง slips ของ user ปัจจุบันจาก Database
  // RLS Policy จะ filter ให้อัตโนมัติว่าเห็นแค่ของตัวเอง
  // ==============================
  const fetchMySlips = async (userId?: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('slips_records')
        .select('*')
        .order('uploaded_at', { ascending: false }); // เรียงจากล่าสุดก่อน

      if (error) throw error;
      setMySlips(data ?? []);
    } catch (error: any) {
      console.error('Fetch error:', error);
      showAlert('เกิดข้อผิดพลาด', error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // เลือกรูปจากคลัง
  // ==============================
  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showAlert('สิทธิ์การเข้าถึง', 'ต้องการสิทธิ์เข้าถึงคลังภาพ', 'info'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // ==============================
  // ถ่ายรูปจากกล้อง
  // ==============================
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { showAlert('สิทธิ์การเข้าถึง', 'ต้องการสิทธิ์เข้าถึงกล้อง', 'info'); return; }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  // ==============================
  // อัปโหลดรูป + บันทึก record ลง Database
  // ==============================
  const uploadImage = async () => {
    if (!imageUri) { showAlert('กรุณาเลือกรูปภาพ', 'กรุณาเลือกรูปภาพก่อน', 'info'); return; }
    if (!currentUser) { showAlert('ไม่ได้เข้าสู่ระบบ', 'กรุณา Login ก่อน', 'error'); return; }

    try {
      setUploading(true);

      const fetchRes = await fetch(imageUri);
      if (!fetchRes.ok) throw new Error(`อ่านไฟล์ไม่สำเร็จ: ${fetchRes.status}`);
      const arrayBuffer = await fetchRes.arrayBuffer();

      const rawExt = imageUri.split('?')[0].split('.').pop()?.toLowerCase() ?? 'jpg';
      const ext = ['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(rawExt) ? rawExt : 'jpeg';
      const mimeType = ext === 'png' ? 'image/png'
        : ext === 'webp' ? 'image/webp'
          : 'image/jpeg';

      const fileName = `slip_${Date.now()}.${ext === 'jpeg' ? 'jpg' : ext}`;
      const filePath = `${currentUser.id}/${fileName}`;

      const { error: storageError } = await supabase.storage
        .from('slips')
        .upload(filePath, arrayBuffer, {
          contentType: mimeType,
          upsert: false,
        });

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from('slips')
        .getPublicUrl(filePath);
      const publicUrl = urlData.publicUrl;

      const { error: dbError } = await supabase.from('slips_records').insert({
        user_id: currentUser.id,
        image_url: publicUrl,
      });
      if (dbError) throw dbError;

      showAlert('✅ สำเร็จ!', 'อัปโหลดสลิปเรียบร้อยแล้ว', 'success');
      setImageUri(null);
      fetchMySlips();
    } catch (error: any) {
      console.error('[Upload Error]', JSON.stringify(error));
      showAlert('❌ อัปโหลดไม่สำเร็จ', error?.message ?? 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ', 'error');
    } finally {
      setUploading(false);
    }
  };


  // ==============================
  // ลบรูป
  // ==============================
  const deleteSlip = async (slip: SlipRecord) => {
    showPopup(
      'ยืนยันการลบ',
      'ต้องการลบสลิปนี้ใช่หรือไม่?',
      'confirm',
      async () => {
        try {

          const { data: dbData, error: dbError } = await supabase
            .from('slips_records')
            .delete()
            .eq('id', slip.id)
            .select();

          if (dbError) {
            console.error('Database delete error:', dbError);
            showAlert('ลบไม่สำเร็จ', dbError.message, 'error');
            return;
          }

          if (!dbData || dbData.length === 0) {
            // 0 rows affected - RLS or missing data
            showAlert('ลบไม่สำเร็จ', 'ไม่สามารถลบแถวข้อมูลในฐานข้อมูลได้ (อาจไม่มีข้อมูลนี้หรือติดสิทธิ์ RLS/สิทธิ์ลบของ User คนอื่น)', 'error');
            return;
          }



          const urlParts = slip.image_url.split('/slips/');
          if (urlParts[1]) {
            const filePath = decodeURIComponent(urlParts[1]);

            const { data: storageData, error: storageError } = await supabase
              .storage
              .from('slips')
              .remove([filePath]);
            
            if (storageError) {
              console.error('Storage delete error:', storageError);
              showAlert('ลบไฟล์ใน Storage ไม่สำเร็จ', storageError.message, 'error');
            } else {

            }
          }

          setMySlips(prev => prev.filter(s => s.id !== slip.id));
          showAlert('สำเร็จ', 'ลบสลิปเรียบร้อยแล้ว', 'success');
        } catch (error: any) {
          console.error('General delete error:', error);
          showAlert('ลบไม่สำเร็จ', error.message || 'เกิดข้อผิดพลาดในการลบ', 'error');
        }
      }
    );
  };

  // ==============================
  // Render แต่ละ card ในประวัติ
  // ==============================
  const renderSlipCard = ({ item }: { item: SlipRecord }) => (
    <View className="bg-white rounded-[14px] mb-[14px] overflow-hidden elevation-2 shadow-sm shadow-black/10">
      <TouchableOpacity onPress={() => setPreviewUrl(item.image_url)}>
        <Image source={{ uri: item.image_url }} className="w-full h-[180px]" resizeMode="cover" />
      </TouchableOpacity>
      <View className="p-3">
        <Text className="text-[13px] font-semibold text-[#333] mb-[3px]">👤 เจ้าของ: {currentUser?.email}</Text>
        <Text className="text-[12px] text-[#666] mb-[3px]">
          📅 {new Date(item.uploaded_at).toLocaleString('th-TH')}
        </Text>
        <Text className="text-[11px] text-[#999]" numberOfLines={1}>
          🔑 ID: {item.user_id.slice(0, 8)}...
        </Text>
      </View>
      <TouchableOpacity className="bg-[#ff3b30] py-2.5 items-center" onPress={() => deleteSlip(item)}>
        <Text className="text-white font-bold text-[14px]">ลบ</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#f0f2f5]">
      <Stack.Screen options={{ title: 'อัปโหลดสลิป' }} />

      {/* Custom Header with Back Button */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#e0e0e0] bg-white">
        <TouchableOpacity className="p-1 rounded-lg" onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text className="text-[18px] font-bold text-[#333]">อัปโหลดสลิป</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, alignItems: 'center' }}>

        {/* แสดงข้อมูล User ปัจจุบัน */}
        {currentUser && (
          <View className="w-full bg-[#1a73e8] rounded-xl p-3 mb-5 items-center">
            <Text className="text-white font-bold text-[14px]">{currentUser.email}</Text>
            <Text className="text-[#c3d8fc] text-[12px] mt-0.5">ID: {currentUser.id.slice(0, 8)}...</Text>
          </View>
        )}

        {/* Preview รูปที่เลือก */}
        {imageUri ? (
          <TouchableOpacity onPress={() => setImageUri(null)}>
            <Image source={{ uri: imageUri }} style={{ width: width - 32, height: width - 32 }} className="rounded-2xl mb-1" resizeMode="cover" />
            <Text className="text-center text-[#888] text-[12px] mb-4">กดที่รูปเพื่อยกเลิก</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: width - 32, height: 220 }} className="bg-[#e0e0e0] rounded-2xl items-center justify-center mb-5 border-2 border-dashed border-[#bbb]">
            <Text className="text-[#888] text-[16px] mt-2">ยังไม่ได้เลือกรูปภาพ</Text>
          </View>
        )}

        {/* ปุ่มเลือก/ถ่ายรูป */}
        <View className="flex-row justify-between w-full mb-3">
          <TouchableOpacity className="flex-1 mx-1 py-[13px] rounded-[10px] items-center bg-[#007AFF]" onPress={takePhoto}>
            <Text className="text-white font-semibold text-[14px]">📷 ถ่ายรูป</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 mx-1 py-[13px] rounded-[10px] items-center bg-[#5856D6]" onPress={pickImage}>
            <Text className="text-white font-semibold text-[14px]">🖼 จากคลัง</Text>
          </TouchableOpacity>
        </View>

        {/* ปุ่มอัปโหลด */}
        <TouchableOpacity
          className={`w-full py-[15px] rounded-xl items-center mb-5 ${(!imageUri || uploading) ? 'bg-[#a5d6a7]' : 'bg-[#28A745]'}`}
          onPress={uploadImage}
          disabled={!imageUri || uploading}
        >
          {uploading
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-bold text-[16px]">☁️ อัปโหลดสลิป</Text>
          }
        </TouchableOpacity>

        {/* แถบแบ่ง */}
        <View className="flex-row items-center w-full my-4">
          <View className="flex-1 h-[1px] bg-[#ccc]" />
          <Text className="mx-2.5 text-[#666] font-semibold">ประวัติสลิปของฉัน</Text>
          <View className="flex-1 h-[1px] bg-[#ccc]" />
        </View>

        {/* ปุ่มรีโหลด */}
        <TouchableOpacity className="w-full mb-[15px] flex-1 mx-1 py-[13px] rounded-[10px] items-center bg-[#FF9500]" onPress={() => fetchMySlips()}>
          <Text className="text-white font-semibold text-[14px]">โหลดประวัติใหม่</Text>
        </TouchableOpacity>

        {/* รายการสลิป */}
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
        ) : mySlips.length === 0 ? (
          <Text className="text-[#999] text-[14px] mt-5">ยังไม่มีสลิปที่อัปโหลด</Text>
        ) : (
          <FlatList
            data={mySlips}
            keyExtractor={item => item.id}
            renderItem={renderSlipCard}
            scrollEnabled={false}
            style={{ width: '100%' }}
          />
        )}

      </ScrollView>

      {/* Modal แสดงรูปเต็มจอ */}
      <Modal visible={!!previewUrl} transparent animationType="fade">
        <TouchableOpacity className="flex-1 bg-black/90 justify-center items-center" onPress={() => setPreviewUrl(null)}>
          <Image source={{ uri: previewUrl! }} className="w-[95%] h-[80%]" resizeMode="contain" />
          <Text className="text-white mt-4 text-[16px]">✕ ปิด</Text>
        </TouchableOpacity>
      </Modal>

      {/* Custom Alert/Confirm Popup Modal */}
      <Modal visible={popupVisible} transparent animationType="fade">
        <View className="flex-1 bg-slate-900/60 justify-center items-center">
          <View className="bg-white w-[85%] max-w-[340px] rounded-[24px] p-6 items-center shadow-lg shadow-black/15 elevation-10">
            {/* Header Icon based on Type */}
            <View className={`w-16 h-16 rounded-full justify-center items-center mb-4 ${
              popupType === 'success' ? 'bg-green-100' :
              popupType === 'error' ? 'bg-red-100' :
              popupType === 'confirm' ? 'bg-amber-100' :
              'bg-sky-100'
            }`}>
              <Ionicons
                name={
                  popupType === 'success' ? 'checkmark-circle-outline' :
                  popupType === 'error' ? 'close-circle-outline' :
                  popupType === 'confirm' ? 'help-circle-outline' :
                  'information-circle-outline'
                }
                size={40}
                color={
                  popupType === 'success' ? '#15803d' :
                  popupType === 'error' ? '#b91c1c' :
                  popupType === 'confirm' ? '#b45309' :
                  '#0369a1'
                }
              />
            </View>

            {/* Title & Message */}
            <Text className="text-[18px] font-extrabold text-slate-900 mb-2 text-center">{popupTitle}</Text>
            <Text className="text-[14px] text-slate-600 text-center leading-5 mb-6">{popupMessage}</Text>

            {/* Buttons Row */}
            <View className="flex-row w-full gap-3">
              {popupType === 'confirm' ? (
                <>
                  <TouchableOpacity
                    className="flex-1 h-11 rounded-xl justify-center items-center bg-slate-100"
                    onPress={() => setPopupVisible(false)}
                  >
                    <Text className="text-slate-500 font-bold text-[14px]">ยกเลิก</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="flex-1 h-11 rounded-xl justify-center items-center bg-[#ff3b30]"
                    onPress={() => {
                      setPopupVisible(false);
                      if (popupConfirmCallback) popupConfirmCallback();
                    }}
                  >
                    <Text className="text-white font-bold text-[14px]">ยืนยัน</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <TouchableOpacity
                  className="flex-1 h-11 rounded-xl justify-center items-center bg-[#1a73e8]"
                  onPress={() => setPopupVisible(false)}
                >
                  <Text className="text-white font-bold text-[14px]">ตกลง</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

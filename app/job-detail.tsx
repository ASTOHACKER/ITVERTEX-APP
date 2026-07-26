import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
  Text,
  View,
  StatusBar,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Modal,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface TechNote {
  text: string;
  author: string;
  timestamp: string;
}

interface RepairJob {
  id: string;
  job_number: string;
  customer_name: string;
  phone: string;
  device_type: string;
  brand: string;
  model: string;
  serial_number: string;
  symptoms: string;
  accessories: string;
  warranty_years: number;
  warranty_end_date: string;
  important_programs: string;
  password: string;
  technician_name: string;
  status: string;
  items: any[];
  technician_notes: TechNote[];
  created_at: string;
}

export default function JobDetailScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<RepairJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  // Add item modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');

  // Technician notes state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (jobId) fetchJob();
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
      setJob(data);
    } catch (err: any) {
      console.error('Error fetching job:', err.message);
      showAlert('ข้อผิดพลาด', 'ไม่พบข้อมูลงานซ่อมที่ต้องการ');
    } finally {
      setLoading(false);
    }
  }

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'});
    } catch {
      return dateStr;
    }
  };

  const handleDelete = async () => {
    const performDelete = async () => {
      setDeleting(true);
      try {
        const { error } = await supabase
          .from('repair_jobs')
          .delete()
          .eq('id', jobId);
           
        if (error) throw error;
        showAlert('สำเร็จ', 'ลบงานซ่อมเรียบร้อยแล้ว');
        router.back();
      } catch (err: any) {
        console.error(err);
        showAlert('ล้มเหลว', err.message || 'ไม่สามารถลบงานซ่อมได้');
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm('คุณต้องการลบงานซ่อมนี้ใช่หรือไม่?\nข้อมูลจะถูกลบถาวรและไม่สามารถกู้คืนได้');
      if (confirmed) performDelete();
    } else {
      Alert.alert(
        'ยืนยันการลบ',
        'คุณต้องการลบงานซ่อมนี้ใช่หรือไม่?\nข้อมูลจะถูกลบถาวรและไม่สามารถกู้คืนได้',
        [
          { text: 'ยกเลิก', style: 'cancel' },
          { text: 'ลบ', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ชำระแล้ว': return '#16a34a';
      case 'รอชำระ': return '#d97706';
      case 'กำลังซ่อม': return '#0284c7';
      case 'ส่งมอบแล้ว': return '#7c3aed';
      case 'ยกเลิก': return '#dc2626';
      default: return '#64748b';
    }
  };

  // Calculate total price from items
  const getTotalPrice = () => {
    if (!job?.items || !Array.isArray(job.items)) return 0;
    return job.items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
  };

  // Add item to items array
  const handleAddItem = async () => {
    if (!itemName.trim()) { showAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อรายการ'); return; }
    if (!itemPrice.trim() || isNaN(Number(itemPrice))) { showAlert('ข้อผิดพลาด', 'กรุณากรอกราคาที่ถูกต้อง'); return; }
    if (!job) return;
    try {
      const newItems = [...(job.items || []), { name: itemName.trim(), price: Number(itemPrice) }];
      const { error } = await supabase.from('repair_jobs').update({ items: newItems }).eq('id', job.id);
      if (error) throw error;
      setJob({ ...job, items: newItems });
      setItemName(''); setItemPrice(''); setShowItemModal(false);
    } catch (err: any) {
      showAlert('ล้มเหลว', err.message || 'ไม่สามารถเพิ่มรายการได้');
    }
  };

  // Add technician note
  const handleAddNote = async () => {
    if (!noteText.trim()) { showAlert('ข้อผิดพลาด', 'กรุณากรอกหมายเหตุ'); return; }
    if (!job) return;
    setSavingNote(true);
    try {
      // Get current user name
      const { data: { session } } = await supabase.auth.getSession();
      let authorName = 'ช่าง';
      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          authorName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'ช่าง';
        }
      }

      const newNote: TechNote = {
        text: noteText.trim(),
        author: authorName,
        timestamp: new Date().toISOString()};
      const existingNotes = job.technician_notes && Array.isArray(job.technician_notes) ? job.technician_notes : [];
      const updatedNotes = [...existingNotes, newNote];

      const { error } = await supabase
        .from('repair_jobs')
        .update({ technician_notes: updatedNotes })
        .eq('id', job.id);

      if (error) throw error;
      setJob({ ...job, technician_notes: updatedNotes });
      setNoteText('');
      setShowNoteModal(false);
    } catch (err: any) {
      showAlert('ล้มเหลว', err.message || 'ไม่สามารถเพิ่มหมายเหตุได้');
    } finally {
      setSavingNote(false);
    }
  };

  // Remove item from items array
  const handleRemoveItem = async (index: number) => {
    if (!job) return;
    const perform = async () => {
      try {
        const newItems = job.items.filter((_: any, i: number) => i !== index);
        const { error } = await supabase.from('repair_jobs').update({ items: newItems }).eq('id', job.id);
        if (error) throw error;
        setJob({ ...job, items: newItems });
      } catch (err: any) {
        showAlert('ล้มเหลว', err.message || 'ไม่สามารถลบรายการได้');
      }
    };
    if (Platform.OS === 'web') { if (window.confirm('ลบรายการนี้?')) perform(); }
    else { Alert.alert('ยืนยัน', 'ลบรายการนี้?', [{ text: 'ยกเลิก', style: 'cancel' }, { text: 'ลบ', style: 'destructive', onPress: perform }]); }
  };

  // Confirm payment
  const handleConfirmPayment = async () => {
    if (!job) return;
    const perform = async () => {
      try {
        const { error } = await supabase.from('repair_jobs').update({ status: 'ชำระแล้ว' }).eq('id', job.id);
        if (error) throw error;
        setJob({ ...job, status: 'ชำระแล้ว' });
        showAlert('สำเร็จ', 'ยืนยันการชำระเงินเรียบร้อยแล้ว');
      } catch (err: any) {
        showAlert('ล้มเหลว', err.message);
      }
    };
    if (Platform.OS === 'web') { if (window.confirm('ยืนยันการชำระเงิน?')) perform(); }
    else { Alert.alert('ยืนยัน', 'ยืนยันการชำระเงิน?', [{ text: 'ยกเลิก', style: 'cancel' }, { text: 'ยืนยัน', onPress: perform }]); }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#D32F2F]">
        <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />
        <View className="flex-1 justify-center items-center bg-slate-50">
          <ActivityIndicator size="large" color="#D32F2F" />
          <Text className="mt-4 text-slate-500 text-base font-medium">กำลังโหลดข้อมูลงานซ่อม...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView className="flex-1 bg-[#D32F2F]">
        <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />
        <View className="flex-1 justify-center items-center bg-slate-50">
          <Ionicons name="alert-circle-outline" size={60} color="#cbd5e1" />
          <Text className="mt-4 text-slate-500 text-base font-medium">ไม่พบข้อมูลงานซ่อม</Text>
          <TouchableOpacity className="mt-4 px-6 py-2.5 rounded-xl border border-[#D32F2F]" onPress={() => router.back()}>
            <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>กลับ</Text>
          </TouchableOpacity>
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
          <Ionicons name="chevron-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">รายละเอียดงานซ่อม</Text>
        <TouchableOpacity onPress={handleDelete} disabled={deleting}>
          {deleting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons name="trash-outline" size={22} color="#ffffff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-slate-50" contentContainerClassName="p-4 pb-10" bounces={false}>

        {/* Status Badge */}
        <View className="flex-row items-center self-start px-4 py-2 rounded-full mb-4" style={{ backgroundColor: getStatusColor(job.status) }}>
          <Ionicons name="ellipse" size={8} color="#fff" style={{ marginRight: 6 }} />
          <Text className="text-white text-sm font-bold">{job.status}</Text>
        </View>

        {/* Job Info Card */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100">
          <Text className="text-base font-bold text-slate-800 mb-4">ข้อมูลงานซ่อม</Text>

          <View className="flex-row mb-3.5">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">รหัสงานซ่อม</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.job_number || '-'}</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">วันที่รับเครื่อง</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{formatDate(job.created_at)}</Text>
            </View>
          </View>

          <View className="flex-row mb-3.5">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">ช่างดูแล</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.technician_name || 'ยังไม่ระบุ'}</Text>
            </View>
          </View>
        </View>

        {/* Customer Info Card */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100 border-l-4 border-l-sky-600">
          <Text className="text-base font-bold text-sky-600 mb-4">ข้อมูลลูกค้า</Text>

          <View className="flex-row mb-3.5">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">ชื่อลูกค้า</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.customer_name || '-'}</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">เบอร์โทรศัพท์</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.phone || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Device Info Card */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100 border-l-4 border-l-orange-600">
          <Text className="text-base font-bold text-orange-600 mb-4">ข้อมูลอุปกรณ์</Text>

          <View className="flex-row mb-3.5">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">ประเภทเครื่อง</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.device_type || '-'}</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">ยี่ห้อ</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.brand || '-'}</Text>
            </View>
          </View>

          <View className="flex-row mb-3.5">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">รุ่น</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.model || '-'}</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">หมายเลขเครื่อง</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.serial_number || '-'}</Text>
            </View>
          </View>

          <View className="flex-row mb-3.5">
            <View style={{ flex: 1 }}>
              <Text className="text-xs text-slate-400 mb-1 font-medium">อาการเสีย</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.symptoms || '-'}</Text>
            </View>
          </View>

          <View className="flex-row mb-3.5">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">อุปกรณ์ที่ติดมา</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.accessories || 'ไม่มี'}</Text>
            </View>
          </View>

          <View className="flex-row mb-3.5">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">ระยะประกัน</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.warranty_years ? `${job.warranty_years} ปี` : '-'}</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">วันสิ้นสุดประกัน</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.warranty_end_date || '-'}</Text>
            </View>
          </View>

          <View className="flex-row mb-3.5">
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">โปรแกรมสำคัญ</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.important_programs || 'ไม่มี'}</Text>
            </View>
            <View className="flex-1 mr-2">
              <Text className="text-xs text-slate-400 mb-1 font-medium">รหัสเข้าเครื่อง</Text>
              <Text className="text-[15px] text-slate-800 font-medium">{job.password || 'ไม่มี'}</Text>
            </View>
          </View>
        </View>

        {/* Items / Cost Summary */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100 border-l-4 border-l-green-600">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text className="text-base font-bold text-green-600">รายการค่าบริการ / อะไหล่</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#16a34a', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}
              onPress={() => setShowItemModal(true)}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>+ เพิ่ม</Text>
            </TouchableOpacity>
          </View>
          {job.items && Array.isArray(job.items) && job.items.length > 0 ? (
            job.items.map((item: any, index: number) => (
              <View key={index} className="flex-row justify-between items-center py-2.5 border-b border-slate-100">
                <Text className="text-sm text-slate-700 flex-1">{item.name || item.description || `รายการ ${index + 1}`}</Text>
                <Text className="text-sm text-slate-800 font-semibold">{Number(item.price || 0).toLocaleString()} ฿</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(index)} style={{ marginLeft: 8, padding: 4 }}>
                  <Ionicons name="close-circle" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>ยังไม่มีรายการ กด &quot;+ เพิ่ม&quot; เพื่อเพิ่มรายการ</Text>
          )}
          {getTotalPrice() > 0 && (
            <View className="flex-row justify-between items-center pt-3.5 mt-1">
              <Text className="text-base font-bold text-slate-800">รวมทั้งหมด</Text>
              <Text className="text-lg font-bold text-green-600">{getTotalPrice().toLocaleString()} ฿</Text>
            </View>
          )}
        </View>

        {/* Technician Notes Timeline */}
        <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100 border-l-4 border-l-violet-600">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text className="text-base font-bold text-violet-600">บันทึกช่าง</Text>
            <TouchableOpacity
              style={{ backgroundColor: '#7c3aed', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}
              onPress={() => setShowNoteModal(true)}
            >
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>+ เพิ่มบันทึก</Text>
            </TouchableOpacity>
          </View>

          {job.technician_notes && Array.isArray(job.technician_notes) && job.technician_notes.length > 0 ? (
            job.technician_notes.slice().reverse().map((note: TechNote, index: number) => (
              <View key={index} className="flex-row mb-1">
                <View className="items-center w-5 mr-3">
                  <View className="w-2.5 h-2.5 rounded-full bg-violet-600 mt-1" />
                  {index < (job.technician_notes?.length || 0) - 1 && <View className="w-[2px] flex-1 bg-slate-200 mt-1" />}
                </View>
                <View className="flex-1 bg-violet-50 rounded-xl p-3 mb-2 border border-violet-100">
                  <Text className="text-sm text-slate-700 leading-5">{note.text}</Text>
                  <View className="flex-row items-center mt-2 gap-1">
                    <Ionicons name="person-outline" size={12} color="#94a3b8" />
                    <Text className="text-[11px] text-slate-400 font-semibold mr-2">{note.author}</Text>
                    <Text className="text-[11px] text-slate-300">
                      {new Date(note.timestamp).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}{' '}
                      {new Date(note.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 16 }}>ยังไม่มีบันทึก กด &quot;+ เพิ่มบันทึก&quot; เพื่อเพิ่ม</Text>
          )}
        </View>

        {/* Action Buttons */}
        {job.status !== 'ชำระแล้ว' && job.status !== 'ส่งมอบแล้ว' && (
          <TouchableOpacity
            className="bg-green-600 border border-green-600 rounded-2xl p-5 mb-4 shadow-sm elevation-2 flex-row items-center justify-center"
            onPress={handleConfirmPayment}
          >
            <Ionicons name="checkmark-circle-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>ยืนยันการชำระเงิน</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          className="bg-[#D32F2F] border border-[#D32F2F] rounded-2xl p-5 mb-4 shadow-sm elevation-2 flex-row items-center justify-center"
          onPress={() => router.push({ pathname: '/receipt', params: { jobId: job.id } })}
        >
          <Ionicons name="receipt-outline" size={22} color="#fff" style={{ marginRight: 8 }} />
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>ดูใบเสร็จ</Text>
        </TouchableOpacity>

        {/* Extra padding for FAB */}
        <View style={{ height: 80 }} />

      </ScrollView>

      {/* Add Item Modal */}
      <Modal visible={showItemModal} transparent animationType="fade">
        <View className="flex-1 bg-slate-900/60 justify-center items-center">
          <View className="bg-white rounded-2xl p-6 w-[85%] max-w-[400px] shadow-lg">
            <Text className="text-lg font-bold text-slate-800 mb-4">เพิ่มรายการ</Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 mb-3 text-[15px] text-slate-800"
              placeholder="ชื่อรายการ (เช่น เปลี่ยนจอ)"
              placeholderTextColor="#94a3b8"
              value={itemName}
              onChangeText={setItemName}
            />
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl h-12 px-4 mb-3 text-[15px] text-slate-800"
              placeholder="ราคา (บาท)"
              placeholderTextColor="#94a3b8"
              value={itemPrice}
              onChangeText={setItemPrice}
              keyboardType="numeric"
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity className="flex-1 py-3 rounded-xl items-center justify-center bg-slate-100" onPress={() => { setShowItemModal(false); setItemName(''); setItemPrice(''); }}>
                <Text style={{ color: '#64748b', fontWeight: 'bold' }}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 py-3 rounded-xl items-center justify-center bg-green-600" onPress={handleAddItem}>
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>เพิ่มรายการ</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Note Modal */}
      <Modal visible={showNoteModal} transparent animationType="fade">
        <View className="flex-1 bg-slate-900/60 justify-center items-center">
          <View className="bg-white rounded-2xl p-6 w-[85%] max-w-[400px] shadow-lg">
            <Text className="text-lg font-bold text-slate-800 mb-4">เพิ่มบันทึกช่าง</Text>
            <TextInput
              className="bg-slate-50 border border-slate-200 rounded-xl h-[100px] px-4 pt-3 mb-3 text-[15px] text-slate-800" style={{ textAlignVertical: "top" }}
              placeholder="เช่น เปลี่ยนหน้าจอแล้ว รอลูกค้ามารับ..."
              placeholderTextColor="#94a3b8"
              value={noteText}
              onChangeText={setNoteText}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity className="flex-1 py-3 rounded-xl items-center justify-center bg-slate-100" onPress={() => { setShowNoteModal(false); setNoteText(''); }}>
                <Text style={{ color: '#64748b', fontWeight: 'bold' }}>ยกเลิก</Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 py-3 rounded-xl items-center justify-center bg-violet-600" onPress={handleAddNote} disabled={savingNote}>
                {savingNote ? <ActivityIndicator color="#fff" size="small" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>บันทึก</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Floating Action Button */}
      <TouchableOpacity
        className="absolute w-[60px] h-[60px] items-center justify-center right-5 bottom-[30px] bg-[#D32F2F] rounded-full elevation-8 shadow-md shadow-[#D32F2F]/40"
        onPress={() => router.push({ pathname: '/edit-job', params: { jobId: job.id } })}
      >
        <Ionicons name="pencil-outline" size={28} color="#ffffff" />
      </TouchableOpacity>

    </SafeAreaView>
  );
}


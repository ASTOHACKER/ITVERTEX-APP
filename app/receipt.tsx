import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  ScrollView,
  Alert,
  Share,
  ActivityIndicator,
  StatusBar} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

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
  items: any[];
  status: string;
  created_at: string;
}

export default function ReceiptScreen() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [job, setJob] = useState<RepairJob | null>(null);
  const [loading, setLoading] = useState(true);

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
      setJob(data);
    } catch (err: any) {
      console.error('Receipt fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }

  const items = job?.items && Array.isArray(job.items) ? job.items : [];
  const subtotal = items.reduce((sum: number, item: any) => sum + (Number(item.price) || 0), 0);
  const vat = Math.round(subtotal * 0.07 * 100) / 100;
  const grandTotal = subtotal + vat;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch { return dateStr; }
  };

  const formatNumber = (n: number) => n.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleConfirmPayment = async () => {
    if (!job) return;
    const perform = async () => {
      try {
        const { error } = await supabase
          .from('repair_jobs')
          .update({ status: 'ชำระแล้ว' })
          .eq('id', job.id);
        if (error) throw error;
        setJob({ ...job, status: 'ชำระแล้ว' });
        if (Platform.OS === 'web') {
          window.alert('สำเร็จ\n\nยืนยันการชำระเงินเรียบร้อยแล้ว');
        } else {
          Alert.alert('สำเร็จ', 'ยืนยันการชำระเงินเรียบร้อยแล้ว');
        }
      } catch (err: any) {
        const msg = err.message || 'เกิดข้อผิดพลาด';
        if (Platform.OS === 'web') window.alert('ล้มเหลว\n\n' + msg);
        else Alert.alert('ล้มเหลว', msg);
      }
    };
    if (Platform.OS === 'web') {
      if (window.confirm('ยืนยันการชำระเงินสำหรับงาน ' + (job.job_number || '') + ' ?')) perform();
    } else {
      Alert.alert('ยืนยันการชำระเงิน', `ยืนยันการชำระเงินสำหรับงาน ${job.job_number || ''} ?`, [
        { text: 'ยกเลิก', style: 'cancel' },
        { text: 'ยืนยัน', onPress: perform },
      ]);
    }
  };

  // Build HTML content from real data
  const buildHtml = () => {
    const itemsHtml = items.map((item: any, i: number) => `
      <tr>
        <td class="center">${i + 1}</td>
        <td>${item.name || item.description || 'รายการ ' + (i + 1)}</td>
        <td class="center">${item.qty || 1}</td>
        <td class="right">${formatNumber(Number(item.price) || 0)}</td>
        <td class="right">${formatNumber((Number(item.price) || 0) * (item.qty || 1))}</td>
      </tr>
    `).join('');

    return `<!DOCTYPE html>
    <html lang="th">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;700&display=swap');
        @page { margin: 0; }
        body { font-family: 'Sarabun', sans-serif; padding: 2cm 40px; color: #222; line-height: 1.5; }
        .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; border-bottom: 2px solid #D32F2F; padding-bottom: 20px; }
        .company-name { font-size: 22px; font-weight: bold; color: #D32F2F; margin-bottom: 5px; }
        .company-info { font-size: 14px; }
        .receipt-title-box { text-align: right; }
        .title { font-size: 28px; color: #D32F2F; margin: 0 0 10px 0; font-weight: bold; }
        .receipt-meta { font-size: 14px; }
        .receipt-meta span { display: inline-block; width: 100px; font-weight: bold; }
        .billing-info { display: flex; justify-content: space-between; margin-bottom: 30px; background-color: #f8f9fa; padding: 15px; border-radius: 8px; }
        .billed-to-title { font-weight: bold; color: #D32F2F; margin-bottom: 5px; font-size: 16px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .table th { background-color: #D32F2F; color: white; padding: 10px; text-align: left; font-size: 15px; }
        .table th.center { text-align: center; } .table th.right { text-align: right; }
        .table td { padding: 12px 10px; border-bottom: 1px solid #ddd; font-size: 14px; }
        .table td.center { text-align: center; } .table td.right { text-align: right; }
        .totals { width: 50%; float: right; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 10px; font-size: 15px; }
        .totals-row.total { font-weight: bold; color: #D32F2F; background-color: #fef2f2; font-size: 18px; border-radius: 4px; margin-top: 5px; }
        .notes { clear: both; font-size: 13px; color: #555; border-top: 1px solid #eee; padding-top: 15px; }
        .notes-title { font-weight: bold; color: #222; margin-bottom: 5px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="company-info">
          <div class="company-name">IT VERTEX</div>
          <div>ระบบจัดการร้านซ่อมคอมพิวเตอร์</div>
        </div>
        <div class="receipt-title-box">
          <h1 class="title">ใบเสร็จรับเงิน</h1>
          <div class="receipt-meta">
            <div><span>เลขที่:</span> ${job?.job_number || '-'}</div>
            <div><span>วันที่:</span> ${formatDate(job?.created_at || '')}</div>
          </div>
        </div>
      </div>

      <div class="billing-info">
        <div>
          <div class="billed-to-title">ข้อมูลลูกค้า</div>
          <div><strong>${job?.customer_name || '-'}</strong></div>
          <div>โทร: ${job?.phone || '-'}</div>
        </div>
        <div>
          <div class="billed-to-title">ข้อมูลอุปกรณ์</div>
          <div><strong>ประเภท:</strong> ${job?.device_type || '-'}</div>
          <div><strong>ยี่ห้อ/รุ่น:</strong> ${job?.brand || ''} ${job?.model || ''}</div>
          <div><strong>S/N:</strong> ${job?.serial_number || '-'}</div>
          <div><strong>อาการเสีย:</strong> ${job?.symptoms || '-'}</div>
        </div>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th class="center" style="width: 50px;">ลำดับ</th>
            <th>รายการ</th>
            <th class="center" style="width: 80px;">จำนวน</th>
            <th class="right" style="width: 100px;">ราคา/หน่วย</th>
            <th class="right" style="width: 120px;">จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml || '<tr><td colspan="5" style="text-align:center;color:#999;">ยังไม่มีรายการ</td></tr>'}
        </tbody>
      </table>

      <div class="totals">
        <div class="totals-row"><span>รวมเป็นเงิน</span><span>${formatNumber(subtotal)} บาท</span></div>
        <div class="totals-row"><span>ภาษีมูลค่าเพิ่ม (7%)</span><span>${formatNumber(vat)} บาท</span></div>
        <div class="totals-row total"><span>ยอดชำระสุทธิ</span><span>${formatNumber(grandTotal)} บาท</span></div>
      </div>

      <div class="notes">
        <div class="notes-title">เงื่อนไขและการรับประกันงานซ่อม:</div>
        <div>1. ทางร้านรับประกันอะไหล่และงานซ่อมเป็นระยะเวลา 90 วัน</div>
        <div>2. การรับประกันครอบคลุมเฉพาะอาการเดิมและอะไหล่ชิ้นเดิมเท่านั้น</div>
        <div>3. โปรดเก็บใบเสร็จรับเงินฉบับนี้ไว้เป็นหลักฐาน</div>
      </div>
    </body>
    </html>`;
  };

  const printToPDF = async () => {
    try {
      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
        if (iframe.contentWindow) {
          iframe.contentWindow.document.open();
          iframe.contentWindow.document.write(buildHtml());
          iframe.contentWindow.document.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => { if (document.body.contains(iframe)) document.body.removeChild(iframe); }, 1000);
          }, 250);
        }
      } else {
        Alert.alert(
          'ข้อจำกัดของ Expo Go',
          'ฟังก์ชันสั่งพิมพ์ใบเสร็จไม่รองรับบน Expo Go\n\n💡 แนะนำใช้ปุ่ม "แชร์เป็นข้อความ" แทนครับ',
          [{ text: 'ตกลง' }]
        );
      }
    } catch (error: any) {
      console.error("Error printing PDF: ", error);
    }
  };

  const shareAsText = async () => {
    if (!job) return;
    try {
      const itemsText = items.map((item: any, i: number) =>
        `${i + 1}. ${item.name || item.description || 'รายการ'}: ${formatNumber(Number(item.price) || 0)} บาท`
      ).join('\n');

      const textMessage = `🧾 ใบเสร็จรับเงิน — IT VERTEX
เลขที่: ${job.job_number || '-'}
วันที่: ${formatDate(job.created_at)}

👤 ลูกค้า: ${job.customer_name || '-'}
📱 เบอร์โทร: ${job.phone || '-'}
🖥️ อุปกรณ์: ${job.device_type || ''} ${job.brand || ''} ${job.model || ''}
🔧 อาการเสีย: ${job.symptoms || '-'}

📋 รายการบริการ:
${itemsText || '- ยังไม่มีรายการ'}

💰 รวมเป็นเงิน: ${formatNumber(subtotal)} บาท
➕ VAT (7%): ${formatNumber(vat)} บาท
💵 ยอดชำระสุทธิ: ${formatNumber(grandTotal)} บาท

✅ สถานะ: ${job.status}
ขอบคุณที่ใช้บริการ IT VERTEX!`.trim();

      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(textMessage);
        window.alert('คัดลอกข้อความใบเสร็จแล้ว!');
      } else {
        await Share.share({ message: textMessage });
      }
    } catch (error) {
      console.error("Error sharing text: ", error);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-100">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center bg-slate-50">
          <ActivityIndicator size="large" color="#D32F2F" />
          <Text className="mt-4 text-slate-500 text-base">กำลังโหลดใบเสร็จ...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView className="flex-1 bg-slate-100">
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 justify-center items-center bg-slate-50">
          <Ionicons name="document-text-outline" size={60} color="#cbd5e1" />
          <Text className="mt-4 text-slate-500 text-base">ไม่พบข้อมูลใบเสร็จ</Text>
          <TouchableOpacity className="mt-4 px-6 py-2.5 rounded-xl border border-[#D32F2F]" onPress={() => router.back()}>
            <Text style={{ color: '#D32F2F', fontWeight: 'bold' }}>กลับ</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isPaid = job.status === 'ชำระแล้ว' || job.status === 'ส่งมอบแล้ว';

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-4 bg-[#D32F2F]" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12 }}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">ใบเสร็จค่าซ่อม</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerClassName="p-4 pb-10" showsVerticalScrollIndicator={false}>
        {/* Receipt Card */}
        <View className="bg-white rounded-2xl p-5 w-full shadow-sm elevation-5 mb-5 relative overflow-hidden">
          {/* Paid Stamp */}
          {isPaid && (
            <View className="absolute top-[15px] right-[15px] z-10">
              <View className="border-[2.5px] border-green-600 rounded-lg px-2 py-1 items-center bg-green-600/5" style={{ transform: [{ rotate: "15deg" }] }}>
                <Text className="text-green-600 text-base font-bold tracking-widest">PAID</Text>
                <Text className="text-green-600 text-[10px] font-bold -mt-0.5">ชำระแล้ว</Text>
              </View>
            </View>
          )}

          <View className="items-center mb-2.5 pt-2.5">
            <Text className="text-[20px] font-extrabold text-[#D32F2F] mb-1">IT VERTEX</Text>
            <Text className="text-xs text-slate-500 text-center">ระบบจัดการร้านซ่อมคอมพิวเตอร์</Text>
          </View>

          <View className="border-t border-dashed border-slate-200 my-4 w-full" />

          <View className="flex-row justify-between px-1">
            <View>
              <Text className="text-[11px] text-slate-400 mb-0.5">เลขที่งานซ่อม</Text>
              <Text className="text-sm font-semibold text-slate-800">{job.job_number || '-'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text className="text-[11px] text-slate-400 mb-0.5">วันที่</Text>
              <Text className="text-sm font-semibold text-slate-800">{formatDate(job.created_at)}</Text>
            </View>
          </View>

          <View className="border-t border-dashed border-slate-200 my-4 w-full" />

          {/* Customer & Device */}
          <View className="px-1">
            <Text className="text-sm font-bold text-[#D32F2F] mb-2.5">ข้อมูลลูกค้า & อุปกรณ์</Text>
            <Text className="text-[13px] text-slate-700 leading-5 mb-1"><Text className="text-slate-400 font-medium">ชื่อลูกค้า:</Text> {job.customer_name || '-'}</Text>
            <Text className="text-[13px] text-slate-700 leading-5 mb-1"><Text className="text-slate-400 font-medium">เบอร์โทร:</Text> {job.phone || '-'}</Text>
            <Text className="text-[13px] text-slate-700 leading-5 mb-1"><Text className="text-slate-400 font-medium">อุปกรณ์:</Text> {job.device_type || '-'} {job.brand || ''} {job.model || ''}</Text>
            <Text className="text-[13px] text-slate-700 leading-5 mb-1"><Text className="text-slate-400 font-medium">S/N:</Text> {job.serial_number || '-'}</Text>
            <Text className="text-[13px] text-slate-700 leading-5 mb-1"><Text className="text-slate-400 font-medium">อาการเสีย:</Text> {job.symptoms || '-'}</Text>
          </View>

          <View className="border-t border-dashed border-slate-200 my-4 w-full" />

          {/* Items */}
          <View className="px-1">
            <Text className="text-sm font-bold text-[#D32F2F] mb-2.5">รายการบริการ / อะไหล่</Text>
            {items.length > 0 ? items.map((item: any, i: number) => (
              <View key={i} className="flex-row justify-between items-center mb-2">
                <Text className="text-[13px] text-slate-700 flex-1 pr-2.5">{i + 1}. {item.name || item.description || 'รายการ'}</Text>
                <Text className="text-[13px] font-semibold text-slate-800">{formatNumber(Number(item.price) || 0)} ฿</Text>
              </View>
            )) : (
              <Text style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', paddingVertical: 12 }}>ยังไม่มีรายการ</Text>
            )}
          </View>

          <View className="border-t border-dashed border-slate-200 my-4 w-full" />

          {/* Totals */}
          <View className="px-1">
            <View className="flex-row justify-between items-center my-1">
              <Text className="text-[13px] text-slate-500">รวมเป็นเงิน</Text>
              <Text className="text-[13px] font-medium text-slate-800">{formatNumber(subtotal)} บาท</Text>
            </View>
            <View className="flex-row justify-between items-center my-1">
              <Text className="text-[13px] text-slate-500">ภาษีมูลค่าเพิ่ม (VAT 7%)</Text>
              <Text className="text-[13px] font-medium text-slate-800">{formatNumber(vat)} บาท</Text>
            </View>
            <View className="flex-row justify-between items-center bg-red-50 p-3 rounded-lg mt-2">
              <Text className="text-[15px] font-bold text-[#D32F2F]">ยอดชำระสุทธิ</Text>
              <Text className="text-lg font-bold text-[#D32F2F]">{formatNumber(grandTotal)} บาท</Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="w-full gap-3 pb-8">
          {!isPaid && (
            <TouchableOpacity className="bg-green-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm elevation-3" onPress={handleConfirmPayment}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
              <Text className="text-white text-[15px] font-bold">ยืนยันการชำระเงิน</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity className="bg-[#D32F2F] py-3.5 rounded-xl items-center flex-row justify-center shadow-sm elevation-3" onPress={printToPDF}>
            <Ionicons name="print-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white text-[15px] font-bold">พิมพ์ใบเสร็จ</Text>
          </TouchableOpacity>

          <TouchableOpacity className="bg-violet-600 py-3.5 rounded-xl items-center flex-row justify-center shadow-sm elevation-3" onPress={shareAsText}>
            <Ionicons name="share-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text className="text-white text-[15px] font-bold">แชร์เป็นข้อความ</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}


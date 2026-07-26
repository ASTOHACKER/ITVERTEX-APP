import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  Text,
  View,
  StatusBar,
  ScrollView,
  Platform,
  TouchableOpacity,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

interface DailyCount {
  label: string;
  value: number;
}

export default function ReportScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weeklyData, setWeeklyData] = useState<DailyCount[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState(0);
  const [monthlyJobCount, setMonthlyJobCount] = useState(0);
  const [avgPerJob, setAvgPerJob] = useState(0);
  const [avgPerDay, setAvgPerDay] = useState(0);
  const [statusBreakdown, setStatusBreakdown] = useState<{status: string; count: number; color: string}[]>([]);
  const [topDevices, setTopDevices] = useState<{type: string; count: number}[]>([]);
  const [topTechnicians, setTopTechnicians] = useState<{name: string; count: number; revenue: number}[]>([]);
  const [lastMonthRevenue, setLastMonthRevenue] = useState(0);
  const [revenueTrend, setRevenueTrend] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      fetchReportData();
    }, [])
  );

  async function fetchReportData() {
    try {
      setLoading(true);

      // Get current week boundaries (Monday to Sunday)
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      // Fetch weekly repair jobs
      const { data: weekJobs, error: weekError } = await supabase
        .from('repair_jobs')
        .select('created_at')
        .gte('created_at', monday.toISOString())
        .lte('created_at', sunday.toISOString());

      if (weekError) console.error('Weekly fetch error:', weekError.message);

      // Count by day of week (Mon=0 to Sun=6 in our labels)
      const dayCounts: number[] = [0, 0, 0, 0, 0, 0, 0]; // จ อ พ พฤ ศ ส อา
      (weekJobs || []).forEach((job) => {
        const jobDay = new Date(job.created_at).getDay(); // 0=Sun
        // Map: Sun=6, Mon=0, Tue=1, Wed=2, Thu=3, Fri=4, Sat=5
        const idx = jobDay === 0 ? 6 : jobDay - 1;
        dayCounts[idx]++;
      });

      const weekLabels = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
      setWeeklyData(weekLabels.map((label, i) => ({ label, value: dayCounts[i] })));

      // Get current month boundaries
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);

      // Get last month boundaries for comparison
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      lastMonthStart.setHours(0, 0, 0, 0);
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
      lastMonthEnd.setHours(23, 59, 59, 999);

      // Fetch monthly repair jobs with items for revenue
      const { data: monthJobs, error: monthError } = await supabase
        .from('repair_jobs')
        .select('items, status, device_type, technician_name')
        .gte('created_at', monthStart.toISOString())
        .lte('created_at', monthEnd.toISOString());

      if (monthError) console.error('Monthly fetch error:', monthError.message);

      // Fetch last month jobs for revenue comparison
      const { data: lastMonthJobs } = await supabase
        .from('repair_jobs')
        .select('items, status')
        .gte('created_at', lastMonthStart.toISOString())
        .lte('created_at', lastMonthEnd.toISOString());

      const jobs = monthJobs || [];
      setMonthlyJobCount(jobs.length);

      // Calculate average per day
      const dayOfMonth = now.getDate();
      setAvgPerDay(dayOfMonth > 0 ? Math.round((jobs.length / dayOfMonth) * 10) / 10 : 0);

      // Calculate revenue from paid jobs
      let totalRevenue = 0;
      const paidJobs = jobs.filter(j => j.status === 'ชำระแล้ว' || j.status === 'ส่งมอบแล้ว');
      paidJobs.forEach((job) => {
        if (job.items && Array.isArray(job.items)) {
          job.items.forEach((item: any) => {
            totalRevenue += Number(item.price) || 0;
          });
        }
      });

      setMonthlyRevenue(totalRevenue);
      setAvgPerJob(paidJobs.length > 0 ? Math.round(totalRevenue / paidJobs.length) : 0);

      // Last month revenue
      let lastMonthRev = 0;
      const lastPaidJobs = (lastMonthJobs || []).filter(j => j.status === 'ชำระแล้ว' || j.status === 'ส่งมอบแล้ว');
      lastPaidJobs.forEach((job) => {
        if (job.items && Array.isArray(job.items)) {
          job.items.forEach((item: any) => {
            lastMonthRev += Number(item.price) || 0;
          });
        }
      });
      setLastMonthRevenue(lastMonthRev);

      // Revenue trend percentage
      if (lastMonthRev > 0) {
        setRevenueTrend(Math.round(((totalRevenue - lastMonthRev) / lastMonthRev) * 100));
      } else if (totalRevenue > 0) {
        setRevenueTrend(100);
      } else {
        setRevenueTrend(0);
      }

      // Status breakdown
      const statusMap: Record<string, {count: number; color: string}> = {
        'รอชำระ': { count: 0, color: '#d97706' },
        'กำลังซ่อม': { count: 0, color: '#0284c7' },
        'ชำระแล้ว': { count: 0, color: '#16a34a' },
        'ส่งมอบแล้ว': { count: 0, color: '#7c3aed' },
      };
      jobs.forEach(j => {
        if (statusMap[j.status]) statusMap[j.status].count++;
      });
      setStatusBreakdown(Object.entries(statusMap).map(([status, v]) => ({ status, ...v })));

      // Top device types
      const deviceMap: Record<string, number> = {};
      jobs.forEach(j => {
        const dt = j.device_type || 'อื่นๆ';
        deviceMap[dt] = (deviceMap[dt] || 0) + 1;
      });
      const sorted = Object.entries(deviceMap)
        .map(([type, count]) => ({ type, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopDevices(sorted);

      // Top technicians
      const techMap: Record<string, {count: number; revenue: number}> = {};
      jobs.forEach(j => {
        const name = j.technician_name || 'ไม่ระบุ';
        if (!techMap[name]) techMap[name] = { count: 0, revenue: 0 };
        techMap[name].count++;
        if (j.status === 'ชำระแล้ว' || j.status === 'ส่งมอบแล้ว') {
          if (j.items && Array.isArray(j.items)) {
            j.items.forEach((item: any) => {
              techMap[name].revenue += Number(item.price) || 0;
            });
          }
        }
      });
      const techSorted = Object.entries(techMap)
        .map(([name, v]) => ({ name, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopTechnicians(techSorted);

    } catch (err) {
      console.error('Report data fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }

  const maxVal = Math.max(...weeklyData.map(d => d.value), 1);

  const getTrendIcon = () => {
    if (revenueTrend > 0) return 'trending-up';
    if (revenueTrend < 0) return 'trending-down';
    return 'remove-outline';
  };

  const getTrendColor = () => {
    if (revenueTrend > 0) return '#16a34a';
    if (revenueTrend < 0) return '#dc2626';
    return '#64748b';
  };

  // Medal colors for top technicians
  const medalColors = ['#d97706', '#94a3b8', '#b45309'];

  return (
    <SafeAreaView className="flex-1 bg-red-700 dark:bg-slate-900">
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View className="bg-red-700 dark:bg-slate-800 px-5 pb-6 flex-row justify-between items-center border-b border-transparent dark:border-slate-700" style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 16 : 16 }}>
        <View>
          <Text className="text-white text-2xl font-extrabold">IT VERTEX</Text>
          <Text className="text-white/80 text-sm mt-1">ภาพรวมธุรกิจ — พนักงาน</Text>
        </View>
        <TouchableOpacity onPress={fetchReportData} className="w-10 h-10 rounded-full bg-white/15 justify-center items-center">
          <Ionicons name="refresh" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 bg-slate-50 dark:bg-slate-900" contentContainerStyle={{ padding: 16, paddingTop: 24, paddingBottom: 40 }} bounces={false}>

        {loading ? (
          <View className="items-center justify-center py-16">
            <ActivityIndicator size="large" color="#D32F2F" />
            <Text className="mt-3 text-slate-500 dark:text-slate-400 text-sm">กำลังโหลดข้อมูลรายงาน...</Text>
          </View>
        ) : (
          <>
            {/* Weekly Chart Card */}
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100 dark:border-slate-700">
              <Text className="text-base font-bold text-slate-800 dark:text-slate-100 mb-6">ยอดซ่อมรายสัปดาห์</Text>

              {/* Bar Chart */}
              <View className="h-[180px] relative">
                {/* Horizontal Grid Lines */}
                <View className="absolute top-0 bottom-6 left-0 right-0 justify-between z-0">
                  <View className="h-px bg-slate-100 dark:bg-slate-700" />
                  <View className="h-px bg-slate-100 dark:bg-slate-700" />
                  <View className="h-px bg-slate-100 dark:bg-slate-700" />
                  <View className="h-px bg-slate-100 dark:bg-slate-700" />
                </View>

                <View className="flex-1 flex-row justify-between items-end pb-6 z-10">
                  {weeklyData.map((item, index) => {
                    const heightPercent = `${(item.value / maxVal) * 100}%` as any;
                    return (
                      <View key={index} className="items-center justify-end h-full w-[12%]">
                        {item.value > 0 && (
                          <>
                            <Text className="text-[11px] text-red-700 font-bold mb-1">{item.value}</Text>
                            <View className="w-full bg-red-700 rounded-t-md min-h-[4px]" style={{ height: heightPercent }} />
                          </>
                        )}
                        <Text className="absolute bottom-0 text-xs text-slate-400 font-medium">{item.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>

              <Text className="text-xs text-slate-400 text-center mt-2">
                สัปดาห์นี้ทั้งหมด {weeklyData.reduce((s, d) => s + d.value, 0)} งาน
              </Text>
            </View>

            {/* Monthly Summary Card */}
            <View className="bg-white dark:bg-slate-800 rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100 dark:border-slate-700">
              <View className="flex-row items-center mb-5">
                <Ionicons name={getTrendIcon() as any} size={24} color={getTrendColor()} />
                <Text className="text-lg font-bold text-slate-800 dark:text-slate-100 ml-2 flex-1">สรุปเดือนนี้</Text>
                {revenueTrend !== 0 && (
                  <View className="px-2.5 py-1 rounded-xl" style={{ backgroundColor: getTrendColor() + '15' }}>
                    <Text className="text-[13px] font-extrabold" style={{ color: getTrendColor() }}>
                      {revenueTrend > 0 ? '+' : ''}{revenueTrend}%
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row flex-wrap gap-3">
                <View className="bg-slate-50 dark:bg-slate-700/60 rounded-xl p-4 flex-[1_1_47%]">
                  <Text className="text-[13px] text-slate-500 dark:text-slate-400 mb-2 font-medium">รายได้รวม</Text>
                  <Text className="text-lg font-bold text-green-600 dark:text-green-400">
                    {monthlyRevenue.toLocaleString()} บาท
                  </Text>
                </View>

                <View className="bg-slate-50 dark:bg-slate-700/60 rounded-xl p-4 flex-[1_1_47%]">
                  <Text className="text-[13px] text-slate-500 dark:text-slate-400 mb-2 font-medium">งานทั้งหมด</Text>
                  <Text className="text-lg font-bold text-sky-600 dark:text-sky-400">
                    {monthlyJobCount} งาน
                  </Text>
                </View>

                <View className="bg-slate-50 dark:bg-slate-700/60 rounded-xl p-4 flex-[1_1_47%]">
                  <Text className="text-[13px] text-slate-500 dark:text-slate-400 mb-2 font-medium">มูลค่าเฉลี่ย/งาน</Text>
                  <Text className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {avgPerJob.toLocaleString()} บาท
                  </Text>
                </View>

                <View className="bg-slate-50 dark:bg-slate-700/60 rounded-xl p-4 flex-[1_1_47%]">
                  <Text className="text-[13px] text-slate-500 dark:text-slate-400 mb-2 font-medium">เฉลี่ย/วัน</Text>
                  <Text className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {avgPerDay} งาน
                  </Text>
                </View>
              </View>

              {/* Revenue Comparison */}
              <View className="flex-row items-center justify-center mt-4 pt-4 border-t border-slate-100 gap-4">
                <View className="items-center">
                  <Text className="text-[11px] text-slate-400 font-medium mb-0.5">เดือนที่แล้ว</Text>
                  <Text className="text-base text-slate-500 font-semibold">{lastMonthRevenue.toLocaleString()} ฿</Text>
                </View>
                <Ionicons name="arrow-forward" size={16} color="#94a3b8" />
                <View className="items-center">
                  <Text className="text-[11px] text-slate-400 font-medium mb-0.5">เดือนนี้</Text>
                  <Text className="text-base font-bold" style={{ color: getTrendColor() }}>
                    {monthlyRevenue.toLocaleString()} ฿
                  </Text>
                </View>
              </View>
            </View>

            {/* Top Technicians */}
            {topTechnicians.length > 0 && (
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100">
                <View className="flex-row items-center mb-5">
                  <Ionicons name="trophy-outline" size={24} color="#d97706" />
                  <Text className="text-lg font-bold text-slate-800 ml-2 flex-1">ช่างยอดเยี่ยม</Text>
                </View>
                {topTechnicians.map((tech, i) => (
                  <View key={i} className="flex-row items-center mb-3.5">
                    <View className="w-8 h-8 rounded-full justify-center items-center mr-3" style={{ backgroundColor: i < 3 ? medalColors[i] + '20' : '#f1f5f9' }}>
                      {i < 3 ? (
                        <Ionicons name="medal-outline" size={16} color={medalColors[i]} />
                      ) : (
                        <Text className="text-[13px] font-bold text-slate-400">{i + 1}</Text>
                      )}
                    </View>
                    <View className="flex-1 mr-3">
                      <Text className="text-sm font-bold text-slate-800">{tech.name}</Text>
                      <Text className="text-xs text-slate-400 mt-0.5">{tech.count} งาน · {tech.revenue.toLocaleString()} ฿</Text>
                    </View>
                    <View className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <View className="h-full rounded-full" style={{
                        width: `${(tech.count / (topTechnicians[0]?.count || 1)) * 100}%` as any,
                        backgroundColor: i < 3 ? medalColors[i] : '#94a3b8',
                      }} />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Status Breakdown */}
            <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100">
              <View className="flex-row items-center mb-5">
                <Ionicons name="pie-chart-outline" size={24} color="#D32F2F" />
                <Text className="text-lg font-bold text-slate-800 ml-2 flex-1">สถานะงานซ่อม</Text>
              </View>
              {statusBreakdown.map((item, i) => {
                const pct = monthlyJobCount > 0 ? Math.round((item.count / monthlyJobCount) * 100) : 0;
                return (
                  <View key={i} className="flex-row items-center mb-3">
                    <View className="w-3 h-3 rounded-full mr-3" style={{ backgroundColor: item.color }} />
                    <Text className="flex-1 text-sm text-slate-700">{item.status}</Text>
                    <View className="w-[60px] h-1.5 rounded-full bg-slate-100 overflow-hidden mr-2.5">
                      <View className="h-full rounded-full" style={{ width: `${pct}%` as any, backgroundColor: item.color }} />
                    </View>
                    <Text className="text-base font-bold w-10 text-right" style={{ color: item.color }}>{item.count}</Text>
                  </View>
                );
              })}
            </View>

            {/* Top Devices */}
            {topDevices.length > 0 && (
              <View className="bg-white rounded-2xl p-5 mb-4 shadow-sm elevation-2 border border-slate-100">
                <View className="flex-row items-center mb-5">
                  <Ionicons name="hardware-chip-outline" size={24} color="#0284c7" />
                  <Text className="text-lg font-bold text-slate-800 ml-2 flex-1">ประเภทอุปกรณ์ยอดนิยม</Text>
                </View>
                {topDevices.map((item, i) => (
                  <View key={i} className="flex-row items-center mb-2.5">
                    <View className="w-7 h-7 rounded-full bg-blue-50 justify-center items-center mr-3">
                      <Text className="text-[13px] font-bold text-sky-600">{i + 1}</Text>
                    </View>
                    <Text className="flex-1 text-sm text-slate-700">{item.type}</Text>
                    <Text className="text-base font-bold text-sky-600">{item.count}</Text>
                    <Text className="text-xs text-slate-400 ml-1">งาน</Text>
                  </View>
                ))}
              </View>
            )}
          </>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

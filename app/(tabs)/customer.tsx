import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  Text,
  View,
  StatusBar,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';

interface Customer {
  customer_id: number;
  first_name: string;
  last_name: string;
  tel: string;
}

interface CustomerWithJobs extends Customer {
  activeJobCount: number;
  totalJobCount: number;
}

export default function CustomerScreen() {
  const [data, setData] = useState<CustomerWithJobs[]>([]);
  const [filteredData, setFilteredData] = useState<CustomerWithJobs[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [userName, setUserName] = useState('กำลังโหลด...');
  const [userRole, setUserRole] = useState('...');
  const [expandedCustomer, setExpandedCustomer] = useState<number | null>(null);
  const [customerJobs, setCustomerJobs] = useState<any[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);

  const router = useRouter();

  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
    }, [])
  );

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      showAlert('แจ้งเตือน', 'คุณต้องเข้าสู่ระบบก่อน');
      router.replace('/(auth)/login');
    } else {
      const user = session.user;
      if (user) {
        const uid = user.id;
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', uid)
          .single();

        if (error) {
          console.error("Error fetching profile:", error.message);
        }

        if (profile) {
          setUserName(`${profile.first_name || ''} ${profile.last_name || ''}`.trim() || user.email || 'ผู้ใช้งาน');
        } else {
          setUserName(user.email || 'ผู้ใช้งาน');
        }

        setUserRole(profile?.role || 'No Role');
      }
      fetchData();
    }
  }

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch customers
      const { data: items, error } = await supabase
        .from('customer')
        .select('*')
        .order('customer_id', { ascending: true });

      if (error) {
        console.error('Error fetching customers:', error.message);
        return;
      }

      // Fetch all repair jobs to count per customer
      const { data: allJobs } = await supabase
        .from('repair_jobs')
        .select('customer_name, status');

      const customers = (items || []).map((customer: Customer) => {
        const fullName = `${customer.first_name} ${customer.last_name}`.trim().toLowerCase();
        const jobs = (allJobs || []).filter((j: any) =>
          (j.customer_name || '').toLowerCase().includes(fullName) ||
          fullName.includes((j.customer_name || '').toLowerCase())
        );
        const activeJobs = jobs.filter((j: any) =>
          j.status === 'รอชำระ' || j.status === 'กำลังซ่อม'
        );
        return {
          ...customer,
          activeJobCount: activeJobs.length,
          totalJobCount: jobs.length,
        };
      });

      setData(customers);
      setFilteredData(customers);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text) {
      const filtered = data.filter((item) => {
        const fullName = `${item.first_name} ${item.last_name}`.toLowerCase();
        const tel = item.tel.toLowerCase();
        return fullName.includes(text.toLowerCase()) || tel.includes(text.toLowerCase());
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  };

  const handleCall = (tel: string) => {
    if (!tel) return;
    const phoneUrl = `tel:${tel}`;
    if (Platform.OS === 'web') {
      window.open(phoneUrl, '_self');
    } else {
      Linking.openURL(phoneUrl).catch(() => {
        showAlert('ไม่สามารถโทรได้', 'อุปกรณ์ของคุณไม่รองรับการโทรออก');
      });
    }
  };

  const handleToggleJobs = async (customer: CustomerWithJobs) => {
    if (expandedCustomer === customer.customer_id) {
      setExpandedCustomer(null);
      setCustomerJobs([]);
      return;
    }

    setExpandedCustomer(customer.customer_id);
    setLoadingJobs(true);

    try {
      const fullName = `${customer.first_name} ${customer.last_name}`.trim();
      const { data: jobs } = await supabase
        .from('repair_jobs')
        .select('id, job_number, device_type, brand, model, status, created_at')
        .ilike('customer_name', `%${fullName}%`)
        .order('created_at', { ascending: false })
        .limit(5);

      setCustomerJobs(jobs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?");
      if (confirmLogout) {
        try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
        finally { localStorage.clear(); sessionStorage.clear(); router.replace('/(auth)/login'); }
      }
    } else {
      Alert.alert("ยืนยัน", "คุณต้องการออกจากระบบใช่หรือไม่?", [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ออกจากระบบ",
          onPress: async () => {
            try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
            finally { router.replace('/(auth)/login'); }
          },
          style: "destructive"
        }
      ]);
    }
  };

  const getInitials = (name: string) => {
    return name ? name.charAt(0).toUpperCase() : '?';
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

  const renderItem = ({ item }: { item: CustomerWithJobs }) => {
    const isStaff = userRole === 'staff' || userRole === 'Staff' || userRole === 'Manager';
    const isExpanded = expandedCustomer === item.customer_id;

    return (
      <View className="mb-3">
        <View className="flex-row items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700" style={{ elevation: 2 }}>
          <TouchableOpacity className="w-12 h-12 rounded-full bg-red-50 dark:bg-slate-700 justify-center items-center mr-4 relative" onPress={() => handleToggleJobs(item)}>
            <Text className="text-[#D32F2F] dark:text-red-400 text-lg font-bold">{getInitials(item.first_name)}</Text>
            {item.activeJobCount > 0 && (
              <View className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-600 justify-center items-center border-2 border-white dark:border-slate-800">
                <Text className="text-white text-[10px] font-bold">{item.activeJobCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity className="flex-1" onPress={() => handleToggleJobs(item)} activeOpacity={0.7}>
            <Text className="text-base font-bold text-slate-800 dark:text-slate-100 mb-1" numberOfLines={1}>
              {item.first_name} {item.last_name}
            </Text>
            <TouchableOpacity className="flex-row items-center" onPress={() => handleCall(item.tel)}>
              <Ionicons name="call" size={14} color="#D32F2F" />
              <Text className="text-sm text-[#D32F2F] dark:text-red-400 ml-1.5 font-medium">{item.tel}</Text>
            </TouchableOpacity>
            {/* Job stats row */}
            <View className="flex-row flex-wrap mt-1.5 gap-1.5">
              {item.totalJobCount > 0 ? (
                <>
                  {item.activeJobCount > 0 && (
                    <View className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 px-2 py-0.5 rounded-full">
                      <Text className="text-amber-700 dark:text-amber-400 text-[11px] font-semibold">กำลังซ่อม {item.activeJobCount} เครื่อง</Text>
                    </View>
                  )}
                  <View className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 px-2 py-0.5 rounded-full">
                    <Text className="text-slate-600 dark:text-slate-300 text-[11px] font-medium">รวม {item.totalJobCount} งาน</Text>
                  </View>
                </>
              ) : (
                <Text className="text-slate-400 text-[11px]">ไม่มีประวัติงานซ่อม</Text>
              )}
            </View>
          </TouchableOpacity>

          <TouchableOpacity className="p-2 ml-1" onPress={() => handleToggleJobs(item)}>
            <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        {/* Expanded Jobs Drawer */}
        {isExpanded && (
          <View className="bg-slate-50 dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-700 rounded-b-2xl p-3 -mt-2 shadow-inner">
            {loadingJobs ? (
              <View className="py-4 items-center flex-row justify-center">
                <ActivityIndicator size="small" color="#D32F2F" />
                <Text className="text-xs text-slate-500 dark:text-slate-400 ml-2">กำลังดึงประวัติงานซ่อม...</Text>
              </View>
            ) : customerJobs.length > 0 ? (
              customerJobs.map((job) => (
                <TouchableOpacity
                  key={job.id}
                  className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex-row items-center justify-between mb-2 shadow-xs"
                  onPress={() => router.push({ pathname: '/job-detail', params: { jobId: job.id } })}
                >
                  <View className="flex-1 mr-2">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{job.brand} {job.model}</Text>
                      <Text className="text-[11px] text-slate-400">({job.device_type})</Text>
                    </View>
                    <Text className="text-[11px] text-slate-500 dark:text-slate-400">เลขซ่อม: {job.job_number}</Text>
                  </View>
                  <View className="px-2.5 py-1 rounded-full border" style={{ borderColor: getStatusColor(job.status) + '40', backgroundColor: getStatusColor(job.status) + '15' }}>
                    <Text className="text-[11px] font-bold" style={{ color: getStatusColor(job.status) }}>{job.status}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-center text-slate-400 text-[13px] py-3">ไม่พบประวัติงานซ่อม</Text>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#D32F2F] dark:bg-slate-900">
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View className={`flex-row justify-between items-center px-5 pb-4 bg-[#D32F2F] dark:bg-slate-800 border-b border-transparent dark:border-slate-700 ${Platform.OS === 'android' ? 'pt-[calc(env(safe-area-inset-top)+12px)]' : 'pt-3'}`} style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12 }}>
        <View>
          <Text className="text-white text-[22px] font-extrabold tracking-wide">IT VERTEX</Text>
          <Text className="text-white/80 text-xs mt-0.5">ระบบจัดการลูกค้าสัมพันธ์</Text>
        </View>
        <View className="flex-row items-center">
          <View className="items-end mr-3">
            <Text className="text-white text-sm font-semibold">{userName}</Text>
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="shield-checkmark" size={12} color="rgba(255,255,255,0.7)" />
              <Text className="text-white/70 text-[11px] ml-1 font-medium">{userRole}</Text>
            </View>
          </View>
          <TouchableOpacity className="w-10 h-10 rounded-full bg-white/15 justify-center items-center" onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 bg-slate-50 dark:bg-slate-900">
        {/* Search Area */}
        <View className="px-4 pt-5 pb-2.5 bg-slate-50 dark:bg-slate-900">
          <View className="flex-row items-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-4 h-12 shadow-sm" style={{ elevation: 2 }}>
            <Ionicons name="search" size={20} color="#94a3b8" style={{ marginRight: 10 }} />
            <TextInput
              className="flex-1 h-full text-slate-900 dark:text-slate-100 text-[15px]"
              placeholder="ค้นหาชื่อลูกค้า หรือ เบอร์โทร..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={handleSearch}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={20} color="#cbd5e1" style={{ marginLeft: 10 }} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Summary Stats */}
        <View className="flex-row mx-4 mb-3 bg-white dark:bg-slate-800 rounded-xl p-3.5 shadow-sm border border-slate-100 dark:border-slate-700" style={{ elevation: 1 }}>
          <View className="flex-1 items-center">
            <Text className="text-[22px] font-extrabold text-[#D32F2F] dark:text-red-400">{data.length}</Text>
            <Text className="text-[11px] text-slate-400 font-semibold mt-0.5">ลูกค้าทั้งหมด</Text>
          </View>
          <View className="flex-1 items-center border-l border-slate-200 dark:border-slate-700">
            <Text className="text-[22px] font-extrabold text-amber-600 dark:text-amber-400">
              {data.reduce((sum, c) => sum + c.activeJobCount, 0)}
            </Text>
            <Text className="text-[11px] text-slate-400 font-semibold mt-0.5">งานกำลังดำเนินการ</Text>
          </View>
        </View>

        {/* List */}
        <View className="flex-1 px-4">
          <Text className="text-[15px] font-bold text-slate-700 dark:text-slate-300 mb-3 mt-1">
            รายชื่อลูกค้า <Text className="text-[#D32F2F] dark:text-red-400">({filteredData.length})</Text>
          </Text>

          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#D32F2F" />
              <Text className="mt-3 text-slate-500 text-sm font-medium">กำลังโหลดข้อมูล...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredData}
              keyExtractor={(item) => item.customer_id.toString()}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 100 }}
              showsVerticalScrollIndicator={false}
              refreshing={loading}
              onRefresh={fetchData}
              ListEmptyComponent={
                <View className="flex-1 justify-center items-center mt-16">
                  <Ionicons name="people-outline" size={60} color="#cbd5e1" />
                  <Text className="text-slate-400 text-base mt-3 font-medium">ไม่พบข้อมูลลูกค้า</Text>
                </View>
              }
            />
          )}
        </View>

        {/* FAB */}
        <TouchableOpacity
          className="absolute w-[52px] h-[52px] items-center justify-center right-4 bottom-[36px] bg-[#D32F2F] rounded-full shadow-md"
          style={{ elevation: 8, shadowColor: '#D32F2F', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6 }}
          onPress={() => router.push('/edit-customer')}
          activeOpacity={0.8}
        >
          <Ionicons name="person-add" size={24} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


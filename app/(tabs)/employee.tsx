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
  Modal,
  Alert,
  Platform,
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
}

export default function EmployeeScreen() {
  const [data, setData] = useState<Profile[]>([]);
  const [filteredData, setFilteredData] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [userName, setUserName] = useState('กำลังโหลด...');
  const [userRole, setUserRole] = useState('...');

  // Modal edit state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [formFirstName, setFormFirstName] = useState('');
  const [formLastName, setFormLastName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
      showAlert('แจ้งเตือน', 'คุณต้องเข้าสู่ระบบก่อนจึงจะเข้าหน้าข้อมูลพนักงานได้');
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
          // silent
        }

        const fetchedRole = profile?.role || 'No Role';
        const displayName = profile && (profile.first_name || profile.last_name)
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
          : (user.user_metadata?.username || user.email || 'ผู้ใช้งาน');
        
        setUserName(displayName);
        setUserRole(fetchedRole);

        if (fetchedRole !== 'Manager') {
          showAlert('การเข้าถึงถูกจำกัด', 'หน้านี้เฉพาะผู้จัดการ (Manager) เท่านั้นที่สามารถเข้าถึงได้');
          router.replace('/(tabs)');
          return;
        }
      }
      fetchData();
    }
  }

  async function fetchData() {
    try {
      setLoading(true);
      const { data: items, error } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name', { ascending: true });

      if (error) {
        throw error;
      } else {
        setData(items || []);
        setFilteredData(items || []);
      }
    } catch (e: any) {
      showAlert('ล้มเหลว', 'เกิดข้อผิดพลาดในการโหลดข้อมูลพนักงาน');
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = (text: string) => {
    setSearchText(text);
    if (text) {
      const filtered = data.filter((item) => {
        const fullName = `${item.first_name || ''} ${item.last_name || ''}`.toLowerCase();
        const role = (item.role || '').toLowerCase();
        return fullName.includes(text.toLowerCase()) || role.includes(text.toLowerCase());
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  };

  const openEditModal = (profile: Profile) => {
    setEditingProfile(profile);
    setFormFirstName(profile.first_name || '');
    setFormLastName(profile.last_name || '');
    setFormRole(profile.role || 'Staff');
    setIsModalVisible(true);
  };

  const closeModal = () => {
    setIsModalVisible(false);
    setEditingProfile(null);
  };

  const saveEmployee = async () => {
    if (userRole !== 'Manager') {
      showAlert('ปฏิเสธการเข้าถึง', 'เฉพาะผู้จัดการเท่านั้นที่สามารถแก้ไขข้อมูลได้');
      return;
    }

    if (!formFirstName || !formLastName || !formRole) {
      showAlert('ข้อผิดพลาด', 'กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    if (!editingProfile) return;

    setIsSaving(true);
    try {
      const { data: updatedData, error } = await supabase
        .from('profiles')
        .update({
          first_name: formFirstName,
          last_name: formLastName,
          role: formRole,
        })
        .eq('id', editingProfile.id)
        .select();

      if (error) throw error;
      if (!updatedData || updatedData.length === 0) {
        throw new Error('ไม่สามารถบันทึกข้อมูลได้ (กรุณาตรวจสอบสิทธิ์ RLS บน profiles)');
      }

      showAlert('สำเร็จ', 'แก้ไขข้อมูลพนักงานเรียบร้อยแล้ว');
      closeModal();
      fetchData();
    } catch (error: any) {
      showAlert('ล้มเหลว', error.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      const confirmLogout = window.confirm("คุณต้องการออกจากระบบใช่หรือไม่?");
      if (confirmLogout) {
        try {
          await supabase.auth.signOut();
        } catch (e) {
          // silent
        } finally {
          localStorage.clear();
          sessionStorage.clear();
          router.replace('/(auth)/login');
        }
      }
    } else {
      Alert.alert("ยืนยัน", "คุณต้องการออกจากระบบใช่หรือไม่?", [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ออกจากระบบ",
          onPress: async () => {
            try {
              await supabase.auth.signOut();
            } catch (e) {
              // silent
            } finally {
              router.replace('/(auth)/login');
            }
          },
          style: "destructive"
        }
      ]);
    }
  };

  const getInitials = (firstName: string) => {
    return firstName ? firstName.charAt(0).toUpperCase() : '?';
  };

  const getRoleBadgeStyle = (role: string) => {
    switch (role) {
      case 'Manager':
        return { container: 'bg-amber-100', text: 'text-amber-700', label: 'ผู้จัดการ' };
      case 'Staff':
        return { container: 'bg-blue-100', text: 'text-blue-700', label: 'เจ้าหน้าที่' };
      case 'Tech':
        return { container: 'bg-green-100', text: 'text-green-700', label: 'ช่างเทคนิค' };
      default:
        return { container: 'bg-slate-100', text: 'text-slate-600', label: 'ลูกค้าทั่วไป' };
    }
  };

  const renderItem = ({ item }: { item: Profile }) => {
    const badge = getRoleBadgeStyle(item.role || 'Customer');

    return (
      <View className="flex-row items-center bg-white p-4 rounded-2xl mb-3 shadow-sm shadow-black/5 border border-slate-100">
        <View className="w-12 h-12 rounded-full bg-red-50 justify-center items-center mr-4">
          <Text className="text-[#D32F2F] text-lg font-bold">{getInitials(item.first_name)}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-800 mb-1" numberOfLines={1}>
            {item.first_name} {item.last_name}
          </Text>
          <View className="flex-row">
            <View className={`px-2.5 py-0.5 rounded-full ${badge.container}`}>
              <Text className={`text-[11px] font-bold ${badge.text}`}>{badge.label}</Text>
            </View>
          </View>
        </View>
        <TouchableOpacity className="p-2 bg-red-50 rounded-lg border border-red-200" onPress={() => openEditModal(item)}>
          <Ionicons name="create-outline" size={22} color="#D32F2F" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#D32F2F]">
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header */}
      <View
        className="flex-row justify-between items-center px-5 pb-4 bg-[#D32F2F]"
        style={{ paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12 }}
      >
        <View>
          <Text className="text-white text-[22px] font-extrabold tracking-[0.5px]">IT VERTEX</Text>
          <Text className="text-white/80 text-xs mt-0.5">ระบบจัดการข้อมูลองค์กร</Text>
        </View>
        <View className="flex-row items-center">
          <View className="items-end mr-3">
            <Text className="text-white text-sm font-semibold">{userName}</Text>
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="shield-checkmark" size={12} color="rgba(255,255,255,0.7)" />
              <Text className="text-white/70 text-[11px] ml-1 font-medium">{userRole}</Text>
            </View>
          </View>
          <TouchableOpacity className="w-[42px] h-[42px] rounded-full bg-white/15 justify-center items-center" onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-1 bg-slate-50">
        {/* Search Section */}
        <View className="px-4 pt-5 pb-2.5">
          <View className="flex-row items-center bg-white rounded-xl border border-slate-200 px-4 h-12 shadow-sm shadow-black/5">
            <Ionicons name="search" size={20} color="#94a3b8" className="mr-2.5" />
            <TextInput
              className="flex-1 h-full text-slate-900 text-[15px]"
              placeholder="ค้นหาชื่อพนักงาน หรือ บทบาทหน้าที่..."
              placeholderTextColor="#94a3b8"
              value={searchText}
              onChangeText={handleSearch}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={20} color="#cbd5e1" className="ml-2.5" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* List Section */}
        <View className="flex-1 px-4">
          <Text className="text-[15px] font-bold text-slate-700 mb-3 mt-2">
            พนักงานและผู้ใช้ในระบบ <Text style={{ color: '#D32F2F' }}>({filteredData.length})</Text>
          </Text>

          {loading ? (
            <View className="flex-1 justify-center items-center">
              <ActivityIndicator size="large" color="#D32F2F" />
              <Text className="mt-3 text-slate-500 text-sm font-medium">กำลังโหลดรายชื่อพนักงาน...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredData}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 40 }}
              showsVerticalScrollIndicator={false}
              refreshing={loading}
              onRefresh={fetchData}
              ListEmptyComponent={
                <View className="flex-1 justify-center items-center mt-[60px]">
                  <Ionicons name="people-outline" size={60} color="#cbd5e1" />
                  <Text className="text-slate-400 text-base mt-3 font-medium">ไม่พบรายชื่อพนักงานที่คุณค้นหา</Text>
                </View>
              }
            />
          )}
        </View>

        {/* Modal สำหรับการอัปเดตสิทธิ์พนักงาน */}
        <Modal visible={isModalVisible} transparent={true} animationType="fade">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 bg-slate-900/50 justify-center items-center"
          >
            <View className="bg-white w-[90%] rounded-[24px] p-6 shadow-md shadow-black/10">
              <View className="flex-row justify-between items-center mb-5">
                <Text className="text-lg font-bold text-[#D32F2F]">จัดการสิทธิ์และชื่อพนักงาน</Text>
                <TouchableOpacity onPress={closeModal}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 mb-2 ml-1">ชื่อจริง</Text>
                <TextInput
                  className="bg-[#faf8f8] border border-slate-200 rounded-xl px-4 h-11 text-sm text-slate-800"
                  value={formFirstName}
                  onChangeText={setFormFirstName}
                  placeholder="กรอกชื่อจริง"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 mb-2 ml-1">นามสกุล</Text>
                <TextInput
                  className="bg-[#faf8f8] border border-slate-200 rounded-xl px-4 h-11 text-sm text-slate-800"
                  value={formLastName}
                  onChangeText={setFormLastName}
                  placeholder="กรอกนามสกุล"
                  placeholderTextColor="#94a3b8"
                />
              </View>

              <View className="mb-4">
                <Text className="text-xs font-bold text-slate-500 mb-2 ml-1">เลือกบทบาทหน้าที่ (Role)</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['Manager', 'Staff', 'Tech', 'Customer'].map((roleOption) => {
                    const isSelected = formRole === roleOption;
                    const badgeInfo = getRoleBadgeStyle(roleOption);
                    return (
                      <TouchableOpacity
                        key={roleOption}
                        className={`flex-1 min-w-[45%] bg-slate-50 border border-slate-200 rounded-xl py-2.5 items-center mb-1.5 ${isSelected ? 'bg-red-50 border-[1.5px] border-[#D32F2F]' : ''}`}
                        onPress={() => setFormRole(roleOption)}
                      >
                        <Text className={`text-[13px] text-slate-600 font-bold ${isSelected ? 'text-[#D32F2F]' : ''}`}>
                          {badgeInfo.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="flex-row justify-between mt-3.5">
                <TouchableOpacity className="flex-1 py-3 rounded-xl bg-slate-100 mr-3 items-center border border-slate-200" onPress={closeModal}>
                  <Text className="text-slate-500 font-bold text-sm">ยกเลิก</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-3 rounded-xl bg-[#D32F2F] items-center justify-center ${isSaving ? 'opacity-70' : ''}`}
                  onPress={saveEmployee}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text className="text-white font-bold text-sm">อัปเดตสิทธิ์</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

      </View>
    </SafeAreaView>
  );
}


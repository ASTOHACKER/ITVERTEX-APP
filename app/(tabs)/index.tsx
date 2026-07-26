import { SafeAreaView } from 'react-native-safe-area-context';
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Platform,
  StatusBar,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { supabase } from '@/lib/supabase';

type DateFilterKey = 'all' | 'today' | 'week' | 'month';

export default function RepairListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [repairs, setRepairs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<DateFilterKey>('all');
  const [techFilter, setTechFilter] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      checkAuth();
      fetchRepairs();
    }, [])
  );

  async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.replace('/(auth)/login');
    }
  }

  const fetchRepairs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('repair_jobs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // silent
      } else if (data) {
        setRepairs(data);
      }
    } catch (err) {
      // silent
    } finally {
      setLoading(false);
    }
  };

  // Get unique technician names
  const technicianNames = [...new Set(
    repairs.map(r => r.technician_name).filter(Boolean)
  )].sort();

  // Date filter helper
  const isInDateRange = (dateStr: string) => {
    if (dateFilter === 'all') return true;
    const date = new Date(dateStr);
    const now = new Date();

    if (dateFilter === 'today') {
      return date.toDateString() === now.toDateString();
    }
    if (dateFilter === 'week') {
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      return date >= monday;
    }
    if (dateFilter === 'month') {
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredRepairs = repairs.filter(item => {
    // Apply status filter
    if (activeFilter && item.status !== activeFilter) return false;

    // Apply date filter
    if (!isInDateRange(item.created_at)) return false;

    // Apply technician filter
    if (techFilter && (item.technician_name || '') !== techFilter) return false;

    // Apply search
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      (item.customer_name || '').toLowerCase().includes(query) ||
      (item.job_number || '').toLowerCase().includes(query) ||
      (item.device_type || '').toLowerCase().includes(query) ||
      (item.brand || '').toLowerCase().includes(query) ||
      (item.model || '').toLowerCase().includes(query) ||
      (item.status || '').toLowerCase().includes(query) ||
      (item.technician_name || '').toLowerCase().includes(query)
    );
  });

  // Status counts for summary cards
  const statusCounts = {
    total: repairs.length,
    pending: repairs.filter(r => r.status === 'รอชำระ').length,
    repairing: repairs.filter(r => r.status === 'กำลังซ่อม').length,
    paid: repairs.filter(r => r.status === 'ชำระแล้ว').length,
    delivered: repairs.filter(r => r.status === 'ส่งมอบแล้ว').length,
    reported: repairs.filter(r => r.status === 'แจ้งปัญหา').length,
    cancelled: repairs.filter(r => r.status === 'ยกเลิก').length,
  };

  const statusFilterMap: { key: string; label: string; count: number; color: string; icon: string }[] = [
    { key: '__total__', label: 'ทั้งหมด', count: statusCounts.total, color: '#334155', icon: 'layers-outline' },
    { key: 'รอชำระ', label: 'รอชำระ', count: statusCounts.pending, color: '#d97706', icon: 'time-outline' },
    { key: 'กำลังซ่อม', label: 'กำลังซ่อม', count: statusCounts.repairing, color: '#0284c7', icon: 'construct-outline' },
    { key: 'ชำระแล้ว', label: 'ชำระแล้ว', count: statusCounts.paid, color: '#16a34a', icon: 'checkmark-circle-outline' },
    { key: 'ส่งมอบแล้ว', label: 'ส่งมอบแล้ว', count: statusCounts.delivered, color: '#7c3aed', icon: 'archive-outline' },
    { key: 'แจ้งปัญหา', label: 'แจ้งปัญหา', count: statusCounts.reported, color: '#64748b', icon: 'alert-circle-outline' },
    { key: 'ยกเลิก', label: 'ยกเลิก', count: statusCounts.cancelled, color: '#dc2626', icon: 'close-circle-outline' },
  ];

  const getStatusCardColor = (status: string) => {
    switch (status) {
      case 'ชำระแล้ว': return '#16a34a';
      case 'รอชำระ': return '#d97706';
      case 'กำลังซ่อม': return '#0284c7';
      case 'ส่งมอบแล้ว': return '#7c3aed';
      case 'ยกเลิก': return '#dc2626';
      case 'แจ้งปัญหา': return '#64748b';
      default: return '#64748b';
    }
  };

  const handleStatusFilter = (statusKey: string) => {
    if (statusKey === '__total__') {
      setActiveFilter(null);
    } else if (activeFilter === statusKey) {
      setActiveFilter(null);
    } else {
      setActiveFilter(statusKey);
    }
  };

  // Technician color mapping
  const techColors = ['#D32F2F', '#0284c7', '#7c3aed', '#16a34a', '#d97706', '#64748b', '#ea580c'];
  const getTechColor = (name: string) => {
    const idx = technicianNames.indexOf(name);
    return techColors[idx % techColors.length];
  };

  const dateFilterOptions: { key: DateFilterKey; label: string }[] = [
    { key: 'all', label: 'ทั้งหมด' },
    { key: 'today', label: 'วันนี้' },
    { key: 'week', label: 'สัปดาห์นี้' },
    { key: 'month', label: 'เดือนนี้' },
  ];

  const hasActiveFilters = dateFilter !== 'all' || techFilter !== null;

  const renderRepairItem = ({ item }: { item: any }) => {
    const formattedDate = new Date(item.created_at).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });
    const isPaid = item.status === 'ชำระแล้ว';
    const techColor = item.technician_name ? getTechColor(item.technician_name) : '#94a3b8';

    return (
      <View style={[styles.cardContainer, { backgroundColor: getStatusCardColor(item.status) }]}>
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <Text style={styles.statusText}>{item.status}</Text>
          <Text style={styles.dateText}>{formattedDate}</Text>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody} className="bg-white dark:bg-slate-800">
          {/* Main Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.deviceName} className="text-slate-800 dark:text-slate-100">{item.brand} {item.model} ({item.device_type})</Text>
            <Text style={styles.repairId}>{item.job_number}</Text>

            <View style={styles.customerInfoRow}>
              <Text style={styles.customerName} className="text-slate-700 dark:text-slate-300">{item.customer_name}</Text>
              <View style={styles.phoneContainer}>
                <Ionicons name="call-outline" size={14} color="#64748b" style={styles.phoneIcon} />
                <Text style={styles.phoneText} className="text-slate-500 dark:text-slate-400">{item.phone}</Text>
              </View>
            </View>
            {/* Technician with color */}
            <View style={styles.techRow}>
              <View style={[styles.techDot, { backgroundColor: techColor }]} />
              <Text style={[styles.technicianText, { color: techColor }]}>
                {item.technician_name || 'ช่างทั่วไป'}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.cardDivider} />

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.detailButton]}
              onPress={() => router.push({ pathname: '/job-detail', params: { jobId: item.id } })}
            >
              <Ionicons name="information-circle-outline" size={16} color="#475569" style={styles.buttonIcon} />
              <Text style={styles.detailButtonText}>รายละเอียด</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: getStatusCardColor(item.status) }]}
              onPress={() => router.push({ pathname: '/receipt', params: { jobId: item.id } })}
            >
              <Ionicons name={isPaid ? "receipt-outline" : "cash-outline"} size={16} color="#ffffff" style={styles.buttonIcon} />
              <Text style={styles.actionButtonText}>{isPaid ? 'ดูใบเสร็จ' : 'ยืนยันเงิน'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} className="flex-1 bg-red-700 dark:bg-slate-900">
      <StatusBar barStyle="light-content" backgroundColor="#D32F2F" />

      {/* Header Section */}
      <View style={styles.header} className="bg-red-700 dark:bg-slate-800 border-b border-transparent dark:border-slate-700">
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.headerTitle}>IT VERTEX</Text>
            <Text style={styles.headerSubtitle}>รายการซ่อม — พนักงาน</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={() => setShowFilterModal(true)} style={[styles.refreshBtn, hasActiveFilters && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
              <Ionicons name="filter" size={20} color="#fff" />
              {hasActiveFilters && <View style={styles.filterActiveDot} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={fetchRepairs} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar inside Header */}
        <View style={styles.searchContainer} className="bg-white dark:bg-slate-700/60 border border-transparent dark:border-slate-600">
          <Ionicons name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            className="text-slate-800 dark:text-slate-100"
            placeholder="ค้นหาชื่อ / เลขซ่อม / อุปกรณ์ / ช่าง..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#cbd5e1" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Container */}
      <View style={styles.container} className="flex-1 bg-slate-50 dark:bg-slate-900">

        {/* Status Summary Cards */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusScrollView}
          contentContainerStyle={styles.statusScrollContent}
        >
          {statusFilterMap.map((sf) => {
            const isActive = sf.key === '__total__' ? activeFilter === null : activeFilter === sf.key;
            return (
              <TouchableOpacity
                key={sf.key}
                className="bg-white dark:bg-slate-800"
                style={[
                  styles.statCard,
                  { borderLeftColor: sf.color },
                  isActive && { backgroundColor: sf.color + '18', borderColor: sf.color },
                ]}
                onPress={() => handleStatusFilter(sf.key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.statCount, { color: sf.color }]}>{sf.count}</Text>
                <Text style={styles.statLabel} className="text-slate-600 dark:text-slate-300">{sf.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Date Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dateScrollView}
          contentContainerStyle={styles.dateScrollContent}
        >
          {dateFilterOptions.map((df) => (
            <TouchableOpacity
              key={df.key}
              style={[
                styles.dateFilterPill,
                dateFilter === df.key && styles.dateFilterPillActive,
              ]}
              onPress={() => setDateFilter(df.key)}
            >
              <Text style={[
                styles.dateFilterText,
                dateFilter === df.key && styles.dateFilterTextActive,
              ]}>{df.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Active Filter Indicator */}
        <View style={styles.listHeader}>
          <Text style={styles.listSummaryText}>
            {activeFilter ? `${activeFilter}  ·  ` : ''}
            {dateFilter !== 'all' ? `${dateFilterOptions.find(d => d.key === dateFilter)?.label}  ·  ` : ''}
            {techFilter ? `ช่าง: ${techFilter}  ·  ` : ''}
            {filteredRepairs.length} รายการ
          </Text>
          {(activeFilter || dateFilter !== 'all' || techFilter) && (
            <TouchableOpacity onPress={() => { setActiveFilter(null); setDateFilter('all'); setTechFilter(null); }} style={styles.clearFilterBtn}>
              <Ionicons name="close-circle" size={16} color="#D32F2F" />
              <Text style={styles.clearFilterText}>ล้างทั้งหมด</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Quick Action: อัปโหลดสลิป */}
        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => router.push('/slips')}
          activeOpacity={0.85}
        >
          <View style={styles.quickCardIcon}>
            <Ionicons name="cloud-upload" size={26} color="#fff" />
          </View>
          <View style={styles.quickCardInfo}>
            <Text style={styles.quickCardTitle}>อัปโหลดสลิปการชำระเงิน</Text>
            <Text style={styles.quickCardSub}>ถ่ายรูปหรือเลือกสลิปจากคลัง</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator size="large" color="#D32F2F" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={filteredRepairs}
            keyExtractor={(item) => item.id}
            renderItem={renderRepairItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={loading}
            onRefresh={fetchRepairs}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="construct-outline" size={60} color="#cbd5e1" />
                <Text style={styles.emptyText}>
                  {activeFilter ? `ไม่พบรายการสถานะ "${activeFilter}"` : 'ยังไม่มีรายการซ่อม'}
                </Text>
                <Text style={styles.emptySubText}>
                  {activeFilter ? 'ลองล้างตัวกรองเพื่อดูทั้งหมด' : 'กดปุ่ม + เพื่อรับเครื่องซ่อมใหม่'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ตัวกรองขั้นสูง</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Technician Filter */}
            <Text style={styles.modalSectionTitle}>กรองตามช่าง</Text>
            <View style={styles.techFilterRow}>
              <TouchableOpacity
                style={[styles.techFilterChip, !techFilter && styles.techFilterChipActive]}
                onPress={() => setTechFilter(null)}
              >
                <Text style={[styles.techFilterText, !techFilter && styles.techFilterTextActive]}>ทั้งหมด</Text>
              </TouchableOpacity>
              {technicianNames.map((name) => (
                <TouchableOpacity
                  key={name}
                  style={[styles.techFilterChip, techFilter === name && styles.techFilterChipActive]}
                  onPress={() => setTechFilter(techFilter === name ? null : name)}
                >
                  <View style={[styles.techChipDot, { backgroundColor: getTechColor(name) }]} />
                  <Text style={[styles.techFilterText, techFilter === name && styles.techFilterTextActive]}>{name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Date Filter */}
            <Text style={[styles.modalSectionTitle, { marginTop: 20 }]}>กรองตามช่วงเวลา</Text>
            <View style={styles.techFilterRow}>
              {dateFilterOptions.map((df) => (
                <TouchableOpacity
                  key={df.key}
                  style={[styles.techFilterChip, dateFilter === df.key && styles.techFilterChipActive]}
                  onPress={() => setDateFilter(df.key)}
                >
                  <Text style={[styles.techFilterText, dateFilter === df.key && styles.techFilterTextActive]}>{df.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#f1f5f9' }]}
                onPress={() => { setTechFilter(null); setDateFilter('all'); }}
              >
                <Text style={{ color: '#64748b', fontWeight: 'bold' }}>ล้างตัวกรอง</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#D32F2F' }]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={{ color: '#fff', fontWeight: 'bold' }}>ตกลง</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#D32F2F',
  },
  header: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 0) + 12 : 12,
    paddingBottom: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800'
  },
  headerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    marginTop: 2
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fbbf24',
    borderWidth: 1.5,
    borderColor: '#D32F2F',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    color: '#1e293b',
    fontSize: 15,
  },
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  statusScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  statusScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
  },
  dateScrollView: {
    flexGrow: 0,
    flexShrink: 0,
  },
  dateScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 10,
    gap: 8,
  },

  // Date Filter Pills
  dateFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  dateFilterPillActive: {
    backgroundColor: '#D32F2F',
    borderColor: '#D32F2F',
  },
  dateFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  dateFilterTextActive: {
    color: '#ffffff',
  },

  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  listSummaryText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  clearFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  clearFilterText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Card Styles
  cardContainer: {
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dateText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
  },
  cardBody: {
    backgroundColor: '#ffffff',
    padding: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 6,
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 2,
  },
  repairId: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 8,
  },
  customerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  customerName: {
    fontSize: 13,
    color: '#475569',
  },
  phoneContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIcon: {
    marginRight: 4,
  },
  phoneText: {
    fontSize: 13,
    color: '#64748b',
  },
  // Technician row with color dot
  techRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  techDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  technicianText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  detailButton: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  detailButtonText: {
    color: '#475569',
    fontSize: 12,
    fontWeight: 'bold',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buttonIcon: {
    marginRight: 4,
  },

  // ── Quick Action Card ──
  quickCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    padding: 14,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
  },
  quickCardIcon: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#D32F2F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  quickCardInfo: { flex: 1 },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 3,
  },
  quickCardSub: {
    fontSize: 12,
    color: '#94a3b8',
  },

  // Empty State
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyText: { color: '#94a3b8', fontSize: 16, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  emptySubText: { color: '#cbd5e1', fontSize: 13, marginTop: 4, textAlign: 'center' },

  // Status Summary Cards
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 96,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCount: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    marginTop: 2,
  },

  // FAB
  fab: {
    position: 'absolute',
    width: 60,
    height: 60,
    alignItems: 'center',
    justifyContent: 'center',
    right: 20,
    bottom: 30,
    backgroundColor: '#D32F2F',
    borderRadius: 30,
    elevation: 8,
    shadowColor: '#D32F2F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },

  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    width: '90%',
    borderRadius: 24,
    padding: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  modalSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 10,
  },
  techFilterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  techFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  techFilterChipActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#D32F2F',
  },
  techChipDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  techFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  techFilterTextActive: {
    color: '#D32F2F',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
});

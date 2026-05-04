import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, Image, TextInput, Modal, RefreshControl, FlatList
} from 'react-native';
import { Colors, Spacing, Radius, FontSize } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { adminApi, messageApi } from '../../services/api';
import { getImageUrl } from '../../utils/image';
import { router } from 'expo-router';

type AdminTab = 'tutors' | 'users' | 'finances' | 'support';

export default function AdminScreen() {
  const [activeTab, setActiveTab] = useState<AdminTab>('tutors');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pendingTutors, setPendingTutors] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [finances, setFinances] = useState<any>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Document Viewer Modal
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerUrl, setViewerUrl] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tutorsRes, usersRes, financesRes, messagesRes] = await Promise.all([
        adminApi.getPendingTutors(),
        adminApi.getAllUsers(),
        adminApi.getFinances(),
        messageApi.getConversations(),
      ]);
      setPendingTutors(tutorsRes.data);
      setUsers(usersRes.data);
      setFinances(financesRes.data);
      setSupportMessages(messagesRes.data);
    } catch (err) {
      console.error('Admin data fetch error:', err);
      Alert.alert('Error', 'Failed to load admin data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleApprove = (id: string, status: 'approve' | 'reject') => {
    Alert.alert(
      `${status === 'approve' ? 'Approve' : 'Reject'} Tutor`,
      `Are you sure you want to ${status} this tutor applicant?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: status === 'approve' ? 'Approve' : 'Reject', 
          style: status === 'reject' ? 'destructive' : 'default',
          onPress: async () => {
            try {
              await adminApi.approveTutor(id, status);
              Alert.alert('Success', `Tutor ${status}d successfully`);
              fetchData();
            } catch (err) {
              Alert.alert('Error', `Failed to ${status} tutor`);
            }
          }
        }
      ]
    );
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUserStatus(userId, { isApproved: !currentStatus });
      fetchData();
    } catch {
      Alert.alert('Error', 'Failed to update user status');
    }
  };

  const openViewer = (url: string) => {
    setViewerUrl(url);
    setViewerVisible(true);
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderStats = () => (
    <View style={styles.statsRow}>
      <View style={styles.statCard}>
        <Text style={styles.statVal}>{pendingTutors.length}</Text>
        <Text style={styles.statLabel}>Pending</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statVal}>{users.length}</Text>
        <Text style={styles.statLabel}>Total Users</Text>
      </View>
      <View style={[styles.statCard, { borderRightWidth: 0 }]}>
        <Text style={[styles.statVal, { color: Colors.success }]}>
          ₦{finances?.platformFees?.toLocaleString() || '0'}
        </Text>
        <Text style={styles.statLabel}>Revenue</Text>
      </View>
    </View>
  );

  const renderPendingTutors = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Tutor Applications</Text>
      {pendingTutors.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="documents-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyText}>No pending applications</Text>
        </View>
      ) : (
        pendingTutors.map(tutor => (
          <View key={tutor._id} style={styles.tutorCard}>
            <View style={styles.tutorHeader}>
              <View>
                <Text style={styles.tutorName}>{tutor.name}</Text>
                <Text style={styles.tutorSub}>{tutor.registrationNumber} • {tutor.faculty}</Text>
              </View>
              <View style={styles.roleBadge}>
                <Text style={styles.roleText}>{tutor.role}</Text>
              </View>
            </View>
            
            <View style={styles.docRow}>
              <TouchableOpacity 
                style={styles.docBtn} 
                onPress={() => tutor.documents?.admissionLetter && openViewer(getImageUrl(tutor.documents.admissionLetter))}
                disabled={!tutor.documents?.admissionLetter}
              >
                <Ionicons name="document-text" size={18} color={tutor.documents?.admissionLetter ? Colors.primary : Colors.border} />
                <Text style={[styles.docBtnText, !tutor.documents?.admissionLetter && { color: Colors.border }]}>Admission Letter</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.docBtn} 
                onPress={() => tutor.documents?.transcript && openViewer(getImageUrl(tutor.documents.transcript))}
                disabled={!tutor.documents?.transcript}
              >
                <Ionicons name="school" size={18} color={tutor.documents?.transcript ? Colors.primary : Colors.border} />
                <Text style={[styles.docBtnText, !tutor.documents?.transcript && { color: Colors.border }]}>Transcript</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleApprove(tutor._id, 'approve')}>
                <Text style={styles.actionBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleApprove(tutor._id, 'reject')}>
                <Text style={[styles.actionBtnText, { color: Colors.danger }]}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))
      )}
    </View>
  );

  const renderUserManagement = () => (
    <View style={styles.section}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={Colors.textMuted} />
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search by name, email or ID..." 
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {filteredUsers.map(u => (
        <View key={u._id} style={styles.userRow}>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{u.name}</Text>
            <Text style={styles.userEmail}>{u.email}</Text>
            <View style={styles.userMeta}>
              <Text style={styles.userRole}>{u.role}</Text>
              <Text style={styles.dot}>•</Text>
              <Text style={[styles.userStatus, { color: u.isApproved ? Colors.success : Colors.danger }]}>
                {u.isApproved ? 'Active' : 'Suspended'}
              </Text>
            </View>
          </View>
          <View style={styles.actionRowVertical}>
            <TouchableOpacity 
              style={[styles.statusToggle, { backgroundColor: u.isApproved ? '#FEE2E2' : '#DCFCE7' }]}
              onPress={() => toggleUserStatus(u._id, u.isApproved)}
              disabled={u.role === 'admin'}
            >
              <Text style={{ color: u.isApproved ? Colors.danger : Colors.success, fontWeight: '700', fontSize: 12 }}>
                {u.isApproved ? 'Suspend' : 'Activate'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.statusToggle, { backgroundColor: '#E0E7FF', marginTop: 6 }]}
              onPress={() => router.push(`/chat/${u._id}`)}
            >
              <Text style={{ color: Colors.primary, fontWeight: '700', fontSize: 12 }}>
                Message
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSupport = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Messages & Support</Text>
      {supportMessages.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="chatbubbles-outline" size={48} color={Colors.border} />
          <Text style={styles.emptyText}>No messages yet.</Text>
        </View>
      ) : (
        supportMessages.map((msg: any) => {
          const partner = msg.partner;
          const lastMsg = msg.lastMessage;
          if (!partner || !lastMsg) return null;
          return (
            <TouchableOpacity key={partner._id} style={styles.userRow} onPress={() => router.push(`/chat/${partner._id}`)}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{partner.name} <Text style={{fontSize: 12, color: Colors.textMuted}}>({partner.role})</Text></Text>
                <Text style={styles.userEmail} numberOfLines={1}>{lastMsg.content}</Text>
              </View>
              <Text style={{ fontSize: 11, color: Colors.textMuted }}>
                {new Date(lastMsg.createdAt).toLocaleDateString()}
              </Text>
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );

  const renderFinances = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Platform Financials</Text>
      <View style={styles.financeGrid}>
        <View style={styles.finBox}>
          <Text style={styles.finLabel}>Total Wallet Balances</Text>
          <Text style={styles.finVal}>₦{finances?.totalWalletBalance?.toLocaleString() || '0'}</Text>
        </View>
        <View style={styles.finBox}>
          <Text style={styles.finLabel}>Funds in Escrow</Text>
          <Text style={[styles.finVal, { color: '#F59E0B' }]}>₦{finances?.totalEscrowBalance?.toLocaleString() || '0'}</Text>
        </View>
        <View style={styles.finBox}>
          <Text style={styles.finLabel}>Admin Revenue</Text>
          <Text style={[styles.finVal, { color: Colors.success }]}>₦{finances?.platformFees?.toLocaleString() || '0'}</Text>
        </View>
        <View style={styles.finBox}>
          <Text style={styles.finLabel}>Recent Transactions</Text>
          <Text style={styles.finVal}>{finances?.recentWalletActivity || 0}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Console</Text>
        <Text style={styles.headerSub}>Manage platform operations</Text>
      </View>

      {renderStats()}

      <View style={styles.tabContainer}>
        {(['tutors', 'users', 'support', 'finances'] as AdminTab[]).map(tab => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabBtn, activeTab === tab && styles.activeTabBtn]} 
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabBtnText, activeTab === tab && styles.activeTabBtnText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeTab === 'tutors' && renderPendingTutors()}
        {activeTab === 'users' && renderUserManagement()}
        {activeTab === 'support' && renderSupport()}
        {activeTab === 'finances' && renderFinances()}
        
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Image Viewer Modal */}
      <Modal visible={viewerVisible} transparent={true} animationType="fade" onRequestClose={() => setViewerVisible(false)}>
        <View style={styles.viewerContainer}>
          <TouchableOpacity style={styles.viewerClose} onPress={() => setViewerVisible(false)}>
            <Ionicons name="close-circle" size={40} color="#fff" />
          </TouchableOpacity>
          <Image source={{ uri: viewerUrl }} style={styles.viewerImg} resizeMode="contain" />
        </View>
      </Modal>

      {loading && !refreshing && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.card, paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary },
  headerSub: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  
  statsRow: { flexDirection: 'row', backgroundColor: Colors.card, paddingVertical: 20, borderBottomWidth: 1, borderBottomColor: Colors.border },
  statCard: { flex: 1, alignItems: 'center', borderRightWidth: 1, borderRightColor: Colors.border },
  statVal: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  statLabel: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  
  tabContainer: { flexDirection: 'row', padding: 12, gap: 8, backgroundColor: Colors.card },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: Radius.pill, alignItems: 'center', backgroundColor: '#F1F5F9' },
  activeTabBtn: { backgroundColor: Colors.primary },
  tabBtnText: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary },
  activeTabBtnText: { color: '#fff' },
  
  content: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 16 },
  
  tutorCard: { backgroundColor: Colors.card, padding: 16, borderRadius: Radius.lg, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  tutorHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tutorName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  tutorSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  roleBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  roleText: { fontSize: 10, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase' },
  
  docRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  docBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFF', padding: 8, borderRadius: Radius.md, borderWidth: 1, borderColor: '#E0E7FF' },
  docBtnText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  
  actionRow: { flexDirection: 'row', gap: 12 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center' },
  approveBtn: { backgroundColor: Colors.success },
  rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  actionBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, paddingHorizontal: 12, paddingVertical: 10, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  
  userRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.card, padding: 16, borderRadius: Radius.md, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  userInfo: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  userEmail: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  userMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 6 },
  userRole: { fontSize: 11, color: Colors.primary, fontWeight: '700' },
  dot: { fontSize: 12, color: Colors.border },
  userStatus: { fontSize: 11, fontWeight: '700' },
  statusToggle: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  actionRowVertical: { flexDirection: 'column', gap: 4 },
  
  financeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  finBox: { width: '48%', backgroundColor: Colors.card, padding: 16, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border },
  finLabel: { fontSize: 11, color: Colors.textMuted, marginBottom: 8 },
  finVal: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  
  emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.5 },
  emptyText: { marginTop: 12, color: Colors.textMuted, fontWeight: '600' },
  
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.7)', justifyContent: 'center', alignItems: 'center' },
  viewerContainer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  viewerClose: { position: 'absolute', top: 50, right: 30, zIndex: 10 },
  viewerImg: { width: '100%', height: '80%' }
});

import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl,
  Image, ImageBackground
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { userApi, notificationApi } from '../../services/api';
import { Colors, Spacing, Radius, FontSize } from '../../constants/Colors';
import { getImageUrl } from '../../utils/image';

export default function HomeScreen() {
  const { user, logout } = useAuth();
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const POPULAR_COURSES = ['MATH101', 'COEN201', 'PHYS201', 'STAT101', 'CHEM101', 'EEE301'];

  const fetchTutors = async () => {
    try {
      const res = await userApi.getTutors();
      setTutors(res.data.slice(0, 6));
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationApi.getNotifications();
      const unread = res.data.filter((n: any) => !n.read).length;
      setUnreadCount(unread);
    } catch {}
  };

  useEffect(() => { 
    fetchTutors(); 
    fetchUnreadCount();
  }, []);

  const tuteePhoto = user?.documents?.profilePicture;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTutors(); fetchUnreadCount(); }} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0]} 👋</Text>
          <Text style={styles.subGreeting}>
            {user?.role === 'tutor' || user?.role === 'verified_tutor' ? 'Manage your sessions and earnings' : 'Find your perfect tutor today'}
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => {
              setUnreadCount(0); // optimistically clear
              router.push('/notifications');
            }}
          >
            <Ionicons name="notifications" size={20} color="#fff" />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', top: 10, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.danger, borderWidth: 1.5, borderColor: Colors.primary }} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.avatar} onPress={() => router.push('/(tabs)/profile')}>
            {tuteePhoto ? (
              <Image source={{ uri: getImageUrl(tuteePhoto) }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{user?.name?.charAt(0)}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* AI Match Banner */}
      {user?.role === 'tutee' && (
        <TouchableOpacity style={styles.aiBanner} onPress={() => router.push('/(tabs)/ai-match')}>
          <View style={styles.aiBannerContent}>
            <View style={styles.aiLabel}>
              <Text style={styles.aiLabelText}>POWERED BY AI</Text>
            </View>
            <Text style={styles.aiBannerTitle}>✨ Smart Tutor Match</Text>
            <Text style={styles.aiBannerSubtitle}>Describe your learning needs and get matched instantly</Text>
          </View>
          <Ionicons name="sparkles" size={32} color="rgba(255,255,255,0.4)" />
        </TouchableOpacity>
      )}

      {/* Popular Courses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular Courses</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: Spacing.md }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {POPULAR_COURSES.map(c => (
              <TouchableOpacity
                key={c}
                style={styles.courseChip}
                onPress={() => router.push({ pathname: '/(tabs)/tutors', params: { q: c } })}
              >
                <Text style={styles.courseChipText}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Featured Tutors */}
      <View style={styles.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={styles.sectionTitle}>Featured Tutors</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/tutors')}>
            <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: '800' }}>See all</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
        ) : (
          tutors.map(tutor => (
            <TouchableOpacity
              key={tutor._id}
              style={styles.tutorCard}
              onPress={() => router.push({ pathname: '/tutor/[id]', params: { id: tutor._id } })}
            >
              <View style={styles.tutorAvatar}>
                {tutor.documents?.profilePicture ? (
                  <Image source={{ uri: getImageUrl(tutor.documents.profilePicture) }} style={styles.tutorAvatarImg} />
                ) : (
                  <Text style={styles.tutorAvatarText}>{tutor.name?.charAt(0)}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.tutorName}>
                    {tutor.name} {tutor.role === 'verified_tutor' && <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />}
                  </Text>
                  {tutor.averageRating ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="star" size={12} color={Colors.warning} />
                      <Text style={{ fontSize: 12, fontWeight: '700', marginLeft: 2, color: Colors.textPrimary }}>{tutor.averageRating}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.tutorFaculty}>{tutor.faculty || 'ABU Tutor'} · {tutor.level}</Text>
                {tutor.courses?.length > 0 && (
                  <View style={styles.miniTagRow}>
                    {tutor.courses.slice(0, 2).map((c: string) => (
                      <View key={c} style={styles.miniTag}><Text style={styles.miniTagText}>{c}</Text></View>
                    ))}
                    {tutor.courses.length > 2 && <Text style={{ fontSize: 10, color: Colors.textMuted }}>+{tutor.courses.length - 2}</Text>}
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.border} />
            </TouchableOpacity>
          ))
        )}
      </View>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: 64,
    paddingBottom: 40,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  greeting: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '900' },
  subGreeting: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  avatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  iconBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 18 },
  
  aiBanner: {
    margin: Spacing.lg,
    marginTop: -25,
    backgroundColor: Colors.secondary,
    borderRadius: Radius.xl,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  aiBannerContent: { flex: 1, marginRight: 15 },
  aiLabel: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4, alignSelf: 'flex-start', marginBottom: 8 },
  aiLabelText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  aiBannerTitle: { color: '#fff', fontWeight: '900', fontSize: 20 },
  aiBannerSubtitle: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, lineHeight: 18 },
  
  section: { paddingHorizontal: Spacing.lg, paddingTop: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  
  courseChip: {
    backgroundColor: '#fff',
    borderRadius: Radius.pill,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#eee',
  },
  courseChipText: { color: Colors.textPrimary, fontWeight: '700', fontSize: 14 },
  
  tutorCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  tutorAvatar: {
    width: 56, height: 56, borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  tutorAvatarImg: { width: '100%', height: '100%' },
  tutorAvatarText: { color: Colors.primary, fontWeight: '900', fontSize: 20 },
  tutorName: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  tutorFaculty: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  miniTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  miniTag: { backgroundColor: '#F0F9FF', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  miniTagText: { fontSize: 10, color: '#0369A1', fontWeight: '800' },
});


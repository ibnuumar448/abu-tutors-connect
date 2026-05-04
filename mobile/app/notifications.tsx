import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  TouchableOpacity, ActivityIndicator, RefreshControl
} from 'react-native';
import { notificationApi } from '../services/api';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, FontSize } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getNotifications();
      setNotifications(res.data);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const markRead = async (id: string) => {
    try {
      await notificationApi.markRead(id);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, read: true } : n)
      );
    } catch { }
  };

  const markAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch { }
  };

  const handlePressNotification = (item: any) => {
    if (!item.read) markRead(item._id);
    
    if (item.type?.includes('session')) {
      router.push('/(tabs)/sessions');
    } else if (item.type?.includes('payment') || item.type?.includes('wallet')) {
      router.push('/wallet');
    } else if (item.type?.includes('message')) {
      router.push('/(tabs)/messages');
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'session_booked': return { name: 'calendar', color: Colors.primary };
      case 'session_started': return { name: 'play-circle', color: Colors.accent };
      case 'session_completed': return { name: 'checkmark-circle', color: Colors.success };
      case 'session_cancelled': return { name: 'close-circle', color: Colors.danger };
      case 'payment': return { name: 'wallet', color: Colors.warning };
      default: return { name: 'notifications', color: Colors.textSecondary };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xxl }} color={Colors.primary} size="large" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item._id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
          renderItem={({ item }) => {
            const icon = getIcon(item.type);
            return (
              <TouchableOpacity
                style={[styles.notifCard, !item.read && styles.notifCardUnread]}
                onPress={() => handlePressNotification(item)}
              >
                <View style={[styles.notifIcon, { backgroundColor: icon.color + '20' }]}>
                  <Ionicons name={icon.name as any} size={22} color={icon.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.notifTitle}>{item.title || 'Notification'}</Text>
                  <Text style={styles.notifMessage}>{item.message}</Text>
                  <Text style={styles.notifTime}>
                    {new Date(item.createdAt).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                  </Text>
                </View>
                {!item.read && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, flexDirection: 'row',
    alignItems: 'center', paddingTop: 52, padding: Spacing.lg, gap: Spacing.md,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { flex: 1, color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radius.full,
  },
  markAllText: { color: '#fff', fontSize: FontSize.xs, fontWeight: '700' },
  notifCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
    backgroundColor: Colors.card, padding: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  notifCardUnread: { backgroundColor: Colors.primaryLight },
  notifIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  notifTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  notifMessage: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 4 },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
});

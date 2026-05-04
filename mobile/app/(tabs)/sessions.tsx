import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { sessionApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import VerificationModal from '../../components/VerificationModal';
import SessionTimer from '../../components/SessionTimer';

const STATUS_COLOR: Record<string, string> = {
  pending: Colors.warning,
  active: Colors.primary,
  completed: Colors.success,
  cancelled: Colors.danger,
};

export default function SessionsScreen() {
  const { user, socket } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const isTutor = user?.role === 'tutor' || user?.role === 'verified_tutor';

  // Verification Modal State
  const [verifying, setVerifying] = useState({
    isOpen: false,
    mode: 'generate' as 'generate' | 'scan',
    qrData: '',
    pin: '',
    title: '',
    sessionId: '',
    step: 'start' as 'start' | 'complete'
  });

  // Review Modal State
  const [reviewing, setReviewing] = useState({
    isOpen: false,
    sessionId: '',
    tutorName: '',
    rating: 0,
    reviewText: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  const handleSyncUpdate = (id: string, data: any) => {
    if (data.isComplete) {
      fetchSessions();
    }
  };

  const fetchSessions = useCallback(async () => {
    try {
      const res = await sessionApi.getSessions();
      const sorted = res.data.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSessions(sorted);
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { 
    fetchSessions(); 
    if (socket) {
      socket.on('session_update', (data: any) => {
        fetchSessions();
        // If the session status changed, close any open verification modal
        if (data && (data.status === 'active' || data.status === 'completed')) {
          setVerifying(prev => ({ ...prev, isOpen: false }));
        }
        if (data && data.status === 'completed' && !isTutor) {
          setReviewing({
            isOpen: true,
            sessionId: data._id,
            tutorName: data.tutorId?.name || 'Tutor',
            rating: 0,
            reviewText: ''
          });
        }
      });
      return () => {
        socket.off('session_update');
      };
    }
  }, [fetchSessions, socket]);

  const handleCancel = (id: string) => {
    Alert.alert('Cancel Session', 'Are you sure you want to cancel this session?', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Session', style: 'destructive',
        onPress: async () => {
          setCancellingId(id);
          try {
            await sessionApi.cancelSession(id);
            await fetchSessions();
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.message || 'Could not cancel session.');
          } finally {
            setCancellingId(null);
          }
        }
      }
    ]);
  };

  const handleReviewSubmit = async () => {
    if (reviewing.rating < 1) {
      Alert.alert('Error', 'Please select a rating from 1 to 5 stars.');
      return;
    }
    setSubmittingReview(true);
    try {
      await sessionApi.reviewSession(reviewing.sessionId, { 
        rating: reviewing.rating, 
        reviewText: reviewing.reviewText 
      });
      Alert.alert('Success', 'Thank you for your feedback!');
      setReviewing({ isOpen: false, sessionId: '', tutorName: '', rating: 0, reviewText: '' });
      fetchSessions();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const openVerifyModal = (session: any, step: 'start' | 'complete') => {
    setVerifying({
      isOpen: true,
      mode: isTutor ? 'scan' : 'generate',
      qrData: step === 'start' ? session.startQRCodeData : session.completionQRCodeData,
      pin: step === 'start' ? session.startPIN : session.completionPIN,
      title: `${step === 'start' ? 'Start' : 'Finish'} Session Verification`,
      sessionId: session._id,
      step: step
    });
  };

  const handleVerifySubmit = async (data: string) => {
    if (!verifying.sessionId || !verifying.step) return;
    try {
      if (verifying.step === 'start') {
        await sessionApi.startSession(verifying.sessionId, data);
      } else {
        await sessionApi.completeSession(verifying.sessionId, data);
      }
      Alert.alert('Success', `Session ${verifying.step === 'start' ? 'started' : 'completed'} successfully!`);
      await fetchSessions();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Verification failed.');
    } finally {
      setVerifying(prev => ({ ...prev, isOpen: false }));
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Sessions</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing.xxl }} color={Colors.primary} size="large" />
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={item => item._id}
          contentContainerStyle={{ padding: Spacing.md }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchSessions(); }} tintColor={Colors.primary} />}
          ListHeaderComponent={
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Ionicons name="time-outline" size={24} color={Colors.warning} />
                <Text style={[styles.statValue, { color: Colors.warning }]}>
                  {sessions.filter(s => s.status === 'pending').length}
                </Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="close-circle-outline" size={24} color={Colors.danger} />
                <Text style={[styles.statValue, { color: Colors.danger }]}>
                  {sessions.filter(s => s.status === 'cancelled').length}
                </Text>
                <Text style={styles.statLabel}>Cancelled</Text>
              </View>
              <View style={styles.statCard}>
                <Ionicons name="checkmark-circle-outline" size={24} color={Colors.success} />
                <Text style={[styles.statValue, { color: Colors.success }]}>
                  {sessions.filter(s => s.status === 'completed').length}
                </Text>
                <Text style={styles.statLabel}>Completed</Text>
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyTitle}>No sessions yet</Text>
              <Text style={styles.emptyText}>Book a session with a tutor to get started.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const otherParty = isTutor ? item.tuteeId : item.tutorId;
            const canCancel = item.status === 'pending' || item.status === 'active';
            const statusColor = STATUS_COLOR[item.status || ''] || Colors.textMuted;
            return (
              <View style={styles.sessionCard}>
                <View style={styles.sessionTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionTopic}>{item.topic || 'Tutoring Session'}</Text>
                    <Text style={styles.sessionWith}>
                      {isTutor ? 'Student' : 'Tutor'}: {otherParty?.name || '—'}
                    </Text>
                    {item.date ? (
                      <View style={styles.metaRow}>
                        <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
                        <Text style={styles.metaText}>
                          {new Date(item.date).toLocaleDateString('en-NG', { dateStyle: 'medium' })}
                        </Text>
                        <Ionicons name="time-outline" size={13} color={Colors.textMuted} style={{ marginLeft: 8 }} />
                        <Text style={styles.metaText}>{item.durationMinutes || 60} min</Text>
                      </View>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '22' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {item.status?.toUpperCase() || 'UNKNOWN'}
                    </Text>
                  </View>
                </View>

                {item.status === 'active' && (
                  <SessionTimer session={item} onSync={handleSyncUpdate} />
                )}

                {/* Actions */}
                <View style={styles.actionRow}>
                  {item.status === 'pending' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                      onPress={() => openVerifyModal(item, 'start')}
                    >
                      <Text style={styles.actionBtnText}>{isTutor ? 'Scan to Start' : 'Show Start QR'}</Text>
                    </TouchableOpacity>
                  )}
                  {item.status === 'active' && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: Colors.success }]}
                      onPress={() => openVerifyModal(item, 'complete')}
                    >
                      <Text style={styles.actionBtnText}>{isTutor ? 'Scan to Finish' : 'Show Finish QR'}</Text>
                    </TouchableOpacity>
                  )}
                  {canCancel && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: Colors.danger + '11', borderWidth: 1, borderColor: Colors.danger + '44' }]}
                      onPress={() => handleCancel(item._id)}
                      disabled={cancellingId === item._id}
                    >
                      {cancellingId === item._id
                        ? <ActivityIndicator color={Colors.danger} size="small" />
                        : <Text style={[styles.actionBtnText, { color: Colors.danger }]}>✕ Cancel</Text>
                      }
                    </TouchableOpacity>
                  )}
                  {item.status === 'completed' && !isTutor && !item.tuteeRating && (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: Colors.warning }]}
                      onPress={() => setReviewing({ isOpen: true, sessionId: item._id, tutorName: otherParty?.name || 'Tutor', rating: 0, reviewText: '' })}
                    >
                      <Text style={[styles.actionBtnText, { color: '#000' }]}>⭐ Rate Tutor</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
        />
      )}

      <VerificationModal
        isOpen={verifying.isOpen}
        onClose={() => setVerifying({ ...verifying, isOpen: false })}
        mode={verifying.mode as any}
        qrData={verifying.qrData}
        pin={verifying.pin}
        title={verifying.title}
        onScanSuccess={handleVerifySubmit}
        onPinSubmit={handleVerifySubmit}
      />

      {/* Review Modal for Tutees */}
      <Modal visible={reviewing.isOpen} transparent animationType="slide">
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled" style={{ width: '100%' }}>
            <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate {reviewing.tutorName}</Text>
            <Text style={{ textAlign: 'center', marginBottom: 20, color: Colors.textSecondary }}>
              How was your session? Your feedback helps us maintain quality.
            </Text>
            
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(star => (
                <TouchableOpacity key={star} onPress={() => setReviewing(prev => ({ ...prev, rating: star }))}>
                  <Ionicons 
                    name={star <= reviewing.rating ? "star" : "star-outline"} 
                    size={40} 
                    color={star <= reviewing.rating ? Colors.warning : Colors.border} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.reviewInput}
              placeholder="Leave a review (optional)..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={4}
              value={reviewing.reviewText}
              onChangeText={(text) => setReviewing(prev => ({ ...prev, reviewText: text }))}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border }]}
                onPress={() => setReviewing(prev => ({ ...prev, isOpen: false }))}
              >
                <Text style={{ color: Colors.textPrimary, fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionBtn, { backgroundColor: Colors.primary }]}
                onPress={handleReviewSubmit}
                disabled={submittingReview}
              >
                {submittingReview ? <ActivityIndicator color="#fff" /> : <Text style={styles.actionBtnText}>Submit Rating</Text>}
              </TouchableOpacity>
            </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52, padding: Spacing.lg, paddingBottom: Spacing.xl,
  },
  title: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  sessionCard: {
    backgroundColor: Colors.card, borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.sm,
    borderWidth: 1, borderColor: Colors.border,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  sessionTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  sessionTopic: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  sessionWith: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontSize: FontSize.xs, color: Colors.textMuted },
  statusBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: FontSize.xs, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flex: 1, paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.xs },
  empty: { alignItems: 'center', paddingTop: Spacing.xxl },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary, marginBottom: 4 },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.card, borderRadius: Radius.lg,
    padding: Spacing.md, alignItems: 'center',
    borderWidth: 1, borderColor: Colors.border,
    elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  statValue: { fontSize: 24, fontWeight: '900', marginVertical: 4 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', padding: 24, borderRadius: Radius.lg, width: '100%' },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', textAlign: 'center', marginBottom: 8, color: Colors.textPrimary },
  reviewInput: { borderWidth: 1, borderColor: Colors.border, borderRadius: Radius.md, padding: 12, height: 100, textAlignVertical: 'top', fontSize: FontSize.md },
});

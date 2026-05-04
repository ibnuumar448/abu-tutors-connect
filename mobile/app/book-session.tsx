import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, StyleSheet,
  TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  FlatList
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { sessionApi, userApi, adminApi } from '../services/api';
import { Colors, Spacing, Radius, FontSize } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function BookSessionScreen() {
  const { tutorId, tutorName } = useLocalSearchParams<{ tutorId: string; tutorName: string }>();
  const [tutor, setTutor] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  
  // Form State
  const [topic, setTopic] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('Online / Personal Choice');
  const [lockExpiry, setLockExpiry] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (!tutorId) return;
    try {
      const [tutorRes, venuesRes] = await Promise.all([
        userApi.getTutorById(tutorId),
        adminApi.getVenues()
      ]);
      setTutor(tutorRes.data);
      const activeVenues = venuesRes.data.filter((v: any) => v.isActive);
      setVenues(activeVenues);
      if (activeVenues.length > 0) {
        setSelectedVenue(activeVenues[0].name);
      }
    } catch (err: any) {
      Alert.alert('Error', 'Failed to load tutor availability or venues.');
    } finally {
      setLoading(false);
    }
  }, [tutorId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSlotSelect = async (day: string, slot: string) => {
    const targetDate = new Date();
    const dayMap: any = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
    const targetDay = dayMap[day];
    const currentDay = targetDate.getDay();
    let diff = targetDay - currentDay;
    if (diff <= 0) diff += 7;
    targetDate.setDate(targetDate.getDate() + diff);
    
    const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
    const timeStr = slot;

    // Lock Slot
    try {
      const res = await sessionApi.lockSlot({ 
        tutorId: tutorId as string, 
        slot: `${dateStr}T${timeStr}` 
      });
      setLockExpiry(new Date(res.data.expiresAt));
      setSelectedDate(dateStr);
      setSelectedTime(timeStr);
      Alert.alert('Slot Locked', 'This slot is held for you for 5 minutes. Please complete the booking.');
    } catch (err: any) {
      Alert.alert('Slot Unavailable', err.response?.data?.message || 'This slot is already taken or locked.');
    }
  };

  const handleBook = async () => {
    if (!topic.trim()) {
      Alert.alert('Required', 'Please enter a topic for the session.');
      return;
    }
    if (!selectedDate || !selectedTime) {
      Alert.alert('Required', 'Please select an available slot from the matrix.');
      return;
    }

    setBooking(true);
    try {
      await sessionApi.bookSession({
        tutorId: tutorId as string,
        topic: topic.trim(),
        date: selectedDate,
        time: selectedTime,
        venue: selectedVenue,
        amount: tutor?.hourlyRate || 500,
        durationMinutes: 60 // Default to 1 hour slots as per matrix
      });

      Alert.alert(
        'Success! 🎉',
        'Booking confirmed! Payment held in escrow.',
        [{ text: 'View Sessions', onPress: () => router.replace('/(tabs)/sessions') }]
      );
    } catch (err: any) {
      Alert.alert('Booking Failed', err.response?.data?.message || 'Could not complete booking.');
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={{ marginTop: 12, color: Colors.textMuted }}>Loading availability...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Schedule Session</Text>
            <Text style={styles.headerSub}>with {tutorName}</Text>
          </View>
        </View>

        <View style={styles.content}>
          {/* Availability Matrix */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Select Availability</Text>
            {(!tutor?.availability || tutor.availability.length === 0) ? (
              <Text style={styles.emptyText}>Tutor hasn't set their availability yet.</Text>
            ) : (
              tutor.availability.map((avail: any, idx: number) => {
                const dayMap: any = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
                const targetDate = new Date();
                const targetDay = dayMap[avail.day];
                const currentDay = targetDate.getDay();
                let diff = targetDay - currentDay;
                if (diff <= 0) diff += 7;
                targetDate.setDate(targetDate.getDate() + diff);
                const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

                return (
                  <View key={idx} style={styles.dayGroup}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <Text style={styles.dayTitle}>{avail.day}</Text>
                      <Text style={{ fontSize: 12, color: Colors.textMuted }}>{targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</Text>
                    </View>
                    <View style={styles.slotsGrid}>
                      {avail.slots.map((slot: string) => {
                        const fullSlot = `${dateStr}T${slot}`;
                        const isOccupied = tutor.occupiedSlots?.includes(fullSlot);
                        const isSelected = selectedTime === slot && selectedDate === dateStr;
                        
                        return (
                          <TouchableOpacity 
                            key={slot} 
                            disabled={isOccupied}
                            style={[
                                styles.slotBtn, 
                                isSelected && styles.slotBtnActive,
                                isOccupied && { backgroundColor: '#f0f0f0', borderColor: '#e0e0e0' }
                            ]}
                            onPress={() => handleSlotSelect(avail.day, slot)}
                          >
                            <Text style={[
                                styles.slotText, 
                                isSelected && styles.slotTextActive,
                                isOccupied && { color: '#bbb', textDecorationLine: 'line-through' }
                            ]}>{slot}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}

            {selectedDate !== '' && (
              <View style={styles.selectionSummary}>
                <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
                <Text style={styles.selectionText}>
                  Selected: {new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} at {selectedTime}
                </Text>
              </View>
            )}
          </View>

          {/* Booking Details */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Booking Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Venue</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                {[...venues.map(v => v.name), 'Online / Personal Choice'].map(v => (
                  <TouchableOpacity 
                    key={v} 
                    style={[styles.venueChip, selectedVenue === v && styles.venueChipActive]}
                    onPress={() => setSelectedVenue(v)}
                  >
                    <Text style={[styles.venueChipText, selectedVenue === v && styles.venueChipTextActive]}>{v}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Topic / Focus Area</Text>
              <TextInput 
                style={styles.input}
                value={topic}
                onChangeText={setTopic}
                placeholder="What do you need help with?"
                placeholderTextColor={Colors.textMuted}
                multiline
              />
            </View>

            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Session Fee (1hr)</Text>
              <Text style={styles.feeValue}>₦{tutor?.hourlyRate || 500}</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.bookBtn, (booking || !selectedDate) && styles.bookBtnDisabled]} 
            onPress={handleBook}
            disabled={booking || !selectedDate}
          >
            {booking ? <ActivityIndicator color="#fff" /> : <Text style={styles.bookBtnText}>Confirm & Book</Text>}
          </TouchableOpacity>
          
          <Text style={styles.disclaimer}>
            Funds will be held in escrow and released only after you verify the session.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center',
    paddingTop: 52, padding: Spacing.lg, gap: Spacing.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerContent: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, marginTop: 2 },
  content: { padding: Spacing.md },
  card: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg,
    marginBottom: Spacing.md, elevation: 2, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4,
    borderWidth: 1, borderColor: Colors.border,
  },
  sectionTitle: { fontSize: FontSize.md, fontWeight: '800', color: Colors.textPrimary, marginBottom: Spacing.md },
  dayGroup: { marginBottom: Spacing.md },
  dayTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary, marginBottom: 8 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotBtn: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: '#fcfcfc',
  },
  slotBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  slotText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600' },
  slotTextActive: { color: '#fff' },
  emptyText: { textAlign: 'center', color: Colors.textMuted, marginVertical: 20 },
  selectionSummary: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.success + '11', padding: 12, borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  selectionText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: '700' },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.inputBg, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, fontSize: FontSize.sm, color: Colors.textPrimary, minHeight: 80, textAlignVertical: 'top'
  },
  venueChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.pill,
    backgroundColor: '#f0f0f0', marginRight: 8, borderWidth: 1, borderColor: 'transparent'
  },
  venueChipActive: { backgroundColor: Colors.secondaryLight, borderColor: Colors.secondary },
  venueChipText: { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  venueChipTextActive: { color: Colors.secondary, fontWeight: '700' },
  feeRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  feeLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '600' },
  feeValue: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.primary },
  bookBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md + 2,
    alignItems: 'center', justifyContent: 'center', height: 56,
  },
  bookBtnDisabled: { opacity: 0.6 },
  bookBtnText: { color: '#fff', fontSize: FontSize.lg, fontWeight: '800' },
  disclaimer: { textAlign: 'center', color: Colors.textMuted, fontSize: 11, marginTop: 12, lineHeight: 16 },
});

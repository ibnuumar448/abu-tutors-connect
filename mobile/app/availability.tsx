import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  TouchableOpacity, ActivityIndicator, Alert, TextInput,
  Modal, Platform, KeyboardAvoidingView
} from 'react-native';
import { router } from 'expo-router';
import { userApi } from '../services/api';
import { Colors, Spacing, Radius, FontSize } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function AvailabilityScreen() {
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState<any[]>([]);
  const [newDay, setNewDay] = useState('Monday');
  const [newSlot, setNewSlot] = useState('09:00');
  const [saving, setSaving] = useState(false);
  
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await userApi.getProfile();
      setAvailability(res.data.availability || []);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const addSlot = () => {
    const existingDay = availability.find(a => a.day === newDay);
    if (existingDay) {
      if (existingDay.slots.includes(newSlot)) return;
      const updated = availability.map(a => a.day === newDay ? { ...a, slots: [...a.slots, newSlot].sort() } : a);
      setAvailability(updated);
    } else {
      setAvailability([...availability, { day: newDay, slots: [newSlot] }]);
    }
  };

  const removeSlot = (day: string, slot: string) => {
    const updated = availability.map(a => {
      if (a.day === day) {
        return { ...a, slots: a.slots.filter((s: string) => s !== slot) };
      }
      return a;
    }).filter(a => a.slots.length > 0);
    setAvailability(updated);
  };

  const handleUpdateAvailability = async () => {
    setSaving(true);
    try {
      await userApi.updateProfileData({ availability });
      Alert.alert('Success', 'Availability matrix updated!');
      router.back();
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const TIMES = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: Colors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Manage Availability</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.section}>
          <View style={styles.availCard}>
            <Text style={styles.availSub}>Your slots will now persist weekly. Treating it like your free time - it won't disappear after bookings!</Text>
            
            <View style={styles.addSlotRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Day (Dropdown)</Text>
                <TouchableOpacity style={styles.pickerFake} onPress={() => setShowDayPicker(true)}>
                  <Text style={styles.pickerText}>{newDay}</Text>
                  <Ionicons name="chevron-down" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Time (Wheel)</Text>
                <TouchableOpacity style={styles.pickerFake} onPress={() => setShowTimePicker(true)}>
                  <Text style={styles.pickerText}>{newSlot}</Text>
                  <Ionicons name="time-outline" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.addBtn} onPress={addSlot}>
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.slotsList}>
              {availability.map((avail, idx) => (
                <View key={idx} style={styles.dayGroup}>
                  <Text style={styles.dayGroupTitle}>{avail.day}</Text>
                  <View style={styles.slotsGrid}>
                    {avail.slots.map((slot: string) => (
                      <View key={slot} style={styles.slotTag}>
                        <Text style={styles.slotTagText}>{slot}</Text>
                        <TouchableOpacity onPress={() => removeSlot(avail.day, slot)}>
                          <Ionicons name="close-circle" size={16} color={Colors.danger} />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
              {availability.length === 0 && (
                <Text style={styles.emptySlotsText}>No availability slots added yet.</Text>
              )}
            </View>

            <TouchableOpacity 
              style={[styles.saveBtn, saving && { opacity: 0.7 }]} 
              onPress={handleUpdateAvailability}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Availability Matrix</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Day Picker Modal */}
        <SelectionModal
          visible={showDayPicker}
          title="Select Day"
          items={DAYS.map(d => ({ label: d, value: d }))}
          selectedValue={newDay}
          onSelect={(val: string) => setNewDay(val)}
          onClose={() => setShowDayPicker(false)}
        />

        {/* Time Picker Modal */}
        <SelectionModal
          visible={showTimePicker}
          title="Select Start Time"
          items={TIMES.map(t => ({ label: t, value: t }))}
          selectedValue={newSlot}
          onSelect={(val: string) => setNewSlot(val)}
          onClose={() => setShowTimePicker(false)}
        />

        <View style={{ height: 100 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SelectionModal({ visible, title, items, selectedValue, onSelect, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ maxHeight: 300 }}>
            {items.map((item: any) => (
              <TouchableOpacity 
                key={item.value} 
                style={[styles.modalItem, selectedValue === item.value && styles.modalItemActive]}
                onPress={() => { onSelect(item.value); onClose(); }}
              >
                <Text style={[styles.modalItemText, selectedValue === item.value && styles.modalItemTextActive]}>{item.label}</Text>
                {selectedValue === item.value && <Ionicons name="checkmark" size={20} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 52, padding: Spacing.md, paddingBottom: Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  section: { padding: Spacing.md },
  availCard: {
    backgroundColor: '#fff', borderRadius: Radius.lg, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border,
  },
  availSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.lg },
  addSlotRow: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', marginBottom: Spacing.lg },
  fieldLabel: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  pickerFake: { 
    height: 48, backgroundColor: Colors.inputBg, borderRadius: Radius.md, 
    borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', 
    justifyContent: 'space-between', paddingHorizontal: 12 
  },
  pickerText: { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600' },
  addBtn: {
    width: 48, height: 48, borderRadius: Radius.md, backgroundColor: Colors.secondary,
    alignItems: 'center', justifyContent: 'center', marginTop: 18,
  },
  slotsList: { marginTop: Spacing.md },
  dayGroup: { marginBottom: Spacing.md },
  dayGroupTitle: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.primary, marginBottom: 8 },
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  slotTag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.primary + '33',
  },
  slotTagText: { fontSize: FontSize.xs, color: Colors.primary, fontWeight: '700' },
  emptySlotsText: { textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.sm, marginVertical: 20 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg, padding: Spacing.md,
    alignItems: 'center', marginTop: Spacing.lg,
  },
  saveBtnText: { color: '#fff', fontSize: FontSize.base, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#fff', borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, padding: Spacing.lg },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  modalTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.textPrimary },
  modalItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.border + '44' },
  modalItemActive: { borderBottomColor: Colors.primary },
  modalItemText: { fontSize: FontSize.md, color: Colors.textPrimary },
  modalItemTextActive: { color: Colors.primary, fontWeight: '700' },
});

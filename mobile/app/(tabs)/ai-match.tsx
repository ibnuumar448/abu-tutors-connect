import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import { matchApi } from '../../services/api';
import { Colors, Spacing, Radius, FontSize } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export default function AIMatchScreen() {
  const [course, setCourse] = useState('');
  const [problem, setProblem] = useState('');
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleMatch = async () => {
    if (!course.trim() || !problem.trim()) {
      Alert.alert('Required', 'Please enter both a course code and describe your problem.');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await matchApi.requestMatch(course.trim().toUpperCase(), problem.trim(), budget.trim());
      setResult(res.data);
    } catch (err: any) {
      Alert.alert('Match Failed', err.response?.data?.message || 'Could not find a match. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="sparkles" size={28} color="#fff" />
          <Text style={styles.headerTitle}>AI Tutor Match</Text>
          <Text style={styles.headerSub}>Tell us your problem — we'll find the best tutor for you</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Course Code</Text>
              <TextInput
                style={styles.input}
                value={course}
                onChangeText={setCourse}
                placeholder="e.g. MATH101, COEN201"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Max Budget (₦/hour)</Text>
              <TextInput
                style={styles.input}
                value={budget}
                onChangeText={setBudget}
                placeholder="e.g. 1000 (Optional)"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Describe Your Problem</Text>
              <TextInput
                style={[styles.input, styles.textarea]}
                value={problem}
                onChangeText={setProblem}
                placeholder="e.g. I'm struggling with integration by parts and can't solve these differentials..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleMatch}
              disabled={loading}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={styles.btnText}>Finding your tutor...</Text>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="sparkles" size={18} color="#fff" />
                  <Text style={styles.btnText}>Find My Tutor</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Result */}
          {result && (
            <View style={{ marginTop: Spacing.md }}>
              <View style={[styles.resultCard, { marginBottom: Spacing.md }]}>
                <View style={styles.resultHeader}>
                  <Ionicons name="checkmark-circle" size={24} color={Colors.accent} />
                  <Text style={styles.resultTitle}>Match Analysis Complete</Text>
                </View>
                <Text style={styles.resultMessage}>{result.message}</Text>
              </View>

              {(() => {
                let recs = result.recommendations;
                // Fallback for old API format or missing array
                if (!recs && result.tutor) {
                  recs = [{ tutor: result.tutor, matchScore: result.matchScore, reasoning: result.reasoning }];
                }
                if (!recs || recs.length === 0) return null;

                return recs.map((rec: any, index: number) => {
                  if (!rec.tutor) return null; // Safe guard
                  return (
                    <View key={rec.tutor._id || index} style={[styles.resultCard, { marginBottom: Spacing.md }]}>
                      <View style={styles.matchedTutor}>
                        <View style={styles.matchedAvatar}>
                          <Text style={styles.matchedAvatarText}>{rec.tutor.name?.charAt(0) || '?'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.matchedName}>
                            {rec.tutor.name || 'Tutor'} {rec.tutor.role === 'verified_tutor' && <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />}
                          </Text>
                          <Text style={styles.matchedMeta}>{rec.tutor.faculty || 'Unknown Faculty'} · Level {rec.tutor.level || '?'}</Text>
                          
                          {rec.tutor.courses && rec.tutor.courses.length > 0 && (
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                              {rec.tutor.courses.slice(0, 3).map((c: string) => (
                                <View key={c} style={{ backgroundColor: '#F0F9FF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                                  <Text style={{ fontSize: 10, color: '#0369A1', fontWeight: 'bold' }}>{c}</Text>
                                </View>
                              ))}
                            </View>
                          )}
                          
                          {rec.tutor.matchingBio && (
                            <Text style={{ fontSize: 12, color: Colors.textSecondary, marginTop: 4, fontStyle: 'italic' }} numberOfLines={2}>
                              "{rec.tutor.matchingBio}"
                            </Text>
                          )}

                          <Text style={[styles.matchedMeta, { marginTop: 4 }]}>Rate: ₦{rec.tutor.hourlyRate || 500}/hr · ⭐ {rec.tutor.averageRating?.toFixed(1) || '0.0'}</Text>
                          {rec.reasoning && (
                            <Text style={styles.reasoning}>AI: "{rec.reasoning}"</Text>
                          )}
                        </View>
                        <View style={[styles.scoreBadge]}>
                          <Text style={styles.scoreText}>{rec.matchScore || 80}%</Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.bookBtn}
                        onPress={() => router.push({ pathname: '/tutor/[id]', params: { id: rec.tutor._id } })}
                      >
                        <Text style={styles.bookBtnText}>View Tutor & Book</Text>
                      </TouchableOpacity>
                    </View>
                  );
                });
              })()}
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    paddingTop: 52,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.sm, textAlign: 'center' },
  content: { padding: Spacing.md, marginTop: -Spacing.md },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary, marginBottom: 6 },
  input: {
    backgroundColor: Colors.inputBg,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '700' },
  resultCard: {
    backgroundColor: Colors.card,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.accent + '44',
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: Spacing.sm },
  resultTitle: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  resultMessage: { color: Colors.textSecondary, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.md },
  matchedTutor: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  matchedAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  matchedAvatarText: { color: '#fff', fontWeight: '800', fontSize: FontSize.lg },
  matchedName: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  matchedMeta: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  reasoning: { fontSize: FontSize.xs, color: Colors.primary, fontStyle: 'italic', marginTop: 4 },
  scoreBadge: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  scoreText: { color: '#fff', fontWeight: '800', fontSize: FontSize.sm },
  bookBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  bookBtnText: { color: '#fff', fontWeight: '700', fontSize: FontSize.md },
});

import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform, Modal, Image
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const ROLES = [
  { label: 'Student (Tutee)', value: 'tutee' },
  { label: 'Peer Tutor', value: 'tutor' },
];

const LEVELS = ['100L', '200L', '300L', '400L', '500L'];

export default function RegisterScreen() {
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [role, setRole] = useState<'tutee' | 'tutor'>('tutee');
  const [level, setLevel] = useState('100L');
  const [regNumber, setRegNumber] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [profilePicture, setProfilePicture] = useState<ImagePicker.ImagePickerAsset | null>(null);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need camera roll permissions to upload your photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > 1024 * 1024) {
        Alert.alert('Image Too Large', 'Profile picture must be less than 1MB.');
        return;
      }
      setProfilePicture(asset);
    }
  };

  const handleRegister = async () => {
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    const validatePassword = (pass: string) => {
      if (pass.length < 8) return false;
      const hasLetter = /[a-zA-Z]/.test(pass);
      const hasNumber = /\d/.test(pass);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(pass);
      return hasLetter && hasNumber && hasSpecial;
    };

    if (!validatePassword(password)) {
      Alert.alert('Error', 'Password must be at least 8 characters and include a letter, a number, and a special character.');
      return;
    }
    if (!acceptedTerms) {
      Alert.alert('Terms Required', 'You must accept the Terms and Conditions to register.');
      return;
    }
    if (role === 'tutee' && !profilePicture) {
      Alert.alert('Photo Required', 'Please upload a profile picture.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('email', email.trim().toLowerCase());
      formData.append('password', password);
      formData.append('role', role);
      formData.append('level', level);
      formData.append('registrationNumber', regNumber.trim());
      formData.append('acceptedTerms', 'true');

      if (profilePicture) {
        const uri = profilePicture.uri;
        const filename = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpg`;
        
        // @ts-ignore
        formData.append('profilePicture', {
          uri,
          name: filename,
          type,
        });
      }

      await register(formData);
    } catch (err: any) {
      Alert.alert(
        'Registration Failed',
        err.response?.data?.message || 'Could not create account. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>ABU</Text>
          </View>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.tagline}>Join ABUTutorsConnect today</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>

          {/* Role Selection */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>I am a...</Text>
            <View style={styles.roleRow}>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r.value}
                  style={[styles.roleBtn, role === r.value && styles.roleBtnActive]}
                  onPress={() => setRole(r.value as 'tutee' | 'tutor')}
                >
                  <Text style={[styles.roleBtnText, role === r.value && styles.roleBtnTextActive]}>
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {role === 'tutee' && (
              <Text style={styles.roleInfo}>✓ Student accounts are active immediately!</Text>
            )}
          </View>

          {/* Photo Upload */}
          {role === 'tutee' && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Profile Picture (Max 1MB) *</Text>
              <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture.uri }} style={styles.previewImage} />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="camera-outline" size={32} color={Colors.textMuted} />
                    <Text style={styles.photoPlaceholderText}>Upload Photo</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Abdullahi Musa"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="your.email@abu.edu.ng"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Registration Number *</Text>
            <TextInput
              style={styles.input}
              value={regNumber}
              onChangeText={setRegNumber}
              placeholder={role === 'tutor' ? "e.g. U21CO1015" : "e.g. 21/52HA/01234"}
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="characters"
            />
            {role === 'tutor' && (
              <Text style={{ fontSize: 11, color: Colors.textSecondary, marginTop: 4 }}>
                Required format: U[Year][Dept][Serial] (e.g., U21CO1015)
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Level</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.levelRow}>
                {LEVELS.map(l => (
                  <TouchableOpacity
                    key={l}
                    style={[styles.levelBtn, level === l && styles.levelBtnActive]}
                    onPress={() => setLevel(l)}
                  >
                    <Text style={[styles.levelBtnText, level === l && styles.levelBtnTextActive]}>{l}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={password}
                onChangeText={setPassword}
                placeholder="8+ chars, letter, num & special"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons 
                  name={showPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={Colors.textMuted} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Re-enter your password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity 
                style={styles.eyeIcon} 
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons 
                  name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                  size={20} 
                  color={Colors.textMuted} 
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Terms & Conditions */}
          <TouchableOpacity
            style={styles.termsRow}
            onPress={() => setAcceptedTerms(!acceptedTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxChecked]}>
              {acceptedTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.termsText}>
                I agree to the{' '}
                <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>Terms and Conditions</Text>
                {' '}of ABUTutorsConnect
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={{ marginTop: Spacing.md, alignItems: 'center' }} onPress={() => router.push('/login')}>
            <Text style={{ color: Colors.textSecondary, fontSize: FontSize.sm }}>
              Already have an account? <Text style={{ color: Colors.primary, fontWeight: '700' }}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>Ahmadu Bello University · Zaria</Text>
      </ScrollView>

      {/* Terms Modal */}
      <Modal visible={showTerms} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Conditions</Text>
              <TouchableOpacity onPress={() => setShowTerms(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.termsBody}>
              <Text style={styles.termsH3}>1. Eligibility</Text>
              <Text style={styles.termsP}>You must provide accurate information. Users must be registered ABU students or verified tutors.</Text>
              
              <Text style={styles.termsH3}>2. Account Responsibilities</Text>
              <Text style={styles.termsP}>Keep your login credentials secure. You are responsible for all activity on your account.</Text>
              
              <Text style={styles.termsH3}>3. Profile Completion</Text>
              <Text style={styles.termsP}>Tutors must complete their profile and submit required documents for verification.</Text>
              
              <Text style={styles.termsH3}>4. Session Rules</Text>
              <Text style={styles.termsP}>Sessions must start and end using QR codes/secure PINs. Professional conduct is mandatory.</Text>

              <Text style={styles.termsH3}>5. Payment & Escrow</Text>
              <Text style={styles.termsP}>Fees are deducted from tutee wallet and held in Escrow until session completion.</Text>

              <Text style={styles.termsH3}>6. Disputes</Text>
              <Text style={styles.termsP}>Users may flag disputes. Escrow remains frozen until Admin resolution.</Text>

              <Text style={styles.termsH3}>7. User Conduct</Text>
              <Text style={styles.termsP}>Harassment, abuse, or fraud result in immediate suspension.</Text>
              
              <View style={{ height: 20 }} />
            </ScrollView>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => { setShowTerms(false); setAcceptedTerms(true); }}>
              <Text style={styles.closeModalBtnText}>I Agree & Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: Colors.primary,
    padding: Spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  backBtn: {
    position: 'absolute',
    left: 0,
    top: Spacing.xxl,
  },
  logoCircle: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.sm,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
  },
  logoText: { color: '#fff', fontSize: FontSize.xxl, fontWeight: '900' },
  appName: { color: '#fff', fontSize: FontSize.xxxl, fontWeight: '800' },
  tagline: { color: 'rgba(255,255,255,0.8)', fontSize: FontSize.base, marginTop: 4 },
  card: {
    backgroundColor: Colors.card, borderRadius: Radius.xl, padding: Spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  inputGroup: { marginBottom: Spacing.md },
  label: { fontSize: FontSize.sm, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  input: {
    backgroundColor: '#fff', borderRadius: Radius.md,
    padding: Spacing.md, fontSize: FontSize.base,
    color: Colors.textPrimary, borderWidth: 1, borderColor: Colors.border,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  passwordInput: {
    flex: 1,
    padding: Spacing.md,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    paddingHorizontal: Spacing.md,
  },
  roleRow: { flexDirection: 'row', gap: Spacing.sm },
  roleBtn: {
    flex: 1, padding: Spacing.md, borderRadius: Radius.md,
    borderWidth: 2, borderColor: Colors.border, alignItems: 'center',
    backgroundColor: '#F8FAFF',
  },
  roleBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  roleBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSize.sm },
  roleBtnTextActive: { color: Colors.primary },
  roleInfo: { color: Colors.success, fontSize: 13, marginTop: 10, fontWeight: '600' },
  
  photoPicker: {
    width: '100%', height: 120, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFF',
    overflow: 'hidden',
  },
  previewImage: { width: '100%', height: '100%', objectFit: 'cover' },
  photoPlaceholder: { alignItems: 'center', gap: 6 },
  photoPlaceholderText: { color: Colors.textMuted, fontSize: FontSize.sm, fontWeight: '600' },

  levelRow: { flexDirection: 'row', gap: 8 },
  levelBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
  },
  levelBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  levelBtnText: { color: Colors.textSecondary, fontWeight: '700', fontSize: FontSize.sm },
  levelBtnTextActive: { color: '#fff' },
  
  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, marginBottom: Spacing.lg, marginTop: 8,
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '900' },
  termsText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary, lineHeight: 20,
  },
  termsLink: { color: Colors.primary, fontWeight: '800', textDecorationLine: 'underline' },
  
  btn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: Spacing.md, alignItems: 'center', marginTop: Spacing.sm,
    height: 56, justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontSize: FontSize.md, fontWeight: '800' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: Radius.xl, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: FontSize.xl, fontWeight: '900', color: Colors.textPrimary },
  termsBody: { flex: 1 },
  termsH3: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginTop: 15, marginBottom: 5 },
  termsP: { fontSize: 14, color: Colors.textSecondary, lineHeight: 22 },
  closeModalBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: Radius.md, alignItems: 'center', marginTop: 20 },
  closeModalBtnText: { color: '#fff', fontWeight: '800', fontSize: FontSize.md },

  footer: {
    textAlign: 'center', color: 'rgba(255,255,255,0.7)',
    fontSize: FontSize.xs, marginTop: Spacing.xxl, marginBottom: Spacing.xl,
  },
});


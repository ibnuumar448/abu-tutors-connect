import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
  ActivityIndicator, Image, TextInput, Modal, RefreshControl,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { userApi, bankApi, walletApi, authApi, adminApi, messageApi } from '../../services/api';
import { universityData } from '../../constants/universityData';
import { getImageUrl } from '../../utils/image';

export default function ProfileScreen() {
  const { user, logout, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Support Modal
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);

  // Wizard Steps
  const [currentStep, setCurrentStep] = useState(1);
  const [showFacultyModal, setShowFacultyModal] = useState(false);
  const [showDepartmentModal, setShowDepartmentModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState('100L');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [banks, setBanks] = useState<any[]>([]);
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [confirmPin, setConfirmPin] = useState('');
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  
  const [teachingLevel, setTeachingLevel] = useState('');
  const [courses, setCourses] = useState('');
  const [areaOfStrength, setAreaOfStrength] = useState('');
  const [matchingBio, setMatchingBio] = useState('');
  const [about, setAbout] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');

  const [admissionLetter, setAdmissionLetter] = useState<any>(null);
  const [transcript, setTranscript] = useState<any>(null);
  const [profilePicture, setProfilePicture] = useState<any>(null);
  
  const [wallet, setWallet] = useState<any>(null);
  const [adminSettings, setAdminSettings] = useState<any>(null);

  useEffect(() => {
    if (user) {
      setFaculty(user.faculty || '');
      setDepartment(user.department || '');
      setPhone(user.phone || '');
      setLevel(user.level || '100L');
      setTeachingLevel(user.teachingLevel || '');
      setCourses(user.courses?.join(', ') || '');
      setAreaOfStrength(user.areaOfStrength || '');
      setMatchingBio(user.matchingBio || '');
      setAbout(user.about || '');
      setEmail(user.email || '');
      setHourlyRate(user.hourlyRate?.toString() || '');
      
      if (user.bankDetails) {
        setBankCode(user.bankDetails.bankCode || '');
        setBankName(user.bankDetails.bankName || '');
        setAccountNumber(user.bankDetails.accountNumber || '');
        setAccountName(user.bankDetails.accountName || '');
      }

      if ((user.role === 'tutor' || user.role === 'verified_tutor') && !user.isProfileComplete) {
        setCurrentStep(user.profileStep + 1 || 1);
        fetchBanks();
        fetchWallet();
        fetchSettings();
      }
    }
  }, [user]);

  const fetchBanks = async () => {
    try {
      const res = await bankApi.getBanks();
      setBanks(res.data);
    } catch {}
  };

  const fetchWallet = async () => {
    try {
      const res = await walletApi.getWallet();
      setWallet(res.data);
    } catch {}
  };

  const fetchSettings = async () => {
    try {
      const res = await adminApi.getSettings();
      setAdminSettings(res.data);
    } catch {}
  };

  const handleContactSupport = async () => {
    if (!supportMsg.trim()) return;
    setSendingSupport(true);
    try {
        const res = await userApi.getAdminId();
        const adminId = res.data._id;
        await messageApi.sendMessage(adminId, supportMsg);
        Alert.alert('Success', 'Message sent to Support! We will reply shortly.');
        setShowSupportModal(false);
        setSupportMsg('');
    } catch (err: any) {
        Alert.alert('Error', err.response?.data?.message || 'Failed to send message');
    } finally {
        setSendingSupport(false);
    }
  };

  const handleVerifyAccount = async () => {
    if (accountNumber.length < 10 || !bankCode) return;
    setVerifyingAccount(true);
    try {
      const res = await bankApi.verifyAccount(accountNumber, bankCode);
      setAccountName(res.data.account_name);
    } catch {
      Alert.alert('Error', 'Could not verify account details.');
    } finally {
      setVerifyingAccount(false);
    }
  };

  const pickFile = async (type: 'admission' | 'transcript' | 'photo') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const sizeMB = (asset.fileSize || 0) / (1024 * 1024);
      
      if (type === 'photo') {
        if (sizeMB > 1) {
          Alert.alert('File Too Large', 'Profile picture must be less than 1MB.');
          return;
        }
        setProfilePicture(asset);
      } else {
        if (sizeMB > 0.5) {
          Alert.alert('File Too Large', 'Documents must be less than 500KB.');
          return;
        }
        if (type === 'admission') setAdmissionLetter(asset);
        else if (type === 'transcript') setTranscript(asset);
      }
    }
  };

  const handleUpdateStep = async () => {
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('step', currentStep.toString());

      if (currentStep === 1) {
        formData.append('faculty', faculty);
        formData.append('department', department);
        formData.append('phone', phone);
        formData.append('level', level);
        formData.append('bankName', bankName);
        formData.append('bankCode', bankCode);
        formData.append('accountNumber', accountNumber);
        formData.append('accountName', accountName);
        if (pin && pin === confirmPin) {
          // PIN is handled separately in real scenarios, 
          // but for the wizard we'll let it pass or use separate API
          await walletApi.setTransactionPin({ pin });
        }
      } else if (currentStep === 2) {
        formData.append('teachingLevel', teachingLevel);
        formData.append('courses', JSON.stringify(courses.split(',').map(c => c.trim())));
        formData.append('areaOfStrength', areaOfStrength);
        formData.append('matchingBio', matchingBio);
        formData.append('about', about);
      } else if (currentStep === 3) {
        const appendFile = (asset: any, key: string) => {
          if (!asset) return;
          const uri = asset.uri;
          const name = uri.split('/').pop() || 'upload.jpg';
          const match = /\.(\w+)$/.exec(name);
          const type = match ? `image/${match[1]}` : `image/jpg`;
          // @ts-ignore
          formData.append(key, { uri, name, type });
        };
        appendFile(admissionLetter, 'admissionLetter');
        appendFile(transcript, 'transcript');
        appendFile(profilePicture, 'profilePicture');
      }

      await userApi.updateProfile(formData);
      await refreshUser();
      
      if (currentStep < 4) setCurrentStep(currentStep + 1);
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Check your inputs.');
    } finally {
      setSaving(false);
    }
  };

  const handlePayRegistration = async () => {
    setSaving(true);
    try {
      await walletApi.payRegistrationFromWallet();
      Alert.alert('Success', 'Registration fee paid! Your profile is being reviewed.');
      await refreshUser();
    } catch (err: any) {
      Alert.alert('Payment Failed', err.response?.data?.message || 'Ensure your wallet is funded.');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpdate = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled) {
      setSaving(true);
      try {
        const asset = result.assets[0];
        const formData = new FormData();
        const uri = asset.uri;
        const name = uri.split('/').pop() || 'photo.jpg';
        const match = /\.(\w+)$/.exec(name);
        const type = match ? `image/${match[1]}` : `image/jpg`;
        // @ts-ignore
        formData.append('profilePicture', { uri, name, type });

        await userApi.updateProfile(formData);
        await refreshUser();
        Alert.alert('Success', 'Profile picture updated.');
      } catch (err: any) {
        Alert.alert('Upload Failed', err.response?.data?.message || 'Could not update photo.');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const updateData: any = {
        email, // Added
        phone,
        level,
        faculty,
        department,
      };
      
      if (user.role !== 'tutee' && user.role !== 'admin') {
        updateData.about = about;
        updateData.matchingBio = matchingBio;
        updateData.areaOfStrength = areaOfStrength;
        updateData.courses = courses.split(',').map(c => c.trim()).filter(Boolean);
        if (user.role === 'verified_tutor') {
          updateData.hourlyRate = Number(hourlyRate);
        }
      }
      
      await userApi.updateProfileData(updateData);
      await refreshUser();
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (err: any) {
      Alert.alert('Update Failed', err.response?.data?.message || 'Could not save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  if (!user) return null;

  // Render Wizard
  if ((user.role === 'tutor' || user.role === 'verified_tutor') && !user.isProfileComplete && user.registrationPaymentStatus === 'pending') {
    const progressPercent = (currentStep / 4) * 100;
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.wizardContainer} contentContainerStyle={{ padding: Spacing.lg }} keyboardShouldPersistTaps="handled">
          <Text style={styles.wizardTitle}>Complete Tutor Profile</Text>
        <Text style={styles.wizardSub}>Step {currentStep} of 4</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        {currentStep === 1 && (
          <View style={styles.wizardStep}>
            <Text style={styles.stepTitle}>Personal & Bank Details</Text>
            
            <Text style={styles.label}>Faculty</Text>
            <TouchableOpacity style={styles.input} onPress={() => setShowFacultyModal(true)}>
              <Text style={{ color: faculty ? Colors.textPrimary : Colors.textMuted }}>{faculty || 'Select Faculty'}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Department</Text>
            <TouchableOpacity style={styles.input} onPress={() => {
              if (!faculty) { Alert.alert('Select Faculty', 'Please select a faculty first.'); return; }
              setShowDepartmentModal(true);
            }}>
              <Text style={{ color: department ? Colors.textPrimary : Colors.textMuted }}>{department || 'Select Department'}</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Phone Number</Text>
            <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="080XXXXXXXX" keyboardType="phone-pad" />

            <Text style={styles.label}>Bank Details (For Payouts)</Text>
            <TouchableOpacity style={styles.input} onPress={() => { fetchBanks(); setShowBankModal(true); }}>
              <Text style={{ color: bankCode ? Colors.textPrimary : Colors.textMuted }}>{bankName || 'Select Bank'}</Text>
            </TouchableOpacity>

            <TextInput style={styles.input} value={accountNumber} onChangeText={setAccountNumber} placeholder="Account Number" keyboardType="numeric" maxLength={10} onBlur={handleVerifyAccount} />
            {verifyingAccount && <ActivityIndicator color={Colors.primary} size="small" />}
            {accountName ? <Text style={styles.verifiedName}>✓ {accountName}</Text> : null}

            <Text style={styles.label}>Transaction PIN (4-6 digits)</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={pin}
                onChangeText={setPin}
                placeholder="Set PIN"
                secureTextEntry={!showPin}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity onPress={() => setShowPin(!showPin)} style={styles.eyeIcon}>
                <Ionicons name={showPin ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="Confirm PIN"
                secureTextEntry={!showConfirmPin}
                keyboardType="numeric"
                maxLength={6}
              />
              <TouchableOpacity onPress={() => setShowConfirmPin(!showConfirmPin)} style={styles.eyeIcon}>
                <Ionicons name={showConfirmPin ? "eye-off-outline" : "eye-outline"} size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.wizardStep}>
            <Text style={styles.stepTitle}>Educational Background</Text>
            <Text style={styles.label}>Levels you can teach</Text>
            <TextInput style={styles.input} value={teachingLevel} onChangeText={setTeachingLevel} placeholder="e.g. 100L, 200L" />
            
            <Text style={styles.label}>Course Codes (Comma separated)</Text>
            <TextInput style={styles.input} value={courses} onChangeText={setCourses} placeholder="e.g. MATH101, COEN201" />

            <Text style={styles.label}>Area of Strength</Text>
            <TextInput style={styles.input} value={areaOfStrength} onChangeText={setAreaOfStrength} placeholder="e.g. Logic Design, Calculus" />

            <Text style={styles.label}>Expertise Summary (Used by AI)</Text>
            <TextInput style={[styles.input, { height: 100 }]} multiline value={matchingBio} onChangeText={setMatchingBio} placeholder="Describe your teaching strengths..." />
            
            <Text style={styles.label}>Bio (About You)</Text>
            <TextInput style={[styles.input, { height: 100 }]} multiline value={about} onChangeText={setAbout} placeholder="Tell students about yourself..." />
          </View>
        )}

        {currentStep === 3 && (
          <View style={styles.wizardStep}>
            <Text style={styles.stepTitle}>Verification Documents</Text>
            
            <TouchableOpacity style={styles.docBtn} onPress={() => pickFile('admission')}>
              <Ionicons name={admissionLetter ? "checkmark-circle" : "document-text-outline"} size={24} color={admissionLetter ? Colors.success : Colors.primary} />
              <Text style={styles.docBtnText}>{admissionLetter ? "Admission Letter Attached" : "Attach Admission Letter (PDF/JPG)"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.docBtn} onPress={() => pickFile('transcript')}>
              <Ionicons name={transcript ? "checkmark-circle" : "document-text-outline"} size={24} color={transcript ? Colors.success : Colors.primary} />
              <Text style={styles.docBtnText}>{transcript ? "Transcript Attached" : "Attach Result/Transcript (PDF/JPG)"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.docBtn} onPress={() => pickFile('photo')}>
              {profilePicture ? (
                <Image source={{ uri: profilePicture.uri }} style={styles.docPreview} />
              ) : (
                <Ionicons name="camera-outline" size={24} color={Colors.primary} />
              )}
              <Text style={styles.docBtnText}>{profilePicture ? "Profile Photo Ready" : "Upload Profile Photo"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {currentStep === 4 && (
          <View style={styles.wizardStep}>
            <Text style={styles.stepTitle}>Registration {adminSettings?.isRegistrationFree ? 'Status' : 'Payment'}</Text>
            
            {adminSettings?.isRegistrationFree ? (
              <View style={[styles.paymentCard, { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }]}>
                <Text style={[styles.paymentLabel, { color: '#166534' }]}>Registration is Currently FREE!</Text>
                <Text style={styles.paymentSub}>The administrative fee has been waived by the admin.</Text>
              </View>
            ) : (
              <>
                <View style={styles.paymentCard}>
                  <Text style={styles.paymentLabel}>Tutor Registration Fee</Text>
                  <Text style={styles.paymentAmount}>₦{adminSettings?.registrationFee?.toLocaleString() || '5,000'}</Text>
                  <Text style={styles.paymentSub}>One-time administrative charge</Text>
                </View>
                <View style={styles.walletInfo}>
                  <Text>Wallet Balance: ₦{wallet?.balance?.toLocaleString() || '0.00'}</Text>
                  {wallet?.balance < (adminSettings?.registrationFee || 5000) && (
                    <TouchableOpacity onPress={() => router.push('/wallet')}>
                      <Text style={{ color: Colors.primary, fontWeight: '700', marginTop: 10 }}>Fund Wallet to Continue →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            <TouchableOpacity 
              style={[styles.payBtn, (saving || (!adminSettings?.isRegistrationFree && wallet?.balance < (adminSettings?.registrationFee || 5000))) && { backgroundColor: Colors.border }]} 
              onPress={handlePayRegistration} 
              disabled={saving || (!adminSettings?.isRegistrationFree && wallet?.balance < (adminSettings?.registrationFee || 5000))}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>{adminSettings?.isRegistrationFree ? 'Complete Registration' : 'Pay & Submit Profile'}</Text>}
            </TouchableOpacity>
          </View>
        )}

        {currentStep < 4 && (
          <View style={styles.buttonRow}>
            {currentStep > 1 && (
              <TouchableOpacity style={[styles.navBtn, { backgroundColor: '#eee' }]} onPress={() => setCurrentStep(currentStep - 1)}>
                <Text style={{ color: Colors.textPrimary }}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.navBtn, { flex: 2 }]} onPress={handleUpdateStep} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.navBtnText}>Next Step</Text>}
            </TouchableOpacity>
          </View>
        )}
        
        <View style={{ height: 100 }} />

        {/* Modals */}
        <SelectionModal
          visible={showFacultyModal}
          title="Select Faculty"
          items={universityData.faculties.map(f => ({ label: f.faculty, value: f.faculty }))}
          selectedValue={faculty}
          onSelect={(val: string) => { setFaculty(val); setDepartment(''); }}
          onClose={() => setShowFacultyModal(false)}
        />
        <SelectionModal
          visible={showDepartmentModal}
          title="Select Department"
          items={(universityData.faculties.find(f => f.faculty === faculty)?.departments || []).map(d => ({ label: d, value: d }))}
          selectedValue={department}
          onSelect={(val: string) => setDepartment(val)}
          onClose={() => setShowDepartmentModal(false)}
        />
        <SelectionModal
          visible={showBankModal}
          title="Select Bank"
          items={banks.map(b => ({ label: b.name, value: b.code }))}
          selectedValue={bankCode}
          onSelect={(val: string, label: string) => { setBankCode(val); setBankName(label); }}
          onClose={() => setShowBankModal(false)}
        />
      </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // Standard Profile View
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: Colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView 
        style={styles.container}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refreshUser(); setRefreshing(false); }} />}
      >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          {user.documents?.profilePicture ? (
            <Image source={{ uri: getImageUrl(user.documents.profilePicture) }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarInitials}>
              <Text style={styles.avatarText}>{user.name?.charAt(0)}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.photoEditBtn} onPress={handlePhotoUpdate} disabled={saving}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
          {user.isApproved && (
            <View style={styles.approvedBadge}>
              <Ionicons name="checkmark" size={12} color="#fff" />
            </View>
          )}
        </View>
        <Text style={styles.name}>{user.name}</Text>
        <Text style={styles.roleSub}>
          {user.role === 'admin' ? 'System Administrator' : user.role === 'tutee' ? 'Student' : user.role === 'verified_tutor' ? 'Verified Tutor' : 'Tutor'}
          {user.registrationNumber ? ` · ${user.registrationNumber}` : ''}
        </Text>
      </View>

      {/* Info Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderTitle}>Account Information</Text>
          {isEditing ? (
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => setIsEditing(false)} disabled={saving}>
                <Text style={[styles.editBtnText, { color: Colors.danger }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color={Colors.primary} /> : <Text style={styles.editBtnText}>Save</Text>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setIsEditing(true)}>
              <Text style={styles.editBtnText}>✏ Edit</Text>
            </TouchableOpacity>
          )}
        </View>
        {isEditing ? (
          <View style={styles.editWrap}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput style={styles.inputSmall} value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          </View>
        ) : (
          <InfoRow label="Email" value={user.email} />
        )}
        {isEditing ? (
          <View style={styles.editWrap}>
            <Text style={styles.label}>Faculty</Text>
            <TouchableOpacity style={styles.inputSmall} onPress={() => setShowFacultyModal(true)}>
              <Text style={{ color: faculty ? Colors.textPrimary : Colors.textMuted }}>{faculty || 'Select Faculty'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <InfoRow label="Faculty" value={user.faculty || '—'} />
        )}
        {isEditing ? (
          <View style={styles.editWrap}>
            <Text style={styles.label}>Department</Text>
            <TouchableOpacity style={styles.inputSmall} onPress={() => {
              if (!faculty) { Alert.alert('Select Faculty', 'Please select a faculty first.'); return; }
              setShowDepartmentModal(true);
            }}>
              <Text style={{ color: department ? Colors.textPrimary : Colors.textMuted }}>{department || 'Select Department'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <InfoRow label="Department" value={user.department || '—'} />
        )}
        {isEditing ? (
          <View style={styles.editWrap}>
            <Text style={styles.label}>Level</Text>
            <TextInput style={styles.inputSmall} value={level} onChangeText={setLevel} placeholder="e.g. 100L" />
          </View>
        ) : (
          <InfoRow label="Level" value={user.level || '—'} />
        )}
        {(user.role !== 'tutee' && user.role !== 'admin') && (
          isEditing ? (
            <View style={styles.editWrap}>
              <Text style={styles.label}>Phone</Text>
              <TextInput style={styles.inputSmall} value={phone} onChangeText={setPhone} placeholder="080XXXXXXXX" keyboardType="phone-pad" />
            </View>
          ) : (
            <InfoRow label="Phone" value={user.phone || '—'} />
          )
        )}
        {user.role === 'verified_tutor' && (
          isEditing ? (
            <View style={styles.editWrap}>
              <Text style={styles.label}>Hourly Rate (₦)</Text>
              <TextInput style={styles.inputSmall} value={hourlyRate} onChangeText={setHourlyRate} placeholder="e.g. 1000" keyboardType="numeric" />
              <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 2 }}>Max: ₦{adminSettings?.maxHourlyRate?.toLocaleString() || '1,500'}</Text>
            </View>
          ) : (
            <InfoRow label="Hourly Rate" value={`₦${user.hourlyRate?.toLocaleString() || '0'}/hr`} />
          )
        )}
      </View>

      {/* Teaching Profile */}
      {user.role !== 'tutee' && user.role !== 'admin' && (
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Teaching Profile</Text>
          
          <Text style={styles.subLabel}>Courses & Subjects</Text>
          {isEditing ? (
            user.role === 'tutee' ? (
              <TextInput style={styles.input} value={courses} onChangeText={setCourses} placeholder="e.g. MATH101, COEN201" />
            ) : (
              <View style={[styles.input, { backgroundColor: '#F0F0F0', justifyContent: 'center' }]}>
                <Text style={{ color: Colors.textMuted }}>{courses || 'Manage via "Apply for New Course"'}</Text>
              </View>
            )
          ) : (
            user.courses?.length > 0 ? (
              <View style={styles.tagRow}>
                {user.courses.map((c: string) => (
                  <View key={c} style={styles.tag}><Text style={styles.tagText}>{c}</Text></View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No courses added yet</Text>
            )
          )}
          
          <Text style={[styles.subLabel, { marginTop: 15 }]}>Area of Strength</Text>
          {isEditing ? (
             <TextInput style={styles.input} value={areaOfStrength} onChangeText={setAreaOfStrength} placeholder="e.g. Calculus, Logic" />
          ) : (
            <Text style={styles.infoValue}>{user.areaOfStrength || '—'}</Text>
          )}

          <Text style={[styles.subLabel, { marginTop: 15 }]}>Expertise Summary</Text>
          {isEditing ? (
            <TextInput style={[styles.input, { height: 80 }]} multiline value={matchingBio} onChangeText={setMatchingBio} placeholder="Used for AI matching..." />
          ) : (
            user.matchingBio ? (
              <View style={styles.bioBox}><Text style={styles.bioText}>"{user.matchingBio}"</Text></View>
            ) : (
              <Text style={styles.emptyText}>Not set</Text>
            )
          )}

          <Text style={[styles.subLabel, { marginTop: 15 }]}>About Me</Text>
          {isEditing ? (
             <TextInput style={[styles.input, { height: 80 }]} multiline value={about} onChangeText={setAbout} placeholder="Tell students about you..." />
          ) : (
            user.about ? (
              <View style={styles.bioBox}><Text style={styles.bioText}>{user.about}</Text></View>
            ) : (
              <Text style={styles.emptyText}>Not set</Text>
            )
          )}
        </View>
      )}

      {/* Quick Links */}
      <View style={styles.menuBox}>
        <MenuBtn icon="wallet" label="Wallet" onPress={() => router.push('/wallet')} />
        <MenuBtn icon="calendar" label="My Sessions" onPress={() => router.push('/(tabs)/sessions')} />
        {(user.role === 'tutor' || user.role === 'verified_tutor') && (
          <MenuBtn icon="time" label="Manage Availability" onPress={() => router.push('/availability')} />
        )}
        <MenuBtn icon="lock-closed" label="Security (PIN)" onPress={() => Alert.alert('Security', 'PIN can be changed in settings.')} />
        <MenuBtn icon="headset" label="Contact Support" onPress={() => setShowSupportModal(true)} />
        <MenuBtn icon="log-out" label="Log Out" onPress={handleLogout} isDanger />
      </View>

      <View style={{ height: 60 }} />
    </ScrollView>
    
    <Modal visible={showSupportModal} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.supportModalBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 }}>
            <Text style={{ fontSize: 18, fontWeight: '800' }}>Contact Support</Text>
            <TouchableOpacity onPress={() => setShowSupportModal(false)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
            multiline
            placeholder="Describe your issue..."
            value={supportMsg}
            onChangeText={setSupportMsg}
          />
          <TouchableOpacity 
            style={[styles.payBtn, { marginTop: 15 }]} 
            onPress={handleContactSupport}
            disabled={sendingSupport}
          >
            {sendingSupport ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>Send Message</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    {/* Selection Modals for Editing */}
    <SelectionModal
      visible={showFacultyModal}
      title="Select Faculty"
      items={universityData.faculties.map(f => ({ label: f.faculty, value: f.faculty }))}
      selectedValue={faculty}
      onSelect={(val: string) => { setFaculty(val); setDepartment(''); }}
      onClose={() => setShowFacultyModal(false)}
    />
    <SelectionModal
      visible={showDepartmentModal}
      title="Select Department"
      items={(universityData.faculties.find(f => f.faculty === faculty)?.departments || []).map(d => ({ label: d, value: d }))}
      selectedValue={department}
      onSelect={(val: string) => setDepartment(val)}
      onClose={() => setShowDepartmentModal(false)}
    />
    
    </KeyboardAvoidingView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function MenuBtn({ icon, label, onPress, isDanger }: { icon: any; label: string; onPress: () => void; isDanger?: boolean }) {
  return (
    <TouchableOpacity style={styles.menuBtn} onPress={onPress}>
      <Ionicons name={icon} size={22} color={isDanger ? Colors.danger : Colors.primary} />
      <Text style={[styles.menuLabel, isDanger && { color: Colors.danger }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingTop: 64,
    paddingBottom: 32,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatarWrap: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16, position: 'relative',
  },
  avatarImg: { width: '100%', height: '100%', borderRadius: 50 },
  avatarInitials: { flex: 1, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', borderRadius: 50 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '900' },
  photoEditBtn: {
    position: 'absolute', bottom: 0, right: 0,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary, borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  approvedBadge: {
    position: 'absolute', top: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: Colors.success, borderWidth: 2, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  name: { color: '#fff', fontSize: FontSize.xl, fontWeight: '800' },
  roleSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  
  card: {
    backgroundColor: '#fff', margin: 16, borderRadius: Radius.lg,
    padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardHeaderTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  editBtnText: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
  
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border + '66' },
  infoLabel: { color: Colors.textSecondary, fontSize: 14 },
  infoValue: { fontWeight: '600', color: Colors.textPrimary, fontSize: 14 },
  
  subLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.full },
  tagText: { color: Colors.primary, fontWeight: '700', fontSize: 12 },
  bioBox: { backgroundColor: '#F8FAFF', padding: 12, borderRadius: Radius.md, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  bioText: { fontStyle: 'italic', color: Colors.textSecondary, lineHeight: 20 },
  emptyText: { color: Colors.textMuted, fontStyle: 'italic' },
  
  menuBox: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: Radius.lg, overflow: 'hidden' },
  menuBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12, borderBottomWidth: 1, borderBottomColor: Colors.border + '33' },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
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
    fontSize: 14,
    color: Colors.textPrimary,
  },
  eyeIcon: {
    paddingHorizontal: Spacing.md,
  },

  // Wizard Styles
  wizardContainer: { flex: 1, backgroundColor: '#fff' },
  wizardTitle: { fontSize: 24, fontWeight: '900', color: Colors.textPrimary, textAlign: 'center' },
  wizardSub: { color: Colors.textSecondary, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  progressBar: { height: 6, backgroundColor: '#eee', borderRadius: 3, overflow: 'hidden', marginBottom: 32 },
  progressFill: { height: '100%', backgroundColor: Colors.primary },
  wizardStep: { gap: 16 },
  stepTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  label: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  input: { backgroundColor: '#F8FAFF', borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border },
  inputReadOnly: { backgroundColor: '#f0f0f0', borderRadius: Radius.md, padding: 12, color: '#333' },
  pickerBox: { gap: 10 },
  facultyScroll: { flexDirection: 'row' },
  pickBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.pill, backgroundColor: '#eee', marginRight: 8 },
  pickBtnActive: { backgroundColor: Colors.primary },
  pickBtnText: { color: Colors.textSecondary, fontSize: 12 },
  pickBtnTextActive: { color: '#fff', fontWeight: '700' },
  verifiedName: { color: Colors.success, fontWeight: '700', fontSize: 13 },
  bankPicker: { maxHeight: 150, backgroundColor: '#F8F9FA', borderRadius: 8, padding: 10 },
  bankItem: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee' },
  docBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.border, borderRadius: Radius.md, gap: 12 },
  docBtnText: { color: Colors.textSecondary, fontWeight: '600' },
  docPreview: { width: 40, height: 40, borderRadius: 8 },
  paymentCard: { backgroundColor: Colors.primary, padding: 24, borderRadius: Radius.xl, alignItems: 'center' },
  paymentLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '700' },
  paymentAmount: { color: '#fff', fontSize: 32, fontWeight: '900', marginVertical: 8 },
  paymentSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
  walletInfo: { alignItems: 'center', padding: 20 },
  payBtn: { backgroundColor: Colors.success, padding: 16, borderRadius: Radius.md, alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 32 },
  navBtn: { backgroundColor: Colors.primary, padding: 16, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  navBtnText: { color: '#fff', fontWeight: '800' },
  editWrap: { marginTop: 12 },
  inputSmall: { 
    backgroundColor: '#F8FAFF', borderRadius: Radius.md, padding: 10, 
    borderWidth: 1, borderColor: Colors.border, fontSize: 13, marginTop: 4 
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  supportModalBox: { backgroundColor: '#fff', borderRadius: Radius.lg, padding: 20 },
});

function SelectionModal({ visible, title, items, selectedValue, onSelect, onClose }: any) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
        <View style={{ backgroundColor: '#fff', borderRadius: Radius.lg, maxHeight: '80%', padding: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', color: Colors.textPrimary }}>{title}</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={Colors.textPrimary} /></TouchableOpacity>
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {items.map((item: any, index: number) => (
              <TouchableOpacity key={index} style={{ paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' }} onPress={() => { onSelect(item.value, item.label); onClose(); }}>
                <Text style={{ color: selectedValue === item.value ? Colors.primary : Colors.textPrimary, fontWeight: selectedValue === item.value ? '700' : '500', fontSize: 16 }}>{item.label}</Text>
              </TouchableOpacity>
            ))}
            {items.length === 0 && (
              <Text style={{ textAlign: 'center', color: Colors.textMuted, marginVertical: 20 }}>No items found</Text>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}


import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, 
  TextInput, ActivityIndicator, Alert, Dimensions,
  Platform, KeyboardAvoidingView, ScrollView
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, FontSize } from '../constants/Colors';

const { width, height } = Dimensions.get('window');

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'generate' | 'scan';
  qrData?: string;
  pin?: string;
  onScanSuccess?: (data: string) => void;
  onPinSubmit?: (pin: string) => void;
  title: string;
}

export default function VerificationModal({
  isOpen, onClose, mode, qrData, pin, onScanSuccess, onPinSubmit, title
}: VerificationModalProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [inputPin, setInputPin] = useState('');
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (isOpen && mode === 'scan') {
      if (!permission || !permission.granted) {
        requestPermission();
      }
      setScanned(false);
    }
  }, [isOpen, mode, permission]);

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanned || !onScanSuccess) return;
    setScanned(true);
    onScanSuccess(data);
    onClose();
  };

  const handlePinSubmit = () => {
    if (onPinSubmit && inputPin.length === 6) {
      onPinSubmit(inputPin);
      setInputPin('');
      onClose();
    } else {
      Alert.alert('Invalid PIN', 'Please enter a 6-digit PIN.');
    }
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} animationType="slide" transparent>
      <KeyboardAvoidingView 
        style={styles.overlay} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {mode === 'generate' ? (
            <View style={styles.content}>
              {qrData ? (
                <View style={styles.qrContainer}>
                  <QRCode value={qrData} size={220} color={Colors.textPrimary} backgroundColor="#fff" />
                </View>
              ) : (
                <ActivityIndicator size="large" color={Colors.primary} />
              )}

              {pin ? (
                <View style={styles.pinSection}>
                  <Text style={styles.subLabel}>OR USE FALLBACK PIN</Text>
                  <View style={styles.pinRow}>
                    {String(pin).split('').map((char, index) => (
                      <View key={index} style={styles.pinBox}>
                        <Text style={styles.pinText}>{char}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : null}

              <Text style={styles.hintText}>
                Ask your tutor to scan this QR code or enter the 6-digit PIN to verify.
              </Text>
            </View>
          ) : (
            <View style={styles.content}>
              {permission?.granted ? (
                <View style={styles.cameraContainer}>
                  <CameraView
                    style={styles.camera}
                    onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                    barcodeScannerSettings={{
                      barcodeTypes: ['qr'],
                    }}
                  />
                  <View style={styles.cameraOverlay}>
                    <View style={styles.scanFrame} />
                  </View>
                </View>
              ) : (
                <View style={styles.noPermission}>
                  <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
                  <Text style={styles.noPermissionText}>
                    Camera permission is required to scan QR codes.
                  </Text>
                  <TouchableOpacity style={styles.permissionBtn} onPress={requestPermission}>
                    <Text style={styles.permissionBtnText}>Grant Permission</Text>
                  </TouchableOpacity>
                </View>
              )}

              <Text style={styles.separatorText}>— OR ENTER PIN —</Text>

              <View style={styles.pinInputContainer}>
                <TextInput
                  style={styles.pinInput}
                  value={inputPin}
                  onChangeText={v => setInputPin(v.replace(/\D/g, ''))}
                  placeholder="Enter 6-digit PIN"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                />
                <TouchableOpacity
                  style={[styles.verifyBtn, inputPin.length !== 6 && styles.verifyBtnDisabled]}
                  onPress={handlePinSubmit}
                  disabled={inputPin.length !== 6}
                >
                  <Text style={styles.verifyBtnText}>Verify via PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(30, 41, 59, 0.8)',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: 4,
  },
  content: {
    width: '100%',
    alignItems: 'center',
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  subLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    marginBottom: 8,
  },
  pinRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pinBox: {
    width: 36,
    height: 44,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFF',
  },
  pinText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.textPrimary,
  },
  hintText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  cameraContainer: {
    width: '100%',
    height: 250,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginBottom: Spacing.md,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    width: 180,
    height: 180,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
    borderRadius: 12,
  },
  noPermission: {
    width: '100%',
    height: 250,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFF',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  noPermissionText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.pill,
  },
  permissionBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
  separatorText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    marginVertical: 16,
  },
  pinInputContainer: {
    width: '100%',
    gap: 12,
  },
  pinInput: {
    backgroundColor: '#F8FAFF',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 4,
    color: Colors.textPrimary,
  },
  verifyBtn: {
    backgroundColor: Colors.primary,
    padding: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  verifyBtnDisabled: {
    backgroundColor: Colors.border,
  },
  verifyBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: FontSize.md,
  },
  cancelBtn: {
    marginTop: Spacing.lg,
    width: '100%',
    padding: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontWeight: '700',
    fontSize: FontSize.sm,
  },
});

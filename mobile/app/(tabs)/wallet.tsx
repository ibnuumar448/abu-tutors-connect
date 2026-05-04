import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Alert,
  TextInput, Modal, RefreshControl, Dimensions,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { walletApi, bankApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Colors, Spacing, Radius, FontSize } from '../../constants/Colors';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WalletScreen() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Fund (Paystack)
  const [fundModal, setFundModal] = useState(false);
  const [fundAmount, setFundAmount] = useState('');
  const [paystackUrl, setPaystackUrl] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);

  // Withdraw
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPin, setWithdrawPin] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
  
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBank, setSelectedBank] = useState<any>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState(false);

  const fetchWallet = useCallback(async () => {
    try {
      const res = await walletApi.getWallet();
      setWallet(res.data);
    } catch (err: any) {
      if (err.response?.status !== 404) {
        Alert.alert('Error', 'Could not load wallet data.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchBanks = async () => {
    try {
      const res = await bankApi.getBanks();
      if (res.data && res.data.length === 0) {
        Alert.alert('Network Error', 'Could not connect to Paystack to load banks. Please check your internet connection.');
      }
      setBanks(res.data || []);
    } catch {
      Alert.alert('Network Error', 'Could not connect to Paystack to load banks. Please check your internet connection.');
    }
  };

  useEffect(() => { 
    fetchWallet();
    if (user?.role !== 'tutee') {
      fetchBanks();
    }
  }, [fetchWallet, user]);

  // --- Paystack logic ---
  const handleInitializePayment = async () => {
    const amount = parseFloat(fundAmount);
    if (!amount || amount < 100) {
      Alert.alert('Invalid Amount', 'Minimum top-up is ₦100.');
      return;
    }
    setInitializing(true);
    try {
      const res = await walletApi.initializePayment(amount);
      setPaystackUrl(res.data.authorization_url);
      setPaymentRef(res.data.reference);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message || 'Could not initialize payment.');
    } finally {
      setInitializing(false);
    }
  };

  const handleWebViewStateChange = (navState: any) => {
    const { url } = navState;
    if (url.includes('callback') || url.includes('success') || url.includes('verify')) {
      setPaystackUrl(null);
      if (paymentRef) handleVerifyPayment(paymentRef);
    }
  };

  const handleVerifyPayment = async (ref: string) => {
    setLoading(true);
    try {
      await walletApi.verifyPayment(ref);
      Alert.alert('Success', 'Wallet funded successfully!');
      setFundModal(false);
      setFundAmount('');
      fetchWallet();
    } catch {
      Alert.alert('Verification Failed', 'Something went wrong while verifying payment.');
    } finally {
      setLoading(false);
    }
  };

  // --- Withdrawal logic ---
  const handleVerifyAccount = async () => {
    if (accountNumber.length < 10 || !selectedBank) return;
    setVerifyingAccount(true);
    try {
      const res = await bankApi.verifyAccount(accountNumber, selectedBank.code);
      setAccountName(res.data.account_name);
    } catch {
      Alert.alert('Error', 'Could not verify account details.');
    } finally {
      setVerifyingAccount(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount < 1000) {
      Alert.alert('Invalid Amount', 'Minimum withdrawal is ₦1,000.');
      return;
    }
    if (!withdrawPin) {
      Alert.alert('PIN Required', 'Please enter your transaction PIN.');
      return;
    }
    setWithdrawing(true);
    try {
      await walletApi.withdrawFunds({ amount, pin: withdrawPin });
      Alert.alert('Withdrawal Successful', 'Your request has been submitted and will be processed shortly.');
      setWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawPin('');
      fetchWallet();
    } catch (err: any) {
      Alert.alert('Withdrawal Failed', err.response?.data?.message || 'Check your balance or PIN.');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const balance = wallet?.balance ?? 0;
  const escrow = wallet?.escrowBalance ?? 0;
  const transactions = [...(wallet?.transactions ?? [])].sort(
    (a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime()
  );

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchWallet(); }} tintColor={Colors.primary} />}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.balanceHeader}>
            <View>
              <Text style={styles.balanceLabel}>Available Balance</Text>
              <Text style={styles.balanceAmount}>₦{balance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</Text>
            </View>
            <View style={styles.logoBadge}><Text style={styles.logoText}>ABU</Text></View>
          </View>

          {escrow > 0 && (
            <View style={styles.escrowBox}>
              <Ionicons name="lock-closed" size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.escrowText}>₦{escrow.toLocaleString()} held in Escrow</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setFundModal(true)}>
              <View style={styles.actionIcon}>
                <Ionicons name="add" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.actionLabel}>Top Up</Text>
            </TouchableOpacity>
            
            {user?.role !== 'tutee' && (
              <TouchableOpacity style={styles.actionBtn} onPress={() => setWithdrawModal(true)}>
                <View style={styles.actionIcon}>
                  <Ionicons name="send" size={20} color={Colors.primary} />
                </View>
                <Text style={styles.actionLabel}>Withdraw</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Transaction History</Text>
          </View>
          
          {transactions.length === 0 ? (
            <View style={styles.empty}>
              <View style={styles.emptyCircle}>
                <Ionicons name="receipt-outline" size={40} color={Colors.textMuted} />
              </View>
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySub}>Your financial activity will appear here</Text>
            </View>
          ) : (
            transactions.map((tx: any, i: number) => (
              <View key={i} style={styles.txCard}>
                <View style={[styles.txIconBox, { backgroundColor: tx.type === 'credit' ? Colors.success + '15' : Colors.danger + '15' }]}>
                  <Ionicons
                    name={tx.type === 'credit' ? 'arrow-down' : 'arrow-up'}
                    size={16}
                    color={tx.type === 'credit' ? Colors.success : Colors.danger}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txDesc} numberOfLines={1}>{tx.description || (tx.type === 'credit' ? 'Credit' : 'Debit')}</Text>
                  <Text style={styles.txDate}>{new Date(tx.createdAt || tx.date).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <Text style={[styles.txAmount, { color: tx.type === 'credit' ? Colors.success : Colors.danger }]}>
                  {tx.type === 'credit' ? '+' : '-'}₦{Number(tx.amount).toLocaleString()}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={{ height: 48 }} />
      </ScrollView>

      {/* Fund Modal */}
      <Modal visible={fundModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Top Up Wallet</Text>
              <TouchableOpacity onPress={() => { setFundModal(false); setFundAmount(''); setPaystackUrl(null); }}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            {paystackUrl ? (
              <View style={{ height: height * 0.7, width: '100%' }}>
                <WebView
                  source={{ uri: paystackUrl }}
                  onNavigationStateChange={handleWebViewStateChange}
                  startInLoadingState
                  renderLoading={() => <ActivityIndicator style={styles.webViewLoading} size="large" color={Colors.primary} />}
                />
              </View>
            ) : (
              <View>
                <Text style={styles.modalSub}>Enter how much you'd like to add</Text>
                <View style={styles.amountInputContainer}>
                  <Text style={styles.currencyPrefix}>₦</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={fundAmount}
                    onChangeText={setFundAmount}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
                
                <View style={styles.quickAmounts}>
                  {[1000, 2000, 5000, 10000].map(a => (
                    <TouchableOpacity key={a} style={styles.quickBtn} onPress={() => setFundAmount(String(a))}>
                      <Text style={styles.quickBtnText}>₦{a.toLocaleString()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TouchableOpacity 
                  style={[styles.primaryBtn, initializing && { opacity: 0.7 }]} 
                  onPress={handleInitializePayment} 
                  disabled={initializing}
                >
                  {initializing ? <ActivityIndicator color="#fff" /> : (
                    <>
                      <Text style={styles.primaryBtnText}>Continue to Payment</Text>
                      <Ionicons name="arrow-forward" size={18} color="#fff" />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Withdraw Modal */}
      <Modal visible={withdrawModal} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Withdraw Funds</Text>
              <TouchableOpacity onPress={() => setWithdrawModal(false)}>
                <Ionicons name="close" size={24} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalSub}>Select destination and amount</Text>
              
              <Text style={styles.inputLabel}>Select Bank</Text>
              <TouchableOpacity style={styles.selector} onPress={fetchBanks}>
                <Text style={{ color: selectedBank ? Colors.textPrimary : Colors.textMuted }}>
                  {selectedBank?.name || 'Choose Bank'}
                </Text>
                <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
              
              {banks.length > 0 && !selectedBank && (
                <View style={styles.bankDropdown}>
                  {banks.map(b => (
                    <TouchableOpacity key={b.code} style={styles.bankItem} onPress={() => setSelectedBank(b)}>
                      <Text style={styles.bankItemText}>{b.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <Text style={styles.inputLabel}>Account Number</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput 
                  style={[styles.modalInputSmall, { flex: 1 }]} 
                  value={accountNumber} 
                  onChangeText={(val) => { setAccountNumber(val); setAccountName(''); }} 
                  keyboardType="numeric" 
                  maxLength={10} 
                  placeholder="0123456789"
                />
                <TouchableOpacity 
                  style={{ backgroundColor: Colors.primaryLight, paddingHorizontal: 15, justifyContent: 'center', borderRadius: 14, borderWidth: 1.5, borderColor: Colors.primary, opacity: (accountNumber.length < 10 || !selectedBank) ? 0.5 : 1 }}
                  onPress={handleVerifyAccount}
                  disabled={verifyingAccount || accountNumber.length < 10 || !selectedBank}
                >
                  <Text style={{ color: Colors.primary, fontWeight: '800' }}>Verify</Text>
                </TouchableOpacity>
              </View>
              {verifyingAccount && <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8, alignSelf: 'flex-start' }} />}
              {accountName ? <Text style={styles.verifiedName}>✓ {accountName}</Text> : null}

              <Text style={[styles.inputLabel, { marginTop: 15 }]}>Amount to Withdraw</Text>
              <View style={styles.amountInputContainerSmall}>
                <Text style={styles.currencyPrefixSmall}>₦</Text>
                <TextInput
                  style={styles.modalInputSmall}
                  value={withdrawAmount}
                  onChangeText={setWithdrawAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                />
              </View>

              <Text style={styles.inputLabel}>Transaction PIN</Text>
              <TextInput
                style={styles.modalInputSmall}
                value={withdrawPin}
                onChangeText={setWithdrawPin}
                placeholder="Enter PIN"
                secureTextEntry
                keyboardType="numeric"
                maxLength={6}
              />

              <TouchableOpacity 
                style={[styles.primaryBtn, withdrawing && { opacity: 0.7 }]} 
                onPress={handleWithdraw} 
                disabled={withdrawing}
              >
                {withdrawing ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryBtnText}>Confirm Withdrawal</Text>}
              </TouchableOpacity>
              
              <View style={{ height: 20 }} />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background },
  
  balanceCard: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingTop: 52,
    paddingBottom: 32,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13, fontWeight: '700', textTransform: 'uppercase' },
  balanceAmount: { color: '#fff', fontSize: 36, fontWeight: '900', marginTop: 4 },
  logoBadge: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  logoText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  
  escrowBox: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.15)', paddingHorizontal: 12, paddingVertical: 6, 
    borderRadius: 20, alignSelf: 'flex-start', marginTop: 12, gap: 6 
  },
  escrowText: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },
  
  actionRow: { flexDirection: 'row', gap: 20, marginTop: 24 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 16, gap: 10 },
  actionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  actionLabel: { color: Colors.primary, fontWeight: '800', fontSize: 14 },
  
  section: { padding: Spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  
  txCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 2,
  },
  txIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDesc: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  txDate: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  txAmount: { fontSize: 16, fontWeight: '900' },
  
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyText: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },
  emptySub: { color: Colors.textMuted, fontSize: 14, marginTop: 4 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: Spacing.lg, paddingBottom: 40, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '900', color: Colors.textPrimary },
  modalSub: { color: Colors.textSecondary, fontSize: 14, marginBottom: 20 },
  
  amountInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFF', borderRadius: 20, paddingHorizontal: 20, borderWidth: 2, borderColor: Colors.border, marginBottom: 20 },
  currencyPrefix: { fontSize: 28, fontWeight: '900', color: Colors.primary, marginRight: 8 },
  modalInput: { flex: 1, height: 70, fontSize: 32, fontWeight: '900', color: Colors.textPrimary },
  
  quickAmounts: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  quickBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', backgroundColor: Colors.primaryLight },
  quickBtnText: { color: Colors.primary, fontWeight: '800', fontSize: 14 },
  
  primaryBtn: { backgroundColor: Colors.primary, padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryBtnText: { color: '#fff', fontWeight: '900', fontSize: 16 },
  
  webViewLoading: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -20 },
  
  // Withdrawal specific
  inputLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, marginTop: 12 },
  selector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFF', padding: 16, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.border },
  bankDropdown: { maxHeight: 200, backgroundColor: '#fff', borderWidth: 1, borderColor: Colors.border, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
  bankItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  bankItemText: { fontSize: 14, color: Colors.textPrimary, fontWeight: '600' },
  modalInputSmall: { backgroundColor: '#F8FAFF', borderRadius: 14, padding: 16, fontSize: 16, fontWeight: '700', color: Colors.textPrimary, borderWidth: 1.5, borderColor: Colors.border },
  amountInputContainerSmall: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFF', borderRadius: 14, paddingHorizontal: 16, borderWidth: 1.5, borderColor: Colors.border },
  currencyPrefixSmall: { fontSize: 18, fontWeight: '900', color: Colors.primary, marginRight: 6 },
  verifiedName: { color: Colors.success, fontSize: 13, fontWeight: '700', marginTop: 6 },
});

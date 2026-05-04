'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminApi, userApi, walletApi, bankApi, messageApi } from '../../services/api';
import { getImageUrl } from '../../utils/image';

export default function AdminDashboard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingTutors, setPendingTutors] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [courseApplications, setCourseApplications] = useState<any[]>([]);
  const [finances, setFinances] = useState<any>(null);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'tutors' | 'course_apps' | 'users' | 'marketplace' | 'logs' | 'sessions' | 'finances' | 'settings' | 'venues' | 'support'>('tutors');
  
  // Settings Form
  const [maxHourlyRate, setMaxHourlyRate] = useState(0);
  const [registrationFee, setRegistrationFee] = useState(0);
  const [minSessions, setMinSessions] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [isRegistrationFree, setIsRegistrationFree] = useState(false);
  const [platformCommission, setPlatformCommission] = useState(10);
  const [noShowPayout, setNoShowPayout] = useState(30);
  const [defaultHourlyRate, setDefaultHourlyRate] = useState(500);

  // Admin Profile/Financial Security
  const [adminUser, setAdminUser] = useState<any>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawPin, setWithdrawPin] = useState('');
  const [formError, setFormError] = useState('');

  // Bank/PIN Setup
  const [banks, setBanks] = useState<any[]>([]);
  const [selectedBankCode, setSelectedBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [verifyingAccount, setVerifyingAccount] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [isEditingBank, setIsEditingBank] = useState(false);

  // Messaging
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgUser, setMsgUser] = useState<any>(null);
  const [msgContent, setMsgContent] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // Venue Form
  const [venueName, setVenueName] = useState('');
  const [venueLocation, setVenueLocation] = useState('');

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const response = await userApi.getProfile();
        if (response.data.role !== 'admin') {
          router.push('/profile');
          return;
        }
        setIsAdmin(true);
        fetchData();
      } catch (err) {
        router.push('/login');
      }
    };

    checkAdmin();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tutorsRes, courseAppsRes, settingsRes, venuesRes, usersRes, logsRes, sessionsRes, financesRes, profileRes, banksRes, messagesRes] = await Promise.all([
        adminApi.getPendingTutors().catch(() => ({ data: [] })),
        adminApi.getPendingCourseApplications().catch(() => ({ data: [] })),
        adminApi.getSettings().catch(() => ({ data: {} })),
        adminApi.getVenues().catch(() => ({ data: [] })),
        adminApi.getAllUsers().catch(() => ({ data: [] })),
        adminApi.getAdminLogs().catch(() => ({ data: [] })),
        adminApi.getAllSessions().catch(() => ({ data: [] })),
        adminApi.getFinances().catch(() => ({ data: {} })),
        userApi.getProfile().catch(() => ({ data: {} })),
        bankApi.getBanks().catch(() => ({ data: [] })),
        messageApi.getChatList().catch(() => ({ data: [] }))
      ]);

      setPendingTutors(tutorsRes.data || []);
      setCourseApplications(courseAppsRes.data || []);
      setSettings(settingsRes.data || {});
      setVenues(venuesRes.data || []);
      setUsers(usersRes.data || []);
      setLogs(logsRes.data || []);
      setSessions(sessionsRes.data || []);
      setFinances(financesRes.data || {});
      setAdminUser(profileRes.data || {});
      setBanks(banksRes.data || []);
      setSupportMessages(messagesRes.data || []);
      
      if (settingsRes.data) {
        setMaxHourlyRate(settingsRes.data.maxHourlyRate || 0);
        setRegistrationFee(settingsRes.data.registrationFee || 0);
        setMinSessions(settingsRes.data.minSessionsForVerify || 0);
        setMinRating(settingsRes.data.minRatingForVerify || 0);
        setIsRegistrationFree(!!settingsRes.data.isRegistrationFree);
        setPlatformCommission(settingsRes.data.platformCommissionPercent || 10);
        setNoShowPayout(settingsRes.data.noShowPayoutPercent || 30);
        setDefaultHourlyRate(settingsRes.data.defaultHourlyRate || 500);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch admin data', err);
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, status: 'approve' | 'reject' | 'needs_revision') => {
    let feedback = '';
    if (status === 'reject' || status === 'needs_revision') {
      feedback = prompt(`Enter feedback/reason for ${status.replace('_', ' ')}:`) || '';
      if (!feedback && status === 'needs_revision') {
        alert('Feedback is required for revision requests.');
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to approve this tutor?`)) return;
    }

    try {
      await adminApi.approveTutor(id, status, feedback);
      alert(`Tutor ${status.replace('_', ' ')}d successfully`);
      fetchData();
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleProcessCourseApp = async (userId: string, appId: string, status: 'approved' | 'rejected') => {
    let feedback = '';
    if (status === 'rejected') {
      feedback = prompt('Enter reason for rejection:') || '';
    } else {
      if (!confirm('Approve these new courses for the tutor?')) return;
    }

    try {
      await adminApi.processCourseApplication(userId, appId, status, feedback);
      alert(`Course application ${status} successfully`);
      fetchData();
    } catch (err) {
      alert('Action failed');
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.updateSettings({
        maxHourlyRate,
        registrationFee,
        minSessionsForVerify: minSessions,
        minRatingForVerify: minRating,
        isRegistrationFree,
        platformCommissionPercent: platformCommission,
        noShowPayoutPercent: noShowPayout,
        defaultHourlyRate
      });
      alert('Settings updated');
    } catch (err) {
      alert('Update failed');
    }
  };

  const handleAddVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.addVenue({ name: venueName, location: venueLocation });
      setVenueName('');
      setVenueLocation('');
      fetchData();
      alert('Venue added');
    } catch (err) {
      alert('Failed to add venue');
    }
  };

  const handleDeleteVenue = async (id: string) => {
    if (!confirm('Delete this venue?')) return;
    try {
      await adminApi.deleteVenue(id);
      fetchData();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleVerifyAccount = async () => {
    if (!accountNumber || !selectedBankCode) return;
    setVerifyingAccount(true);
    try {
        const res = await bankApi.verifyAccount(accountNumber, selectedBankCode);
        setAccountName(res.data.account_name);
    } catch (err: any) {
        alert('Could not verify account. Please check details.');
    } finally {
        setVerifyingAccount(false);
    }
  };

  const handleUpdateAdminBank = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
        const bankName = banks.find(b => b.code === selectedBankCode)?.name || '';
        await userApi.updateProfile({
            bankName,
            bankCode: selectedBankCode,
            accountNumber,
            accountName
        } as any);
        alert('Bank details updated successfully');
        fetchData();
    } catch (err) {
        alert('Failed to update bank details');
    } finally {
        setLoading(false);
    }
  };

  const handleSetAdminPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin !== confirmPin) {
        alert('PINs do not match');
        return;
    }
    const currentPassword = prompt('Enter your admin password to set your Transaction PIN:');
    if (!currentPassword) return;

    setIsSettingPin(true);
    try {
        await walletApi.setTransactionPin({ pin: newPin, currentPassword });
        alert('Transaction PIN set successfully!');
        setNewPin('');
        setConfirmPin('');
        fetchData();
    } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to set PIN');
    } finally {
        setIsSettingPin(false);
    }
  };

  const handleWithdrawFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }
    
    if (amount > finances.adminBalance) {
      setFormError('Insufficient balance in admin wallet');
      return;
    }

    setWithdrawing(true);
    try {
      await walletApi.withdrawFunds({ amount, pin: withdrawPin });
      alert('Withdrawal initiated successfully!');
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawPin('');
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgContent.trim()) return;
    setSendingMsg(true);
    try {
      await adminApi.sendMessageToUser(msgUser._id, msgContent);
      alert(`Message sent to ${msgUser.name}`);
      setShowMsgModal(false);
      setMsgContent('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send message');
    } finally {
      setSendingMsg(false);
    }
  };

  if (!isAdmin || loading) {
    return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>Loading Admin Dashboard...</div>;
  }

  return (
    <main className="container pb-space-8 pt-space-8">
      <h1 className="page-header__title" style={{ marginBottom: 'var(--space-6)' }}>Admin Control Panel</h1>
      
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', flexWrap: 'wrap' }}>
          {[
            { id: 'tutors', label: `Pending Tutors (${pendingTutors.length})` },
            { id: 'course_apps', label: `Course Apps (${courseApplications.length})` },
            { id: 'support', label: `Messages & Support (${supportMessages.filter((m: any) => m.unreadCount > 0).length || 0})` },
            { id: 'marketplace', label: 'Marketplace' },
            { id: 'users', label: 'User Mgmt' },
            { id: 'sessions', label: 'Sessions' },
            { id: 'finances', label: 'Finances' },
            { id: 'logs', label: 'Activity Logs' },
            { id: 'settings', label: 'Settings' },
            { id: 'venues', label: 'Venues' }
          ].map((tab) => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{ 
                  flex: '1 1 auto', padding: 'var(--space-4)', border: 'none', background: 'none', cursor: 'pointer',
                  borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : 'none',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  color: activeTab === tab.id ? 'var(--primary-color)' : '#64748B',
                  minWidth: '120px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="card__body" style={{ minHeight: '400px' }}>
          {activeTab === 'tutors' && (
            <div>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Tutor Verification Queue</h2>
              {pendingTutors.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748B', marginTop: '40px' }}>No tutors awaiting approval.</p>
              ) : (
                <div className="card" style={{ border: '1px solid #E2E8F0', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', backgroundColor: '#F8FAFC' }}>
                        <th style={{ padding: 'var(--space-3)' }}>Tutor Profile</th>
                        <th style={{ padding: 'var(--space-3)' }}>Documents</th>
                        <th style={{ padding: 'var(--space-3)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingTutors.map((tutor) => (
                        <tr key={tutor._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: 'var(--space-3)' }}>
                            <div style={{ fontWeight: 'bold' }}>{tutor.name}</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>{tutor.registrationNumber} · {tutor.faculty}</div>
                          </td>
                          <td style={{ padding: 'var(--space-3)' }}>
                            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                              {tutor.documents?.admissionLetter ? (
                                <a href={getImageUrl(tutor.documents.admissionLetter)} target="_blank" className="btn btn--secondary btn--sm" rel="noreferrer">Admission</a>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94A3B8', padding: '4px 8px' }}>No Admission</span>
                              )}
                              {tutor.documents?.transcript ? (
                                <a href={getImageUrl(tutor.documents.transcript)} target="_blank" className="btn btn--secondary btn--sm" rel="noreferrer">Transcript</a>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#94A3B8', padding: '4px 8px' }}>No Result</span>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: 'var(--space-3)' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleApprove(tutor._id, 'approve')} className="btn btn--primary btn--sm" style={{ backgroundColor: 'var(--success-green)', color: 'white' }}>Approve</button>
                              <button onClick={() => handleApprove(tutor._id, 'needs_revision')} className="btn btn--secondary btn--sm" style={{ color: 'var(--primary-color)' }}>Revision</button>
                              <button onClick={() => handleApprove(tutor._id, 'reject')} className="btn btn--secondary btn--sm" style={{ color: '#DC2626' }}>Reject</button>
                              <button 
                                onClick={() => {
                                  setMsgUser(tutor);
                                  setShowMsgModal(true);
                                }}
                                className="btn btn--secondary btn--sm"
                                style={{ color: 'var(--primary-color)' }}
                              >
                                ✉️ Msg
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'course_apps' && (
            <div>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>New Course Applications</h2>
              {courseApplications.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748B', marginTop: '40px' }}>No new course applications.</p>
              ) : (
                <div className="card" style={{ border: '1px solid #E2E8F0', overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', backgroundColor: '#F8FAFC' }}>
                        <th style={{ padding: 'var(--space-3)' }}>Tutor</th>
                        <th style={{ padding: 'var(--space-3)' }}>New Courses</th>
                        <th style={{ padding: 'var(--space-3)' }}>Transcript</th>
                        <th style={{ padding: 'var(--space-3)' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {courseApplications.map((app) => (
                        <tr key={app._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: 'var(--space-3)' }}>
                            <div style={{ fontWeight: 'bold' }}>{app.userName}</div>
                            <div style={{ fontSize: '12px', color: '#64748B' }}>{app.registrationNumber}</div>
                          </td>
                          <td style={{ padding: 'var(--space-3)' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {app.courses.map((c: string) => (
                                <span key={c} style={{ fontSize: '11px', background: '#E2E8F0', padding: '2px 6px', borderRadius: '4px' }}>{c}</span>
                              ))}
                            </div>
                          </td>
                          <td style={{ padding: 'var(--space-3)' }}>
                            <a href={getImageUrl(app.transcript)} target="_blank" className="btn btn--secondary btn--sm" rel="noreferrer">View Transcript</a>
                          </td>
                          <td style={{ padding: 'var(--space-3)' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button onClick={() => handleProcessCourseApp(app.userId, app._id, 'approved')} className="btn btn--primary btn--sm" style={{ backgroundColor: 'var(--success-green)', color: 'white' }}>Approve</button>
                              <button onClick={() => handleProcessCourseApp(app.userId, app._id, 'rejected')} className="btn btn--secondary btn--sm" style={{ color: '#DC2626' }}>Reject</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'support' && (
            <div>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Messages & Support</h2>
              {supportMessages.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#64748B', marginTop: '40px' }}>No messages yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  {supportMessages.map((msg: any) => (
                    <div key={msg.partner._id} className="card" style={{ border: '1px solid #E2E8F0', cursor: 'pointer' }} onClick={() => {
                        setMsgUser(msg.partner);
                        setShowMsgModal(true);
                    }}>
                      <div className="card__body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{msg.partner.name} <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 'normal' }}>({msg.partner.role})</span></div>
                          <div style={{ fontSize: '14px', color: '#64748B', marginTop: '4px' }}>
                            {msg.lastMessage?.content?.substring(0, 50) || 'Attachment'}...
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: '#94A3B8' }}>{new Date(msg.lastMessage?.createdAt).toLocaleDateString()}</div>
                          {msg.unreadCount > 0 && (
                            <span style={{ backgroundColor: '#DC2626', color: 'white', borderRadius: '50%', padding: '2px 8px', fontSize: '12px', marginTop: '4px', display: 'inline-block' }}>{msg.unreadCount}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'marketplace' && (
            <div>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Tutor Marketplace Oversight</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {users.filter(u => u.role.includes('tutor') && u.isApproved).map(tutor => (
                  <div key={tutor._id} className="card" style={{ border: '1px solid #E2E8F0' }}>
                    <div className="card__body">
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {tutor.documents?.profilePicture ? (
                            <img 
                              src={getImageUrl(tutor.documents.profilePicture)} 
                              alt={tutor.name} 
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            />
                          ) : (
                            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                              {tutor.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div>
                          <h4 style={{ margin: 0 }}>{tutor.name}</h4>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{tutor.department}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: '14px', marginBottom: '12px' }}>
                        <strong>Rate:</strong> ₦{tutor.hourlyRate}/hr
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748B' }}>
                        <span>Sessions: {tutor.sessionsCompleted || 0}</span>
                        <span>Rating: ★{tutor.averageRating || 'N/A'}</span>
                      </div>
                      <div style={{ marginTop: '15px' }}>
                        <button 
                          onClick={() => {
                            if (confirm(`Hide ${tutor.name} from marketplace? This will unapprove them.`)) {
                              handleApprove(tutor._id, 'reject');
                            }
                          }}
                          className="btn btn--secondary btn--sm btn--block" 
                          style={{ color: '#DC2626' }}
                        >
                          Hide from Marketplace
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {users.filter(u => u.role.includes('tutor') && u.isApproved).length === 0 && (
                   <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#64748B', padding: '40px' }}>
                     No active tutors in the marketplace.
                   </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>All Users ({users.length})</h2>
              <div className="card" style={{ border: '1px solid #E2E8F0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', backgroundColor: '#F8FAFC' }}>
                      <th style={{ padding: 'var(--space-3)' }}>User</th>
                      <th style={{ padding: 'var(--space-3)' }}>Role</th>
                      <th style={{ padding: 'var(--space-3)' }}>Status</th>
                      <th style={{ padding: 'var(--space-3)' }}>Documents</th>
                      <th style={{ padding: 'var(--space-3)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <div style={{ fontWeight: 'bold' }}>{u.name}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{u.email}</div>
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <span className={`tutor-card__badge ${u.role === 'admin' ? 'tutor-card__badge--orange' : u.role.includes('tutor') ? 'tutor-card__badge--green' : ''}`}>
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          {u.isApproved ? (
                            <span style={{ color: 'var(--success-green)', fontSize: '14px' }}>● Active</span>
                          ) : (
                            <span style={{ color: '#DC2626', fontSize: '14px' }}>● Pending</span>
                          )}
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          {u.role.includes('tutor') && (
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              {u.documents?.admissionLetter && (
                                <a href={getImageUrl(u.documents.admissionLetter)} target="_blank" style={{ fontSize: '11px', color: 'var(--primary-color)', textDecoration: 'underline' }} rel="noreferrer">Letter</a>
                              )}
                              {u.documents?.transcript && (
                                <a href={getImageUrl(u.documents.transcript)} target="_blank" style={{ fontSize: '11px', color: 'var(--primary-color)', textDecoration: 'underline' }} rel="noreferrer">Result</a>
                              )}
                              {!u.documents?.admissionLetter && !u.documents?.transcript && (
                                <span style={{ fontSize: '11px', color: '#94A3B8' }}>None</span>
                              )}
                            </div>
                          )}
                          {!u.role.includes('tutor') && <span style={{ color: '#E2E8F0' }}>—</span>}
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button 
                              onClick={async () => {
                                if (confirm(`Suspend ${u.name}?`)) {
                                  await adminApi.updateUserStatus(u._id, { isApproved: false });
                                  fetchData();
                                }
                              }}
                              className="btn btn--secondary btn--sm" 
                              style={{ color: '#DC2626' }}
                              disabled={u.role === 'admin'}
                            >
                              Suspend
                            </button>
                            <button 
                              onClick={async () => {
                                if (confirm(`Approve ${u.name}?`)) {
                                  await adminApi.updateUserStatus(u._id, { isApproved: true });
                                  fetchData();
                                }
                              }}
                              className="btn btn--primary btn--sm"
                              style={{ backgroundColor: 'var(--success-green)', color: 'white' }}
                              disabled={u.role === 'admin' || u.isApproved}
                            >
                              Activate
                            </button>
                            <button 
                               onClick={() => {
                                 setMsgUser(u);
                                 setShowMsgModal(true);
                               }}
                               className="btn btn--secondary btn--sm"
                               style={{ color: 'var(--primary-color)' }}
                             >
                               ✉️ Msg
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Global Session Monitoring</h2>
              <div className="card" style={{ border: '1px solid #E2E8F0', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left', backgroundColor: '#F8FAFC' }}>
                      <th style={{ padding: 'var(--space-3)' }}>Session</th>
                      <th style={{ padding: 'var(--space-3)' }}>Tutor/Tutee</th>
                      <th style={{ padding: 'var(--space-3)' }}>Status</th>
                      <th style={{ padding: 'var(--space-3)' }}>Escrow</th>
                      <th style={{ padding: 'var(--space-3)' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map(s => (
                      <tr key={s._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <div style={{ fontWeight: 'bold' }}>{s.topic}</div>
                          <div style={{ fontSize: '12px', color: '#64748B' }}>{new Date(s.date).toLocaleDateString()} · {s.time}</div>
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <div style={{ fontSize: '14px' }}><strong>Tutor:</strong> {s.tutorId?.name || 'Unknown'}</div>
                          <div style={{ fontSize: '14px' }}><strong>Tutee:</strong> {s.tuteeId?.name || 'Unknown'}</div>
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <span className={`tutor-card__badge ${s.status === 'active' ? 'tutor-card__badge--green' : s.status === 'pending' ? 'tutor-card__badge--orange' : ''}`}>
                            {s.status}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <div style={{ fontSize: '14px' }}>₦{s.amount}</div>
                          <div style={{ fontSize: '12px', color: s.escrowStatus === 'held' ? 'orange' : 'var(--success-green)' }}>{s.escrowStatus}</div>
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          {s.status === 'pending' && (
                            <button 
                              onClick={async () => {
                                if (confirm('Manually cancel this session? Funds will be refunded if held.')) {
                                  await adminApi.overrideSession(s._id, { status: 'cancelled', escrowStatus: 'refunded' });
                                  fetchData();
                                }
                              }}
                              className="btn btn--secondary btn--sm" 
                              style={{ color: '#DC2626' }}
                            >
                              Cancel
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'finances' && finances && (
            <div>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Financial Health Monitor</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
                <div className="card" style={{ border: '1px solid #E2E8F0', padding: '20px' }}>
                  <div style={{ color: '#64748B', fontSize: '14px', marginBottom: '8px' }}>Total Wallet Balances</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₦{finances.totalWalletBalance?.toLocaleString()}</div>
                </div>
                <div className="card" style={{ border: '1px solid #E2E8F0', padding: '20px' }}>
                  <div style={{ color: '#64748B', fontSize: '14px', marginBottom: '8px' }}>Funds in Escrow</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'orange' }}>₦{finances.totalEscrowBalance?.toLocaleString()}</div>
                </div>
                <div className="card" style={{ border: '1px solid #E2E8F0', padding: '20px' }}>
                  <div style={{ color: '#64748B', fontSize: '14px', marginBottom: '8px' }}>Recent Activity (30d)</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{finances.recentWalletActivity} txns</div>
                </div>
                <div className="card" style={{ border: '1px solid #E2E8F0', padding: '20px', background: '#f8fafc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ color: '#64748B', fontSize: '14px', marginBottom: '8px' }}>Admin Wallet Balance</div>
                      <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>₦{finances.adminBalance?.toLocaleString() || '0'}</div>
                    </div>
                    {finances.adminBalance > 0 && (
                      <button 
                        onClick={() => {
                          if (!adminUser?.bankDetails?.accountNumber) {
                            alert('Please set your payout bank account first (Step 1 below).');
                          } else if (!adminUser?.transactionPin) {
                            alert('Please set your transaction PIN first (Step 2 below).');
                          } else {
                            setShowWithdrawModal(true);
                          }
                        }}
                        className="btn btn--primary btn--sm"
                      >
                        Withdraw
                      </button>
                    )}
                  </div>
                </div>
                <div className="card" style={{ border: '1px solid #E2E8F0', padding: '20px', background: '#f8fafc' }}>
                  <div style={{ color: '#64748B', fontSize: '14px', marginBottom: '8px' }}>Total Platform Revenue</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--success-green)' }}>
                    ₦{finances.platformFees?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>

              {/* Security & Bank Setup for Admin Withdrawal */}
              <div style={{ marginTop: '30px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                {(!adminUser?.bankDetails?.accountNumber || isEditingBank) && (
                  <div className="card" style={{ border: '1px solid #fee2e2', background: '#fffefc' }}>
                    <div className="card__body">
                      <h3 style={{ fontSize: '16px', color: '#b91c1c', marginBottom: '15px' }}>
                        {adminUser?.bankDetails?.accountNumber ? 'Update Payout Account' : 'Step 1: Set Payout Bank Account'}
                      </h3>
                      {adminUser?.bankDetails?.accountNumber && (
                         <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '10px' }}>
                            You are currently updating your active bank details.
                         </div>
                      )}
                      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px' }}>Provide a bank account where your platform earnings will be sent.</p>
                      <form onSubmit={async (e) => {
                          await handleUpdateAdminBank(e);
                          setIsEditingBank(false);
                      }}>
                        <div className="form-group">
                          <label className="form-label">Select Bank</label>
                          <select className="form-input" value={selectedBankCode} onChange={e => setSelectedBankCode(e.target.value)} required>
                            <option value="">Select Bank</option>
                            {banks.map((b, index) => (
                              <option key={`${b.code}-${index}`} value={b.code}>{b.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Account Number</label>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <input type="text" className="form-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} placeholder="10 digits" maxLength={10} required />
                            <button type="button" onClick={handleVerifyAccount} className="btn btn--secondary btn--sm" disabled={verifyingAccount || accountNumber.length < 10}>
                              {verifyingAccount ? '...' : 'Verify'}
                            </button>
                          </div>
                        </div>
                        {accountName && (
                          <div style={{ padding: '8px', background: '#f0fdf4', color: '#166534', borderRadius: '4px', fontSize: '13px', marginBottom: '15px' }}>
                            <strong>Account Name:</strong> {accountName}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '10px' }}>
                           <button type="submit" className="btn btn--primary btn--sm btn--block" disabled={!accountName}>
                              {adminUser?.bankDetails?.accountNumber ? 'Confirm Update' : 'Save Bank Details'}
                           </button>
                           {adminUser?.bankDetails?.accountNumber && (
                              <button type="button" onClick={() => setIsEditingBank(false)} className="btn btn--secondary btn--sm">Cancel</button>
                           )}
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {!adminUser?.transactionPin && (
                  <div className="card" style={{ border: '1px solid #fffbeb', background: '#fffefc' }}>
                    <div className="card__body">
                      <h3 style={{ fontSize: '16px', color: '#92400e', marginBottom: '15px' }}>Step 2: Set Transaction PIN</h3>
                      <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '15px' }}>A secure PIN is required to authorize all withdrawals.</p>
                      <form onSubmit={handleSetAdminPin}>
                        <div className="form-group">
                          <label className="form-label">New PIN (4-6 digits)</label>
                          <input type="password" className="form-input" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))} maxLength={6} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Confirm PIN</label>
                          <input type="password" className="form-input" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, ''))} maxLength={6} required />
                        </div>
                        <button type="submit" className="btn btn--primary btn--sm btn--block" disabled={isSettingPin || !newPin || newPin !== confirmPin}>
                          {isSettingPin ? 'Setting PIN...' : 'Set Transaction PIN'}
                        </button>
                      </form>
                    </div>
                  </div>
                )}

                {adminUser?.bankDetails?.accountNumber && !isEditingBank && (
                   <div className="card" style={{ border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                     <div className="card__body" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🏦</div>
                        <h3 style={{ fontSize: '16px', margin: '0 0 8px' }}>Payout Bank Account</h3>
                        <div style={{ background: 'white', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'left', marginBottom: '15px' }}>
                           <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#64748b' }}>Current Active Account:</p>
                           <p style={{ margin: 0, fontWeight: 'bold' }}>{adminUser.bankDetails.bankName}</p>
                           <p style={{ margin: 0, fontSize: '14px' }}>{adminUser.bankDetails.accountNumber}</p>
                           <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>{adminUser.bankDetails.accountName}</p>
                        </div>
                        <button onClick={() => {
                          setAccountNumber(adminUser.bankDetails.accountNumber);
                          setSelectedBankCode(adminUser.bankDetails.bankCode);
                          setAccountName(adminUser.bankDetails.accountName);
                          setIsEditingBank(true);
                        }} className="btn btn--outline btn--sm btn--block">Update Bank Details</button>
                     </div>
                   </div>
                )}

                {adminUser?.transactionPin && (
                   <div className="card" style={{ border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                     <div className="card__body" style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '32px', marginBottom: '10px' }}>🔐</div>
                        <h3 style={{ fontSize: '16px', margin: '0 0 8px' }}>Withdrawal PIN Set</h3>
                        <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 15px' }}>Your account is secured with a transaction PIN.</p>
                        <button onClick={() => {
                          setAdminUser({ ...adminUser, transactionPin: '' });
                        }} className="btn btn--outline btn--sm btn--block">Change Security PIN</button>
                     </div>
                   </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Recent Administrative Actions</h2>
              <div className="card" style={{ border: '1px solid #E2E8F0' }}>
                <div className="card__body" style={{ padding: '0' }}>
                  {logs.length === 0 ? (
                    <p style={{ padding: '20px', textAlign: 'center' }}>No logs recorded yet.</p>
                  ) : (
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                      {logs.map((log) => (
                        <div key={log._id} style={{ padding: '15px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{log.action}</div>
                            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>{log.details}</div>
                            <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '4px' }}>
                              By {log.adminId?.name || 'Admin'} · {new Date(log.createdAt).toLocaleString()}
                            </div>
                          </div>
                          <span style={{ fontSize: '11px', backgroundColor: '#F1F5F9', padding: '2px 6px', borderRadius: '4px' }}>
                            ID: {log.targetId?.substring(log.targetId.length - 6)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div style={{ maxWidth: '500px' }}>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Global System Settings</h2>
              <form onSubmit={handleUpdateSettings}>
                <div className="form-group">
                  <label className="form-label">General Hourly Rate for New Tutors (₦)</label>
                  <input type="number" className="form-input" value={defaultHourlyRate} onChange={(e) => setDefaultHourlyRate(Number(e.target.value))} />
                  <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>This rate applies to all tutors until they are verified.</p>
                </div>
                <div className="form-group">
                  <label className="form-label">Max Hourly Rate Allowed (₦)</label>
                  <input type="number" className="form-input" value={maxHourlyRate} onChange={(e) => setMaxHourlyRate(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Tutor Registration Fee (₦)</label>
                  <input type="number" className="form-input" value={registrationFee} onChange={(e) => setRegistrationFee(Number(e.target.value))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Min Sessions for Verification</label>
                  <input type="number" className="form-input" value={minSessions} onChange={(e) => setMinSessions(Number(e.target.value))} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input type="checkbox" id="isFree" checked={isRegistrationFree} onChange={(e) => setIsRegistrationFree(e.target.checked)} />
                  <label htmlFor="isFree" className="form-label" style={{ marginBottom: 0 }}>Make Tutor Registration Free</label>
                </div>
                <div className="form-group">
                   <label className="form-label">Platform Commission (%)</label>
                   <input type="number" className="form-input" value={platformCommission} onChange={(e) => setPlatformCommission(Number(e.target.value))} />
                </div>
                <div className="form-group">
                   <label className="form-label">Tutor Payout for Student No-Show (%)</label>
                   <input type="number" className="form-input" value={noShowPayout} onChange={(e) => setNoShowPayout(Number(e.target.value))} />
                </div>
                <button type="submit" className="btn btn--primary" style={{ marginTop: '20px' }}>Save Settings</button>
              </form>
            </div>
          )}

          {activeTab === 'venues' && (
            <div>
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Venue Management</h2>
              <div style={{ display: 'flex', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
                  <div style={{ flex: '1 1 300px' }} className="card">
                    <div className="card__body">
                        <h3>Add New Venue</h3>
                        <form onSubmit={handleAddVenue}>
                            <div className="form-group">
                                <label className="form-label">Venue Name</label>
                                <input type="text" className="form-input" value={venueName} onChange={(e) => setVenueName(e.target.value)} placeholder="e.g. CBT Centre" required />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Location/Description</label>
                                <input type="text" className="form-input" value={venueLocation} onChange={(e) => setVenueLocation(e.target.value)} placeholder="e.g. Near Faculty of Arts" required />
                            </div>
                            <button type="submit" className="btn btn--primary btn--sm">Add Venue</button>
                        </form>
                    </div>
                  </div>
                  <div style={{ flex: '2 1 400px' }} className="card">
                    <div className="card__body">
                        <h3>Venue List</h3>
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'var(--space-2)' }}>
                              <thead>
                                  <tr style={{ borderBottom: '1px solid #E2E8F0', textAlign: 'left' }}>
                                      <th style={{ padding: '8px' }}>Name</th>
                                      <th style={{ padding: '8px' }}>Location</th>
                                      <th style={{ padding: '8px' }}>Action</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {venues.map(v => (
                                      <tr key={v._id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                          <td style={{ padding: '8px' }}>{v.name}</td>
                                          <td style={{ padding: '8px', fontSize: '14px', color: '#64748B' }}>{v.location}</td>
                                          <td style={{ padding: '8px' }}>
                                              <button onClick={() => handleDeleteVenue(v._id)} style={{ color: '#DC2626', border: 'none', background: 'none', cursor: 'pointer' }}>Delete</button>
                                          </td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                        </div>
                    </div>
                  </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Withdrawal Modal */}
      {showWithdrawModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '450px', width: '100%', position: 'relative', borderRadius: '16px' }}>
            <div className="card__body" style={{ padding: 'var(--space-6)' }}>
              <button 
                onClick={() => setShowWithdrawModal(false)} 
                style={{ position: 'absolute', right: '20px', top: '20px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#64748B' }}
              >
                ×
              </button>
              
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-6)' }}>Withdraw Admin Funds</h2>
              
              <form onSubmit={handleWithdrawFunds} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 4px' }}>Withdrawal Payout to:</p>
                  <p style={{ fontSize: '14px', fontWeight: 'bold', margin: 0 }}>{adminUser?.bankDetails?.bankName}</p>
                  <p style={{ fontSize: '14px', margin: 0 }}>{adminUser?.bankDetails?.accountNumber}</p>
                </div>
                
                <div>
                  <label className="form-label">Amount to Withdraw (₦)</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    placeholder="Enter amount"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    max={finances.adminBalance}
                    required
                  />
                  <p style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    Max available: ₦{finances.adminBalance?.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="form-label">Transaction PIN</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Enter PIN"
                    maxLength={6}
                    value={withdrawPin}
                    onChange={(e) => setWithdrawPin(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                
                {formError && (
                  <p style={{ color: '#DC2626', fontSize: '14px', margin: 0 }}>{formError}</p>
                )}
                
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <button 
                    type="submit" 
                    className="btn btn--primary btn--block"
                    disabled={withdrawing}
                  >
                    {withdrawing ? 'Processing...' : 'Initiate Payout'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn--outline btn--block" 
                    onClick={() => setShowWithdrawModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Message Modal */}
      {showMsgModal && msgUser && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(30, 41, 59, 0.8)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1001, padding: '20px'
        }}>
          <div className="card" style={{ maxWidth: '500px', width: '100%', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
            <div className="card__body" style={{ padding: 'var(--space-6)' }}>
               <h2 className="section-header__title" style={{ marginBottom: 'var(--space-1)', fontSize: '20px' }}>Message {msgUser.name}</h2>
               <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '20px' }}>This will be sent as an official admin notification.</p>
               
               <form onSubmit={handleSendMessage}>
                  <div className="form-group">
                     <textarea 
                        className="form-input" 
                        rows={6} 
                        placeholder="Type your message here..."
                        value={msgContent}
                        onChange={(e) => setMsgContent(e.target.value)}
                        required
                        style={{ width: '100%', borderRadius: '8px', padding: '12px' }}
                     />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                     <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={sendingMsg}>
                        {sendingMsg ? 'Sending...' : 'Send Message'}
                     </button>
                     <button type="button" className="btn btn--outline" style={{ flex: 1 }} onClick={() => setShowMsgModal(false)}>
                        Cancel
                     </button>
                  </div>
               </form>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

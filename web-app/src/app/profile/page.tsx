'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userApi, bankApi, walletApi, adminApi, messageApi } from '../../services/api';
import { universityData } from '../../data/universityData';
import { getImageUrl } from '../../utils/image';
import CourseApplicationModal from '../../components/CourseApplicationModal';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  // Support Modal
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [supportMsg, setSupportMsg] = useState('');
  const [sendingSupport, setSendingSupport] = useState(false);
  
  // Multi-step Wizard State for Tutors
  const [currentStep, setCurrentStep] = useState(1);
  
  // Step 1: Personal + Bank Details
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState('100L');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [banks, setBanks] = useState<any[]>([]);
  const [verifyingAccount, setVerifyingAccount] = useState(false);

  // Transaction PIN
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinSet, setPinSet] = useState(false);

  // Step 2: Educational Background
  const [teachingLevel, setTeachingLevel] = useState('');
  const [courses, setCourses] = useState('');
  const [areaOfStrength, setAreaOfStrength] = useState('');
  const [matchingBio, setMatchingBio] = useState('');
  const [about, setAbout] = useState('');
  
  // Step 3: Documents (Files)
  const [admissionLetter, setAdmissionLetter] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<File | null>(null);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);

  // Step 4: Payment / Admin Settings
  const [wallet, setWallet] = useState<any>(null);
  const [adminSettings, setAdminSettings] = useState<any>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    const fetchProfileData = async () => {
      try {
        const [profileRes, settingsRes] = await Promise.all([
          userApi.getProfile(),
          adminApi.getSettings()
        ]);
        
        const data = profileRes.data;
        setUser(data);
        setAdminSettings(settingsRes.data);
        
        // Initialize fields if they exist
        setFaculty(data.faculty || '');
        setDepartment(data.department || '');
        setPhone(data.phone || '');
        setLevel(data.level || '100L');
        setTeachingLevel(data.teachingLevel || '');
        setCourses(data.courses?.join(', ') || '');
        setAreaOfStrength(data.areaOfStrength || '');
        setMatchingBio(data.matchingBio || '');
        setAbout(data.about || '');
        
        if (!data.isProfileComplete && data.role === 'tutor') {
            setCurrentStep((data.profileStep || 0) + 1);
        }
        
        if (data.bankDetails) {
            setBankCode(data.bankDetails.bankCode || '');
            setBankName(data.bankDetails.bankName || '');
            setAccountNumber(data.bankDetails.accountNumber || '');
            setAccountName(data.bankDetails.accountName || '');
        }
        setPinSet(!!data.transactionPin);

        // Fetch wallet if tutor
        if (data.role === 'tutor') {
            const walletRes = await walletApi.getWallet();
            setWallet(walletRes.data);
        }

        setLoading(false);
      } catch (err) {
        console.error('Failed to fetch profile', err);
        setError('Failed to load profile. Please log in again.');
        localStorage.removeItem('token');
        router.push('/login');
      }
    };

    const fetchBanks = async () => {
        try {
            const res = await bankApi.getBanks();
            setBanks(res.data);
        } catch (err) {
            console.error('Failed to fetch banks');
        }
    };

    fetchProfileData();
    fetchBanks();
  }, [router]);

  const handleUpdateStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const data = new FormData();
      data.append('step', currentStep.toString());

      if (currentStep === 1) {
          data.append('faculty', faculty);
          data.append('department', department);
          data.append('phone', phone);
          data.append('level', level);
          data.append('bankName', bankName);
          data.append('bankCode', bankCode);
          data.append('accountNumber', accountNumber);
          data.append('accountName', accountName);

          // Handle PIN setup
          if (!pinSet && pin) {
              if (pin !== confirmPin) {
                  setError('PINs do not match');
                  setSaving(false);
                  return;
              }
              // We'll set the PIN separately via walletApi since it requires password verification
              // For the wizard, we'll just allow setting it once. 
              // Better: Add a "PIN" step or just call setPin here if provided.
          }
      } else if (currentStep === 2) {
          data.append('teachingLevel', teachingLevel);
          data.append('courses', JSON.stringify(courses.split(',').map(c => c.trim())));
          data.append('areaOfStrength', areaOfStrength);
          data.append('matchingBio', matchingBio);
          data.append('about', about);
      } else if (currentStep === 3) {
          if (admissionLetter) data.append('admissionLetter', admissionLetter);
          if (transcript) data.append('transcript', transcript);
          if (profilePicture) data.append('profilePicture', profilePicture);
      }

      const res = await userApi.updateProfile(data);
      const updatedUser = res.data;
      setUser(updatedUser);
      
      if (currentStep < 4) {
          setCurrentStep(currentStep + 1);
      } else if (currentStep === 4) {
          alert('Profile completed! Awaiting admin approval.');
          if (updatedUser.role === 'tutor' || updatedUser.role === 'verified_tutor') {
              router.push('/tutor-dashboard');
          } else {
              window.location.reload();
          }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update profile step');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSaving(true);
    setError('');
    try {
        const data = new FormData();
        data.append('profilePicture', file);
        const res = await userApi.updateProfile(data);
        setUser(res.data);
        
        // Dispatch custom event to notify other components (like Header) to refresh
        window.dispatchEvent(new Event('profileUpdated'));
        
        const newUrl = res.data.documents?.profilePicture;
        alert(`Profile picture updated successfully!\n\nNew URL: ${newUrl || 'None found in response'}`);
    } catch (err: any) {
        console.error('Upload error details:', err.response?.data);
        const msg = err.response?.data?.message || 'Failed to upload profile picture';
        setError(msg);
        alert(`Upload Failed: ${msg}`);
    } finally {
        setSaving(false);
    }
  };

  const handleContactSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportMsg.trim()) return;
    setSendingSupport(true);
    try {
        const res = await userApi.getAdminId();
        const adminId = res.data._id;
        await messageApi.sendMessage({ receiverId: adminId, content: supportMsg });
        alert('Message sent to Support! We will reply shortly.');
        setShowSupportModal(false);
        setSupportMsg('');
    } catch (err: any) {
        alert(err.response?.data?.message || 'Failed to send message');
    } finally {
        setSendingSupport(false);
    }
  };

  const handleVerifyAccount = async () => {
      if (!accountNumber || !bankCode) return;
      setVerifyingAccount(true);
      setError('');
      try {
          const res = await bankApi.verifyAccount(accountNumber, bankCode);
          setAccountName(res.data.account_name);
      } catch (err: any) {
          setError('Could not verify account. Please check details.');
      } finally {
          setVerifyingAccount(false);
      }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin !== confirmPin) {
        setError('PINs do not match');
        return;
    }
    const currentPassword = prompt('For security, please enter your current password to set your PIN:');
    if (!currentPassword) return;

    setSaving(true);
    try {
        await walletApi.setTransactionPin({ pin, currentPassword });
        setPinSet(true);
        alert('Transaction PIN set successfully!');
    } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to set PIN');
    } finally {
        setSaving(false);
    }
  };

  const handleCapturePayment = async () => {
    setSaving(true);
    try {
        await walletApi.payRegistrationFromWallet();
        alert('Payment successful! Your profile is now submitted for approval.');
        if (user.role === 'tutor' || user.role === 'verified_tutor') {
            router.push('/tutor-dashboard');
        } else {
            window.location.reload();
        }
    } catch (err: any) {
        setError(err.response?.data?.message || 'Payment failed. Ensure you have funded your wallet.');
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: '50px' }}>Loading profile...</div>;

  // Progress Bar for Wizard
  const progressPercent = (currentStep / 4) * 100;

  // If Tutor and Profile Not Complete, Show Wizard
  // Migration: If they already paid, don't force the wizard
  if (user.role === 'tutor' && !user.isProfileComplete && user.registrationPaymentStatus === 'pending') {
      return (
          <main className="container pb-space-8 pt-space-8">
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                  <div className="card" style={{ marginBottom: '20px' }}>
                    <div className="card__body">
                        <h2 className="section-header__title">Complete Your Tutor Profile</h2>
                        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '20px' }}>Step {currentStep} of 4</p>
                        
                        {/* Progress Bar */}
                        <div style={{ height: '8px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '30px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPercent}%`, height: '100%', background: 'var(--color-primary)', transition: 'width 0.3s ease' }}></div>
                        </div>

                        {error && <div className="alert alert--error" style={{ marginBottom: '20px', padding: '10px', background: '#fee2e2', color: '#b91c1c', borderRadius: '4px' }}>{error}</div>}

                        <form onSubmit={handleUpdateStep}>
                            {currentStep === 1 && (
                                <>
                                    <h3 style={{ marginBottom: '15px' }}>Personal Details</h3>
                                    <div className="form-group">
                                        <label className="form-label">Faculty</label>
                                        <select className="form-input" value={faculty} onChange={e => {
                                            setFaculty(e.target.value);
                                            setDepartment(''); // Reset department on faculty change
                                        }} required>
                                            <option value="">Select Faculty</option>
                                            {universityData.faculties.map(f => (
                                                <option key={f.faculty} value={f.faculty}>{f.faculty}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Department</label>
                                        <select className="form-input" value={department} onChange={e => setDepartment(e.target.value)} required disabled={!faculty}>
                                            <option value="">Select Department</option>
                                            {faculty && universityData.faculties.find(f => f.faculty === faculty)?.departments.map(dept => (
                                                <option key={dept} value={dept}>{dept}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Level</label>
                                        <select className="form-input" value={level} onChange={e => setLevel(e.target.value)}>
                                            <option value="100L">100L</option>
                                            <option value="200L">200L</option>
                                            <option value="300L">300L</option>
                                            <option value="400L">400L</option>
                                            <option value="500L">500L</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone Number</label>
                                        <input type="text" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} required />
                                    </div>

                                    <h3 style={{ marginTop: '30px', marginBottom: '15px' }}>Payout Details (Bank Account)</h3>
                                    <div className="form-group">
                                        <label className="form-label">Bank</label>
                                        <select className="form-input" value={bankCode} onChange={e => {
                                            setBankCode(e.target.value);
                                            setBankName(banks.find(b => b.code === e.target.value)?.name || '');
                                        }} required>
                                            <option value="">Select Bank</option>
                                            {banks.map((bank, index) => (
                                                <option key={`${bank.code}-${index}`} value={bank.code}>{bank.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Account Number</label>
                                        <div style={{ display: 'flex', gap: '10px' }}>
                                            <input type="text" className="form-input" value={accountNumber} onChange={e => setAccountNumber(e.target.value)} required maxLength={10} />
                                            <button type="button" onClick={handleVerifyAccount} className="btn btn--secondary" disabled={verifyingAccount || accountNumber.length < 10}>
                                                {verifyingAccount ? '...' : 'Verify'}
                                            </button>
                                        </div>
                                    </div>
                                    {accountName && (
                                        <div className="form-group">
                                            <label className="form-label">Account Name</label>
                                            <p style={{ padding: '10px', background: '#f0fdf4', color: '#166534', borderRadius: '4px', fontSize: '14px' }}>{accountName}</p>
                                        </div>
                                    )}

                                    {!pinSet && (
                                        <div style={{ marginTop: '30px', padding: '20px', background: '#fffbeb', borderRadius: '8px', border: '1px solid #fef3c7' }}>
                                            <h3 style={{ marginBottom: '10px' }}>Security (Transaction PIN)</h3>
                                            <p style={{ fontSize: '12px', color: '#92400e', marginBottom: '15px' }}>Set a 4-6 digit numeric PIN for secure withdrawals.</p>
                                            <div className="form-group">
                                                <input type="password" placeholder="Enter PIN" className="form-input" value={pin} onChange={e => setPin(e.target.value)} maxLength={6} />
                                            </div>
                                            <div className="form-group">
                                                <input type="password" placeholder="Confirm PIN" className="form-input" value={confirmPin} onChange={e => setConfirmPin(e.target.value)} maxLength={6} />
                                            </div>
                                            <button type="button" onClick={handleSetPin} className="btn btn--primary" style={{ width: '100%', padding: '8px' }} disabled={!pin || pin !== confirmPin}>Set PIN</button>
                                        </div>
                                    )}
                                </>
                            )}

                            {currentStep === 2 && (
                                <>
                                    <h3 style={{ marginBottom: '15px' }}>Educational / Teaching Background</h3>
                                    <div className="form-group">
                                        <label className="form-label">Level you can teach</label>
                                        <input type="text" className="form-input" value={teachingLevel} onChange={e => setTeachingLevel(e.target.value)} required placeholder="e.g. 100L, 200L" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Course Title & Code (Comma separated)</label>
                                        <input type="text" className="form-input" value={courses} onChange={e => setCourses(e.target.value)} required placeholder="e.g. MATH101, COEN201" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Area of Strength in the course</label>
                                        <input type="text" className="form-input" value={areaOfStrength} onChange={e => setAreaOfStrength(e.target.value)} required placeholder="e.g. Calculus, Logic Design" />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label" style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>Profile Summary (Expertise)</label>
                                        <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>Describe the subjects you teach and your core strengths. This is visible to students and used by our AI to find you perfect matches.</p>
                                        <textarea 
                                            className="form-input" 
                                            value={matchingBio} 
                                            onChange={e => setMatchingBio(e.target.value)} 
                                            required 
                                            placeholder="e.g. I specialize in teaching Calculus and Engineering Mechanics. My strength is explaining complex concepts using real-world examples..."
                                            style={{ minHeight: '100px', resize: 'vertical', borderColor: 'var(--color-primary-light)' }}
                                        ></textarea>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">About Me (Bio)</label>
                                        <textarea 
                                            className="form-input" 
                                            value={about} 
                                            onChange={e => setAbout(e.target.value)} 
                                            required 
                                            placeholder="Introduce yourself to potential students..."
                                            style={{ minHeight: '100px', resize: 'vertical' }}
                                        ></textarea>
                                    </div>
                                </>
                            )}

                            {currentStep === 3 && (
                                <>
                                    <h3 style={{ marginBottom: '15px' }}>Verification Documents</h3>
                                    <div className="form-group">
                                        <label className="form-label">Admission Letter (JPEG, Max 1MB)</label>
                                        <input type="file" accept="image/jpeg, image/jpg" className="form-input" onChange={e => setAdmissionLetter(e.target.files?.[0] || null)} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Result / Transcript (JPEG, Max 1MB)</label>
                                        <input type="file" accept="image/jpeg, image/jpg" className="form-input" onChange={e => setTranscript(e.target.files?.[0] || null)} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Profile Picture (Image, Max 100KB)</label>
                                        <input type="file" accept="image/*" className="form-input" onChange={e => setProfilePicture(e.target.files?.[0] || null)} required />
                                    </div>
                                </>
                            )}

                            {currentStep === 4 && (
                                <div style={{ textAlign: 'center' }}>
                                    <h3 style={{ marginBottom: '15px' }}>Registration {adminSettings?.isRegistrationFree ? 'Status' : 'Payment'}</h3>
                                    {adminSettings?.isRegistrationFree ? (
                                        <div style={{ background: '#f0fdf4', padding: '20px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bbf7d0' }}>
                                            <p style={{ color: '#166534', fontWeight: 'bold' }}>Registration is Currently FREE!</p>
                                            <p style={{ fontSize: '13px', marginTop: '8px' }}>The administrative fee has been waived by the system admin.</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p style={{ marginBottom: '20px' }}>Tutors must pay a registration fee to start using the system. This fee supports the platform administration.</p>
                                            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
                                                <p style={{ fontSize: '24px', fontWeight: 'bold' }}>₦ {adminSettings?.registrationFee?.toLocaleString() || '5,000'}</p>
                                                <p style={{ fontSize: '12px', color: '#64748b' }}>One-time registration fee</p>
                                            </div>

                                            {wallet && (
                                                <div style={{ marginBottom: '20px', padding: '15px', background: wallet.balance >= (adminSettings?.registrationFee || 5000) ? '#f0fdf4' : '#fee2e2', borderRadius: '8px' }}>
                                                    <p style={{ fontSize: '14px' }}>Your Wallet Balance: <strong>₦ {wallet.balance.toLocaleString()}</strong></p>
                                                    {wallet.balance < (adminSettings?.registrationFee || 5000) && (
                                                        <button type="button" onClick={() => router.push('/wallet')} className="btn btn--secondary" style={{ marginTop: '10px', fontSize: '12px' }}>Fund Wallet to Pay</button>
                                                    )}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <button 
                                        type="button" 
                                        onClick={handleCapturePayment} 
                                        className="btn btn--primary" 
                                        style={{ width: '100%' }} 
                                        disabled={saving || (!adminSettings?.isRegistrationFree && wallet && wallet.balance < (adminSettings?.registrationFee || 5000))}
                                    >
                                        {saving ? 'Processing...' : adminSettings?.isRegistrationFree ? 'Complete Registration' : 'Pay Registration Fee'}
                                    </button>
                                </div>
                            )}

                            {currentStep < 4 && (
                                <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                                    {currentStep > 1 && (
                                        <button type="button" onClick={() => setCurrentStep(currentStep - 1)} className="btn btn--secondary" style={{ flex: 1 }}>Back</button>
                                    )}
                                    <button type="submit" className="btn btn--primary" style={{ flex: 2 }} disabled={saving}>
                                        {saving ? 'Saving...' : 'Next Step'}
                                    </button>
                                </div>
                            )}
                        </form>
                    </div>
                  </div>
              </div>
          </main>
      );
  }

  // Final Profile View (read-only)
  return (
    <main className="container pb-space-8 pt-space-8">
      <div style={{ marginTop: 'var(--space-6)', maxWidth: '640px', marginLeft: 'auto', marginRight: 'auto' }}>

        {/* Profile Header Card */}
        <div className="card">
          <div className="card__body" style={{ textAlign: 'center' }}>
            {/* Avatar + photo upload */}
            <div style={{ position: 'relative', width: '96px', height: '96px', margin: '0 auto var(--space-4)' }}>
              {user.documents?.profilePicture ? (
                <img src={getImageUrl(user.documents.profilePicture)} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', fontWeight: 'bold', border: '2px solid var(--color-primary)' }}>
                  {user.name.charAt(0)}
                </div>
              )}
              <label htmlFor="photo-upload" style={{ position: 'absolute', bottom: -5, right: -5, background: 'var(--color-primary)', color: 'white', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)', fontSize: '18px' }} title="Change Photo">
                +
                <input id="photo-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoChange} disabled={saving} />
              </label>
              {user.isApproved && (
                <div style={{ position: 'absolute', top: 0, right: -5, background: 'var(--success-green)', border: '2px solid white', borderRadius: '50%', width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                </div>
              )}
            </div>

            {saving && <p style={{ fontSize: '12px', color: 'var(--color-primary)', marginBottom: '10px' }}>Uploading photo...</p>}
            {error && <p style={{ fontSize: '12px', color: 'red', marginBottom: '10px' }}>{error}</p>}

            <h1 className="page-header__title" style={{ marginBottom: 'var(--space-1)' }}>{user.name}</h1>
            <p className="tutor-card__subject">{user.role === 'tutee' ? 'Student' : 'Tutor'} · {user.registrationNumber || 'No ID'}</p>
            <div style={{ marginTop: 'var(--space-2)', display: 'flex', gap: 'var(--space-2)', justifyContent: 'center' }}>
              <span className={`tutor-card__badge ${user.role === 'tutee' ? 'tutor-card__badge--green' : 'tutor-card__badge--orange'}`}>
                {user.role === 'verified_tutor' ? 'Verified Tutor' : user.role === 'tutor' ? 'Tutor' : 'Student'}
              </span>
              {!user.isApproved && (user.role === 'tutor' || user.role === 'verified_tutor') && (
                <span className="tutor-card__badge" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>Pending Approval</span>
              )}
            </div>
          </div>
        </div>

        {/* Account Info Card */}
        <div className="card" style={{ marginTop: 'var(--space-4)' }}>
          <div className="card__body">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
              <h2 className="section-header__title" style={{ margin: 0 }}>Account Information</h2>
              <button onClick={() => router.push('/profile/edit')} className="btn btn--primary btn--sm">✏ Edit Profile</button>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Full Name</span>
                <span style={{ fontWeight: '500' }}>{user.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Email</span>
                <span style={{ fontWeight: '500' }}>{user.email}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Faculty</span>
                <span style={{ fontWeight: '500' }}>{user.faculty || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                <span style={{ color: '#64748b', fontSize: '14px' }}>Department</span>
                <span style={{ fontWeight: '500' }}>{user.department || '—'}</span>
              </div>
              {user.role !== 'tutee' && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Level</span>
                    <span style={{ fontWeight: '500' }}>{user.level || '—'}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Phone</span>
                    <span style={{ fontWeight: '500' }}>{user.phone || '—'}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Teaching Profile Card (Tutors only) */}
        {user.role !== 'tutee' && (
          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <div className="card__body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                <h2 className="section-header__title" style={{ margin: 0 }}>Teaching Profile</h2>
                {user.isApproved && (
                  <button 
                    onClick={() => setShowCourseModal(true)} 
                    className="btn btn--primary btn--sm"
                    style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                  >
                    + Apply for New Course
                  </button>
                )}
              </div>

              {/* Courses */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Courses I Teach</p>
                {user.courses && user.courses.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {user.courses.map((c: string) => (
                      <span key={c} className="course-tag course-tag--active">{c}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#94A3B8', fontSize: '14px' }}>No courses added yet. <button onClick={() => router.push('/profile/edit')} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Add courses →</button></p>
                )}
              </div>

              {/* Area of Strength */}
              {user.areaOfStrength && (
                <div style={{ marginBottom: '20px' }}>
                  <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '6px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Area of Strength</p>
                  <p style={{ color: 'var(--color-primary)', fontWeight: '500', fontSize: '15px' }}>{user.areaOfStrength}</p>
                </div>
              )}

              {/* Profile Summary */}
              <div>
                <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Profile Summary (visible to students)</p>
                {user.matchingBio ? (
                  <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', padding: '15px', borderRadius: '10px', fontStyle: 'italic', color: '#0369a1', fontSize: '15px', lineHeight: '1.7' }}>
                    "{user.matchingBio}"
                  </div>
                ) : (
                  <p style={{ color: '#94A3B8', fontSize: '14px' }}>
                    No summary added yet. <button onClick={() => router.push('/profile/edit')} style={{ color: 'var(--color-primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Write your summary →</button>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{ marginTop: 'var(--space-4)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--space-2)' }}>
          <button onClick={() => router.push('/wallet')} className="btn btn--secondary">Wallet</button>
          <button onClick={() => router.push('/my-sessions')} className="btn btn--secondary">My Sessions</button>
          <button onClick={() => setShowSupportModal(true)} className="btn btn--secondary" style={{ color: 'var(--primary-color)' }}>Support</button>
        </div>
      </div>

      {showSupportModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
            <div className="card__body">
              <h3 style={{ marginBottom: '16px' }}>Contact Support</h3>
              <form onSubmit={handleContactSupport}>
                <div className="form-group">
                  <label className="form-label">Message</label>
                  <textarea 
                    className="form-input" 
                    value={supportMsg} 
                    onChange={e => setSupportMsg(e.target.value)} 
                    rows={4} 
                    placeholder="Describe your issue or question..." 
                    required 
                  />
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="button" className="btn btn--secondary" onClick={() => setShowSupportModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn--primary" disabled={sendingSupport}>
                    {sendingSupport ? 'Sending...' : 'Send Message'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <CourseApplicationModal 
        isOpen={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        onSuccess={() => {
            alert('Your application for new courses has been submitted and is awaiting review.');
            window.location.reload();
        }}
      />
    </main>
  );
}

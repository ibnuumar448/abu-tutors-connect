'use client';

import React, { useState, useEffect } from 'react';
import { statsApi, sessionApi, userApi, adminApi, paymentApi } from '../../services/api';
import QRModal from '../../components/QRModal';
import CourseApplicationModal from '../../components/CourseApplicationModal';
import Link from 'next/link';
import { getImageUrl } from '../../utils/image';

// --- Sub-component for Tutor Onboarding (Phase 1 & 2) ---
const TutorOnboarding = ({ user, onUpdate }: { user: any, onUpdate: () => void }) => {
    const isMissingInfo = !user.faculty || !user.department || !user.phone || !user.teachingLevel;
    const isNeedsRevision = user.applicationStatus === 'needs_revision';

    if (user.isApproved || (user.role !== 'tutor' && user.role !== 'verified_tutor')) return null;

    return (
        <div className="card" style={{ 
            marginBottom: 'var(--space-8)', 
            border: isNeedsRevision ? '2px solid #DC2626' : '2px dashed var(--primary-color)', 
            backgroundColor: isNeedsRevision ? '#FEF2F2' : '#F8FAFC', 
            borderRadius: '16px' 
        }}>
            <div className="card__body" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isNeedsRevision ? '🛑 Revision Required' : (isMissingInfo ? '🚀 Complete Your Profile' : '🕒 Application Pending')}
                    </h3>
                    <span className="tutor-card__badge" style={{ 
                        backgroundColor: isNeedsRevision ? '#FEE2E2' : (isMissingInfo ? '#FEF3C7' : '#E0F2FE'), 
                        color: isNeedsRevision ? '#991B1B' : (isMissingInfo ? '#92400E' : '#0369A1') 
                    }}>
                        {isNeedsRevision ? 'Action Required' : (isMissingInfo ? 'Action Required' : 'Under Review')}
                    </span>
                </div>
                
                {isNeedsRevision && user.adminFeedback && (
                    <div style={{ padding: '12px', background: 'white', border: '1px solid #FCA5A5', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
                        <strong>Feedback from Admin:</strong>
                        <p style={{ margin: '4px 0 0', color: '#B91C1C' }}>{user.adminFeedback}</p>
                    </div>
                )}

                <p style={{ color: '#64748B', marginBottom: '20px' }}>
                    {isNeedsRevision 
                        ? 'The admin has requested changes to your application. Please update your documents or profile details and re-submit.' 
                        : (isMissingInfo 
                            ? 'Please fill in your basic information and teaching profile to become a tutor.' 
                            : 'Your profile has been submitted for review. Once approved, you will become a "Newbie Tutor" and be able to accept bookings.')}
                </p>

                {(isMissingInfo || isNeedsRevision) ? (
                    <Link href="/profile/edit" className="btn btn--primary" style={{ width: '100%' }}>
                        {isNeedsRevision ? 'Update & Re-submit' : 'Complete Profile Now'}
                    </Link>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#059669', fontWeight: '500', backgroundColor: '#ECFDF5', padding: '12px', borderRadius: '8px' }}>
                        <span>🕒</span>
                        Status: Awaiting Admin Approval
                    </div>
                )}
            </div>
        </div>
    );
};

// --- Sub-component for Live Timer (Sync) ---
const ActiveSessionBanner = ({ session, onSync }: { session: any, onSync: (id: string, data: any) => void }) => {
    useEffect(() => {
        const syncId = setInterval(async () => {
             try {
                const res = await sessionApi.syncSession(session._id, new Date().toISOString());
                onSync(session._id, res.data);
             } catch (err) {
                console.error("Sync failed", err);
             }
        }, 30000);
        return () => clearInterval(syncId);
    }, [session, onSync]);

    return (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #DCFCE7', padding: '12px', borderRadius: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
                <p style={{ margin: 0, fontSize: '12px', color: '#16A34A', fontWeight: 'bold' }}>SESSION IN PROGRESS</p>
                <p style={{ margin: 0, fontWeight: 'bold' }}>{session.tuteeId.name} · {session.topic}</p>
            </div>
            <Link href="/my-sessions" className="btn btn--primary btn--sm">Manage Session</Link>
        </div>
    );
};

export default function TutorDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [adminSettings, setAdminSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sessions' | 'availability'>('sessions');
  const [sessionFilter, setSessionFilter] = useState('Upcoming');

  // Availability State
  const [availability, setAvailability] = useState<any[]>([]);
  const [newDay, setNewDay] = useState('Monday');
  const [newSlot, setNewSlot] = useState('09:00');

  // QR Modal State
  const [qrModal, setQrModal] = useState({
    isOpen: false,
    mode: 'generate' as 'generate' | 'scan',
    qrData: '',
    pin: '',
    title: '',
    sessionId: '',
    step: 'start' as 'start' | 'complete'
  });

  const [showCourseModal, setShowCourseModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, sessionsRes, userRes, settingsRes] = await Promise.all([
        statsApi.getTutorStats(),
        sessionApi.getSessions(),
        userApi.getProfile(),
        adminApi.getSettings()
      ]);
      setStats(statsRes.data);
      setSessions(sessionsRes.data);
      setUser(userRes.data);
      setAdminSettings(settingsRes.data);
      setAvailability(userRes.data.availability || []);
    } catch (err) {
      console.error('Fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAvailability = async () => {
      try {
          await userApi.updateProfile({ 
              availability,
              registrationNumber: user.registrationNumber,
              name: user.name,
              faculty: user.faculty,
              department: user.department,
              phone: user.phone
          });
          alert('Availability matrix updated!');
      } catch (err) {
          alert('Update failed: ' + (err.response?.data?.message || 'Check your profile details'));
      }
  };

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

  // Verification Logic
  const openVerifyModal = (session: any, step: 'start' | 'complete') => {
      setQrModal({
          isOpen: true,
          mode: step === 'start' ? 'scan' : 'generate',
          qrData: step === 'start' ? session.startQRCodeData : session.completionQRCodeData,
          pin: step === 'start' ? session.startPIN : session.completionPIN,
          title: step === 'start' ? 'Verify Tutee to Start' : 'Show Completion Code',
          sessionId: session._id,
          step: step
      });
  };

  const handleVerifySuccess = async (data: { qrData?: string, pin?: string }) => {
      try {
          if (qrModal.step === 'start') {
              await sessionApi.startSession(qrModal.sessionId, data);
              alert('Session started!');
          }
          fetchData();
      } catch (err: any) {
          alert(err.response?.data?.message || 'Verification failed');
      }
  };

  const activeSessions = sessions.filter(s => s.status === 'active');
  const filteredSessions = sessions.filter(s => {
      if (sessionFilter === 'Upcoming') return s.status === 'pending' || s.status === 'active';
      if (sessionFilter === 'Completed') return s.status === 'completed';
      return true;
  });

  if (loading) return <main className="container pt-space-8 text-center">Loading Dashboard...</main>;

  return (
    <main className="container pb-space-8 pt-space-8">
      <div className="page-header" style={{ marginTop: 'var(--space-6)' }}>
        <h1 className="page-header__title">Tutor Dashboard {user?.isApproved && <span className="tutor-card__badge tutor-card__badge--orange" style={{ verticalAlign: 'middle', marginLeft: '10px' }}>Newbie Tutor</span>}</h1>
        <p className="page-header__subtitle">Welcome back, {user?.name}</p>
      </div>

      <TutorOnboarding user={user} onUpdate={fetchData} />

      {activeSessions.map(s => (
          <ActiveSessionBanner key={s._id} session={s} onSync={() => {}} />
      ))}

      {/* Stats Cards */}
      <div style={{ display: 'grid', gap: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: 'var(--space-8)' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
          <div className="card__body">
            <p className="tutor-card__subject" style={{ margin: '0 0 8px' }}>Total Earnings</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>₦{stats?.totalEarnings?.toLocaleString() || '0'}</p>
          </div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--success-green)' }}>
          <div className="card__body">
            <p className="tutor-card__subject" style={{ margin: '0 0 8px' }}>Sessions Completed</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{stats?.completedSessions || '0'}</p>
          </div>
        </div>
        <div className="card" style={{ borderLeft: '4px solid #FBBF24' }}>
          <div className="card__body">
            <p className="tutor-card__subject" style={{ margin: '0 0 8px' }}>Average Rating</p>
            <p style={{ fontSize: '28px', fontWeight: 'bold', margin: 0 }}>{user?.averageRating?.toFixed(1) || 'N/A'} ★</p>
          </div>
        </div>
      </div>

      {user?.about && (
          <div className="card" style={{ marginBottom: 'var(--space-6)', backgroundColor: '#f8fafc' }}>
              <div className="card__body">
                  <h4 style={{ margin: '0 0 10px 0', color: '#64748B', fontSize: '14px', textTransform: 'uppercase' }}>About Me</h4>
                  <p style={{ margin: 0, lineHeight: 1.6 }}>{user.about}</p>
              </div>
          </div>
      )}

      <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', marginBottom: 'var(--space-6)', overflowX: 'auto' }}>
          <button onClick={() => setActiveTab('sessions')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'sessions' ? '2px solid var(--primary-color)' : 'none', fontWeight: activeTab === 'sessions' ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
              Sessions
          </button>
          <button onClick={() => setActiveTab('availability')} style={{ padding: '12px 24px', border: 'none', background: 'none', cursor: 'pointer', borderBottom: activeTab === 'availability' ? '2px solid var(--primary-color)' : 'none', fontWeight: activeTab === 'availability' ? 'bold' : 'normal', whiteSpace: 'nowrap' }}>
              Availability Matrix
          </button>
          <Link href="/messages" style={{ display: 'inline-flex', alignItems: 'center', padding: '12px 24px', textDecoration: 'none', color: '#64748B', fontWeight: 'normal' }}>
              Messages
          </Link>
          {user?.isApproved && (
              <button 
                  onClick={() => setShowCourseModal(true)} 
                  style={{ marginLeft: 'auto', padding: '0 20px', border: 'none', background: 'var(--primary-color)', color: 'white', borderRadius: '8px', fontSize: '13px', cursor: 'pointer', height: '36px', alignSelf: 'center' }}
              >
                  + Apply for New Course
              </button>
          )}
      </div>

      {activeTab === 'sessions' && (
          <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-4)' }}>
                {['Upcoming', 'Completed'].map(f => (
                    <button key={f} onClick={() => setSessionFilter(f)} className={`course-tag ${sessionFilter === f ? 'course-tag--active' : ''}`} style={{ cursor: 'pointer', border: 'none', background: sessionFilter === f ? 'var(--primary-color)' : '#F1F5F9', color: sessionFilter === f ? 'white' : '#64748B' }}>
                        {f}
                    </button>
                ))}
              </div>
              
              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  {filteredSessions.length > 0 ? (
                      filteredSessions.map((s: any) => (
                          <div key={s._id} className="card">
                              <div className="card__body" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#F1F5F9', overflow: 'hidden' }}>
                                          {s.tuteeId.documents?.profilePicture ? (
                                              <img 
                                                  src={getImageUrl(s.tuteeId.documents.profilePicture)} 
                                                  alt="Student" 
                                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                              />
                                          ) : (
                                              <div style={{ 
                                                  width: '100%', height: '100%', 
                                                  background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                                                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                  fontSize: '20px', fontWeight: 'bold'
                                              }}>
                                                  {s.tuteeId.name.charAt(0)}
                                              </div>
                                          )}
                                      </div>
                                      <div>
                                          <h4 style={{ margin: 0 }}>{s.tuteeId.name}</h4>
                                          <p style={{ margin: '2px 0', fontSize: '13px', color: '#64748B' }}>{s.topic} · {s.venue}</p>
                                          <p style={{ margin: 0, fontSize: '12px', fontWeight: 'bold' }}>{new Date(s.date).toLocaleDateString()} · {s.time}</p>
                                      </div>
                                  </div>
                                  <div>
                                      {s.status === 'pending' && <button onClick={() => openVerifyModal(s, 'start')} className="btn btn--primary btn--sm">Verify & Start</button>}
                                      {s.status === 'active' && <button onClick={() => openVerifyModal(s, 'complete')} className="btn btn--secondary btn--sm">Completion Code</button>}
                                      {s.status === 'completed' && <span className="tutor-card__badge tutor-card__badge--green">Completed</span>}
                                  </div>
                              </div>
                          </div>
                      ))
                  ) : (
                      <p className="text-center text-muted">No sessions found.</p>
                  )}
              </div>
          </div>
      )}

      {activeTab === 'availability' && (
          <div className="card">
              <div className="card__body">
                  <h3 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Weekly Availability Matrix</h3>
                  
                  {!user?.isApproved ? (
                      <div style={{ padding: '30px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                          <p style={{ fontSize: '18px', marginBottom: '10px' }}>🔒 Locked</p>
                          <p style={{ color: '#64748B' }}>You can only set your availability matrix after your profile has been approved by the admin.</p>
                          <p style={{ fontSize: '13px', marginTop: '10px' }}>Status: <strong>{user?.isProfileComplete ? 'Awaiting Approval' : 'Incomplete Profile'}</strong></p>
                      </div>
                  ) : (
                      <>
                          <p className="text-muted" style={{ marginBottom: 'var(--space-6)' }}>Set the days and 1-hour slots you are available to teach. Students can only book these times.</p>
                          
                          <div style={{ display: 'flex', gap: '12px', marginBottom: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                              <div className="form-group" style={{ margin: 0 }}>
                                  <label className="form-label">Day</label>
                                  <select className="form-input" value={newDay} onChange={e => setNewDay(e.target.value)}>
                                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(d => <option key={d} value={d}>{d}</option>)}
                                  </select>
                              </div>
                              <div className="form-group" style={{ margin: 0 }}>
                                  <label className="form-label">Slot Start Time</label>
                                  <input type="time" className="form-input" value={newSlot} onChange={e => setNewSlot(e.target.value)} />
                              </div>
                              <button onClick={addSlot} className="btn btn--secondary">Add Slot</button>
                          </div>

                          <div style={{ display: 'grid', gap: '16px' }}>
                              {availability.map((avail, idx) => (
                                  <div key={idx} style={{ padding: '16px', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                                      <h4 style={{ margin: '0 0 12px 0' }}>{avail.day}</h4>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                          {avail.slots.map((slot: string) => (
                                              <div key={slot} style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', padding: '4px 8px', borderRadius: '6px', fontSize: '14px' }}>
                                                  {slot}
                                                  <button onClick={() => removeSlot(avail.day, slot)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#EF4444', fontSize: '16px' }}>×</button>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>

                          <button onClick={handleUpdateAvailability} className="btn btn--primary" style={{ marginTop: 'var(--space-6)', width: '100%' }}>
                              Save Availability Matrix
                          </button>
                      </>
                  )}
              </div>
          </div>
      )}

      <QRModal 
        isOpen={qrModal.isOpen}
        onClose={() => setQrModal({ ...qrModal, isOpen: false })}
        mode={qrModal.mode}
        qrData={qrModal.qrData}
        pin={qrModal.pin}
        title={qrModal.title}
        onScanSuccess={(decoded) => handleVerifySuccess({ qrData: decoded })}
        onPinSubmit={(pin) => handleVerifySuccess({ pin })}
      />

      <CourseApplicationModal 
        isOpen={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        onSuccess={() => {
            alert('Your application for new courses has been submitted and is awaiting review.');
            fetchData();
        }}
      />
    </main>
  );
}

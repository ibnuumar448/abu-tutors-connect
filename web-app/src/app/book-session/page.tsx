'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { userApi, sessionApi, walletApi, adminApi } from '../../services/api';
import { getImageUrl } from '../../utils/image';

function BookSessionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tutorId = searchParams.get('tutor');

  const [tutor, setTutor] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [fee, setFee] = useState(500);

  // Form State
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedVenue, setSelectedVenue] = useState('');
  const [lockExpiry, setLockExpiry] = useState<Date | null>(null);

  useEffect(() => {
    if (!tutorId) {
      router.push('/tutors');
      return;
    }

    const fetchData = async () => {
      try {
        const [tutorRes, profileRes, walletRes, venuesRes] = await Promise.all([
          userApi.getTutorProfile(tutorId),
          userApi.getProfile(),
          walletApi.getWallet(),
          adminApi.getVenues()
        ]);
        
        setTutor(tutorRes.data);
        setCurrentUser(profileRes.data);
        setWallet(walletRes.data);
        setVenues(venuesRes.data.filter((v: any) => v.isActive));
        
        const calculatedFee = tutorRes.data.hourlyRate || 500;
        setFee(calculatedFee);
        
        if (venuesRes.data.length > 0) {
            setSelectedVenue(venuesRes.data[0].name);
        }
      } catch (err: any) {
        console.error('Data fetch error', err);
        setError('Failed to load booking information.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [tutorId, router]);

  const handleSlotSelect = async (day: string, slot: string) => {
      // For simplicity, we assume 'day' maps to a date relative to today
      // In a real app, this would be more complex date logic
      const targetDate = new Date();
      // Logic to find next 'day' (e.g. "Monday")
      const dayMap: any = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      const targetDay = dayMap[day];
      const currentDay = targetDate.getDay();
      let diff = targetDay - currentDay;
      if (diff <= 0) diff += 7;
      targetDate.setDate(targetDate.getDate() + diff);
      
      const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
      const timeStr = slot; // e.g. "14:00"

      setSelectedDate(dateStr);
      setSelectedTime(timeStr);
      setError('');

      try {
          const res = await sessionApi.lockSlot({ 
              tutorId: tutor._id, 
              slot: `${dateStr}T${timeStr}` 
          });
          setLockExpiry(new Date(res.data.expiresAt));
          alert(`Slot temporarily locked for 5 minutes. Please complete booking.`);
      } catch (err: any) {
          setError(err.response?.data?.message || 'Failed to lock slot. It might be taken.');
          setSelectedDate('');
          setSelectedTime('');
      }
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet || wallet.balance < fee) {
      alert(`Insufficient balance. This session costs ₦${fee}. Current balance: ₦${wallet.balance}`);
      router.push('/wallet');
      return;
    }

    if (!selectedDate || !selectedTime) {
        setError('Please select an available slot from the matrix below.');
        return;
    }

    setBooking(true);
    setError('');

    try {
      await sessionApi.bookSession({
        tutorId,
        date: selectedDate,
        time: selectedTime,
        topic,
        venue: selectedVenue,
        amount: fee
      });
      alert('Booking confirmed! Payment held in escrow.');
      router.push('/my-sessions');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to book session');
    } finally {
      setBooking(false);
    }
  };

  if (loading) return <main className="container pt-space-8 text-center">Loading booking environment...</main>;

  return (
    <main className="container pb-space-8 pt-space-8">
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <h1 className="page-header__title" style={{ marginBottom: 'var(--space-6)' }}>Schedule Your Session</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 'var(--space-6)' }}>
          {/* Left: Availability Matrix & Selection */}
          <div className="card">
            <div className="card__body">
              <h2 className="section-header__title" style={{ marginBottom: 'var(--space-4)' }}>Select an Available Slot</h2>
              
              {!tutor.availability || tutor.availability.length === 0 ? (
                  <p className="text-muted">Tutor hasn't set their availability matrix yet.</p>
              ) : (
                  <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                      {tutor.availability.map((avail: any, idx: number) => {
                          const dayMap: any = { 'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
                          const targetDate = new Date();
                          const targetDay = dayMap[avail.day];
                          const currentDay = targetDate.getDay();
                          let diff = targetDay - currentDay;
                          if (diff <= 0) diff += 7;
                          targetDate.setDate(targetDate.getDate() + diff);
                          const dateStr = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

                          return (
                            <div key={idx} style={{ padding: 'var(--space-3)', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                    <h4 style={{ margin: 0, color: 'var(--primary-color)' }}>{avail.day}</h4>
                                    <span style={{ fontSize: '12px', color: '#64748B' }}>{targetDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                    {avail.slots.map((slot: string) => {
                                        const fullSlot = `${dateStr}T${slot}`;
                                        const isOccupied = tutor.occupiedSlots?.includes(fullSlot);
                                        const isSelected = selectedTime === slot && selectedDate === dateStr;
                                        
                                        return (
                                            <button 
                                                key={slot}
                                                disabled={isOccupied}
                                                onClick={() => handleSlotSelect(avail.day, slot)}
                                                style={{ 
                                                    padding: '6px 12px', borderRadius: '6px', 
                                                    border: isOccupied ? '1px solid #E2E8F0' : '1px solid #CBD5E1', 
                                                    backgroundColor: isSelected ? 'var(--primary-color)' : isOccupied ? '#F1F5F9' : 'white',
                                                    color: isSelected ? 'white' : isOccupied ? '#94A3B8' : '#475569',
                                                    cursor: isOccupied ? 'not-allowed' : 'pointer', 
                                                    fontSize: '14px', transition: 'all 0.2s',
                                                    textDecoration: isOccupied ? 'line-through' : 'none'
                                                }}
                                                title={isOccupied ? 'This slot is already booked' : 'Click to select'}
                                            >
                                                {slot}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                          );
                      })}
                  </div>
              )}

              {selectedDate && (
                  <div style={{ marginTop: 'var(--space-6)', padding: 'var(--space-4)', backgroundColor: '#F0FDF4', borderRadius: '12px', border: '1px solid #DCFCE7' }}>
                      <p style={{ margin: 0, color: '#16A34A', fontWeight: 'bold' }}>SELECTED SLOT</p>
                      <p style={{ margin: '4px 0 0 0', fontSize: '18px' }}>{new Date(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })} at <strong>{selectedTime}</strong></p>
                      {lockExpiry && (
                          <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#15803D' }}>
                              Locked until {lockExpiry.toLocaleTimeString()}
                          </p>
                      )}
                  </div>
              )}
            </div>
          </div>

          {/* Right: Booking Summary & Details */}
          <div className="card" style={{ height: 'fit-content' }}>
            <div className="card__body">
              <div style={{ display: 'flex', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                {tutor.documents?.profilePicture ? (
                  <img src={getImageUrl(tutor.documents.profilePicture)} alt={tutor.name} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '50%', 
                    background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '24px', fontWeight: 'bold'
                  }}>
                    {tutor.name.charAt(0)}
                  </div>
                )}
                <div>
                  <h3 style={{ margin: 0 }}>{tutor.name}</h3>
                  <p style={{ margin: 0, fontSize: '14px', color: '#64748B' }}>{tutor.department}</p>
                  <p style={{ margin: '4px 0 0 0', fontWeight: 'bold', color: 'var(--primary-color)' }}>₦{fee}/hr</p>
                </div>
              </div>

              {error && <div style={{ padding: 'var(--space-3)', backgroundColor: '#FEF2F2', color: '#DC2626', borderRadius: '8px', marginBottom: 'var(--space-4)', fontSize: '14px' }}>{error}</div>}
              
              {currentUser?.role === 'tutor' || currentUser?.role === 'verified_tutor' ? (
                <div style={{ padding: 'var(--space-4)', backgroundColor: '#FFF7ED', border: '1px solid #FFEDD5', borderRadius: '12px', textAlign: 'center' }}>
                  <p style={{ color: '#9A3412', fontWeight: 'bold' }}>Booking Restricted</p>
                  <p style={{ fontSize: '14px', color: '#C2410C', marginTop: '8px' }}>
                    Tutor accounts cannot book other tutors. Please log in with a student account to book a session.
                  </p>
                  <button onClick={() => router.push('/tutors')} className="btn btn--secondary btn--block" style={{ marginTop: '16px' }}>Back to Discovery</button>
                </div>
              ) : (
                <form onSubmit={handleBooking}>
                <div className="form-group">
                  <label className="form-label">Teaching Venue</label>
                  <select className="form-input" value={selectedVenue} onChange={(e) => setSelectedVenue(e.target.value)} required>
                    {venues.map(v => (
                        <option key={v._id} value={v.name}>{v.name} ({v.location})</option>
                    ))}
                    <option value="Online">Online / Personal Choice</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="topic">Main Topic / Problem</label>
                  <input type="text" id="topic" className="form-input" placeholder="e.g. Data Structures, Exam Prep" required value={topic} onChange={(e) => setTopic(e.target.value)} />
                </div>

                <div style={{ margin: 'var(--space-6) 0', padding: 'var(--space-4)', backgroundColor: '#F8FAFC', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                        <span style={{ color: '#64748B' }}>Session Fee</span>
                        <span style={{ fontWeight: 'bold' }}>₦{fee}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid #E2E8F0' }}>
                        <span style={{ fontWeight: 'bold' }}>Total To Pay</span>
                        <span style={{ fontWeight: 'bold', color: 'var(--primary-color)', fontSize: '1.25rem' }}>₦{fee}</span>
                    </div>
                </div>

                <button type="submit" className="btn btn--primary btn--block" disabled={booking || !selectedDate}>
                  {booking ? 'Processing Payment...' : 'Confirm & Book Session'}
                </button>
                <p style={{ textAlign: 'center', fontSize: '12px', color: '#94A3B8', marginTop: 'var(--space-4)' }}>
                    Funds will be held in escrow and released only after you verify the session.
                </p>
              </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function BookSessionPage() {
  return (
    <Suspense fallback={<div className="container text-center pt-space-8">Loading booking details...</div>}>
      <BookSessionContent />
    </Suspense>
  );
}

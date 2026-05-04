'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { userApi } from '../../../services/api';
import { universityData } from '../../../data/universityData';

export default function EditProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editable fields
  const [faculty, setFaculty] = useState('');
  const [department, setDepartment] = useState('');
  const [phone, setPhone] = useState('');
  const [level, setLevel] = useState('');
  const [courses, setCourses] = useState('');        // stored as comma-string
  const [areaOfStrength, setAreaOfStrength] = useState('');
  const [matchingBio, setMatchingBio] = useState(''); // Profile Summary
  const [about, setAbout] = useState('');
  
  // Document uploads for revision
  const [admissionLetter, setAdmissionLetter] = useState<File | null>(null);
  const [transcript, setTranscript] = useState<File | null>(null);

  useEffect(() => {
    userApi.getProfile().then(res => {
      const d = res.data;
      setUser(d);
      setFaculty(d.faculty || '');
      setDepartment(d.department || '');
      setPhone(d.phone || '');
      setLevel(d.level || '100L');
      setCourses(d.courses?.join(', ') || '');
      setAreaOfStrength(d.areaOfStrength || '');
      setMatchingBio(d.matchingBio || '');
      setAbout(d.about || '');
    }).catch(() => router.push('/'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const fd = new FormData();
      fd.append('faculty', faculty);
      fd.append('department', department);
      fd.append('phone', phone);
      fd.append('level', level);
      fd.append('about', about);
      fd.append('areaOfStrength', areaOfStrength);
      fd.append('matchingBio', matchingBio);
      
      // If tutoring, courses are read-only here, they don't get appended from body usually
      // unless we want to allow editing? User says should only be edited via Apply flow.
      // So we don't append courses if role is tutor?
      // Actually, if we don't append them, the backend might keep them as is.
      
      if (admissionLetter) fd.append('admissionLetter', admissionLetter);
      if (transcript) fd.append('transcript', transcript);

      await userApi.updateProfile(fd);
      setSuccess('Profile updated successfully!');
      setTimeout(() => router.push('/profile'), 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Update failed. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="container" style={{ padding: '60px', textAlign: 'center' }}>Loading...</div>;
  if (!user) return null;

  return (
    <main className="container" style={{ maxWidth: '680px', margin: '40px auto', padding: '0 16px 60px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
        <button onClick={() => router.push('/profile')} className="btn btn--outline btn--sm">← Back</button>
        <h1 style={{ margin: 0, fontSize: '24px' }}>Edit Profile</h1>
      </div>

      <form onSubmit={handleSave}>
        {/* ── General Info ── */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card__body">
            <h2 style={{ fontSize: '18px', marginBottom: '16px', color: 'var(--color-primary)' }}>General Information</h2>

            <div className="form-group">
              <label className="form-label">Faculty</label>
              <select className="form-input" value={faculty} onChange={e => {
                  setFaculty(e.target.value);
                  setDepartment('');
              }}>
                <option value="">Select Faculty</option>
                {universityData.faculties.map(f => (
                  <option key={f.faculty} value={f.faculty}>{f.faculty}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-input" value={department} onChange={e => setDepartment(e.target.value)} disabled={!faculty}>
                <option value="">Select Department</option>
                {faculty && universityData.faculties.find(f => f.faculty === faculty)?.departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+234 800 000 0000" />
            </div>

            <div className="form-group">
              <label className="form-label">Level</label>
              <select className="form-input" value={level} onChange={e => setLevel(e.target.value)}>
                {['100L','200L','300L','400L','500L'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">About Me (General Bio)</label>
              <textarea className="form-input" value={about} onChange={e => setAbout(e.target.value)} placeholder="A short general bio about yourself..." style={{ minHeight: '80px', resize: 'vertical' }}></textarea>
            </div>
          </div>
        </div>

        {/* ── Tutor Teaching Profile ── */}
        {user.role !== 'tutee' && (
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card__body">
              <h2 style={{ fontSize: '18px', marginBottom: '4px', color: 'var(--color-primary)' }}>Teaching Profile</h2>
              <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>Shown to students on your public profile and used by the AI Matcher to recommend you.</p>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 'bold' }}>Courses I Teach</label>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Course list is managed via "Apply for New Course" flow.</p>
                <input
                  type="text"
                  className="form-input"
                  value={courses}
                  readOnly
                  style={{ backgroundColor: '#F8FAFC', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Area of Strength</label>
                <input type="text" className="form-input" value={areaOfStrength} onChange={e => setAreaOfStrength(e.target.value)} placeholder="e.g. Calculus, Logic Design, Data Structures" />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 'bold', color: 'var(--color-primary)' }}>Profile Summary (AI Matching)</label>
                <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>Describe your teaching style and how you help students. The AI Matcher uses this for recommendations.</p>
                <textarea
                  className="form-input"
                  value={matchingBio}
                  onChange={e => setMatchingBio(e.target.value)}
                  placeholder="e.g. I specialize in Calculus and Mechanics. I explain complex topics using real-world examples and step-by-step breakdowns..."
                  style={{ minHeight: '120px', resize: 'vertical' }}
                ></textarea>
              </div>
            </div>
          </div>
        )}

        {/* ── Document Re-submission (If Revision Requested) ── */}
        {(user.applicationStatus === 'needs_revision' || !user.isApproved) && user.role !== 'tutee' && (
          <div className="card" style={{ marginBottom: '20px', border: user.applicationStatus === 'needs_revision' ? '1px solid #FCA5A5' : 'none' }}>
            <div className="card__body">
              <h2 style={{ fontSize: '18px', marginBottom: '16px', color: user.applicationStatus === 'needs_revision' ? '#B91C1C' : 'var(--color-primary)' }}>
                {user.applicationStatus === 'needs_revision' ? 'Re-upload Documents' : 'Update Documents'}
              </h2>
              {user.applicationStatus === 'needs_revision' && user.adminFeedback && (
                <div style={{ padding: '12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', marginBottom: '20px', fontSize: '14px' }}>
                  <strong>Admin Feedback:</strong>
                  <p style={{ margin: '4px 0 0', color: '#B91C1C' }}>{user.adminFeedback}</p>
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Admission Letter (JPEG, Max 1MB)</label>
                <input type="file" accept="image/jpeg, image/jpg" className="form-input" onChange={e => setAdmissionLetter(e.target.files?.[0] || null)} />
                <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Current: <a href={user.documents?.admissionLetter} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>View File</a></p>
              </div>
              <div className="form-group">
                <label className="form-label">Result / Transcript (JPEG, Max 1MB)</label>
                <input type="file" accept="image/jpeg, image/jpg" className="form-input" onChange={e => setTranscript(e.target.files?.[0] || null)} />
                <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>Current: <a href={user.documents?.transcript} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>View File</a></p>
              </div>
            </div>
          </div>
        )}

        {/* ── Error / Success ── */}
        {error && <div style={{ padding: '12px 16px', background: '#FEF2F2', color: '#DC2626', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
        {success && <div style={{ padding: '12px 16px', background: '#F0FDF4', color: '#16A34A', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>✓ {success}</div>}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button type="button" onClick={() => router.push('/profile')} className="btn btn--secondary" style={{ flex: 1 }}>Cancel</button>
          <button type="submit" className="btn btn--primary" style={{ flex: 2 }} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </main>
  );
}

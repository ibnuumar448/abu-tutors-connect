'use client';

import React, { useState } from 'react';
import { userApi } from '../services/api';

interface CourseApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CourseApplicationModal({ isOpen, onClose, onSuccess }: CourseApplicationModalProps) {
    const [courses, setCourses] = useState('');
    const [transcript, setTranscript] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courses.trim() || !transcript) {
            setError('Please provide courses and a transcript.');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const formData = new FormData();
            const courseArr = courses.split(',').map(c => c.trim()).filter(Boolean);
            formData.append('courses', JSON.stringify(courseArr));
            formData.append('transcript', transcript);

            await userApi.applyCourse(formData);
            onSuccess();
            onClose();
            setCourses('');
            setTranscript(null);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to submit application.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
            <div className="card" style={{ maxWidth: '500px', width: '100%', position: 'relative' }}>
                <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
                <div className="card__body">
                    <h3 style={{ marginBottom: '16px' }}>Apply for New Courses</h3>
                    <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
                        If you want to teach additional courses, please provide the course codes and upload a supporting transcript for verification.
                    </p>

                    <form onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label className="form-label">New Courses (comma separated)</label>
                            <input 
                                type="text" 
                                className="form-input" 
                                value={courses} 
                                onChange={e => setCourses(e.target.value)} 
                                placeholder="e.g. COEN302, MATH201" 
                                required 
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Supporting Transcript (Image/PDF)</label>
                            <input 
                                type="file" 
                                className="form-input" 
                                accept="image/*,application/pdf"
                                onChange={e => setTranscript(e.target.files?.[0] || null)} 
                                required 
                            />
                        </div>

                        {error && <p style={{ color: '#DC2626', fontSize: '13px', marginBottom: '15px' }}>{error}</p>}

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button type="button" onClick={onClose} className="btn btn--secondary" style={{ flex: 1 }} disabled={loading}>Cancel</button>
                            <button type="submit" className="btn btn--primary" style={{ flex: 2 }} disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Application'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

"use client";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/services/api';

export default function AIMatch() {
    const router = useRouter();
    const [course, setCourse] = useState('');
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [matchResult, setMatchResult] = useState<any>(null);

    const handleMatch = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setMatchResult(null);
        setLoading(true);

        try {
            const res = await api.post('/match/request', { course, prompt });
            setMatchResult(res.data);
        } catch (err: any) {
            setError(err.response?.data?.message || "Connection Error. Is the backend running?");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="container">
            <div style={{ marginTop: 'var(--space-6)', maxWidth: '720px', marginLeft: 'auto', marginRight: 'auto' }}>
                <div className="page-header" style={{ marginBottom: 'var(--space-6)' }}>
                    <span className="hero-card__badge" style={{ background: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}>AI Driven</span>
                    <h1 className="page-header__title">Tutor Matcher</h1>
                    <p className="page-header__subtitle">Enter your course and what you need help with. Our AI finds the best expert for you.</p>
                </div>

                <div className="card">
                    <div className="card__body">
                        {error && <div style={{ color: 'red', marginBottom: '1rem', textAlign: 'center' }}>{error}</div>}

                        {matchResult ? (
                            <div style={{ textAlign: 'center' }}>
                                <h3 style={{ marginBottom: '1.5rem' }}>{matchResult.message}</h3>
                                
                                {matchResult.recommendations && matchResult.recommendations.map((rec: any, index: number) => (
                                    <div key={index} style={{ background: 'white', border: '1px solid #E2E8F0', padding: '1.5rem', borderRadius: '16px', textAlign: 'left', marginBottom: '1.5rem' }}>
                                        <div style={{ background: 'var(--color-primary-light)', padding: '4px 12px', borderRadius: '20px', display: 'inline-block', marginBottom: '1rem', color: 'var(--color-primary)', fontWeight: 'bold', fontSize: '14px' }}>
                                            ✨ {rec.matchScore}% Match
                                        </div>
                                        <h4 style={{ margin: 0 }}>{rec.tutor?.name}</h4>
                                        <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '12px' }}>{rec.tutor?.faculty} | Level {rec.tutor?.level}</p>
                                        
                                        <div style={{ backgroundColor: '#F8FAFC', padding: '12px', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid var(--color-primary)' }}>
                                            <p style={{ margin: 0, fontSize: '14px' }}><strong>AI Reasoning:</strong> {rec.reasoning}</p>
                                        </div>

                                        <button className="btn btn--primary" style={{ width: '100%' }} onClick={() => router.push(`/book-session?tutor=${rec.tutor?._id}`)}>
                                            Book Session with {rec.tutor?.name.split(' ')[0]}
                                        </button>
                                    </div>
                                ))}
                                
                                <button className="btn btn--link" style={{ marginTop: '0.5rem' }} onClick={() => setMatchResult(null)}>← Search Again</button>
                            </div>
                        ) : (
                            <form onSubmit={handleMatch}>
                                <div className="form-group">
                                    <label className="form-label">Course Code</label>
                                    <input type="text" className="form-input" placeholder="e.g. COEN453" value={course} onChange={(e) => setCourse(e.target.value)} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Problem Description</label>
                                    <textarea className="form-input" rows={6} placeholder="Describe the specific topic or problem you need help with..." value={prompt} onChange={(e) => setPrompt(e.target.value)} required />
                                </div>
                                <button type="submit" className="btn btn--primary" style={{ width: '100%', height: '50px' }} disabled={loading}>
                                    {loading ? 'AI Researching Tutors...' : 'Find My Match'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}

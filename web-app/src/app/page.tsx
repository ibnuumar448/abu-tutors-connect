'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { userApi } from '../services/api';
import { getImageUrl } from '../utils/image';

export default function LandingPage() {
  const router = useRouter();
  const [tutors, setTutors] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTutors();
  }, []);

  const fetchTutors = async () => {
    try {
      const response = await userApi.getTutors();
      setTutors(response.data.slice(0, 4)); // Show 4 on home for a better grid
    } catch (err) {
      console.error('Failed to fetch tutors', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/tutors?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <main className="landing-wrapper">
      {/* 1. HERO SECTION */}
      <section className="marketing-section" style={{ paddingTop: '40px', paddingBottom: '60px' }}>
        <div className="container">
          <div className="grid-2">
            <div className="hero-content text-center text-md-left">
              <span className="badge badge--primary mb-4" style={{ 
                display: 'inline-block', 
                background: 'var(--color-primary-light)', 
                color: 'var(--color-primary)',
                padding: '6px 16px',
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                #1 Peer Tutoring at ABU
              </span>
              <h1 className="font-extrabold mb-6 leading-tight text-4xl text-4xl-md" style={{ color: 'var(--color-text)' }}>
                Master Your Courses with <span style={{ color: 'var(--color-primary)' }}>Top ABU Peers.</span>
              </h1>
              <p className="text-lg mb-8 leading-relaxed mx-auto" style={{ color: 'var(--color-text-secondary)', maxWidth: '500px', marginLeft: '0' }}>
                Connect with high-performing students who have aced your courses. Personalized 1-on-1 learning tailored to the ABU curriculum.
              </p>
              
              <div className="search-wrap mb-8">
                <form className="search-box mx-auto" onSubmit={handleSearch} style={{ maxWidth: '600px', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--color-border)', marginLeft: '0' }}>
                  <input 
                    type="text" 
                    className="search-box__input" 
                    placeholder="What course do you need help with? (e.g. CGEN 231)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ border: 'none' }}
                  />
                  <button type="submit" className="btn btn--primary" style={{ height: '48px', borderRadius: '6px', margin: '4px' }}>Search</button>
                </form>
              </div>

              <div className="hero-stats flex-row-center pt-4">
                <div className="text-center">
                  <div className="font-bold text-xl">Peer-Led</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>ABU Support</div>
                </div>
                <div className="hidden-mobile" style={{ width: '1px', height: '30px', background: 'var(--color-border)' }}></div>
                <div className="text-center">
                  <div className="font-bold text-xl">Verified</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Student Experts</div>
                </div>
                <div className="hidden-mobile" style={{ width: '1px', height: '30px', background: 'var(--color-border)' }}></div>
                <div className="text-center">
                  <div className="font-bold text-xl">Secure</div>
                  <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Escrow Payments</div>
                </div>
              </div>
            </div>
            
            <div className="hero-visual hidden-mobile">
              <div style={{ position: 'relative' }}>
                <img 
                  src="/hero_illustration.png" 
                  alt="Tutoring Illustration" 
                  style={{ width: '100%', height: 'auto', borderRadius: '20px' }}
                />
                <div className="absolute" style={{ bottom: '-20px', left: '-20px', background: 'white', padding: '16px', borderRadius: '12px', boxShadow: 'var(--shadow-xl)', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '50%', color: '#059669' }}>✅</div>
                  <div>
                    <div className="font-bold" style={{ fontSize: '14px' }}>Peer Matching</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Smart ABU Network</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. HOW IT WORKS */}
      <section className="marketing-section marketing-section--alt">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-bold mb-4 text-4xl">Your Path to Excellence</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>Get the academic help you need in three simple steps.</p>
          </div>
          
          <div className="grid-3">
            <div className="feature-card">
              <div className="mb-6 mx-auto" style={{ width: '120px', height: '120px' }}>
                <img src="/how_1.png" alt="Find Tutor" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h3 className="font-bold text-xl mb-3">1. Find Your Peer</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Search by course code or faculty to find tutors who have already mastered your specific ABU syllabus.</p>
            </div>
            <div className="feature-card">
              <div className="mb-6 mx-auto" style={{ width: '120px', height: '120px' }}>
                <img src="/how_2.png" alt="Book Session" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h3 className="font-bold text-xl mb-3">2. Book a Session</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Pick a time and location on campus. Payment is held in escrow until your session is successfully completed.</p>
            </div>
            <div className="feature-card">
              <div className="mb-6 mx-auto" style={{ width: '120px', height: '120px' }}>
                <img src="/how_3.png" alt="Ace Exams" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              </div>
              <h3 className="font-bold text-xl mb-3">3. Level Up</h3>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>Get personalized tips and problem-solving techniques from high-performing peers who understand your struggle.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. AI PREMIUM MATCH */}
      <section className="marketing-section" style={{ background: 'var(--color-secondary)', color: 'white' }}>
        <div className="container">
          <div className="grid-2">
            <div>
              <span className="badge mb-4" style={{ 
                background: 'rgba(255,255,255,0.2)', 
                padding: '4px 12px', 
                borderRadius: '20px', 
                fontSize: '12px',
                fontWeight: 'bold',
                display: 'inline-block'
              }}>AGENTIC AI POWERED</span>
              <h2 className="font-bold mb-6 text-4xl">Can't choose? Let our AI match you.</h2>
              <p className="text-lg mb-8 opacity-90">Our agentic AI analyzes your specific course problems and finds the tutor whose teaching style matches your learning needs perfectly.</p>
              <ul className="mb-8" style={{ listStyle: 'none', padding: 0 }}>
                <li className="mb-4 flex-row-center" style={{ gap: '10px' }}>✨ Smart Matching Architecture</li>
                <li className="mb-4 flex-row-center" style={{ gap: '10px' }}>✨ Curriculum-aware recommendations</li>
                <li className="mb-4 flex-row-center" style={{ gap: '10px' }}>✨ Fast resolution in under 60 seconds</li>
              </ul>
              <Link href="/ai-match" className="btn btn--white-outline" style={{ background: 'white', color: 'var(--color-secondary)', border: 'none', padding: '12px 24px' }}>Try AI Match Now</Link>
            </div>
            <div className="hidden-mobile" style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ 
                width: '300px', height: '300px', 
                background: 'rgba(255,255,255,0.1)', 
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px dashed rgba(255,255,255,0.3)',
                position: 'relative'
              }}>
                <div style={{ fontSize: '80px' }}>🤖</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FEATURED TUTORS */}
      <section className="marketing-section">
        <div className="container">
          <div className="section-header mb-12">
            <div>
              <h2 className="section-header__title">Featured Experts</h2>
              <p style={{ color: 'var(--color-text-secondary)' }}>Highly-rated tutors currently helping students.</p>
            </div>
            <Link href="/tutors" className="btn btn--outline btn--sm">View All Tutors</Link>
          </div>
          
          <div className="tutor-grid">
            {loading ? (
              <p>Loading top tutors...</p>
            ) : tutors.length > 0 ? (
              tutors.map((tutor) => (
                <article key={tutor._id} className="tutor-card">
                  <div className="tutor-card__image-wrap">
                    {tutor.documents?.profilePicture ? (
                      <img 
                        src={getImageUrl(tutor.documents.profilePicture)} 
                        alt={tutor.name} 
                        className="tutor-card__image" 
                      />
                    ) : (
                      <div style={{ 
                        width: '100%', height: '100%', 
                        background: 'var(--color-primary-light)', color: 'var(--color-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '48px', fontWeight: 'bold'
                      }}>
                        {tutor.name.charAt(0)}
                      </div>
                    )}
                    <span className={`tutor-card__badge ${tutor.role === 'verified_tutor' ? 'tutor-card__badge--orange' : 'tutor-card__badge--green'}`}>
                      {tutor.role === 'verified_tutor' ? 'Verified Tutor' : 'New Tutor'}
                    </span>
                  </div>
                  <div className="tutor-card__content">
                    <h3 className="tutor-card__name">{tutor.name}</h3>
                    <p className="tutor-card__subject">{tutor.courses?.slice(0, 2).join(', ') || tutor.department}</p>
                    <div className="tutor-card__meta">
                      <div className="tutor-card__rating">
                        <span className="star">★</span> {tutor.rating || 'New'} 
                        <span className="count">({tutor.sessionsCompleted || 0})</span>
                      </div>
                      <span className="tutor-card__price">₦{tutor.role === 'verified_tutor' ? (tutor.hourlyRate || 800) : 500}</span>
                    </div>
                    <Link href={`/book-session?tutor=${tutor._id}`} className="btn btn--primary btn--block" style={{ borderRadius: '6px' }}>Book Session</Link>
                  </div>
                </article>
              ))
            ) : (
              <p>No tutors available at the moment.</p>
            )}
          </div>
        </div>
      </section>

      {/* 5. BECOME A TUTOR CTA */}
      <section className="marketing-section" style={{ padding: '0 0 80px' }}>
        <div className="container">
          <div style={{ background: 'var(--color-primary)', color: 'white', borderRadius: '24px', padding: '60px 20px', textAlign: 'center' }}>
            <h2 className="font-bold mb-6 text-4xl">Earn by helping your peers.</h2>
            <p className="text-lg mb-8 mx-auto" style={{ opacity: '0.9', maxWidth: '600px' }}>Have you aced your courses? Join the elite team of ABU tutors and start earning while you study.</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
              <Link href="/register?role=tutor" className="btn btn--white-outline" style={{ background: 'white', color: 'var(--color-primary)', border: 'none', padding: '16px 32px' }}>Apply to be a Tutor</Link>
              <Link href="/about" className="btn btn--outline" style={{ color: 'white', borderColor: 'white', background: 'transparent', padding: '16px 32px' }}>Learn More</Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FOOTER */}
      <footer className="app-footer">
        <div className="container">
          <div className="app-footer__grid">
            <div className="footer-brand">
              <img src="/logo.png" alt="ABUTutors" style={{ height: '40px', marginBottom: '20px' }} />
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', maxWidth: '300px' }}>
                The official peer-tutoring marketplace for Ahmadu Bello University students. Empowering academic excellence.
              </p>
            </div>
            <div>
              <h4 className="app-footer__title">Platform</h4>
              <ul className="app-footer__links">
                <li><Link href="/tutors">Find Tutors</Link></li>
                <li><Link href="/ai-match">AI Matching</Link></li>
                <li><Link href="/register">Join as Student</Link></li>
                <li><Link href="/register?role=tutor">Become a Tutor</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="app-footer__title">Support</h4>
              <ul className="app-footer__links">
                <li><Link href="/faq">FAQs</Link></li>
                <li><Link href="/contact">Contact Us</Link></li>
                <li><Link href="/privacy">Privacy Policy</Link></li>
                <li><Link href="/terms">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="app-footer__title">Contact</h4>
              <ul className="app-footer__links" style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                <li>📍 ABU Main Campus, Samaru</li>
                <li>📧 support@abututors.edu.ng</li>
                <li>📞 +234 800 000 0000</li>
              </ul>
            </div>
          </div>
          <div className="app-footer__bottom">
            <p>© 2026 ABUTutorsConnect. All rights reserved.</p>
            <div style={{ display: 'flex', gap: '24px' }}>
              <a href="#">Twitter</a>
              <a href="#">LinkedIn</a>
              <a href="#">Instagram</a>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}

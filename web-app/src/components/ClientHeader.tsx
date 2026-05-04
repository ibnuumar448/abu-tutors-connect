'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { notificationApi, userApi } from '../services/api';
import { getImageUrl } from '../utils/image';
import { getSocket, disconnectSocket } from '../utils/socket';

export default function ClientHeader() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
        setIsLoggedIn(true);
        fetchUserAndNotifications();
    }

    // Listen for profile updates from other components
    const handleProfileUpdate = () => {
        console.log('Header detected profile update, refreshing...');
        fetchUserAndNotifications();
    };
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
        window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, [pathname]);

  const fetchUserAndNotifications = async () => {
      try {
          const [userRes, notifRes] = await Promise.all([
              userApi.getProfile(),
              notificationApi.getNotifications()
          ]);
          setUser(userRes.data);
          setUnreadCount(notifRes.data.filter((n: any) => !n.read).length);
          
          // NEW: Initialize Socket
          getSocket(userRes.data._id);
      } catch (err) {
          console.error('Header fetch error', err);
      }
  };

  const handleLogout = () => {
      disconnectSocket(); // NEW
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsLoggedIn(false);
      router.push('/login');
  };

  return (
    <header className="app-header">
      <div className="app-header__inner container">
        <Link href="/" className="logo">
          <span className="logo__icon">A</span>
          <span>ABUTutors</span>
        </Link>
        <nav className="app-header__nav">
          {(!isLoggedIn || user?.role !== 'admin') && (
            <>
              <Link href="/" className={pathname === '/' ? 'nav-link--active' : ''}>Home</Link>
              <Link href="/tutors" className={pathname === '/tutors' ? 'nav-link--active' : ''}>Find Tutors</Link>
              <Link href="/ai-match" className={pathname === '/ai-match' ? 'nav-link--active' : ''}>AI Match</Link>
            </>
          )}
          {isLoggedIn && user?.role === 'admin' && (
              <Link href="/admin" className={pathname === '/admin' ? 'nav-link--active' : ''}>Admin Panel</Link>
          )}
          {isLoggedIn && user?.role !== 'tutee' && user?.role !== 'admin' && (
              <Link href="/tutor-dashboard" className={pathname === '/tutor-dashboard' ? 'nav-link--active' : ''}>Tutor Dash</Link>
          )}
          {isLoggedIn && user?.role !== 'admin' && (
              <Link href="/my-sessions" className={pathname === '/my-sessions' ? 'nav-link--active' : ''}>Sessions</Link>
          )}
        </nav>
        <div className="app-header__actions">
          {isLoggedIn ? (
            <>
              <Link href="/notifications" className="icon-btn" aria-label="Notifications" style={{ position: 'relative' }}>
                <span>🔔</span>
                {unreadCount > 0 && (
                    <span className="icon-btn__badge" 
                          style={{ 
                              position: 'absolute', 
                              top: '-2px', 
                              right: '-2px', 
                              background: '#DC2626', 
                              borderRadius: '50%', 
                              width: '12px', 
                              height: '12px' 
                          }} 
                    />
                )}
              </Link>
              <Link href="/wallet" className="icon-btn" aria-label="Wallet">💰</Link>
              <Link href="/profile" className={`icon-btn ${pathname === '/profile' ? 'nav-link--active' : ''}`} aria-label="Profile" style={{ padding: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', borderRadius: '50%' }}>
                {user?.documents?.profilePicture ? (
                    <img 
                        src={getImageUrl(user.documents.profilePicture)} 
                        alt="Profile" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                ) : (
                    <img 
                        src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=0D8ABC&color=fff`} 
                        alt="Profile" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                )}
              </Link>
              <button onClick={handleLogout} className="btn btn--outline btn--sm">Logout</button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn btn--outline" style={{ padding: '8px 16px', fontSize: '14px' }}>Login</Link>
              <Link href="/register" className="btn btn--primary" style={{ padding: '8px 16px', fontSize: '14px' }}>Sign Up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

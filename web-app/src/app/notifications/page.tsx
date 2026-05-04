'use client';

import React, { useState, useEffect } from 'react';
import { notificationApi } from '../../services/api';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationApi.getNotifications();
      setNotifications(response.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications(notifications.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error('Failed to mark as read', err);
    }
  };

  const handleDelete = async (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      try {
          await notificationApi.deleteNotification(id);
          setNotifications(notifications.filter(n => n._id !== id));
      } catch (err) {
          console.error('Failed to delete', err);
      }
  };

  const handleCardClick = (n: any) => {
    if (!n.read) handleMarkAsRead(n._id);
    if (n.type?.includes('session')) router.push('/sessions');
    else if (n.type?.includes('payment') || n.type?.includes('wallet')) router.push('/wallet');
    else if (n.type?.includes('message')) router.push('/messages');
    else if (n.link) router.push(n.link);
  };

  const filteredNotifications = notifications.filter(n => {
    if (filter === 'All') return true;
    const typeMap: Record<string, string> = {
      'Sessions': 'session',
      'Messages': 'message',
      'Payments': 'payment'
    };
    return n.type?.toLowerCase() === typeMap[filter];
  });

  const getIcon = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'session') return '📅';
    if (t === 'payment') return '💰';
    if (t === 'message') return '💬';
    return '🔔';
  };

  const getBgColor = (type: string) => {
    const t = type?.toLowerCase();
    if (t === 'session') return '#E0F2FE'; // light blue
    if (t === 'payment') return '#DCFCE7'; // light green
    if (t === 'message') return '#F3E8FF'; // light purple
    return '#F1F5F9';
  };

  if (loading) return <main className="container pt-space-8 text-center">Loading notifications...</main>;

  return (
    <main className="container pb-space-8 pt-space-8">
      <div className="page-header" style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
        <h1 className="page-header__title">Notifications</h1>
        <p className="page-header__subtitle">Stay updated on your sessions and messages</p>
      </div>

      <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-6)', flexWrap: 'wrap' }}>
        {['All', 'Sessions', 'Messages', 'Payments'].map(f => (
          <button 
            key={f}
            onClick={() => setFilter(f)}
            className={`course-tag ${filter === f ? 'course-tag--active' : ''}`}
            style={{ cursor: 'pointer', border: 'none', background: filter === f ? 'var(--color-primary)' : 'var(--color-bg)' }}
          >
            {f}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((n: any) => (
            <div key={n._id} className="card" style={{ opacity: n.read ? 0.7 : 1, cursor: 'pointer' }} onClick={() => handleCardClick(n)}>
              <div className="card__body" style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center' }}>
                <div style={{ flexShrink: 0 }}>
                  <span style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    width: '48px', 
                    height: '48px', 
                    background: getBgColor(n.type), 
                    borderRadius: '50%', 
                    fontSize: '24px' 
                  }}>
                    {getIcon(n.type)}
                  </span>
                </div>
                <div style={{ flex: 1 }}>
                  <h3 className="tutor-card__name" style={{ margin: '0 0 var(--space-1)' }}>{n.title}</h3>
                  <p className="tutor-card__subject" style={{ margin: 0 }}>{n.message}</p>
                  <p className="tutor-card__subject" style={{ margin: 'var(--space-2) 0 0', fontSize: 'var(--font-size-xs)' }}>
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {!n.read && (
                        <button className="btn btn--secondary btn--sm" onClick={(e) => { e.stopPropagation(); handleMarkAsRead(n._id); }}>Read</button>
                    )}
                    <button className="btn btn--outline btn--sm" onClick={(e) => handleDelete(n._id, e)}>Dismiss</button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-muted">You have no {filter === 'All' ? '' : filter.toLowerCase()} notifications.</p>
        )}
      </div>
    </main>
  );
}

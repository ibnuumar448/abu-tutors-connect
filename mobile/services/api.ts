import axios from 'axios';
import { storage } from '../utils/storage';

import { Platform } from 'react-native';

// ─── Base URL ─────────────────────────────────────────────────────────────────
// Web: backend is on same machine → use localhost
// Native (phone): backend is on PC on local network → // Current IP: 10.171.77.38
const NATIVE_URL = 'http://10.171.77.38:5001/api'; // your PC's local IP
const WEB_URL = 'http://localhost:5001/api';

export const BASE_URL = Platform.OS === 'web' ? WEB_URL : NATIVE_URL;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor (attach token) ───────────────────────────────────────
api.interceptors.request.use(async (config) => {
  const token = await storage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response Interceptor (handle 401) ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await storage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => {
    const isFormData = data instanceof FormData;
    return api.post('/auth/register', data, {
      headers: {
        'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
      },
    });
  },
};

// ─── User / Profile ───────────────────────────────────────────────────────────
export const userApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (formData: FormData) =>
    api.put('/users', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getTutors: (params?: { search?: string; faculty?: string }) =>
    api.get('/users/tutors', { params }),
  getTutorById: (id: string) => api.get(`/users/tutors/${id}`),
  updateProfileData: (data: any) => api.patch('/users', data),
  getAdminId: () => api.get('/users/admin-id'),
};

// ─── Sessions ─────────────────────────────────────────────────────────────────
// Backend: POST /, GET / → sessions
//         POST /:id/start, POST /:id/complete, POST /:id/cancel
//         POST /:id/no-show, POST /:id/reschedule, POST /:id/sync
export const sessionApi = {
  getSessions: () => api.get('/sessions'),
  createSession: (data: {
    tutorId: string; topic: string;
    scheduledDate: string; durationMinutes: number;
    venue?: string;
  }) => api.post('/sessions', data),
  lockSlot: (data: { tutorId: string; slot: string }) => 
    api.post('/sessions/lock', data),
  bookSession: (data: any) => api.post('/sessions', data),
  startSession: (id: string, data: string) => 
    api.post(`/sessions/${id}/start`, data.length === 6 && /^\d+$/.test(data) ? { pin: data } : { qrData: data }),
  completeSession: (id: string, data: string) => 
    api.post(`/sessions/${id}/complete`, data.length === 6 && /^\d+$/.test(data) ? { pin: data } : { qrData: data }),
  cancelSession: (id: string) => api.post(`/sessions/${id}/cancel`),
  reportNoShow: (id: string) => api.post(`/sessions/${id}/no-show`),
  rescheduleSession: (id: string, data: { scheduledDate: string }) =>
    api.post(`/sessions/${id}/reschedule`, data),
  syncSession: (id: string, deviceTime: string) =>
    api.post(`/sessions/${id}/sync`, { deviceTime }),
  reviewSession: (id: string, data: { rating: number; reviewText?: string }) =>
    api.post(`/sessions/${id}/review`, data),
};

// ─── Wallet ───────────────────────────────────────────────────────────────────
export const walletApi = {
  getWallet: () => api.get('/wallets'),
  initializePayment: (amount: number) =>
    api.post('/wallets/initialize', { amount }),
  verifyPayment: (reference: string) =>
    api.get(`/wallets/verify?reference=${reference}`),
  withdrawFunds: (data: { amount: number; pin: string }) =>
    api.post('/wallets/withdraw', data),
  setTransactionPin: (data: { pin: string; currentPassword?: string }) =>
    api.post('/wallets/set-pin', data),
  payRegistrationFromWallet: () =>
    api.post('/wallets/pay-registration'),
};

// ─── Banks ────────────────────────────────────────────────────────────────────
export const bankApi = {
  getBanks: () => api.get('/wallets/banks'),
  verifyAccount: (accountNumber: string, bankCode: string) =>
    api.get(`/wallets/verify-account?accountNumber=${accountNumber}&bankCode=${bankCode}`),
};

// ─── AI Match ─────────────────────────────────────────────────────────────────
export const matchApi = {
  requestMatch: (course: string, prompt: string, budget?: string) =>
    api.post('/match/request', { course, prompt, budget }),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationApi = {
  getNotifications: () => api.get('/notifications'),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messageApi = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (userId: string) => api.get(`/messages/${userId}`),
  sendMessage: (recipientId: string, content: string) =>
    api.post('/messages', { receiverId: recipientId, content }),
};

// ─── Admin ────────────────────────────────────────────────────────────────────
export const adminApi = {
  getPendingTutors: () => api.get('/admin/pending-tutors'),
  approveTutor: (id: string, status: 'approve' | 'reject') =>
    api.put(`/admin/tutors/${id}/approve`, { status }),
  getAllUsers: () => api.get('/admin/users'),
  updateUserStatus: (id: string, data: { role?: string; isApproved?: boolean }) =>
    api.put(`/admin/users/${id}/status`, data),
  getAdminLogs: () => api.get('/admin/logs'),
  getAllSessions: () => api.get('/admin/sessions'),
  getFinances: () => api.get('/admin/finances'),
  getVenues: () => api.get('/admin/venues'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.post('/admin/settings', data)
};

// ─── Token helpers ────────────────────────────────────────────────────────────
export const saveToken = (token: string) => storage.setItem('auth_token', token);
export const getToken = () => storage.getItem('auth_token');
export const removeToken = () => storage.removeItem('auth_token');

export default api;

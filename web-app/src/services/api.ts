import axios from 'axios';

const getBaseUrl = () => {
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:5001/api`;
    }
    return 'http://localhost:5001/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        // Axios will automatically set Content-Type to multipart/form-data when sending FormData
    },
});

// Add interceptors here if needed (e.g., attaching JWTs automatically to requests)
api.interceptors.request.use(
    (config) => {
        // We can conditionally add a token here from localStorage if the user is authenticated.
        if (typeof window !== 'undefined') {
            const token = localStorage.getItem('token');
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for global error handling
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            // This is a Network Error (server down, CORS, etc.)
            const targetUrl = error.config ? `${error.config.baseURL}${error.config.url}` : 'unknown';
            console.error(`API Network Error - Check if backend is reachable at ${targetUrl}:`, error.message);
            // Optionally, we could trigger a global alert here
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (data: any) => api.post('/auth/login', data),
    register: (data: any) => api.post('/auth/register', data),
};

export const userApi = {
    // Get current logged-in user profile
    getProfile: () => api.get('/users/'),
    
    // Update current user profile
    updateProfile: (data: any) => api.put('/users/', data),

    // NEW: Dedicated profile picture update
    updateProfilePicture: (data: FormData) => api.put('/users/profile-picture', data),
    
    // Get all tutors (public)
    getTutors: () => api.get('/users/tutors'),

    // Get public tutor profile
    getTutorProfile: (id: string) => api.get(`/users/tutors/${id}`),

    // Get basic public profile for any user (Private)
    getUserPublicProfile: (id: string) => api.get(`/users/profile/${id}`),

    // Get system admin ID
    getAdminId: () => api.get('/users/admin-id'),

    // Apply for new courses
    applyCourse: (data: FormData) => api.post('/users/apply-course', data),
};

export const sessionApi = {
    // Book a session
    bookSession: (data: any) => api.post('/sessions', data),
    
    // Get all user sessions
    getSessions: () => api.get('/sessions'),
    
    // Lock a slot (Phase 1)
    lockSlot: (data: { tutorId: string; slot: string }) => api.post('/sessions/lock', data),

    // Start session (tutor scans tutee QR OR enters PIN)
    startSession: (id: string, data: { qrData?: string; pin?: string }) => api.post(`/sessions/${id}/start`, data),

    // Complete session (tutor scans tutee QR OR enters PIN)
    completeSession: (id: string, data: { qrData?: string; pin?: string; rating?: number }) => api.post(`/sessions/${id}/complete`, data),

    // Sync active session (Phase 4)
    syncSession: (id: string, deviceTime: string) => api.post(`/sessions/${id}/sync`, { deviceTime }),

    // Cancel session
    cancelSession: (id: string) => api.post(`/sessions/${id}/cancel`),

    // Report no-show
    reportNoShow: (id: string) => api.post(`/sessions/${id}/no-show`),

    // Reschedule session
    rescheduleSession: (id: string, data: { date: string, time: string }) => api.post(`/sessions/${id}/reschedule`, data),
};

export const adminApi = {
    // Get pending tutors for approval
    getPendingTutors: () => api.get('/admin/pending-tutors'),
    
    // Approve or reject tutor
    approveTutor: (id: string, status: 'approve' | 'reject' | 'needs_revision', feedback?: string) => 
        api.put(`/admin/tutors/${id}/approve`, { status, feedback }),
    
    // Course Applications
    getPendingCourseApplications: () => api.get('/admin/course-applications'),
    processCourseApplication: (userId: string, appId: string, status: 'approved' | 'rejected', feedback?: string) => 
        api.put(`/admin/course-applications/${userId}/${appId}`, { status, feedback }),
    
    // Settings
    getSettings: () => api.get('/admin/settings'),
    updateSettings: (data: any) => api.put('/admin/settings', data),

    // Venues
    getVenues: () => api.get('/admin/venues'),
    addVenue: (data: { name: string; location: string }) => api.post('/admin/venues', data),
    updateVenue: (id: string, data: any) => api.put(`/admin/venues/${id}`, data),
    deleteVenue: (id: string) => api.delete(`/admin/venues/${id}`),
    
    // User Management
    getAllUsers: () => api.get('/admin/users'),
    updateUserStatus: (id: string, data: { role?: string; isApproved?: boolean }) => api.put(`/admin/users/${id}/status`, data),
    
    // Activity History
    getAdminLogs: () => api.get('/admin/logs'),

    // Session Monitoring
    getAllSessions: () => api.get('/admin/sessions'),
    overrideSession: (id: string, data: { status?: string; escrowStatus?: string }) => api.put(`/admin/sessions/${id}/override`, data),

    // Financial Monitoring
    getFinances: () => api.get('/admin/finances'),

    // Messaging
    sendMessageToUser: (receiverId: string, content: string) => api.post('/messages', { receiverId, content }),
};

export const paymentApi = {
    // Mock registration fee payment
    payRegistrationFee: (txRef: string) => api.post('/payment/register', { txRef }),
};

export const walletApi = {
    // Get wallet balance and history
    getWallet: () => api.get('/wallets'),
    
    // Initialize Paystack payment
    initializePayment: (amount: number) => api.post('/wallets/initialize', { amount }),

    // Verify Paystack payment
    verifyPayment: (reference: string) => api.get(`/wallets/verify?reference=${reference}`),

    // Withdraw funds (Tutors only)
    withdrawFunds: (data: { amount: number; pin: string }) => api.post('/wallets/withdraw', data),
    
    // Set Transaction PIN
    setTransactionPin: (data: { pin: string; currentPassword?: string }) => api.post('/wallets/set-pin', data),

    // Pay Registration Fee from Wallet
    payRegistrationFromWallet: () => api.post('/wallets/pay-registration'),
};

export const bankApi = {
    // Get list of banks
    getBanks: () => api.get('/wallets/banks'),
    
    // Verify account number
    verifyAccount: (accountNumber: string, bankCode: string) => api.get(`/wallets/verify-account?accountNumber=${accountNumber}&bankCode=${bankCode}`),
};

export const statsApi = {
    // Get tutor dashboard stats
    getTutorStats: () => api.get('/stats/tutor'),
};

export const notificationApi = {
    // Get notifications
    getNotifications: () => api.get('/notifications'),
    
    // Mark as read
    markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
    
    // Delete notification
    deleteNotification: (id: string) => api.delete(`/notifications/${id}`),
};

export const messageApi = {
    // Send a message
    sendMessage: (data: { receiverId: string; content: string }) => api.post('/messages', data),
    
    // Get chat list (recent conversations)
    getChatList: () => api.get('/messages/conversations'),
    
    // Get messages for a specific conversation
    getConversation: (otherUserId: string) => api.get(`/messages/${otherUserId}`),
};

export default api;

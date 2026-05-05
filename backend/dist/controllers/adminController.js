"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkTutorUpgrade = exports.getAdminLogs = exports.reconcileEscrows = exports.getFinancialStats = exports.overrideSession = exports.getAllSessions = exports.updateUserStatus = exports.getAllUsers = exports.deleteVenue = exports.updateVenue = exports.getVenues = exports.addVenue = exports.updateSettings = exports.getSettings = exports.processCourseApplication = exports.getPendingCourseApplications = exports.approveTutor = exports.getPendingTutors = void 0;
const User_1 = __importDefault(require("../models/User"));
const Settings_1 = __importDefault(require("../models/Settings"));
const Venue_1 = __importDefault(require("../models/Venue"));
const Session_1 = __importDefault(require("../models/Session"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const Escrow_1 = __importDefault(require("../models/Escrow"));
const AdminLog_1 = __importDefault(require("../models/AdminLog"));
const Message_1 = __importDefault(require("../models/Message"));
const logger_1 = __importDefault(require("../utils/logger"));
// @desc    Get all pending tutors for approval
// @route   GET /api/admin/pending-tutors
// @access  Private/Admin
const getPendingTutors = async (req, res) => {
    try {
        const tutors = await User_1.default.find({
            role: { $in: ['tutor', 'verified_tutor'] },
            isApproved: false,
            isProfileComplete: true, // Only show those who finished the wizard
            applicationStatus: 'pending'
        }).select('-password').sort({ updatedAt: -1 });
        res.json(tutors);
    }
    catch (error) {
        console.error(`[ADMIN_ERROR] Get Pending Tutors:`, error);
        logger_1.default.error(`Get Pending Tutors Error: ${error.message}`);
        res.status(500).json({ message: "Server error getting pending tutors" });
    }
};
exports.getPendingTutors = getPendingTutors;
// @desc    Approve or reject a tutor
// @route   PUT /api/admin/tutors/:id/approve
// @access  Private/Admin
const approveTutor = async (req, res) => {
    try {
        const { status, feedback } = req.body; // 'approve', 'reject', or 'needs_revision'
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        if (status === 'approve') {
            user.isApproved = true;
            user.applicationStatus = 'approved';
            user.isProfileComplete = true; // Ensure they can see their profile
            user.adminFeedback = '';
            // ENSURE: Newly approved tutors start as 'tutor', not 'verified_tutor'
            if (user.role === 'verified_tutor' && user.sessionsCompleted === 0) {
                user.role = 'tutor';
            }
            else if (user.role === 'tutee') {
                // If they were a tutee applying to be a tutor
                user.role = 'tutor';
            }
            await AdminLog_1.default.create({
                adminId: req.user.id,
                action: 'APPROVE_TUTOR',
                targetId: user._id.toString(),
                details: `Approved tutor ${user.email}`
            });
            // Automated Welcome Message
            await Message_1.default.create({
                senderId: req.user.id,
                receiverId: user._id,
                content: `Congratulations ${user.name}! Your tutor application has been approved. You can now set your availability and start accepting sessions.`
            });
            logger_1.default.info(`Tutor ${user.email} approved by admin`);
        }
        else {
            // Distinguish between 'reject' and 'needs_revision'
            user.isApproved = false;
            user.applicationStatus = status === 'reject' ? 'rejected' : 'needs_revision';
            user.adminFeedback = feedback || (status === 'reject' ? 'Your application has been declined.' : 'Please review your application details.');
            user.isProfileComplete = status === 'needs_revision' ? false : true; // Keep true for rejected so they don't see wizard again
            await AdminLog_1.default.create({
                adminId: req.user.id,
                action: status === 'reject' ? 'REJECT_TUTOR' : 'REQUEST_REVISION',
                targetId: user._id.toString(),
                details: `${status === 'reject' ? 'Rejection' : 'Revision requested'} for ${user.email}: ${feedback}`
            });
            // Automated Message
            await Message_1.default.create({
                senderId: req.user.id,
                receiverId: user._id,
                content: status === 'reject'
                    ? `Hello ${user.name}, we regret to inform you that your tutor application has been declined. Admin Feedback: ${user.adminFeedback}`
                    : `Hello ${user.name}, your tutor application needs some changes. Admin Feedback: ${user.adminFeedback}. Please update your profile and resubmit for approval.`
            });
            logger_1.default.info(`${status === 'reject' ? 'Rejection' : 'Revision'} for tutor ${user.email}`);
        }
        logger_1.default.info(`[ADMIN_ACTION] User: ${user.email}, Target Status: ${status}, Current AppStatus: ${user.applicationStatus}`);
        try {
            await user.save();
            logger_1.default.info(`[ADMIN_ACTION] SAVE SUCCESS - User: ${user.email}, New AppStatus: ${user.applicationStatus}, isApproved: ${user.isApproved}`);
            res.json({ message: `Tutor ${status.replace('_', ' ')}d successfully`, user });
        }
        catch (saveError) {
            logger_1.default.error(`[ADMIN_SAVE_ERROR] Failed to save user ${user.email}: ${saveError.message}`);
            res.status(400).json({ message: "Update failed: " + saveError.message });
        }
    }
    catch (error) {
        logger_1.default.error(`[ADMIN_FATAL_ERROR] ${error.message}`);
        res.status(500).json({ message: "Server error during tutor approval" });
    }
};
exports.approveTutor = approveTutor;
// @desc    Get all pending course applications
// @route   GET /api/admin/course-applications
// @access  Private/Admin
const getPendingCourseApplications = async (req, res) => {
    try {
        const users = await User_1.default.find({
            "courseApplications.status": "pending"
        }).select('name email courseApplications registrationNumber');
        // Flatten the applications for the admin view
        const applications = users.flatMap(u => (u.courseApplications || [])
            .filter(app => app.status === 'pending')
            .map(app => {
            const appObj = app.toObject ? app.toObject() : app;
            return {
                userId: u._id,
                userName: u.name,
                userEmail: u.email,
                registrationNumber: u.registrationNumber,
                ...appObj,
                _id: app._id // Keep the sub-document ID
            };
        }));
        res.json(applications);
    }
    catch (error) {
        logger_1.default.error(`Get Course Applications Error: ${error.message}`);
        res.status(500).json({ message: "Server error getting course applications" });
    }
};
exports.getPendingCourseApplications = getPendingCourseApplications;
// @desc    Process a course application (Approve/Reject)
// @route   PUT /api/admin/course-applications/:userId/:appId
// @access  Private/Admin
const processCourseApplication = async (req, res) => {
    try {
        const { userId, appId } = req.params;
        const { status, feedback } = req.body; // 'approved' or 'rejected'
        const user = await User_1.default.findById(userId);
        if (!user || !user.courseApplications) {
            res.status(404).json({ message: "User or application not found" });
            return;
        }
        const appIndex = user.courseApplications.findIndex(a => a._id?.toString() === appId);
        if (appIndex === -1) {
            res.status(404).json({ message: "Application not found" });
            return;
        }
        const application = user.courseApplications[appIndex];
        if (!application) {
            res.status(404).json({ message: "Application data not found" });
            return;
        }
        application.status = status;
        application.adminFeedback = feedback;
        if (status === 'approved') {
            // Add new courses to the main courses list, ensuring uniqueness
            const currentCourses = new Set(user.courses || []);
            application.courses.forEach(c => currentCourses.add(c));
            user.courses = Array.from(currentCourses);
            // Optionally update the main transcript if provided
            if (application.transcript) {
                if (!user.documents)
                    user.documents = { admissionLetter: '', transcript: '', profilePicture: '' };
                user.documents.transcript = application.transcript;
            }
        }
        await user.save();
        await AdminLog_1.default.create({
            adminId: req.user.id,
            action: status === 'approved' ? 'APPROVE_COURSE_APP' : 'REJECT_COURSE_APP',
            targetId: userId,
            details: `${status === 'approved' ? 'Approved' : 'Rejected'} course application for ${user.email}. Courses: ${application.courses.join(', ')}`
        });
        res.json({ message: `Course application ${status} successfully`, user });
    }
    catch (error) {
        logger_1.default.error(`Process Course Application Error: ${error.message}`);
        res.status(500).json({ message: "Server error processing course application" });
    }
};
exports.processCourseApplication = processCourseApplication;
// @desc    Get system settings
// @route   GET /api/admin/settings
// @access  Public (some fields) / Private (all fields)
const getSettings = async (req, res) => {
    try {
        const settings = await Settings_1.default.findOne() || await Settings_1.default.create({});
        res.json(settings);
    }
    catch (error) {
        logger_1.default.error(`Get Settings Error: ${error.message}`);
        res.status(500).json({ message: "Server error getting settings" });
    }
};
exports.getSettings = getSettings;
// @desc    Update system settings
// @route   PUT /api/admin/settings
// @access  Private/Admin
const updateSettings = async (req, res) => {
    try {
        let settings = await Settings_1.default.findOne();
        if (!settings)
            settings = new Settings_1.default({});
        settings.maxHourlyRate = req.body.maxHourlyRate ?? settings.maxHourlyRate;
        settings.registrationFee = req.body.registrationFee ?? settings.registrationFee;
        settings.isRegistrationFree = (req.body.isRegistrationFree !== undefined) ? req.body.isRegistrationFree : settings.isRegistrationFree;
        settings.minSessionsForVerify = req.body.minSessionsForVerify ?? settings.minSessionsForVerify;
        settings.minRatingForVerify = req.body.minRatingForVerify ?? settings.minRatingForVerify;
        settings.noShowPayoutPercent = req.body.noShowPayoutPercent ?? settings.noShowPayoutPercent;
        settings.platformCommissionPercent = req.body.platformCommissionPercent ?? settings.platformCommissionPercent;
        settings.defaultHourlyRate = req.body.defaultHourlyRate ?? settings.defaultHourlyRate;
        await settings.save();
        res.json(settings);
    }
    catch (error) {
        logger_1.default.error(`Update Settings Error: ${error.message}`);
        res.status(500).json({ message: "Server error updating settings" });
    }
};
exports.updateSettings = updateSettings;
// --- Venue Management ---
// @desc    Add a new venue
// @route   POST /api/admin/venues
// @access  Private/Admin
const addVenue = async (req, res) => {
    try {
        const { name, location } = req.body;
        const venue = await Venue_1.default.create({ name, location });
        res.status(201).json(venue);
    }
    catch (error) {
        logger_1.default.error(`Add Venue Error: ${error.message}`);
        res.status(500).json({ message: "Server error adding venue" });
    }
};
exports.addVenue = addVenue;
// @desc    Get all venues
// @route   GET /api/admin/venues
// @access  Public (usually) or Private/Admin
const getVenues = async (req, res) => {
    try {
        const venues = await Venue_1.default.find().sort({ name: 1 });
        res.json(venues);
    }
    catch (error) {
        logger_1.default.error(`Get Venues Error: ${error.message}`);
        res.status(500).json({ message: "Server error getting venues" });
    }
};
exports.getVenues = getVenues;
// @desc    Update a venue
// @route   PUT /api/admin/venues/:id
// @access  Private/Admin
const updateVenue = async (req, res) => {
    try {
        const venue = await Venue_1.default.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!venue) {
            res.status(404).json({ message: "Venue not found" });
            return;
        }
        res.json(venue);
    }
    catch (error) {
        logger_1.default.error(`Update Venue Error: ${error.message}`);
        res.status(500).json({ message: "Server error updating venue" });
    }
};
exports.updateVenue = updateVenue;
// @desc    Delete a venue
// @route   DELETE /api/admin/venues/:id
// @access  Private/Admin
const deleteVenue = async (req, res) => {
    try {
        const venue = await Venue_1.default.findByIdAndDelete(req.params.id);
        if (!venue) {
            res.status(404).json({ message: "Venue not found" });
            return;
        }
        res.json({ message: "Venue deleted successfully" });
    }
    catch (error) {
        logger_1.default.error(`Delete Venue Error: ${error.message}`);
        res.status(500).json({ message: "Server error deleting venue" });
    }
};
exports.deleteVenue = deleteVenue;
// --- User Management ---
// @desc    Get all users
// @route   GET /api/admin/users
// @access  Private/Admin
const getAllUsers = async (req, res) => {
    try {
        const users = await User_1.default.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    }
    catch (error) {
        logger_1.default.error(`Get All Users Error: ${error.message}`);
        res.status(500).json({ message: "Server error getting users" });
    }
};
exports.getAllUsers = getAllUsers;
// @desc    Update user status (Suspend/Deactivate)
// @route   PUT /api/admin/users/:id/status
// @access  Private/Admin
const updateUserStatus = async (req, res) => {
    try {
        const { role, isApproved } = req.body;
        const user = await User_1.default.findById(req.params.id);
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }
        const oldRole = user.role;
        if (role)
            user.role = role;
        if (typeof isApproved === 'boolean')
            user.isApproved = isApproved;
        await user.save();
        await AdminLog_1.default.create({
            adminId: req.user.id,
            action: 'UPDATE_USER_STATUS',
            targetId: user._id.toString(),
            details: `Updated ${user.email}: Role ${oldRole}->${user.role}, Approved: ${user.isApproved}`
        });
        res.json({ message: "User status updated", user });
    }
    catch (error) {
        logger_1.default.error(`Update User Status Error: ${error.message}`);
        res.status(500).json({ message: "Server error updating user status" });
    }
};
exports.updateUserStatus = updateUserStatus;
// --- Session Monitoring ---
// @desc    Get all platform sessions
// @route   GET /api/admin/sessions
// @access  Private/Admin
const getAllSessions = async (req, res) => {
    try {
        const sessions = await Session_1.default.find()
            .populate('tutorId', 'name email')
            .populate('tuteeId', 'name email')
            .sort({ createdAt: -1 })
            .limit(200);
        res.json(sessions);
    }
    catch (error) {
        logger_1.default.error(`Get All Sessions Error: ${error.message}`);
        res.status(500).json({ message: "Server error getting sessions" });
    }
};
exports.getAllSessions = getAllSessions;
// @desc    Admin session override (Cancel/Release)
// @route   PUT /api/admin/sessions/:id/override
// @access  Private/Admin
const overrideSession = async (req, res) => {
    try {
        const { status, escrowStatus } = req.body;
        const session = await Session_1.default.findById(req.params.id);
        if (!session) {
            res.status(404).json({ message: "Session not found" });
            return;
        }
        if (status)
            session.status = status;
        if (escrowStatus)
            session.escrowStatus = escrowStatus;
        await session.save();
        await AdminLog_1.default.create({
            adminId: req.user.id,
            action: 'SESSION_OVERRIDE',
            targetId: session._id.toString(),
            details: `Manual override: Status->${status}, Escrow->${escrowStatus}`
        });
        res.json({ message: "Session updated by admin", session });
    }
    catch (error) {
        logger_1.default.error(`Session Override Error: ${error.message}`);
        res.status(500).json({ message: "Server error overriding session" });
    }
};
exports.overrideSession = overrideSession;
// --- Financial Monitoring ---
// @desc    Get platform financial overview
// @route   GET /api/admin/finances
// @access  Private/Admin
const getFinancialStats = async (req, res) => {
    try {
        const wallets = await Wallet_1.default.find();
        const totalWalletBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
        const heldEscrows = await Escrow_1.default.find({ status: 'held' });
        const totalEscrowBalance = heldEscrows.reduce((acc, e) => acc + e.amount, 0);
        // Transaction counts in last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentWalletActivity = wallets.reduce((acc, w) => {
            const recent = w.transactions.filter(t => new Date(t.date) > thirtyDaysAgo);
            return acc + recent.length;
        }, 0);
        const admin = await User_1.default.findOne({ role: 'admin' });
        let adminBalance = 0;
        if (admin) {
            const adminWallet = await Wallet_1.default.findOne({ userId: admin._id });
            adminBalance = adminWallet ? adminWallet.balance : 0;
        }
        res.json({
            totalWalletBalance,
            totalEscrowBalance,
            recentWalletActivity,
            adminBalance,
            platformFees: adminBalance, // Total revenue collected by admin so far
        });
    }
    catch (error) {
        logger_1.default.error(`Get Financial Stats Error: ${error.message}`);
        res.status(500).json({ message: "Server error getting finances" });
    }
};
exports.getFinancialStats = getFinancialStats;
// @desc    Reconcile Session escrowStatus with Escrow records
// @route   POST /api/admin/reconcile-escrow
// @access  Private/Admin
const reconcileEscrows = async (req, res) => {
    try {
        const sessions = await Session_1.default.find({ escrowStatus: { $ne: 'none' } });
        let fixedCount = 0;
        for (const session of sessions) {
            const escrow = await Escrow_1.default.findOne({ sessionId: session._id });
            if (escrow && session.escrowStatus !== escrow.status) {
                logger_1.default.info(`Reconciling session ${session._id}: ${session.escrowStatus} -> ${escrow.status}`);
                session.escrowStatus = escrow.status;
                await session.save();
                fixedCount++;
            }
        }
        await AdminLog_1.default.create({
            adminId: req.user.id,
            action: 'RECONCILE_ESCROW',
            details: `Manually reconciled ${fixedCount} session escrow statuses.`
        });
        res.json({ message: `Reconciliation complete. Fixed ${fixedCount} sessions.`, fixedCount });
    }
    catch (error) {
        logger_1.default.error(`Reconcile Escrow Error: ${error.message}`);
        res.status(500).json({ message: "Server error during reconciliation" });
    }
};
exports.reconcileEscrows = reconcileEscrows;
// --- Activity History ---
// @desc    Get admin activity logs
// @route   GET /api/admin/logs
// @access  Private/Admin
const getAdminLogs = async (req, res) => {
    try {
        const logs = await AdminLog_1.default.find()
            .populate('adminId', 'name email')
            .sort({ createdAt: -1 })
            .limit(100);
        res.json(logs);
    }
    catch (error) {
        logger_1.default.error(`Get Admin Logs Error: ${error.message}`);
        res.status(500).json({ message: "Server error getting admin logs" });
    }
};
exports.getAdminLogs = getAdminLogs;
// --- Automated Tutor Upgrade Logic ---
const checkTutorUpgrade = async (tutorId) => {
    try {
        const tutor = await User_1.default.findById(tutorId);
        if (!tutor || tutor.role === 'verified_tutor')
            return;
        const settings = await Settings_1.default.findOne() || await Settings_1.default.create({});
        if (tutor.sessionsCompleted >= settings.minSessionsForVerify &&
            tutor.averageRating >= settings.minRatingForVerify) {
            tutor.role = 'verified_tutor';
            await tutor.save();
            logger_1.default.info(`Tutor ${tutor.email} upgraded to Verified Status`);
        }
    }
    catch (error) {
        logger_1.default.error(`Tutor Upgrade Check Error: ${error.message}`);
    }
};
exports.checkTutorUpgrade = checkTutorUpgrade;
//# sourceMappingURL=adminController.js.map
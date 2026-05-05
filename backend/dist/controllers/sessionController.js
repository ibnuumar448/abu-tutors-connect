"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewSession = exports.lockSlot = exports.syncSession = exports.reportTuteeNoShow = exports.rescheduleSession = exports.cancelSession = exports.completeSession = exports.startSession = exports.getUserSessions = exports.createSession = void 0;
const Session_1 = __importDefault(require("../models/Session"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Escrow_1 = __importDefault(require("../models/Escrow"));
const logger_1 = __importDefault(require("../utils/logger"));
const socketManager_1 = require("../utils/socketManager");
const Settings_1 = __importDefault(require("../models/Settings"));
const adminController_1 = require("./adminController");
const SlotLock_1 = __importDefault(require("../models/SlotLock"));
// @desc    Book a new tutoring session
// @route   POST /api/sessions
// @access  Private (Tutee)
const createSession = async (req, res) => {
    try {
        const { tutorId, date, time, topic, amount, venue } = req.body;
        const tuteeId = req.user.id;
        // NEW: Block Tutors from booking other tutors
        if (req.user.role === 'tutor' || req.user.role === 'verified_tutor') {
            res.status(403).json({ message: 'Tutor accounts cannot book sessions. Please use a student account.' });
            return;
        }
        // 1. Verify Tutor exists
        const tutor = await User_1.default.findById(tutorId);
        if (!tutor || (tutor.role !== 'tutor' && tutor.role !== 'verified_tutor')) {
            res.status(404).json({ message: 'Tutor not found' });
            return;
        }
        // 1.5 Check if slot is in the past
        const bookingDate = new Date(`${date}T${time}`);
        if (bookingDate < new Date()) {
            res.status(400).json({ message: 'Cannot book a session for a time that has already passed' });
            return;
        }
        const slotTime = `${date}T${time}`;
        const existingSession = await Session_1.default.findOne({
            tutorId,
            date: new Date(date),
            time,
            status: { $in: ['pending', 'active'] } // 'completed' sessions should not block future bookings
        });
        if (existingSession) {
            res.status(400).json({ message: 'Tutor is already booked for this slot' });
            return;
        }
        const activeLock = await SlotLock_1.default.findOne({ tutorId, slot: slotTime });
        if (activeLock && activeLock.tuteeId.toString() !== tuteeId) {
            res.status(400).json({ message: 'This slot is temporarily locked by another student' });
            return;
        }
        // 2. Pricing Enforcement & Validation from System Settings
        const settings = await Settings_1.default.findOne() || await Settings_1.default.create({});
        let finalizedAmount = settings.defaultHourlyRate || 500;
        if (tutor.role === 'verified_tutor') {
            const requestedAmount = Number(amount);
            const tutorRate = tutor.hourlyRate || finalizedAmount;
            // Ensure the amount matches the tutor's set rate and is within admin threshold
            if (requestedAmount > settings.maxHourlyRate) {
                res.status(400).json({ message: `Amount exceeds the system maximum of ₦${settings.maxHourlyRate}/hr` });
                return;
            }
            if (requestedAmount !== tutorRate) {
                res.status(400).json({ message: `Amount must match tutor's hourly rate of ₦${tutorRate}` });
                return;
            }
            finalizedAmount = requestedAmount;
        }
        else {
            // Newbie tutors use the default system rate
            finalizedAmount = settings.defaultHourlyRate || 500;
        }
        // 3. Check Tutee Wallet Balance
        const tuteeWallet = await Wallet_1.default.findOne({ userId: tuteeId });
        if (!tuteeWallet || tuteeWallet.balance < finalizedAmount) {
            res.status(400).json({ message: 'Insufficient wallet balance' });
            return;
        }
        // 4. Create Session with status 'pending'
        const newSession = new Session_1.default({
            tutorId,
            tuteeId,
            date: new Date(date),
            time,
            topic,
            venue,
            amount: finalizedAmount,
            status: 'pending',
            escrowStatus: 'held', // Sync with Escrow record
            startQRCodeData: `start_${Math.random().toString(36).substring(7)}_${tuteeId}`,
            completionQRCodeData: `complete_${Math.random().toString(36).substring(7)}_${tuteeId}`,
            startPIN: Math.floor(100000 + Math.random() * 900000).toString(),
            completionPIN: Math.floor(100000 + Math.random() * 900000).toString()
        });
        // 5. Save Session and Deduct from Tutee Wallet -> Move to Escrow
        await newSession.save();
        tuteeWallet.balance -= finalizedAmount;
        tuteeWallet.transactions.push({
            type: 'debit',
            amount: finalizedAmount,
            description: `Escrow held for session with ${tutor.name}`,
            date: new Date(),
            reference: newSession._id.toString()
        });
        await tuteeWallet.save();
        // 6. Create Escrow Record
        await Escrow_1.default.create({
            tuteeId,
            tutorId,
            sessionId: newSession._id,
            amount: finalizedAmount,
            status: 'held'
        });
        // 7. Trigger Notification for Tutor (Renamed to NotificationModel)
        await Notification_1.default.create({
            userId: tutorId,
            title: 'New Session Booked',
            message: `You have a new session booking for "${topic}" on ${new Date(date).toLocaleDateString()}.`,
            type: 'session',
            link: '/tutor-dashboard'
        });
        // 7.5 Removed: Slots are no longer deleted from availability matrix to allow recurring weekly bookings.
        // Conflicts for the same specific date are already handled by the existingSession check above.
        // 8. Clear Lock if exists
        await SlotLock_1.default.deleteOne({ tutorId, slot: slotTime, tuteeId });
        logger_1.default.info(`Session booked: Tutee ${tuteeId} -> Tutor ${tutorId}`);
        res.status(201).json(newSession);
    }
    catch (error) {
        logger_1.default.error(`Create Session Error: ${error.message}`, { error });
        res.status(500).json({ message: 'Server error booking session', error: error.message });
    }
};
exports.createSession = createSession;
// @desc    Get all sessions for current user (with lazy cleanup)
// @route   GET /api/sessions
// @access  Private
const getUserSessions = async (req, res) => {
    try {
        const userId = req.user.id;
        // Lazy Cleanup of stale pending sessions (>15 mins past start)
        const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
        const staleSessions = await Session_1.default.find({
            status: 'pending',
            date: { $lte: new Date() },
            // This is tricky because 'time' is a string like "14:00".
            // For robust cleanup, we should compare the combined date-time.
        });
        for (const session of staleSessions) {
            const timeParts = session.time.split(':');
            const hours = parseInt(timeParts[0] || '0', 10);
            const mins = parseInt(timeParts[1] || '0', 10);
            const sessionStartTime = new Date(session.date);
            sessionStartTime.setHours(hours, mins, 0, 0);
            if (sessionStartTime < fifteenMinsAgo) {
                session.status = 'cancelled';
                session.escrowStatus = 'refunded';
                if (!session.venue)
                    session.venue = 'Not Specified';
                await session.save();
                // Refund Escrow
                const escrow = await Escrow_1.default.findOne({ sessionId: session._id, status: 'held' });
                if (escrow) {
                    const tuteeWallet = await Wallet_1.default.findOne({ userId: session.tuteeId });
                    if (tuteeWallet) {
                        tuteeWallet.balance += escrow.amount;
                        tuteeWallet.transactions.push({
                            type: 'credit',
                            amount: escrow.amount,
                            description: `Auto-refund for stale session: ${session.topic}`,
                            date: new Date()
                        });
                        await tuteeWallet.save();
                    }
                    escrow.status = 'refunded';
                    await escrow.save();
                    logger_1.default.info(`Auto-cancelled stale session ${session._id}`);
                }
            }
        }
        const sessions = await Session_1.default.find({
            $or: [{ tutorId: userId }, { tuteeId: userId }]
        })
            .populate('tutorId', 'name role department documents')
            .populate('tuteeId', 'name role department documents')
            .sort({ date: 1, time: 1 });
        res.json(sessions);
    }
    catch (error) {
        logger_1.default.error(`Get Sessions Error: ${error.message}`, { error });
        res.status(500).json({ message: 'Server error fetching sessions', error: error.message });
    }
};
exports.getUserSessions = getUserSessions;
// @desc    Start a session (Tutor scans Tutee QR)
// @route   POST /api/sessions/:id/start
// @access  Private (Tutor)
const startSession = async (req, res) => {
    try {
        const { id } = req.params;
        const tutorId = req.user.id;
        const { qrData, pin } = req.body;
        const session = await Session_1.default.findById(id);
        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }
        if (session.tutorId.toString() !== tutorId) {
            res.status(403).json({ message: 'Unauthorized: Only the assigned tutor can start this session' });
            return;
        }
        if (session.status !== 'pending') {
            res.status(400).json({ message: `Session already ${session.status}` });
            return;
        }
        // Verify QR Data OR PIN
        const isQRMatch = qrData && qrData === session.startQRCodeData;
        const isPinMatch = pin && pin === session.startPIN;
        if (!isQRMatch && !isPinMatch) {
            res.status(400).json({ message: 'Invalid Start QR Code or PIN' });
            return;
        }
        session.status = 'active';
        session.actualStartTime = new Date();
        await session.save();
        // Notify Tutee
        await Notification_1.default.create({
            userId: session.tuteeId,
            title: 'Session Started',
            message: `Your session for "${session.topic}" with ${req.user.name} has started.`,
            type: 'session',
            link: '/my-sessions'
        });
        // Emit Real-time Socket Event to Tutee
        (0, socketManager_1.emitSessionUpdate)(session.tuteeId.toString(), session);
        logger_1.default.info(`Session ${id} started at ${session.actualStartTime}`);
        res.json({ message: 'Session started successfully', session });
    }
    catch (error) {
        logger_1.default.error(`Start Session Error: ${error.message}`, { error });
        res.status(500).json({ message: 'Server error starting session' });
    }
};
exports.startSession = startSession;
// @desc    Complete a session (Tutor scans Tutee Completion QR)
// @route   POST /api/sessions/:id/complete
// @access  Private (Tutor)
const completeSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { qrData, pin, rating } = req.body;
        const session = await Session_1.default.findById(id);
        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }
        if (session.tutorId.toString() !== req.user.id) {
            res.status(403).json({ message: 'Unauthorized: Only the assigned tutor can finalize this session' });
            return;
        }
        if (session.status !== 'active') {
            res.status(400).json({ message: 'Session must be active to complete' });
            return;
        }
        // Verify QR Data OR PIN
        logger_1.default.info(`Complete Session Check: Received QR: ${qrData}, Expected QR: ${session.completionQRCodeData}`);
        const isQRMatch = qrData && qrData === session.completionQRCodeData;
        const isPinMatch = pin && pin === session.completionPIN;
        if (!isQRMatch && !isPinMatch) {
            res.status(400).json({ message: 'Invalid Completion QR Code or PIN' });
            return;
        }
        // 1. Update Session Status
        session.status = 'completed';
        session.escrowStatus = 'released';
        session.actualEndTime = new Date();
        await session.save();
        // 2. Release Escrow with 10% Commission
        const escrow = await Escrow_1.default.findOne({ sessionId: session._id, status: 'held' });
        if (escrow) {
            const settings = await Settings_1.default.findOne() || await Settings_1.default.create({});
            const commissionPercent = settings.platformCommissionPercent || 10;
            const commissionAmount = (escrow.amount * commissionPercent) / 100;
            const tutorEarnings = escrow.amount - commissionAmount;
            // 2a. Credit Tutor Wallet (90%)
            let tutorWallet = await Wallet_1.default.findOne({ userId: session.tutorId });
            if (!tutorWallet) {
                tutorWallet = new Wallet_1.default({ userId: session.tutorId, balance: 0, transactions: [] });
            }
            tutorWallet.balance += tutorEarnings;
            tutorWallet.transactions.push({
                type: 'credit',
                amount: tutorEarnings,
                description: `Earnings for session: ${session.topic}`,
                date: new Date(),
                reference: session._id.toString()
            });
            await tutorWallet.save();
            // 2b. Credit Admin Wallet (10%)
            const admin = await User_1.default.findOne({ role: 'admin' });
            if (admin) {
                let adminWallet = await Wallet_1.default.findOne({ userId: admin._id });
                if (!adminWallet)
                    adminWallet = await Wallet_1.default.create({ userId: admin._id, balance: 0, transactions: [] });
                adminWallet.balance += commissionAmount;
                adminWallet.transactions.push({
                    type: 'credit',
                    amount: commissionAmount,
                    description: `Commission from session: ${session.topic} (Tutor: ${session.tutorId})`,
                    date: new Date(),
                    reference: session._id.toString()
                });
                await adminWallet.save();
            }
            escrow.status = 'released';
            await escrow.save();
        }
        // 3. Increment Tutor Stats & Check for Upgrade
        if (rating) {
            const tutor = await User_1.default.findById(session.tutorId);
            if (tutor) {
                tutor.averageRating = ((tutor.averageRating * tutor.sessionsCompleted) + rating) / (tutor.sessionsCompleted + 1);
                tutor.sessionsCompleted += 1;
                await tutor.save();
                await (0, adminController_1.checkTutorUpgrade)(tutor._id.toString());
            }
        }
        else {
            await User_1.default.findByIdAndUpdate(session.tutorId, { $inc: { sessionsCompleted: 1 } });
            await (0, adminController_1.checkTutorUpgrade)(session.tutorId.toString());
        }
        // 4. Notifications
        await Notification_1.default.create({
            userId: session.tutorId,
            title: 'Payment Received',
            message: `Payment of ₦${session.amount} released for session on "${session.topic}".`,
            type: 'payment',
            link: '/wallet'
        });
        // Notify Tutee
        await Notification_1.default.create({
            userId: session.tuteeId,
            title: 'Session Completed',
            message: `Your session for "${session.topic}" has been finalized. Thank you for learning!`,
            type: 'session',
            link: '/my-sessions'
        });
        // Emit Real-time Socket Event to Tutee
        (0, socketManager_1.emitSessionUpdate)(session.tuteeId.toString(), session);
        logger_1.default.info(`Session ${id} completed and escrow released`);
        res.json({ message: 'Session completed and payment released', session });
    }
    catch (error) {
        logger_1.default.error(`Complete Session Error: ${error.message}`, { error });
        res.status(500).json({ message: 'Server error completing session' });
    }
};
exports.completeSession = completeSession;
// @desc    Cancel session (Tutor No-Show or Tutee request within 15m)
// @route   POST /api/sessions/:id/cancel
// @access  Private
const cancelSession = async (req, res) => {
    try {
        const { id } = req.params;
        const session = await Session_1.default.findById(id);
        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }
        if (session.status !== 'pending') {
            res.status(400).json({ message: 'Only pending sessions can be cancelled' });
            return;
        }
        // 1. Update Session Status
        session.status = 'cancelled';
        session.escrowStatus = 'refunded';
        await session.save();
        // 2. Resolve Escrow (Refund to Tutee)
        const escrow = await Escrow_1.default.findOne({ sessionId: session._id, status: 'held' });
        if (escrow) {
            let tuteeWallet = await Wallet_1.default.findOne({ userId: session.tuteeId });
            if (tuteeWallet) {
                tuteeWallet.balance += escrow.amount;
                tuteeWallet.transactions.push({
                    type: 'credit',
                    amount: escrow.amount,
                    description: `Refund for cancelled session: ${session.topic}`,
                    date: new Date(),
                    reference: session._id.toString()
                });
                await tuteeWallet.save();
            }
            escrow.status = 'refunded';
            await escrow.save();
        }
        // Notify both parties
        const initiatorId = req.user.id;
        const otherPartyId = session.tutorId.toString() === initiatorId ? session.tuteeId : session.tutorId;
        await Notification_1.default.create({
            userId: otherPartyId,
            title: 'Session Cancelled',
            message: `The session for "${session.topic}" has been cancelled. Any held funds have been refunded.`,
            type: 'session',
            link: '/my-sessions'
        });
        logger_1.default.info(`Session ${id} cancelled and refunded`);
        res.json({ message: 'Session cancelled and fully refunded', session });
    }
    catch (error) {
        logger_1.default.error(`Cancel Session Error: ${error.message}`);
        res.status(500).json({ message: 'Server error cancelling session' });
    }
};
exports.cancelSession = cancelSession;
// @desc    Reschedule session
// @route   POST /api/sessions/:id/reschedule
// @access  Private
const rescheduleSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { date, time } = req.body;
        const userId = req.user.id;
        if (!date || !time) {
            res.status(400).json({ message: 'New date and time are required' });
            return;
        }
        const session = await Session_1.default.findById(id);
        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }
        if (session.status !== 'pending') {
            res.status(400).json({ message: 'Only pending sessions can be rescheduled' });
            return;
        }
        // Verify user ownership
        if (session.tutorId.toString() !== userId && session.tuteeId.toString() !== userId) {
            res.status(403).json({ message: 'Unauthorized to reschedule this session' });
            return;
        }
        // Check for tutor availability
        const existingSession = await Session_1.default.findOne({
            tutorId: session.tutorId,
            date: new Date(date),
            time,
            status: { $in: ['pending', 'active', 'completed'] },
            _id: { $ne: session._id } // Exclude current session
        });
        if (existingSession) {
            res.status(400).json({ message: 'Tutor is already booked for this new slot' });
            return;
        }
        // Update session
        const oldDate = session.date;
        const oldTime = session.time;
        session.date = new Date(date);
        session.time = time;
        await session.save();
        // Notify the other party
        const otherPartyId = session.tutorId.toString() === userId ? session.tuteeId : session.tutorId;
        const initiatorName = req.user.name || 'The other party';
        await Notification_1.default.create({
            userId: otherPartyId,
            title: 'Session Rescheduled',
            message: `${initiatorName} has rescheduled your session for "${session.topic}" from ${new Date(oldDate).toLocaleDateString()} ${oldTime} to ${new Date(date).toLocaleDateString()} ${time}.`,
            type: 'session',
            link: '/my-sessions'
        });
        logger_1.default.info(`Session ${id} rescheduled to ${date} ${time} by ${userId}`);
        res.json({ message: 'Session rescheduled successfully', session });
    }
    catch (error) {
        logger_1.default.error(`Reschedule Session Error: ${error.message}`);
        res.status(500).json({ message: 'Server error rescheduling session' });
    }
};
exports.rescheduleSession = rescheduleSession;
// @desc    Report Tutee No-Show (Tutor receives percentage)
// @route   POST /api/sessions/:id/no-show
// @access  Private (Tutor)
const reportTuteeNoShow = async (req, res) => {
    try {
        const { id } = req.params;
        const tutorId = req.user.id;
        const session = await Session_1.default.findById(id);
        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }
        if (session.tutorId.toString() !== tutorId) {
            res.status(403).json({ message: 'Unauthorized' });
            return;
        }
        if (session.status !== 'pending') {
            res.status(400).json({ message: 'Can only report no-show for pending sessions' });
            return;
        }
        // 1. Update Session Status
        session.status = 'cancelled';
        session.escrowStatus = 'released';
        await session.save();
        // 2. Resolve Escrow with partial payout
        const escrow = await Escrow_1.default.findOne({ sessionId: session._id, status: 'held' });
        const settings = await Settings_1.default.findOne() || await Settings_1.default.create({});
        const payoutPercent = settings.noShowPayoutPercent || 30;
        if (escrow) {
            const settings = await Settings_1.default.findOne() || await Settings_1.default.create({});
            const payoutPercent = settings.noShowPayoutPercent || 30;
            const commissionPercent = settings.platformCommissionPercent || 10;
            const baseTutorPayout = (escrow.amount * payoutPercent) / 100;
            const commissionAmount = (baseTutorPayout * commissionPercent) / 100;
            const netTutorPayout = baseTutorPayout - commissionAmount;
            const tuteeRefund = escrow.amount - baseTutorPayout;
            // Credit Tutor (Net)
            let tutorWallet = await Wallet_1.default.findOne({ userId: session.tutorId });
            if (!tutorWallet)
                tutorWallet = new Wallet_1.default({ userId: session.tutorId, balance: 0 });
            tutorWallet.balance += netTutorPayout;
            tutorWallet.transactions.push({
                type: 'credit',
                amount: netTutorPayout,
                description: `No-show payout (${payoutPercent}%) for session: ${session.topic}`,
                date: new Date(),
                reference: session._id.toString()
            });
            await tutorWallet.save();
            // Credit Admin (Commission on no-show payout)
            const admin = await User_1.default.findOne({ role: 'admin' });
            if (admin) {
                let adminWallet = await Wallet_1.default.findOne({ userId: admin._id });
                if (!adminWallet)
                    adminWallet = await Wallet_1.default.create({ userId: admin._id, balance: 0 });
                adminWallet.balance += commissionAmount;
                adminWallet.transactions.push({
                    type: 'credit',
                    amount: commissionAmount,
                    description: `Commission from No-show: ${session.topic}`,
                    date: new Date(),
                    reference: session._id.toString()
                });
                await adminWallet.save();
            }
            // Refund Tutee
            let tuteeWallet = await Wallet_1.default.findOne({ userId: session.tuteeId });
            if (tuteeWallet) {
                tuteeWallet.balance += tuteeRefund;
                tuteeWallet.transactions.push({
                    type: 'credit',
                    amount: tuteeRefund,
                    description: `Partial refund for no-show session: ${session.topic}`,
                    date: new Date(),
                    reference: session._id.toString()
                });
                await tuteeWallet.save();
            }
            escrow.status = 'released';
            await escrow.save();
        }
        logger_1.default.info(`Tutee no-show reported for session ${id}.`);
        res.json({ message: 'Tutee no-show reported successfully', session });
    }
    catch (error) {
        logger_1.default.error(`No-Show Error: ${error.message}`);
        res.status(500).json({ message: 'Server error reporting no-show' });
    }
};
exports.reportTuteeNoShow = reportTuteeNoShow;
// @desc    Sync active session (Phase 4 Heartbeat)
// @route   POST /api/sessions/:id/sync
// @access  Private
const syncSession = async (req, res) => {
    try {
        const { id } = req.params;
        const { deviceTime } = req.body; // ISO String from client
        const session = await Session_1.default.findById(id);
        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }
        if (session.status !== 'active') {
            res.status(400).json({ message: 'Session is not active' });
            return;
        }
        const serverTime = new Date();
        const clientTime = new Date(deviceTime);
        const drift = Math.abs(serverTime.getTime() - clientTime.getTime());
        // Update last sync
        session.lastSyncTime = serverTime;
        await session.save();
        // 15 minute drift check as a warning (device clock issues)
        if (drift > 15 * 60 * 1000) {
            logger_1.default.warn(`Clock drift detected for session ${id}: ${drift / 1000}s`);
        }
        // Calculate theoretical end time (assuming 1 hour duration if not specified)
        // Note: We might want to add 'duration' to the Session model later
        const durationMs = 60 * 60 * 1000;
        const endTime = new Date(session.actualStartTime.getTime() + durationMs);
        const remainingMs = Math.max(0, endTime.getTime() - serverTime.getTime());
        res.json({
            status: 'active',
            serverTime: serverTime.toISOString(),
            remainingMs,
            isComplete: remainingMs <= 0
        });
    }
    catch (error) {
        logger_1.default.error(`Sync Session Error: ${error.message}`);
        res.status(500).json({ message: 'Server error syncing session' });
    }
};
exports.syncSession = syncSession;
// @desc    Lock a slot temporarily during selection (Phase 1)
// @route   POST /api/sessions/lock
// @access  Private (Tutee)
const lockSlot = async (req, res) => {
    try {
        const { tutorId, slot } = req.body; // slot as ISO string or unique time ID
        const tuteeId = req.user.id;
        // Check if already booked
        const [datePart, timePart] = slot.split('T');
        const existingSession = await Session_1.default.findOne({
            tutorId,
            date: new Date(datePart),
            time: timePart,
            status: { $in: ['pending', 'active', 'completed'] }
        });
        if (existingSession) {
            res.status(400).json({ message: 'Slot already booked' });
            return;
        }
        // Try to create lock
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minute lock
        try {
            await SlotLock_1.default.create({ tutorId, slot, tuteeId, expiresAt });
            res.json({ message: 'Slot locked for 5 minutes', expiresAt });
        }
        catch (err) {
            if (err.code === 11000) {
                res.status(400).json({ message: 'Slot is already locked by another user' });
            }
            else {
                throw err;
            }
        }
    }
    catch (error) {
        logger_1.default.error(`Lock Slot Error: ${error.message}`);
        res.status(500).json({ message: 'Server error locking slot' });
    }
};
exports.lockSlot = lockSlot;
// @desc    Submit a review for a completed session (Tutee -> Tutor)
// @route   POST /api/sessions/:id/review
// @access  Private (Tutee)
const reviewSession = async (req, res) => {
    try {
        const { rating, reviewText } = req.body;
        const sessionId = req.params.id;
        const tuteeId = req.user.id;
        if (!rating || rating < 1 || rating > 5) {
            res.status(400).json({ message: 'Rating must be between 1 and 5' });
            return;
        }
        const session = await Session_1.default.findById(sessionId);
        if (!session) {
            res.status(404).json({ message: 'Session not found' });
            return;
        }
        if (session.status !== 'completed') {
            res.status(400).json({ message: 'Can only review completed sessions' });
            return;
        }
        if (session.tuteeId.toString() !== tuteeId) {
            res.status(403).json({ message: 'Only the tutee can review the tutor for this session' });
            return;
        }
        if (session.tuteeRating) {
            res.status(400).json({ message: 'Session already reviewed' });
            return;
        }
        // Save review
        session.tuteeRating = rating;
        session.tuteeReview = reviewText || '';
        await session.save();
        // Recalculate Tutor's Average Rating
        const tutorId = session.tutorId;
        const allTutorSessions = await Session_1.default.find({
            tutorId,
            status: 'completed',
            tuteeRating: { $exists: true, $ne: null }
        });
        let newAverage = 0;
        if (allTutorSessions.length > 0) {
            const sum = allTutorSessions.reduce((acc, curr) => acc + (curr.tuteeRating || 0), 0);
            newAverage = Number((sum / allTutorSessions.length).toFixed(1));
        }
        // Update Tutor and check auto-verification
        const tutor = await User_1.default.findById(tutorId);
        if (tutor) {
            tutor.averageRating = newAverage;
            // Auto-verify if they have 5+ reviews and average >= 4.0
            if (tutor.role === 'tutor' && allTutorSessions.length >= 5 && newAverage >= 4.0) {
                tutor.role = 'verified_tutor';
                logger_1.default.info(`Tutor ${tutor.email} auto-verified after reaching ${allTutorSessions.length} ratings averaging ${newAverage}.`);
                await Notification_1.default.create({
                    userId: tutorId,
                    title: '🎉 Congratulations! You are Verified!',
                    message: `You achieved an average rating of ${newAverage} across ${allTutorSessions.length} sessions and have been upgraded to Verified Tutor!`,
                    type: 'system'
                });
            }
            await tutor.save();
        }
        res.json({ message: 'Review submitted successfully', session });
    }
    catch (error) {
        logger_1.default.error(`Review Session Error: ${error.message}`);
        res.status(500).json({ message: 'Server error submitting review' });
    }
};
exports.reviewSession = reviewSession;
//# sourceMappingURL=sessionController.js.map
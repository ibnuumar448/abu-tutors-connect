"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawFunds = exports.payRegistrationFromWallet = exports.handleWebhook = exports.verifyPayment = exports.initializePayment = exports.setTransactionPin = exports.getWallet = void 0;
const Wallet_1 = __importDefault(require("../models/Wallet"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const Settings_1 = __importDefault(require("../models/Settings"));
const logger_1 = __importDefault(require("../utils/logger"));
const axios_1 = __importDefault(require("axios"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
// @desc    Get user wallet and transaction history
// @route   GET /api/wallets
// @access  Private
const getWallet = async (req, res) => {
    try {
        let wallet = await Wallet_1.default.findOne({ userId: req.user.id });
        if (!wallet) {
            wallet = await Wallet_1.default.create({ userId: req.user.id, balance: 0, transactions: [] });
        }
        res.json(wallet);
    }
    catch (error) {
        logger_1.default.error(`Get Wallet Error: ${error.message}`);
        res.status(500).json({ message: 'Server error fetching wallet' });
    }
};
exports.getWallet = getWallet;
// @desc    Set or Update Transaction PIN
// @route   POST /api/wallets/set-pin
// @access  Private
const setTransactionPin = async (req, res) => {
    try {
        const { pin, currentPassword } = req.body;
        if (!pin || pin.length < 4) {
            res.status(400).json({ message: 'PIN must be at least 4 digits' });
            return;
        }
        const user = await User_1.default.findById(req.user.id);
        if (!user) {
            res.status(404).json({ message: 'User not found' });
            return;
        }
        // Verify password before setting PIN for security if changing an existing PIN
        if (user.transactionPin) {
            if (!currentPassword) {
                res.status(400).json({ message: 'Current password required to change PIN' });
                return;
            }
            if (!user.password) {
                res.status(400).json({ message: 'User account has no password' });
                return;
            }
            const isMatch = await bcryptjs_1.default.compare(currentPassword, user.password);
            if (!isMatch) {
                res.status(401).json({ message: 'Incorrect password' });
                return;
            }
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        user.transactionPin = await bcryptjs_1.default.hash(pin, salt);
        await user.save();
        res.json({ message: 'Transaction PIN set successfully' });
    }
    catch (error) {
        logger_1.default.error(`Set PIN Error: ${error.message}`);
        res.status(500).json({ message: 'Server error setting PIN' });
    }
};
exports.setTransactionPin = setTransactionPin;
// @desc    Initialize Paystack Payment
// @route   POST /api/wallets/initialize
// @access  Private
const initializePayment = async (req, res) => {
    try {
        const { amount } = req.body;
        const user = await User_1.default.findById(req.user.id);
        if (!user || !amount || amount <= 0) {
            res.status(400).json({ message: 'Valid amount and user required' });
            return;
        }
        const response = await axios_1.default.post('https://api.paystack.co/transaction/initialize', {
            email: user.email,
            amount: Math.round(amount * 100), // Kobo
            callback_url: `${process.env.FRONTEND_URL}/wallet/verify`,
            metadata: { userId: user._id }
        }, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        });
        res.json(response.data.data);
    }
    catch (error) {
        const errorMsg = error.response?.data?.message || error.message;
        logger_1.default.error(`Paystack Init Error: ${errorMsg}`, {
            data: error.response?.data,
            status: error.response?.status
        });
        res.status(500).json({ message: 'Failed to initialize payment', error: errorMsg });
    }
};
exports.initializePayment = initializePayment;
// @desc    Verify Paystack Payment
// @route   GET /api/wallets/verify
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { reference } = req.query;
        if (!reference) {
            res.status(400).json({ message: 'Reference is required' });
            return;
        }
        const response = await axios_1.default.get(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        });
        const { status, amount, metadata } = response.data.data;
        if (status === 'success') {
            const actualAmount = amount / 100;
            const userId = metadata.userId;
            let wallet = await Wallet_1.default.findOne({ userId });
            if (!wallet)
                wallet = new Wallet_1.default({ userId, balance: 0, transactions: [] });
            const alreadyProcessed = wallet.transactions.some(tx => tx.reference === reference);
            if (!alreadyProcessed) {
                wallet.balance += actualAmount;
                wallet.transactions.push({
                    type: 'credit',
                    amount: actualAmount,
                    description: 'Wallet funding (Paystack)',
                    date: new Date(),
                    reference: reference
                });
                await wallet.save();
                // Notify User
                await Notification_1.default.create({
                    userId,
                    title: 'Payment Confirmed',
                    message: `Your wallet has been credited with ₦${actualAmount}.`,
                    type: 'payment',
                    link: '/wallet'
                });
            }
            res.json({ message: 'Payment verified and wallet credited', balance: wallet.balance });
        }
        else {
            res.status(400).json({ message: 'Payment verification failed', status });
        }
    }
    catch (error) {
        logger_1.default.error(`Paystack Verify Error: ${error.message}`);
        res.status(500).json({ message: 'Server error verifying payment' });
    }
};
exports.verifyPayment = verifyPayment;
// @desc    Paystack Webhook Handler
// @route   POST /api/wallets/webhook
// @access  Public
const handleWebhook = async (req, res) => {
    try {
        const event = req.body;
        // Verify Paystack signature here in production for security!
        if (event && event.event === 'charge.success') {
            const { reference, amount, metadata } = event.data;
            const userId = metadata.userId;
            let wallet = await Wallet_1.default.findOne({ userId });
            if (wallet) {
                const alreadyProcessed = wallet.transactions.some(tx => tx.reference === reference);
                if (!alreadyProcessed) {
                    wallet.balance += (amount / 100);
                    wallet.transactions.push({
                        type: 'credit',
                        amount: (amount / 100),
                        description: 'Wallet funding (Paystack)',
                        date: new Date(),
                        reference
                    });
                    await wallet.save();
                    // Notify User
                    await Notification_1.default.create({
                        userId,
                        title: 'Payment Received (Webhook)',
                        message: `Your wallet has been credited with ₦${amount / 100} via Paystack.`,
                        type: 'payment',
                        link: '/wallet'
                    });
                    logger_1.default.info(`Webhook: Credited ${userId} with ${amount / 100}`);
                }
            }
        }
        res.status(200).send('Webhook Received');
    }
    catch (error) {
        logger_1.default.error(`Webhook Error: ${error.message}`);
        res.status(500).send('Webhook Processing Error');
    }
};
exports.handleWebhook = handleWebhook;
// @desc    Pay tutor registration fee from wallet
// @route   POST /api/wallets/pay-registration
// @access  Private (Tutor)
const payRegistrationFromWallet = async (req, res) => {
    try {
        const user = await User_1.default.findById(req.user.id);
        if (!user || user.role !== 'tutor') {
            res.status(400).json({ message: 'Only tutors pay registration fees' });
            return;
        }
        const settings = await Settings_1.default.findOne() || await Settings_1.default.create({});
        const isFree = !!settings.isRegistrationFree;
        const fee = isFree ? 0 : (settings.registrationFee || 5000);
        logger_1.default.info(`Processing registration payment for user ${req.user.id}. isFree: ${isFree}, Fee: ${fee}`);
        const wallet = await Wallet_1.default.findOne({ userId: req.user.id });
        if (!isFree) {
            if (!wallet || wallet.balance < fee) {
                res.status(400).json({ message: 'Insufficient wallet balance' });
                return;
            }
            // 1. Deduct from Tutor
            if (fee > 0) {
                wallet.balance -= fee;
                wallet.transactions.push({
                    type: 'debit',
                    amount: fee,
                    description: 'Tutor Registration Fee',
                    date: new Date()
                });
                await wallet.save();
                // 2. Credit Admin Wallet
                const admin = await User_1.default.findOne({ role: 'admin' });
                if (admin) {
                    let adminWallet = await Wallet_1.default.findOne({ userId: admin._id });
                    if (!adminWallet)
                        adminWallet = await Wallet_1.default.create({ userId: admin._id, balance: 0, transactions: [] });
                    adminWallet.balance += fee;
                    adminWallet.transactions.push({
                        type: 'credit',
                        amount: fee,
                        description: `Registration Fee from ${user.name}`,
                        date: new Date(),
                        reference: user._id.toString()
                    });
                    await adminWallet.save();
                }
            }
        }
        // 3. Update User Status
        user.registrationPaymentStatus = 'completed';
        user.isProfileComplete = true;
        user.profileStep = 4;
        await user.save();
        // Notify User
        await Notification_1.default.create({
            userId: user._id,
            title: 'Registration Successful',
            message: 'Your tutor registration is complete. You can now set your availability and receive bookings.',
            type: 'session',
            link: '/tutor-dashboard'
        });
        res.json({
            message: 'Registration fee paid successfully',
            balance: wallet ? wallet.balance : 0
        });
    }
    catch (error) {
        logger_1.default.error(`Registration Payment Error: ${error.message}`);
        res.status(500).json({ message: 'Server error paying registration fee' });
    }
};
exports.payRegistrationFromWallet = payRegistrationFromWallet;
// @desc    Withdraw funds from wallet (Tutors & Admins)
// @route   POST /api/wallets/withdraw
// @access  Private
const withdrawFunds = async (req, res) => {
    try {
        const { amount, pin } = req.body;
        if (!amount || amount <= 0 || !pin) {
            res.status(400).json({ message: 'Amount and Transaction PIN are required' });
            return;
        }
        const user = await User_1.default.findById(req.user.id);
        if (!user || !user.transactionPin) {
            res.status(400).json({ message: 'Please set a transaction PIN first' });
            return;
        }
        // 1. Verify Transaction PIN
        const isPinValid = await bcryptjs_1.default.compare(pin, user.transactionPin);
        if (!isPinValid) {
            res.status(401).json({ message: 'Invalid Transaction PIN' });
            return;
        }
        const wallet = await Wallet_1.default.findOne({ userId: req.user.id });
        if (!wallet || wallet.balance < amount) {
            res.status(400).json({ message: 'Insufficient balance' });
            return;
        }
        if (!user.bankDetails?.accountNumber || !user.bankDetails?.bankCode) {
            res.status(400).json({ message: 'Please update your bank details in profile first' });
            return;
        }
        // 2. Paystack Transfer Flow
        // 2a. Create Transfer Recipient if needed
        let recipientCode = user.bankDetails.recipientCode;
        if (!recipientCode) {
            try {
                const recipientRes = await axios_1.default.post('https://api.paystack.co/transferrecipient', {
                    type: "nuban",
                    name: user.name,
                    account_number: user.bankDetails.accountNumber,
                    bank_code: user.bankDetails.bankCode,
                    currency: "NGN"
                }, {
                    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
                });
                recipientCode = recipientRes.data.data.recipient_code;
                if (recipientCode) {
                    user.bankDetails.recipientCode = recipientCode;
                    await user.save();
                }
                else {
                    throw new Error('Failed to get recipient code from Paystack');
                }
            }
            catch (err) {
                logger_1.default.error(`Recipient Creation Error: ${err.message}`);
                res.status(400).json({ message: 'Failed to create transfer recipient. Check bank details.' });
                return;
            }
        }
        // 2b. Initiate Transfer
        try {
            const transferRes = await axios_1.default.post('https://api.paystack.co/transfer', {
                source: "balance",
                amount: Math.round(amount * 100),
                recipient: recipientCode,
                reason: `Withdrawal from ABUTutorsConnect`
            }, {
                headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
            });
            if (transferRes.data.status) {
                // 3. Update Wallet Balance
                wallet.balance -= amount;
                wallet.transactions.push({
                    type: 'debit',
                    amount,
                    description: `Withdrawal to ${user.bankDetails.bankName}`,
                    date: new Date(),
                    reference: transferRes.data.data.transfer_code
                });
                await wallet.save();
                // Notify User
                await Notification_1.default.create({
                    userId: user._id,
                    title: 'Withdrawal Initiated',
                    message: `A withdrawal of ₦${amount} to your ${user.bankDetails.bankName} account has been initiated.`,
                    type: 'payment',
                    link: '/wallet'
                });
                res.json({ message: 'Withdrawal initiated successfully', balance: wallet.balance });
            }
            else {
                throw new Error('Paystack transfer failed');
            }
        }
        catch (err) {
            const errorMsg = err.response?.data?.message || err.message;
            logger_1.default.error(`Paystack Transfer Error: ${errorMsg}`, {
                data: err.response?.data,
                status: err.response?.status
            });
            // DEVELOPMENT MOCK FALLBACK
            // If Paystack fails (especially "starter business" error) during testing, 
            // we simulate a success so the user can test the UI flow.
            if (process.env.NODE_ENV !== 'production' || PAYSTACK_SECRET.startsWith('sk_test')) {
                logger_1.default.warn(`[MOCK WITHDRAWAL] Simulating success for dev testing.`);
                // 3. Update Wallet Balance (Mock)
                wallet.balance -= amount;
                wallet.transactions.push({
                    type: 'debit',
                    amount,
                    description: `[MOCK] Withdrawal to ${user.bankDetails.bankName}`,
                    date: new Date(),
                    reference: `MOCK_TRX_${Date.now()}`
                });
                await wallet.save();
                // Notify User
                await Notification_1.default.create({
                    userId: user._id,
                    title: 'Withdrawal Initiated (MOCK)',
                    message: `[TESTING ONLY] A mock withdrawal of ₦${amount} to your ${user.bankDetails.bankName} account has been recorded.`,
                    type: 'payment',
                    link: '/wallet'
                });
                res.json({
                    message: 'Withdrawal initiated successfully (MOCK MODE ACTIVE)',
                    balance: wallet.balance,
                    isMock: true
                });
                return;
            }
            res.status(500).json({
                message: 'Failed to initiate transfer via Paystack',
                error: errorMsg
            });
        }
    }
    catch (error) {
        logger_1.default.error(`Withdrawal Error: ${error.message}`);
        res.status(500).json({ message: 'Server error processing withdrawal' });
    }
};
exports.withdrawFunds = withdrawFunds;
//# sourceMappingURL=walletController.js.map
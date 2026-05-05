"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resetPassword = exports.forgotPassword = exports.login = exports.register = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const User_1 = __importDefault(require("../models/User"));
const Wallet_1 = __importDefault(require("../models/Wallet"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const logger_1 = __importDefault(require("../utils/logger"));
const crypto_1 = __importDefault(require("crypto"));
const emailService_1 = require("../utils/emailService");
const cloudinaryHelper_1 = require("../utils/cloudinaryHelper");
const JWT_SECRET = process.env.JWT_SECRET || "fallback_secret_for_development";
const validatePassword = (password) => {
    if (password.length < 8) {
        return { isValid: false, message: "Password must be at least 8 characters long." };
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    if (!hasLetter || !hasNumber || !hasSpecial) {
        return { isValid: false, message: "Password must contain at least one letter, one number, and one special character." };
    }
    return { isValid: true };
};
const register = async (req, res) => {
    try {
        const { name, email, password, role, faculty, department, // tutee + tutor
        level, registrationNumber, admissionId, courses, about, gender, phone, // tutor only
        acceptedTerms } = req.body || {};
        const finalizedRegNum = (registrationNumber || admissionId)?.toString().trim().toUpperCase();
        // Handle boolean parsing from FormData (sent as strings)
        const isTermsAccepted = acceptedTerms === 'true' || acceptedTerms === true;
        if (!isTermsAccepted) {
            res.status(400).json({ message: "You must accept the Terms and Conditions to register." });
            return;
        }
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.isValid) {
            res.status(400).json({ message: passwordCheck.message });
            return;
        }
        // Extract profile picture from multer file if provided
        let profilePicturePath = '';
        if (req.file) {
            profilePicturePath = await (0, cloudinaryHelper_1.uploadToCloudinary)(req.file.path, 'profiles');
        }
        // Optional: Validate ABU registration number regex
        if (role === 'tutor' || role === 'verified_tutor') {
            const regNumRegex = /^U\d{2}[A-Z]{2}\d{4}$/; // e.g., U21CO1015
            if (finalizedRegNum && !regNumRegex.test(finalizedRegNum)) {
                res.status(400).json({ message: "Invalid ABU Registration Number format. Expected format: U21COxxxx" });
                return;
            }
        }
        const existingEmail = await User_1.default.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            res.status(400).json({ message: "User already exists with that email" });
            return;
        }
        if (finalizedRegNum) {
            const existingRegNum = await User_1.default.findOne({ registrationNumber: finalizedRegNum });
            if (existingRegNum) {
                res.status(400).json({ message: "A user with this Registration Number already exists" });
                return;
            }
        }
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash(password, salt);
        // Check global settings for registration fee status
        const Settings = mongoose_1.default.model('Settings');
        const settings = await Settings.findOne();
        const isFree = settings?.isRegistrationFree || false;
        // Sanitize role: Only 'tutee' or 'tutor' allowed during public registration
        const allowedRoles = ['tutee', 'tutor'];
        const sanitizedRole = allowedRoles.includes(role) ? role : 'tutee';
        const user = new User_1.default({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: sanitizedRole,
            registrationNumber: finalizedRegNum,
            faculty,
            department,
            level,
            courses,
            about,
            gender,
            phone,
            acceptedTerms: isTermsAccepted,
            profileStep: (role === 'tutee') ? 4 : 0, // Tutees finish immediately, Tutors start at 0
            isProfileComplete: (role === 'tutee'), // Tutees complete after registration
            isApproved: (role === 'tutee'), // Tutees don't need admin approval
            registrationPaymentStatus: (role === 'tutee' || role === 'admin' || isFree) ? 'free' : 'pending',
            documents: {
                profilePicture: profilePicturePath
            }
        });
        await user.save();
        // Ensure wallet is created immediately
        await Wallet_1.default.create({ userId: user._id, balance: 0, transactions: [] });
        // Auto-login upon registration
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        const userRes = user.toObject();
        delete userRes.password;
        logger_1.default.info(`User registered successfully: ${email}`);
        res.status(201).json({
            message: "User registered successfully",
            token,
            user: userRes
        });
    }
    catch (error) {
        // Handle MongoDB duplicate key error (11000)
        if (error.code === 11000 || error.code === '11000' || error.message.includes('E11000')) {
            let message = 'User already exists';
            if (error.message.includes('registrationNumber') || (error.keyPattern && error.keyPattern.registrationNumber)) {
                message = 'Registration Number already exists';
            }
            else if (error.message.includes('email') || (error.keyPattern && error.keyPattern.email)) {
                message = 'Email already exists';
            }
            res.status(400).json({ message });
            return;
        }
        logger_1.default.error(`Register Error: ${error.message}`, { error });
        res.status(500).json({ message: "Server error during registration", error: error.message });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email: email.toLowerCase() });
        if (!user || user.password === undefined) {
            logger_1.default.warn(`Failed login attempt: User not found or no password - ${email}`);
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        const isMatch = await bcryptjs_1.default.compare(password, user.password);
        if (!isMatch) {
            logger_1.default.warn(`Failed login attempt: Incorrect password for ${email}`);
            res.status(400).json({ message: "Invalid credentials" });
            return;
        }
        const token = jsonwebtoken_1.default.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
        const userRes = user.toObject();
        delete userRes.password;
        logger_1.default.info(`Login successful: ${email}`);
        res.status(200).json({
            message: "Login successful",
            token,
            user: userRes
        });
    }
    catch (error) {
        logger_1.default.error(`Login Error: ${error.message}`, { error });
        res.status(500).json({ message: "Server error during login", error: error.message });
    }
};
exports.login = login;
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            res.status(404).json({ message: "No user found with that email" });
            return;
        }
        // Generate reset token
        const resetToken = crypto_1.default.randomBytes(20).toString('hex');
        // Hash and set to resetPasswordToken field
        user.resetPasswordToken = crypto_1.default
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        // Set expire time (e.g., 10 minutes)
        user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
        await user.save();
        // Create reset URL
        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
        const message = `You are receiving this email because you (or someone else) has requested the reset of a password. Please make a POST request to: \n\n ${resetUrl}`;
        try {
            await (0, emailService_1.sendEmail)({
                email: user.email,
                subject: 'Password Reset Token',
                message,
                html: `
                    <h1>You requested a password reset</h1>
                    <p>Please click on the link below to reset your password. This link is valid for 10 minutes.</p>
                    <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
                `
            });
            res.status(200).json({ message: "Email sent" });
        }
        catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            res.status(500).json({ message: "Email could not be sent" });
        }
    }
    catch (error) {
        logger_1.default.error(`Forgot Password Error: ${error.message}`);
        res.status(500).json({ message: "Server error during forgot password" });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        // Get hashed token
        const resetPasswordToken = crypto_1.default
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');
        const user = await User_1.default.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });
        if (!user) {
            res.status(400).json({ message: "Invalid or expired token" });
            return;
        }
        const { password } = req.body;
        const passwordCheck = validatePassword(password);
        if (!passwordCheck.isValid) {
            res.status(400).json({ message: passwordCheck.message });
            return;
        }
        // Set new password
        const salt = await bcryptjs_1.default.genSalt(10);
        user.password = await bcryptjs_1.default.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        await user.save();
        logger_1.default.info(`Password reset successful for user: ${user.email}`);
        res.status(200).json({ message: "Password reset successful" });
    }
    catch (error) {
        logger_1.default.error(`Reset Password Error: ${error.message}`);
        res.status(500).json({ message: "Server error during password reset" });
    }
};
exports.resetPassword = resetPassword;
//# sourceMappingURL=authController.js.map
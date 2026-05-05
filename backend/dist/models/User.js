"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: mongoose_1.Schema.Types.Mixed, required: true },
    role: { type: String, enum: ['tutee', 'tutor', 'verified_tutor', 'admin'], default: 'tutee' },
    registrationNumber: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    faculty: { type: String },
    department: { type: String },
    acceptedTerms: { type: Boolean, required: true, default: false },
    profileStep: { type: Number, default: 0 },
    // Tutor specific fields
    level: { type: String },
    teachingLevel: { type: String },
    courses: [{ type: String }],
    areaOfStrength: { type: String },
    matchingBio: { type: String, default: "" },
    phone: { type: String },
    // Profile verification
    isProfileComplete: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: false },
    registrationPaymentStatus: { type: String, enum: ['pending', 'completed', 'free'], default: 'pending' },
    applicationStatus: { type: String, enum: ['pending', 'approved', 'rejected', 'needs_revision'], default: 'pending' },
    adminFeedback: { type: String },
    courseApplications: [{
            courses: [{ type: String }],
            transcript: { type: String },
            status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
            adminFeedback: { type: String },
            createdAt: { type: Date, default: Date.now }
        }],
    documents: {
        admissionLetter: { type: String },
        transcript: { type: String },
        profilePicture: { type: String }
    },
    // Rating and session stats
    sessionsCompleted: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 500 },
    averageRating: { type: Number, default: 0 },
    availability: [{ type: Object }], // e.g. [{ day: "Monday", slots: ["14:00-16:00"] }]
    about: { type: String },
    gender: { type: String },
    notificationPreferences: {
        sessionReminders: { type: Boolean, default: true },
        newMessages: { type: Boolean, default: true },
        bookingRequests: { type: Boolean, default: true },
        paymentNotifications: { type: Boolean, default: true }
    },
    bankDetails: {
        bankName: { type: String },
        bankCode: { type: String },
        accountNumber: { type: String },
        accountName: { type: String },
        recipientCode: { type: String }
    },
    transactionPin: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpire: { type: Date }
}, { timestamps: true });
exports.default = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map
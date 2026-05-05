import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
    name: string;
    email: string;
    password?: string;
    role: 'tutee' | 'tutor' | 'verified_tutor' | 'admin';
    registrationNumber: string;
    faculty?: string;
    department?: string;
    acceptedTerms: boolean;
    profileStep: number;
    level?: string;
    teachingLevel?: string;
    courses?: string[];
    areaOfStrength?: string;
    matchingBio?: string;
    phone?: string;
    isProfileComplete: boolean;
    isApproved: boolean;
    registrationPaymentStatus: 'pending' | 'completed' | 'free';
    applicationStatus: 'pending' | 'approved' | 'rejected' | 'needs_revision';
    adminFeedback?: string;
    courseApplications?: Array<{
        _id?: any;
        courses: string[];
        transcript: string;
        status: 'pending' | 'approved' | 'rejected';
        adminFeedback?: string;
        createdAt: Date;
    }>;
    documents?: {
        admissionLetter: string;
        transcript: string;
        profilePicture: string;
    };
    sessionsCompleted: number;
    hourlyRate: number;
    averageRating: number;
    availability?: any[];
    about?: string;
    gender?: string;
    notificationPreferences?: {
        sessionReminders: boolean;
        newMessages: boolean;
        bookingRequests: boolean;
        paymentNotifications: boolean;
    };
    bankDetails?: {
        bankName: string;
        bankCode: string;
        accountNumber: string;
        accountName: string;
        recipientCode?: string;
    };
    transactionPin?: string;
    resetPasswordToken?: string | undefined;
    resetPasswordExpire?: Date | undefined;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default _default;
//# sourceMappingURL=User.d.ts.map
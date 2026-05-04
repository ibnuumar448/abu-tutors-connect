import mongoose from 'mongoose';
import Session from './src/models/Session';
import User from './src/models/User';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI as string).then(async () => {
    // 1. Fix old sessions
    const sessions = await Session.find({ $or: [{ completionQRCodeData: { $exists: false } }, { completionQRCodeData: null }] });
    for(let s of sessions) {
        s.startQRCodeData = s.startQRCodeData || Math.random().toString(36).substring(2, 15);
        s.completionQRCodeData = Math.random().toString(36).substring(2, 15);
        s.startPIN = s.startPIN || Math.floor(100000 + Math.random() * 900000).toString();
        s.completionPIN = Math.floor(100000 + Math.random() * 900000).toString();
        await s.save();
    }
    console.log('Updated ' + sessions.length + ' old sessions with QR/PIN data.');

    // 2. Delete availability matrices for current tutors
    const res = await User.updateMany(
        { role: { $in: ['tutor', 'verified_tutor'] } },
        { $set: { availability: [] } }
    );
    console.log(`Deleted availability matrices for ${res.modifiedCount} tutors.`);
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});

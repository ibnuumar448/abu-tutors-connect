"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const User_1 = __importDefault(require("./models/User"));
const Session_1 = __importDefault(require("./models/Session"));
const Escrow_1 = __importDefault(require("./models/Escrow"));
const Wallet_1 = __importDefault(require("./models/Wallet"));
const AdminLog_1 = __importDefault(require("./models/AdminLog"));
const Notification_1 = __importDefault(require("./models/Notification"));
const SlotLock_1 = __importDefault(require("./models/SlotLock"));
const Message_1 = __importDefault(require("./models/Message"));
dotenv_1.default.config();
const RESET_PASSWORD = process.env.RESET_PASSWORD || 'ABUTutorsReset2026';
async function resetSystem() {
    try {
        const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/abututors";
        console.log('--- SYSTEM RESET INITIATED ---');
        console.log('Connecting to database...');
        await mongoose_1.default.connect(MONGODB_URI);
        // 1. Delete all non-admin users
        console.log('Deleting non-admin users...');
        const userDeleteResult = await User_1.default.deleteMany({ role: { $ne: 'admin' } });
        console.log(`Deleted ${userDeleteResult.deletedCount} users.`);
        // 2. Clear all sessions and escrows
        console.log('Clearing sessions, escrows, and wallets...');
        await Session_1.default.deleteMany({});
        await Escrow_1.default.deleteMany({});
        await Wallet_1.default.deleteMany({}); // Wallets for deleted users are gone anyway, but good to clear all
        await SlotLock_1.default.deleteMany({});
        console.log('Cleared all transactional data.');
        // 3. Clear admin activities (but keep admin users)
        console.log('Clearing admin activity logs...');
        await AdminLog_1.default.deleteMany({});
        console.log('Cleared all admin activity logs.');
        // 4. Clear notifications and messages
        console.log('Clearing all notifications and messages...');
        await Notification_1.default.deleteMany({});
        await Message_1.default.deleteMany({});
        console.log('Cleared all notifications and messages.');
        // 5. Cleanup uploads directory
        console.log('Cleaning up uploaded documents...');
        const uploadsDir = path_1.default.join(__dirname, '../uploads');
        if (fs_1.default.existsSync(uploadsDir)) {
            const files = fs_1.default.readdirSync(uploadsDir);
            for (const file of files) {
                if (file !== '.gitkeep') {
                    fs_1.default.unlinkSync(path_1.default.join(uploadsDir, file));
                }
            }
            console.log('Cleaned up uploads directory.');
        }
        console.log('\n--- SYSTEM RESET COMPLETE ---');
        console.log('Admin accounts preserved. All other data purged.');
        await mongoose_1.default.connection.close();
        process.exit(0);
    }
    catch (error) {
        console.error('CRITICAL ERROR DURING RESET:', error.message);
        process.exit(1);
    }
}
// Security Check: Only run if manually triggered or with environment flag
if (process.argv.includes('--confirm-reset')) {
    resetSystem();
}
else {
    console.log('Reset cancelled. Use --confirm-reset flag to proceed.');
    process.exit(0);
}
//# sourceMappingURL=resetSystem.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const User_1 = __importDefault(require("./models/User"));
dotenv_1.default.config();
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/abututors";
const resetAdmin = async () => {
    try {
        await mongoose_1.default.connect(MONGODB_URI);
        console.log("Connected to MongoDB...");
        const adminEmail = "admin@abututors.com";
        const salt = await bcryptjs_1.default.genSalt(10);
        const hashedPassword = await bcryptjs_1.default.hash("admin123", salt);
        const result = await User_1.default.findOneAndUpdate({ email: adminEmail }, {
            password: hashedPassword,
            role: 'admin',
            isApproved: true,
            isProfileComplete: true
        }, { upsert: true, new: true });
        console.log("Admin account reset/created successfully!");
        console.log("Email:", result.email);
        console.log("Password set to: admin123");
        process.exit(0);
    }
    catch (error) {
        console.error("Error resetting admin:", error);
        process.exit(1);
    }
};
resetAdmin();
//# sourceMappingURL=resetAdminForce.js.map
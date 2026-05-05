"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const logger_1 = __importDefault(require("./utils/logger"));
const path_1 = __importDefault(require("path"));
const cloudinary_1 = require("cloudinary");
const http_1 = __importDefault(require("http"));
const socketManager_1 = require("./utils/socketManager");
const auth_1 = __importDefault(require("./routes/auth"));
const match_1 = __importDefault(require("./routes/match"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const sessionRoutes_1 = __importDefault(require("./routes/sessionRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const statsRoutes_1 = __importDefault(require("./routes/statsRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const messageRoutes_1 = __importDefault(require("./routes/messageRoutes"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const PORT = parseInt(process.env.PORT, 10) || 5000;
// Cloudinary Configuration
cloudinary_1.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});
// Middleware
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Request Logging using Morgan and Winston
app.use((0, morgan_1.default)('combined', {
    stream: { write: (message) => logger_1.default.http(message.trim()) }
}));
// Initialize Socket.io
(0, socketManager_1.initSocket)(server);
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/match", match_1.default);
app.use("/api/users", userRoutes_1.default);
app.use("/api/sessions", sessionRoutes_1.default);
app.use("/api/wallets", walletRoutes_1.default);
app.use("/api/notifications", notificationRoutes_1.default);
app.use("/api/stats", statsRoutes_1.default);
app.use("/api/admin", adminRoutes_1.default);
app.use("/api/payment", paymentRoutes_1.default);
app.use("/api/messages", messageRoutes_1.default);
// Catch-all 404 for debugging
app.use((req, res) => {
    console.log(`404 at ${req.method} ${req.originalUrl}`);
    res.status(404).send(`Route ${req.originalUrl} not found`);
});
app.get('/', (req, res) => {
    res.send('ABUTutors Backend API is running');
});
// Database connection
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/abututors";
mongoose_1.default.connect(MONGODB_URI)
    .then(() => {
    logger_1.default.info("Connected to MongoDB via Mongoose");
    console.log(`[RELOAD FINAL] Server ready at ${new Date().toLocaleTimeString()} - GEMINI 1.5 ACTIVE.`);
    server.listen(PORT, () => logger_1.default.info(`Backend server running on port ${PORT}`));
})
    .catch((err) => logger_1.default.error("Could not connect to MongoDB:", err));
//# sourceMappingURL=server.js.map
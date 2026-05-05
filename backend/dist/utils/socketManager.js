"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emitSessionUpdate = exports.emitBroadcast = exports.emitMessageRead = exports.emitNewMessage = exports.getIO = exports.initSocket = void 0;
const socket_io_1 = require("socket.io");
const logger_1 = __importDefault(require("./logger"));
let io;
const userSockets = new Map(); // userId -> socketId
const initSocket = (server) => {
    io = new socket_io_1.Server(server, {
        cors: {
            origin: "*", // Adjust for production
            methods: ["GET", "POST"]
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.handshake.query.userId;
        if (userId) {
            userSockets.set(userId, socket.id);
            socket.join(userId); // Each user has their own room (private)
            logger_1.default.info(`User ${userId} connected to Socket [${socket.id}]`);
        }
        socket.on('disconnect', () => {
            if (userId) {
                userSockets.delete(userId);
                logger_1.default.info(`User ${userId} disconnected from Socket`);
            }
        });
    });
    return io;
};
exports.initSocket = initSocket;
const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};
exports.getIO = getIO;
// Emit a new message to both sender and receiver (to keep all devices in sync)
const emitNewMessage = (senderId, receiverId, message) => {
    if (io) {
        io.to(receiverId).emit('new_message', message);
        io.to(senderId).emit('new_message', message);
    }
};
exports.emitNewMessage = emitNewMessage;
// Emit message status update (e.g., Read Receipt / Blue Tick)
const emitMessageRead = (senderId, partnerId) => {
    if (io) {
        io.to(senderId).emit('msg_read', { partnerId });
    }
};
exports.emitMessageRead = emitMessageRead;
// Global broadcast to all connected users
const emitBroadcast = (title, message) => {
    if (io) {
        io.emit('admin_broadcast', { title, message, date: new Date() });
    }
};
exports.emitBroadcast = emitBroadcast;
// Emit real-time session update to a specific user
const emitSessionUpdate = (userId, sessionData) => {
    if (io) {
        io.to(userId).emit('session_update', sessionData);
    }
};
exports.emitSessionUpdate = emitSessionUpdate;
//# sourceMappingURL=socketManager.js.map
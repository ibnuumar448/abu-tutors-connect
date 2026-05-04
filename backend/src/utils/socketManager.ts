import { Server, Socket } from 'socket.io';
import http from 'http';
import logger from './logger';

let io: Server;
const userSockets = new Map<string, string>(); // userId -> socketId

export const initSocket = (server: http.Server) => {
    io = new Server(server, {
        cors: {
            origin: "*", // Adjust for production
            methods: ["GET", "POST"]
        }
    });

    io.on('connection', (socket: Socket) => {
        const userId = socket.handshake.query.userId as string;
        
        if (userId) {
            userSockets.set(userId, socket.id);
            socket.join(userId); // Each user has their own room (private)
            logger.info(`User ${userId} connected to Socket [${socket.id}]`);
        }

        socket.on('disconnect', () => {
            if (userId) {
                userSockets.delete(userId);
                logger.info(`User ${userId} disconnected from Socket`);
            }
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.io not initialized!");
    }
    return io;
};

// Emit a new message to both sender and receiver (to keep all devices in sync)
export const emitNewMessage = (senderId: string, receiverId: string, message: any) => {
    if (io) {
        io.to(receiverId).emit('new_message', message);
        io.to(senderId).emit('new_message', message);
    }
};

// Emit message status update (e.g., Read Receipt / Blue Tick)
export const emitMessageRead = (senderId: string, partnerId: string) => {
    if (io) {
        io.to(senderId).emit('msg_read', { partnerId });
    }
};

// Global broadcast to all connected users
export const emitBroadcast = (title: string, message: string) => {
    if (io) {
        io.emit('admin_broadcast', { title, message, date: new Date() });
    }
};

// Emit real-time session update to a specific user
export const emitSessionUpdate = (userId: string, sessionData: any) => {
    if (io) {
        io.to(userId).emit('session_update', sessionData);
    }
};

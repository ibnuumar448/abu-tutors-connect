"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatList = exports.getConversation = exports.sendMessage = void 0;
const Message_1 = __importDefault(require("../models/Message"));
const User_1 = __importDefault(require("../models/User"));
const Notification_1 = __importDefault(require("../models/Notification"));
const logger_1 = __importDefault(require("../utils/logger"));
const socketManager_1 = require("../utils/socketManager");
// @desc    Send a message
// @route   POST /api/messages
// @access  Private
const sendMessage = async (req, res) => {
    try {
        const { receiverId, content } = req.body;
        const senderId = req.user.id;
        if (!receiverId || !content) {
            res.status(400).json({ message: 'Receiver ID and content are required' });
            return;
        }
        const message = await Message_1.default.create({
            senderId,
            receiverId,
            content
        });
        // Create notification for receiver
        const sender = await User_1.default.findById(senderId).select('name');
        await Notification_1.default.create({
            userId: receiverId,
            title: `New Message from ${sender?.name || 'User'}`,
            message: content.length > 50 ? content.substring(0, 47) + '...' : content,
            type: 'message',
            link: `/messages?partnerId=${senderId}`
        });
        // Real-time emission to both parties
        (0, socketManager_1.emitNewMessage)(senderId, receiverId, message);
        res.status(201).json(message);
    }
    catch (error) {
        logger_1.default.error(`Send Message Error: ${error.message}`);
        res.status(500).json({ message: 'Server error sending message' });
    }
};
exports.sendMessage = sendMessage;
// @desc    Get messages for a conversation
// @route   GET /api/messages/:otherUserId
// @access  Private
const getConversation = async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const userId = req.user.id;
        const messages = await Message_1.default.find({
            $or: [
                { senderId: userId, receiverId: otherUserId },
                { senderId: otherUserId, receiverId: userId }
            ]
        }).sort({ createdAt: 1 });
        // Mark unread messages as read
        await Message_1.default.updateMany({ senderId: otherUserId, receiverId: userId, isRead: false }, { isRead: true });
        // Mark related notifications as read
        await Notification_1.default.updateMany({
            userId: userId,
            type: 'message',
            link: { $regex: otherUserId }
        }, { read: true });
        // Real-time emission for "Read Receipt" (Blue Tick)
        (0, socketManager_1.emitMessageRead)(otherUserId, userId);
        res.json(messages);
    }
    catch (error) {
        logger_1.default.error(`Get Conversation Error: ${error.message}`);
        res.status(500).json({ message: 'Server error getting conversation' });
    }
};
exports.getConversation = getConversation;
// @desc    Get all conversations for the current user
// @route   GET /api/messages/conversations
// @access  Private
const getChatList = async (req, res) => {
    try {
        const userId = req.user.id;
        // Find unique users the current user has chatted with
        const messages = await Message_1.default.find({
            $or: [{ senderId: userId }, { receiverId: userId }]
        }).sort({ createdAt: -1 });
        const chatPartners = new Set();
        const latestMessages = [];
        for (const msg of messages) {
            const partnerId = msg.senderId.toString() === userId
                ? msg.receiverId.toString()
                : msg.senderId.toString();
            if (!chatPartners.has(partnerId)) {
                chatPartners.add(partnerId);
                const partner = await User_1.default.findById(partnerId).select('name role documents');
                latestMessages.push({
                    partner,
                    lastMessage: msg
                });
            }
        }
        res.json(latestMessages);
    }
    catch (error) {
        logger_1.default.error(`Get Chat List Error: ${error.message}`);
        res.status(500).json({ message: 'Server error getting chat list' });
    }
};
exports.getChatList = getChatList;
//# sourceMappingURL=messageController.js.map
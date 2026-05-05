"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const messageController_1 = require("../controllers/messageController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .post(authMiddleware_1.protect, messageController_1.sendMessage);
router.get('/conversations', authMiddleware_1.protect, messageController_1.getChatList);
router.get('/:otherUserId', authMiddleware_1.protect, messageController_1.getConversation);
exports.default = router;
//# sourceMappingURL=messageRoutes.js.map
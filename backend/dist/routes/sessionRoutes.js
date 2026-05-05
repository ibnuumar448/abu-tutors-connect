"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const sessionController_1 = require("../controllers/sessionController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Note: We use type assertions in the routes if the controller types are slightly off
router.route('/')
    .post(authMiddleware_1.protect, sessionController_1.createSession)
    .get(authMiddleware_1.protect, sessionController_1.getUserSessions);
router.post('/lock', authMiddleware_1.protect, sessionController_1.lockSlot);
router.post('/:id/start', authMiddleware_1.protect, sessionController_1.startSession);
router.post('/:id/complete', authMiddleware_1.protect, sessionController_1.completeSession);
router.post('/:id/cancel', authMiddleware_1.protect, sessionController_1.cancelSession);
router.post('/:id/no-show', authMiddleware_1.protect, sessionController_1.reportTuteeNoShow);
router.post('/:id/sync', authMiddleware_1.protect, sessionController_1.syncSession);
router.post('/:id/reschedule', authMiddleware_1.protect, sessionController_1.rescheduleSession);
router.post('/:id/review', authMiddleware_1.protect, sessionController_1.reviewSession);
exports.default = router;
//# sourceMappingURL=sessionRoutes.js.map
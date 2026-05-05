"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.get('/pending-tutors', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.getPendingTutors);
router.put('/tutors/:id/approve', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.approveTutor);
router.get('/course-applications', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.getPendingCourseApplications);
router.put('/course-applications/:userId/:appId', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.processCourseApplication);
router.route('/settings')
    .get(adminController_1.getSettings)
    .put(authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.updateSettings);
router.route('/venues')
    .get(adminController_1.getVenues)
    .post(authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.addVenue);
router.route('/venues/:id')
    .put(authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.updateVenue)
    .delete(authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.deleteVenue);
// User Management
router.get('/users', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.getAllUsers);
router.put('/users/:id/status', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.updateUserStatus);
// Activity Logs
router.get('/logs', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.getAdminLogs);
// Session Monitoring
router.get('/sessions', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.getAllSessions);
router.put('/sessions/:id/override', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.overrideSession);
// Financial Monitoring
router.get('/finances', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.getFinancialStats);
router.post('/reconcile-escrow', authMiddleware_1.protect, authMiddleware_1.admin, adminController_1.reconcileEscrows);
exports.default = router;
//# sourceMappingURL=adminRoutes.js.map
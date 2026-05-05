"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const fileUpload_1 = require("../middleware/fileUpload");
const router = express_1.default.Router();
// Public routes
router.get('/tutors', userController_1.getTutors);
router.get('/tutors/:id', userController_1.getTutorProfile);
// Profile routes
router.get('/me', authMiddleware_1.protect, userController_1.getProfile);
router.get('/admin-id', authMiddleware_1.protect, userController_1.getAdminId);
router.get('/profile/:id', authMiddleware_1.protect, userController_1.getUserPublicProfile);
// Course Application
router.post('/apply-course', authMiddleware_1.protect, fileUpload_1.upload.single('transcript'), fileUpload_1.validateFileSize, userController_1.submitCourseApplication);
// Unified update route
router.route('/')
    .get(authMiddleware_1.protect, userController_1.getProfile)
    .patch(authMiddleware_1.protect, userController_1.updateProfile)
    .put(authMiddleware_1.protect, fileUpload_1.upload.fields([
    { name: 'profilePicture', maxCount: 1 },
    { name: 'admissionLetter', maxCount: 1 },
    { name: 'transcript', maxCount: 1 }
]), fileUpload_1.validateFileSize, userController_1.updateProfile);
exports.default = router;
//# sourceMappingURL=userRoutes.js.map
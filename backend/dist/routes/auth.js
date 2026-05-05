"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const fileUpload_1 = require("../middleware/fileUpload");
const router = express_1.default.Router();
router.post("/register", fileUpload_1.upload.single('profilePicture'), authController_1.register);
router.post("/login", authController_1.login);
router.post("/forgot-password", authController_1.forgotPassword);
router.post("/reset-password/:token", authController_1.resetPassword);
exports.default = router;
//# sourceMappingURL=auth.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const walletController_1 = require("../controllers/walletController");
const bankController_1 = require("../controllers/bankController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
router.route('/')
    .get(authMiddleware_1.protect, walletController_1.getWallet);
router.post('/set-pin', authMiddleware_1.protect, walletController_1.setTransactionPin);
router.post('/pay-registration', authMiddleware_1.protect, walletController_1.payRegistrationFromWallet);
router.post('/withdraw', authMiddleware_1.protect, walletController_1.withdrawFunds);
router.post('/initialize', authMiddleware_1.protect, walletController_1.initializePayment);
router.get('/verify', authMiddleware_1.protect, walletController_1.verifyPayment);
router.post('/webhook', walletController_1.handleWebhook); // Publicly accessible for Paystack
// Bank helper routes
router.get('/banks', authMiddleware_1.protect, bankController_1.getBanks);
router.get('/verify-account', authMiddleware_1.protect, bankController_1.verifyAccount);
exports.default = router;
//# sourceMappingURL=walletRoutes.js.map
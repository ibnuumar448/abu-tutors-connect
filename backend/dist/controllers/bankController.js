"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyAccount = exports.getBanks = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = __importDefault(require("../utils/logger"));
const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY || '';
// @desc    Get list of Nigerian banks from Paystack
// @route   GET /api/banks
// @access  Private
const getBanks = async (req, res) => {
    try {
        const response = await axios_1.default.get('https://api.paystack.co/bank?currency=NGN', {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        });
        // Filter out duplicate bank codes from Paystack response
        const uniqueBanks = response.data.data.filter((bank, index, self) => index === self.findIndex((b) => b.code.toString() === bank.code.toString()));
        res.json(uniqueBanks);
    }
    catch (error) {
        logger_1.default.warn(`Paystack Bank Fetch Warning: ${error.message}. Returning empty bank list.`);
        // Return empty array instead of 500 to prevent crashing the whole Admin Dashboard
        res.json([]);
    }
};
exports.getBanks = getBanks;
// @desc    Verify bank account number (Resolve Account)
// @route   GET /api/banks/verify
// @access  Private
const verifyAccount = async (req, res) => {
    try {
        const { accountNumber, bankCode } = req.query;
        if (!accountNumber || !bankCode) {
            res.status(400).json({ message: 'Account number and bank code are required' });
            return;
        }
        const response = await axios_1.default.get(`https://api.paystack.co/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` }
        });
        res.json(response.data.data);
    }
    catch (error) {
        logger_1.default.error(`Verify Account Error: ${error.message}`);
        res.status(400).json({ message: 'Could not verify account. Please check the details.' });
    }
};
exports.verifyAccount = verifyAccount;
//# sourceMappingURL=bankController.js.map
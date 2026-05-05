"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const Session_1 = __importDefault(require("./models/Session"));
const Escrow_1 = __importDefault(require("./models/Escrow"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '../.env' }); // Adjust path if needed
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/abututors";
async function diagnose() {
    try {
        console.log('Connecting to:', MONGODB_URI);
        await mongoose_1.default.connect(MONGODB_URI);
        console.log('Connected to DB\n');
        console.log('--- Checking Sessions with escrowStatus: held ---');
        const sessionsHeld = await Session_1.default.find({ escrowStatus: 'held' });
        console.log(`Found ${sessionsHeld.length} sessions as "held" in Session model.`);
        for (const s of sessionsHeld) {
            console.log(`Session ID: ${s._id}, Status: ${s.status}, Amount: ${s.amount}, Topic: ${s.topic}`);
        }
        console.log('\n--- Checking Escrow records with status: held ---');
        const escrowHeld = await Escrow_1.default.find({ status: 'held' });
        console.log(`Found ${escrowHeld.length} escrow records as "held" in Escrow model.`);
        for (const e of escrowHeld) {
            console.log(`Escrow ID: ${e._id}, Session ID: ${e.sessionId}, Amount: ${e.amount}`);
        }
        console.log('\n--- Cross-Checking Inconsistencies ---');
        for (const s of sessionsHeld) {
            const e = await Escrow_1.default.findOne({ sessionId: s._id });
            if (!e) {
                console.log(`⚠️  Session ${s._id} has escrowStatus: 'held' but NO matching Escrow record!`);
            }
            else if (e.status !== 'held') {
                console.log(`⚠️  Session ${s._id} says 'held' but Escrow record ${e._id} says '${e.status}'!`);
            }
        }
        for (const e of escrowHeld) {
            const s = await Session_1.default.findById(e.sessionId);
            if (!s) {
                console.log(`⚠️  Escrow ${e._id} exists but Session ${e.sessionId} is MISSING!`);
            }
            else if (s && s.escrowStatus !== 'held') {
                console.log(`⚠️  Escrow ${e._id} says 'held' but Session ${s._id} says '${s.escrowStatus}'!`);
            }
        }
        await mongoose_1.default.connection.close();
    }
    catch (error) {
        console.error('Error during diagnosis:', error.message);
    }
}
diagnose();
//# sourceMappingURL=diagnose_escrow.js.map
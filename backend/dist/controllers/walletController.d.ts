import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const getWallet: (req: AuthRequest, res: Response) => Promise<void>;
export declare const setTransactionPin: (req: AuthRequest, res: Response) => Promise<void>;
export declare const initializePayment: (req: AuthRequest, res: Response) => Promise<void>;
export declare const verifyPayment: (req: AuthRequest, res: Response) => Promise<void>;
export declare const handleWebhook: (req: Request, res: Response) => Promise<void>;
export declare const payRegistrationFromWallet: (req: AuthRequest, res: Response) => Promise<void>;
export declare const withdrawFunds: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=walletController.d.ts.map
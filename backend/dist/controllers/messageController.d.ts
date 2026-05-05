import { Request, Response } from 'express';
interface AuthRequest extends Request {
    user?: any;
}
export declare const sendMessage: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getConversation: (req: AuthRequest, res: Response) => Promise<void>;
export declare const getChatList: (req: AuthRequest, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=messageController.d.ts.map
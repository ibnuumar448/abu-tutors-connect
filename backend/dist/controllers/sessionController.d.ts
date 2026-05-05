import { Request as ExpressRequest, Response } from 'express';
interface Request extends ExpressRequest {
    user?: any;
}
export declare const createSession: (req: Request, res: Response) => Promise<void>;
export declare const getUserSessions: (req: Request, res: Response) => Promise<void>;
export declare const startSession: (req: Request, res: Response) => Promise<void>;
export declare const completeSession: (req: Request, res: Response) => Promise<void>;
export declare const cancelSession: (req: Request, res: Response) => Promise<void>;
export declare const rescheduleSession: (req: Request, res: Response) => Promise<void>;
export declare const reportTuteeNoShow: (req: Request, res: Response) => Promise<void>;
export declare const syncSession: (req: Request, res: Response) => Promise<void>;
export declare const lockSlot: (req: Request, res: Response) => Promise<void>;
export declare const reviewSession: (req: Request, res: Response) => Promise<void>;
export {};
//# sourceMappingURL=sessionController.d.ts.map
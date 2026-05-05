import { Request as ExpressRequest, Response } from 'express';
interface Request extends ExpressRequest {
    user?: any;
}
export declare const getPendingTutors: (req: Request, res: Response) => Promise<void>;
export declare const approveTutor: (req: Request, res: Response) => Promise<void>;
export declare const getPendingCourseApplications: (req: Request, res: Response) => Promise<void>;
export declare const processCourseApplication: (req: Request, res: Response) => Promise<void>;
export declare const getSettings: (req: Request, res: Response) => Promise<void>;
export declare const updateSettings: (req: Request, res: Response) => Promise<void>;
export declare const addVenue: (req: Request, res: Response) => Promise<void>;
export declare const getVenues: (req: any, res: Response) => Promise<void>;
export declare const updateVenue: (req: Request, res: Response) => Promise<void>;
export declare const deleteVenue: (req: Request, res: Response) => Promise<void>;
export declare const getAllUsers: (req: Request, res: Response) => Promise<void>;
export declare const updateUserStatus: (req: Request, res: Response) => Promise<void>;
export declare const getAllSessions: (req: Request, res: Response) => Promise<void>;
export declare const overrideSession: (req: Request, res: Response) => Promise<void>;
export declare const getFinancialStats: (req: Request, res: Response) => Promise<void>;
export declare const reconcileEscrows: (req: Request, res: Response) => Promise<void>;
export declare const getAdminLogs: (req: Request, res: Response) => Promise<void>;
export declare const checkTutorUpgrade: (tutorId: string) => Promise<void>;
export {};
//# sourceMappingURL=adminController.d.ts.map
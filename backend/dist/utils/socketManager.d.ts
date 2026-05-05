import { Server } from 'socket.io';
import http from 'http';
export declare const initSocket: (server: http.Server) => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const getIO: () => Server<import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, import("socket.io").DefaultEventsMap, any>;
export declare const emitNewMessage: (senderId: string, receiverId: string, message: any) => void;
export declare const emitMessageRead: (senderId: string, partnerId: string) => void;
export declare const emitBroadcast: (title: string, message: string) => void;
export declare const emitSessionUpdate: (userId: string, sessionData: any) => void;
//# sourceMappingURL=socketManager.d.ts.map
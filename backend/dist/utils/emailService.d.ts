interface EmailOptions {
    email: string;
    subject: string;
    message: string;
    html?: string;
}
export declare const sendEmail: (options: EmailOptions) => Promise<void>;
export {};
//# sourceMappingURL=emailService.d.ts.map
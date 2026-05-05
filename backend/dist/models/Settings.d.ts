import mongoose, { Document } from 'mongoose';
export interface ISettings extends Document {
    maxHourlyRate: number;
    registrationFee: number;
    isRegistrationFree: boolean;
    minSessionsForVerify: number;
    minRatingForVerify: number;
    noShowPayoutPercent: number;
    platformCommissionPercent: number;
    defaultHourlyRate: number;
}
declare const _default: mongoose.Model<ISettings, {}, {}, {}, mongoose.Document<unknown, {}, ISettings, {}, mongoose.DefaultSchemaOptions> & ISettings & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ISettings>;
export default _default;
//# sourceMappingURL=Settings.d.ts.map
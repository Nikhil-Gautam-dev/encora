import mongoose, { Document, Schema } from "mongoose";

export interface IInviteCodeDocument extends Document {
    code: string;
    used: boolean;
    usedBy?: string;
}

const inviteCodeSchema = new Schema<IInviteCodeDocument>(
    {
        code: { type: String, required: true, unique: true, trim: true },
        used: { type: Boolean, default: false },
        usedBy: { type: String }
    },
    { timestamps: true }
);

export const InviteCode = mongoose.model<IInviteCodeDocument>("InviteCode", inviteCodeSchema);

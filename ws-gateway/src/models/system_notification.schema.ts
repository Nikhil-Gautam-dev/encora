import mongoose, { Document, Schema } from "mongoose";

export interface ISystemNotification extends Document {
    title: string;
    body: string;
    type: "update" | "maintenance" | "announcement";
    createdAt: Date;
}

const systemNotificationSchema = new Schema<ISystemNotification>(
    {
        title: { type: String, required: true, trim: true },
        body:  { type: String, required: true, trim: true },
        type:  { type: String, enum: ["update", "maintenance", "announcement"], default: "announcement" }
    },
    { timestamps: true }
);

export const SystemNotification = mongoose.model<ISystemNotification>("SystemNotification", systemNotificationSchema);

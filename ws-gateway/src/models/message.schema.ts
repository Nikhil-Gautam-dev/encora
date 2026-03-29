import mongoose, { Document, Schema } from "mongoose";

export type MessageStatus = "sent" | "delivered" | "read";

export interface IMessageDocument extends Document {
    from: mongoose.Types.ObjectId;
    to: mongoose.Types.ObjectId;
    message: string;
    iv?: string;
    status: MessageStatus;
    createdAt: Date;
}

const messageSchema = new Schema<IMessageDocument>(
    {
        from: { type: Schema.Types.ObjectId, ref: "User", required: true },
        to: { type: Schema.Types.ObjectId, ref: "User", required: true },
        message: { type: String, required: true, trim: true },
        iv: { type: String },
        status: { type: String, enum: ["sent", "delivered", "read"], default: "sent" }
    },
    { timestamps: true }
);

messageSchema.index({ from: 1, to: 1 });
messageSchema.index({ to: 1, status: 1 });

export const Message = mongoose.model<IMessageDocument>("Message", messageSchema);

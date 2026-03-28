import mongoose, { Document, Schema } from "mongoose";

export interface IContactEntry {
    userId: mongoose.Types.ObjectId;
    status: "pending" | "accepted" | "rejected";
}

export interface IUserDocument extends Document {
    name: string;
    username: string;
    email: string;
    googleId: string;
    lastSeen: Date;
    contacts: IContactEntry[];
}

const contactEntrySchema = new Schema<IContactEntry>(
    {
        userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
        status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
    },
    { _id: false }
);

const userSchema = new Schema<IUserDocument>(
    {
        name: { type: String, required: true, trim: true },
        username: { type: String, required: true, unique: true, lowercase: true, trim: true },
        email: { type: String, required: true, unique: true, lowercase: true, trim: true },
        googleId: { type: String, required: true, unique: true },
        lastSeen: { type: Date, default: Date.now },
        contacts: { type: [contactEntrySchema], default: [] }
    },
    { timestamps: true }
);

export const User = mongoose.model<IUserDocument>("User", userSchema);

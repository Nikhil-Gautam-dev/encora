import { Request, Response } from "express";
import mongoose from "mongoose";
import { Message } from "../models/message.schema";

export const getMessageHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const myId = req.user!.userId;
        const { contactId } = req.params;
        const page = Number(req.query.page) || 1;
        const limit = 50;
        const skip = (page - 1) * limit;

        const myObjId = new mongoose.Types.ObjectId(myId);
        const contactObjId = new mongoose.Types.ObjectId(contactId as string);

        const messages = await Message.find({
            $or: [
                { from: myObjId, to: contactObjId },
                { from: contactObjId, to: myObjId }
            ]
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        res.status(200).json({ success: true, messages: messages.reverse() });
    } catch (error) {
        console.error("Error in getMessageHistory:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getLastMessages = async (req: Request, res: Response): Promise<void> => {
    try {
        const myId = req.user!.userId;
        const myObjId = new mongoose.Types.ObjectId(myId);

        // For each conversation involving me, get the single latest message
        const results = await Message.aggregate([
            {
                $match: {
                    $or: [{ from: myObjId }, { to: myObjId }]
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [{ $eq: ["$from", myObjId] }, "$to", "$from"]
                    },
                    message: { $first: "$message" },
                    from: { $first: "$from" },
                    createdAt: { $first: "$createdAt" },
                    status: { $first: "$status" }
                }
            }
        ]);

        // Build a map: { contactId -> { message, from, createdAt, status } }
        const lastMessages: Record<string, { message: string; from: string; createdAt: string; status: string }> = {};
        for (const r of results) {
            lastMessages[r._id.toString()] = {
                message: r.message,
                from: r.from.toString(),
                createdAt: r.createdAt,
                status: r.status
            };
        }

        res.status(200).json({ success: true, lastMessages });
    } catch (error) {
        console.error("Error in getLastMessages:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

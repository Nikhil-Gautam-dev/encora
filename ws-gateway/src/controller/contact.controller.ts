import { Request, Response } from "express";
import mongoose from "mongoose";
import { User } from "../models/user.schema";
import { clients } from "../server";

export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.user!.userId).select("-passwordHash");
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error in getMyProfile:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getPublicProfile = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username } = req.params;
        const user = await User.findOne({ username }).select("name username");
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error in getPublicProfile:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getProfileById = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const user = await User.findById(id).select("name username");
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }
        res.status(200).json({ success: true, user });
    } catch (error) {
        console.error("Error in getProfileById:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const sendContactRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { username } = req.body;
        const senderId = req.user!.userId;

        const target = await User.findOne({ username });
        if (!target) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        const targetId = target._id as mongoose.Types.ObjectId;

        if (targetId.toString() === senderId) {
            res.status(400).json({ success: false, message: "Cannot add yourself" });
            return;
        }

        const sender = await User.findById(senderId);
        if (!sender) {
            res.status(404).json({ success: false, message: "Sender not found" });
            return;
        }

        const alreadyExists = sender.contacts.some(c => c.userId.toString() === targetId.toString());
        if (alreadyExists) {
            res.status(409).json({ success: false, message: "Contact request already sent or contact already added" });
            return;
        }

        // Add pending entry to sender's contacts
        await User.findByIdAndUpdate(senderId, {
            $push: { contacts: { userId: targetId, status: "pending" } }
        });

        // Add pending entry to target's contacts (so they see the request)
        await User.findByIdAndUpdate(targetId, {
            $push: { contacts: { userId: new mongoose.Types.ObjectId(senderId), status: "pending" } }
        });

        // Notify target via WS if online
        const targetClient = clients.get(targetId.toString());
        if (targetClient?.ws.readyState === WebSocket.OPEN) {
            targetClient.ws.send(JSON.stringify({
                type: "contact_request",
                from: { id: senderId, name: sender.name, username: sender.username }
            }));
        }

        res.status(200).json({ success: true, message: "Contact request sent" });
    } catch (error) {
        console.error("Error in sendContactRequest:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getContactRequests = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const user = await User.findById(userId).populate<{
            contacts: { userId: { _id: mongoose.Types.ObjectId; name: string; username: string }; status: string }[]
        }>("contacts.userId", "name username");

        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        const pendingRequests = user.contacts
            .filter(c => c.status === "pending" && c.userId)
            .map(c => ({
                id: (c.userId as any)._id,
                name: (c.userId as any).name,
                username: (c.userId as any).username
            }));

        res.status(200).json({ success: true, requests: pendingRequests });
    } catch (error) {
        console.error("Error in getContactRequests:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const acceptContactRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId: targetId } = req.body;
        const myId = req.user!.userId;

        // Update my contact entry for this user to "accepted"
        await User.findOneAndUpdate(
            { _id: myId, "contacts.userId": targetId },
            { $set: { "contacts.$.status": "accepted" } }
        );

        // Update their contact entry for me to "accepted"
        await User.findOneAndUpdate(
            { _id: targetId, "contacts.userId": myId },
            { $set: { "contacts.$.status": "accepted" } }
        );

        const me = await User.findById(myId).select("name username");

        // Notify the other user via WS if online
        const targetClient = clients.get(targetId);
        if (targetClient?.ws.readyState === WebSocket.OPEN) {
            targetClient.ws.send(JSON.stringify({
                type: "contact_accepted",
                by: { id: myId, name: me?.name, username: me?.username }
            }));
        }

        res.status(200).json({ success: true, message: "Contact accepted" });
    } catch (error) {
        console.error("Error in acceptContactRequest:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const declineContactRequest = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId: targetId } = req.body;
        const myId = req.user!.userId;

        // Remove the pending entry from both sides
        await User.findByIdAndUpdate(myId, {
            $pull: { contacts: { userId: new mongoose.Types.ObjectId(targetId) } }
        });
        await User.findByIdAndUpdate(targetId, {
            $pull: { contacts: { userId: new mongoose.Types.ObjectId(myId) } }
        });

        const me = await User.findById(myId).select("name username");

        // Notify the requester via WS if online
        const targetClient = clients.get(targetId);
        if (targetClient?.ws.readyState === WebSocket.OPEN) {
            targetClient.ws.send(JSON.stringify({
                type: "contact_declined",
                by: { id: myId, name: me?.name, username: me?.username }
            }));
        }

        res.status(200).json({ success: true, message: "Contact request declined" });
    } catch (error) {
        console.error("Error in declineContactRequest:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getContacts = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const user = await User.findById(userId).populate<{
            contacts: { userId: { _id: mongoose.Types.ObjectId; name: string; username: string; lastSeen: Date }; status: string }[]
        }>("contacts.userId", "name username lastSeen");

        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        const contacts = user.contacts
            .filter(c => c.status === "accepted" && c.userId)
            .map(c => ({
                id: (c.userId as any)._id,
                name: (c.userId as any).name,
                username: (c.userId as any).username,
                lastSeen: (c.userId as any).lastSeen
            }));

        res.status(200).json({ success: true, contacts });
    } catch (error) {
        console.error("Error in getContacts:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

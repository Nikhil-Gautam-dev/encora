import { Request, Response } from "express";
import WebSocket from "ws";
import { SystemNotification } from "../models/system_notification.schema";
import { User } from "../models/user.schema";
import { clients } from "../server";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const broadcastNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        const secret = req.headers["x-admin-secret"];
        if (!secret || secret !== process.env.ADMIN_SECRET) {
            res.status(403).json({ success: false, message: "Forbidden" });
            return;
        }

        const { title, body, type = "announcement" } = req.body;
        if (!title || !body) {
            res.status(400).json({ success: false, message: "title and body are required" });
            return;
        }

        const notif = await SystemNotification.create({ title, body, type });

        // Push to all currently connected verified users
        const payload = JSON.stringify({
            type: "system_notification",
            id: notif._id,
            title: notif.title,
            body: notif.body,
            notifType: notif.type,
            createdAt: notif.createdAt
        });

        let pushed = 0;
        for (const client of clients.values()) {
            if (client.verified && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(payload);
                pushed++;
            }
        }

        console.info(`System broadcast sent: "${title}" — pushed to ${pushed} online user(s)`);
        res.status(200).json({ success: true, message: `Broadcast sent, pushed to ${pushed} online user(s)`, id: notif._id });
    } catch (error) {
        console.error("Error in broadcastNotification:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getSystemNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const user = await User.findById(userId).select("lastSystemNotifSeenAt");
        if (!user) {
            res.status(404).json({ success: false, message: "User not found" });
            return;
        }

        // Return notifications since the later of: last seen time OR 30 days ago
        const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
        const since = user.lastSystemNotifSeenAt
            ? new Date(Math.max(user.lastSystemNotifSeenAt.getTime(), thirtyDaysAgo.getTime()))
            : thirtyDaysAgo;

        const notifications = await SystemNotification.find({ createdAt: { $gt: since } }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, notifications });
    } catch (error) {
        console.error("Error in getSystemNotifications:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const markSystemNotifsSeen = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        await User.findByIdAndUpdate(userId, { lastSystemNotifSeenAt: new Date() });
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error in markSystemNotifsSeen:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

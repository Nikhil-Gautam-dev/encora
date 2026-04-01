import { Router } from "express";
import { broadcastNotification, getSystemNotifications, markSystemNotifsSeen } from "../controller/system_notification.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const systemRouter = Router();

// Admin-only — protected by X-Admin-Secret header inside the controller
systemRouter.post("/admin/broadcast", broadcastNotification);

// User-facing
systemRouter.get("/notifications", authMiddleware, getSystemNotifications);
systemRouter.post("/notifications/seen", authMiddleware, markSystemNotifsSeen);

export default systemRouter;

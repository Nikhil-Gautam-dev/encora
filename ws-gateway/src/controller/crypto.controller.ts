import { Request, Response } from "express";
import { User } from "../models/user.schema";

export const uploadKeys = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const { publicKey, encryptedPrivateKey, keySalt, keyIv } = req.body;

        if (!publicKey || !encryptedPrivateKey || !keySalt || !keyIv) {
            res.status(400).json({ success: false, message: "Missing key fields" });
            return;
        }

        await User.findByIdAndUpdate(userId, { publicKey, encryptedPrivateKey, keySalt, keyIv });
        res.status(200).json({ success: true, message: "Keys uploaded" });
    } catch (error) {
        console.error("Error in uploadKeys:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const checkKeys = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const user = await User.findById(userId).select("encryptedPrivateKey").lean();
        res.status(200).json({ success: true, hasKeys: !!user?.encryptedPrivateKey });
    } catch (error) {
        console.error("Error in checkKeys:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getMyKeys = async (req: Request, res: Response): Promise<void> => {
    try {
        const userId = req.user!.userId;
        const user = await User.findById(userId).select("encryptedPrivateKey keySalt keyIv").lean();

        if (!user?.encryptedPrivateKey) {
            res.status(404).json({ success: false, message: "No keys found" });
            return;
        }

        res.status(200).json({
            success: true,
            encryptedPrivateKey: user.encryptedPrivateKey,
            keySalt: user.keySalt,
            keyIv: user.keyIv
        });
    } catch (error) {
        console.error("Error in getMyKeys:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const getContactPublicKey = async (req: Request, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId).select("publicKey").lean();

        if (!user?.publicKey) {
            res.status(404).json({ success: false, message: "Public key not found" });
            return;
        }

        res.status(200).json({ success: true, publicKey: user.publicKey });
    } catch (error) {
        console.error("Error in getContactPublicKey:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.schema";
import { signToken } from "../middleware/auth.middleware";
import { generateUniqueUsername } from "../utils/username.util";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            res.status(400).json({ success: false, message: "Google ID token is required" });
            return;
        }

        // Verify the Google token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload || !payload.email || !payload.sub) {
            res.status(401).json({ success: false, message: "Invalid Google token" });
            return;
        }

        const { sub: googleId, email, name = "User" } = payload;

        // Find or create user
        let user = await User.findOne({ googleId });

        if (!user) {
            // Check if email already registered (edge case)
            user = await User.findOne({ email });
            if (user) {
                // Link Google account to existing email
                user.googleId = googleId;
                await user.save();
            } else {
                // Brand new user — generate cool username
                const username = await generateUniqueUsername(name);
                user = await User.create({ name, email, googleId, username });
                console.info(`New user created: ${username} (${email})`);
            }
        }

        const token = signToken({ userId: user._id.toString(), username: user.username });

        res.status(200).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Error in googleAuth:", error);
        res.status(500).json({ success: false, message: "Google authentication failed" });
    }
};

import { Request, Response } from "express";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/user.schema";
import { signToken, signRefreshToken } from "../middleware/auth.middleware";
import { generateUniqueUsername } from "../utils/username.util";
import { verifyRefreshToken } from "../middleware/auth.middleware";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const REFRESH_COOKIE = "lb_refresh";
const COOKIE_OPTS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 30 * 24 * 60 * 60 * 1000  // 30 days in ms
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            res.status(400).json({ success: false, message: "Google ID token is required" });
            return;
        }

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

        let user = await User.findOne({ googleId });

        if (!user) {
            user = await User.findOne({ email });
            if (user) {
                user.googleId = googleId;
                await user.save();
            } else {
                const username = await generateUniqueUsername(name);
                user = await User.create({ name, email, googleId, username });
                console.info(`New user created: ${username} (${email})`);
            }
        }

        const jwtPayload = { userId: user._id.toString(), username: user.username };
        const accessToken = signToken(jwtPayload);
        const refreshToken = signRefreshToken(jwtPayload);

        res.cookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTS);

        res.status(200).json({
            success: true,
            token: accessToken,
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

export const refreshAccessToken = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = req.cookies?.[REFRESH_COOKIE];
        if (!token) {
            res.status(401).json({ success: false, message: "No refresh token" });
            return;
        }

        const payload = verifyRefreshToken(token);

        const user = await User.findById(payload.userId);
        if (!user) {
            res.status(401).json({ success: false, message: "User not found" });
            return;
        }

        const jwtPayload = { userId: user._id.toString(), username: user.username };
        const accessToken = signToken(jwtPayload);
        const newRefreshToken = signRefreshToken(jwtPayload);

        // Rotate the refresh token
        res.cookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTS);

        res.status(200).json({
            success: true,
            token: accessToken,
            user: {
                id: user._id,
                name: user.name,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error("Error in refreshAccessToken:", error);
        res.status(401).json({ success: false, message: "Invalid or expired refresh token" });
    }
};

export const logout = (_req: Request, res: Response): void => {
    res.clearCookie(REFRESH_COOKIE, { httpOnly: true, sameSite: "lax" });
    res.status(200).json({ success: true, message: "Logged out" });
};

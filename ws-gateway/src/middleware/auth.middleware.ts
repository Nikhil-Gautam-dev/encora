import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtPayload {
    userId: string;
    username: string;
}

declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ success: false, message: "Unauthorized" });
        return;
    }

    const token = authHeader.split(" ")[1];

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
        req.user = payload;
        next();
    } catch {
        res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

/** Short-lived access token */
export const signToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, process.env.JWT_SECRET!, {
        expiresIn: process.env.JWT_EXPIRES_IN || "15m"
    } as jwt.SignOptions);
};

/** Long-lived refresh token */
export const signRefreshToken = (payload: JwtPayload): string => {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "30d"
    } as jwt.SignOptions);
};

export const verifyToken = (token: string): JwtPayload => {
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
};

export const verifyRefreshToken = (token: string): JwtPayload => {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JwtPayload;
};

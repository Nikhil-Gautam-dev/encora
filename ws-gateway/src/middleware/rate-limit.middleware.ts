import rateLimit from "express-rate-limit";

// General API limit — 100 req/min per IP (applied globally in app.ts)
export const apiLimiter = rateLimit({
    windowMs: 60 * 1_000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many requests, please slow down." }
});

// Strict auth limit — 10 attempts per 15 min per IP
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1_000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: "Too many login attempts, please try again later." }
});

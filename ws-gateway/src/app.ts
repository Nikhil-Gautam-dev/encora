import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { apiLimiter } from "./middleware/rate-limit.middleware";

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173,https://encora-ashen.vercel.app")
    .split(",")
    .map(o => o.trim());

console.log("allowed origins: ", allowedOrigins)

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true
}));

app.use(express.json({ limit: "64kb" }));
app.use(express.urlencoded({ extended: true, limit: "64kb" }));
app.use(cookieParser());

app.use("/api", apiLimiter);




app.use("/health", (_: Request, res: Response) => {
    res.status(200).json(
        {
            success: true,
            message: "server running successfully"
        }
    )
})

import userRouter from "./routes/user.routes";
import messageRouter from "./routes/message.routes";

app.use("/api/user", userRouter);
app.use("/api/messages", messageRouter);


app.use((_: Request, res: Response) => {
    res.status(404).json(
        {
            success: false,
            message: "Resource not found"
        }
    )
})

app.use((err: Error, _: Request, res: Response, __: NextFunction) => {
    console.error(err.stack);
    res.status(500).json(
        {
            success: false,
            message: "Internal Server Error"
        }
    )
})

export default app;
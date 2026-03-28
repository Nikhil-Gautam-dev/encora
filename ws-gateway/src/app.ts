import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());




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
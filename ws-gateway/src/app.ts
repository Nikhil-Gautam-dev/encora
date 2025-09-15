import express, { NextFunction, Request, Response } from "express";
import cors from "cors";

const app = express();

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));




app.use("/health", (req: Request, res: Response) => {
    res.status(200).json(
        {
            success: true,
            message: "server running successfully"
        }
    )
})

import userRouter from "./routes/user.routes";

app.use("/api/user", userRouter);


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
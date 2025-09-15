import { Router } from "express";
import {
    createUser,
    login
} from "../controller/user.controller";

const userRouter = Router();

userRouter.route("/create").post(createUser);
userRouter.route("/login").post(login);

export default userRouter;
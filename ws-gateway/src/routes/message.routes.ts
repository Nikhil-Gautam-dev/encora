import { Router } from "express";
import { getMessageHistory, getLastMessages } from "../controller/message.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const messageRouter = Router();

messageRouter.route("/last-messages").get(authMiddleware, getLastMessages);
messageRouter.route("/:contactId").get(authMiddleware, getMessageHistory);

export default messageRouter;

import { Router } from "express";
import { googleAuth, refreshAccessToken, logout } from "../controller/google_auth.controller";
import { getMyProfile, getPublicProfile, getProfileById, sendContactRequest, getContactRequests, acceptContactRequest, declineContactRequest, getContacts } from "../controller/contact.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const userRouter = Router();

userRouter.route("/google-auth").post(googleAuth);
userRouter.route("/refresh").post(refreshAccessToken);
userRouter.route("/logout").post(logout);

userRouter.route("/me").get(authMiddleware, getMyProfile);
userRouter.route("/profile/:username").get(getPublicProfile);
userRouter.route("/profile-by-id/:id").get(authMiddleware, getProfileById);

userRouter.route("/contacts").get(authMiddleware, getContacts);
userRouter.route("/contacts/request").post(authMiddleware, sendContactRequest);
userRouter.route("/contacts/requests").get(authMiddleware, getContactRequests);
userRouter.route("/contacts/accept").post(authMiddleware, acceptContactRequest);
userRouter.route("/contacts/decline").post(authMiddleware, declineContactRequest);

export default userRouter;
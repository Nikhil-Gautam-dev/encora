import { Router } from "express";
import { googleAuth, refreshAccessToken, logout } from "../controller/google_auth.controller";
import { getMyProfile, getPublicProfile, getProfileById, sendContactRequest, getContactRequests, acceptContactRequest, declineContactRequest, getContacts } from "../controller/contact.controller";
import { uploadKeys, checkKeys, getMyKeys, getContactPublicKey } from "../controller/crypto.controller";
import { authMiddleware } from "../middleware/auth.middleware";
import { authLimiter } from "../app";

const userRouter = Router();

userRouter.route("/google-auth").post(authLimiter, googleAuth);
userRouter.route("/refresh").post(authLimiter, refreshAccessToken);
userRouter.route("/logout").post(logout);

userRouter.route("/me").get(authMiddleware, getMyProfile);
userRouter.route("/profile/:username").get(getPublicProfile);
userRouter.route("/profile-by-id/:id").get(authMiddleware, getProfileById);

userRouter.route("/contacts").get(authMiddleware, getContacts);
userRouter.route("/contacts/request").post(authMiddleware, sendContactRequest);
userRouter.route("/contacts/requests").get(authMiddleware, getContactRequests);
userRouter.route("/contacts/accept").post(authMiddleware, acceptContactRequest);
userRouter.route("/contacts/decline").post(authMiddleware, declineContactRequest);

userRouter.route("/keys").put(authMiddleware, uploadKeys);
userRouter.route("/keys/check").get(authMiddleware, checkKeys);
userRouter.route("/keys").get(authMiddleware, getMyKeys);
userRouter.route("/keys/contact/:userId").get(authMiddleware, getContactPublicKey);

export default userRouter;
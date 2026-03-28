import { toast } from "react-toastify";

const audio = new Audio("/notification.mp3");

const isSoundEnabled = () => localStorage.getItem("lb_notification_sound") !== "false";

export const notify = (message: string, type: "info" | "success" | "error" | "message" = "info") => {
    if (isSoundEnabled()) {
        audio.play().catch(() => {});
    }

    switch (type) {
        case "success":
            toast.success(message);
            break;
        case "error":
            toast.error(message);
            break;
        case "message":
            toast.info(message, { hideProgressBar: true });
            break;
        default:
            toast.info(message);
    }
};

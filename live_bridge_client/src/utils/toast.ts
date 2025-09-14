import { toast } from "react-toastify";

const audio = new Audio("/notification.mp3"); // put file in public/

export const notify = (message: string, type: "info" | "success" | "error" | "message" = "info") => {
    // Play sound
    audio.play().catch(err => {
        console.log("Autoplay blocked:", err);
    });

    // Show toast
    switch (type) {
        case "success":
            toast.success(message);
            break;
        case "error":
            toast.error(message);
            break;
        case "message":
            toast.info(message, {
                hideProgressBar: true
            })
            break;
        default:
            toast.info(message);
    }
};

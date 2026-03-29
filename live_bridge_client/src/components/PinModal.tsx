import { useState, useRef, useEffect, type KeyboardEvent } from "react";
import { Lock, Eye, EyeOff, Shield } from "lucide-react";
import { useCrypto } from "../context/CryptoContext";

const PIN_LENGTH = 6;

export default function PinModal() {
    const { pinMode, pinError, isProcessingPin, submitPin } = useCrypto();

    const [pin, setPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
    const [confirmPin, setConfirmPin] = useState<string[]>(Array(PIN_LENGTH).fill(""));
    const [step, setStep] = useState<"enter" | "confirm">(pinMode === "create" ? "enter" : "enter");
    const [showPin, setShowPin] = useState(false);
    const [localError, setLocalError] = useState<string | null>(null);

    const pinRefs = useRef<(HTMLInputElement | null)[]>([]);
    const confirmRefs = useRef<(HTMLInputElement | null)[]>([]);

    const isCreate = pinMode === "create";

    useEffect(() => {
        pinRefs.current[0]?.focus();
    }, []);

    const handleDigitChange = (
        value: string,
        index: number,
        arr: string[],
        setArr: (a: string[]) => void,
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => {
        if (!/^\d?$/.test(value)) return;
        const next = [...arr];
        next[index] = value;
        setArr(next);
        if (value && index < PIN_LENGTH - 1) {
            refs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (
        e: KeyboardEvent<HTMLInputElement>,
        index: number,
        arr: string[],
        refs: React.MutableRefObject<(HTMLInputElement | null)[]>
    ) => {
        if (e.key === "Backspace" && !arr[index] && index > 0) {
            refs.current[index - 1]?.focus();
        }
    };

    const handleSubmit = async () => {
        setLocalError(null);
        const pinStr = pin.join("");
        if (pinStr.length < PIN_LENGTH) { setLocalError("Please enter all 6 digits."); return; }

        if (isCreate && step === "enter") {
            setStep("confirm");
            setConfirmPin(Array(PIN_LENGTH).fill(""));
            setTimeout(() => confirmRefs.current[0]?.focus(), 50);
            return;
        }

        if (isCreate && step === "confirm") {
            const confirmStr = confirmPin.join("");
            if (confirmStr !== pinStr) {
                setLocalError("PINs don't match. Please try again.");
                setConfirmPin(Array(PIN_LENGTH).fill(""));
                setTimeout(() => confirmRefs.current[0]?.focus(), 50);
                return;
            }
        }

        await submitPin(pinStr);
    };

    const displayError = localError || pinError;
    const activePin = step === "confirm" ? confirmPin : pin;
    const setActivePin = step === "confirm" ? setConfirmPin : setPin;
    const activeRefs = step === "confirm" ? confirmRefs : pinRefs;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-teal-600 dark:bg-teal-800 px-6 py-6 flex flex-col items-center gap-2">
                    <div className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20">
                        <Shield size={28} className="text-white" />
                    </div>
                    <h2 className="text-white text-lg font-bold mt-1">
                        {isCreate
                            ? (step === "enter" ? "Set Security PIN" : "Confirm PIN")
                            : "Enter Security PIN"}
                    </h2>
                    <p className="text-teal-100 text-xs text-center">
                        {isCreate && step === "enter"
                            ? "This PIN encrypts your messages. Keep it safe — it cannot be recovered."
                            : isCreate && step === "confirm"
                            ? "Re-enter your PIN to confirm."
                            : "Enter your PIN to decrypt your messages on this device."}
                    </p>
                </div>

                {/* PIN input */}
                <div className="px-6 py-6 flex flex-col items-center gap-5">
                    <div className="flex gap-3">
                        {activePin.map((digit, i) => (
                            <input
                                key={i}
                                ref={el => { activeRefs.current[i] = el; }}
                                type={showPin ? "text" : "password"}
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={e => handleDigitChange(e.target.value, i, activePin, setActivePin, activeRefs)}
                                onKeyDown={e => handleKeyDown(e, i, activePin, activeRefs)}
                                className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white outline-none focus:border-teal-500 dark:focus:border-teal-400 transition"
                            />
                        ))}
                    </div>

                    {/* Show/hide PIN */}
                    <button
                        type="button"
                        onClick={() => setShowPin(v => !v)}
                        className="flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-teal-500 transition"
                    >
                        {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                        {showPin ? "Hide" : "Show"} PIN
                    </button>

                    {displayError && (
                        <p className="text-red-500 dark:text-red-400 text-xs text-center">{displayError}</p>
                    )}

                    <button
                        onClick={handleSubmit}
                        disabled={isProcessingPin}
                        className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-teal-700 dark:hover:bg-teal-600 text-white font-semibold text-sm transition disabled:opacity-60 flex items-center justify-center gap-2"
                    >
                        {isProcessingPin ? (
                            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Lock size={15} />
                        )}
                        {isProcessingPin
                            ? "Processing…"
                            : isCreate && step === "enter"
                            ? "Next"
                            : isCreate && step === "confirm"
                            ? "Set PIN & Enable Encryption"
                            : "Unlock"}
                    </button>

                    {isCreate && step === "confirm" && (
                        <button
                            type="button"
                            onClick={() => { setStep("enter"); setLocalError(null); }}
                            className="text-xs text-gray-400 hover:text-teal-500 transition"
                        >
                            ← Change PIN
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

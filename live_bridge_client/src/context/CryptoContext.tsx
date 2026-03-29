import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from "react";
import { api } from "../services/api";
import {
    generateKeyPair, exportPublicKey, importPublicKey,
    encryptPrivateKey, decryptPrivateKey,
    deriveSharedKey, encryptMessage as cryptoEncrypt, decryptMessage as cryptoDecrypt,
    storePrivateKey, loadPrivateKey
} from "../utils/crypto";

type CryptoContextType = {
    isReady: boolean;
    needsPin: boolean;
    pinMode: "create" | "enter";
    pinError: string | null;
    isProcessingPin: boolean;
    submitPin: (pin: string) => Promise<void>;
    encryptForContact: (message: string, contactId: string) => Promise<{ ciphertext: string; iv: string }>;
    decryptFromContact: (ciphertext: string, iv: string, contactId: string) => Promise<string>;
};

const CryptoContext = createContext<CryptoContextType | undefined>(undefined);

export const CryptoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isReady, setIsReady] = useState(false);
    const [needsPin, setNeedsPin] = useState(false);
    const [pinMode, setPinMode] = useState<"create" | "enter">("create");
    const [pinError, setPinError] = useState<string | null>(null);
    const [isProcessingPin, setIsProcessingPin] = useState(false);

    const privateKeyRef = useRef<CryptoKey | null>(null);
    // Cache: contactId → their public CryptoKey
    const pubKeyCacheRef = useRef<Map<string, CryptoKey>>(new Map());
    // Cache: contactId → derived AES-GCM shared key
    const sharedKeyCacheRef = useRef<Map<string, CryptoKey>>(new Map());

    useEffect(() => {
        const init = async () => {
            const storedKey = await loadPrivateKey();
            if (storedKey) {
                privateKeyRef.current = storedKey;
                setIsReady(true);
                return;
            }
            // No local key — check if server has an encrypted backup
            try {
                const res = await api.get<{ hasKeys: boolean }>("/user/keys/check");
                setPinMode(res.hasKeys ? "enter" : "create");
            } catch {
                setPinMode("create");
            }
            setNeedsPin(true);
        };
        init();
    }, []);

    const submitPin = async (pin: string) => {
        setPinError(null);
        setIsProcessingPin(true);
        try {
            if (pinMode === "create") {
                const { publicKey, privateKey } = await generateKeyPair();
                const pubKeyBase64 = await exportPublicKey(publicKey);
                const { encryptedKey, salt, iv } = await encryptPrivateKey(privateKey, pin);
                await api.put("/user/keys", {
                    publicKey: pubKeyBase64,
                    encryptedPrivateKey: encryptedKey,
                    keySalt: salt,
                    keyIv: iv
                });
                await storePrivateKey(privateKey);
                privateKeyRef.current = privateKey;
            } else {
                const res = await api.get<{ encryptedPrivateKey: string; keySalt: string; keyIv: string }>("/user/keys");
                const privateKey = await decryptPrivateKey(res.encryptedPrivateKey, res.keySalt, res.keyIv, pin);
                await storePrivateKey(privateKey);
                privateKeyRef.current = privateKey;
            }
            setNeedsPin(false);
            setIsReady(true);
        } catch (err: any) {
            // AES-GCM decryption failure = wrong PIN
            if (err?.name === "OperationError" || err?.message?.includes("decrypt")) {
                setPinError("Incorrect PIN. Please try again.");
            } else {
                setPinError(err?.message || "Something went wrong. Please try again.");
            }
        } finally {
            setIsProcessingPin(false);
        }
    };

    const getSharedKey = useCallback(async (contactId: string): Promise<CryptoKey> => {
        const cached = sharedKeyCacheRef.current.get(contactId);
        if (cached) return cached;

        let contactPubKey = pubKeyCacheRef.current.get(contactId);
        if (!contactPubKey) {
            const res = await api.get<{ publicKey: string }>(`/user/keys/contact/${contactId}`);
            contactPubKey = await importPublicKey(res.publicKey);
            pubKeyCacheRef.current.set(contactId, contactPubKey);
        }

        const sharedKey = await deriveSharedKey(privateKeyRef.current!, contactPubKey);
        sharedKeyCacheRef.current.set(contactId, sharedKey);
        return sharedKey;
    }, []);

    const encryptForContact = useCallback(async (message: string, contactId: string) => {
        const sharedKey = await getSharedKey(contactId);
        return cryptoEncrypt(message, sharedKey);
    }, [getSharedKey]);

    const decryptFromContact = useCallback(async (ciphertext: string, iv: string, contactId: string) => {
        try {
            const sharedKey = await getSharedKey(contactId);
            return await cryptoDecrypt(ciphertext, iv, sharedKey);
        } catch {
            return "🔒 Encrypted message";
        }
    }, [getSharedKey]);

    return (
        <CryptoContext.Provider value={{
            isReady, needsPin, pinMode, pinError, isProcessingPin,
            submitPin, encryptForContact, decryptFromContact
        }}>
            {children}
        </CryptoContext.Provider>
    );
};

export const useCrypto = () => {
    const ctx = useContext(CryptoContext);
    if (!ctx) throw new Error("useCrypto must be used inside CryptoProvider");
    return ctx;
};

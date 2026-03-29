import { get, set, del } from "idb-keyval";

const PRIVATE_KEY_IDB_KEY = "lb_e2e_private_key";
const ECDH_PARAMS: EcKeyGenParams = { name: "ECDH", namedCurve: "P-256" };
const AES_PARAMS: AesKeyGenParams = { name: "AES-GCM", length: 256 };

// ── Helpers ──────────────────────────────────────────────────

const toBase64 = (buf: ArrayBuffer | Uint8Array): string =>
    btoa(String.fromCharCode(...new Uint8Array(buf instanceof Uint8Array ? buf.buffer : buf)));

const fromBase64 = (b64: string): Uint8Array =>
    Uint8Array.from(atob(b64), c => c.charCodeAt(0));

// ── ECDH Key pair ────────────────────────────────────────────

export const generateKeyPair = (): Promise<CryptoKeyPair> =>
    crypto.subtle.generateKey(ECDH_PARAMS, true, ["deriveKey", "deriveBits"]);

export const exportPublicKey = async (key: CryptoKey): Promise<string> => {
    const buf = await crypto.subtle.exportKey("spki", key);
    return toBase64(buf);
};

export const importPublicKey = (base64: string): Promise<CryptoKey> => {
    const buf = fromBase64(base64);
    return crypto.subtle.importKey("spki", buf, ECDH_PARAMS, true, []);
};

// ── PIN-based private key protection ────────────────────────

const deriveKeyFromPin = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
    const keyMaterial = await crypto.subtle.importKey(
        "raw", new TextEncoder().encode(pin), "PBKDF2", false, ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt, iterations: 300_000, hash: "SHA-256" },
        keyMaterial,
        AES_PARAMS,
        false,
        ["encrypt", "decrypt"]
    );
};

export const encryptPrivateKey = async (
    privateKey: CryptoKey,
    pin: string
): Promise<{ encryptedKey: string; salt: string; iv: string }> => {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const aesKey = await deriveKeyFromPin(pin, salt);
    const pkcs8 = await crypto.subtle.exportKey("pkcs8", privateKey);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, pkcs8);
    return { encryptedKey: toBase64(ciphertext), salt: toBase64(salt), iv: toBase64(iv) };
};

export const decryptPrivateKey = async (
    encryptedKey: string,
    salt: string,
    iv: string,
    pin: string
): Promise<CryptoKey> => {
    const aesKey = await deriveKeyFromPin(pin, fromBase64(salt));
    const pkcs8 = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(iv) },
        aesKey,
        fromBase64(encryptedKey)
    );
    // extractable: false — we keep it in IndexedDB and the server backup
    return crypto.subtle.importKey("pkcs8", pkcs8, ECDH_PARAMS, false, ["deriveKey", "deriveBits"]);
};

// ── Message encryption (ECDH → shared AES-GCM key) ──────────

export const deriveSharedKey = (myPrivateKey: CryptoKey, theirPublicKey: CryptoKey): Promise<CryptoKey> =>
    crypto.subtle.deriveKey(
        { name: "ECDH", public: theirPublicKey },
        myPrivateKey,
        AES_PARAMS,
        false,
        ["encrypt", "decrypt"]
    );

export const encryptMessage = async (
    plaintext: string,
    sharedKey: CryptoKey
): Promise<{ ciphertext: string; iv: string }> => {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedKey,
        new TextEncoder().encode(plaintext)
    );
    return { ciphertext: toBase64(ciphertext), iv: toBase64(iv) };
};

export const decryptMessage = async (
    ciphertext: string,
    iv: string,
    sharedKey: CryptoKey
): Promise<string> => {
    const plaintext = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: fromBase64(iv) },
        sharedKey,
        fromBase64(ciphertext)
    );
    return new TextDecoder().decode(plaintext);
};

// ── IndexedDB storage (idb-keyval) ───────────────────────────

export const storePrivateKey = (key: CryptoKey): Promise<void> => set(PRIVATE_KEY_IDB_KEY, key);
export const loadPrivateKey = (): Promise<CryptoKey | undefined> => get<CryptoKey>(PRIVATE_KEY_IDB_KEY);
export const clearPrivateKey = (): Promise<void> => del(PRIVATE_KEY_IDB_KEY);

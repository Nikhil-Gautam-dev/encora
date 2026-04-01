const REQUIRED_ENVS = [
    "PORT",
    "HTTP_PORT",

    "RABBIT_URL",

    "MONGO_URI",

    "JWT_SECRET",
    "JWT_REFRESH_SECRET",

    "GOOGLE_CLIENT_ID",

    "CLIENT_URL",

    "JWT_EXPIRES_IN",
    "JWT_REFRESH_EXPIRES_IN",

    "ADMIN_SECRET"
] as const;


export function validateEnv(): void {
    const missing: string[] = [];

    for (const key of REQUIRED_ENVS) {
        if (!process.env[key]) missing.push(key);
    }

    if (missing.length > 0) {
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.error("  Missing required environment variables:");
        for (const key of missing) {
            console.error(`    ✗ ${key}`);
        }
        console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        process.exit(1);
    }

    console.log("✓ Environment validated");
}

/**
 * Environment Variable Validation
 * Validates all required env vars at startup using Zod
 */

import { z } from "zod";

const envSchema = z.object({
    // Supabase - required
    NEXT_PUBLIC_SUPABASE_URL: z.string().url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, "NEXT_PUBLIC_SUPABASE_ANON_KEY is required"),

    // Google AI - optional (only needed for shirt analysis)
    GOOGLE_AI_API_KEY: z.string().optional(),
});

// Parse and validate - will throw on startup if invalid
function validateEnv() {
    // In Edge runtime (middleware), process.env may be partially available
    // We do a lenient check here and let individual features fail gracefully
    try {
        return envSchema.parse(process.env);
    } catch (error) {
        if (process.env.NODE_ENV === "development") {
            console.error("❌ Invalid environment variables:", error);
        }
        throw error;
    }
}

export const env = validateEnv();

// Type export for use elsewhere
export type Env = z.infer<typeof envSchema>;

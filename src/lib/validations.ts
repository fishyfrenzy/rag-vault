/**
 * Form Validation Schemas
 * Zod schemas for form validation
 */

import { z } from "zod";

// === VAULT ITEM SCHEMAS ===

export const createVaultItemSchema = z.object({
    subject: z.string().min(1, "Subject is required").max(200, "Subject too long"),
    category: z.enum(["Music", "Motorcycle", "Movie", "Art", "Sport", "Advertising", "Other"]),
    years: z.array(z.string()).optional(),
    description: z.string().max(5000).optional(),
    tags: z.array(z.string()).max(10, "Maximum 10 tags").optional(),
    tagBrands: z.array(z.string()).max(5, "Maximum 5 tag brands").optional(),
    origin: z.string().max(100).optional(),
    stitchType: z.enum(["Single", "Double", "Mixed", "Other"]).optional(),
    garmentType: z.string().optional(),
});

export type CreateVaultItemInput = z.infer<typeof createVaultItemSchema>;

// === INVENTORY ITEM SCHEMAS ===

export const addInventoryItemSchema = z.object({
    vault_id: z.string().uuid("Invalid vault item"),
    size: z.string().optional(),
    condition: z.number().min(1).max(10).optional(),
    price: z.number().min(0).optional(),
    for_sale: z.boolean().default(false),
    notes: z.string().max(1000).optional(),
    listing_type: z.enum(["collection", "iso", "for_sale", "sold"]).optional(),
    body_type: z.string().optional(),
});

export type AddInventoryItemInput = z.infer<typeof addInventoryItemSchema>;

// === PROFILE SCHEMAS ===

export const updateProfileSchema = z.object({
    display_name: z.string().min(2, "Display name too short").max(50).optional(),
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(20, "Username too long")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores")
        .optional(),
    bio: z.string().max(500).optional(),
    location: z.string().max(100).optional(),
    birth_year: z.number().min(1900).max(new Date().getFullYear()).optional().nullable(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// === EDIT PROPOSAL SCHEMAS ===

export const createEditProposalSchema = z.object({
    vault_item_id: z.string().uuid(),
    field_name: z.string().min(1),
    old_value: z.string().nullable(),
    new_value: z.string().min(1, "New value is required"),
});

export type CreateEditProposalInput = z.infer<typeof createEditProposalSchema>;

// === FEEDBACK SCHEMA ===

export const feedbackSchema = z.object({
    message: z.string().min(10, "Please provide more details").max(2000),
    page_url: z.string().optional(),
});

export type FeedbackInput = z.infer<typeof feedbackSchema>;

// === COLLECTION SCHEMA ===

export const createCollectionSchema = z.object({
    name: z.string().min(1, "Collection name is required").max(50),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid color format"),
    is_private: z.boolean().default(false),
});

export type CreateCollectionInput = z.infer<typeof createCollectionSchema>;

// === HELPER FUNCTIONS ===

/**
 * Safely parse and return validation errors
 */
export function validateForm<T>(schema: z.ZodSchema<T>, data: unknown): {
    success: boolean;
    data?: T;
    errors?: Record<string, string>;
} {
    const result = schema.safeParse(data);

    if (result.success) {
        return { success: true, data: result.data };
    }

    const errors: Record<string, string> = {};
    result.error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errors[path] = issue.message;
    });

    return { success: false, errors };
}

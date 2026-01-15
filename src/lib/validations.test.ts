/**
 * Validation Schema Tests
 * Unit tests for Zod validation schemas
 */

import { describe, it, expect } from 'vitest'
import {
    createVaultItemSchema,
    createThreadSchema,
    createReplySchema,
    updateProfileSchema,
} from './validations'

describe('createVaultItemSchema', () => {
    it('should validate a valid vault item', () => {
        const validItem = {
            subject: 'Metallica Master of Puppets',
            category: 'Music',
        }
        const result = createVaultItemSchema.safeParse(validItem)
        expect(result.success).toBe(true)
    })

    it('should reject empty subject', () => {
        const invalidItem = {
            subject: '',
            category: 'Music',
        }
        const result = createVaultItemSchema.safeParse(invalidItem)
        expect(result.success).toBe(false)
    })

    it('should reject invalid category', () => {
        const invalidItem = {
            subject: 'Test Shirt',
            category: 'InvalidCategory',
        }
        const result = createVaultItemSchema.safeParse(invalidItem)
        expect(result.success).toBe(false)
    })
})

describe('createThreadSchema', () => {
    it('should validate a valid thread', () => {
        const validThread = {
            categoryId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Looking for Metallica shirts',
            content: 'Does anyone know where to find authentic 80s Metallica shirts?',
        }
        const result = createThreadSchema.safeParse(validThread)
        expect(result.success).toBe(true)
    })

    it('should reject short title', () => {
        const invalidThread = {
            categoryId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Hi',
            content: 'This is a valid content.',
        }
        const result = createThreadSchema.safeParse(invalidThread)
        expect(result.success).toBe(false)
    })

    it('should reject short content', () => {
        const invalidThread = {
            categoryId: '123e4567-e89b-12d3-a456-426614174000',
            title: 'Valid Title',
            content: 'Short',
        }
        const result = createThreadSchema.safeParse(invalidThread)
        expect(result.success).toBe(false)
    })
})

describe('createReplySchema', () => {
    it('should validate a valid reply', () => {
        const validReply = {
            threadId: '123e4567-e89b-12d3-a456-426614174000',
            content: 'Great find!',
        }
        const result = createReplySchema.safeParse(validReply)
        expect(result.success).toBe(true)
    })

    it('should reject empty content', () => {
        const invalidReply = {
            threadId: '123e4567-e89b-12d3-a456-426614174000',
            content: '',
        }
        const result = createReplySchema.safeParse(invalidReply)
        expect(result.success).toBe(false)
    })
})

describe('updateProfileSchema', () => {
    it('should validate valid profile update', () => {
        const validUpdate = {
            display_name: 'John Doe',
            username: 'johndoe',
            bio: 'Vintage shirt collector',
        }
        const result = updateProfileSchema.safeParse(validUpdate)
        expect(result.success).toBe(true)
    })

    it('should reject invalid username characters', () => {
        const invalidUpdate = {
            username: 'john doe!',
        }
        const result = updateProfileSchema.safeParse(invalidUpdate)
        expect(result.success).toBe(false)
    })
})

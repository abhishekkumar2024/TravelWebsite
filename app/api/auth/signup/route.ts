/**
 * Sign-Up API Route
 * 
 * Handles new user registration with email/password.
 * NextAuth's Credentials provider only handles login, not registration.
 * 
 * POST /api/auth/signup
 * Body: { name, email, password }
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/router';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, password } = body;

        // Validation
        if (!email || !password) {
            return NextResponse.json(
                { error: 'Email and password are required' },
                { status: 400 }
            );
        }

        if (password.length < 6) {
            return NextResponse.json(
                { error: 'Password must be at least 6 characters' },
                { status: 400 }
            );
        }

        // Check if user already exists
        const existing = await db.queryOne(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existing) {
            return NextResponse.json(
                { error: 'An account with this email already exists' },
                { status: 409 }
            );
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const displayName = name || email.split('@')[0];
        const newUser = await db.executeOne<{ id: string }>(
            `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
             VALUES ($1, $2, $3, 'user', NOW(), NOW())
             RETURNING id`,
            [displayName, email, passwordHash]
        );

        if (!newUser) {
            return NextResponse.json(
                { error: 'Failed to create account' },
                { status: 500 }
            );
        }

        // Also create an author record (for blog submissions)
        await db.execute(
            `INSERT INTO authors (id, name, email, created_at)
             VALUES ($1, $2, $3, NOW())
             ON CONFLICT (id) DO NOTHING`,
            [newUser.id, displayName, email]
        );

        return NextResponse.json({
            success: true,
            message: 'Account created successfully. You can now log in.',
        });
    } catch (error: any) {
        console.error('[signup] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

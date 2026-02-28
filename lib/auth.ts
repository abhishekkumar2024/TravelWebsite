/**
 * NextAuth.js v4 Configuration
 * 
 * Replaces Supabase Auth with self-hosted authentication.
 * Supports:
 * - Google OAuth (same as before)
 * - Email/Password (via Credentials provider)
 * - Admin role checking
 * - Session stored in Neon database
 * 
 * Environment variables required:
 *   NEXTAUTH_SECRET        — Random secret for JWT signing
 *   NEXTAUTH_URL           — Your app URL (https://camelthar.com)
 *   GOOGLE_CLIENT_ID       — From Google Cloud Console
 *   GOOGLE_CLIENT_SECRET   — From Google Cloud Console
 *   NEON_DATABASE_URL      — Neon PostgreSQL connection string
 */

import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db/router';

// Extend NextAuth types to include our custom fields
declare module 'next-auth' {
    interface User {
        id: string;
        role?: string;
    }
    interface Session {
        user: {
            id: string;
            name?: string | null;
            email?: string | null;
            image?: string | null;
            role?: string;
        };
    }
}

declare module 'next-auth/jwt' {
    interface JWT {
        id: string;
        role?: string;
    }
}

export const authOptions: NextAuthOptions = {
    // ─── Providers ───────────────────────────────────────────────
    providers: [
        // Google OAuth — replaces supabase.auth.signInWithOAuth({ provider: 'google' })
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),

        // Email/Password — replaces supabase.auth.signInWithPassword()
        CredentialsProvider({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error('Email and password required');
                }

                // Look up user in our database
                const user = await db.queryOne<{
                    id: string;
                    email: string;
                    name: string;
                    password_hash: string;
                    role: string;
                    image: string;
                }>(
                    'SELECT id, email, name, password_hash, role, image FROM users WHERE email = $1',
                    [credentials.email]
                );

                if (!user) {
                    throw new Error('Invalid email or password');
                }

                if (!user.password_hash) {
                    // User signed up via Google — no password set
                    throw new Error('Please sign in with Google for this account');
                }

                // Verify password
                const isValid = await bcrypt.compare(credentials.password, user.password_hash);
                if (!isValid) {
                    throw new Error('Invalid email or password');
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role,
                };
            },
        }),
    ],

    // ─── Callbacks ───────────────────────────────────────────────
    callbacks: {
        /**
         * Sign-in callback — runs on every sign-in attempt.
         * For OAuth users, we upsert into our users table.
         */
        async signIn({ user, account }) {
            if (account?.provider === 'google') {
                try {
                    // Upsert user in our database
                    const existingUser = await db.queryOne<{
                        id: string;
                        role: string;
                    }>(
                        'SELECT id, role FROM users WHERE email = $1',
                        [user.email]
                    );

                    if (existingUser) {
                        // Update existing user's info (name, image might change)
                        await db.execute(
                            `UPDATE users SET name = $1, image = $2, updated_at = NOW() WHERE id = $3`,
                            [user.name, user.image, existingUser.id]
                        );
                        // Preserve the existing DB id so FK relationships work
                        user.id = existingUser.id;
                        user.role = existingUser.role;
                    } else {
                        // Create new user
                        const newUser = await db.executeOne<{ id: string }>(
                            `INSERT INTO users (name, email, image, role, email_verified, created_at, updated_at)
                             VALUES ($1, $2, $3, 'user', NOW(), NOW(), NOW())
                             RETURNING id`,
                            [user.name, user.email, user.image]
                        );
                        if (newUser) {
                            user.id = newUser.id;

                            // Also create an author record (matches existing ensureAuthorExists logic)
                            await db.execute(
                                `INSERT INTO authors (id, name, email, avatar_url, created_at)
                                 VALUES ($1, $2, $3, $4, NOW())
                                 ON CONFLICT (id) DO NOTHING`,
                                [newUser.id, user.name, user.email, user.image]
                            );
                        }
                    }

                    // Store the OAuth account link
                    await db.execute(
                        `INSERT INTO accounts ("userId", type, provider, "providerAccountId", access_token, refresh_token, expires_at, token_type, scope, id_token)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                         ON CONFLICT (provider, "providerAccountId") DO UPDATE SET
                           access_token = $5, refresh_token = $6, expires_at = $7`,
                        [
                            user.id,
                            account.type,
                            account.provider,
                            account.providerAccountId,
                            account.access_token || null,
                            account.refresh_token || null,
                            account.expires_at || null,
                            account.token_type || null,
                            account.scope || null,
                            account.id_token || null,
                        ]
                    );
                } catch (error) {
                    console.error('[NextAuth] Sign-in upsert error:', error);
                    // Don't block sign-in for DB errors
                }
            }

            return true;
        },

        /**
         * JWT callback — runs when JWT is created or updated.
         * We embed the user ID and role into the token.
         */
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = user.role || 'user';
            }
            return token;
        },

        /**
         * Session callback — exposes user ID and role to the client.
         * This is what `useSession()` returns.
         */
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id;
                session.user.role = token.role;
            }
            return session;
        },
    },

    // ─── Pages ───────────────────────────────────────────────────
    pages: {
        signIn: '/login',
        error: '/login',
    },

    // ─── Session Strategy ────────────────────────────────────────
    session: {
        strategy: 'jwt',
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },

    // ─── Security ────────────────────────────────────────────────
    secret: process.env.NEXTAUTH_SECRET,
};

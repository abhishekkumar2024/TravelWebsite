/**
 * NextAuth.js API Route
 * 
 * Handles all auth endpoints:
 * - /api/auth/signin
 * - /api/auth/signout
 * - /api/auth/callback/google
 * - /api/auth/callback/credentials
 * - /api/auth/session
 */

import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };

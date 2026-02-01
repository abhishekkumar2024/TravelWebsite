/**
 * Admin Utilities
 * Functions to check admin status and manage admin operations
 */

import { supabase } from './supabaseClient';

/**
 * Check if current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return false;

        const role = user.app_metadata?.role ||
            user.user_metadata?.role ||
            (user as any).raw_app_meta_data?.role ||
            user.role;

        console.log('isAdmin check:', { email: user.email, role });

        return role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

/**
 * Get current user's admin status
 */
export async function getAdminStatus(): Promise<{ isAdmin: boolean; user: any }> {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { isAdmin: false, user: null };
        }

        const role = user.user_metadata?.role ||
            user.app_metadata?.role ||
            (user as any).raw_app_meta_data?.role;

        return {
            isAdmin: role === 'admin',
            user,
        };
    } catch (error) {
        console.error('Error getting admin status:', error);
        return { isAdmin: false, user: null };
    }
}

/**
 * Fetch all blogs (admin only - bypasses RLS)
 * Admin RLS policy should allow this
 */
export async function fetchAllBlogs(): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('[admin] fetchAllBlogs error:', error.message);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('[admin] fetchAllBlogs exception:', error);
        return [];
    }
}

/**
 * Fetch blogs by status
 * Admin RLS policy should allow reading all blogs
 */
export async function fetchBlogsByStatus(status: 'pending' | 'published' | 'rejected' | 'draft'): Promise<any[]> {
    try {
        const { data, error } = await supabase
            .from('blogs')
            .select('*')
            .eq('status', status)
            .order('created_at', { ascending: false });

        if (error) {
            console.error(`[admin] fetchBlogsByStatus(${status}) error:`, error.message);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error(`[admin] fetchBlogsByStatus(${status}) exception:`, error);
        return [];
    }
}

/**
 * Get admin statistics
 */
export async function getAdminStats(): Promise<{
    total: number;
    pending: number;
    published: number;
    rejected: number;
    draft: number;
}> {
    try {
        const allBlogs = await fetchAllBlogs();

        return {
            total: allBlogs.length,
            pending: allBlogs.filter(b => b.status === 'pending').length,
            published: allBlogs.filter(b => b.status === 'published').length,
            rejected: allBlogs.filter(b => b.status === 'rejected').length,
            draft: allBlogs.filter(b => b.status === 'draft').length,
        };
    } catch (error) {
        console.error('Error getting admin stats:', error);
        return {
            total: 0,
            pending: 0,
            published: 0,
            rejected: 0,
            draft: 0,
        };
    }
}

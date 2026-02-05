import { supabase } from './supabaseClient';
import { BlogPost } from './data';
import { ensureAuthorExists } from './supabaseAuthors';

/**
 * Generate a URL-friendly slug from a title
 */
export function generateSlug(title: string): string {
    return title
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '') // Remove special characters
        .replace(/[\s_-]+/g, '-') // Replace spaces and underscores with hyphens
        .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

// Normalize a Supabase row into the existing BlogPost shape
function mapRowToBlog(row: any): BlogPost {
    return {
        id: row.id,
        title_en: row.title_en,
        title_hi: row.title_hi ?? row.title_en,
        excerpt_en: row.excerpt_en ?? '',
        excerpt_hi: row.excerpt_hi ?? row.excerpt_en ?? '',
        content_en: row.content_en ?? '',
        content_hi: row.content_hi ?? row.content_en ?? '',
        destination: row.destination ?? 'other',
        category: row.category ?? 'Travel',
        coverImage:
            row.cover_image ||
            '/images/jaipur-hawa-mahal.webp',
        images: row.images ?? [],
        author: row.authors ? {
            name: row.authors.name || row.author?.name || 'Traveler',
            avatar: row.authors.avatar_url || row.author?.avatar,
            email: row.authors.email || row.author?.email
        } : (row.author ?? { name: 'Traveler' }),
        readTime: row.read_time ?? '5 min',
        publishedAt: row.published_at ? new Date(row.published_at) : new Date(row.created_at ?? Date.now()),
        status: (row.status ?? 'published') as 'pending' | 'approved' | 'rejected',
        views: row.views ?? 0,
        // SEO Fields
        meta_title: row.meta_title ?? row.title_en,
        meta_description: row.meta_description ?? row.excerpt_en ?? '',
        focus_keyword: row.focus_keyword,
        canonical_url: row.canonical_url,
        slug: row.slug,
    };
}

export async function fetchPublishedBlogs(limit = 50): Promise<BlogPost[]> {
    const { data, error } = await supabase
        .from('blogs')
        .select('*, authors(name, avatar_url, email)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error || !data) {
        // eslint-disable-next-line no-console
        console.error('[supabaseBlogs] fetchPublishedBlogs error:', error?.message || error);
        return [];
    }

    return data.map(mapRowToBlog);
}

export async function fetchBlogById(id: string): Promise<BlogPost | null> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

    // Build query based on whether it's a UUID or a slug
    let query = supabase
        .from('blogs')
        .select('*, authors(name, avatar_url, email)');

    if (isUuid) {
        query = query.or(`id.eq.${id},slug.eq.${id}`);
    } else {
        query = query.eq('slug', id);
    }

    const { data, error } = await query.single();

    if (error) {
        // Fallback for missing slug column
        if (error.message?.includes('column "slug" does not exist')) {
            if (isUuid) {
                const { data: idData } = await supabase
                    .from('blogs')
                    .select('*, authors(name, avatar_url, email)')
                    .eq('id', id)
                    .single();
                if (idData) return mapRowToBlog(idData);
            }
            return null;
        }

        // Silent fail for non-existent slugs (expected 404 behavior)
        if (error.code === 'PGRST116') return null;

        console.error('[supabaseBlogs] fetchBlogById error:', error.message || error);
        return null;
    }

    return data ? mapRowToBlog(data) : null;
}

export async function createBlog(payload: {
    author: { name: string; email: string };
    destination: string;
    category: string;
    title_en: string;
    title_hi?: string;
    excerpt_en: string;
    excerpt_hi?: string;
    content_en: string;
    content_hi?: string;
    coverImage: string;
    images: string[];
    status?: 'draft' | 'pending' | 'published';
    // SEO Fields
    meta_title?: string;
    meta_description?: string;
    focus_keyword?: string;
    canonical_url?: string;
    slug?: string;
}): Promise<{ id: string | null; slug: string | null; error: string | null }> {
    try {
        // Ensure author exists in the 'authors' table before inserting the blog
        // This solves the "violates foreign key constraint" error
        const authorId = await ensureAuthorExists();

        if (!authorId) {
            return { id: null, slug: null, error: 'Could not verify author information' };
        }

        // Default to 'pending' for approval workflow
        const blogStatus = payload.status || 'pending';

        // Log the payload being sent (without sensitive data)
        console.log('[supabaseBlogs] Attempting to create blog with payload:', {
            title_en: payload.title_en,
            destination: payload.destination,
            category: payload.category,
            status: blogStatus,
            author_id: authorId,
            has_content: !!payload.content_en,
            images_count: payload.images?.length || 0,
        });

        const { data, error } = await supabase
            .from('blogs')
            .insert({
                slug: payload.slug || generateSlug(payload.title_en),
                title_en: payload.title_en,
                title_hi: payload.title_hi ?? payload.title_en,
                excerpt_en: payload.excerpt_en,
                excerpt_hi: payload.excerpt_hi ?? payload.excerpt_en,
                content_en: payload.content_en,
                content_hi: payload.content_hi ?? payload.content_en,
                destination: payload.destination,
                category: payload.category,
                cover_image: payload.coverImage,
                author: payload.author,
                images: payload.images,
                author_id: authorId, // Required for RLS policies
                status: blogStatus,
                created_at: new Date().toISOString(),
                published_at: blogStatus === 'published' ? new Date().toISOString() : null,
                // SEO Fields
                meta_title: payload.meta_title || payload.title_en,
                meta_description: payload.meta_description || payload.excerpt_en,
            })
            .select('id, slug')
            .single();

        if (error) {
            // eslint-disable-next-line no-console
            console.error('[supabaseBlogs] createBlog error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
            });
            return { id: null, slug: null, error: error.message || 'Unknown error' };
        }

        if (!data) {
            // eslint-disable-next-line no-console
            console.error('[supabaseBlogs] createBlog: No data returned from insert');
            return { id: null, slug: null, error: 'No data returned from database' };
        }

        console.log('[supabaseBlogs] Blog created successfully with ID:', data.id);
        return { id: data.id, slug: data.slug, error: null };
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('[supabaseBlogs] createBlog unexpected error:', err);
        return { id: null, slug: null, error: err?.message || 'Unexpected error occurred' };
    }
}

// Admin function: Fetch pending blogs for approval
export async function fetchPendingBlogs(): Promise<BlogPost[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('[supabaseBlogs] User not authenticated');
        return [];
    }

    const { data, error } = await supabase
        .from('blogs')
        .select('*, authors(name, avatar_url, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

    if (error || !data) {
        console.error('[supabaseBlogs] fetchPendingBlogs error:', error?.message || error);
        return [];
    }

    return data.map(mapRowToBlog);
}

// Admin function: Approve blog (change status to published)
export async function approveBlog(blogId: string): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await supabase
        .from('blogs')
        .update({
            status: 'published',
            published_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        })
        .eq('id', blogId)
        .select('id')
        .single();

    if (error || !data) {
        console.error('[supabaseBlogs] approveBlog error:', error?.message || error);
        return { success: false, error: error?.message || 'Failed to approve blog' };
    }

    return { success: true, error: null };
}

// Admin function: Reject blog
export async function rejectBlog(blogId: string): Promise<{ success: boolean; error: string | null }> {
    const { data, error } = await supabase
        .from('blogs')
        .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
        })
        .eq('id', blogId)
        .select('id')
        .single();

    if (error || !data) {
        console.error('[supabaseBlogs] rejectBlog error:', error?.message || error);
        return { success: false, error: error?.message || 'Failed to reject blog' };
    }

    return { success: true, error: null };
}

// Fetch all blogs submitted by the current user
export async function fetchUserBlogs(): Promise<BlogPost[]> {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        console.error('[supabaseBlogs] User not authenticated');
        return [];
    }

    const { data, error } = await supabase
        .from('blogs')
        .select('*, authors(name, avatar_url, email)')
        .eq('author_id', user.id)
        .order('created_at', { ascending: false });

    if (error || !data) {
        console.error('[supabaseBlogs] fetchUserBlogs error:', error?.message || error);
        return [];
    }

    return data.map(mapRowToBlog);
}

// Update an existing blog
export async function updateBlog(id: string, payload: {
    destination?: string;
    category?: string;
    title_en?: string;
    title_hi?: string;
    excerpt_en?: string;
    excerpt_hi?: string;
    content_en?: string;
    content_hi?: string;
    coverImage?: string;
    images?: string[];
    status?: 'draft' | 'pending' | 'published';
    meta_title?: string;
    meta_description?: string;
    focus_keyword?: string;
    canonical_url?: string;
    slug?: string;
}): Promise<{ success: boolean; error: string | null }> {
    try {
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        if (payload.title_en) updateData.title_en = payload.title_en;
        if (payload.title_hi) updateData.title_hi = payload.title_hi;
        if (payload.excerpt_en) updateData.excerpt_en = payload.excerpt_en;
        if (payload.excerpt_hi) updateData.excerpt_hi = payload.excerpt_hi;
        if (payload.content_en) updateData.content_en = payload.content_en;
        if (payload.content_hi) updateData.content_hi = payload.content_hi;
        if (payload.destination) updateData.destination = payload.destination;
        if (payload.category) updateData.category = payload.category;
        if (payload.coverImage) updateData.cover_image = payload.coverImage;
        if (payload.images) updateData.images = payload.images;
        if (payload.status) updateData.status = payload.status;

        // SEO Fields
        if (payload.meta_title) updateData.meta_title = payload.meta_title;
        if (payload.meta_description) updateData.meta_description = payload.meta_description;
        if (payload.focus_keyword) updateData.focus_keyword = payload.focus_keyword;
        if (payload.canonical_url) updateData.canonical_url = payload.canonical_url;

        // Ensure slug is updated if title changes or if explicitly provided
        if (payload.slug) {
            updateData.slug = payload.slug;
        } else if (payload.title_en) {
            updateData.slug = generateSlug(payload.title_en);
        }

        const { error } = await supabase
            .from('blogs')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('[supabaseBlogs] updateBlog error:', error.message);
            return { success: false, error: error.message };
        }

        return { success: true, error: null };
    } catch (err: any) {
        console.error('[supabaseBlogs] updateBlog unexpected error:', err);
        return { success: false, error: err?.message || 'Unexpected error' };
    }
}

// Admin function: Delete a blog permanently
export async function deleteBlog(blogId: string): Promise<{ success: boolean; error: string | null }> {
    try {
        const { error } = await supabase
            .from('blogs')
            .delete()
            .eq('id', blogId);

        if (error) {
            console.error('[supabaseBlogs] deleteBlog error:', error.message);
            return { success: false, error: error.message };
        }

        console.log('[supabaseBlogs] Blog deleted successfully:', blogId);
        return { success: true, error: null };
    } catch (err: any) {
        console.error('[supabaseBlogs] deleteBlog unexpected error:', err);
        return { success: false, error: err?.message || 'Unexpected error' };
    }
}


export async function fetchBlogCountsByDestination(): Promise<Record<string, number>> {
    const { data, error } = await supabase
        .from('blogs')
        .select('destination')
        .eq('status', 'published');

    if (error) {
        console.error('[supabaseBlogs] fetchBlogCountsByDestination error:', error.message);
        return {};
    }

    const counts: Record<string, number> = {};
    data?.forEach((blog) => {
        if (!blog.destination) return;

        // Handle comma-separated destinations
        const dests = blog.destination.toLowerCase().split(',');
        dests.forEach((d: string) => {
            const dest = d.trim();
            if (dest) {
                counts[dest] = (counts[dest] || 0) + 1;
            }
        });
    });

    return counts;
}

/**
 * Fetch related blogs by destination (Server-Side Helper)
 * Used to fix orphan pages by linking related content
 */
export async function fetchRelatedBlogs(destination: string, currentId: string): Promise<any[]> {
    if (!destination) return [];

    const destinations = destination.split(',').map(d => d.trim()).filter(Boolean);
    if (destinations.length === 0) return [];

    // Create an OR query for all destinations
    // Format: destination.ilike.%dest1%,destination.ilike.%dest2%
    const orQuery = destinations.map(d => `destination.ilike.%${d}%`).join(',');

    const { data, error } = await supabase
        .from('blogs')
        .select('slug, title_en, title_hi, cover_image, created_at')
        .eq('status', 'published')
        .or(orQuery)
        .neq('id', currentId)
        .order('created_at', { ascending: false })
        .limit(3);

    if (error) {
        console.error('[supabaseBlogs] fetchRelatedBlogs error:', error.message);
        return [];
    }

    return data || [];
}


import { supabase } from './supabaseClient';
import { BlogPost } from './data';
import { ensureAuthorExists } from './supabaseAuthors';

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
            'https://images.unsplash.com/photo-1477587458883-47145ed94245?w=800&q=60',
        images: row.images ?? [],
        author: row.author ?? { name: 'Traveler' },
        readTime: row.read_time ?? '5 min',
        publishedAt: row.published_at ? new Date(row.published_at) : new Date(row.created_at ?? Date.now()),
        status: (row.status ?? 'published') as 'pending' | 'approved' | 'rejected',
        views: row.views ?? 0,
    };
}

export async function fetchPublishedBlogs(limit = 50): Promise<BlogPost[]> {
    const { data, error } = await supabase
        .from('blogs')
        .select('*')
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
    const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        // eslint-disable-next-line no-console
        console.error('[supabaseBlogs] fetchBlogById error:', error?.message || error);
        return null;
    }

    return mapRowToBlog(data);
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
}): Promise<{ id: string | null; error: string | null }> {
    try {
        // Ensure author exists in the 'authors' table before inserting the blog
        // This solves the "violates foreign key constraint" error
        const authorId = await ensureAuthorExists();

        if (!authorId) {
            return { id: null, error: 'Could not verify author information' };
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
            })
            .select('id')
            .single();

        if (error) {
            // eslint-disable-next-line no-console
            console.error('[supabaseBlogs] createBlog error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
            });
            return { id: null, error: error.message || 'Unknown error' };
        }

        if (!data) {
            // eslint-disable-next-line no-console
            console.error('[supabaseBlogs] createBlog: No data returned from insert');
            return { id: null, error: 'No data returned from database' };
        }

        console.log('[supabaseBlogs] Blog created successfully with ID:', data.id);
        return { id: data.id, error: null };
    } catch (err: any) {
        // eslint-disable-next-line no-console
        console.error('[supabaseBlogs] createBlog unexpected error:', err);
        return { id: null, error: err?.message || 'Unexpected error occurred' };
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
        .select('*')
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


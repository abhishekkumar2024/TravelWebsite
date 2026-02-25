import { supabase } from './supabaseClient';
import { BlogPost } from './data';
import { submitToIndexNow } from './indexnow';

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
        destination: row.destination ?? 'rajasthan',
        category: row.category ?? 'Travel',
        coverImage:
            row.cover_image ||
            '/images/jaipur-hawa-mahal.webp',
        images: row.images ?? [],
        author: row.authors ? {
            id: row.authors.id,
            name: row.authors.name || row.author?.name || 'Traveler',
            avatar: row.authors.avatar_url || row.author?.avatar,
            email: row.authors.email || row.author?.email,
            bio: row.authors.bio,
            slug: row.authors.slug,
            website: row.authors.website,
            twitter: row.authors.twitter,
            instagram: row.authors.instagram,
            linkedin: row.authors.linkedin,
            youtube: row.authors.youtube
        } : (row.author ?? { name: 'Traveler' }),
        readTime: row.read_time ?? '5 min',
        publishedAt: row.published_at ? new Date(row.published_at).toISOString() : new Date(row.created_at ?? Date.now()).toISOString(),
        status: (row.status ?? 'published') as 'pending' | 'approved' | 'rejected',
        views: row.views ?? 0,
        // SEO Fields
        meta_title: row.meta_title ?? row.title_en,
        meta_description: row.meta_description ?? row.excerpt_en ?? '',

        canonical_url: row.canonical_url,
        slug: row.slug,
    };
}

export async function fetchPublishedBlogs(limit = 50): Promise<BlogPost[]> {
    const { data, error } = await supabase
        .from('blogs')
        .select('*, authors(id, name, avatar_url, email, bio, slug, website, twitter, instagram, linkedin, youtube)')
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
        .select('*, authors(id, name, avatar_url, email, bio, slug, website, twitter, instagram, linkedin, youtube)');

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
                    .select('*, authors(id, name, avatar_url, email, bio, slug, website, twitter, instagram, linkedin, youtube)')
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

export async function fetchBlogsByAuthorSlug(slug: string): Promise<BlogPost[]> {
    // First get author ID from slug
    const { data: author, error: authorError } = await supabase
        .from('authors')
        .select('id')
        .eq('slug', slug)
        .single();

    if (authorError || !author) return [];

    const { data, error } = await supabase
        .from('blogs')
        .select('*, authors(id, name, avatar_url, email, bio, slug, website, twitter, instagram, linkedin, youtube)')
        .eq('status', 'published')
        .eq('author_id', author.id)
        .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(mapRowToBlog);
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

    canonical_url?: string;
    slug?: string;
    // Performance: caller can pass authorId if already verified (avoids redundant ensureAuthorExists)
    authorId?: string;
}): Promise<{ id: string | null; slug: string | null; error: string | null }> {
    try {
        // Use provided authorId or fall back to lightweight session check
        let authorId = payload.authorId;

        if (!authorId) {
            // Lightweight: just get current session user ID instead of full ensureAuthorExists()
            // The caller (submit page) should have already called ensureAuthorExists() on login
            const { data: { session } } = await supabase.auth.getSession();
            authorId = session?.user?.id;

            if (!authorId) {
                // Last resort: try getUser() 
                const { data: { user } } = await supabase.auth.getUser();
                authorId = user?.id;
            }
        }

        if (!authorId) {
            return { id: null, slug: null, error: 'User not logged in. Please login and try again.' };
        }

        // Default to 'pending' for approval workflow
        const blogStatus = payload.status || 'pending';

        const blogSlug = payload.slug || generateSlug(payload.title_en);

        const { data, error } = await supabase
            .from('blogs')
            .insert({
                slug: blogSlug,
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
                author_id: authorId,
                status: blogStatus,
                created_at: new Date().toISOString(),
                published_at: blogStatus === 'published' ? new Date().toISOString() : null,
                // SEO Fields
                meta_title: payload.meta_title || payload.title_en,
                meta_description: payload.meta_description || payload.excerpt_en,
                // Auto-generate canonical_url from slug if not provided
                canonical_url: payload.canonical_url || `https://www.camelthar.com/blogs/${blogSlug}/`,
            })
            .select('id, slug')
            .single();

        if (error) {
            console.error('[supabaseBlogs] createBlog error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code,
            });
            return { id: null, slug: null, error: error.message || 'Unknown error' };
        }

        if (!data) {
            console.error('[supabaseBlogs] createBlog: No data returned from insert');
            return { id: null, slug: null, error: 'No data returned from database' };
        }

        console.log('[supabaseBlogs] Blog created successfully with ID:', data.id);
        return { id: data.id, slug: data.slug, error: null };
    } catch (err: any) {
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
        .select('id, slug')
        .single();

    if (error || !data) {
        console.error('[supabaseBlogs] approveBlog error:', error?.message || error);
        return { success: false, error: error?.message || 'Failed to approve blog' };
    }

    // Trigger IndexNow + Google/Bing sitemap pings for the new content
    // isNewContent=true so sitemaps get pinged for faster discovery
    if (data.slug) {
        submitToIndexNow([`https://www.camelthar.com/blogs/${data.slug}/`], true);
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
// Optimized: only sends changed fields, uses non-blocking IndexNow
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

    canonical_url?: string;
    slug?: string;
}): Promise<{ success: boolean; slug: string | null; error: string | null }> {
    try {
        const updateData: any = {
            updated_at: new Date().toISOString(),
        };

        // Use !== undefined so that empty strings and falsy values are still sent
        // This prevents skipping intentional clears (e.g., clearing a meta_title)
        if (payload.title_en !== undefined) updateData.title_en = payload.title_en;
        if (payload.title_hi !== undefined) updateData.title_hi = payload.title_hi;
        if (payload.excerpt_en !== undefined) updateData.excerpt_en = payload.excerpt_en;
        if (payload.excerpt_hi !== undefined) updateData.excerpt_hi = payload.excerpt_hi;
        if (payload.content_en !== undefined) updateData.content_en = payload.content_en;
        if (payload.content_hi !== undefined) updateData.content_hi = payload.content_hi;
        if (payload.destination !== undefined) updateData.destination = payload.destination;
        if (payload.category !== undefined) updateData.category = payload.category;
        if (payload.coverImage !== undefined) updateData.cover_image = payload.coverImage;
        if (payload.images !== undefined) updateData.images = payload.images;
        if (payload.status !== undefined) updateData.status = payload.status;

        // SEO Fields
        if (payload.meta_title !== undefined) updateData.meta_title = payload.meta_title;
        if (payload.meta_description !== undefined) updateData.meta_description = payload.meta_description;

        if (payload.canonical_url !== undefined) updateData.canonical_url = payload.canonical_url;

        // Ensure slug is updated if title changes or if explicitly provided
        if (payload.slug) {
            updateData.slug = payload.slug;
        } else if (payload.title_en) {
            updateData.slug = generateSlug(payload.title_en);
        }

        const { data: updatedRow, error } = await supabase
            .from('blogs')
            .update(updateData)
            .eq('id', id)
            .select('slug, status')
            .single();

        if (error) {
            console.error('[supabaseBlogs] updateBlog error:', error.message);
            return { success: false, slug: null, error: error.message };
        }

        // Fire-and-forget: notify indexing services (non-blocking)
        if (updatedRow?.status === 'published' && updatedRow?.slug) {
            submitToIndexNow([`https://www.camelthar.com/blogs/${updatedRow.slug}/`]).catch(() => { });
        }

        return { success: true, slug: updatedRow?.slug || null, error: null };
    } catch (err: any) {
        console.error('[supabaseBlogs] updateBlog unexpected error:', err);
        return { success: false, slug: null, error: err?.message || 'Unexpected error' };
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
        .select('slug, title_en, title_hi, cover_image, created_at, destination') // Fetch destination for scoring
        .eq('status', 'published')
        .or(orQuery)
        .neq('id', currentId)
        .order('created_at', { ascending: false })
        .limit(20); // Fetch larger pool to re-rank

    if (error) {
        console.error('[supabaseBlogs] fetchRelatedBlogs error:', error.message);
        return [];
    }

    if (!data) return [];

    // Calculate relevance score: number of matching destinations
    const sourceDests = new Set(destinations.map(d => d.toLowerCase()));

    const scoredBlogs = data.map(blog => {
        let score = 0;
        if (blog.destination) {
            const blogDests = blog.destination.split(',').map((d: string) => d.trim().toLowerCase());
            // Count intersections
            blogDests.forEach((d: string) => {
                if (sourceDests.has(d)) {
                    score++;
                }
            });
        }
        return { ...blog, score };
    });

    // Sort by relevance (score desc), then by newness (created_at desc)
    scoredBlogs.sort((a, b) => {
        if (b.score !== a.score) {
            return b.score - a.score; // Higher score first
        }
        // If scores are equal, maintain published date order (which matches original query order)
        return 0;
    });

    return scoredBlogs.slice(0, 3);
}

/**
 * Fetch all blogs for a specific destination silo page
 */
export async function fetchBlogsByDestination(destinationSlug: string): Promise<BlogPost[]> {
    const { data, error } = await supabase
        .from('blogs')
        .select('*, authors(name, avatar_url, email)')
        .eq('status', 'published')
        .ilike('destination', `%${destinationSlug}%`) // Loose match to handle "Jaipur, Rajasthan"
        .order('created_at', { ascending: false });

    if (error) {
        console.error('[supabaseBlogs] fetchBlogsByDestination error:', error.message);
        return [];
    }

    return (data || []).map(mapRowToBlog);
}


/**
 * Fetch all unique destinations that have at least one published blog
 */
export async function fetchAvailableDestinations(): Promise<string[]> {
    const { data, error } = await supabase
        .from('blogs')
        .select('destination')
        .eq('status', 'published');

    if (error) {
        console.error('[supabaseBlogs] fetchAvailableDestinations error:', error.message);
        return [];
    }

    const destinationSet = new Set<string>();

    data?.forEach(blog => {
        if (!blog.destination) return;

        // Handle comma-separated destinations and normalize
        const parts = blog.destination.split(',');
        parts.forEach((p: string) => {
            const cleanDest = p.trim().toLowerCase();
            if (cleanDest && cleanDest !== 'rajasthan') { // Optional: exclude generic state tag if desired, or keep it
                destinationSet.add(cleanDest);
            }
        });
    });

    return Array.from(destinationSet).sort();
}

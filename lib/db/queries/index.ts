/**
 * Queries Module — Public API
 * 
 * All database queries go through here.
 * Components import from '@/lib/db/queries' instead of supabase* files.
 */

// Blog CRUD
export {
    generateSlug,
    fetchPublishedBlogs,
    fetchBlogById,
    fetchBlogsByAuthorSlug,
    fetchBlogsByDestination,
    fetchRelatedBlogs,
    fetchBlogCountsByDestination,
    fetchAvailableDestinations,
    createBlog,
    updateBlog,
    fetchPendingBlogs,
    fetchUserBlogs,
    approveBlog,
    rejectBlog,
    deleteBlog,
} from './blogs';

// Author CRUD
export {
    ensureAuthorExists,
    getAuthorProfile,
    getAuthorBySlug,
    updateAuthorProfile,
} from './authors';
export type { Author } from './authors';

// Interactions (Likes + Comments)
export {
    isUuid,
    toggleLike,
    fetchLikeStatus,
    fetchLikeCount,
    fetchCommentCount,
    fetchComments,
    fetchUserCommentLikes,
    addComment,
    updateComment,
    deleteComment,
    toggleCommentLike,
} from './interactions';
export type { BlogComment } from './interactions';

// Contact
export {
    submitContactForm,
    fetchContactMessages,
    updateMessageStatus,
} from './contact';
export type { ContactMessage } from './contact';

// Products
export {
    fetchProducts,
    fetchAllProductsForAdmin,
    createProduct,
    updateProduct,
    deleteProduct,
} from './products';

// Batch operations
export {
    batchFetchLikeCounts,
    batchFetchCommentCounts,
    batchFetchLikeStatuses,
} from './batch';

// Admin
export {
    isAdmin,
    fetchAllBlogs,
    fetchBlogsByStatus,
    getAdminStats,
} from './admin';

// Counters (views, shares, etc.)
export {
    incrementBlogCounter,
} from './counters';

// TharMate (Travel Companion)
export {
    fetchTharMatePlans,
    fetchTharMatePlanById,
    fetchUserPlans,
    createTharMatePlan,
    cancelTharMatePlan,
    createJoinRequest,
    fetchPlanRequests,
    updateRequestStatus,
    checkExistingRequest,
    getActivePlanCount,
} from './tharmate';
export type { TharMatePlan, TharMateRequest } from './tharmate';

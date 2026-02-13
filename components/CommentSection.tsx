'use client';

import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import {
    fetchComments,
    addComment,
    deleteComment,
    updateComment,
    toggleCommentLike,
    fetchUserCommentLikes,
    BlogComment,
    isUuid
} from '@/lib/supabaseInteractions';
import { useLanguage } from './LanguageProvider';
import { useLoginModal } from './LoginModalContext';
import { useState, useEffect, FormEvent } from 'react';

interface CommentSectionProps {
    blogId: string;
}

export default function CommentSection({ blogId }: CommentSectionProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { t } = useLanguage();
    const { openLoginModal, pendingAction, clearPendingAction } = useLoginModal();

    const [comments, setComments] = useState<BlogComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [user, setUser] = useState<any>(null);
    const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

    // Tree Builder to organizing nested comments
    const buildCommentTree = (flatComments: BlogComment[]) => {
        const commentMap = new Map<string, BlogComment & { children: BlogComment[] }>();
        const roots: (BlogComment & { children: BlogComment[] })[] = [];

        // Init map
        flatComments.forEach(c => {
            commentMap.set(c.id, { ...c, children: [] });
        });

        // Link
        flatComments.forEach(c => {
            const node = commentMap.get(c.id);
            if (!node) return;
            if (c.parent_id && commentMap.has(c.parent_id)) {
                commentMap.get(c.parent_id)!.children.push(node);
            } else {
                roots.push(node);
            }
        });

        // Sort roots by date descending (newest on top)
        return roots.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    };

    useEffect(() => {
        const loadComments = async () => {
            try {
                const data = await fetchComments(blogId);
                setComments(data);
            } catch (err) {
                console.error('Error loading comments:', err);
            } finally {
                setLoading(false);
            }
        };

        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };

        loadComments();
        checkUser();

        // Realtime Subscription
        let channel: any;
        if (isUuid(blogId)) {
            channel = supabase
                .channel(`blog-comments-${blogId}`)
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'blog_comments', filter: `blog_id=eq.${blogId}` },
                    async () => {
                        const updated = await fetchComments(blogId);
                        setComments(updated);
                        // Re-fetch likes if needed, or rely on client state
                    }
                )
                .subscribe();
        }

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => {
            subscription.unsubscribe();
            if (channel) supabase.removeChannel(channel);
        };
    }, [blogId]);

    // Fetch user liked comments when comments or user changes
    useEffect(() => {
        if (user && comments.length > 0) {
            const ids = comments.map(c => c.id);
            // Optimization: Only fetch if ids changed or user newly logged in?
            // Simple approach: fetch always
            fetchUserCommentLikes(ids, user.id).then(setLikedComments);
        } else {
            setLikedComments(new Set());
        }
    }, [user, comments.length]); // depend on length change or user

    // Handle Pending Actions (Comment / Like Comment)
    useEffect(() => {
        if (!user || !pendingAction) return;

        // Pending Comment
        if (pendingAction.type === 'comment' && pendingAction.id === blogId && pendingAction.data?.content) {
            const { content, parentId } = pendingAction.data;
            setNewComment(content);

            // Auto-submit
            const submitPending = async () => {
                setSubmitting(true);
                const { success, data, error } = await addComment(blogId, user.id, content, parentId);
                if (success && data) {
                    setComments(prev => [data, ...prev]); // Optimistic-ish, or wait for realtime
                    setNewComment('');
                } else {
                    alert(error || 'Failed to post comment');
                }
                setSubmitting(false);
                clearPendingAction();
            };
            submitPending();
        }

        // Pending Comment Like
        if (pendingAction.type === 'like_comment' && pendingAction.id) { // id is commentId
            const commentId = pendingAction.id;
            const processLike = async () => {
                // Check if already liked logic is complex here as likedComments update is async in other effect.
                // We'll trust the user check or just try toggle.
                // Assuming we want to ensure LIKE. 
                // We'll call the internal handler.

                await handleToggleLikeInternal(commentId, user.id);
                clearPendingAction();
            };
            processLike();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, pendingAction]);

    const handlePostComment = async (e: FormEvent, content: string, parentId: string | null = null) => {
        e.preventDefault();
        if (!user) {
            openLoginModal({
                message: 'Login to post your comment',
                pendingAction: {
                    type: 'comment',
                    id: blogId,
                    data: { content, parentId },
                    returnUrl: `${pathname}?scroll=comments`
                }
            });
            return;
        }

        if (!content.trim()) return;

        setSubmitting(true);
        const { success, data, error } = await addComment(blogId, user.id, content.trim(), parentId);

        if (success && data) {
            setComments([data, ...comments]);
            if (!parentId) setNewComment(''); // clear main input
        } else {
            alert(error || 'Failed to post comment');
        }
        setSubmitting(false);
        return success;
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm(t('Are you sure?', 'क्या आप वाकई हटाना चाहते हैं?'))) return;
        const { success } = await deleteComment(commentId);
        if (success) {
            setComments(comments.filter(c => c.id !== commentId && c.parent_id !== commentId));
        }
    };

    const handleEdit = async (commentId: string, newContent: string) => {
        const { success } = await updateComment(commentId, newContent);
        if (success) {
            setComments(comments.map(c => c.id === commentId ? { ...c, content: newContent, is_edited: true, updated_at: new Date().toISOString() } : c));
        }
        return success;
    };

    const handleToggleLikeInternal = async (commentId: string, userId: string) => {
        // Optimistic Update
        const isLiked = likedComments.has(commentId);
        const newSet = new Set(likedComments);
        if (isLiked) newSet.delete(commentId);
        else newSet.add(commentId);
        setLikedComments(newSet);

        // Adjust count locally
        setComments(comments.map(c => {
            if (c.id === commentId) {
                const currentCount = c.likes?.[0]?.count || 0;
                const newCount = isLiked ? Math.max(0, currentCount - 1) : currentCount + 1;
                return { ...c, likes: [{ count: newCount }] };
            }
            return c;
        }));

        const { error } = await toggleCommentLike(commentId, userId);
        if (error) {
            // Revert on error (optional)
            console.error(error);
        }
    }

    const handleToggleLike = async (commentId: string) => {
        if (!user) {
            openLoginModal({
                message: 'Login to like this comment',
                pendingAction: { type: 'like_comment', id: commentId, returnUrl: `${pathname}?scroll=comments` }
            });
            return;
        }
        await handleToggleLikeInternal(commentId, user.id);
    };

    const rootComments = buildCommentTree(comments);

    return (
        <div className="mt-12 pt-12 border-t border-gray-100">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                {t('Comments', 'टिप्पणियाँ')}
                <span className="text-base font-normal text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                    {comments.length}
                </span>
            </h3>

            {/* Main Input */}
            <div className="mb-10">
                {!user ? (
                    <div className="relative bg-gray-50/50 rounded-xl overflow-hidden p-6 border border-gray-100">
                        {/* Blurry Background Layer */}
                        <div className="filter blur-sm select-none pointer-events-none opacity-40">
                            <div className="flex gap-4">
                                <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                                <div className="flex-1">
                                    <div className="w-full h-24 bg-white rounded-xl border border-gray-200 p-4 text-gray-400">
                                        {t('Share your thoughts...', 'अपने विचार साझा करें...')}
                                    </div>
                                    <div className="flex justify-end mt-2">
                                        <button className="px-6 py-2 bg-gray-300 text-white font-bold rounded-lg">
                                            {t('Post', 'पोस्ट करें')}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* CTA Overlay */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/30 backdrop-blur-[1px]">
                            <p className="text-gray-900 font-bold mb-2 text-lg">
                                {t('Join the conversation', 'चर्चा में शामिल हों')}
                            </p>
                            <button
                                onClick={() => openLoginModal({
                                    message: t('Login to join the discussion', 'चर्चा में शामिल होने के लिए लॉगिन करें'),
                                    pendingAction: {
                                        type: 'comment',
                                        id: blogId,
                                        returnUrl: `${pathname}?scroll=comments`
                                    }
                                })}
                                className="px-8 py-2.5 bg-royal-blue text-white rounded-full font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 transform"
                            >
                                {t('Login to Comment', 'टिप्पणी करने के लिए लॉगिन करें')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={(e) => handlePostComment(e, newComment)} className="flex gap-4">
                        <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden shrink-0">
                            {user.user_metadata?.avatar_url && <Image src={user.user_metadata.avatar_url} alt="User" width={40} height={40} />}
                        </div>
                        <div className="flex-1">
                            <textarea
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                                placeholder={t('Share your thoughts...', 'अपने विचार साझा करें...')}
                                className="w-full p-4 bg-gray-50 rounded-xl border focus:bg-white focus:border-desert-gold resize-none outline-none transition-all"
                                required
                            />
                            <div className="flex justify-end mt-2">
                                <button disabled={submitting} className="px-6 py-2 bg-desert-gold text-white font-bold rounded-lg disabled:opacity-50">
                                    {submitting ? 'Posting...' : t('Post', 'पोस्ट करें')}
                                </button>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            <div className="space-y-6">
                {rootComments.map(node => (
                    <CommentItem
                        key={node.id}
                        comment={node}
                        user={user}
                        likedComments={likedComments}
                        onReply={handlePostComment}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onLike={handleToggleLike}
                        t={t}
                    />
                ))}
            </div>
        </div>
    );
}

function CommentItem({ comment, user, likedComments, onReply, onEdit, onDelete, onLike, t, depth = 0 }: any) {
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(comment.content);
    const [replyContent, setReplyContent] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    const isAuthor = user && user.id === comment.user_id;
    const isLiked = likedComments.has(comment.id);
    const likeCount = comment.likes?.[0]?.count || 0;

    const handleSaveEdit = async () => {
        if (editContent.trim() === comment.content) {
            setIsEditing(false);
            return;
        }
        const success = await onEdit(comment.id, editContent);
        if (success) setIsEditing(false);
    };

    const handleSubmitReply = async (e: FormEvent) => {
        setSubmittingReply(true);
        const success = await onReply(e, replyContent, comment.id);
        if (success) {
            setIsReplying(false);
            setReplyContent('');
        }
        setSubmittingReply(false);
    };

    return (
        <div className={`flex gap-4 group ${depth > 0 ? 'ml-12 border-l-2 border-gray-100 pl-4' : ''}`}>
            <div className="shrink-0 w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                {comment.author?.avatar_url ? (
                    <Image src={comment.author.avatar_url} alt={comment.author.name} width={40} height={40} className="object-cover" />
                ) : (
                    <div className="flex items-center justify-center w-full h-full text-gray-500 font-bold">{comment.author?.name?.[0] || 'A'}</div>
                )}
            </div>

            <div className="flex-1">
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-900">{comment.author?.name || 'Anonymous'}</span>
                        <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleDateString()}</span>
                        {comment.is_edited && <span className="text-xs text-gray-400 italic">({t('edited', 'संपादित')})</span>}
                    </div>
                </div>

                {/* Content */}
                {isEditing ? (
                    <div className="mb-2">
                        <textarea
                            value={editContent}
                            onChange={e => setEditContent(e.target.value)}
                            className="w-full p-2 border rounded-lg bg-white"
                        />
                        <div className="flex gap-2 mt-2 justify-end">
                            <button onClick={() => setIsEditing(false)} className="text-sm text-gray-500">{t('Cancel', 'रद्द करें')}</button>
                            <button onClick={handleSaveEdit} className="text-sm bg-royal-blue text-white px-3 py-1 rounded">{t('Save', 'सहेजें')}</button>
                        </div>
                    </div>
                ) : (
                    <div className="text-gray-700 bg-gray-50/50 p-3 rounded-lg mb-2">
                        {comment.content}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-4 text-sm text-gray-500">
                    <button onClick={() => onLike(comment.id)} className={`flex items-center gap-1 hover:text-red-500 ${isLiked ? 'text-red-500 font-semibold' : ''}`}>
                        <svg className={`w-4 h-4 ${isLiked ? 'fill-current' : 'none'}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill="none">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {likeCount > 0 && likeCount} {likeCount === 0 && t('Like', 'पसंद')}
                    </button>

                    <button onClick={() => setIsReplying(!isReplying)} className="hover:text-royal-blue">
                        {t('Reply', 'उत्तर दें')}
                    </button>

                    {isAuthor && (
                        <>
                            <button onClick={() => { setIsEditing(true); setEditContent(comment.content); }} className="hover:text-royal-blue">
                                {t('Edit', 'संपादित')}
                            </button>
                            <button onClick={() => onDelete(comment.id)} className="hover:text-red-500">
                                {t('Delete', 'हटाएं')}
                            </button>
                        </>
                    )}
                </div>

                {/* Reply Input */}
                {isReplying && (
                    <div className="mt-4 flex gap-3">
                        <div className="flex-1">
                            <textarea
                                value={replyContent}
                                onChange={e => setReplyContent(e.target.value)}
                                placeholder={t('Write a reply...', 'उत्तर लिखें...')}
                                className="w-full p-2 border rounded-lg text-sm bg-white"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                                <button onClick={() => setIsReplying(false)} className="text-sm text-gray-500">{t('Cancel', 'रद्द करें')}</button>
                                <button
                                    onClick={handleSubmitReply}
                                    disabled={submittingReply || !replyContent.trim()}
                                    className="text-sm bg-desert-gold text-white px-3 py-1 rounded disabled:opacity-50"
                                >
                                    {t('Reply', 'उत्तर दें')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Nested Children */}
                {comment.children && comment.children.length > 0 && (
                    <div className="mt-4">
                        {comment.children.map((child: any) => (
                            <CommentItem
                                key={child.id}
                                comment={child}
                                depth={depth + 1}
                                user={user}
                                likedComments={likedComments}
                                onReply={onReply}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onLike={onLike}
                                t={t}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { fetchComments, addComment, deleteComment, BlogComment, isUuid } from '@/lib/supabaseInteractions';
import { useLanguage } from './LanguageProvider';
import { useState, useEffect } from 'react';

interface CommentSectionProps {
    blogId: string;
}

export default function CommentSection({ blogId }: CommentSectionProps) {
    const router = useRouter();
    const { t } = useLanguage();
    const [comments, setComments] = useState<BlogComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);

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
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
            } catch (err) {
                console.error('Error checking user:', err);
            }
        };

        loadComments();
        checkUser();

        // Realtime Subscription (only for real database blogs)
        let channel: any;
        if (isUuid(blogId)) {
            channel = supabase
                .channel(`blog-comments-${blogId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'blog_comments',
                        filter: `blog_id=eq.${blogId}`
                    },
                    async () => {
                        const updatedComments = await fetchComments(blogId);
                        setComments(updatedComments);
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
            router.push(`/login?redirectTo=${encodeURIComponent(currentPath + '?scroll=comments')}`);
            return;
        }

        if (!newComment.trim()) return;

        setSubmitting(true);
        const { success, data, error } = await addComment(blogId, user.id, newComment.trim());

        if (success && data) {
            setComments([data, ...comments]);
            setNewComment('');
        } else {
            alert(error || 'Failed to post comment');
        }
        setSubmitting(false);
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleDelete = async (commentId: string) => {
        if (!confirm(t('Are you sure you want to delete this comment?', 'क्या आप वाकई इस टिप्पणी को हटाना चाहते हैं?'))) {
            return;
        }

        setDeletingId(commentId);
        const { success, error } = await deleteComment(commentId);

        if (success) {
            setComments(comments.filter(c => c.id !== commentId));
        } else {
            alert(error || 'Failed to delete comment');
        }
        setDeletingId(null);
    };

    return (
        <div className="mt-12 pt-12 border-t border-gray-100">
            <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                {t('Comments', 'टिप्पणियाँ')}
                <span className="text-base font-normal text-gray-400 bg-gray-50 px-3 py-1 rounded-full">
                    {comments.length}
                </span>
            </h3>

            {/* Comment Form */}
            <div className="mb-10">
                {!user ? (
                    <div className="bg-sand p-6 rounded-2xl text-center">
                        <p className="text-gray-600 mb-4">
                            {t('Please login to join the conversation.', 'बातचीत में शामिल होने के लिए कृपया लॉगिन करें।')}
                        </p>
                        <button
                            onClick={() => {
                                const currentPath = typeof window !== 'undefined' ? window.location.pathname : '/';
                                router.push(`/login?redirectTo=${encodeURIComponent(currentPath + '?scroll=comments')}`);
                            }}
                            className="px-6 py-2 bg-royal-blue text-white font-semibold rounded-lg hover:bg-opacity-90 transition-all"
                        >
                            {t('Login to Comment', 'कमेंट करने के लिए लॉगिन करें')}
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex gap-4">
                            <div className="flex-shrink-0 w-10 h-10 bg-gray-200 rounded-full overflow-hidden">
                                {user.user_metadata?.avatar_url ? (
                                    <Image
                                        src={user.user_metadata.avatar_url}
                                        alt="Avatar"
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                                        {(user.user_metadata?.name || user.email || 'T').charAt(0).toUpperCase()}
                                    </div>
                                )}
                            </div>
                            <div className="flex-1">
                                <textarea
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder={t('Share your thoughts...', 'अपने विचार साझा करें...')}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent focus:border-desert-gold focus:bg-white rounded-xl transition-all resize-none min-h-[100px] outline-none"
                                    required
                                />
                                <div className="mt-2 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={submitting || !newComment.trim()}
                                        className="px-6 py-2 bg-desert-gold text-white font-bold rounded-lg hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {submitting ? t('Posting...', 'पोस्ट किया जा रहा है...') : t('Post Comment', 'कमेंट पोस्ट करें')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                )}
            </div>

            {/* Comments List */}
            <div className="space-y-8">
                {loading ? (
                    [1, 2].map((i) => (
                        <div key={i} className="flex gap-4 animate-pulse">
                            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                                <div className="h-4 bg-gray-100 rounded w-full"></div>
                                <div className="h-3 bg-gray-50 rounded w-1/5"></div>
                            </div>
                        </div>
                    ))
                ) : comments.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 italic">
                        {t('No comments yet. Be the first to share your thoughts!', 'अभी तक कोई कमेंट नहीं है। अपने विचार साझा करने वाले पहले व्यक्ति बनें!')}
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-4 group">
                            <div className="flex-shrink-0 w-10 h-10 bg-royal-blue/10 rounded-full overflow-hidden flex items-center justify-center border border-royal-blue/20">
                                {comment.author?.avatar_url ? (
                                    <Image
                                        src={comment.author.avatar_url}
                                        alt={comment.author?.name || 'User'}
                                        width={40}
                                        height={40}
                                        className="object-cover"
                                    />
                                ) : (
                                    <span className="text-royal-blue font-bold">
                                        {(comment.author?.name || 'T').charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-bold text-gray-900">{comment.author?.name || 'Anonymous Traveler'}</span>
                                        <span className="text-xs text-gray-400">•</span>
                                        <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                                    </div>
                                    {user && user.id === comment.user_id && (
                                        <button
                                            onClick={() => handleDelete(comment.id)}
                                            disabled={deletingId === comment.id}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                            title={t('Delete comment', 'टिप्पणी हटाएं')}
                                        >
                                            {deletingId === comment.id ? (
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                            )}
                                        </button>
                                    )}
                                </div>
                                <div className="text-gray-700 leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

        </div >
    );
}

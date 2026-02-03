'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { fetchComments, addComment, BlogComment } from '@/lib/supabaseInteractions';
import { useLanguage } from './LanguageProvider';
import LoginModal from './LoginModal';

interface CommentSectionProps {
    blogId: string;
}

export default function CommentSection({ blogId }: CommentSectionProps) {
    const { t } = useLanguage();
    const [comments, setComments] = useState<BlogComment[]>([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);

    useEffect(() => {
        const loadComments = async () => {
            const data = await fetchComments(blogId);
            setComments(data);
            setLoading(false);
        };

        const checkUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };

        loadComments();
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, [blogId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            setShowLoginModal(true);
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
                            onClick={() => setShowLoginModal(true)}
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
                                <div className="flex items-center gap-3 mb-1">
                                    <span className="font-bold text-gray-900">{comment.author?.name || 'Anonymous Traveler'}</span>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                                </div>
                                <div className="text-gray-700 leading-relaxed bg-gray-50/50 p-4 rounded-xl border border-gray-100 group-hover:bg-white group-hover:shadow-sm transition-all">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <LoginModal
                isOpen={showLoginModal}
                onClose={() => setShowLoginModal(false)}
                onLoginSuccess={() => setShowLoginModal(false)}
            />
        </div>
    );
}

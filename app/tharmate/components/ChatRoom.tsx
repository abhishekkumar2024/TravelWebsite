'use client';

/**
 * ChatRoom — Ephemeral Chat UI (V2)
 * 
 * Features:
 *   - Live message feed (3s polling)
 *   - Auto-scroll to bottom
 *   - Countdown timer (room expiry)
 *   - System messages (join/leave)
 *   - Rich media: emoji inserts into text, GIF/photo attaches with caption
 *   - Attachment preview before sending
 *   - Message input with enter-to-send
 *   - Image lightbox for full-size viewing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { sanitize } from '@/lib/sanitize';
import ChatMediaBar, { type ChatAttachment } from './ChatMediaBar';

interface ChatMessage {
    id: string;
    roomId: string;
    senderId: string;
    message: string;
    messageType: string;
    createdAt: string;
    senderName?: string | null;
    senderImage?: string | null;
    sender_name?: string | null;
    sender_image?: string | null;
}

interface RoomInfo {
    id: string;
    title: string;
    destination: string;
    expiresAt: string;
    currentMembers: number;
    maxMembers: number;
    isActive: boolean;
    activeMembers?: number; // Real-time count of active heartbeats
}

// ─── Helpers ────────────────────────────────────────────────────

function getInitials(name: string | null | undefined): string {
    if (!name) return '??';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
}

function getAvatarColor(name: string | null | undefined): string {
    const colors = ['#B5451B', '#5B8DB8', '#7A9E7E', '#F0A500', '#C4975A', '#E85D1B'];
    if (!name) return colors[0];
    const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

function formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

function isMediaMessage(type: string): boolean {
    return ['image', 'gif', 'photo'].includes(type);
}

function isSingleEmoji(msg: string): boolean {
    const trimmed = msg.trim();
    if (trimmed.length === 0 || trimmed.length > 14) return false;
    const withoutEmoji = trimmed.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{27BF}\u{2702}-\u{27B0}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{FE0F}\u{E0020}-\u{E007F}]/gu, '');
    return withoutEmoji.length === 0;
}

/**
 * Parse a media message that may contain a caption.
 * Format: "URL\n\nCaption text" or just "URL"
 */
function parseMediaMessage(msg: string): { url: string; caption: string | null } {
    const separatorIndex = msg.indexOf('\n\n');
    if (separatorIndex === -1) {
        return { url: msg, caption: null };
    }
    return {
        url: msg.substring(0, separatorIndex),
        caption: msg.substring(separatorIndex + 2).trim() || null,
    };
}

interface ChatRoomProps {
    roomId: string;
    session: any;
    onBack: () => void;
}

export default function ChatRoom({ roomId, session, onBack }: ChatRoomProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [roomInfo, setRoomInfo] = useState<RoomInfo | null>(null);
    const [inputValue, setInputValue] = useState('');
    const [sending, setSending] = useState(false);
    const [countdown, setCountdown] = useState({ hours: 0, minutes: 0, seconds: 0, expired: false });
    const [partnerTyping, setPartnerTyping] = useState(false);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [attachment, setAttachment] = useState<ChatAttachment | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const lastMsgIdRef = useRef<string | undefined>(undefined);
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const currentUserId = session?.user?.id;

    // ─── Scroll to bottom ───────────────────────────────────────────
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, []);

    // ─── Fetch Messages ─────────────────────────────────────────────
    const fetchMessages = useCallback(async () => {
        try {
            const url = `/api/tharmate/rooms/${roomId}/messages${lastMsgIdRef.current ? `?after=${lastMsgIdRef.current}` : ''}`;
            const res = await fetch(url);
            if (!res.ok) return;

            const data = await res.json();

            if (data.room) {
                setRoomInfo(data.room);
            }

            if (data.messages && data.messages.length > 0) {
                const newMsgs = data.messages.map((m: any) => ({
                    ...m,
                    senderName: m.senderName || m.sender_name,
                    senderImage: m.senderImage || m.sender_image,
                }));

                if (lastMsgIdRef.current) {
                    setMessages(prev => {
                        const existingIds = new Set(prev.map(m => m.id));
                        const unique = newMsgs.filter((m: ChatMessage) => !existingIds.has(m.id));
                        return [...prev, ...unique];
                    });
                } else {
                    setMessages(newMsgs);
                }

                const lastMsg = newMsgs[newMsgs.length - 1];
                if (lastMsg) lastMsgIdRef.current = lastMsg.id;

                setTimeout(scrollToBottom, 100);
            }
        } catch (err) {
            console.error('Error fetching messages:', err);
        }
    }, [roomId, scrollToBottom]);

    // ─── Polling every 3s ───────────────────────────────────────────
    useEffect(() => {
        fetchMessages();
        pollIntervalRef.current = setInterval(fetchMessages, 3000);
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [fetchMessages]);

    useEffect(() => {
        const handleVisibility = () => {
            if (document.hidden) {
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            } else {
                fetchMessages();
                pollIntervalRef.current = setInterval(fetchMessages, 3000);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        return () => document.removeEventListener('visibilitychange', handleVisibility);
    }, [fetchMessages]);

    // ─── Countdown Timer ────────────────────────────────────────────
    useEffect(() => {
        if (!roomInfo?.expiresAt) return;
        const tick = () => {
            const diff = new Date(roomInfo.expiresAt).getTime() - Date.now();
            if (diff <= 0) {
                setCountdown({ hours: 0, minutes: 0, seconds: 0, expired: true });
                return;
            }
            setCountdown({
                hours: Math.floor(diff / 3600000),
                minutes: Math.floor((diff % 3600000) / 60000),
                seconds: Math.floor((diff % 60000) / 1000),
                expired: false,
            });
        };
        tick();
        const timer = setInterval(tick, 1000);
        return () => clearInterval(timer);
    }, [roomInfo?.expiresAt]);

    // ─── Send Message ───────────────────────────────────────────────
    const handleSend = async () => {
        const hasText = inputValue.trim().length > 0;
        const hasAttachment = !!attachment;

        if ((!hasText && !hasAttachment) || sending || !currentUserId) return;

        setSending(true);
        const captionText = inputValue.trim();
        setInputValue('');

        // Determine what to send
        let msgContent: string;
        let msgType: string;

        if (hasAttachment) {
            // Media message with optional caption
            msgType = attachment.type; // 'gif' or 'image'
            if (captionText) {
                // Combine URL + caption with separator
                msgContent = `${attachment.url}\n\n${captionText}`;
            } else {
                msgContent = attachment.url;
            }
            setAttachment(null); // Clear attachment
        } else {
            // Pure text message
            msgType = isSingleEmoji(captionText) ? 'emoji' : 'text';
            msgContent = captionText;
        }

        // Optimistic message
        const optimisticMsg: ChatMessage = {
            id: `temp-${Date.now()}`,
            roomId,
            senderId: currentUserId,
            message: msgContent,
            messageType: msgType,
            createdAt: new Date().toISOString(),
            senderName: session.user.name,
            senderImage: session.user.image,
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(scrollToBottom, 50);

        try {
            const res = await fetch(`/api/tharmate/rooms/${roomId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: msgContent, messageType: msgType }),
            });

            if (res.ok) {
                const data = await res.json();
                setMessages(prev =>
                    prev.map(m => m.id === optimisticMsg.id ? { ...m, id: data.id } : m)
                );
                lastMsgIdRef.current = data.id;
            }
        } catch { } finally {
            setSending(false);
        }
    };

    // ─── Insert Emoji into text input ───────────────────────────────
    const handleInsertEmoji = useCallback((emoji: string) => {
        setInputValue(prev => prev + emoji);
        // Re-focus the input so user can keep typing
        setTimeout(() => inputRef.current?.focus(), 50);
    }, []);

    // ─── Attach media (GIF/Image) ───────────────────────────────────
    const handleAttach = useCallback((att: ChatAttachment) => {
        setAttachment(att);
        // Focus input so user can type caption
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    // ─── Remove attachment ──────────────────────────────────────────
    const removeAttachment = useCallback(() => {
        setAttachment(null);
    }, []);

    // ─── Typing Signal ──────────────────────────────────────────────
    const sendTypingSignal = useCallback(() => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            fetch(`/api/tharmate/rooms/${roomId}/typing`, { method: 'POST' }).catch(() => { });
        }, 300);
    }, [roomId]);

    useEffect(() => {
        if (!currentUserId) return;
        const partnerId = messages.find(m => m.senderId !== currentUserId && m.messageType !== 'system')?.senderId;
        if (!partnerId) return;

        const checkTyping = async () => {
            try {
                const res = await fetch(`/api/tharmate/rooms/${roomId}/typing?userId=${partnerId}`);
                if (res.ok) {
                    const data = await res.json();
                    setPartnerTyping(data.typing);
                }
            } catch { }
        };

        const interval = setInterval(checkTyping, 2000);
        return () => clearInterval(interval);
    }, [roomId, currentUserId, messages]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputValue(e.target.value);
        if (e.target.value.trim()) sendTypingSignal();
    };

    const countdownText = countdown.expired
        ? 'Expired'
        : `${countdown.hours}h ${countdown.minutes}m ${countdown.seconds}s`;

    // ─── Render Message Content ─────────────────────────────────────
    const renderMessageContent = (msg: ChatMessage) => {
        const type = msg.messageType;

        // Emoji-only message (big)
        if (type === 'emoji' || (type === 'text' && isSingleEmoji(msg.message))) {
            return (
                <span className="tm-chat-emoji-msg">{msg.message}</span>
            );
        }

        // GIF message (may have caption)
        if (type === 'gif') {
            const { url, caption } = parseMediaMessage(msg.message);
            return (
                <div className="tm-chat-media-content">
                    <div className="tm-chat-gif-msg">
                        <img src={url} alt="GIF" loading="lazy" />
                    </div>
                    {caption && (
                        <p className="tm-chat-caption">{sanitize(caption)}</p>
                    )}
                </div>
            );
        }

        // Image / Photo message (may have caption)
        if (type === 'image' || type === 'photo') {
            const { url, caption } = parseMediaMessage(msg.message);
            return (
                <div className="tm-chat-media-content">
                    <div className="tm-chat-image-msg" onClick={() => setImagePreview(url)}>
                        <img src={url} alt="Shared photo" loading="lazy" />
                    </div>
                    {caption && (
                        <p className="tm-chat-caption">{sanitize(caption)}</p>
                    )}
                </div>
            );
        }

        // Text (default)
        return <>{sanitize(msg.message)}</>;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-180px)] max-h-[700px]">
            {/* Room Header */}
            <div className="flex items-center gap-3 pb-3 border-b border-gray-200 mb-3">
                <button
                    onClick={onBack}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 text-gray-800 hover:bg-[#C4975A]/20 transition-all"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-800 truncate leading-tight">
                        {roomInfo?.title || 'Loading...'}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-gray-500">
                            {roomInfo?.destination} · {roomInfo?.currentMembers}/{roomInfo?.maxMembers}
                        </p>
                        {roomInfo?.activeMembers !== undefined && (
                            <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-green-50 rounded-md border border-green-100">
                                <span className="flex w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_4px_rgba(34,197,94,0.4)]" />
                                <span className="text-[9px] font-bold text-green-700 uppercase tracking-tight">
                                    {roomInfo.activeMembers} ONLINE
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono
                    ${countdown.expired
                        ? 'bg-red-900/20 text-red-400 border border-red-500/20'
                        : countdown.hours === 0 && countdown.minutes < 10
                            ? 'bg-orange-500/15 text-orange-600 border border-[#E85D1B]/25 animate-pulse'
                            : 'bg-gray-100 text-gray-600 border border-gray-200'
                    }`}
                >
                    <span>⏳</span>
                    <span>{countdownText}</span>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-hide">
                {messages.length === 0 && (
                    <div className="text-center py-12">
                        <div className="text-3xl mb-2">🏕️</div>
                        <p className="text-sm text-gray-500">The campfire is ready. Start the conversation!</p>
                    </div>
                )}

                {messages.map(msg => {
                    const isSystem = msg.messageType === 'system';
                    const isOwn = msg.senderId === currentUserId;
                    const name = msg.senderName || msg.sender_name;
                    const image = msg.senderImage || msg.sender_image;
                    const isMedia = isMediaMessage(msg.messageType);
                    const isEmoji = msg.messageType === 'emoji' || (msg.messageType === 'text' && isSingleEmoji(msg.message));

                    if (isSystem) {
                        return (
                            <div key={msg.id} className="text-center py-1">
                                <span className="text-[10px] text-gray-400 bg-[#C4975A]/5 px-2 py-0.5 rounded-full">
                                    {name || 'Someone'} {sanitize(msg.message)}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                            {!isOwn && (
                                <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                                    style={{ background: `linear-gradient(135deg, ${getAvatarColor(name)}, ${getAvatarColor(name)}88)` }}
                                >
                                    {image ? (
                                        <img src={image} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        getInitials(name)
                                    )}
                                </div>
                            )}

                            <div className={`max-w-[75%] ${isOwn ? 'ml-auto' : ''}`}>
                                {!isOwn && (
                                    <p className="text-[10px] text-gray-500 mb-0.5 ml-1">{name || 'Traveler'}</p>
                                )}
                                <div className={`
                                    ${isEmoji
                                        ? 'bg-transparent p-0'
                                        : isMedia
                                            ? `rounded-2xl overflow-hidden border border-gray-100 ${isOwn ? 'rounded-br-md' : 'rounded-bl-md'}`
                                            : `px-3 py-2 rounded-2xl text-[13px] leading-relaxed
                                               ${isOwn
                                                ? 'bg-[#5B8DB8]/20 text-gray-800 rounded-br-md'
                                                : 'bg-gray-50 border border-gray-100 text-gray-800/90 rounded-bl-md'
                                            }`
                                    }
                                `}>
                                    {renderMessageContent(msg)}
                                </div>
                                <p className={`text-[9px] text-gray-400 mt-0.5 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}>
                                    {formatTime(msg.createdAt)}
                                </p>
                            </div>
                        </div>
                    );
                })}

                {partnerTyping && (
                    <div className="flex gap-2 items-center py-1">
                        <div className="w-7 h-7 rounded-full bg-[#C4975A]/15 flex items-center justify-center text-[10px]">💬</div>
                        <div className="px-3 py-2 bg-gray-50 border border-gray-100 rounded-2xl rounded-bl-md">
                            <div className="flex gap-1 items-center h-4">
                                <span className="w-1.5 h-1.5 bg-[#C4975A] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1.5 h-1.5 bg-[#C4975A] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1.5 h-1.5 bg-[#C4975A] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* ─── Input Area ─── */}
            {countdown.expired ? (
                <div className="mt-3 py-3 text-center bg-red-900/10 border border-red-500/15 rounded-xl">
                    <p className="text-sm text-red-400">🌅 This room has vanished like a desert sunset</p>
                </div>
            ) : !currentUserId ? (
                <div className="mt-3 py-3 text-center bg-gray-50 border border-gray-200 rounded-xl">
                    <p className="text-sm text-gray-500">Login to chat</p>
                </div>
            ) : (
                <div className="mt-3">
                    {/* Attachment Preview */}
                    {attachment && (
                        <div className="tm-attachment-preview">
                            <div className="tm-attachment-thumb">
                                <img
                                    src={attachment.previewUrl || attachment.url}
                                    alt={attachment.type === 'gif' ? 'GIF' : 'Photo'}
                                />
                                {attachment.type === 'gif' && (
                                    <span className="tm-attachment-badge">GIF</span>
                                )}
                            </div>
                            <div className="tm-attachment-info">
                                <span className="tm-attachment-label">
                                    {attachment.type === 'gif' ? '🎞️ GIF attached' : '📷 Photo attached'}
                                </span>
                                <span className="tm-attachment-hint">
                                    Add a message and press send, or just press send
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={removeAttachment}
                                className="tm-attachment-remove"
                                title="Remove attachment"
                            >
                                ✕
                            </button>
                        </div>
                    )}

                    {/* Media Toolbar */}
                    <ChatMediaBar
                        onInsertEmoji={handleInsertEmoji}
                        onAttach={handleAttach}
                        disabled={sending || countdown.expired}
                    />

                    {/* Text Input Row */}
                    <div className="flex items-center gap-2 mt-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={attachment ? 'Add a caption...' : 'Type a message...'}
                            maxLength={500}
                            className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-[13px] text-gray-900 placeholder-gray-400/50 focus:outline-none focus:ring-1 focus:ring-[#5B8DB8]/30"
                        />
                        <button
                            onClick={handleSend}
                            disabled={(!inputValue.trim() && !attachment) || sending}
                            className="w-10 h-10 flex items-center justify-center bg-[#5B8DB8] rounded-xl text-white hover:bg-[#5B8DB8]/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Image Lightbox ─── */}
            {imagePreview && (
                <div
                    className="tm-image-lightbox"
                    onClick={() => setImagePreview(null)}
                >
                    <button
                        className="tm-lightbox-close"
                        onClick={() => setImagePreview(null)}
                    >
                        ✕
                    </button>
                    <img src={imagePreview} alt="Full size" onClick={(e) => e.stopPropagation()} />
                </div>
            )}
        </div>
    );
}

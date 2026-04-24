'use client';

/**
 * MemoryCapsule â€” Read-Only View of Expired Desert Rooms
 * 
 * When a room expires, it becomes a "Memory Capsule" â€” a locked,
 * nostalgic view of the conversation that happened.
 * 
 * Features:
 *   - Read-only message display
 *   - Room metadata (title, destination, duration, members)
 *   - "Sealed" visual state (locked padlock, dimmed)
 *   - Timestamps of messages
 */

import { useState, useEffect } from 'react';
import { sanitize } from '@/lib/sanitize';

interface CapsuleMessage {
    id: string;
    senderId: string;
    message: string;
    messageType: string;
    createdAt: string;
    senderName?: string | null;
    senderImage?: string | null;
    sender_name?: string | null;
    sender_image?: string | null;
}

interface MemoryCapsuleProps {
    roomId: string;
    onBack: () => void;
}

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

function formatDateTime(date: string): string {
    return new Date(date).toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-IN', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });
}

export default function MemoryCapsule({ roomId, onBack }: MemoryCapsuleProps) {
    const [messages, setMessages] = useState<CapsuleMessage[]>([]);
    const [room, setRoom] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchCapsule = async () => {
            try {
                // Fetch room details
                const roomRes = await fetch(`/api/tharmate/rooms/${roomId}`);
                if (roomRes.ok) {
                    const roomData = await roomRes.json();
                    setRoom(roomData.room);
                }

                // Fetch messages (DB only â€” Redis messages are cleaned on expiry)
                const msgRes = await fetch(`/api/tharmate/rooms/${roomId}/messages`);
                if (msgRes.ok) {
                    const msgData = await msgRes.json();
                    setMessages(
                        (msgData.messages || []).map((m: any) => ({
                            ...m,
                            senderName: m.senderName || m.sender_name,
                            senderImage: m.senderImage || m.sender_image,
                        }))
                    );
                }
            } catch (err) {
                console.error('Error loading memory capsule:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchCapsule();
    }, [roomId]);

    if (loading) {
        return (
            <div className="text-center py-16">
                <div className="text-3xl mb-3 animate-pulse">ðŸ”®</div>
                <p className="text-sm text-gray-500">Opening memory capsule...</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto">
            {/* Sealed Header */}
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-gradient-to-b from-[#C4975A]/5 to-transparent rounded-xl" />
                <div className="relative bg-gradient-to-br from-[#1A1008] to-[#1F1508] border border-gray-200 rounded-xl p-5">
                    {/* Back + Seal Badge */}
                    <div className="flex items-center justify-between mb-3">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back
                        </button>
                        <span className="flex items-center gap-1.5 text-[11px] text-gray-600/70 bg-[#C4975A]/5 border border-gray-100 px-2.5 py-1 rounded-full">
                            <span>ðŸ”’</span> Sealed Memory
                        </span>
                    </div>

                    {/* Room Info */}
                    <div className="text-center">
                        <div className="text-3xl mb-2">ðŸº</div>
                        <h3 className="text-lg font-bold text-gray-800">
                            {room?.title || 'Desert Room'}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                            ðŸ“ {room?.destination || 'Rajasthan'} Â· {messages.length} messages
                        </p>
                        {room?.createdAt && room?.expiresAt && (
                            <p className="text-[11px] text-gray-400 mt-2">
                                {formatDate(room.createdAt)} â€” {formatDate(room.expiresAt)}
                            </p>
                        )}
                    </div>

                    {/* Sealed Divider */}
                    <div className="flex items-center gap-3 mt-4">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C4975A]/20 to-transparent" />
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">Conversation Archive</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-[#C4975A]/20 to-transparent" />
                    </div>
                </div>
            </div>

            {/* Messages (read-only) */}
            <div className="space-y-2 opacity-85">
                {messages.length === 0 && (
                    <div className="text-center py-8">
                        <p className="text-sm text-gray-400">This capsule is empty â€” the conversation was lost to the desert winds.</p>
                    </div>
                )}

                {messages.map(msg => {
                    const isSystem = msg.messageType === 'system';
                    const name = msg.senderName || msg.sender_name;
                    const image = msg.senderImage || msg.sender_image;

                    if (isSystem) {
                        return (
                            <div key={msg.id} className="text-center py-1">
                                <span className="text-[10px] text-gray-400 bg-[#C4975A]/5 px-2 py-0.5 rounded-full">
                                    {sanitize(msg.message)}
                                </span>
                            </div>
                        );
                    }

                    return (
                        <div key={msg.id} className="flex gap-2.5 group">
                            {/* Avatar */}
                            <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 opacity-70"
                                style={{ background: `linear-gradient(135deg, ${getAvatarColor(name)}, ${getAvatarColor(name)}88)` }}
                            >
                                {image ? (
                                    <img src={image} alt="" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    getInitials(name)
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[11px] font-semibold text-gray-800/70">
                                        {name || 'Traveler'}
                                    </span>
                                    <span className="text-[9px] text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {formatDateTime(msg.createdAt)}
                                    </span>
                                </div>
                                <p className="text-[13px] text-gray-800/50 leading-relaxed mt-0.5">
                                    {sanitize(msg.message)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer */}
            <div className="mt-6 py-4 text-center border-t border-gray-100">
                <p className="text-[11px] text-gray-400 italic">
                    ðŸŒ… This conversation vanished like a desert sunset â€” kept as a memory.
                </p>
            </div>
        </div>
    );
}

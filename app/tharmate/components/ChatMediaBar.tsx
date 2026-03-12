'use client';

/**
 * ChatMediaBar — Rich Media Toolbar for Chat (V2)
 * 
 * Redesigned behavior:
 *   - 😊 Emoji: INSERTS into text input (mix text + emoji in one message)
 *   - 🎞️ GIF: Attaches as preview, user can add caption, sends together
 *   - 📷 Photo Upload: Attaches as preview with caption
 *   - 📸 Camera: Capture → attach → send with caption
 * 
 * Both Emoji and GIF panels have SEARCH functionality.
 */

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { uploadChatImage } from '@/lib/upload';

// ─── Emoji Data with search keywords ────────────────────────────

const EMOJI_DATA: { emoji: string; keywords: string[] }[] = [
    // Smileys
    { emoji: '😀', keywords: ['grin', 'smile', 'happy'] },
    { emoji: '😃', keywords: ['smile', 'happy', 'joy'] },
    { emoji: '😄', keywords: ['smile', 'happy', 'laugh'] },
    { emoji: '😁', keywords: ['grin', 'smile', 'beam'] },
    { emoji: '😆', keywords: ['laugh', 'lol', 'haha'] },
    { emoji: '😅', keywords: ['sweat', 'smile', 'nervous'] },
    { emoji: '🤣', keywords: ['rofl', 'laugh', 'lol', 'haha'] },
    { emoji: '😂', keywords: ['cry', 'laugh', 'lol', 'tears', 'haha'] },
    { emoji: '🙂', keywords: ['smile', 'okay'] },
    { emoji: '😉', keywords: ['wink'] },
    { emoji: '😊', keywords: ['blush', 'smile', 'happy'] },
    { emoji: '😇', keywords: ['angel', 'innocent', 'halo'] },
    { emoji: '🥰', keywords: ['love', 'heart', 'adore'] },
    { emoji: '😍', keywords: ['love', 'heart', 'eyes'] },
    { emoji: '🤩', keywords: ['star', 'wow', 'amazing'] },
    { emoji: '😘', keywords: ['kiss', 'love', 'blow'] },
    { emoji: '😗', keywords: ['kiss'] },
    { emoji: '😚', keywords: ['kiss', 'blush'] },
    { emoji: '😙', keywords: ['kiss', 'smile'] },
    { emoji: '🥲', keywords: ['smile', 'tear', 'sad'] },
    { emoji: '😋', keywords: ['yummy', 'delicious', 'food', 'tasty'] },
    { emoji: '😛', keywords: ['tongue', 'silly'] },
    { emoji: '😜', keywords: ['wink', 'tongue', 'silly', 'crazy'] },
    { emoji: '🤪', keywords: ['crazy', 'silly', 'wild'] },
    { emoji: '😝', keywords: ['tongue', 'silly', 'squint'] },
    { emoji: '🤑', keywords: ['money', 'rich', 'dollar'] },
    { emoji: '🤗', keywords: ['hug', 'open', 'hands'] },
    { emoji: '🤭', keywords: ['oops', 'cover', 'giggle'] },
    { emoji: '🤫', keywords: ['shh', 'quiet', 'secret'] },
    { emoji: '🤔', keywords: ['think', 'hmm', 'wonder'] },
    { emoji: '😐', keywords: ['neutral', 'meh'] },
    { emoji: '😑', keywords: ['expressionless', 'meh'] },
    { emoji: '😶', keywords: ['silent', 'mute', 'speechless'] },
    { emoji: '😏', keywords: ['smirk', 'flirt'] },
    { emoji: '😒', keywords: ['unamused', 'bored', 'annoyed'] },
    { emoji: '🙄', keywords: ['eye', 'roll', 'whatever'] },
    { emoji: '😬', keywords: ['grimace', 'awkward', 'cringe'] },
    { emoji: '😌', keywords: ['relieved', 'calm', 'peaceful'] },
    { emoji: '😔', keywords: ['sad', 'pensive', 'down'] },
    { emoji: '😪', keywords: ['sleepy', 'tired'] },
    { emoji: '😴', keywords: ['sleep', 'zzz', 'tired'] },
    { emoji: '😷', keywords: ['mask', 'sick', 'covid'] },
    { emoji: '🤒', keywords: ['sick', 'fever', 'ill'] },
    { emoji: '🤕', keywords: ['hurt', 'injured', 'bandage'] },
    { emoji: '🤢', keywords: ['nausea', 'sick', 'green'] },
    { emoji: '🤮', keywords: ['vomit', 'sick', 'puke'] },
    { emoji: '🥵', keywords: ['hot', 'heat', 'sweat'] },
    { emoji: '🥶', keywords: ['cold', 'freeze', 'ice'] },
    { emoji: '🤯', keywords: ['mind', 'blown', 'explode', 'shock'] },
    { emoji: '😎', keywords: ['cool', 'sunglasses', 'awesome'] },
    { emoji: '😱', keywords: ['scream', 'shock', 'scared'] },
    { emoji: '😨', keywords: ['fear', 'scared', 'shock'] },
    { emoji: '😰', keywords: ['anxious', 'nervous', 'sweat'] },
    { emoji: '😥', keywords: ['sad', 'disappointed', 'relieved'] },
    { emoji: '😢', keywords: ['cry', 'sad', 'tear'] },
    { emoji: '😭', keywords: ['cry', 'sob', 'sad', 'tears'] },
    { emoji: '🥺', keywords: ['please', 'puppy', 'beg', 'cute'] },
    { emoji: '😤', keywords: ['angry', 'huff', 'frustrated'] },
    { emoji: '😡', keywords: ['angry', 'rage', 'mad'] },
    { emoji: '🤬', keywords: ['swear', 'angry', 'curse'] },
    // Gestures / Hands / Hearts
    { emoji: '👋', keywords: ['wave', 'hello', 'bye', 'hi'] },
    { emoji: '🤚', keywords: ['hand', 'stop', 'raised'] },
    { emoji: '✋', keywords: ['hand', 'stop', 'high five'] },
    { emoji: '👌', keywords: ['ok', 'perfect', 'nice', 'good'] },
    { emoji: '✌️', keywords: ['peace', 'victory', 'v'] },
    { emoji: '🤞', keywords: ['fingers', 'crossed', 'luck'] },
    { emoji: '🤟', keywords: ['love', 'rock'] },
    { emoji: '🤘', keywords: ['rock', 'metal', 'horns'] },
    { emoji: '🤙', keywords: ['call', 'shaka', 'hang'] },
    { emoji: '👈', keywords: ['left', 'point'] },
    { emoji: '👉', keywords: ['right', 'point'] },
    { emoji: '👆', keywords: ['up', 'point'] },
    { emoji: '👇', keywords: ['down', 'point'] },
    { emoji: '👍', keywords: ['thumbs', 'up', 'yes', 'good', 'like'] },
    { emoji: '👎', keywords: ['thumbs', 'down', 'no', 'bad', 'dislike'] },
    { emoji: '✊', keywords: ['fist', 'punch', 'fight'] },
    { emoji: '👊', keywords: ['punch', 'fist', 'bump'] },
    { emoji: '👏', keywords: ['clap', 'applause', 'bravo'] },
    { emoji: '🙌', keywords: ['celebrate', 'hands', 'raise'] },
    { emoji: '🤝', keywords: ['handshake', 'deal', 'agree'] },
    { emoji: '🙏', keywords: ['pray', 'please', 'thanks', 'namaste', 'hope'] },
    { emoji: '💪', keywords: ['strong', 'muscle', 'flex', 'power'] },
    { emoji: '❤️', keywords: ['love', 'heart', 'red'] },
    { emoji: '🧡', keywords: ['love', 'heart', 'orange'] },
    { emoji: '💛', keywords: ['love', 'heart', 'yellow'] },
    { emoji: '💚', keywords: ['love', 'heart', 'green'] },
    { emoji: '💙', keywords: ['love', 'heart', 'blue'] },
    { emoji: '💜', keywords: ['love', 'heart', 'purple'] },
    { emoji: '🖤', keywords: ['love', 'heart', 'black'] },
    { emoji: '💔', keywords: ['broken', 'heart', 'sad'] },
    { emoji: '💯', keywords: ['hundred', 'perfect', 'score'] },
    { emoji: '💥', keywords: ['boom', 'explosion', 'bang'] },
    { emoji: '🔥', keywords: ['fire', 'hot', 'lit', 'flame'] },
    { emoji: '✨', keywords: ['sparkle', 'star', 'magic', 'shine'] },
    { emoji: '💖', keywords: ['love', 'heart', 'sparkle'] },
    { emoji: '💫', keywords: ['dizzy', 'star', 'wow'] },
    // Travel & Desert
    { emoji: '🏜️', keywords: ['desert', 'sand', 'dune'] },
    { emoji: '🐪', keywords: ['camel', 'desert', 'hump'] },
    { emoji: '🐫', keywords: ['camel', 'desert', 'two'] },
    { emoji: '🌅', keywords: ['sunrise', 'sunset', 'view'] },
    { emoji: '🌄', keywords: ['sunrise', 'mountain', 'dawn'] },
    { emoji: '⛺', keywords: ['tent', 'camp', 'outdoor'] },
    { emoji: '🏕️', keywords: ['camping', 'tent', 'outdoor'] },
    { emoji: '🗺️', keywords: ['map', 'world', 'travel'] },
    { emoji: '🧭', keywords: ['compass', 'direction', 'navigate'] },
    { emoji: '🏔️', keywords: ['mountain', 'snow', 'peak'] },
    { emoji: '⛰️', keywords: ['mountain', 'hill'] },
    { emoji: '🌵', keywords: ['cactus', 'desert', 'plant'] },
    { emoji: '🦎', keywords: ['lizard', 'gecko', 'desert'] },
    { emoji: '🦂', keywords: ['scorpion', 'desert', 'danger'] },
    { emoji: '🦅', keywords: ['eagle', 'bird', 'fly'] },
    { emoji: '🌞', keywords: ['sun', 'bright', 'sunny'] },
    { emoji: '🌙', keywords: ['moon', 'night', 'crescent'] },
    { emoji: '⭐', keywords: ['star', 'favorite', 'shine'] },
    { emoji: '🌠', keywords: ['shooting', 'star', 'wish'] },
    { emoji: '🏖️', keywords: ['beach', 'sun', 'umbrella'] },
    { emoji: '🏝️', keywords: ['island', 'palm', 'tropical'] },
    { emoji: '✈️', keywords: ['plane', 'airplane', 'fly', 'travel'] },
    { emoji: '🚗', keywords: ['car', 'drive', 'road'] },
    { emoji: '🏍️', keywords: ['motorcycle', 'bike', 'ride'] },
    { emoji: '🚌', keywords: ['bus', 'tour', 'travel'] },
    { emoji: '🚁', keywords: ['helicopter', 'chopper'] },
    { emoji: '📸', keywords: ['camera', 'photo', 'picture'] },
    { emoji: '🎒', keywords: ['backpack', 'travel', 'bag'] },
    { emoji: '🧳', keywords: ['luggage', 'suitcase', 'travel'] },
    { emoji: '🎉', keywords: ['party', 'celebrate', 'tada'] },
    { emoji: '🎊', keywords: ['confetti', 'party', 'celebrate'] },
    { emoji: '🏰', keywords: ['castle', 'fort', 'palace'] },
    { emoji: '🕌', keywords: ['mosque', 'islam', 'prayer'] },
    { emoji: '🛕', keywords: ['temple', 'hindu', 'prayer'] },
    { emoji: '🗿', keywords: ['statue', 'moai', 'stone'] },
    { emoji: '🏛️', keywords: ['museum', 'building', 'pillar'] },
    { emoji: '🌊', keywords: ['wave', 'ocean', 'sea', 'water'] },
    // Nature
    { emoji: '🌿', keywords: ['herb', 'leaf', 'green', 'nature'] },
    { emoji: '🌲', keywords: ['tree', 'evergreen', 'pine'] },
    { emoji: '🌴', keywords: ['palm', 'tree', 'tropical'] },
    { emoji: '🌻', keywords: ['sunflower', 'flower'] },
    { emoji: '🌺', keywords: ['hibiscus', 'flower', 'pink'] },
    { emoji: '🌹', keywords: ['rose', 'flower', 'red', 'love'] },
    { emoji: '🌸', keywords: ['cherry', 'blossom', 'flower', 'spring'] },
    { emoji: '🌈', keywords: ['rainbow', 'colorful'] },
    { emoji: '☀️', keywords: ['sun', 'sunny', 'bright', 'hot'] },
    { emoji: '🐘', keywords: ['elephant', 'animal', 'big'] },
    { emoji: '🦒', keywords: ['giraffe', 'animal', 'tall'] },
    { emoji: '🐆', keywords: ['leopard', 'animal', 'wild'] },
    { emoji: '🐅', keywords: ['tiger', 'animal', 'wild'] },
    { emoji: '🦁', keywords: ['lion', 'animal', 'king'] },
    { emoji: '🐒', keywords: ['monkey', 'animal'] },
    { emoji: '🦋', keywords: ['butterfly', 'insect', 'pretty'] },
    // Food & Drink
    { emoji: '🍕', keywords: ['pizza', 'food', 'slice'] },
    { emoji: '🍔', keywords: ['burger', 'hamburger', 'food'] },
    { emoji: '🌮', keywords: ['taco', 'food', 'mexican'] },
    { emoji: '🍛', keywords: ['curry', 'food', 'indian', 'rice'] },
    { emoji: '🍜', keywords: ['noodles', 'ramen', 'food'] },
    { emoji: '🍣', keywords: ['sushi', 'food', 'japanese'] },
    { emoji: '🍱', keywords: ['bento', 'food', 'box'] },
    { emoji: '🥘', keywords: ['pot', 'food', 'stew', 'cooking'] },
    { emoji: '🧁', keywords: ['cupcake', 'sweet', 'dessert'] },
    { emoji: '🍰', keywords: ['cake', 'sweet', 'dessert', 'shortcake'] },
    { emoji: '🎂', keywords: ['birthday', 'cake', 'celebration'] },
    { emoji: '🍩', keywords: ['donut', 'sweet', 'dessert'] },
    { emoji: '☕', keywords: ['coffee', 'tea', 'hot', 'drink', 'chai'] },
    { emoji: '🍵', keywords: ['tea', 'matcha', 'green', 'drink', 'chai'] },
    { emoji: '🧋', keywords: ['boba', 'bubble', 'tea', 'drink'] },
    { emoji: '🍺', keywords: ['beer', 'drink', 'alcohol'] },
    { emoji: '🍉', keywords: ['watermelon', 'fruit', 'summer'] },
    { emoji: '🍇', keywords: ['grapes', 'fruit', 'wine'] },
    { emoji: '🍓', keywords: ['strawberry', 'fruit', 'red'] },
    { emoji: '🍊', keywords: ['orange', 'fruit', 'tangerine'] },
];

// Category icons for tabbed browsing (no search)
const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
    {
        label: 'Smileys', icon: '😊',
        emojis: EMOJI_DATA.slice(0, 62).map(e => e.emoji),
    },
    {
        label: 'Gestures', icon: '👋',
        emojis: EMOJI_DATA.slice(62, 100).map(e => e.emoji),
    },
    {
        label: 'Travel', icon: '🏜️',
        emojis: EMOJI_DATA.slice(100, 138).map(e => e.emoji),
    },
    {
        label: 'Nature', icon: '🌿',
        emojis: EMOJI_DATA.slice(138, 155).map(e => e.emoji),
    },
    {
        label: 'Food', icon: '🍕',
        emojis: EMOJI_DATA.slice(155).map(e => e.emoji),
    },
];

// ─── GIF Data with search keywords ──────────────────────────────

const CURATED_GIFS: { label: string; url: string; keywords: string[] }[] = [
    { label: 'Happy Dance', url: 'https://media.tenor.com/On7kvXhzml4AAAAi/excited-cute.gif', keywords: ['happy', 'dance', 'excited', 'joy', 'celebrate'] },
    { label: 'Thumbs Up', url: 'https://media.tenor.com/v-Bq90YgGEIAAAAi/thumbs-up-joypixels.gif', keywords: ['thumbs', 'up', 'yes', 'good', 'ok', 'agree', 'like'] },
    { label: 'Thank You', url: 'https://media.tenor.com/3lm8PdZPVPYAAAAi/thank-you-thanks.gif', keywords: ['thank', 'thanks', 'grateful', 'appreciate'] },
    { label: 'LOL', url: 'https://media.tenor.com/U6dMlnu41fUAAAAi/rofl-laugh.gif', keywords: ['lol', 'laugh', 'rofl', 'funny', 'haha'] },
    { label: 'Wave Hello', url: 'https://media.tenor.com/RIsNBfz2JvMAAAAi/hi-wave.gif', keywords: ['wave', 'hi', 'hello', 'hey', 'greet'] },
    { label: 'Heart Love', url: 'https://media.tenor.com/m5DJsfVWbicAAAAi/heart-love.gif', keywords: ['heart', 'love', 'romance', 'cute'] },
    { label: 'Fire', url: 'https://media.tenor.com/bRptFj3jfO8AAAAi/fire-hot.gif', keywords: ['fire', 'hot', 'lit', 'flame', 'burn'] },
    { label: 'Clap', url: 'https://media.tenor.com/qo16OFZzjUoAAAAi/clap-clapping.gif', keywords: ['clap', 'applause', 'bravo', 'well done', 'congrats'] },
    { label: 'Cool', url: 'https://media.tenor.com/fvMq1hSc5ksAAAAi/cool-emoji.gif', keywords: ['cool', 'awesome', 'sunglasses', 'chill'] },
    { label: 'Party', url: 'https://media.tenor.com/LB_mJLaChiUAAAAi/party-confetti.gif', keywords: ['party', 'celebrate', 'confetti', 'birthday', 'yay'] },
    { label: 'Crying', url: 'https://media.tenor.com/GHYi8xUQnuAAAAAi/sad-emotional.gif', keywords: ['cry', 'sad', 'tears', 'emotional', 'sob'] },
    { label: 'Mind Blown', url: 'https://media.tenor.com/odyVsZbC-FUAAAAC/mind-blown.gif', keywords: ['mind', 'blown', 'shock', 'wow', 'explode', 'amaze'] },
    { label: 'Wow', url: 'https://media.tenor.com/2dZp-Jrm9eAAAAAi/shocked-face.gif', keywords: ['wow', 'shock', 'surprised', 'omg', 'what'] },
    { label: 'Yes', url: 'https://media.tenor.com/afh_QLqExdAAAAAi/yes-ok.gif', keywords: ['yes', 'ok', 'agree', 'sure', 'nod'] },
    { label: 'No', url: 'https://media.tenor.com/wGrEFyrlmkwAAAAi/no-nope.gif', keywords: ['no', 'nope', 'disagree', 'deny', 'refuse'] },
    { label: 'Hug', url: 'https://media.tenor.com/EvLRWjIpjmMAAAAi/huggy-bear.gif', keywords: ['hug', 'embrace', 'love', 'cute', 'comfort'] },
    { label: 'Eye Roll', url: 'https://media.tenor.com/bW6dETF5eEoAAAAi/whatever-sassy.gif', keywords: ['eye', 'roll', 'whatever', 'sassy', 'annoyed'] },
    { label: 'Thinking', url: 'https://media.tenor.com/Rl3y53ULHrEAAAAi/thinking-think.gif', keywords: ['think', 'hmm', 'wonder', 'ponder', 'idea'] },
    { label: 'Angry', url: 'https://media.tenor.com/w-Jl8GwuzjQAAAAi/angry-mad.gif', keywords: ['angry', 'mad', 'rage', 'furious', 'grr'] },
    { label: 'Facepalm', url: 'https://media.tenor.com/mKkYiG3u-PIAAAAC/facepalm-really.gif', keywords: ['facepalm', 'smh', 'really', 'ugh', 'disappointed'] },
    { label: 'Excited', url: 'https://media.tenor.com/6xm2OKHQ0-UAAAAi/excited-happy.gif', keywords: ['excited', 'yay', 'happy', 'woohoo', 'awesome'] },
    { label: 'Sleepy', url: 'https://media.tenor.com/FReKqVEbH38AAAAi/sleep-sleepy.gif', keywords: ['sleep', 'sleepy', 'tired', 'zzz', 'night'] },
    { label: 'Scared', url: 'https://media.tenor.com/mC8R2xtETioAAAAi/scared-panic.gif', keywords: ['scared', 'panic', 'fear', 'horror', 'run'] },
    { label: 'Bye', url: 'https://media.tenor.com/4OKEhoKQW2QAAAAi/bye-wave.gif', keywords: ['bye', 'goodbye', 'see you', 'wave', 'later'] },
];

// ─── Types ──────────────────────────────────────────────────────

export interface ChatAttachment {
    type: 'gif' | 'image';
    url: string;
    previewUrl?: string; // for camera: data-url before upload
}

interface ChatMediaBarProps {
    onInsertEmoji: (emoji: string) => void;
    onAttach: (attachment: ChatAttachment) => void;
    disabled?: boolean;
}

type ActivePanel = 'none' | 'emoji' | 'gif' | 'camera';

export default function ChatMediaBar({ onInsertEmoji, onAttach, disabled }: ChatMediaBarProps) {
    const [activePanel, setActivePanel] = useState<ActivePanel>('none');
    const [emojiCategory, setEmojiCategory] = useState(0);
    const [emojiSearch, setEmojiSearch] = useState('');
    const [gifSearch, setGifSearch] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const emojiSearchRef = useRef<HTMLInputElement>(null);
    const gifSearchRef = useRef<HTMLInputElement>(null);

    // ─── Emoji search results ─────────
    const filteredEmojis = useMemo(() => {
        const query = emojiSearch.toLowerCase().trim();
        if (!query) return null; // null = show categories
        return EMOJI_DATA.filter(e =>
            e.keywords.some(k => k.includes(query)) || e.emoji.includes(query)
        ).map(e => e.emoji);
    }, [emojiSearch]);

    // ─── GIF search results ──────────
    const filteredGifs = useMemo(() => {
        const query = gifSearch.toLowerCase().trim();
        if (!query) return CURATED_GIFS;
        return CURATED_GIFS.filter(g =>
            g.keywords.some(k => k.includes(query)) ||
            g.label.toLowerCase().includes(query)
        );
    }, [gifSearch]);

    // Close panel on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                closePanel();
            }
        };
        if (activePanel !== 'none') {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activePanel]);

    const closePanel = useCallback(() => {
        setActivePanel('none');
        setCapturedPhoto(null);
        setCameraError(null);
        setEmojiSearch('');
        setGifSearch('');
        if (cameraStream) {
            cameraStream.getTracks().forEach(t => t.stop());
            setCameraStream(null);
        }
    }, [cameraStream]);

    const togglePanel = useCallback((panel: ActivePanel) => {
        if (activePanel === panel) {
            closePanel();
        } else {
            if (cameraStream) {
                cameraStream.getTracks().forEach(t => t.stop());
                setCameraStream(null);
            }
            setCapturedPhoto(null);
            setCameraError(null);
            setEmojiSearch('');
            setGifSearch('');
            setActivePanel(panel);
            // Auto-focus search
            setTimeout(() => {
                if (panel === 'emoji') emojiSearchRef.current?.focus();
                if (panel === 'gif') gifSearchRef.current?.focus();
            }, 150);
        }
    }, [activePanel, cameraStream, closePanel]);

    // ─── Photo Upload ─────────────────

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert('Image must be under 10MB');
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        try {
            const url = await uploadChatImage(file, (p) => setUploadProgress(p));
            // Attach the image (don't send yet — user can add caption)
            onAttach({ type: 'image', url });
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload image. Please try again.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    }, [onAttach]);

    // ─── Camera ───────────────────────

    const startCamera = useCallback(async () => {
        try {
            setCameraError(null);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
                audio: false,
            });
            setCameraStream(stream);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
        } catch (err: any) {
            console.error('Camera error:', err);
            setCameraError(
                err.name === 'NotAllowedError'
                    ? 'Camera permission denied. Please allow camera access.'
                    : err.name === 'NotFoundError'
                        ? 'No camera found on this device.'
                        : 'Unable to access camera.'
            );
        }
    }, []);

    useEffect(() => {
        if (activePanel === 'camera' && !cameraStream && !cameraError) {
            startCamera();
        }
    }, [activePanel, cameraStream, cameraError, startCamera]);

    useEffect(() => {
        if (videoRef.current && cameraStream) {
            videoRef.current.srcObject = cameraStream;
            videoRef.current.play().catch(() => { });
        }
    }, [cameraStream]);

    const capturePhoto = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(video, 0, 0);
        setCapturedPhoto(canvas.toDataURL('image/jpeg', 0.85));
    }, []);

    const sendCapturedPhoto = useCallback(async () => {
        if (!capturedPhoto) return;
        setUploading(true);
        setUploadProgress(0);
        try {
            const res = await fetch(capturedPhoto);
            const blob = await res.blob();
            const file = new File([blob], `camera-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const url = await uploadChatImage(file, (p) => setUploadProgress(p));
            // Attach → user can add caption before sending
            onAttach({ type: 'image', url, previewUrl: capturedPhoto });
            closePanel();
        } catch (err) {
            console.error('Upload failed:', err);
            alert('Failed to upload photo. Please try again.');
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    }, [capturedPhoto, onAttach, closePanel]);

    const retakePhoto = useCallback(() => {
        setCapturedPhoto(null);
    }, []);

    // ─── Render ───────────────────────

    return (
        <div className="tm-chat-media-bar" ref={panelRef}>
            {/* Hidden file input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />

            {/* Toolbar Buttons */}
            <div className="tm-media-toolbar">
                <button
                    type="button"
                    className={`tm-media-btn ${activePanel === 'emoji' ? 'active' : ''}`}
                    onClick={() => togglePanel('emoji')}
                    disabled={disabled || uploading}
                    title="Emoji"
                >
                    <span>😊</span>
                </button>

                <button
                    type="button"
                    className={`tm-media-btn ${activePanel === 'gif' ? 'active' : ''}`}
                    onClick={() => togglePanel('gif')}
                    disabled={disabled || uploading}
                    title="GIF"
                >
                    <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '-0.5px' }}>GIF</span>
                </button>

                <button
                    type="button"
                    className="tm-media-btn"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || uploading}
                    title="Upload Photo"
                >
                    {uploading ? (
                        <span className="tm-upload-spinner" />
                    ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                        </svg>
                    )}
                </button>

                <button
                    type="button"
                    className={`tm-media-btn ${activePanel === 'camera' ? 'active' : ''}`}
                    onClick={() => togglePanel('camera')}
                    disabled={disabled || uploading}
                    title="Take Photo"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                        <circle cx="12" cy="13" r="4" />
                    </svg>
                </button>
            </div>

            {/* Upload Progress Bar */}
            {uploading && (
                <div className="tm-upload-progress-bar">
                    <div className="tm-upload-progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
            )}

            {/* ─── Emoji Panel ─── */}
            {activePanel === 'emoji' && (
                <div className="tm-media-panel tm-emoji-panel">
                    {/* Search */}
                    <div className="tm-panel-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            ref={emojiSearchRef}
                            type="text"
                            placeholder="Search emoji... (e.g. happy, fire, love)"
                            value={emojiSearch}
                            onChange={(e) => setEmojiSearch(e.target.value)}
                        />
                        {emojiSearch && (
                            <button type="button" onClick={() => setEmojiSearch('')} className="tm-search-clear">✕</button>
                        )}
                    </div>

                    {/* Category Tabs (hidden when searching) */}
                    {!filteredEmojis && (
                        <div className="tm-emoji-tabs">
                            {EMOJI_CATEGORIES.map((cat, i) => (
                                <button
                                    key={cat.label}
                                    type="button"
                                    className={`tm-emoji-tab ${emojiCategory === i ? 'active' : ''}`}
                                    onClick={() => setEmojiCategory(i)}
                                    title={cat.label}
                                >
                                    {cat.icon}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Emoji Grid */}
                    <div className="tm-emoji-grid">
                        {filteredEmojis ? (
                            filteredEmojis.length > 0 ? (
                                filteredEmojis.map((emoji) => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        className="tm-emoji-item"
                                        onClick={() => onInsertEmoji(emoji)}
                                    >
                                        {emoji}
                                    </button>
                                ))
                            ) : (
                                <div className="tm-panel-empty">
                                    No emoji found for &ldquo;{emojiSearch}&rdquo;
                                </div>
                            )
                        ) : (
                            EMOJI_CATEGORIES[emojiCategory].emojis.map((emoji) => (
                                <button
                                    key={emoji}
                                    type="button"
                                    className="tm-emoji-item"
                                    onClick={() => onInsertEmoji(emoji)}
                                >
                                    {emoji}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* ─── GIF Panel ─── */}
            {activePanel === 'gif' && (
                <div className="tm-media-panel tm-gif-panel">
                    {/* Search */}
                    <div className="tm-panel-search">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            ref={gifSearchRef}
                            type="text"
                            placeholder="Search GIFs... (e.g. happy, love, wow)"
                            value={gifSearch}
                            onChange={(e) => setGifSearch(e.target.value)}
                        />
                        {gifSearch && (
                            <button type="button" onClick={() => setGifSearch('')} className="tm-search-clear">✕</button>
                        )}
                    </div>

                    <div className="tm-gif-grid">
                        {filteredGifs.length > 0 ? (
                            filteredGifs.map((gif) => (
                                <button
                                    key={gif.url}
                                    type="button"
                                    className="tm-gif-item"
                                    onClick={() => {
                                        onAttach({ type: 'gif', url: gif.url });
                                        closePanel();
                                    }}
                                    title={gif.label}
                                >
                                    <img src={gif.url} alt={gif.label} loading="lazy" />
                                </button>
                            ))
                        ) : (
                            <div className="tm-panel-empty">
                                No GIFs found for &ldquo;{gifSearch}&rdquo;
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ─── Camera Panel ─── */}
            {activePanel === 'camera' && (
                <div className="tm-media-panel tm-camera-panel">
                    {cameraError ? (
                        <div className="tm-camera-error">
                            <span>📷</span>
                            <p>{cameraError}</p>
                            <button type="button" onClick={startCamera} className="tm-camera-retry-btn">
                                Try Again
                            </button>
                        </div>
                    ) : capturedPhoto ? (
                        <div className="tm-camera-preview">
                            <img src={capturedPhoto} alt="Captured" />
                            <div className="tm-camera-preview-actions">
                                <button type="button" onClick={retakePhoto} className="tm-camera-action-btn retake" disabled={uploading}>
                                    ↻ Retake
                                </button>
                                <button type="button" onClick={sendCapturedPhoto} className="tm-camera-action-btn send" disabled={uploading}>
                                    {uploading ? `Uploading ${uploadProgress}%...` : '📎 Attach'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="tm-camera-viewfinder">
                            <video ref={videoRef} autoPlay playsInline muted className="tm-camera-video" />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            <button type="button" onClick={capturePhoto} className="tm-camera-shutter">
                                <div className="tm-shutter-ring">
                                    <div className="tm-shutter-inner" />
                                </div>
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

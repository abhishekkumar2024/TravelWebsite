'use client';

import { Editor } from '@tiptap/react';
import { useState } from 'react';

interface ToolbarProps {
    editor: Editor;
    onImageClick: () => void;
    onLinkClick: () => void;
    onEditImageClick?: () => void;
}

const TEXT_COLORS = [
    { name: 'Default', color: null },
    { name: 'Black', color: '#000000' },
    { name: 'Dark Gray', color: '#4B5563' },
    { name: 'Red', color: '#EF4444' },
    { name: 'Orange', color: '#F97316' },
    { name: 'Amber', color: '#F59E0B' },
    { name: 'Green', color: '#22C55E' },
    { name: 'Blue', color: '#3B82F6' },
    { name: 'Purple', color: '#8B5CF6' },
    { name: 'Pink', color: '#EC4899' },
];

const HIGHLIGHT_COLORS = [
    { name: 'None', color: null },
    { name: 'Yellow', color: '#FEF08A' },
    { name: 'Green', color: '#BBF7D0' },
    { name: 'Blue', color: '#BFDBFE' },
    { name: 'Pink', color: '#FBCFE8' },
    { name: 'Orange', color: '#FED7AA' },
];

export default function Toolbar({ editor, onImageClick, onLinkClick, onEditImageClick }: ToolbarProps) {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);

    const ToolbarButton = ({
        onClick,
        isActive = false,
        children,
        title,
    }: {
        onClick: () => void;
        isActive?: boolean;
        children: React.ReactNode;
        title: string;
    }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            className={`p-2 rounded hover:bg-gray-100 transition-colors ${isActive ? 'bg-gray-200 text-royal-blue' : 'text-gray-600'
                }`}
        >
            {children}
        </button>
    );

    const Divider = () => <div className="w-px h-6 bg-gray-300 mx-1"></div>;

    return (
        <div className="flex flex-wrap items-center gap-1 p-2 border-b border-gray-200 bg-gray-50">
            {/* Text Formatting */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBold().run()}
                isActive={editor.isActive('bold')}
                title="Bold (Ctrl+B)"
            >
                <span className="font-bold text-sm">B</span>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleItalic().run()}
                isActive={editor.isActive('italic')}
                title="Italic (Ctrl+I)"
            >
                <span className="italic text-sm">I</span>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                isActive={editor.isActive('underline')}
                title="Underline (Ctrl+U)"
            >
                <span className="underline text-sm">U</span>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleStrike().run()}
                isActive={editor.isActive('strike')}
                title="Strikethrough"
            >
                <span className="line-through text-sm">S</span>
            </ToolbarButton>

            <Divider />

            {/* Text Color */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setShowColorPicker(!showColorPicker);
                        setShowHighlightPicker(false);
                    }}
                    title="Text Color"
                    className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600 flex items-center gap-1"
                >
                    <span className="text-sm font-bold">A</span>
                    <div className="w-4 h-1 bg-gradient-to-r from-red-500 via-green-500 to-blue-500 rounded"></div>
                </button>
                {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 grid grid-cols-5 gap-1">
                        {TEXT_COLORS.map((c) => (
                            <button
                                key={c.name}
                                type="button"
                                onClick={() => {
                                    if (c.color) {
                                        editor.chain().focus().setColor(c.color).run();
                                    } else {
                                        editor.chain().focus().unsetColor().run();
                                    }
                                    setShowColorPicker(false);
                                }}
                                title={c.name}
                                className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                                style={{ backgroundColor: c.color || '#ffffff' }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Highlight Color */}
            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        setShowHighlightPicker(!showHighlightPicker);
                        setShowColorPicker(false);
                    }}
                    title="Highlight"
                    className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
                >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M15.243 4.515l-6.738 6.737-.707 2.121-1.04 1.041 2.828 2.829 1.04-1.041 2.122-.707 6.737-6.738-4.242-4.242zm6.364 3.535a1 1 0 010 1.414l-7.778 7.778-2.122.707-1.414 1.414a1 1 0 01-1.414 0l-4.243-4.243a1 1 0 010-1.414l1.414-1.414.707-2.121 7.778-7.778a1 1 0 011.414 0l5.657 5.657zM4 20h16v2H4z" />
                    </svg>
                </button>
                {showHighlightPicker && (
                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-2 z-50 grid grid-cols-3 gap-1">
                        {HIGHLIGHT_COLORS.map((c) => (
                            <button
                                key={c.name}
                                type="button"
                                onClick={() => {
                                    if (c.color) {
                                        editor.chain().focus().toggleHighlight({ color: c.color }).run();
                                    } else {
                                        editor.chain().focus().unsetHighlight().run();
                                    }
                                    setShowHighlightPicker(false);
                                }}
                                title={c.name}
                                className="w-6 h-6 rounded border border-gray-200 hover:scale-110 transition-transform"
                                style={{ backgroundColor: c.color || '#ffffff' }}
                            />
                        ))}
                    </div>
                )}
            </div>

            <Divider />

            {/* Headings */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                isActive={editor.isActive('heading', { level: 1 })}
                title="Heading 1"
            >
                <span className="font-bold text-sm">H1</span>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                isActive={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
            >
                <span className="font-bold text-sm">H2</span>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                isActive={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
            >
                <span className="font-bold text-sm">H3</span>
            </ToolbarButton>

            <Divider />

            {/* Text Alignment */}
            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                isActive={editor.isActive({ textAlign: 'left' })}
                title="Align Left"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h10M4 18h14" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                isActive={editor.isActive({ textAlign: 'center' })}
                title="Align Center"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M7 12h10M5 18h14" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                isActive={editor.isActive({ textAlign: 'right' })}
                title="Align Right"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M10 12h10M6 18h14" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().setTextAlign('justify').run()}
                isActive={editor.isActive({ textAlign: 'justify' })}
                title="Justify"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </ToolbarButton>

            <Divider />

            {/* Lists */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                isActive={editor.isActive('bulletList')}
                title="Bullet List"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                isActive={editor.isActive('orderedList')}
                title="Numbered List"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                isActive={editor.isActive('blockquote')}
                title="Quote"
            >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z" />
                </svg>
            </ToolbarButton>

            <Divider />

            {/* Sub/Superscript */}
            <ToolbarButton
                onClick={() => editor.chain().focus().toggleSubscript().run()}
                isActive={editor.isActive('subscript')}
                title="Subscript"
            >
                <span className="text-sm">X<sub className="text-xs">2</sub></span>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().toggleSuperscript().run()}
                isActive={editor.isActive('superscript')}
                title="Superscript"
            >
                <span className="text-sm">X<sup className="text-xs">2</sup></span>
            </ToolbarButton>

            <Divider />

            {/* Media */}
            <ToolbarButton onClick={onImageClick} title="Insert Image">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
            </ToolbarButton>

            {onEditImageClick && (
                <ToolbarButton
                    onClick={onEditImageClick}
                    isActive={editor.isActive('image')}
                    title="Edit Selected Image (click an image first)"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                    </svg>
                </ToolbarButton>
            )}

            <ToolbarButton
                onClick={onLinkClick}
                isActive={editor.isActive('link')}
                title="Insert Link"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                </svg>
            </ToolbarButton>

            <Divider />

            {/* Clear formatting */}
            <ToolbarButton
                onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
                title="Clear formatting"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M9 5h10M5 9v10" />
                </svg>
            </ToolbarButton>

            <Divider />

            {/* Undo/Redo */}
            <ToolbarButton
                onClick={() => editor.chain().focus().undo().run()}
                title="Undo (Ctrl+Z)"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
            </ToolbarButton>

            <ToolbarButton
                onClick={() => editor.chain().focus().redo().run()}
                title="Redo (Ctrl+Shift+Z)"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6" />
                </svg>
            </ToolbarButton>
        </div>
    );
}

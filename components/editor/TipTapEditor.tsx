'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { useCallback, useState, useEffect } from 'react';
import Toolbar from './Toolbar';
import ImageEditModal from './ImageEditModal';

interface TipTapEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onImageUpload?: (file: File) => Promise<string>;
}

export default function TipTapEditor({
    content,
    onChange,
    placeholder = 'Write your travel story here...',
    onImageUpload,
}: TipTapEditorProps) {
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImageAttrs, setSelectedImageAttrs] = useState<any>(null);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            TextStyle,
            Color,
            Underline,
            Highlight.configure({
                multicolor: true,
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph', 'image'],
            }),
            Subscript,
            Superscript,
            TiptapImage.configure({
                inline: false,
                allowBase64: true,
                HTMLAttributes: {
                    class: 'editor-image rounded-xl max-w-full mx-auto my-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-royal-blue/50 transition-all',
                },
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-desert-gold underline',
                },
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content,
        immediatelyRender: false,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor prose prose-lg md:prose-xl max-w-none focus:outline-none min-h-[260px] p-4',
            },
            handleClick: (view, pos, event) => {
                const target = event.target as HTMLElement;

                // Check if clicked on an image
                if (target.tagName === 'IMG') {
                    const imgElement = target as HTMLImageElement;
                    setSelectedImageAttrs({
                        src: imgElement.src,
                        alt: imgElement.alt || '',
                        title: imgElement.title || '',
                        width: imgElement.style.width || '100%',
                    });
                    setShowImageModal(true);
                    return true;
                }
                return false;
            },
        },
    });

    // Sync editor content when content prop changes externally (e.g., draft restore)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            // Only update if content is different and not empty
            // This prevents cursor position issues during normal typing
            const currentContent = editor.getHTML();
            const isCurrentEmpty = currentContent === '<p></p>' || currentContent === '';
            const isNewEmpty = content === '<p></p>' || content === '';

            // Update if: 
            // 1. New content has value and current is empty (draft restore)
            // 2. New content is significantly different (external update)
            if ((isCurrentEmpty && !isNewEmpty) ||
                (!isNewEmpty && content !== currentContent && content.length > currentContent.length + 50)) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    // Handle keyboard shortcut for image editing
    useEffect(() => {
        if (!editor) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Double-click or Enter on selected image
            if (e.key === 'Enter' && editor.isActive('image')) {
                const { node } = editor.state.selection as any;
                if (node?.type?.name === 'image') {
                    setSelectedImageAttrs({
                        src: node.attrs.src,
                        alt: node.attrs.alt || '',
                        title: node.attrs.title || '',
                        width: node.attrs.width || '100%',
                    });
                    setShowImageModal(true);
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [editor]);

    const addImage = useCallback(
        async (file: File) => {
            if (!editor || !onImageUpload) return;

            try {
                const url = await onImageUpload(file);
                editor.chain().focus().setImage({ src: url, alt: file.name.split('.')[0] }).run();
            } catch (error) {
                console.error('Failed to upload image:', error);
                alert('Failed to upload image. Please try again.');
            }
        },
        [editor, onImageUpload]
    );

    const handleImageSelect = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                await addImage(file);
            }
        };
        input.click();
    }, [addImage]);

    const addLink = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    }, [editor]);

    const handleImageSave = useCallback((attrs: { alt: string; title: string; width: string; align: string }) => {
        if (!editor || !selectedImageAttrs) return;

        // Find and update the image in the editor
        const { state } = editor;
        let imagePos: number | null = null;

        state.doc.descendants((node, pos) => {
            if (node.type.name === 'image' && node.attrs.src === selectedImageAttrs.src) {
                imagePos = pos;
                return false;
            }
            return true;
        });

        if (imagePos !== null) {
            // Create style string for width and alignment
            const alignClass = attrs.align === 'left' ? 'mr-auto ml-0' :
                attrs.align === 'right' ? 'ml-auto mr-0' :
                    'mx-auto';

            editor.chain()
                .focus()
                .setNodeSelection(imagePos)
                .updateAttributes('image', {
                    alt: attrs.alt,
                    title: attrs.title,
                    style: `width: ${attrs.width}%; display: block;`,
                    class: `editor-image rounded-xl max-w-full my-4 shadow-sm cursor-pointer hover:ring-2 hover:ring-royal-blue/50 transition-all ${alignClass}`,
                })
                .run();
        }

        setShowImageModal(false);
        setSelectedImageAttrs(null);
    }, [editor, selectedImageAttrs]);

    const handleEditImageClick = useCallback(() => {
        if (!editor) return;

        // Check if an image is currently selected
        const { node } = editor.state.selection as any;
        if (node?.type?.name === 'image') {
            setSelectedImageAttrs({
                src: node.attrs.src,
                alt: node.attrs.alt || '',
                title: node.attrs.title || '',
                width: node.attrs.width || '100%',
            });
            setShowImageModal(true);
        } else {
            alert('Please click on an image first to edit it.');
        }
    }, [editor]);

    if (!editor) {
        return (
            <div className="border border-gray-200 rounded-2xl p-4 min-h-[320px] flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-4 border-desert-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <>
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-desert-gold/80 focus-within:shadow-md transition-all">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Editor
                        </span>
                        <span className="text-xs text-gray-400">
                            Format your story with headings, lists, images and more. Click on images to edit them.
                        </span>
                    </div>
                </div>

                <div className="border-b border-gray-100 bg-white">
                    <Toolbar
                        editor={editor}
                        onImageClick={handleImageSelect}
                        onLinkClick={addLink}
                        onEditImageClick={handleEditImageClick}
                    />
                </div>

                <div className="bg-white max-h-[600px] overflow-y-auto">
                    <EditorContent editor={editor} />
                </div>
            </div>

            {/* Image Edit Modal */}
            {selectedImageAttrs && (
                <ImageEditModal
                    isOpen={showImageModal}
                    onClose={() => {
                        setShowImageModal(false);
                        setSelectedImageAttrs(null);
                    }}
                    imageAttrs={selectedImageAttrs}
                    onSave={handleImageSave}
                />
            )}
        </>
    );
}

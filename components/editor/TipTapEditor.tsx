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
import { useCallback, useState, useEffect, useRef } from 'react';
import Toolbar from './Toolbar';
import ImageEditModal from './ImageEditModal';
import { compressImage } from '@/lib/compressImage';
import Video from './VideoExtension';

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

    // Ref to queue an image for alt-text editing after upload.
    // ProseMirror handlers (handlePaste/handleDrop) are closures created once
    // by useEditor, so we use a ref to communicate back to React safely.
    const pendingImageRef = useRef<{ src: string; alt: string } | null>(null);

    // Effect: when a pending image is set by a ProseMirror handler, open the modal
    useEffect(() => {
        const interval = setInterval(() => {
            if (pendingImageRef.current) {
                const { src, alt } = pendingImageRef.current;
                pendingImageRef.current = null;
                setSelectedImageAttrs({ src, alt, title: '', width: '100' });
                setShowImageModal(true);
            }
        }, 200);
        return () => clearInterval(interval);
    }, []);

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
                allowBase64: false, // IMPORTANT: base64 images make payloads enormous (5-15MB each) causing submit timeouts
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
            Video,
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
            // Intercept pasted images: upload to Cloudinary instead of embedding base64
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items || !onImageUpload) return false;

                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith('image/')) {
                        event.preventDefault();
                        const file = items[i].getAsFile();
                        if (file) {
                            compressImage(file).then(compressedFile => {
                                return onImageUpload(compressedFile);
                            }).then((url) => {
                                view.dispatch(
                                    view.state.tr.replaceSelectionWith(
                                        view.state.schema.nodes.image.create({ src: url, alt: '' })
                                    )
                                );
                                // Queue modal open via ref (safe from stale closure)
                                pendingImageRef.current = { src: url, alt: '' };
                            }).catch((err) => {
                                console.error('Paste image upload failed:', err);
                            });
                        }
                        return true;
                    }
                }
                return false;
            },
            // Intercept dropped files: upload to Cloudinary
            handleDrop: (view, event) => {
                const files = event.dataTransfer?.files;
                if (!files || files.length === 0 || !onImageUpload) return false;

                const mediaFiles = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
                if (mediaFiles.length === 0) return false;

                event.preventDefault();
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });

                mediaFiles.forEach((file, idx) => {
                    if (file.type.startsWith('video/')) {
                        // Video handling
                        onImageUpload(file).then((url) => {
                            const node = view.state.schema.nodes.video.create({ src: url });
                            const tr = view.state.tr.insert(pos?.pos ?? view.state.selection.from, node);
                            view.dispatch(tr);
                        }).catch(err => console.error('Video drop upload failed:', err));
                    } else {
                        // Image handling
                        compressImage(file).then(compressedFile => {
                            return onImageUpload(compressedFile).then(url => ({ url, file }));
                        }).then(({ url, file }) => {
                            const suggestedAlt = file.name.split('.')[0].replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
                            const node = view.state.schema.nodes.image.create({ src: url, alt: suggestedAlt });
                            const tr = view.state.tr.insert(pos?.pos ?? view.state.selection.from, node);
                            view.dispatch(tr);

                            // Queue modal for first image only
                            if (idx === 0) {
                                pendingImageRef.current = { src: url, alt: suggestedAlt };
                            }
                        }).catch((err) => {
                            console.error('Drop image upload failed:', err);
                        });
                    }
                });
                return true;
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
                const compressedFile = await compressImage(file);
                const url = await onImageUpload(compressedFile);
                // Clean filename for suggested alt: "IMG_2847" → "IMG 2847", "hawa-mahal-sunset.jpg" → "hawa mahal sunset"
                const suggestedAlt = file.name.split('.')[0].replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
                editor.chain().focus().setImage({ src: url, alt: suggestedAlt }).run();

                // Auto-open the edit modal so the author can add a proper alt text
                setSelectedImageAttrs({
                    src: url,
                    alt: suggestedAlt,
                    title: '',
                    width: '100',
                });
                setShowImageModal(true);
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

    const handleVideoSelect = useCallback(() => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'video/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && onImageUpload) {
                if (file.size > 100 * 1024 * 1024) { // 100MB limit
                    alert('Video file is too large. Please upload videos under 100MB.');
                    return;
                }

                try {
                    // Reuse the upload function since it now points to /auto/upload
                    const url = await onImageUpload(file);
                    editor?.chain().focus().setVideo({ src: url }).run();
                } catch (error) {
                    console.error('Failed to upload video:', error);
                    alert('Failed to upload video.');
                }
            }
        };
        input.click();
    }, [editor, onImageUpload]);

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
                        onVideoClick={handleVideoSelect}
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

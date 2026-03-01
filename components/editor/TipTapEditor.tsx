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
import Table from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { useCallback, useState, useEffect, useRef } from 'react';
import Toolbar from './Toolbar';
import ImageEditModal from './ImageEditModal';
import { compressImage } from '@/lib/compressImage';
import Video from './VideoExtension';

interface TipTapEditorProps {
    content: string;
    onChange: (html: string) => void;
    placeholder?: string;
    onImageUpload?: (file: File, onProgress?: (percent: number) => void) => Promise<string>;
}

export default function TipTapEditor({
    content,
    onChange,
    placeholder = 'Write your travel story here...',
    onImageUpload,
}: TipTapEditorProps) {
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImageAttrs, setSelectedImageAttrs] = useState<any>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);

    // Ref to queue an image for alt-text editing after upload.
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

    const handleUploadProgress = useCallback((percent: number) => {
        setUploadProgress(percent);
    }, []);

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [2, 3],
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
                allowBase64: false, // IMPORTANT: base64 images make payloads enormous
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
            Table.configure({
                resizable: true,
                HTMLAttributes: {
                    class: 'editor-table border-collapse table-auto w-full my-4',
                },
            }),
            TableRow,
            TableHeader,
            TableCell,
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
            // Intercept pasted images
            handlePaste: (view, event) => {
                const items = event.clipboardData?.items;
                if (!items || !onImageUpload) return false;

                for (let i = 0; i < items.length; i++) {
                    if (items[i].type.startsWith('image/')) {
                        event.preventDefault();
                        const file = items[i].getAsFile();
                        if (file) {
                            setIsUploading(true);
                            setUploadProgress(0);
                            compressImage(file).then(compressedFile => {
                                return onImageUpload(compressedFile, handleUploadProgress);
                            }).then((url) => {
                                view.dispatch(
                                    view.state.tr.replaceSelectionWith(
                                        view.state.schema.nodes.image.create({ src: url, alt: '' })
                                    )
                                );
                                pendingImageRef.current = { src: url, alt: '' };
                            }).catch((err) => {
                                console.error('Paste image upload failed:', err);
                                alert('Upload failed');
                            }).finally(() => {
                                setIsUploading(false);
                                setUploadProgress(0);
                            });
                        }
                        return true;
                    }
                }
                return false;
            },
            // Intercept dropped files
            handleDrop: (view, event) => {
                const files = event.dataTransfer?.files;
                if (!files || files.length === 0 || !onImageUpload) return false;

                const mediaFiles = Array.from(files).filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
                if (mediaFiles.length === 0) return false;

                event.preventDefault();
                const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });

                mediaFiles.forEach((file, idx) => {
                    setIsUploading(true);
                    setUploadProgress(0);

                    if (file.type.startsWith('video/')) {
                        if (file.size > 400 * 1024 * 1024) {
                            alert('Video file is too large. Please upload videos under 400MB.');
                            setIsUploading(false);
                            return;
                        }
                        // Video handling
                        onImageUpload(file, handleUploadProgress).then((url) => {
                            const node = view.state.schema.nodes.video.create({ src: url });
                            const tr = view.state.tr.insert(pos?.pos ?? view.state.selection.from, node);
                            view.dispatch(tr);
                        }).catch(err => {
                            console.error('Video drop upload failed:', err);
                            alert('Video upload failed');
                        }).finally(() => {
                            setIsUploading(false);
                            setUploadProgress(0);
                        });
                    } else {
                        // Image handling
                        compressImage(file).then(compressedFile => {
                            return onImageUpload(compressedFile, handleUploadProgress).then(url => ({ url, file }));
                        }).then(({ url, file }) => {
                            const suggestedAlt = file.name.split('.')[0].replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
                            const node = view.state.schema.nodes.image.create({ src: url, alt: suggestedAlt });
                            const tr = view.state.tr.insert(pos?.pos ?? view.state.selection.from, node);
                            view.dispatch(tr);

                            if (idx === 0) {
                                pendingImageRef.current = { src: url, alt: suggestedAlt };
                            }
                        }).catch((err) => {
                            console.error('Drop image upload failed:', err);
                        }).finally(() => {
                            setIsUploading(false);
                            setUploadProgress(0);
                        });
                    }
                });
                return true;
            },
            handleClick: (view, pos, event) => {
                const target = event.target as HTMLElement;

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

    // Content sync logic...
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            const currentContent = editor.getHTML();
            const isCurrentEmpty = currentContent === '<p></p>' || currentContent === '';
            const isNewEmpty = content === '<p></p>' || content === '';

            if ((isCurrentEmpty && !isNewEmpty) ||
                (!isNewEmpty && content !== currentContent && content.length > currentContent.length + 50)) {
                editor.commands.setContent(content);
            }
        }
    }, [content, editor]);

    // Keyboard shortcuts...
    useEffect(() => {
        if (!editor) return;

        const handleKeyDown = (e: KeyboardEvent) => {
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
                setIsUploading(true);
                setUploadProgress(0);
                const compressedFile = await compressImage(file);
                const url = await onImageUpload(compressedFile, handleUploadProgress);
                const suggestedAlt = file.name.split('.')[0].replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();
                editor.chain().focus().setImage({ src: url, alt: suggestedAlt }).run();

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
            } finally {
                setIsUploading(false);
                setUploadProgress(0);
            }
        },
        [editor, onImageUpload, handleUploadProgress]
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
                if (file.size > 400 * 1024 * 1024) { // 400MB limit
                    alert('Video file is too large. Please upload videos under 400MB.');
                    return;
                }

                try {
                    setIsUploading(true);
                    setUploadProgress(0);
                    const url = await onImageUpload(file, handleUploadProgress);
                    editor?.chain().focus().setVideo({ src: url }).run();
                } catch (error) {
                    console.error('Failed to upload video:', error);
                    alert('Failed to upload video.');
                } finally {
                    setIsUploading(false);
                    setUploadProgress(0);
                }
            }
        };
        input.click();
    }, [editor, onImageUpload, handleUploadProgress]);

    const addLink = useCallback(() => {
        if (!editor) return;
        const url = window.prompt('Enter URL:');
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    }, [editor]);

    const handleImageSave = useCallback((attrs: { alt: string; title: string; width: string; align: string }) => {
        if (!editor || !selectedImageAttrs) return;

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
            <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-desert-gold/80 focus-within:shadow-md transition-all relative`}>
                {/* Upload Progress Overlay */}
                {isUploading && (
                    <div className="absolute inset-0 z-50 bg-white/90 flex flex-col items-center justify-center animate-fade-in">
                        <div className="w-64">
                            <div className="flex justify-between mb-2">
                                <span className="text-sm font-semibold text-royal-blue">Uploading Media...</span>
                                <span className="text-sm font-bold text-gray-700">{uploadProgress}%</span>
                            </div>
                            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className="h-full bg-gradient-to-r from-royal-blue to-desert-gold transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                                Please wait while we process your file.
                            </p>
                        </div>
                    </div>
                )}

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

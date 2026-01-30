'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TiptapImage from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useCallback } from 'react';
import Toolbar from './Toolbar';

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
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            TiptapImage.configure({
                HTMLAttributes: {
                    // Keep images responsive but visually constrained for better reading.
                    class: 'rounded-xl max-w-full md:max-w-[700px] mx-auto my-4 shadow-sm',
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
                // Slightly larger base font size for better readability.
                class: 'tiptap-editor prose prose-lg md:prose-xl max-w-none focus:outline-none min-h-[260px] p-4',
            },
        },
    });

    const addImage = useCallback(
        async (file: File) => {
            if (!editor || !onImageUpload) return;

            try {
                const url = await onImageUpload(file);
                editor.chain().focus().setImage({ src: url }).run();
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

    if (!editor) {
        return (
            <div className="border border-gray-200 rounded-2xl p-4 min-h-[320px] flex items-center justify-center bg-white">
                <div className="w-8 h-8 border-4 border-desert-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden focus-within:border-desert-gold/80 focus-within:shadow-md transition-all">
            <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
                <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Editor
                    </span>
                    <span className="text-xs text-gray-400">
                        Format your story with headings, lists, images and more.
                    </span>
                </div>
            </div>

            <div className="border-b border-gray-100 bg-white">
                <Toolbar
                    editor={editor}
                    onImageClick={handleImageSelect}
                    onLinkClick={addLink}
                />
            </div>

            <div className="bg-white">
                <EditorContent editor={editor} />
            </div>
        </div>
    );
}

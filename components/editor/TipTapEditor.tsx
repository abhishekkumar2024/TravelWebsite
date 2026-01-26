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
                    class: 'rounded-lg max-w-full',
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
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'tiptap-editor prose prose-lg max-w-none focus:outline-none min-h-[300px] p-4',
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
            <div className="border-2 border-gray-200 rounded-lg p-4 min-h-[400px] flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-desert-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="border-2 border-gray-200 rounded-lg overflow-hidden focus-within:border-desert-gold transition-colors">
            <Toolbar
                editor={editor}
                onImageClick={handleImageSelect}
                onLinkClick={addLink}
            />
            <EditorContent editor={editor} />
        </div>
    );
}

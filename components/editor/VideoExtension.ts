
import { Node, mergeAttributes } from '@tiptap/core';

export interface VideoOptions {
    HTMLAttributes: Record<string, any>;
}

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        video: {
            setVideo: (options: { src: string }) => ReturnType;
        };
    }
}

export const Video = Node.create<VideoOptions>({
    name: 'video',

    addOptions() {
        return {
            HTMLAttributes: {
                class: 'w-full rounded-xl shadow-md my-4 aspect-video',
                controls: true,
                playsinline: true,
            },
        };
    },

    group: 'block',

    draggable: true,

    addAttributes() {
        return {
            src: {
                default: null,
            },
        };
    },

    parseHTML() {
        return [
            {
                tag: 'video',
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        return ['video', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
    },

    addCommands() {
        return {
            setVideo:
                ({ src }) =>
                    ({ commands }) => {
                        return commands.insertContent({
                            type: this.name,
                            attrs: { src },
                        });
                    },
        };
    },
});

export default Video;

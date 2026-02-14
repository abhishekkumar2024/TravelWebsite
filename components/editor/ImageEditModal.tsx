'use client';

import { useState, useEffect } from 'react';

interface ImageEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    imageAttrs: {
        src: string;
        alt?: string;
        title?: string;
        width?: string | number;
        height?: string | number;
    };
    onSave: (attrs: {
        alt: string;
        title: string;
        width: string;
        align: string;
    }) => void;
}

export default function ImageEditModal({ isOpen, onClose, imageAttrs, onSave }: ImageEditModalProps) {
    const [alt, setAlt] = useState('');
    const [title, setTitle] = useState('');
    const [width, setWidth] = useState('100');
    const [align, setAlign] = useState('center');

    useEffect(() => {
        if (imageAttrs) {
            setAlt(imageAttrs.alt || '');
            setTitle(imageAttrs.title || '');
            // Extract width percentage from existing width or default to 100
            const existingWidth = imageAttrs.width?.toString() || '100';
            setWidth(existingWidth.replace('%', '').replace('px', ''));
        }
    }, [imageAttrs]);

    if (!isOpen) return null;

    const handleSave = () => {
        onSave({ alt, title, width, align });
        onClose();
    };

    const presetWidths = [
        { label: 'Small', value: '33' },
        { label: 'Medium', value: '50' },
        { label: 'Large', value: '75' },
        { label: 'Full', value: '100' },
    ];

    const alignOptions = [
        { label: 'Left', value: 'left', icon: '◀' },
        { label: 'Center', value: 'center', icon: '◆' },
        { label: 'Right', value: 'right', icon: '▶' },
    ];

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🖼️</span>
                        <h2 className="text-lg font-bold text-gray-800">Edit Image</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Preview */}
                <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                    <p className="text-xs text-gray-500 mb-2 font-semibold uppercase">Preview</p>
                    <div
                        className="bg-white rounded-lg border border-gray-200 p-2 flex justify-center"
                        style={{ textAlign: align as any }}
                    >
                        <img
                            src={imageAttrs.src}
                            alt={alt || 'Preview'}
                            className="rounded-lg shadow-sm"
                            style={{
                                width: `${width}%`,
                                maxWidth: '100%',
                                height: 'auto',
                            }}
                        />
                    </div>
                </div>

                {/* Form */}
                <div className="px-6 py-4 space-y-5">
                    {/* Alt Text */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700 text-sm">
                            Alt Text <span className="text-xs text-red-400 font-normal">* Required for SEO</span>
                        </label>
                        <input
                            type="text"
                            value={alt}
                            onChange={(e) => setAlt(e.target.value)}
                            placeholder='e.g. "Amber Fort courtyard view during morning light"'
                            className={`w-full px-4 py-3 border-2 rounded-lg focus:outline-none transition-all text-sm ${!alt || alt === 'Uploaded image' || /^IMG[_ ]\d/i.test(alt)
                                    ? 'border-amber-300 bg-amber-50/50 focus:border-amber-500'
                                    : 'border-gray-200 focus:border-royal-blue'
                                }`}
                            autoFocus
                        />
                        {(!alt || alt === 'Uploaded image' || /^IMG[_ ]\d/i.test(alt)) ? (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                ⚠️ Descriptive alt text helps your images rank in Google Image Search.
                            </p>
                        ) : (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                ✅ Great! Format: [Place] + [Subject] + [Context]
                            </p>
                        )}
                    </div>

                    {/* Caption/Title */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700 text-sm">
                            Caption <span className="text-xs text-gray-400 font-normal">(optional)</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Add a caption that appears on hover..."
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-royal-blue transition-all text-sm"
                        />
                    </div>

                    {/* Size */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700 text-sm">
                            Size <span className="text-xs text-gray-400 font-normal">({width}%)</span>
                        </label>
                        <div className="flex gap-2 mb-3">
                            {presetWidths.map((preset) => (
                                <button
                                    key={preset.value}
                                    type="button"
                                    onClick={() => setWidth(preset.value)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${width === preset.value
                                        ? 'bg-royal-blue text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    {preset.label}
                                </button>
                            ))}
                        </div>
                        <input
                            type="range"
                            min="25"
                            max="100"
                            value={width}
                            onChange={(e) => setWidth(e.target.value)}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-royal-blue"
                        />
                    </div>

                    {/* Alignment */}
                    <div>
                        <label className="block mb-2 font-semibold text-gray-700 text-sm">
                            Alignment
                        </label>
                        <div className="flex gap-2">
                            {alignOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setAlign(option.value)}
                                    className={`flex-1 py-3 px-4 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${align === option.value
                                        ? 'bg-royal-blue text-white'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                >
                                    <span>{option.icon}</span>
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-3 px-4 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-royal-blue to-deep-maroon text-white font-semibold rounded-lg hover:shadow-lg transition-all"
                    >
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}

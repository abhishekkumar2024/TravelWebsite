'use client';

import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Image from 'next/image';
import { compressImage } from '@/lib/compressImage';

interface ImageUploaderProps {
    onUpload: (file: File) => Promise<string>;
    currentImage: string | null;
    onImageChange: (url: string | null) => void;
    label?: string;
}

export default function ImageUploader({
    onUpload,
    currentImage,
    onImageChange,
    label = 'Cover Image',
}: ImageUploaderProps) {
    const onDrop = useCallback(
        async (acceptedFiles: File[]) => {
            const file = acceptedFiles[0];
            if (!file) return;

            try {
                // Show local preview immediately using the original file
                const localUrl = URL.createObjectURL(file);
                onImageChange(localUrl);

                // Compress image before upload
                const compressedFile = await compressImage(file);

                // Upload the compressed file
                const uploadedUrl = await onUpload(compressedFile);
                onImageChange(uploadedUrl);
            } catch (error) {
                console.error('Upload failed:', error);
                onImageChange(null);
                alert('Failed to upload image. Please try again.');
            }
        },
        [onUpload, onImageChange]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
        },
        maxFiles: 1,
        maxSize: 50 * 1024 * 1024, // 50MB limit for selection
    });

    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
            <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive
                    ? 'border-desert-gold bg-desert-gold/5'
                    : 'border-gray-300 hover:border-desert-gold'
                    }`}
            >
                <input {...getInputProps()} />

                {currentImage ? (
                    <div className="relative">
                        <div className="relative h-40 w-full">
                            <Image
                                src={currentImage}
                                alt={`${label} preview`}
                                fill
                                className="object-cover rounded-lg"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onImageChange(null);
                            }}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        <p className="mt-2 text-sm text-gray-500">Click or drag to replace</p>
                    </div>
                ) : (
                    <>
                        <div className="text-gray-400 mb-2">
                            <svg className="w-10 h-10 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                            </svg>
                        </div>
                        <p className="text-gray-500">
                            {isDragActive ? 'Drop the image here...' : 'Drag & drop or click to upload'}
                        </p>
                        <p className="text-gray-400 text-sm mt-1">PNG, JPG up to 50MB</p>
                    </>
                )}
            </div>
        </div>
    );
}

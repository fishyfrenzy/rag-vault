"use client";

import { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageLightboxProps {
    src: string;
    alt?: string;
    children: React.ReactNode;
    className?: string;
}

export function ImageLightbox({ src, alt = "Image", children, className }: ImageLightboxProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [scale, setScale] = useState(1);
    const [rotation, setRotation] = useState(0);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEsc);
            document.body.style.overflow = "hidden";
        }
        return () => {
            document.removeEventListener("keydown", handleEsc);
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 4));
    const handleZoomOut = () => setScale(prev => Math.max(prev - 0.5, 0.5));
    const handleRotate = () => setRotation(prev => prev + 90);
    const handleReset = () => {
        setScale(1);
        setRotation(0);
    };

    return (
        <>
            {/* Trigger Element */}
            <div
                onClick={() => setIsOpen(true)}
                className={cn("cursor-zoom-in", className)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setIsOpen(true)}
            >
                {children}
            </div>

            {/* Lightbox Modal */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200"
                    onClick={() => setIsOpen(false)}
                >
                    {/* Controls */}
                    <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleZoomOut(); }}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="Zoom Out"
                        >
                            <ZoomOut className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleZoomIn(); }}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="Zoom In"
                        >
                            <ZoomIn className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRotate(); }}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="Rotate"
                        >
                            <RotateCw className="w-5 h-5" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                            className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                            title="Close (Esc)"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Zoom Level Indicator */}
                    {scale !== 1 && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium">
                            {Math.round(scale * 100)}%
                        </div>
                    )}

                    {/* Reset Button */}
                    {(scale !== 1 || rotation !== 0) && (
                        <button
                            onClick={(e) => { e.stopPropagation(); handleReset(); }}
                            className="absolute bottom-4 right-4 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                        >
                            Reset
                        </button>
                    )}

                    {/* Image */}
                    <div
                        className="max-w-[90vw] max-h-[90vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={src}
                            alt={alt}
                            className="max-w-full max-h-[90vh] object-contain transition-transform duration-200 ease-out select-none"
                            style={{
                                transform: `scale(${scale}) rotate(${rotation}deg)`,
                            }}
                            draggable={false}
                        />
                    </div>

                    {/* Click anywhere hint */}
                    <p className="absolute bottom-4 left-4 text-white/50 text-xs">
                        Click anywhere to close • Scroll to zoom
                    </p>
                </div>
            )}
        </>
    );
}

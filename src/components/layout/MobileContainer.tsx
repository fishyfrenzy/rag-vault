import React from 'react';
import { cn } from '@/lib/utils';

interface MobileContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function MobileContainer({ children, className }: MobileContainerProps) {
    // Note: Name kept for compatibility, but now responsive for desktop full-width
    return (
        <div className={cn("mx-auto w-full max-w-7xl min-h-screen bg-background", className)}>
            {children}
        </div>
    );
}

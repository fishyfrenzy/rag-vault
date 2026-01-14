import React from "react";
import { cn } from "@/lib/utils";

interface GradientButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    className?: string;
    size?: "default" | "lg";
}

export function GradientButton({ children, className, size = "default", ...props }: GradientButtonProps) {
    return (
        <div className="relative p-[2px] rounded-2xl bg-gradient-to-r from-primary via-purple-400 to-primary overflow-hidden hover:translate-y-[-2px] hover:shadow-lg transition-all duration-200 group">
            <button
                className={cn(
                    "inline-flex items-center justify-center gap-3 rounded-[14px] bg-background text-foreground font-bold transition-colors w-full",
                    size === "lg" ? "h-14 px-8 text-base" : "h-10 px-6 text-sm",
                    className
                )}
                {...props}
            >
                {children}
            </button>
        </div>
    );
}

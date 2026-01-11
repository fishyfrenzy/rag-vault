"use client";

import React, { useState, KeyboardEvent } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";

interface TagInputProps {
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
    maxItems?: number;
    className?: string;
}

export function TagInput({
    value,
    onChange,
    placeholder = "Type and press Enter",
    maxItems = 10,
    className = "",
}: TagInputProps) {
    const [inputValue, setInputValue] = useState("");

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            const trimmed = inputValue.trim();
            if (trimmed && !value.includes(trimmed) && value.length < maxItems) {
                onChange([...value, trimmed]);
                setInputValue("");
            }
        } else if (e.key === "Backspace" && inputValue === "" && value.length > 0) {
            // Remove last tag on backspace if input is empty
            onChange(value.slice(0, -1));
        }
    };

    const removeTag = (tagToRemove: string) => {
        onChange(value.filter((tag) => tag !== tagToRemove));
    };

    return (
        <div className={`space-y-2 ${className}`}>
            <div className="flex flex-wrap gap-2">
                {value.map((tag) => (
                    <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </span>
                ))}
            </div>
            {value.length < maxItems && (
                <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={value.length === 0 ? placeholder : `Add more (${maxItems - value.length} left)`}
                    className="bg-background/50"
                />
            )}
            {value.length >= maxItems && (
                <p className="text-xs text-muted-foreground">Maximum of {maxItems} items reached</p>
            )}
        </div>
    );
}

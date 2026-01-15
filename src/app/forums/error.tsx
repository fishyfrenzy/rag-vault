"use client";

import { useEffect } from "react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { ErrorState } from "@/components/ui/ErrorState";

export default function ForumsError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Forums error:", error);
    }, [error]);

    return (
        <MobileContainer className="pb-24">
            <div className="px-6 py-4">
                <ErrorState
                    title="Failed to load forums"
                    message={error.message || "Something went wrong. Please try again."}
                    onRetry={reset}
                />
            </div>
        </MobileContainer>
    );
}

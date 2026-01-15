"use client";

import { useEffect } from "react";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { ErrorState } from "@/components/ui/ErrorState";

export default function VaultError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log error to reporting service
        console.error("Vault error:", error);
    }, [error]);

    return (
        <MobileContainer className="pb-24">
            <div className="px-6 py-4">
                <ErrorState
                    title="Failed to load vault"
                    message={error.message || "Something went wrong. Please try again."}
                    onRetry={reset}
                />
            </div>
        </MobileContainer>
    );
}

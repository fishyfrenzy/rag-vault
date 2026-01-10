"use client";

import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function ErrorContent() {
    const searchParams = useSearchParams();
    const errorDescription = searchParams.get("error_description") || "Unknown error occurred";

    return (
        <MobileContainer className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
            <div className="p-4 rounded-full bg-destructive/10 mb-6">
                <AlertTriangle className="w-12 h-12 text-destructive" />
            </div>

            <h1 className="text-2xl font-bold mb-2">Authentication Failed</h1>
            <p className="text-muted-foreground mb-6 max-w-sm">
                There was a problem signing you in. This is usually a temporary issue.
            </p>

            <div className="bg-secondary/50 rounded-lg p-4 mb-6 max-w-md text-left">
                <p className="text-xs font-mono text-muted-foreground break-all">
                    {decodeURIComponent(errorDescription)}
                </p>
            </div>

            <div className="flex gap-3">
                <Button variant="outline" onClick={() => window.location.href = "/"}>
                    Go Home
                </Button>
                <Button onClick={() => window.location.href = "/login"}>
                    Try Again
                </Button>
            </div>
        </MobileContainer>
    );
}

export default function AuthCodeErrorPage() {
    return (
        <Suspense fallback={
            <MobileContainer className="flex items-center justify-center min-h-screen">
                <p>Loading...</p>
            </MobileContainer>
        }>
            <ErrorContent />
        </Suspense>
    );
}

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { Activity } from "lucide-react";

export function HomeAuthButton() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <Button size="lg" variant="outline" className="rounded-full px-8 md:px-12 md:h-14 md:text-lg backdrop-blur-sm bg-background/50 opacity-50 cursor-not-allowed">
                Loading...
            </Button>
        );
    }

    if (user) {
        return (
            <Link href="/activity">
                <Button size="lg" variant="outline" className="rounded-full px-8 md:px-12 md:h-14 md:text-lg backdrop-blur-sm bg-background/50 gap-2">
                    <Activity className="w-5 h-5" />
                    View Activity
                </Button>
            </Link>
        );
    }

    return (
        <Link href="/login">
            <Button size="lg" variant="outline" className="rounded-full px-8 md:px-12 md:h-14 md:text-lg backdrop-blur-sm bg-background/50">
                Sign In
            </Button>
        </Link>
    );
}

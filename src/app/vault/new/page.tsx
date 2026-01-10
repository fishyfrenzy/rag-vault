"use client";

import { useAuth } from "@/components/auth/AuthProvider";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { CreateVaultItem } from "@/components/vault/CreateVaultItem";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function NewVaultItemPage() {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login?redirect=/vault/new");
        }
    }, [user, loading, router]);

    if (loading) {
        return (
            <MobileContainer className="flex items-center justify-center h-screen">
                <p>Loading...</p>
            </MobileContainer>
        );
    }

    if (!user) return null;

    return (
        <MobileContainer className="p-6 pb-24">
            <CreateVaultItem
                initialSubject=""
                userId={user.id}
                onSuccess={(item) => {
                    // Redirect to the new vault item's detail page
                    router.push(`/vault/${item.id}`);
                }}
                onCancel={() => {
                    router.back();
                }}
            />
        </MobileContainer>
    );
}

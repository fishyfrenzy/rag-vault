import { Metadata } from "next";
import { getForumCategories } from "@/lib/queries/forum";
import { NewThreadForm } from "@/components/forum/NewThreadForm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "New Discussion | RagVault Forums",
    description: "Start a new discussion in the RagVault community.",
};

interface NewThreadPageProps {
    searchParams: Promise<{ category?: string }>;
}

export default async function NewThreadPage({ searchParams }: NewThreadPageProps) {
    const { category: defaultCategorySlug } = await searchParams;
    const supabase = await createClient();

    // Check auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login?returnTo=/forums/new");
    }

    const categories = await getForumCategories();
    const defaultCategory = categories.find(c => c.slug === defaultCategorySlug);

    return (
        <div className="min-h-screen pb-24">
            <div className="bg-secondary/30 border-b border-border/40 py-12">
                <div className="container max-w-4xl mx-auto px-6">
                    <Link href="/forums" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6 group">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Forums
                    </Link>

                    <div className="space-y-4">
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                            New <span className="text-muted-foreground">Discussion</span>
                        </h1>
                        <p className="text-muted-foreground font-medium max-w-xl">
                            Share your knowledge, ask for help, or start a conversation with the community.
                        </p>
                    </div>
                </div>
            </div>

            <div className="container max-w-4xl mx-auto px-6 py-12">
                <NewThreadForm
                    categories={categories}
                    defaultCategory={defaultCategory?.id}
                />
            </div>
        </div>
    );
}

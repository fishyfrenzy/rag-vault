import { Metadata } from "next";
import { getThreadsByCategory } from "@/lib/queries/forum";
import { ThreadListItem } from "@/components/forum/ThreadListItem";
import { Button } from "@/components/ui/button";
import { Plus, ChevronLeft, Filter, MessageSquare } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface CategoryPageProps {
    params: Promise<{ category: string }>;
    searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
    const { category } = await params;
    const readableName = category.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return {
        title: `${readableName} | RagVault Forums`,
        description: `Discussions about ${readableName} in the vintage t-shirt community.`,
    };
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
    const { category: categorySlug } = await params;
    const { page: pageStr } = await searchParams;
    const page = parseInt(pageStr || "1");

    const result = await getThreadsByCategory(categorySlug, page);

    if (!result) {
        notFound();
    }

    const { threads, count } = result;
    const readableName = categorySlug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

    return (
        <div className="min-h-screen pb-24">
            {/* Header */}
            <div className="bg-secondary/30 border-b border-border/40 py-12">
                <div className="container max-w-6xl mx-auto px-6">
                    <Link href="/forums" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6 group">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to Forums
                    </Link>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="space-y-4">
                            <h1 className="text-4xl md:text-5xl font-black tracking-tighter leading-none">
                                {readableName}
                            </h1>
                            <p className="text-muted-foreground font-medium max-w-xl">
                                Browse and join discussions about {readableName.toLowerCase()} within the vintage community.
                            </p>
                        </div>

                        <Link href={`/forums/new?category=${categorySlug}`}>
                            <Button className="gap-2 h-12 px-6 rounded-xl font-bold shadow-lg shadow-primary/10">
                                <Plus className="w-5 h-5" />
                                Start Discussion
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Thread List */}
            <div className="container max-w-6xl mx-auto px-6 py-12">
                <div className="bg-card border border-border/60 rounded-3xl overflow-hidden shadow-sm">
                    {/* Tool Bar */}
                    <div className="flex items-center justify-between p-4 bg-secondary/20 border-b border-border/40">
                        <div className="flex items-center gap-4">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">Threads ({count || 0})</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" className="gap-2 text-[10px] font-black uppercase tracking-widest">
                                <Filter className="w-3 h-3" /> Filter
                            </Button>
                        </div>
                    </div>

                    <div className="divide-y divide-border/60">
                        {threads.map((thread) => (
                            <ThreadListItem
                                key={thread.id}
                                thread={thread}
                                categorySlug={categorySlug}
                            />
                        ))}

                        {threads.length === 0 && (
                            <div className="p-20 text-center space-y-4">
                                <div className="p-4 rounded-full bg-secondary/50 w-16 h-16 mx-auto flex items-center justify-center text-muted-foreground">
                                    <MessageSquare className="w-8 h-8" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold">No discussions yet</h3>
                                    <p className="text-muted-foreground max-w-xs mx-auto">Be the first to start a conversation in this category!</p>
                                </div>
                                <Link href={`/forums/new?category=${categorySlug}`}>
                                    <Button className="mt-4 rounded-xl px-8 h-12 font-bold">Start a Thread</Button>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Pagination (Simplified) */}
                {(count || 0) > 20 && (
                    <div className="mt-8 flex items-center justify-center gap-4 font-bold text-sm">
                        <Button variant="secondary" disabled={page === 1} className="rounded-xl">Previous</Button>
                        <span className="text-muted-foreground">Page {page} of {Math.ceil((count || 0) / 20)}</span>
                        <Button variant="secondary" disabled={page * 20 >= (count || 0)} className="rounded-xl">Next</Button>
                    </div>
                )}
            </div>
        </div>
    );
}

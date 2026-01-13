import { Metadata } from "next";
import { getForumCategories } from "@/lib/queries/forum";
import { ForumCategoryCard } from "@/components/forum/ForumCategoryCard";
import { Button } from "@/components/ui/button";
import { Plus, MessageSquare } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
    title: "Forums | RagVault Community",
    description: "Connect with the vintage t-shirt community. Discuss authentication, valuation, and your latest grails.",
};

export default async function ForumsPage() {
    const categories = await getForumCategories();

    return (
        <div className="min-h-screen pb-24">
            {/* Hero Section */}
            <div className="relative overflow-hidden bg-secondary/30 border-b border-border/40">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />

                <div className="container max-w-6xl mx-auto px-6 py-20 relative">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                        <div className="max-w-2xl space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em]">
                                Community Hub
                            </div>
                            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight">
                                Community <span className="text-muted-foreground">Forums</span>
                            </h1>
                            <p className="text-lg text-muted-foreground/80 max-w-lg leading-relaxed font-medium">
                                The central hub for vintage collectors. Connect, share knowledge, and discuss all things single-stitch.
                            </p>
                        </div>

                        <div className="shrink-0 flex gap-4">
                            <Link href="/forums/new">
                                <Button size="lg" className="gap-3 rounded-2xl h-14 px-8 text-base font-bold shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all">
                                    <Plus className="w-5 h-5" />
                                    New Discussion
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container max-w-6xl mx-auto px-6 py-16">
                <div className="flex items-center gap-3 mb-10">
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center border border-border/60">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black tracking-tight">Browse Categories</h2>
                        <p className="text-sm text-muted-foreground">Select a category to start browsing discussions</p>
                    </div>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {categories.map((category) => (
                        <ForumCategoryCard key={category.id} category={category} />
                    ))}
                </div>

                {/* Empty State */}
                {categories.length === 0 && (
                    <div className="text-center py-20 bg-secondary/10 rounded-3xl border-2 border-dashed border-border/40">
                        <div className="max-w-xs mx-auto space-y-4">
                            <p className="text-muted-foreground font-medium">The forums are currently undergoing maintenance. Check back shortly!</p>
                        </div>
                    </div>
                )}

                {/* Community Stats Footer (Optional) */}
                <div className="mt-24 p-8 rounded-3xl bg-secondary/20 border border-border/40 flex flex-wrap justify-center md:justify-around gap-12 text-center">
                    <div className="space-y-1">
                        <p className="text-3xl font-black tracking-tighter">1.2k</p>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Active Collectors</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-3xl font-black tracking-tighter">4.8k</p>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Discussions</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-3xl font-black tracking-tighter">12k+</p>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">Appraisals</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

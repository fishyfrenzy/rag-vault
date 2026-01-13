import { Metadata } from "next";
import { getThreadBySlug, getThreadPosts, incrementThreadView } from "@/lib/queries/forum";
import { PostCard } from "@/components/forum/PostCard";
import { ThreadHeader } from "@/components/forum/ThreadHeader";
import { ReplyEditor } from "@/components/forum/ReplyEditor";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createReply } from "@/app/forums/actions";

interface ThreadPageProps {
    params: Promise<{ category: string; slug: string }>;
}

export async function generateMetadata({ params }: ThreadPageProps): Promise<Metadata> {
    const { slug } = await params;
    const thread = await getThreadBySlug(slug).catch(() => null);

    return {
        title: thread ? `${thread.title} | RagVault Forums` : "Thread Not Found",
        description: thread ? `Join the discussion about ${thread.title}.` : "Forum thread detail.",
    };
}

export default async function ThreadPage({ params }: ThreadPageProps) {
    const { category, slug } = await params;

    const thread = await getThreadBySlug(slug).catch(() => null);
    if (!thread) notFound();

    // Increment view count
    await incrementThreadView(thread.id).catch(err => console.error("Failed to increment view:", err));

    const posts = await getThreadPosts(thread.id);

    const { data: { user } } = await (await createClient()).auth.getUser();
    const profile = user ? (await (await createClient()).from('profiles').select('display_name').eq('id', user.id).single()).data : null;

    // First post is shown specially (it's the thread content)
    const opPost = {
        id: thread.id, // Using thread ID as original post ID for simplicity in UI
        thread_id: thread.id,
        author_id: thread.author_id,
        author: thread.author,
        content: thread.content,
        created_at: thread.created_at,
        updated_at: thread.updated_at,
        upvotes: 0, // Threads will have their own voting in future, using posts for now
        downvotes: 0,
        score: 0,
        is_edited: false,
        parent_post_id: null
    };

    // Note: Since this is a server component, we need to pass a client-safe way to call the action
    // or wrap it. The pathname is needed for revalidation.
    // For now, I'll pass the function directly.
    const currentPath = `/forums/${category}/${slug}`; // Added currentPath

    return (
        <div className="min-h-screen pb-24">
            <div className="bg-secondary/30 border-b border-border/40 py-8">
                <div className="container max-w-4xl mx-auto px-6">
                    <Link href={`/forums/${category}`} className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors mb-6 group">
                        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Back to {category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </Link>

                    <ThreadHeader thread={thread} />
                </div>
            </div>

            <div className="container max-w-4xl mx-auto px-6 py-12 space-y-8">
                {/* Original Post */}
                <PostCard post={opPost as any} isOriginalPost={true} />

                {/* Replies Divider */}
                <div className="flex items-center gap-4 py-4">
                    <div className="h-px bg-border/40 flex-1" />
                    <span className="text-[10px] uppercase font-black tracking-[0.3em] text-muted-foreground">
                        {posts.length} {posts.length === 1 ? 'Reply' : 'Replies'}
                    </span>
                    <div className="h-px bg-border/40 flex-1" />
                </div>

                {/* Reply List */}
                <div className="space-y-6">
                    {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                    ))}

                    {posts.length === 0 && (
                        <div className="py-12 text-center text-muted-foreground bg-secondary/10 rounded-3xl border border-dashed border-border/40 font-medium">
                            No replies yet. Be the first to join the conversation!
                        </div>
                    )}
                </div>

                {/* Reply Editor */}
                <div className="mt-12 pt-12 border-t border-border/40">
                    {user ? (
                        <div className="space-y-6">
                            <h3 className="text-xl font-black tracking-tight">Your Reply</h3>
                            <ReplyEditor
                                placeholder="Share your thoughts, advice, or appreciation..."
                                currentUserDisplayName={profile?.display_name || user.email}
                                onSave={async (content) => {
                                    "use server";
                                    await createReply(thread.id, content, currentPath); // Modified onSave prop
                                }}
                            />
                        </div>
                    ) : (
                        <div className="bg-secondary/30 rounded-3xl p-12 text-center space-y-6 border border-border/40">
                            <p className="text-lg font-bold text-foreground">Sign in to participate in the discussion</p>
                            <Link href="/login">
                                <Button className="px-10 h-12 rounded-xl font-bold">Log In to RagVault</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

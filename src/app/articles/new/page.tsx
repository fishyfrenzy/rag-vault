import { ArticleEditor } from "@/components/article/ArticleEditor";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function NewArticlePage() {
    const supabase = await createClient();

    // Check if user is authenticated and admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        redirect("/login");
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();

    if (!profile?.is_admin) {
        redirect("/");
    }

    return <ArticleEditor />;
}

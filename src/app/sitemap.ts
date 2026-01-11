import { createClient } from "@/lib/supabase/server";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const supabase = await createClient();

    // Get all vault items with slugs
    const { data: vaultItems } = await supabase
        .from("the_vault")
        .select("id, slug, updated_at, verification_count")
        .order("created_at", { ascending: false })
        .limit(10000);

    const baseUrl = "https://www.ragvault.io";

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${baseUrl}/vault`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/marketplace`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
    ];

    // Dynamic vault item pages
    const vaultPages: MetadataRoute.Sitemap = (vaultItems || []).map((item) => ({
        url: `${baseUrl}/vault/${item.slug || item.id}`,
        lastModified: item.updated_at ? new Date(item.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: item.verification_count >= 2 ? 0.8 : 0.6,
    }));

    return [...staticPages, ...vaultPages];
}

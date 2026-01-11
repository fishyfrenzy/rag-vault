import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { VaultItemJsonLd, BreadcrumbJsonLd } from "@/components/seo/JsonLd";
import VaultItemClient from "./VaultItemClient";

interface VaultItem {
    id: string;
    subject: string;
    category: string;
    year: string | null;
    tag_brand: string | null;
    stitch_type: string | null;
    material: string | null;
    origin: string | null;
    body_type: string | null;
    reference_image_url: string | null;
    verification_count: number;
    upvotes: number;
    downvotes: number;
    score: number;
    created_at: string;
    created_by: string | null;
    description: string | null;
    tags: string[] | null;
    parent_id: string | null;
    variant_type: string | null;
    slug: string | null;
}

// Generate dynamic metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
    const { id } = await params;
    const supabase = await createClient();

    const { data: item } = await supabase
        .from("the_vault")
        .select("subject, category, year, tag_brand, description, reference_image_url, verification_count")
        .or(`id.eq.${id},slug.eq.${id}`)
        .single();

    if (!item) {
        return {
            title: "Shirt Not Found | RagVault",
        };
    }

    const yearText = item.year ? ` (${item.year})` : "";
    const tagText = item.tag_brand ? ` | ${item.tag_brand} Tag` : "";
    const verifiedText = item.verification_count >= 2 ? " ✓ Verified" : "";

    const title = `${item.subject}${yearText} | Vintage ${item.category} Shirt${verifiedText} | RagVault`;
    const description = item.description
        || `Authentic vintage ${item.category} t-shirt: ${item.subject}${yearText}.${tagText}. Verified by ${item.verification_count} collectors. Browse our archive of vintage tees.`;

    return {
        title,
        description,
        keywords: [
            item.subject,
            "vintage shirt",
            "vintage t-shirt",
            item.category,
            item.year,
            item.tag_brand,
            "authentication",
            "real or fake",
        ].filter(Boolean).join(", "),
        openGraph: {
            title,
            description,
            type: "website",
            images: item.reference_image_url ? [
                {
                    url: item.reference_image_url,
                    width: 800,
                    height: 800,
                    alt: item.subject,
                },
            ] : undefined,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: item.reference_image_url ? [item.reference_image_url] : undefined,
        },
    };
}

// Server component for initial data fetch
export default async function VaultItemPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const supabase = await createClient();

    // Fetch item by ID or slug
    const { data: item } = await supabase
        .from("the_vault")
        .select("*")
        .or(`id.eq.${id},slug.eq.${id}`)
        .single();

    if (!item) {
        notFound();
    }

    // Breadcrumbs for SEO
    const breadcrumbs = [
        { name: "Home", url: "https://www.ragvault.io" },
        { name: "Vault", url: "https://www.ragvault.io/vault" },
        { name: item.subject, url: `https://www.ragvault.io/vault/${item.slug || item.id}` },
    ];

    return (
        <>
            {/* JSON-LD Structured Data */}
            <VaultItemJsonLd item={item} />
            <BreadcrumbJsonLd items={breadcrumbs} />

            {/* Client-side interactive component */}
            <VaultItemClient initialItem={item as VaultItem} />
        </>
    );
}

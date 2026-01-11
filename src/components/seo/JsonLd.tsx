interface VaultItemJsonLdProps {
    item: {
        id: string;
        subject: string;
        description?: string | null;
        category: string;
        year?: string | null;
        tag_brand?: string | null;
        reference_image_url?: string | null;
        verification_count: number;
        created_at: string;
    };
}

export function VaultItemJsonLd({ item }: VaultItemJsonLdProps) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Product",
        name: item.subject,
        description: item.description || `Authentic vintage ${item.category} t-shirt from ${item.year || "unknown year"}. ${item.tag_brand ? `Tag: ${item.tag_brand}.` : ""} Verified by ${item.verification_count} collectors on RagVault.`,
        image: item.reference_image_url || undefined,
        brand: item.tag_brand ? {
            "@type": "Brand",
            name: item.tag_brand,
        } : undefined,
        category: `Vintage ${item.category} T-Shirt`,
        dateCreated: item.created_at,
        aggregateRating: item.verification_count > 0 ? {
            "@type": "AggregateRating",
            ratingValue: Math.min(5, 3 + (item.verification_count * 0.5)).toFixed(1),
            reviewCount: item.verification_count,
            bestRating: 5,
            worstRating: 1,
        } : undefined,
        offers: {
            "@type": "Offer",
            availability: "https://schema.org/InStock",
            priceCurrency: "USD",
            price: "0", // Free to view
            url: `https://www.ragvault.io/vault/${item.id}`,
        },
    };

    // Remove undefined keys
    const cleanJsonLd = JSON.parse(JSON.stringify(jsonLd));

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(cleanJsonLd) }}
        />
    );
}

interface BreadcrumbJsonLdProps {
    items: Array<{ name: string; url: string }>;
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.url,
        })),
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

interface WebsiteJsonLdProps {
    name?: string;
    description?: string;
    url?: string;
}

export function WebsiteJsonLd({
    name = "RagVault",
    description = "Reference Archive & Marketplace for Vintage T-Shirts",
    url = "https://www.ragvault.io"
}: WebsiteJsonLdProps) {
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name,
        description,
        url,
        potentialAction: {
            "@type": "SearchAction",
            target: {
                "@type": "EntryPoint",
                urlTemplate: `${url}/vault?q={search_term_string}`,
            },
            "query-input": "required name=search_term_string",
        },
    };

    return (
        <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
    );
}

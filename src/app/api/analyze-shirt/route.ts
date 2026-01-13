import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface AnalysisResult {
    subject: string;
    category: string;
    year: number | null;
    year_range_start: number | null;
    year_range_end: number | null;
    tag_brand: string | null;
    confidence: number;
    description: string;
}

interface VaultMatch {
    id: string;
    subject: string;
    category: string;
    year: number | null;
    tag_brand: string | null;
    reference_image_url: string | null;
    similarity: number;
}

interface TagGuideEntry {
    id: string;
    brand_name: string;
    variation_name: string | null;
    era_start: number;
    era_end: number | null;
    description: string | null;
    reference_image_url: string | null;
}

export async function POST(request: Request) {
    try {
        // Authentication check - require logged in user
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json(
                { error: "Authentication required" },
                { status: 401 }
            );
        }

        // Rate limiting - max 10 requests per hour per user
        const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
        const windowStart = new Date(Math.floor(Date.now() / 3600000) * 3600000).toISOString();

        const { count } = await supabase
            .from('rate_limits')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('action', 'analyze_shirt')
            .gte('window_start', oneHourAgo);

        if (count && count >= 10) {
            return NextResponse.json(
                { error: "Rate limit exceeded. Maximum 10 analyses per hour." },
                { status: 429 }
            );
        }

        // Record this request for rate limiting
        await supabase.from('rate_limits').upsert({
            user_id: user.id,
            action: 'analyze_shirt',
            window_start: windowStart,
            count: (count || 0) + 1
        }, {
            onConflict: 'user_id,action,window_start'
        });

        const { imageUrls } = await request.json();
        console.log("Received imageUrls:", imageUrls?.length, "from user:", user.id);

        if (!imageUrls || imageUrls.length < 2) {
            return NextResponse.json(
                { error: "At least 2 images required" },
                { status: 400 }
            );
        }

        if (!process.env.GOOGLE_AI_API_KEY) {
            console.error("Missing GOOGLE_AI_API_KEY");
            return NextResponse.json(
                { error: "GOOGLE_AI_API_KEY not configured" },
                { status: 500 }
            );
        }

        // Fetch existing vault items and tag guide for context
        const [vaultResult, tagGuideResult] = await Promise.all([
            supabase
                .from("the_vault")
                .select("id, subject, category, year, tag_brand, reference_image_url")
                .limit(200),
            supabase
                .from("tag_guide")
                .select("id, brand_name, variation_name, era_start, era_end, description, reference_image_url")
        ]);

        const vaultItems = vaultResult.data || [];
        const tagGuide: TagGuideEntry[] = tagGuideResult.data || [];

        console.log(`Found ${vaultItems.length} vault items, ${tagGuide.length} tag guide entries`);

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Fetch images and convert to base64
        console.log("Fetching images...");
        const imageParts = await Promise.all(
            imageUrls.map(async (url: string, i: number) => {
                console.log(`Fetching image ${i + 1}:`, url.substring(0, 50));
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch image ${i + 1}: ${response.status}`);
                }
                const buffer = await response.arrayBuffer();
                const base64 = Buffer.from(buffer).toString("base64");
                const mimeType = response.headers.get("content-type") || "image/jpeg";
                return {
                    inlineData: {
                        data: base64,
                        mimeType,
                    },
                };
            })
        );
        console.log("All images fetched successfully");

        // Build context strings for the prompt
        const existingSubjects = vaultItems.map(item => item.subject).join(", ");
        const tagGuideContext = tagGuide.map(tag => {
            const tagName = tag.variation_name
                ? `${tag.brand_name} (${tag.variation_name})`
                : tag.brand_name;
            return `- ${tagName} [${tag.era_start}-${tag.era_end || 'present'}]: ${tag.description || 'No description'}`;
        }).join("\n");

        const prompt = `You are an expert vintage t-shirt appraiser and collector. Analyze these photos of a vintage t-shirt and extract the following information.

IMPORTANT: Be specific and accurate. If you cannot determine something with confidence, use null.

## EXISTING DATABASE SUBJECTS
The following subjects already exist in our database. If this shirt matches any of them, use the EXACT same subject name:
${existingSubjects || "No existing items in database yet."}

## TAG GUIDE - CRITICAL FOR DATING
Use this guide to identify the tag/manufacturer brand. The date range indicates when this tag style was used - use this to estimate the shirt's year:
${tagGuideContext || "No tag guide available."}

**IMPORTANT**: If you identify a tag brand from the guide above, the shirt's year MUST fall within that tag's date range. For example, if you see a "Giant" tag (1988-1995), the year should be estimated between 1988-1995.

## RESPONSE FORMAT
Respond ONLY with valid JSON in this exact format:
{
  "subject": "The main subject/band/brand/artwork (e.g., 'Metallica', 'Harley-Davidson', 'Grateful Dead')",
  "category": "One of: Music, Motorcycle, Movie, Art, Sport, Advertising, Other",
  "year": The estimated year as a number based on tag era and design style (e.g., 1991) or null if unknown,
  "year_range_start": The earliest possible year based on tag dating or null,
  "year_range_end": The latest possible year based on tag dating or null,
  "tag_brand": "The tag/maker brand if visible (e.g., 'Giant', 'Hanes', 'Fruit of the Loom') or null",
  "confidence": A number from 0-100 indicating your confidence in the identification,
  "description": "A brief description of the shirt design and any notable features",
  "matched_existing_subject": true if the subject matches an existing database entry exactly, false otherwise
}

Analyze the shirt in these images:`;


        console.log("Calling Gemini API...");
        const result = await model.generateContent([prompt, ...imageParts]);
        const response = await result.response;
        const text = response.text();
        console.log("Gemini response:", text.substring(0, 200));

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("Could not find JSON in response:", text);
            throw new Error("Could not parse AI response");
        }

        const analysis: AnalysisResult & { matched_existing_subject?: boolean } = JSON.parse(jsonMatch[0]);
        console.log("Analysis complete:", analysis.subject);

        // Find potential matches in the vault
        const potentialMatches: VaultMatch[] = vaultItems
            .filter(item => {
                const subjectLower = (item.subject || "").toLowerCase();
                const analysisSubjectLower = (analysis.subject || "").toLowerCase();
                // Check for exact match or partial match
                return subjectLower === analysisSubjectLower ||
                    subjectLower.includes(analysisSubjectLower) ||
                    analysisSubjectLower.includes(subjectLower);
            })
            .map(item => ({
                id: item.id,
                subject: item.subject,
                category: item.category,
                year: item.year,
                tag_brand: item.tag_brand,
                reference_image_url: item.reference_image_url,
                similarity: item.subject?.toLowerCase() === analysis.subject?.toLowerCase() ? 100 : 70
            }))
            .slice(0, 5); // Limit to top 5 matches

        // Find matching tag guide entry
        const tagGuideMatch = tagGuide.find(tag =>
            tag.brand_name.toLowerCase() === (analysis.tag_brand || "").toLowerCase()
        );

        return NextResponse.json({
            analysis,
            potentialMatches,
            tagGuideMatch: tagGuideMatch || null
        });
    } catch (error) {
        console.error("Analysis error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to analyze images: ${message}` },
            { status: 500 }
        );
    }
}

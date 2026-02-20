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
    cut_id: number | null;
    era_id: number | null;
    print_method_id: number | null;
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

        // Fetch existing vault items, tag guide, and new taxonomy tables for context
        const [vaultResult, tagGuideResult, cutsResult, erasResult, printMethodsResult] = await Promise.all([
            supabase
                .from("the_vault")
                .select("id, subject, category, year, tag_brand, reference_image_url")
                .limit(200),
            supabase
                .from("tag_guide")
                .select("id, brand_name, variation_name, era_start, era_end, description, reference_image_url"),
            supabase.from("shirt_cuts").select("*"),
            supabase.from("shirt_eras").select("*"),
            supabase.from("print_methods").select("*")
        ]);

        const vaultItems = vaultResult.data || [];
        const tagGuide: TagGuideEntry[] = tagGuideResult.data || [];
        const cuts = cutsResult.data || [];
        const eras = erasResult.data || [];
        const printMethods = printMethodsResult.data || [];

        console.log(`Found ${vaultItems.length} vault items, ${tagGuide.length} tag guide entries, + Taxonomy`);

        const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        // Fetch images and convert to base64
        console.log("Fetching images...");
        const imageParts = await Promise.all(
            imageUrls.map(async (url: string, i: number) => {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Failed to fetch image ${i + 1}: ${response.status}`);
                const buffer = await response.arrayBuffer();
                const base64 = Buffer.from(buffer).toString("base64");
                const mimeType = response.headers.get("content-type") || "image/jpeg";
                return { inlineData: { data: base64, mimeType } };
            })
        );
        console.log("All images fetched successfully");

        // Build context strings for the prompt
        const tagGuideContext = tagGuide.map(tag => {
            const tagName = tag.variation_name ? `${tag.brand_name} (${tag.variation_name})` : tag.brand_name;
            return `- ${tagName} [${tag.era_start}-${tag.era_end || 'present'}]`;
        }).join("\n");

        const cutsContext = cuts.map(c => `- ID: ${c.id} | ${c.name}: ${c.description || ''}`).join("\n");
        const erasContext = eras.map(e => `- ID: ${e.id} | ${e.name} (${e.year_start}-${e.year_end || 'present'})`).join("\n");
        const printsContext = printMethods.map(p => `- ID: ${p.id} | ${p.name}: ${p.description || ''}`).join("\n");

        const prompt = `You are an expert vintage t-shirt appraiser and collector. Analyze these photos of a vintage t-shirt and extract strict structured information.

IMPORTANT: You MUST rely on the Front, Back, and Tag photos provided. Look for single-stitching, licensing dates, fading patterns, and exact tag brands.

## TAXONOMY GUIDES - STRICT MATCHING REQUIRED
You must match the visual characteristics of the shirt to the EXACT ID numbers from these lists:

**Shirt Cuts / Stitching** (Look at hems):
${cutsContext}

**Style Eras**:
${erasContext}

**Print Methods**:
${printsContext}

## TAG GUIDE - CRITICAL FOR DATING
You must follow this exact sequence for dating the shirt:
1. FIRST, look at the photo of the tag. Identify the tag brand and compare it to this list:
${tagGuideContext || "No tag guide available."}
2. SECOND, establish the 'era_start' and 'era_end' strictly based on the tag brand you identified.
3. THIRD, look at the graphic photos (copyright dates, style, fading) to estimate the exact "year" - but it MUST fall within the tag's era boundary you established in step 2.

## RESPONSE FORMAT
Respond ONLY with valid JSON in this exact format, using NULL if a field cannot be confidently determined:
{
  "subject": "The main subject/band/brand/artwork (e.g., 'Metallica', 'Harley-Davidson')",
  "category": "One of: Music, Motorcycle, Movie, Art, Sport, Advertising, Other",
  "year": Estimated year (number),
  "year_range_start": Earliest possible year (number),
  "year_range_end": Latest possible year (number),
  "tag_brand": "The exact tag/maker brand if visible",
  "confidence": A number from 0-100 indicating your confidence,
  "description": "A brief explanation of why you chose these dates and attributes.",
  "cut_id": (Number) The EXACT ID from the Shirt Cuts list above,
  "era_id": (Number) The EXACT ID from the Style Eras list above,
  "print_method_id": (Number) The EXACT ID from the Print Methods list above
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

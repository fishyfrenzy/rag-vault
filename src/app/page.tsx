import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/button";
import { ActivityTicker } from "@/components/activity/ActivityTicker";
import { HomeAuthButton } from "@/components/home/HomeAuthButton";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client"; // Note: In server components we often use createClient from utils, but for public read accessible tables client is often fine or we use fetch. 
// Actually, standard pattern often involves checking if it's a server component. 
// However, since we are just doing a public read, we can use a direct fetch or the supabase client if configured for server (or just client side fetch if we converted to "use client", but I said I'd keep it server).
// Let's use the standard server-side fetching pattern if possible, or just standard fetching. 
// Wait, `src/app/page.tsx` is server by default. I need to make it async.

// Let's use the provided supabase client or just use standard fetch if needed.
// IMPORTANT: `import { supabase } from "@/lib/supabase/client"` is a client-side initialized client usually.
// For server components, we usually use `createClient` from `@supabase/supabase-js` or a helper.
// I will use a simple fetch wrapper or use the existing client if it works (it might complain about missing storage if it uses local storage).
// Better to simple fetch for public data or use a server-safe client.
// I'll check `src/lib/supabase/server.ts` if it exists. (Verified in step 1138 summary it exists).

import { createClient } from "@/lib/supabase/server";

export const revalidate = 60; // Revalidate every 60 seconds

export default async function Home() {
  const supabase = await createClient(); // Await if createClient is async, but checking server.ts standard pattern usually it's sync or async. 
  // Wait, in previous step 1138 summary, it says "createClient function for server-side Supabase interactions".
  // Let's assume it might return a Promise safely or just await it to be sure if using the latest Next.js helpers.
  // Actually, checked standard Next.js supabase auth helpers, createServerClient often needs cookies() which is async in newer Next.js.
  // If lint says "Property 'from' does not exist on type 'Promise...'", then `createClient()` returns a Promise. So I MUST await it.

  // Fetch fresh items
  const { data: freshItems } = await supabase
    .from('the_vault')
    .select('id, subject, category, reference_image_url, year')
    .order('created_at', { ascending: false })
    .limit(8);

  return (
    <MobileContainer className="pb-20">
      {/* Hero Section */}
      <section className="relative px-6 py-12 md:py-32 space-y-8 max-w-7xl mx-auto overflow-hidden">

        {/* Background Textures/Image */}
        <div className="absolute inset-0 z-0">
          <img src="/hero-shirts.jpg" alt="Background" className="object-cover w-full h-full opacity-60 blur-[2px] brightness-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/40 to-background" />
        </div>

        <div className="relative z-10 md:flex md:items-center md:justify-between md:gap-12">
          <div className="space-y-6">
            <h2 className="text-4xl md:text-7xl font-extrabold leading-tight tracking-tight drop-shadow-2xl">
              Catalog. <br />
              Collect. <br />
              <span className="text-muted-foreground">Connect.</span>
            </h2>
            <p className="text-muted-foreground max-w-[280px] md:max-w-xl md:text-xl font-medium">
              The definitive database for vintage t-shirts.
              Upload your collection to the vault.
            </p>
            <div className="flex gap-4 pt-4">
              <Link href="/vault">
                <Button size="lg" className="rounded-full px-8 md:px-12 md:h-14 md:text-lg shadow-lg shadow-primary/20">
                  Explore the Vault
                </Button>
              </Link>
              <HomeAuthButton />
            </div>

            {/* Mobile Activity Ticker - Hero variant (below buttons) */}
            <div className="mt-6 md:hidden">
              <ActivityTicker variant="hero" />
            </div>
          </div>

          {/* Right Side: Desktop Activity Widget */}
          <div className="hidden md:block w-80 flex-shrink-0">
            <ActivityTicker variant="hero" />
          </div>
        </div>
      </section>

      {/* Featured / Feed */}
      <section className="mt-8 space-y-6 max-w-7xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg md:text-2xl">Find of the Week</h3>
          <span className="text-xs text-muted-foreground md:text-sm">View all</span>
        </div>

        {/* Mock Carousel Item - Responsive Width */}
        <div className="md:grid md:grid-cols-2 md:gap-8">
          <div className="mx-0 aspect-[4/5] bg-secondary rounded-2xl relative overflow-hidden group md:aspect-video">
            <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
            <div className="absolute bottom-4 left-4 text-white z-10">
              <p className="font-bold text-lg md:text-3xl">Metallica</p>
              <p className="text-sm opacity-90 md:text-lg">1991 · Pushead · Giant</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-8">
          <h3 className="font-semibold text-lg md:text-2xl">Fresh to the Vault</h3>
        </div>

        {/* Fresh Grid - Real Data */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {freshItems?.map((item: any) => (
            <Link key={item.id} href={`/vault/${item.id}`}>
              <div className="space-y-2 group cursor-pointer">
                <div className="aspect-square bg-secondary rounded-xl overflow-hidden border border-border/50 relative">
                  {item.reference_image_url ? (
                    <img
                      src={item.reference_image_url}
                      alt={item.subject}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-secondary/50">
                      👕
                    </div>
                  )}

                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </div>
                <div className="px-1">
                  <p className="font-medium text-sm md:text-base line-clamp-1">{item.subject}</p>
                  <p className="text-xs text-muted-foreground md:text-sm">
                    {item.year ? item.year.toString().split(',')[0] : 'Unknown'} · {item.category}
                  </p>
                </div>
              </div>
            </Link>
          ))}

          {(!freshItems || freshItems.length === 0) && (
            <div className="col-span-full py-12 text-center text-muted-foreground">
              No items in the vault yet. Be the first!
            </div>
          )}
        </div>
      </section>
    </MobileContainer>
  );
}


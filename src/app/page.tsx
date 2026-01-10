import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/button";
import { ActivityTicker } from "@/components/activity/ActivityTicker";
import Link from "next/link";

export default function Home() {
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
              <Link href="/login">
                <Button size="lg" variant="outline" className="rounded-full px-8 md:px-12 md:h-14 md:text-lg backdrop-blur-sm bg-background/50">
                  Sign In
                </Button>
              </Link>
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

        {/* Mock Grid - Responsive Columns */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="space-y-2 group cursor-pointer">
              <div className="aspect-square bg-secondary rounded-xl overflow-hidden">
                <div className="w-full h-full bg-muted/20 group-hover:bg-muted/40 transition-colors" />
              </div>
              <div className="px-1">
                <p className="font-medium text-sm md:text-base">Harley Davidson</p>
                <p className="text-xs text-muted-foreground md:text-sm">$120 · L</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </MobileContainer>
  );
}


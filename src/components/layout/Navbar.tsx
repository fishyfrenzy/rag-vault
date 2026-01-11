"use client"

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, PlusCircle, User, Store, FolderHeart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from "@/components/auth/AuthProvider";
import { ActivityTicker } from "@/components/activity/ActivityTicker";

export function Navbar() {
    const pathname = usePathname();
    const { user } = useAuth();
    const isHomePage = pathname === '/';

    // Use a stable scroll position check - for non-home pages, always consider scrolled
    const scrolledPastHero = React.useSyncExternalStore(
        (callback) => {
            if (!isHomePage) return () => { }; // No subscription needed for non-home pages
            window.addEventListener('scroll', callback);
            return () => window.removeEventListener('scroll', callback);
        },
        () => !isHomePage || (typeof window !== 'undefined' && window.scrollY > 200),
        () => !isHomePage // Server snapshot
    );

    const navItems = [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Vault', href: '/vault', icon: Search },
        { label: 'Marketplace', href: '/marketplace', icon: Store },
        { label: 'My Collection', href: '/my-collection', icon: FolderHeart },
        { label: 'Profile', href: '/profile', icon: User },
    ];

    // Show ticker in header when: not on homepage, OR scrolled past hero on homepage
    const showTickerInHeader = !isHomePage || scrolledPastHero;

    return (
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md px-6 py-4 border-b border-border/40">
            <div className="flex items-center justify-between">
                {/* Logo */}
                <div className="relative w-32 h-10 flex-shrink-0">
                    <Link href="/">
                        <img src="/logo-main.png" alt="Ragvault" className="object-contain w-full h-full object-left invert" />
                    </Link>
                </div>

                {/* Mobile: Centered Activity Ticker */}
                <div
                    className={cn(
                        "absolute left-1/2 -translate-x-1/2 max-w-[200px] md:hidden transition-opacity duration-300",
                        showTickerInHeader ? "opacity-100" : "opacity-0 pointer-events-none"
                    )}
                >
                    <ActivityTicker variant="header" />
                </div>

                {/* Desktop Navigation Links */}
                <nav className="hidden md:flex items-center gap-8">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "text-sm font-medium transition-colors hover:text-primary",
                                    isActive ? "text-primary" : "text-muted-foreground"
                                )}
                            >
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* Right Side: Desktop Ticker (when scrolled) + Avatar */}
                <div className="flex items-center gap-4">
                    {/* Desktop Activity Ticker - shows when scrolled */}
                    <div
                        className={cn(
                            "hidden md:block max-w-[250px] transition-opacity duration-300",
                            showTickerInHeader ? "opacity-100" : "opacity-0 pointer-events-none"
                        )}
                    >
                        <ActivityTicker variant="header" />
                    </div>

                    {/* Avatar / Login */}
                    {user ? (
                        <Link href="/profile">
                            <div className="w-8 h-8 rounded-full bg-secondary overflow-hidden border border-border">
                                {user.user_metadata.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-xs">
                                        {user.email?.[0].toUpperCase()}
                                    </div>
                                )}
                            </div>
                        </Link>
                    ) : (
                        <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
                            Log In
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}




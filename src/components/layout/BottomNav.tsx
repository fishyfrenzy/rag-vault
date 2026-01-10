"use client"

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Search, Store, FolderHeart, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function BottomNav() {
    const pathname = usePathname();

    const navItems = [
        { label: 'Home', href: '/', icon: Home },
        { label: 'Vault', href: '/vault', icon: Search },
        { label: 'Market', href: '/marketplace', icon: Store },
        { label: 'Collection', href: '/my-collection', icon: FolderHeart },
        { label: 'Profile', href: '/profile', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-500 md:hidden">
            <div className="mx-auto max-w-md">
                <div className="flex items-center justify-around h-16 bg-background/80 backdrop-blur-md border-t border-border">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href ||
                            (item.href === '/my-collection' && pathname === '/sell');
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors",
                                    isActive
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-primary/70"
                                )}
                            >
                                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                                <span className="text-[9px] font-medium tracking-wide">
                                    {item.label}
                                </span>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

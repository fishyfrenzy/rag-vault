"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ActivityTicker } from "@/components/activity/ActivityTicker";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [isSignUp, setIsSignUp] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
        });

        if (error) {
            setMessage("Error sending magic link. Please try again.");
            console.error(error);
        } else {
            setMessage("Check your email for the magic link!");
        }
        setLoading(false);
    };

    const handleGoogleLogin = async () => {
        setLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            }
        });

        if (error) {
            console.error("Google Auth Error:", error);
            setMessage(`Google sign-in failed: ${error.message}`);
            setLoading(false);
        }
        // Note: if successful, page will redirect so no need to setLoading(false)
    };

    return (
        <div className="min-h-screen flex">
            {/* Left Side - Branding (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10">
                    <div className="absolute inset-0" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                    }} />
                </div>

                <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
                    {/* Large Logo */}
                    <img
                        src="/logo-main.png"
                        alt="RagVault"
                        className="w-64 h-auto invert mb-8 drop-shadow-2xl"
                    />

                    <h1 className="text-4xl font-extrabold text-white text-center mb-4">
                        The Vault Awaits
                    </h1>

                    <p className="text-xl text-zinc-400 text-center max-w-md">
                        Join the definitive community for vintage t-shirt collectors, sellers, and enthusiasts.
                    </p>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap gap-3 mt-8 justify-center">
                        <span className="px-4 py-2 bg-white/10 rounded-full text-sm text-white/80">
                            📦 10,000+ Entries
                        </span>
                        <span className="px-4 py-2 bg-white/10 rounded-full text-sm text-white/80">
                            🔍 AI-Powered Search
                        </span>
                        <span className="px-4 py-2 bg-white/10 rounded-full text-sm text-white/80">
                            ⭐ Karma System
                        </span>
                    </div>

                    {/* Live Activity Ticker */}
                    <div className="mt-10 w-full max-w-sm">
                        <ActivityTicker variant="hero" />
                    </div>
                </div>
            </div>

            {/* Right Side - Auth Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 lg:p-12 bg-background">
                {/* Mobile Logo */}
                <div className="lg:hidden mb-8">
                    <img
                        src="/logo-main.png"
                        alt="RagVault"
                        className="w-32 h-auto invert"
                    />
                </div>

                <div className="w-full max-w-sm space-y-6">
                    {/* Header */}
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold">
                            {isSignUp ? "Create Account" : "Welcome Back"}
                        </h1>
                        <p className="text-muted-foreground">
                            {isSignUp
                                ? "Join the vault and start your collection"
                                : "Sign in to access the vault"
                            }
                        </p>
                    </div>

                    {/* Social Login */}
                    <div className="space-y-3">
                        <Button
                            variant="outline"
                            className="w-full h-12 text-base flex items-center justify-center gap-3 hover:bg-secondary/80"
                            onClick={handleGoogleLogin}
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                    fill="#4285F4"
                                />
                                <path
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                    fill="#34A853"
                                />
                                <path
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                    fill="#FBBC05"
                                />
                                <path
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                    fill="#EA4335"
                                />
                            </svg>
                            Continue with Google
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">Or continue with email</span>
                        </div>
                    </div>

                    {/* Email Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <input
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="flex h-12 w-full rounded-lg border border-input bg-background px-4 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            />
                        </div>
                        <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                            {loading ? "Sending Link..." : "Send Magic Link ✨"}
                        </Button>
                    </form>

                    {/* Message */}
                    {message && (
                        <div className="p-4 rounded-lg bg-primary/10 text-primary text-center text-sm animate-in fade-in">
                            {message}
                        </div>
                    )}

                    {/* Toggle Sign Up / Sign In */}
                    <div className="text-center text-sm">
                        <span className="text-muted-foreground">
                            {isSignUp ? "Already have an account? " : "New to RagVault? "}
                        </span>
                        <button
                            type="button"
                            onClick={() => setIsSignUp(!isSignUp)}
                            className="text-primary hover:underline font-medium"
                        >
                            {isSignUp ? "Sign In" : "Create Account"}
                        </button>
                    </div>

                    {/* Back to Home */}
                    <div className="text-center">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            ← Back to Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

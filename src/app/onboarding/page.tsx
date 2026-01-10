"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function Label({ children }: { children: React.ReactNode }) {
    return <label className="text-sm font-medium leading-none">{children}</label>
}

export default function OnboardingPage() {
    const { user } = useAuth();
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);

    // Validate username format
    const isValidUsername = (name: string) => {
        if (name.length < 3) return "Username must be at least 3 characters";
        if (name.length > 20) return "Username must be 20 characters or less";
        if (!/^[a-zA-Z0-9_]+$/.test(name)) return "Only letters, numbers, and underscores";
        return null;
    };

    // Check username availability
    const checkUsername = useCallback(async (name: string) => {
        const formatError = isValidUsername(name);
        if (formatError) {
            setUsernameError(formatError);
            setUsernameAvailable(null);
            return;
        }

        setCheckingUsername(true);
        setUsernameError(null);

        const { data } = await supabase
            .from('profiles')
            .select('id')
            .eq('username', name.toLowerCase())
            .single();

        setCheckingUsername(false);
        setUsernameAvailable(!data);
        if (data) setUsernameError("Username is taken");
    }, []);

    // Debounced username check
    useEffect(() => {
        if (!username) {
            setUsernameAvailable(null);
            setUsernameError(null);
            return;
        }

        const timer = setTimeout(() => {
            checkUsername(username);
        }, 500);

        return () => clearTimeout(timer);
    }, [username, checkUsername]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !usernameAvailable) return;

        setLoading(true);

        const { error } = await supabase
            .from('profiles')
            .update({
                username: username.toLowerCase(),
                display_name: displayName || username
            })
            .eq('id', user.id);

        if (error) {
            console.error(error);
            if (error.code === '23505') {
                setUsernameError("Username was just taken, try another");
                setUsernameAvailable(false);
            } else {
                alert("Error updating profile: " + error.message);
            }
        } else {
            window.location.href = "/";
        }
        setLoading(false);
    };

    return (
        <MobileContainer className="flex flex-col items-center justify-center p-6 space-y-8 min-h-screen">
            <div className="space-y-2 text-center">
                <h1 className="text-3xl font-bold">Welcome to Ragvault</h1>
                <p className="text-muted-foreground">
                    Let&apos;s set up your collector profile.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="w-full space-y-6">
                <div className="space-y-4">
                    <div className="flex justify-center">
                        <div className="w-24 h-24 rounded-full bg-secondary flex items-center justify-center border-2 border-dashed border-muted-foreground/50">
                            <span className="text-xs text-center text-muted-foreground">Avatar<br />(Coming Soon)</span>
                        </div>
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                        <Label>Username</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                            <Input
                                value={username}
                                onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                placeholder="vintage_king"
                                className={cn(
                                    "h-12 text-lg pl-8 pr-10",
                                    usernameAvailable === true && "border-green-500 focus:ring-green-500",
                                    usernameAvailable === false && "border-red-500 focus:ring-red-500"
                                )}
                                required
                                minLength={3}
                                maxLength={20}
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                {checkingUsername && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                                {!checkingUsername && usernameAvailable === true && <Check className="w-5 h-5 text-green-500" />}
                                {!checkingUsername && usernameAvailable === false && <X className="w-5 h-5 text-red-500" />}
                            </div>
                        </div>
                        {usernameError ? (
                            <p className="text-xs text-red-500">{usernameError}</p>
                        ) : (
                            <p className="text-xs text-muted-foreground">Your unique profile URL: ragvault.io/u/{username || 'username'}</p>
                        )}
                    </div>

                    {/* Display Name */}
                    <div className="space-y-2">
                        <Label>Display Name (optional)</Label>
                        <Input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="The Vintage King"
                            className="h-12 text-lg"
                            maxLength={50}
                        />
                        <p className="text-xs text-muted-foreground">How your name appears on your profile. Defaults to username.</p>
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-12 text-lg"
                    disabled={loading || !username || !usernameAvailable}
                >
                    {loading ? "Creating Profile..." : "Complete Setup"}
                </Button>
            </form>
        </MobileContainer>
    );
}


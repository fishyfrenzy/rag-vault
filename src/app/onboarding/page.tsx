"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { supabase } from "@/lib/supabase/client";
import { MobileContainer } from "@/components/layout/MobileContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, X, Loader2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

const INVITE_ONLY = process.env.NEXT_PUBLIC_INVITE_ONLY === 'true';

function Label({ children }: { children: React.ReactNode }) {
    return <label className="text-sm font-medium leading-none">{children}</label>
}

export default function OnboardingPage() {
    const { user } = useAuth();
    const [username, setUsername] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [inviteCode, setInviteCode] = useState("");
    const [loading, setLoading] = useState(false);
    const [checkingUsername, setCheckingUsername] = useState(false);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [usernameError, setUsernameError] = useState<string | null>(null);
    const [inviteCodeValid, setInviteCodeValid] = useState<boolean | null>(null);
    const [inviteCodeError, setInviteCodeError] = useState<string | null>(null);
    const [checkingCode, setCheckingCode] = useState(false);

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

    // Check invite code validity
    const checkInviteCode = useCallback(async (code: string) => {
        if (code.length < 8) {
            setInviteCodeValid(null);
            setInviteCodeError(null);
            return;
        }

        setCheckingCode(true);
        setInviteCodeError(null);

        const { data } = await supabase
            .from('invite_codes')
            .select('id')
            .eq('code', code.toUpperCase())
            .is('used_by', null)
            .single();

        setCheckingCode(false);
        setInviteCodeValid(!!data);
        if (!data) setInviteCodeError("Invalid or already used code");
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

    // Debounced invite code check
    useEffect(() => {
        if (!INVITE_ONLY || !inviteCode) {
            setInviteCodeValid(null);
            setInviteCodeError(null);
            return;
        }

        const timer = setTimeout(() => {
            checkInviteCode(inviteCode);
        }, 500);

        return () => clearTimeout(timer);
    }, [inviteCode, checkInviteCode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !usernameAvailable) return;
        if (INVITE_ONLY && !inviteCodeValid) return;

        setLoading(true);

        // First, claim the invite code if required
        if (INVITE_ONLY) {
            const { error: codeError } = await supabase
                .from('invite_codes')
                .update({ used_by: user.id, used_at: new Date().toISOString() })
                .eq('code', inviteCode.toUpperCase())
                .is('used_by', null);

            if (codeError) {
                setInviteCodeError("Code was just claimed by someone else");
                setInviteCodeValid(false);
                setLoading(false);
                return;
            }
        }

        // Update profile
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
            setLoading(false);
            return;
        }

        // Generate 2 invite codes for the new user
        await supabase.rpc('create_user_invite_codes', { user_id: user.id, num_codes: 2 });

        window.location.href = "/";
    };

    const isFormValid = usernameAvailable && (!INVITE_ONLY || inviteCodeValid);

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

                    {/* Invite Code (only if INVITE_ONLY) */}
                    {INVITE_ONLY && (
                        <div className="space-y-2">
                            <Label>Invite Code</Label>
                            <div className="relative">
                                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <Input
                                    value={inviteCode}
                                    onChange={(e) => setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                    placeholder="ABCD1234"
                                    className={cn(
                                        "h-12 text-lg pl-10 pr-10 uppercase tracking-widest font-mono",
                                        inviteCodeValid === true && "border-green-500 focus:ring-green-500",
                                        inviteCodeValid === false && "border-red-500 focus:ring-red-500"
                                    )}
                                    maxLength={8}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {checkingCode && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}
                                    {!checkingCode && inviteCodeValid === true && <Check className="w-5 h-5 text-green-500" />}
                                    {!checkingCode && inviteCodeValid === false && <X className="w-5 h-5 text-red-500" />}
                                </div>
                            </div>
                            {inviteCodeError ? (
                                <p className="text-xs text-red-500">{inviteCodeError}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">Enter the invite code you received</p>
                            )}
                        </div>
                    )}

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
                    disabled={loading || !username || !isFormValid}
                >
                    {loading ? "Creating Profile..." : "Complete Setup"}
                </Button>
            </form>
        </MobileContainer>
    );
}

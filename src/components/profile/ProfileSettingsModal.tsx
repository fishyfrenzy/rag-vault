"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Settings, Eye, EyeOff, Lock, Globe, Check, Loader2, AtSign } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileVisibility {
    bio: boolean;
    location: boolean;
    age: boolean;
}

interface ProfileSettingsModalProps {
    userId: string;
    currentUsername?: string | null;
    currentBio?: string | null;
    currentLocation?: string | null;
    currentBirthYear?: number | null;
    currentVisibility?: ProfileVisibility;
    currentIsPrivate?: boolean;
    onClose: () => void;
    onSave: () => void;
}

export function ProfileSettingsModal({
    userId,
    currentUsername,
    currentBio,
    currentLocation,
    currentBirthYear,
    currentVisibility = { bio: true, location: true, age: false },
    currentIsPrivate = false,
    onClose,
    onSave,
}: ProfileSettingsModalProps) {
    const [username, setUsername] = useState(currentUsername || "");
    const [bio, setBio] = useState(currentBio || "");
    const [location, setLocation] = useState(currentLocation || "");
    const [birthYear, setBirthYear] = useState(currentBirthYear?.toString() || "");
    const [visibility, setVisibility] = useState<ProfileVisibility>(currentVisibility);
    const [isPrivate, setIsPrivate] = useState(currentIsPrivate);
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
        if (name.toLowerCase() === currentUsername?.toLowerCase()) {
            setUsernameAvailable(true);
            setUsernameError(null);
            return;
        }

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
    }, [currentUsername]);

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

    const toggleVisibility = (field: keyof ProfileVisibility) => {
        setVisibility(prev => ({ ...prev, [field]: !prev[field] }));
    };

    const handleSave = async () => {
        if (username !== currentUsername && usernameAvailable !== true) {
            setUsernameError("Please choose an available username");
            return;
        }

        setLoading(true);

        const updateData: Record<string, unknown> = {
            bio: bio || null,
            location: location || null,
            birth_year: birthYear ? parseInt(birthYear) : null,
            profile_visibility: visibility,
            is_private: isPrivate,
        };

        // Only update username if changed
        if (username !== currentUsername) {
            updateData.username = username.toLowerCase();
        }

        const { error } = await supabase
            .from('profiles')
            .update(updateData)
            .eq('id', userId);

        if (error) {
            console.error(error);
            if (error.code === '23505') {
                setUsernameError("Username was just taken, try another");
            } else {
                alert("Error saving profile: " + error.message);
            }
        } else {
            onSave();
            onClose();
        }

        setLoading(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="relative w-full max-w-lg bg-card border border-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="p-6 border-b border-border/50 flex items-center justify-between bg-secondary/20 sticky top-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-primary text-primary-foreground">
                            <Settings className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold">Profile Settings</h2>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Username Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Username</h3>
                        <div className="space-y-2">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                                <Input
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                                    placeholder="your_username"
                                    className={cn(
                                        "pl-8 pr-10 bg-background/50",
                                        usernameAvailable === true && "border-green-500",
                                        usernameAvailable === false && "border-red-500"
                                    )}
                                    maxLength={20}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                                    {!checkingUsername && usernameAvailable === true && <Check className="w-4 h-4 text-green-500" />}
                                    {!checkingUsername && usernameAvailable === false && <X className="w-4 h-4 text-red-500" />}
                                </div>
                            </div>
                            {usernameError ? (
                                <p className="text-xs text-red-500">{usernameError}</p>
                            ) : (
                                <p className="text-xs text-muted-foreground">ragvault.io/u/{username || 'username'}</p>
                            )}
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About You</h3>

                        {/* Bio */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Bio</label>
                                <button
                                    type="button"
                                    onClick={() => toggleVisibility('bio')}
                                    className={cn(
                                        "flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors",
                                        visibility.bio
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-secondary text-muted-foreground"
                                    )}
                                >
                                    {visibility.bio ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    {visibility.bio ? "Visible" : "Hidden"}
                                </button>
                            </div>
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Tell people about yourself..."
                                rows={3}
                                maxLength={200}
                                className="flex w-full rounded-xl border border-input bg-background/50 px-4 py-3 text-sm resize-none focus:ring-2 focus:ring-primary/20"
                            />
                            <p className="text-xs text-muted-foreground text-right">{bio.length}/200</p>
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Location</label>
                                <button
                                    type="button"
                                    onClick={() => toggleVisibility('location')}
                                    className={cn(
                                        "flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors",
                                        visibility.location
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-secondary text-muted-foreground"
                                    )}
                                >
                                    {visibility.location ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    {visibility.location ? "Visible" : "Hidden"}
                                </button>
                            </div>
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="e.g. Los Angeles, CA"
                                className="bg-background/50"
                            />
                        </div>

                        {/* Birth Year */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">Birth Year (shows as age)</label>
                                <button
                                    type="button"
                                    onClick={() => toggleVisibility('age')}
                                    className={cn(
                                        "flex items-center gap-1 text-xs px-2 py-1 rounded-full transition-colors",
                                        visibility.age
                                            ? "bg-green-500/20 text-green-400"
                                            : "bg-secondary text-muted-foreground"
                                    )}
                                >
                                    {visibility.age ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                                    {visibility.age ? "Visible" : "Hidden"}
                                </button>
                            </div>
                            <Input
                                type="number"
                                value={birthYear}
                                onChange={(e) => setBirthYear(e.target.value)}
                                placeholder="e.g. 1990"
                                min={1940}
                                max={new Date().getFullYear() - 13}
                                className="bg-background/50"
                            />
                        </div>
                    </div>

                    {/* Info about display slots */}
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50">
                        <p className="text-sm text-muted-foreground">
                            💡 <span className="font-medium text-foreground">Tip:</span> Use the "Edit" button on your profile to customize your display slots with collections, featured shirts, or your ISO list.
                        </p>
                    </div>

                    {/* Privacy Section */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Privacy</h3>

                        <div className="p-4 rounded-xl border border-border/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {isPrivate ? (
                                    <div className="p-2 rounded-lg bg-secondary">
                                        <Lock className="w-4 h-4 text-muted-foreground" />
                                    </div>
                                ) : (
                                    <div className="p-2 rounded-lg bg-green-500/20">
                                        <Globe className="w-4 h-4 text-green-400" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-medium">{isPrivate ? 'Private Profile' : 'Public Profile'}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {isPrivate
                                            ? 'Only you can see your profile'
                                            : 'Anyone can view your profile'
                                        }
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsPrivate(!isPrivate)}
                                className={cn(
                                    "relative w-12 h-7 rounded-full transition-colors",
                                    isPrivate ? "bg-secondary" : "bg-green-500"
                                )}
                            >
                                <span
                                    className={cn(
                                        "absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform",
                                        isPrivate ? "translate-x-1" : "translate-x-6"
                                    )}
                                />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-border/50 bg-secondary/10 flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button className="flex-1 font-bold" onClick={handleSave} disabled={loading}>
                        {loading ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}

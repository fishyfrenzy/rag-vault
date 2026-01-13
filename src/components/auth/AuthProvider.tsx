"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";

interface UserProfile {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
    karma_score: number | null;
    updated_at: string | null;
    is_admin?: boolean;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    signOut: async () => { },
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const fetchProfile = async (userId: string) => {
            const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
            setProfile(data);
            return data;
        };

        const handleAuth = async (session: Session | null) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setSession(session);

            if (currentUser) {
                const userProfile = await fetchProfile(currentUser.id);
                // Redirect to onboarding if no username and not already there
                if (!userProfile?.username && pathname !== '/onboarding' && pathname !== '/login') {
                    router.push('/onboarding');
                }
            } else {
                setProfile(null);
            }
            setLoading(false);
        };

        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            handleAuth(session);
        });

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            handleAuth(session);

            if (_event === 'SIGNED_OUT') {
                setUser(null);
                setSession(null);
                setProfile(null);
                router.push('/');
            }
        });

        return () => subscription.unsubscribe();
    }, [router, pathname]);

    const signOut = async () => {
        await supabase.auth.signOut();
    };

    return (
        <AuthContext.Provider value={{ user, profile, session, loading, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

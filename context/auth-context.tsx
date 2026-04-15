import {useRouter, useSegments} from "expo-router";
import React, {createContext, useContext, useEffect, useState} from "react";
import {Session, User} from '@supabase/supabase-js';
import {supabase} from "@/lib/supabase";

type AuthContextType = {
    user: User | null;
    session: Session | null;
    loading: boolean;
    signUp: (email: string, password: string) => Promise<void>;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({children}: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        supabase.auth.getSession().then(({data: {session}}) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });

        const {data: {subscription}} = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
        });
        return () => subscription.unsubscribe();
    }, []);

    const signUp = async (email: string, password: string) => {
        setLoading(true);
        const {error} = await supabase.auth.signUp({email, password});
        if (error) throw error;
        setLoading(false);
    };

    const signIn = async (email: string, password: string) => {
        setLoading(true);
        const {error} = await supabase.auth.signInWithPassword({email, password});
        if (error) throw error;
        setLoading(false);
    };

    const signOut = async () => {
        setLoading(true);
        const {error} = await supabase.auth.signOut();
        router.replace('/(auth)/sign-in');
        if (error) throw error;
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{user, session, loading, signUp, signIn, signOut}}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};

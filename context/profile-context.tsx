import React, {createContext, useContext, useEffect, useState, ReactNode} from 'react';
import {useAuth} from "@/context/auth-context";
import {supabase} from "@/lib/supabase";


interface Profile {
    full_name: string;
    business_name: string;
    phone: string;
    address: string;
    hourly_rate: number;
    logo_url?: string;
}

type ProfileContextType = {
    profile: Profile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({children}: { children: ReactNode }) {
    const {user} = useAuth();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async () => {
        if (!user) {
            setProfile(null);
            setLoading(false);
            return;
        }

        const {data, error} = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (data) setProfile(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchProfile();
    }, [user]);

    return (
        <ProfileContext.Provider value={{profile, loading, refreshProfile: fetchProfile}}>
            {children}
        </ProfileContext.Provider>
    );
}

export const useProfile = () => {
    const context = useContext(ProfileContext);
    if (!context) throw new Error('useProfile must be used within ProfileProvider');
    return context;
};
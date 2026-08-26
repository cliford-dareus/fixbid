import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {useAuth} from '@/context/auth-context';
import {profilesApi, type Profile} from '@/lib/data';

export type {Profile};

type ProfileContextType = {
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
};

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

export function ProfileProvider({children}: {children: ReactNode}) {
  const {user} = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const result = await profilesApi.getProfile(user.id);
    if (result.ok) {
      setProfile(result.data);
    } else {
      console.error(result.error);
      setProfile(null);
    }
    setLoading(false);
  }, [user?.id]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>) => {
      if (!user?.id) throw new Error('Not logged in');

      const prev = profile;
      setProfile((p) => (p ? {...p, ...updates} : p));

      const result = await profilesApi.updateProfile(user.id, updates);
      if (!result.ok) {
        setProfile(prev);
        throw new Error(result.error);
      }
      setProfile(result.data);
    },
    [user?.id, profile],
  );

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  return (
    <ProfileContext.Provider
      value={{profile, loading, refreshProfile, updateProfile}}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within ProfileProvider');
  return context;
};

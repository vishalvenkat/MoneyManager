import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  updateProfile as firebaseUpdateProfile
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { expenseService } from '../services/expenseService';
import type { UserProfile } from '../types';
import { resolveAvatarUrl } from '../utils/avatarUtils';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<UserProfile | null>;
  updateUserProfile: (profileData: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (user: User | null): Promise<UserProfile | null> => {
    if (!user) {
      setUserProfile(null);
      return null;
    }

    try {
      const existingProfile = await expenseService.getUserProfile(user.uid);
      if (existingProfile) {
        // Ensure photoURL fallback if not specified
        const finalProfile: UserProfile = {
          ...existingProfile,
          photoURL: existingProfile.photoURL || resolveAvatarUrl(existingProfile.avatarId, user.photoURL || undefined, existingProfile.avatarGender || 'male')
        };
        setUserProfile(finalProfile);
        return finalProfile;
      } else {
        // Default template profile for new/first-time user
        const defaultProfile: UserProfile = {
          uid: user.uid,
          fullName: user.displayName || '',
          email: user.email || '',
          mobileNumber: user.phoneNumber || '',
          dateOfBirth: '',
          avatarGender: 'male',
          avatarId: 'male-1',
          photoURL: user.photoURL || resolveAvatarUrl('male-1', undefined, 'male')
        };
        setUserProfile(defaultProfile);
        return defaultProfile;
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    return await fetchProfile(currentUser);
  }, [currentUser, fetchProfile]);

  const updateUserProfile = useCallback(async (profileData: Partial<UserProfile>) => {
    if (!currentUser) throw new Error('No user is currently signed in');

    const updatedData: Partial<UserProfile> = {
      ...profileData,
      uid: currentUser.uid,
      email: profileData.email || currentUser.email || '',
    };

    // Save to Firestore
    await expenseService.saveUserProfile(currentUser.uid, updatedData);

    // Update Firebase Auth profile displayName & photoURL to stay synced
    try {
      const updates: { displayName?: string; photoURL?: string } = {};
      if (profileData.fullName !== undefined) {
        updates.displayName = profileData.fullName;
      }
      if (profileData.photoURL !== undefined) {
        updates.photoURL = profileData.photoURL;
      }
      if (Object.keys(updates).length > 0) {
        await firebaseUpdateProfile(currentUser, updates);
      }
    } catch (authError) {
      console.warn('Firebase updateProfile error (non-fatal):', authError);
    }

    // Update local state immediately
    setUserProfile(prev => {
      if (!prev) {
        return {
          uid: currentUser.uid,
          fullName: profileData.fullName || currentUser.displayName || '',
          email: profileData.email || currentUser.email || '',
          mobileNumber: profileData.mobileNumber || '',
          dateOfBirth: profileData.dateOfBirth || '',
          avatarGender: profileData.avatarGender || 'male',
          avatarId: profileData.avatarId || 'male-1',
          photoURL: profileData.photoURL || resolveAvatarUrl(profileData.avatarId, undefined, profileData.avatarGender || 'male')
        };
      }
      return {
        ...prev,
        ...updatedData
      };
    });
  }, [currentUser]);

  const logout = () => {
    setUserProfile(null);
    return firebaseSignOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    logout,
    refreshProfile,
    updateUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

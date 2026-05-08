'use client';

import { useEffect } from 'react';
import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '@/lib/firebase';
import { useAppStore } from '@/store/useAppStore';

export function useAuth() {
  const { user, userRole, loading, setUser, setUserRole, setLoading, reset } =
    useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);

        // Check if user doc exists in Firestore and get role
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserRole(data.role || null);
          } else {
            setUserRole(null);
          }
        } catch {
          setUserRole(null);
        }
      } else {
        reset();
      }
      setLoading(false);
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signInWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const firebaseUser = result.user;

      // Check if user already exists in Firestore
      const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));

      if (!userDoc.exists()) {
        // First-time user — create doc without role
        await setDoc(doc(db, 'users', firebaseUser.uid), {
          uid: firebaseUser.uid,
          name: firebaseUser.displayName || '',
          email: firebaseUser.email || '',
          photoURL: firebaseUser.photoURL || '',
          role: null,
          createdAt: serverTimestamp(),
          behaviorScore: 100,
          blockedBy: [],
        });
        return { isNewUser: true };
      } else {
        const data = userDoc.data();
        setUserRole(data.role || null);
        return { isNewUser: !data.role, role: data.role };
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      reset();
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  };

  const selectRole = async (role: 'driver' | 'owner') => {
    if (!user) return;
    try {
      await setDoc(
        doc(db, 'users', user.uid),
        { role },
        { merge: true }
      );
      setUserRole(role);
    } catch (error) {
      console.error('Role selection error:', error);
      throw error;
    }
  };

  return { user, userRole, loading, signInWithGoogle, signOut, selectRole };
}

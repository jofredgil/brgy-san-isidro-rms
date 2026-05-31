import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db, appId } from '../config/firebase';
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubDoc = null;
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user && !user.isAnonymous) {
        // User is logged into Firebase Auth. Wait for their database profile.
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', user.uid);
        
        unsubDoc = onSnapshot(userDocRef, (userSnap) => {
          if (userSnap.exists()) {
            setCurrentUser({ id: userSnap.id, ...userSnap.data() });
            setLoading(false);
          } else {
            // Profile is still being written to the database by the registration function. 
            // We wait here until the snapshot updates.
          }
        }, (error) => {
          console.error("Profile fetch error:", error);
          setCurrentUser(null);
          setLoading(false);
        });
      } else {
        // User is logged out
        setCurrentUser(null);
        setLoading(false);
        if (!user) {
          signInAnonymously(auth).catch(console.error);
        }
      }
    });

    return () => {
      unsubscribe();
      if (unsubDoc) unsubDoc();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser }}>
      {!loading ? children : (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#0f172a] text-blue-100">
          <Loader2 className="w-12 h-12 animate-spin mb-4 text-blue-500" />
          <h2 className="text-xl font-bold tracking-wide">Authenticating...</h2>
        </div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  apiKey: "AIzaSyBf6OACnsfFYpkubm4_XDdjs0dDHAq5HiM",
  authDomain: "brgy-san-isidro-system.firebaseapp.com",
  projectId: "brgy-san-isidro-system",
  storageBucket: "brgy-san-isidro-system.firebasestorage.app",
  messagingSenderId: "1049514592500",
  appId: "1:1049514592500:web:09f785c0d7de3aad6ab6a1",
  measurementId: "G-HTBMX2FQG0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const appId = typeof __app_id !== 'undefined' ? __app_id : 'brgy-san-isidro-app';
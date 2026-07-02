import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0601780209",
  appId: "1:1052718958060:web:5552d3b62532c02aae6cc9",
  apiKey: "AIzaSyA_O-byrow32lAH7Ym7PoGahmiXmh9OvO8",
  authDomain: "gen-lang-client-0601780209.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-2bebcfc5-360a-475c-ad85-f510f188194b",
  storageBucket: "gen-lang-client-0601780209.firebasestorage.app",
  messagingSenderId: "1052718958060",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the exact databaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);

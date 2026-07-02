import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
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
export const appleProvider = new OAuthProvider('apple.com');

export const loginWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Firebase Auth Google Error:", error);
    alert(`Google 登录失败 (Google Sign-In Failed):\n${error.message}\n\n💡 提示: 如果这是在 Vercel 部署，请确保您的域名已添加到 Firebase 控制台的 [Authentication -> Settings -> Authorized domains]。`);
  }
};

export const loginWithApple = async () => {
  try {
    return await signInWithPopup(auth, appleProvider);
  } catch (error: any) {
    console.error("Firebase Auth Apple Error:", error);
    alert(`Apple 登录失败 (Apple Sign-In Failed):\n${error.message}\n\n💡 提示: 请确保在 Firebase 控制台启用了 Apple 登录并正确配置了回调域名。`);
  }
};

export const logout = () => signOut(auth);

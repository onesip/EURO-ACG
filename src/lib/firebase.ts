import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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

// App Check Initialization
// WARNING: Replace 'YOUR_RECAPTCHA_V3_SITE_KEY' with your actual reCAPTCHA v3 site key from Google Cloud Console.
export let appCheck: any = null;
if (typeof window !== 'undefined') {
  try {
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('YOUR_RECAPTCHA_V3_SITE_KEY'),
      isTokenAutoRefreshEnabled: true // Enable auto-refresh.
    });
  } catch (e) {
    console.warn("App Check initialization failed:", e);
  }
}

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Firebase Auth Google Error:", error);
    alert(`Google 登录失败 (Google Sign-In Failed):\n${error.message}\n\n💡 提示: 如果这是在 Vercel 部署，请确保您的域名已添加到 Firebase 控制台的 [Authentication -> Settings -> Authorized domains]。`);
  }
};

export const registerWithEmail = async (email: string, pass: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error: any) {
    console.error("Firebase Auth Email Register Error:", error);
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    console.error("Firebase Auth Email Login Error:", error);
    throw error;
  }
};

export const logout = () => signOut(auth);

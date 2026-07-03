import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  signOut,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence
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
setPersistence(auth, browserLocalPersistence).catch(err => console.error("Persistence error:", err));

// Use the exact databaseId from firebase-applet-config.json
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// App Check Initialization - Only if site key is provided
export let appCheck: any = null;
if (typeof window !== 'undefined') {
  const siteKey = 'YOUR_RECAPTCHA_V3_SITE_KEY';
  if (siteKey && siteKey !== 'YOUR_RECAPTCHA_V3_SITE_KEY') {
    try {
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true
      });
    } catch (e) {
      console.warn("App Check initialization failed:", e);
    }
  }
}

export const googleProvider = new GoogleAuthProvider();

export const loginWithGoogle = async () => {
  try {
    // If we're in WeChat or a mobile environment, popups often fail.
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);
    
    if (isWeChat) {
      alert("⚠️ 微信登录提示:\n检测到您在微信内访问。Google 登录需要弹出窗口或重定向，微信可能会拦截。\n\n如果点击确认后没有反应或登录失败，请点击右上角 [...] 并选择 「在浏览器中打开」。");
      await signInWithRedirect(auth, googleProvider);
      return;
    }
    
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.error("Firebase Auth Google Error:", error);
    if (error.code === 'auth/popup-blocked') {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (isMobile) {
        alert("提示: 登录窗口被拦截。我们将使用重定向方式登录。\n\n如果登录后返回界面仍未登录，请确保您的浏览器允许第三方 Cookie，或尝试在系统自带浏览器(如 Safari/Chrome)中打开。");
      }
      // Fallback to redirect if popup is blocked
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    if (error.code === 'auth/operation-not-allowed') {
      const isVercel = window.location.hostname.includes('vercel.app');
      alert(`登录失败 (Sign-In Failed): 该登录方式未在 Firebase 控制台启用。\n\n💡 修复方法:\n1. 登录 Firebase Console\n2. 前往 Authentication -> Sign-in method\n3. 启用 "Email/Password" 和 "Google" 登录商\n${isVercel ? '4. ⚠️ 极其重要: 在 Authentication -> Settings -> Authorized domains 中添加 ' + window.location.hostname : '4. 确认您的域名已添加到 Authorized domains'}\n\n详细错误: ${error.message}`);
      return;
    }
    const isVercel = window.location.hostname.includes('vercel.app');
    alert(`Google 登录失败 (Google Sign-In Failed):\n${error.message}\n\n💡 提示: ${isVercel ? '由于您在 Vercel 部署，请务必将 ' + window.location.hostname + ' 添加到 Firebase 控制台的 [Authentication -> Settings -> Authorized domains]。' : '请确保您的域名已授权。'}`);
  }
};

export const registerWithEmail = async (email: string, pass: string, displayName: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName });
    return userCredential.user;
  } catch (error: any) {
    console.error("Firebase Auth Email Register Error:", error);
    if (error.code === 'auth/operation-not-allowed') {
      const isVercel = window.location.hostname.includes('vercel.app');
      throw new Error(`注册失败: 邮箱/密码 注册方式未在 Firebase 控制台启用。\n\n💡 修复方法:\n1. 登录 Firebase Console\n2. 前往 Authentication -> Sign-in method\n3. 启用 "Email/Password"\n${isVercel ? '4. 确保 Authorized domains 包含 ' + window.location.hostname : ''}`);
    }
    throw error;
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, pass);
    return userCredential.user;
  } catch (error: any) {
    console.error("Firebase Auth Email Login Error:", error);
    if (error.code === 'auth/operation-not-allowed') {
      const isVercel = window.location.hostname.includes('vercel.app');
      throw new Error(`登录失败: 邮箱/密码 登录方式未在 Firebase 控制台启用。\n\n💡 修复方法:\n1. 登录 Firebase Console\n2. 前往 Authentication -> Sign-in method\n3. 启用 "Email/Password"\n${isVercel ? '4. 确保 Authorized domains 包含 ' + window.location.hostname : ''}`);
    }
    throw error;
  }
};

export const logout = () => signOut(auth);

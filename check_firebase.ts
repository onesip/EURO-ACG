
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';
import * as dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables from .env if it exists
try {
  const envConfig = dotenv.parse(readFileSync('.env'));
  for (const k in envConfig) {
    process.env[k] = envConfig[k];
  }
} catch (e) {}

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

async function check() {
  console.log("Checking Firebase Project:", firebaseConfig.projectId);
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    const q = query(collection(db, 'posts'), limit(1));
    const snapshot = await getDocs(q);
    console.log("✅ Success! Read", snapshot.size, "documents.");
    console.log("Firebase is ONLINE and quotas are OK.");
  } catch (err: any) {
    console.error("❌ Firebase Error detected:");
    console.error("Code:", err.code);
    console.error("Message:", err.message);
    if (err.code === 'resource-exhausted') {
      console.error("FATAL: Daily quota has been reached.");
    }
  }
}

check();

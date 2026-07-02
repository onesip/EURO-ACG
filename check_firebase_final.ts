
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, limit, query } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "gen-lang-client-0601780209",
  appId: "1:1052718958060:web:5552d3b62532c02aae6cc9",
  apiKey: "AIzaSyA_O-byrow32lAH7Ym7PoGahmiXmh9OvO8",
  authDomain: "gen-lang-client-0601780209.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-2bebcfc5-360a-475c-ad85-f510f188194b",
  storageBucket: "gen-lang-client-0601780209.firebasestorage.app",
  messagingSenderId: "1052718958060",
};

async function check() {
  console.log("Checking Firebase Project:", firebaseConfig.projectId);
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    const q = query(collection(db, 'posts'), limit(1));
    const snapshot = await getDocs(q);
    console.log("✅ Success! Read", snapshot.size, "documents.");
    console.log("RESULT: OK");
  } catch (err: any) {
    console.log("❌ Firebase Error Detected");
    console.log("Code:", err.code);
    console.log("Message:", err.message);
    console.log("RESULT: FAILED");
  }
}

check();

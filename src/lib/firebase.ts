import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBSxchW0IORZegT8oKDoT3V_e6evYrNrvY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "bello-live.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://bello-live-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "bello-live",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "bello-live.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "532091260551",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:532091260551:web:c94c4a939a1f31cb5db222",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-QCKD7G6C57"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;

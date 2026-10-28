import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCN5GE1QVxZ1zSShDlJaB_G0NNFymKHE_4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "tiamo-live-pro.firebaseapp.com",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || "https://tiamo-live-pro-default-rtdb.firebaseio.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "tiamo-live-pro",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "tiamo-live-pro.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "380260322453",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:380260322453:web:b891badd7a08c34afddf9c",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-9LJ2KQD6E4"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);
export const analytics = typeof window !== "undefined" ? getAnalytics(app) : null;

export default app;

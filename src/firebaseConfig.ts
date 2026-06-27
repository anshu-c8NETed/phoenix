// ════════════════════════════════════════════════════════════
//  Phoenix — Firebase Config
//  Initialises Firebase App, Auth, and Firestore once.
//  All values come from Vite env vars (VITE_FIREBASE_*) so
//  the same build works in dev and production without code
//  changes. If env vars are missing the module exports nulls
//  and every consumer falls back to in-memory/localStorage.
// ════════════════════════════════════════════════════════════

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// All six core fields must be present — if any are missing we skip
// Firebase entirely and fall back to localStorage / in-memory.
const isConfigured = Object.values(firebaseConfig).every(Boolean);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isConfigured) {
  // getApps() guard prevents duplicate initialisation during HMR
  app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
  console.log("[Phoenix] Firebase initialised ✓");
} else {
  console.warn("[Phoenix] Firebase env vars missing — using localStorage fallback.");
}

export { app, auth, db, isConfigured };
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  setPersistence, 
  browserLocalPersistence, 
  signInAnonymously, 
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { getFirestore, setLogLevel } from "firebase/firestore";

import firebaseConfig from "../../firebase-applet-config.json";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Silence internal Firestore logs to prevent unhandled quota backoff floods
try {
  setLogLevel('silent');
} catch {}

// Use the specific database ID provisioned in config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Set up Google provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Ensure persistence is set to LOCAL
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn('Firebase persistence initialization note:', err);
  });
}

export {
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
};


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
import { getFirestore } from "firebase/firestore";

import firebaseConfig from "../../firebase-applet-config.json";

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use the specific database ID provisioned in config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

// Set up Google provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Ensure persistence is set to LOCAL (which is default, but explicit is good)
setPersistence(auth, browserLocalPersistence);

export {
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut
};

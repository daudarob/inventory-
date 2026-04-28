import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    // First try popup
    return await signInWithPopup(auth, googleProvider);
  } catch (error: any) {
    console.log("Sign in attempt result:", error.code, error.message);
    
    // Handle common expected errors gracefully
    if (error.code === 'auth/popup-blocked' || 
        error.code === 'auth/popup-closed-by-user' ||
        error.code === 'auth/cancelled-popup-request') {
      console.log("Popup blocked, falling back to redirect sign-in");
      try {
        return await signInWithRedirect(auth, googleProvider);
      } catch (redirectErr) {
        console.log("Redirect sign-in also failed:", redirectErr);
        // Fail silently, user will need to configure Firebase domains
        return null;
      }
    }
    
    // Handle domain authorization error gracefully
    if (error.code === 'auth/unauthorized-domain') {
      console.warn("⚠️  FIREBASE SETUP REQUIRED: localhost is not added to your Firebase Authorized Domains.");
      console.warn("Go to Firebase Console → Authentication → Settings → Authorized domains and add 'localhost'");
      // Do not throw uncaught error
      return null;
    }

    // All other errors are handled silently
    return null;
  }
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
};

export const signUpWithEmail = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const signInWithEmail = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const updateUserDisplayName = (displayName: string) =>
  updateProfile(auth.currentUser!, { displayName });

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful");
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();
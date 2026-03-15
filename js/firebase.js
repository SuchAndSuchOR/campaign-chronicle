import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";
import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  linkWithCredential,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyDka78iWPf69fShIaS1uVOnKBx0UyoRUeY",
  authDomain: "campaign-chronicle-pro.firebaseapp.com",
  projectId: "campaign-chronicle-pro",
  storageBucket: "campaign-chronicle-pro.firebasestorage.app",
  messagingSenderId: "390100005209",
  appId: "1:390100005209:web:725840a61a273bc9aa1c48"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export async function ensureSignedIn() {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  const result = await signInAnonymously(auth);
  return result.user;
}

export async function createAccount(email, password, displayName = "") {
  const trimmedEmail = email.trim();
  const cleanName = displayName.trim();

  if (auth.currentUser?.isAnonymous) {
    const credential = EmailAuthProvider.credential(trimmedEmail, password);
    const result = await linkWithCredential(auth.currentUser, credential);
    if (cleanName) {
      await updateProfile(result.user, { displayName: cleanName });
    }
    return result.user;
  }

  const result = await createUserWithEmailAndPassword(auth, trimmedEmail, password);
  if (cleanName) {
    await updateProfile(result.user, { displayName: cleanName });
  }
  return result.user;
}

export async function signInToAccount(email, password) {
  const trimmedEmail = email.trim();
  if (auth.currentUser?.isAnonymous) {
    await signOut(auth);
  }

  const result = await signInWithEmailAndPassword(auth, trimmedEmail, password);
  return result.user;
}

export async function signOutToGuest() {
  await signOut(auth);
  const result = await signInAnonymously(auth);
  return result.user;
}

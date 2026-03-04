import { auth } from "./firebase.js";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

export function setupAuth(onLogin, onLogout) {
  document.getElementById("registerBtn").onclick = async () => {
    const email = emailInput.value;
    const pass = passwordInput.value;
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  document.getElementById("loginBtn").onclick = async () => {
    const email = emailInput.value;
    const pass = passwordInput.value;
    await signInWithEmailAndPassword(auth, email, pass);
  };

  document.getElementById("logoutBtn").onclick = async () => {
    await signOut(auth);
  };

  onAuthStateChanged(auth, user => {
    if (user) onLogin(user);
    else onLogout();
  });
}
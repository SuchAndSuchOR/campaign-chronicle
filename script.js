import { initializeApp } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

/* ================= FIREBASE CONFIG ================= */

const firebaseConfig = {
  apiKey: "AIzaSyDka78iWPf69fShIaS1uVOnKBx0UyoRUeY",
  authDomain: "campaign-chronicle-pro.firebaseapp.com",
  projectId: "campaign-chronicle-pro",
  storageBucket: "campaign-chronicle-pro.firebasestorage.app",
  messagingSenderId: "390100005209",
  appId: "1:390100005209:web:725840a61a273bc9aa1c48"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;
let currentCampaignId = null;

/* ================= AUTH ================= */

window.register = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  await createUserWithEmailAndPassword(auth, email, password);
};

window.login = async function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  await signInWithEmailAndPassword(auth, email, password);
};

window.logout = async function () {
  await signOut(auth);
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("authSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    await checkJoinLink();
    loadCampaigns();
  } else {
    document.getElementById("authSection").classList.remove("hidden");
    document.getElementById("appSection").classList.add("hidden");
  }
});

/* ================= CAMPAIGNS ================= */

window.createCampaign = async function () {
  const name = prompt("Campaign name?");
  if (!name) return;

  await addDoc(collection(db, "campaigns"), {
    name,
    description: "",
    ownerId: currentUser.uid,
    members: [],
    shareCode: Math.random().toString(36).substring(2, 8),
    createdAt: new Date()
  });
};

function loadCampaigns() {
  const q = query(
    collection(db, "campaigns"),
    where("ownerId", "==", currentUser.uid)
  );

  onSnapshot(q, (snapshot) => {
    const list = document.getElementById("campaignList");
    list.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();

      list.innerHTML += `
        <div>
          <strong>${data.name}</strong>
          <button onclick="openCampaign('${docSnap.id}', '${data.name}')">Open</button>
          <button onclick="editCampaign('${docSnap.id}')">Edit</button>
          <button onclick="shareCampaign('${data.shareCode}')">Share</button>
        </div>
        <hr>
      `;
    });
  });
}

window.editCampaign = async function (id) {
  const newName = prompt("New campaign name?");
  if (!newName) return;

  await updateDoc(doc(db, "campaigns", id), {
    name: newName
  });
};

window.shareCampaign = function (code) {
  const link = `${window.location.origin}${window.location.pathname}?join=${code}`;
  prompt("Share this link:", link);
};

async function checkJoinLink() {
  const params = new URLSearchParams(window.location.search);
  const joinCode = params.get("join");
  if (!joinCode || !currentUser) return;

  const snapshot = await getDocs(collection(db, "campaigns"));

  snapshot.forEach(async (docSnap) => {
    const data = docSnap.data();
    if (data.shareCode === joinCode) {
      if (!data.members.includes(currentUser.uid)) {
        await updateDoc(doc(db, "campaigns", docSnap.id), {
          members: [...data.members, currentUser.uid]
        });
      }
    }
  });
}

/* ================= OPEN CAMPAIGN ================= */

window.openCampaign = function (id, name) {
  currentCampaignId = id;
  document.getElementById("campaignArea").classList.remove("hidden");
  document.getElementById("campaignTitle").innerText = name;
  loadNotes();
};

/* ================= NOTES ================= */

function loadNotes() {
  onSnapshot(
    collection(db, "campaigns", currentCampaignId, "notes"),
    (snapshot) => {
      const div = document.getElementById("notes");
      div.innerHTML = "";

      snapshot.forEach((docSnap) => {
        const note = docSnap.data();

        div.innerHTML += `
          <div>
            <h4>${note.title}</h4>
            <p>${note.text}</p>
            <button onclick="deleteNote('${docSnap.id}')">Delete</button>
          </div>
          <hr>
        `;
      });
    }
  );
}

window.saveNote = async function () {
  const title = document.getElementById("noteTitle").value;
  const text = document.getElementById("noteText").value;
  if (!title || !text) return;

  await addDoc(collection(db, "campaigns", currentCampaignId, "notes"), {
    title,
    text,
    createdAt: new Date()
  });

  document.getElementById("noteTitle").value = "";
  document.getElementById("noteText").value = "";
};

window.deleteNote = async function (noteId) {
  await deleteDoc(doc(db, "campaigns", currentCampaignId, "notes", noteId));
};

/* ================= BACKSTORY ================= */

window.generateBackstoryPrompt = function () {
  const prompts = [
    "What secret are they hiding?",
    "Who betrayed them?",
    "What oath binds them?",
    "What do they fear most?",
    "Who would they die for?"
  ];

  document.getElementById("backstoryPrompt").innerText =
    prompts[Math.floor(Math.random() * prompts.length)];
};

/* ================= SUMMARIZER ================= */

window.summarizeFile = function () {
  const file = document.getElementById("fileInput").files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const text = e.target.result;
    const sentences = text.split(".");
    document.getElementById("summaryOutput").innerText =
      sentences.slice(0, 3).join(".") + ".";
  };
  reader.readAsText(file);
};

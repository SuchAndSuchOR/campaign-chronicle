import { db } from "./firebase.js";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

let currentUser = null;

export function setUser(user) {
  currentUser = user;
}

export function createCampaign() {
  const name = prompt("Campaign name?");
  if (!name) return;

  addDoc(collection(db, "campaigns"), {
    name,
    ownerId: currentUser.uid,
    createdAt: new Date()
  });
}

export function loadCampaigns(render) {
  const q = query(
    collection(db, "campaigns"),
    where("ownerId", "==", currentUser.uid)
  );

  onSnapshot(q, snapshot => {
    const campaigns = [];
    snapshot.forEach(doc => campaigns.push({ id: doc.id, ...doc.data() }));
    render(campaigns);
  });
}
import {
  doc,
  setDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

import { db } from "./firebase.js";

let currentCampaign = null;

export function openEditor(campaignId, textarea) {

  currentCampaign = campaignId;

  const noteRef = doc(db, "campaigns", campaignId, "editor", "live");

  /* listen for updates */

  onSnapshot(noteRef, snap => {

    if (!snap.exists()) return;

    const data = snap.data();

    if (textarea.value !== data.text) {
      textarea.value = data.text;
    }

  });

  /* live typing save */

  textarea.addEventListener("input", async () => {

    await setDoc(noteRef, {
      text: textarea.value,
      updated: new Date()
    });

  });

}
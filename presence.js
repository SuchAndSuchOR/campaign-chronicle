import { db } from "./firebase.js";

import {
  doc,
  setDoc,
  collection,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

let currentCampaign = null;
let currentUser = null;

/* =========================
   USER ENTERS CAMPAIGN
========================= */

export async function setupPresence(user, campaignId) {

  currentUser = user;
  currentCampaign = campaignId;

  await setDoc(
    doc(db, "campaigns", campaignId, "presence", user.uid),
    {
      email: user.email,
      typing: false,
      lastActive: serverTimestamp()
    }
  );
}

/* =========================
   WATCH ACTIVE USERS
========================= */

export function watchPresence(updateTypingUI) {

  if (!currentCampaign) return;

  onSnapshot(
    collection(db, "campaigns", currentCampaign, "presence"),
    snapshot => {

      const users = [];

      snapshot.forEach(docSnap => {

        const data = docSnap.data();

        if (docSnap.id !== currentUser.uid) {

          users.push(
            data.email + (data.typing ? " (typing...)" : "")
          );

        }

      });

      updateTypingUI(users);

      updatePresencePanel(users);

    }
  );
}

/* =========================
   UPDATE PRESENCE PANEL
========================= */

function updatePresencePanel(users) {

  const panel = document.getElementById("presenceList");

  if (!panel) return;

  panel.innerHTML = "";

  if (!users.length) {
    panel.innerHTML = "<div>No other players online</div>";
    return;
  }

  users.forEach(user => {

    const div = document.createElement("div");
    div.className = "presence-user";
    div.innerText = user;

    panel.appendChild(div);

  });

}

/* =========================
   TYPING DETECTION
========================= */

export function trackTyping(textarea) {

  textarea.addEventListener("input", async () => {

    await setDoc(
      doc(db, "campaigns", currentCampaign, "presence", currentUser.uid),
      {
        email: currentUser.email,
        typing: true,
        lastActive: serverTimestamp()
      }
    );

    clearTimeout(window.typingTimeout);

    window.typingTimeout = setTimeout(async () => {

      await setDoc(
        doc(db, "campaigns", currentCampaign, "presence", currentUser.uid),
        {
          email: currentUser.email,
          typing: false,
          lastActive: serverTimestamp()
        }
      );

    }, 1500);

  });

}

/* =========================
   CLEANUP WHEN USER LEAVES
========================= */

export async function clearPresence() {

  if (!currentCampaign || !currentUser) return;

  await setDoc(
    doc(db, "campaigns", currentCampaign, "presence", currentUser.uid),
    {
      email: currentUser.email,
      typing: false,
      lastActive: serverTimestamp()
    }
  );

}
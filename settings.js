import { db } from "./firebase.js";

import {
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

export async function loadSettings(campaignId) {

  const snap = await getDoc(doc(db, "campaigns", campaignId));
  const data = snap.data();

  const panel = document.getElementById("settingsPanel");

  panel.innerHTML = `
    <h3>Campaign Settings</h3>

    <p><strong>Owner:</strong> ${data.ownerId}</p>

    <h4>Members</h4>
    <div id="memberList"></div>

    <input id="inviteEmail" placeholder="Invite player email">
    <button id="inviteBtn">Invite</button>
  `;

}
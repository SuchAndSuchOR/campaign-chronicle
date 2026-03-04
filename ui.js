export function renderCampaignList(campaigns, openCampaign) {
  const list = document.getElementById("campaignList");
  list.innerHTML = "";

  campaigns.forEach(c => {
    const div = document.createElement("div");

    div.innerHTML = `
      <strong>${c.name}</strong>
      <button data-id="${c.id}">Open</button>
    `;

    div.querySelector("button").onclick = () => openCampaign(c);

    list.appendChild(div);
  });
}

export function showCampaign(name) {
  document.getElementById("campaignTitle").innerText = name;
}

export function updateTypingIndicator(users) {
  const el = document.getElementById("typingIndicator");

  if (!users.length) {
    el.innerText = "";
    return;
  }
import { setupAuth } from "./auth.js";
import { setUser, createCampaign, loadCampaigns } from "./campaign.js";
import { renderCampaignList, showCampaign, updateTypingIndicator, fireIdea } from "./ui.js";
import { setupPresence, watchPresence, trackTyping } from "./presence.js";

const authSection = document.getElementById("authSection");
const appLayout = document.getElementById("appLayout");

let currentUser = null;
let currentCampaign = null;

setupAuth(
  (user) => {
    currentUser = user;

    authSection.classList.add("hidden");
    appLayout.classList.remove("hidden");

    setUser(user);

    loadCampaigns(campaigns => {
      renderCampaignList(campaigns, openCampaign);
    });
  },
  () => {
    authSection.classList.remove("hidden");
    appLayout.classList.add("hidden");
  }
);

document.getElementById("newCampaignBtn").onclick = createCampaign;

function openCampaign(campaign) {
  currentCampaign = campaign.id;

  showCampaign(campaign.name);

  setupPresence(currentUser, campaign.id);

  watchPresence(users => {
    updateTypingIndicator(users);
  });

  trackTyping(document.getElementById("noteText"));
}

document.getElementById("fireBtn").onclick = () => {
  const text = document.getElementById("noteText").value;
  const output = document.getElementById("typingIndicator");

  fireIdea(text, output);
};
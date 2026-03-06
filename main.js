import { setupAuth } from "./auth.js";

import {
  setUser,
  createCampaign,
  loadCampaigns,
  openEditor,
  joinCampaign
} from "./campaign.js";

import {
  renderCampaignList,
  showCampaign,
  generateCharacterIdea,
  fireIdea
} from "./ui.js";

import {
  setupPresence,
  watchPresence,
  trackTyping
} from "./presence.js";

import { loadSettings } from "./settings.js";

import { setupMap, setTool, clearMap } from "./map.js";


/* =========================
DOM REFERENCES
========================= */

const authSection = document.getElementById("authSection");
const appLayout = document.getElementById("appLayout");

const textarea = document.getElementById("noteText");

const fireBtn = document.getElementById("fireBtn");
const newCampaignBtn = document.getElementById("newCampaignBtn");
const settingsBtn = document.getElementById("settingsBtn");
const inviteBtn = document.getElementById("inviteBtn");
const charBtn = document.getElementById("characterBtn");

const mapUpload = document.getElementById("mapUpload");


/* =========================
STATE
========================= */

let currentUser = null;
let currentCampaign = null;


/* =========================
AUTH SYSTEM
========================= */

setupAuth(

(user)=>{

currentUser = user;

authSection.classList.add("hidden");
appLayout.classList.remove("hidden");

setUser(user);

checkInvite(user);

loadCampaigns((campaigns)=>{

renderCampaignList(campaigns,openCampaign);

});

},

()=>{

authSection.classList.remove("hidden");
appLayout.classList.add("hidden");

currentUser=null;
currentCampaign=null;

}

);


/* =========================
CREATE CAMPAIGN
========================= */

newCampaignBtn.onclick = ()=>{

createCampaign();

};


/* =========================
OPEN CAMPAIGN
========================= */

function openCampaign(campaign){

currentCampaign = campaign.id;

showCampaign(campaign.name);

openEditor(currentCampaign,textarea);

setupPresence(currentUser,currentCampaign);

watchPresence((users)=>{

const indicator = document.getElementById("typingIndicator");

indicator.innerText = users.join(", ")+" online";

});

trackTyping(textarea);

}


/* =========================
INVITE SYSTEM
========================= */

inviteBtn.onclick = ()=>{

if(!currentCampaign) return;

const link =
`${window.location.origin}${window.location.pathname}?join=${currentCampaign}`;

navigator.clipboard.writeText(link);

alert("Invite link copied!");

};


/* =========================
AUTO JOIN LINK
========================= */

function checkInvite(user){

const params = new URLSearchParams(window.location.search);

const id = params.get("join");

if(!id) return;

joinCampaign(id,user.uid);

}


/* =========================
CHARACTER IDEA
========================= */

charBtn.onclick = ()=>{

const idea = generateCharacterIdea();

document.getElementById("characterIdea").innerText = idea;

};


/* =========================
STORY IDEA
========================= */

fireBtn.onclick = ()=>{

const indicator = document.getElementById("typingIndicator");

fireIdea(textarea.value,indicator);

};


/* =========================
SETTINGS
========================= */

settingsBtn.onclick = ()=>{

if(!currentCampaign){

alert("Open a campaign first.");

return;

}

loadSettings(currentCampaign);

};


/* =========================
MAP SYSTEM
========================= */

setupMap();

document.getElementById("drawTool").onclick = ()=>setTool("draw");
document.getElementById("tokenTool").onclick = ()=>setTool("token");
document.getElementById("fogTool").onclick = ()=>setTool("fog");
document.getElementById("markerTool").onclick = ()=>setTool("marker");

document.getElementById("clearTool").onclick = clearMap;


/* =========================
MAP UPLOAD
========================= */

mapUpload.onchange = (e)=>{

const file = e.target.files[0];

if(!file) return;

const reader = new FileReader();

reader.onload = ()=>{

document.getElementById("mapImage").src = reader.result;

};

reader.readAsDataURL(file);

};


/* =========================
AUTOSAVE
========================= */

let autosaveTimer;

textarea.addEventListener("input",()=>{

clearTimeout(autosaveTimer);

autosaveTimer=setTimeout(()=>{

textarea.dispatchEvent(new Event("saveEditor"));

},2000);

});

textarea.addEventListener("saveEditor",()=>{

console.log("Autosaved");

});

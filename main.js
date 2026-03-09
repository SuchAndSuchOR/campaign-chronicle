import { addMap, createToken, createFog, addMarker } from "./map.js";
import { createCampaign, joinWithCode } from "./campaign.js";

function get(id){
return document.getElementById(id);
}

/* =========================
PAGE SWITCH
========================= */

const mapsBtn = get("mapsPageBtn");
const notesBtn = get("notesPageBtn");

const mapsPage = get("mapsPage");
const notesPage = get("notesPage");

if(mapsBtn){

mapsBtn.onclick = ()=>{

mapsPage.classList.remove("hidden");
notesPage.classList.add("hidden");

};

}

if(notesBtn){

notesBtn.onclick = ()=>{

notesPage.classList.remove("hidden");
mapsPage.classList.add("hidden");

};

}


/* =========================
MAP UPLOAD
========================= */

const addMapBtn = get("addMapBtn");
const mapUpload = get("mapUpload");

if(addMapBtn){

addMapBtn.onclick = ()=>{

mapUpload.click();

};

}

if(mapUpload){

mapUpload.onchange = (e)=>{

const file = e.target.files[0];

if(!file) return;

const reader = new FileReader();

reader.onload = ()=>{

addMap(reader.result);

};

reader.readAsDataURL(file);

};

}


/* =========================
TOKEN
========================= */

const tokenBtn = get("tokenBtn");

if(tokenBtn){

tokenBtn.onclick = ()=>{

createToken("https://cdn-icons-png.flaticon.com/512/3522/3522099.png");

};

}


/* =========================
FOG
========================= */

const fogBtn = get("fogBtn");

if(fogBtn){

fogBtn.onclick = ()=>{

createFog();

};

}


/* =========================
MARKER
========================= */

const markerBtn = get("markerBtn");

if(markerBtn){

markerBtn.onclick = ()=>{

addMarker(200,200,"📍");

};

}


/* =========================
CREATE CAMPAIGN
========================= */

const newCampaignBtn = get("newCampaignBtn");

if(newCampaignBtn){

newCampaignBtn.onclick = ()=>{

createCampaign();

};

}


/* =========================
JOIN CODE
========================= */

const joinBtn = get("joinBtn");

if(joinBtn){

joinBtn.onclick = ()=>{

const code = get("joinCodeInput").value;

joinWithCode(code);

};

}

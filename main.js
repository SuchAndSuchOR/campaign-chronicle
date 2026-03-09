import { addMap } from "./map.js";

/* =========================
SAFE ELEMENT GET
========================= */

function get(id){
return document.getElementById(id);
}

/* =========================
MAP SYSTEM
========================= */

const addMapBtn = get("addMapBtn");
const mapUpload = get("mapUpload");

if(addMapBtn && mapUpload){

addMapBtn.onclick = ()=>{

mapUpload.click();

};

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
PAGE SWITCHING
========================= */

const mapsPageBtn = get("mapsPageBtn");
const notesPageBtn = get("notesPageBtn");

const mapsPage = get("mapsPage");
const notesPage = get("notesPage");

if(mapsPageBtn && mapsPage && notesPage){

mapsPageBtn.onclick = ()=>{

mapsPage.classList.remove("hidden");
notesPage.classList.add("hidden");

};

}

if(notesPageBtn && mapsPage && notesPage){

notesPageBtn.onclick = ()=>{

notesPage.classList.remove("hidden");
mapsPage.classList.add("hidden");

};

}

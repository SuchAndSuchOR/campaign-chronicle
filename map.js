let canvas;
let ctx;

let maps = [];
let currentMap = null;

let mode = "draw";
let drawing = false;

let boardOffsetX = 0;
let boardOffsetY = 0;

/* INIT */

export function setupMap(){

canvas = document.getElementById("mapCanvas");
ctx = canvas.getContext("2d");

canvas.addEventListener("mousedown",startDraw);
canvas.addEventListener("mousemove",draw);
canvas.addEventListener("mouseup",stopDraw);

enablePan();

}

/* MAP LIBRARY */

export function addMap(src){

const id = Date.now();

maps.push({id,src});

renderLibrary();

loadMap(id);

}

function renderLibrary(){

const lib=document.getElementById("mapLibrary");

lib.innerHTML="";

maps.forEach(m=>{

const img=document.createElement("img");

img.src=m.src;
img.className="mapThumb";

img.onclick=()=>loadMap(m.id);

lib.appendChild(img);

});

}

/* LOAD MAP */

function loadMap(id){

const map=maps.find(m=>m.id===id);
if(!map) return;

currentMap=id;

const img=document.getElementById("mapImage");

img.src=map.src;

img.onload=()=>{

canvas.width=img.width;
canvas.height=img.height;

};

}

/* TOOL */

export function setTool(tool){
mode=tool;
}

/* DRAWING */

function startDraw(e){

drawing=true;
handleAction(e);

}

function draw(e){

if(!drawing) return;

if(mode==="draw"){

const rect=canvas.getBoundingClientRect();

const x=e.clientX-rect.left;
const y=e.clientY-rect.top;

ctx.fillStyle="red";
ctx.beginPath();
ctx.arc(x,y,3,0,Math.PI*2);
ctx.fill();

}

}

function stopDraw(){
drawing=false;
}

/* ACTIONS */

function handleAction(e){

const rect=canvas.getBoundingClientRect();

const x=e.clientX-rect.left;
const y=e.clientY-rect.top;

if(mode==="token") token(x,y);
if(mode==="fog") fog(x,y);
if(mode==="marker") marker(x,y);

}

/* TOKEN */

function token(x,y){

ctx.fillStyle="blue";

ctx.beginPath();
ctx.arc(x,y,10,0,Math.PI*2);
ctx.fill();

}

/* FOG */

function fog(x,y){

ctx.fillStyle="rgba(0,0,0,0.7)";
ctx.fillRect(x-40,y-40,80,80);

}

/* MARKER */

function marker(x,y){

ctx.fillStyle="yellow";
ctx.beginPath();
ctx.arc(x,y,6,0,Math.PI*2);
ctx.fill();

}

/* CLEAR */

export function clearMap(){
ctx.clearRect(0,0,canvas.width,canvas.height);
}

/* MAP BOARD PAN */

function enablePan(){

let dragging=false;
let startX,startY;

canvas.addEventListener("mousedown",(e)=>{

if(mode!=="draw") return;

dragging=true;
startX=e.clientX-boardOffsetX;
startY=e.clientY-boardOffsetY;

});

window.addEventListener("mousemove",(e)=>{

if(!dragging) return;

boardOffsetX=e.clientX-startX;
boardOffsetY=e.clientY-startY;

canvas.style.transform=
`translate(${boardOffsetX}px,${boardOffsetY}px)`;

document.getElementById("mapImage").style.transform=
`translate(${boardOffsetX}px,${boardOffsetY}px)`;

});

window.addEventListener("mouseup",()=>{

dragging=false;

});

}

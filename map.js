export function addMap(src){

const board = document.getElementById("mapBoard");

const container = document.createElement("div");

container.className = "mapItem";

container.style.left = "100px";
container.style.top = "100px";

const img = document.createElement("img");

img.src = src;

container.appendChild(img);

board.appendChild(container);

dragElement(container);

}


/* =========================
DRAG SYSTEM
========================= */

function dragElement(el){

let offsetX = 0;
let offsetY = 0;

el.onmousedown = (e)=>{

offsetX = e.clientX - el.offsetLeft;
offsetY = e.clientY - el.offsetTop;

document.onmousemove = (e)=>{

el.style.left = (e.clientX-offsetX) + "px";
el.style.top = (e.clientY-offsetY) + "px";

};

document.onmouseup = ()=>{

document.onmousemove = null;

};

};

}


/* =========================
DRAW ON MAP
========================= */

export function enableDrawing(canvas){

const ctx = canvas.getContext("2d");

let drawing = false;

canvas.onmousedown = ()=> drawing=true;

canvas.onmouseup = ()=> drawing=false;

canvas.onmousemove = (e)=>{

if(!drawing) return;

ctx.fillStyle = "red";

ctx.beginPath();
ctx.arc(e.offsetX,e.offsetY,3,0,Math.PI*2);
ctx.fill();

};

}


/* =========================
TOKENS
========================= */

export function createToken(src){

const board = document.getElementById("mapBoard");

const token = document.createElement("img");

token.src = src;

token.style.position = "absolute";

token.style.width = "60px";
token.style.left = "200px";
token.style.top = "200px";

token.className = "token";

board.appendChild(token);

dragElement(token);

}


/* =========================
FOG OF WAR
========================= */

export function createFog(){

const board = document.getElementById("mapBoard");

const fog = document.createElement("canvas");

fog.width = board.clientWidth;
fog.height = board.clientHeight;

fog.style.position="absolute";

const ctx = fog.getContext("2d");

ctx.fillStyle="black";
ctx.fillRect(0,0,fog.width,fog.height);

board.appendChild(fog);

fog.onmousemove=(e)=>{

if(e.buttons!==1) return;

ctx.globalCompositeOperation="destination-out";

ctx.beginPath();
ctx.arc(e.offsetX,e.offsetY,40,0,Math.PI*2);
ctx.fill();

};

}


/* =========================
MARKERS
========================= */

export function addMarker(x,y,text){

const board = document.getElementById("mapBoard");

const marker = document.createElement("div");

marker.innerText = text;

marker.style.position="absolute";
marker.style.left = x+"px";
marker.style.top = y+"px";

marker.style.background="yellow";
marker.style.color="black";
marker.style.padding="3px";

board.appendChild(marker);

}

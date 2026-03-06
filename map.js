let canvas;
let ctx;

let mode = "draw";
let drawing = false;


/* INIT */

export function setupMap(){

canvas = document.getElementById("mapCanvas");
ctx = canvas.getContext("2d");

const img = document.getElementById("mapImage");

img.onload = ()=>{

canvas.width = img.width;
canvas.height = img.height;

};

canvas.addEventListener("mousedown",startDraw);
canvas.addEventListener("mousemove",draw);
canvas.addEventListener("mouseup",stopDraw);

}


/* TOOL SELECT */

export function setTool(tool){

mode = tool;

}


/* DRAW */

function startDraw(e){

drawing = true;

handleAction(e);

}

function draw(e){

if(!drawing) return;

if(mode==="draw"){

const rect = canvas.getBoundingClientRect();

const x = e.clientX - rect.left;
const y = e.clientY - rect.top;

ctx.fillStyle="red";

ctx.beginPath();

ctx.arc(x,y,3,0,Math.PI*2);

ctx.fill();

}

}

function stopDraw(){

drawing = false;

}


/* ACTIONS */

function handleAction(e){

const rect = canvas.getBoundingClientRect();

const x = e.clientX - rect.left;
const y = e.clientY - rect.top;

if(mode==="token") drawToken(x,y);

if(mode==="fog") drawFog(x,y);

if(mode==="marker") drawMarker(x,y);

}


/* TOKEN */

function drawToken(x,y){

ctx.fillStyle="blue";

ctx.beginPath();

ctx.arc(x,y,10,0,Math.PI*2);

ctx.fill();

}


/* FOG */

function drawFog(x,y){

ctx.fillStyle="rgba(0,0,0,0.7)";

ctx.fillRect(x-40,y-40,80,80);

}


/* MARKER */

function drawMarker(x,y){

ctx.fillStyle="yellow";

ctx.beginPath();

ctx.arc(x,y,6,0,Math.PI*2);

ctx.fill();

}


/* CLEAR */

export function clearMap(){

ctx.clearRect(0,0,canvas.width,canvas.height);

}
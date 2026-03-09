export function addMap(src){

const board = document.getElementById("mapBoard");

const img = document.createElement("img");

img.src = src;
img.className = "mapLayer";

board.appendChild(img);

}

export function createToken(src){

const board = document.getElementById("mapBoard");

const token = document.createElement("img");

token.src = src;
token.className = "token";

token.style.position = "absolute";
token.style.left = "200px";
token.style.top = "200px";

board.appendChild(token);

drag(token);
resize(token);

}

/* DRAG SYSTEM */

function drag(el){

let offsetX = 0;
let offsetY = 0;

el.addEventListener("mousedown",(e)=>{

offsetX = e.clientX - el.offsetLeft;
offsetY = e.clientY - el.offsetTop;

function move(e){

el.style.left = (e.clientX - offsetX) + "px";
el.style.top = (e.clientY - offsetY) + "px";

}

document.addEventListener("mousemove",move);

document.addEventListener("mouseup",()=>{

document.removeEventListener("mousemove",move);

},{once:true});

});

}

/* RESIZE */

function resize(el){

el.addEventListener("wheel",(e)=>{

e.preventDefault();

let size = el.offsetWidth;

if(e.deltaY < 0){
size += 10;
}else{
size -= 10;
}

if(size < 20) size = 20;

el.style.width = size + "px";

});

}

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

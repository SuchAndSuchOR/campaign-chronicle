let activeTool = "none";

/* =========================
   ADD MAP
========================= */

export function addMap(src){

const board=document.getElementById("mapBoard");

const img=document.createElement("img");

img.src=src;
img.className="mapLayer";

board.appendChild(img);

}


/* =========================
   TOKEN
========================= */

export function createToken(src){

const board=document.getElementById("mapBoard");

const token=document.createElement("img");

token.src=src;
token.className="token";

token.style.left="200px";
token.style.top="200px";

board.appendChild(token);

drag(token);
resize(token);

}


/* =========================
   DRAG TOKEN
========================= */

function drag(el){

let x=0;
let y=0;

el.onmousedown=(e)=>{

x=e.clientX-el.offsetLeft;
y=e.clientY-el.offsetTop;

document.onmousemove=(e)=>{

el.style.left=(e.clientX-x)+"px";
el.style.top=(e.clientY-y)+"px";

};

document.onmouseup=()=>{

document.onmousemove=null;

};

};

}


/* =========================
   RESIZE TOKEN
========================= */

function resize(el){

el.onwheel=(e)=>{

e.preventDefault();

let w=el.offsetWidth;

if(e.deltaY<0) w+=10;
else w-=10;

if(w<20) w=20;

el.style.width=w+"px";

};

}


/* =========================
   DRAW TOOL
========================= */

export function enableDrawing(){

activeTool="draw";

const canvas=document.getElementById("drawCanvas");
const ctx=canvas.getContext("2d");

let drawing=false;

canvas.onmousedown=()=>drawing=true;
canvas.onmouseup=()=>drawing=false;

canvas.onmousemove=(e)=>{

if(activeTool!=="draw") return;
if(!drawing) return;

ctx.fillStyle="red";

ctx.beginPath();
ctx.arc(e.offsetX,e.offsetY,3,0,Math.PI*2);
ctx.fill();

};

}


/* =========================
   GRID
========================= */

export function drawGrid(){

const canvas=document.getElementById("gridCanvas");

canvas.width=2000;
canvas.height=2000;

const ctx=canvas.getContext("2d");

const size=50;

ctx.beginPath();

for(let x=0;x<canvas.width;x+=size){

ctx.moveTo(x,0);
ctx.lineTo(x,canvas.height);

}

for(let y=0;y<canvas.height;y+=size){

ctx.moveTo(0,y);
ctx.lineTo(canvas.width,y);

}

ctx.strokeStyle="#333";
ctx.stroke();

}


/* =========================
   MEASURE TOOL
========================= */

export function measure(){

activeTool="measure";

const canvas=document.getElementById("drawCanvas");
const ctx=canvas.getContext("2d");

let start=null;

canvas.onclick=(e)=>{

if(activeTool!=="measure") return;

if(!start){

start=[e.offsetX,e.offsetY];

}else{

const dx=e.offsetX-start[0];
const dy=e.offsetY-start[1];

const dist=Math.sqrt(dx*dx+dy*dy);

ctx.fillStyle="white";
ctx.font="16px Arial";

ctx.fillText(dist.toFixed(0)+"px",e.offsetX,e.offsetY);

start=null;

}

};

}


/* =========================
   FIRE IDEA GENERATOR
========================= */

export function fireIdea(){

const ideas=[

"A mysterious portal opens nearby",
"A dragon shadow passes overhead",
"A traveling merchant sells cursed artifacts",
"A child delivers a strange message",
"A magical storm traps everyone in town",
"A noble secretly hires the party",
"A monster attacks during a festival",
"A wizard’s tower appears overnight",
"A dungeon entrance collapses behind the party",
"A cult begins recruiting townsfolk",
"A ghost asks the party for help",
"A map reveals a hidden treasure",
"A rival adventuring party appears",
"A king places a bounty on the party",
"A mysterious assassin stalks the party",
"A magical artifact begins glowing",
"A portal to another plane flickers open",
"A cursed forest begins expanding",
"A powerful noble betrays the party",
"A strange meteor crashes nearby",
"A prophecy begins to come true",
"A forgotten god whispers to the party",
"A magical disease spreads through town",
"A dragon demands tribute",
"A dungeon rises from the ground",
"A time loop traps the town",
"A powerful demon offers a deal",
"A lost kingdom emerges from the mist",
"A magical relic awakens",
"A mysterious traveler knows too much"

];

alert("🔥 Story Idea:\n\n"+ideas[Math.floor(Math.random()*ideas.length)]);

}


/* =========================
   BACKSTORY HELPER
========================= */

export function backstoryHelper(){

const ideas=[

"You were once a royal guard",
"You escaped a magical experiment",
"You are the last survivor of your village",
"You carry a cursed heirloom",
"You owe a dangerous favor to a crime lord",
"You were trained by a secret order",
"You are searching for a lost sibling",
"You fled your homeland after a betrayal",
"You were once a pirate",
"You are hiding your true identity",
"You accidentally unleashed a dark power",
"You once served a fallen king",
"You seek revenge for your family",
"You were exiled from your homeland",
"You discovered forbidden magic",
"You were raised by monsters",
"You escaped slavery",
"You were part of a secret cult",
"You found a mysterious artifact",
"You were once possessed by a spirit",
"You owe a dragon a debt",
"You have visions of the future",
"You survived a deadly curse",
"You are searching for a legendary weapon",
"You betrayed someone powerful",
"You were once a noble",
"You discovered a hidden city",
"You survived a magical disaster",
"You were trained by a legendary hero",
"You are secretly royalty"

];

alert("🧙 Backstory Idea:\n\n"+ideas[Math.floor(Math.random()*ideas.length)]);

}

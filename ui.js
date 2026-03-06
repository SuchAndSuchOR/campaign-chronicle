/* CAMPAIGN LIST */

export function renderCampaignList(campaigns,openCampaign){

  const list=document.getElementById("campaignList");

  list.innerHTML="";

  campaigns.forEach(c=>{

    const div=document.createElement("div");

    div.innerHTML=`
      <strong>${c.name}</strong>
      <button>Open</button>
      <hr>
    `;

    div.querySelector("button").onclick=()=>openCampaign(c);

    list.appendChild(div);

  });

}

/* SHOW CAMPAIGN */

export function showCampaign(name){

  const title=document.getElementById("campaignTitle");

  if(title) title.innerText=name;

}

/* CHARACTER BACKGROUND GENERATOR */

export function generateCharacterIdea(){

  const races=["Elf","Human","Dwarf","Tiefling","Dragonborn","Halfling"];
  const classes=["Wizard","Rogue","Cleric","Paladin","Ranger","Warlock"];

  const goals=[
    "seeking revenge",
    "trying to redeem their past",
    "searching for a lost artifact",
    "protecting their homeland",
    "trying to break a curse"
  ];

  const secrets=[
    "they secretly served a villain",
    "they once betrayed a friend",
    "they carry a cursed weapon",
    "they are hiding royal blood"
  ];

  const race=races[Math.floor(Math.random()*races.length)];
  const cls=classes[Math.floor(Math.random()*classes.length)];
  const goal=goals[Math.floor(Math.random()*goals.length)];
  const secret=secrets[Math.floor(Math.random()*secrets.length)];

  return `${race} ${cls} ${goal}. Secret: ${secret}.`;

}

/* FIRE STORY IDEA */

export function fireIdea(text,indicator){

  const ideas=[
    "A mysterious NPC interrupts the party.",
    "The dungeon begins collapsing.",
    "A rival adventuring party appears.",
    "A magical trap activates.",
    "A monster bursts through the wall."
  ];

  const idea=ideas[Math.floor(Math.random()*ideas.length)];

  indicator.innerText="🔥 "+idea;

}

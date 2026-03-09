import { db } from "./firebase.js";

import {
doc,
setDoc,
getDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

let currentCampaign = null;

function generateCode(){
return Math.floor(100000 + Math.random()*900000).toString();
}

export async function createCampaign(){

const code = generateCode();

try{

await setDoc(doc(db,"campaigns",code),{
created: Date.now()
});

currentCampaign = code;

return code;

}catch(err){

console.error(err);
alert("Failed to create campaign");

}

}

export async function joinCampaign(code){

try{

const snap = await getDoc(doc(db,"campaigns",code));

if(!snap.exists()){

alert("Campaign not found");
return null;

}

currentCampaign = code;

return code;

}catch(err){

console.error(err);

}

}

export function getCampaign(){

return currentCampaign;

}

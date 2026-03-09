import { db } from "./firebase.js";

import {
collection,
addDoc,
query,
where,
getDocs,
updateDoc,
doc,
arrayUnion
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";

function generateCode(){

return Math.floor(100000 + Math.random() * 900000).toString();

}

export async function createCampaign(){

const name=prompt("Campaign name?");

if(!name)return;

const code=generateCode();

await addDoc(collection(db,"campaigns"),{

name,
code,

members:[],

roles:{}

});

alert("Join Code: "+code);

}

export async function joinWithCode(code){

const q=query(
collection(db,"campaigns"),
where("code","==",code)
);

const snap=await getDocs(q);

snap.forEach(async(d)=>{

await updateDoc(doc(db,"campaigns",d.id),{

members:arrayUnion("player")

});

});

alert("Joined campaign");

}

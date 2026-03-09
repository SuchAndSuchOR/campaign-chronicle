import { db } from "./firebase.js"

import {
collection,
doc,
setDoc,
getDoc
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js"


let currentCampaign=null


function generateCode(){

return Math.floor(100000 + Math.random()*900000).toString()

}


export async function createCampaign(){

const code=generateCode()

await setDoc(doc(db,"campaigns",code),{

created:Date.now()

})

currentCampaign=code

return code

}


export async function joinCampaign(code){

const ref=doc(db,"campaigns",code)

const snap=await getDoc(ref)

if(!snap.exists()){

alert("Campaign not found")

return null

}

currentCampaign=code

return code

}


export function getCampaign(){

return currentCampaign

}

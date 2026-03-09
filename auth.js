import { auth } from "./firebase.js";

import {
createUserWithEmailAndPassword,
signInWithEmailAndPassword,
onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";

export function initAuth(onLogin){

const email = document.getElementById("email");
const pass = document.getElementById("password");

const registerBtn = document.getElementById("registerBtn");
const loginBtn = document.getElementById("loginBtn");

registerBtn.onclick = async () => {

await createUserWithEmailAndPassword(
auth,
email.value,
pass.value
);

};

loginBtn.onclick = async () => {

await signInWithEmailAndPassword(
auth,
email.value,
pass.value
);

};

onAuthStateChanged(auth,(user)=>{

if(user){

onLogin(user);

}

});

}

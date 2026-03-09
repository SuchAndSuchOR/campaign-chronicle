import {
addMap,
createToken,
enableDrawing,
drawGrid,
measure
} from "./map.js"



function get(id){
return document.getElementById(id)
}



/* MAP UPLOAD */

get("addMapBtn").onclick=()=>{

get("mapUpload").click()

}


get("mapUpload").onchange=(e)=>{

const file=e.target.files[0]

const reader=new FileReader()

reader.onload=()=>{

addMap(reader.result)

}

reader.readAsDataURL(file)

}



/* TOKEN */

get("tokenBtn").onclick=()=>{

createToken("https://cdn-icons-png.flaticon.com/512/3522/3522099.png")

}



/* DRAW */

get("drawBtn").onclick=()=>{

enableDrawing()

}



/* GRID */

drawGrid()



/* MEASURE */

get("measureBtn").onclick=()=>{

measure()

}



/* MARKER UPLOAD */

get("uploadMarkerBtn").onclick=()=>{

get("markerUpload").click()

}


get("markerUpload").onchange=(e)=>{

const file=e.target.files[0]

const reader=new FileReader()

reader.onload=()=>{

createToken(reader.result)

}

reader.readAsDataURL(file)

}

// VARIABLE DECLARATIONS AND BASIC SETUP
var canvas = document.getElementById("demoCanvas");
var stage = new createjs.Stage(canvas);
var stageContainer = new createjs.Container(); // root level container: everything must be added to this! (for resizing, mostly)
stage.addChild(stageContainer);
stage.enableMouseOver(10);
window.addEventListener("resize", cbResize);

var thisGameState;
var loginScreen, plotMenu, inventoryMenu, notebookMenu, settingsMenu;
var plots = new Array(21);
var currentPlot;

baseGraphics();
createMenus();
cbResize();

var socket = io();

// ROOM ENTRY
const newButton = document.querySelector('#newbutton');
const joinButton = document.querySelector('#joinbutton');
const roomForm = document.forms[0];
const roomID = roomForm.elements["roomcode"];
const curRoomText = document.getElementById("current-room")

newButton.addEventListener("click", createNewRoom);
joinButton.addEventListener("click", event =>{
  roomForm.style.display = "block";
})

roomForm.onsubmit = event => {
  event.preventDefault();
  var code = roomID.value;
  socket.emit("join", code);
};

const notesForm = document.getElementById("note-entry");
const note = document.getElementById("note-input");
const notesList = document.getElementById("notes-list")
notesForm.onSubmit = event => {
  event.preventDefault();
  var text = note.value;
  newNote(thisGameState, text);
}


function createNewRoom(){
  socket.emit("add");
}

socket.on('ID', function(code, id){
  curRoomText.style.display = "block"; 
  if (code == 0){
    curRoomText.innerHTML = "Room creation error.";
  } else {
    curRoomText.innerHTML = "Room ID: " + String(id);
    thisGameState = initiateGameState(id);
    console.log(thisGameState);
    socket.emit("save", thisGameState);
    loadRoom();
  }
});

socket.on('gamedata', function(rows){
  curRoomText.style.display = "block"; 
  if (rows == ""){
    curRoomText.innerHTML = "Room does not exist";
  } else {
    curRoomText.innerHTML = "Room ID: " + String(rows.id);
    thisGameState = readGameState(rows.gameState);
    renderPlants();
    loadRoom();
  }
});

socket.on("save", function(newGameState){
  thisGameState = readGameState(newGameState);
  console.log("message received");
  renderPlants();
  // to do: handle notes and inv
});

function loadRoom(){
  stageContainer.removeChild(loginScreen);
  newButton.style.display = "none";
  joinButton.style.display = "none";
  roomForm.style.display = "none";
  stage.update()
}

// SETUP FUNCTIONS
function baseGraphics() {
  // plots
  var xcoords = [80, 200, 320, 440, 560, 680, 800];
  var ycoords = [120, 240, 360];
  
  var plotDrawer = new createjs.Graphics()
    .beginFill("#b08e53")
    .drawRect(0, 0, 100, 100);

  for (var i = 0; i < 21; i++) {
    var plot = new createjs.Container();
    var ground = new createjs.Shape(plotDrawer);
    stageContainer.addChild(plot);
    plot.addChild(ground);
    plot.x = xcoords[i % 7];
    plot.y = ycoords[i % 3];
    plot.cursor = "pointer";
    plot.name = i;
    plots[i] = plot;

    plot.on("mousedown", function(evt) {
      currentPlot = this.name;
      openPlotMenu();
    });
  }
  
  // notebook
  var notebook = new createjs.Shape();
  notebook.graphics.beginFill("#a2c3bd").drawRect(950, 200, 60, 60);
  stageContainer.addChild(notebook);
  stageContainer.cursor = "pointer";
  notebook.on("mousedown", function(evt) {
    openNotebookMenu();
  });
  
  // inventory
  var inventory = new createjs.Shape();
  inventory.graphics.beginFill("#4d547b").drawRect(950, 280, 60, 60);
  stageContainer.addChild(inventory);
  stageContainer.cursor = "pointer";
  inventory.on("mousedown", function(evt) {
    console.log("OPENBACKPACK"); //for now
  });
  
  // settings/info
  var settings = new createjs.Shape();
  settings.graphics.beginFill("#ecb8ad").drawRect(950, 360, 60, 60);
  stageContainer.addChild(settings);
  stageContainer.cursor = "pointer";
  settings.on("mousedown", function(evt) {
    console.log("um..."); //for now
  });
}

function createMenus(){
  //login screen
  loginScreen = new createjs.Container();
  loginScreen.name = "loginScreen";
  stageContainer.addChild(loginScreen);
  var background = new createjs.Shape();
  background.graphics.beginFill("#ffffffa0").drawRect(50, 50, 1000, 520);
  loginScreen.addChild(background);
  var title = new createjs.Text("community gardens", "italic 50px Helvetica");
  title.x = 550; title.y = 200;
  title.textAlign = "center";
  loginScreen.addChild(title);
  var desc = new createjs.Text("create or join room below", "20px Helvetica");
  desc.x = 550; desc.y = 400;
  desc.textAlign = "center";
  loginScreen.addChild(desc);
  
  //plot menu
  plotMenu = new createjs.Container();
  plotMenu.name = "plotMenu";
  var plotBg = new createjs.Shape();
  plotBg.graphics.beginFill("#ffffff80").drawRect(0, 0, 70, 100);
  plotMenu.addChild(plotBg);
  
  var hitAreaDrawer = new createjs.Graphics().beginFill("#bffbff").drawRect(-35,0,70,20);
  var hitArea = new createjs.Shape(hitAreaDrawer);
  
  var plantText = new createjs.Text("plant", "18px Helvetica");
  plantText.x = 35, plantText.y = 10, plantText.textAlign = "center"; plantText.hitArea = hitArea;
  plotMenu.addChild(plantText);
  
  plantText.on("mousedown", function(evt){
    if (thisGameState.plots[currentPlot].type == null){
      newPlant(thisGameState, currentPlot, "carrot");
      renderPlants(); //could do just draw carrot later if we want efficiency
    }
    closePlotMenu();
  });
  
  var pullText = new createjs.Text("pull", "18px Helvetica");
  pullText.x = 35, pullText.y = 30, pullText.textAlign = "center"; pullText.hitArea = hitArea;
  plotMenu.addChild(pullText);
  
  pullText.on("mousedown", function(evt){
    if (thisGameState.plots[currentPlot].type != null) {
      plots[currentPlot].removeChildAt(1);
      thisGameState.plots[currentPlot] = initiatePlant();
      socket.emit("save", thisGameState);
    }
    closePlotMenu();
  });
  
  var waterText = new createjs.Text("water", "18px Helvetica");
  waterText.x = 35, waterText.y = 50, waterText.textAlign = "center"; waterText.hitArea = hitArea;
  plotMenu.addChild(waterText);
  
  waterText.on("mousedown", function(evt){
    var newPlot = new createjs.Shape();
    newPlot.graphics.beginFill("#4a3b21").drawRect(plots[currentPlot].children[0].x, plots[currentPlot].children[0].y, 100, 100);
    console.log(plots[currentPlot].children[0].x, plots[currentPlot].children[0].y);
    plots[currentPlot].removeChildAt(0);
    plots[currentPlot].addChildAt(newPlot, 0);
    thisGameState.plots[currentPlot].lastWatered = new Date().toISOString().slice(0, 10);
    socket.emit("save", thisGameState);
    closePlotMenu();
  });
  
  var closeText = new createjs.Text("close", "18px Helvetica");
  closeText.x = 35, closeText.y = 70, closeText.textAlign = "center"; closeText.hitArea = hitArea;
  plotMenu.addChild(closeText);
  closeText.on("mousedown", closePlotMenu);
  
  // notebook menu
  notebookMenu = new createjs.Container();
  var notebookBg = new createjs.Shape();
  notebookBg.graphics.beginFill("#fff").drawRect(0, 0, 70, 100);
  notebookMenu.addChild(notebookBg);

//   document.body.appendChild(html);
  var notes = document.getElementById("notes");
  
  var content = new createjs.DOMElement(notes);
  notebookMenu.addChild(content);
  notebookMenu.x = 200; // temp
  notebookMenu.y = 200;
}

function openPlotMenu(){
  plotMenu.x = plots[currentPlot].x + 40; plotMenu.y = plots[currentPlot].y - 30;
  stageContainer.addChild(plotMenu);
  stage.update();
}

function closePlotMenu(){
  stageContainer.removeChild(plotMenu);
  stage.update();
}

function openNotebookMenu() {
  stageContainer.addChild(notebookMenu);
  stage.update();
}

// DRAW FUNCTIONS
function renderPlants() {
  for (var i = 0; i < plots.length; i++){
    if (plots[i].children.length > 1){
      plots[i].removeChildAt(1);
    }
  }
  for (var i = 0; i < 21; i++) {
    if (thisGameState.plots[i].type == "carrot") {
      var carrot = new createjs.Shape();
      carrot.graphics.beginFill("#ffa200").moveTo(0,0).lineTo(15,30).lineTo(30,0);
      plots[i].addChild(carrot);
    } else if (thisGameState.plots[i].type == "flower") {
      console.log('flower lmao'); 
    }
  }
  stage.update();
}

// function renderNotes(){
//   // del prev notes
//   var prevNotes = document.getElementsByClassName("note");
//   for (var i = 0; i < prevNotes.length; i++) {
//     prevNotes[i].remove();
//   }
  
//   // create new notes
//   for (var i = 0; i < thisGameState.notes.length; i++) {
//     const newListItem = document.createElement("li");
//     newListItem.innerText = thisGameState.notes[i];
//     newListItem.classList.add("note");
//     newListItem.id = ("note" + i);
//     notesList.appendChild(newListItem);
//   } 
// }

function renderInventory(){
  /// ? 
}

// GAME STATE FUNCTIONS
function initiateGameState(roomId) {
  var gameState = {
    "roomId": roomId,
    "plots": initiatePlots(),
    "notes": [],
    "inventory": []
  }
  return gameState;
}

function initiatePlots() {
  var plots = []
  for (var i = 0; i < 21; i++) {
    plots.push(initiatePlant());
  }
  return plots;
}

function initiatePlant() {
  return {
    "type": null,
    "growthStage": null,
    "lastEvolved": null,
    "lastWatered": null
  }
}

function readGameState(gameString) {
  var gameState = JSON.parse(gameString);
  return gameState;
} 

function newPlant(gameState, position, type) {
  gameState.plots[position].type = type,
  gameState.plots[position].growthStage = 0,
  gameState.plots[position].lastEvolved = new Date().toISOString().slice(0, 10);
  socket.emit("save", gameState);
}

// to do: checks for evo and water (wilting i guess)

function newNote(gameState, text) {
  thisGameState.notes.push(text);
  socket.emit("save", gameState);
}

function addToInventory(gameState, item) {
  // not sure what this is gonna do exactly
  thisGameState.inventory.push(item);
  socket.emit("save", gameState);
}

// HELPER FUNCTIONS
function cbResize() {
  var w = window.innerWidth;
  var h = window.innerHeight;
  canvas.width = Math.floor((2 * w) / 3);
  canvas.height = Math.floor((9 / 16) * canvas.width); // maintain aspect ratio

  var scale = canvas.width / 1100; //currently develop in 1100 by 620 pixels?
  stageContainer.scaleX = stageContainer.scaleY = scale;
  stage.update();
}

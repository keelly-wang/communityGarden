// init project
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const fs = require("fs");
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// http://expressjs.com/en/starter/static-files.html
app.use(express.static("public"));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", (request, response) => {
  response.sendFile(`${__dirname}/views/index.html`);
});

const dbFile = "./.data/sqlite.db";
const exists = fs.existsSync(dbFile);
const sqlite3 = require("sqlite3").verbose();
const db = new sqlite3.Database(dbFile);

db.serialize(() => {
  if (!exists) {
    console.log("Starting table creation...");
    db.run(
      "CREATE TABLE rooms (id INTEGER PRIMARY KEY AUTOINCREMENT, lastJoined DATE, gameState TEXT)"
    );
    console.log("New table rooms created!");
  } else {
    console.log('Database "rooms" ready to go!');
  }
});

io.on("connection", socket => {
  console.log("a user connected");
  
  socket.on("disconnect", () => {
    console.log("user disconnected");
  });

  socket.on("add", () => {
    if (!process.env.DISALLOW_WRITE) {
      db.run(
        `INSERT INTO rooms (lastJoined) VALUES (CURRENT_TIMESTAMP)`,
        function(error) {
          if (error) {
            socket.emit("ID", 0, error.message);
          } else {
            socket.emit("ID", 1, this.lastID);
            socket.join(String(this.lastID));
          }
        }
      );
    }
  });

  socket.on("join", roomID => {
    db.get("SELECT * from rooms WHERE id = ?", [roomID], (err, rows) => {
      if (rows) {
        console.log(rows);
        socket.emit("gamedata", rows);
        socket.join(roomID);
      } else {
        socket.emit("gamedata", "");
      }
    });
  });

  socket.on("save", gameState => {
    var gameString = JSON.stringify(gameState);
    console.log(gameString);
    db.run(
      "UPDATE rooms SET lastJoined = CURRENT_TIMESTAMP, gameState = '" + gameString + "' WHERE id = ?", [gameState.roomId],
      function(error) {
        if (error) {
          console.log("Failed to update server game states");
          console.log(error.message);
        } else {
          console.log("Updated server game states")
          console.log(io.sockets.adapter.rooms);
          console.log(gameState.roomId);
          socket.broadcast.to(String(gameState.roomId)).emit("save", gameString);
        }
    });

  });
});

// game logic (implement later)
function gameloop(){
  console.log("another minute passes in africa");
}

setInterval(gameloop, 60000); // runs every minute

http.listen(process.env.PORT, () => {
  console.log("listening on port", process.env.PORT); // remember to set port!! 
});
const express = require("express");
const http = require("http");
const { initializeAPI } = require("./api");
const pinoHttp = require("pino-http");
const {fileLogger} = require("../.rotate.js");

// Create the express server
const app = express();
app.use(express.json());
const server = http.createServer(app);

// deaktivierung des x-powered-by headers
app.disable("x-powered-by");

// middleware logging
app.use(pinoHttp({logger: fileLogger}));

// deliver static files from the client folder like css, js, images
app.use(express.static("client"));
// route for the homepage
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/client/index.html");
});

// Initialize the REST api
initializeAPI(app);

//start the web server
const serverPort = process.env.PORT || 3000;
server.listen(serverPort, () => {
  console.log(`Express Server started on port ${serverPort}`);
});

app.use((err, req, res, next) => {
  fileLogger.error({error: err.message, stack: err.stack}, "Unerwarteter Fehler");
  res.status(500).json({error: "Ein interner Fehler ist aufgetreten."});
});

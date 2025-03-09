const pino = require("pino");
const mkdirp = require("mkdirp");
const path = require("path");
const fs = require("fs");

// sicherstellung das der logs ordner vorhanden ist
mkdirp.sync("./logs");

// die funktion wird benötigt
function rotateLogs() {
    const logFiles = fs.readdirSync("./logs")
        .filter(file => file.startsWith("app.log"))
        .sort((a, b) => fs.statSync(`./logs/${b}`).mtime - fs.statSync(`./logs/${a}`).mtime);

    if (logFiles.length > 5) {
        for (let i = 5; i < logFiles.length; i++) {
            fs.unlinkSync(`./logs/${logFiles[i]}`);
        }
    }
}

const consoleLogger = pino({
    level: "info",
    transport: {
        target: "pino-pretty",
        options: {
            colorize: true,
            translateTime: "yyyy-mm-dd HH:MM:ss",
            ignore: "pid,hostname",
        },
    },
});

const fileLogger = pino({
    level: "info",
    transport: {
        targets: [
            {
                target: "pino-pretty",
                options: {
                    destination: path.join(__dirname, "logs", "app.log"), // formatierte logs speichern
                    translateTime: "yyyy-mm-dd HH:MM:ss",
                    ignore: "pid,hostname",
                },
            },
        ],
    },
});

fs.watch("./logs/app.log", (eventType, filename) => {
    if (eventType === "change") {
        const stats = fs.statSync("./logs/app.log");
        if (stats.size >= 1024 * 1024) { // 1MB überschritten
            const timestamp = new Date().toISOString().replace(/:/g, "-");
            fs.renameSync("./logs/app.log", `./logs/app-${timestamp}.log`);
            console.log("Log-Datei wurde rotiert.");
            rotateLogs();
        }
    }
});

module.exports = {fileLogger, consoleLogger};
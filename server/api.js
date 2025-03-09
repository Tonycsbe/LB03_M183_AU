const { initializeDatabase, queryDB, insertDB } = require("./database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET || "meinFallbackSchlüssel";
const {fileLogger} = require("../.rotate.js");
const {encrypt, decrypt} = require("../crypto.js");
const sanitizeHtml = require("sanitize-html");
const rateLimit = require("express-rate-limit");

let db;

const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    fileLogger.warn({ip: clientIp}, "Brute-Force-Schutz: Zu viele fehlgeschlagene Login-Versuche");

    res.status(429).json({
      error: "Zu viele fehlgeschlagene Login-Versuche. Bitte später erneut versuchen."
    });
  }
});

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  fileLogger.info("API wurde initialisiert");

  app.get("/api/feed", authenticateToken, getFeed);
  app.post("/api/feed", authenticateToken, postTweet);
  app.post("/api/login", loginLimiter, login);
};

const getFeed = async (req, res) => {
  const query = req.query.q || "SELECT * FROM tweets ORDER BY id DESC";
  fileLogger.debug({query}, "Feed-Daten werden abgerufen");

  try {
    const tweets = await queryDB(db, query);
    console.log("Tweets aus DB:", tweets);
    if (!tweets || tweets.length === 0) {
      fileLogger.warn("Keine Tweets gefunden.");
      return res.json([]);
    }

    // entschlüsseln und nochmals xss-schutz anwenden
    const sanitizedTweets = tweets.map((tweet) => {
      const decryptedText = decrypt(tweet.text) || "Fehler beim Entschlüsseln";
      return {
        id: tweet.id,
        username: tweet.username,
        timestamp: tweet.timestamp,
        text: sanitizeHtml(decryptedText, {
          allowedTags: ["b", "i", "em", "strong", "a"],
          allowedAttributes: {"a": ["href", "title"]},
          disallowedTagsMode: "discard",
        }),
      };
    });

    fileLogger.info({resultCount: sanitizedTweets.length}, "Feed erfolgreich geladen");
    console.log("Entschlüsselte und bereinigte Tweets:", sanitizedTweets);
    res.json(sanitizedTweets);
  } catch (error) {
    fileLogger.error({error}, "Fehler beim Abrufen des Feeds");
    res.status(500).json({error: "Interner Serverfehler!"});
  }
};


const postTweet = async (req, res) => {
  if (!req.user) {
    fileLogger.warn("Nicht authentisierter Benutzer versucht, einen Post zu erstellen.");
    return res.status(401).json({error: "Nicht autorisiert"});
  }

  let {text} = req.body;
  const username = req.user.username;
  if (!text || text.trim() === "") {
    fileLogger.warn({userId: req.user.id}, "Versuch, einen leeren Post zu erstellen");
    return res.status(400).json({error: "Text darf nicht leer sein!"});
  }

  // xxs-schutz
  text = sanitizeHtml(text, {
    allowedTags: ["b", "i", "em", "strong"],
    allowedAttributes: {},
    disallowedTagsMode: "discard",
  });

  const timestamp = new Date().toISOString();
  const encryptedText = encrypt(text);

  const query = `INSERT INTO tweets (username, timestamp, text)
                 VALUES (?, ?, ?)`;
  const params = [username, timestamp, encryptedText];

  try {
    await insertDB(db, query, params);
    console.log("Erfolgreich in DB gespeichert!");
    fileLogger.info({username, text: "[VERSCHLÜSSELT]"}, "Tweet gespeichert");
    res.json({status: "ok"});
  } catch (error) {
    console.error("Fehler beim Speichern in die DB:", error);
    res.status(500).json({error: "Interner Serverfehler!"});
  }
};

const login = async (req, res) => {
  const {username, password} = req.body;

  if (!username || !password) {
    fileLogger.warn("Loginversuch mit fehlenden Daten");
    return res.status(400).json({error: "Benutzername und Passwort erforderlich!"});
  }

  const query = "SELECT * FROM users WHERE username = ?";
  try {
    const user = await queryDB(db, query, [username]);

    if (user.length === 0) {
      fileLogger.warn({username}, "Fehlgeschlagener Login");
      return res.status(401).json({error: "Ungültige Anmeldedaten"});
    }

    const isValid = await bcrypt.compare(password, user[0].password);
    if (!isValid) {
      fileLogger.warn({username}, "Fehlgeschlagener Login");
      return res.status(401).json({error: "Ungültige Anmeldedaten"});
    }

    const token = jwt.sign(
        {id: user[0].id, username: user[0].username},
        SECRET_KEY,
        {expiresIn: "1h"}
    );

    console.log("Token erstellt für:", {id: user[0].id, username: user[0].username});
    fileLogger.info({username}, "Erfolgreicher Login");
    res.json({username: user[0].username, token});
  } catch (error) {
    fileLogger.error({error}, "Fehler beim Login");
    res.status(500).json({error: "Interner Serverfehler!"});
  }
};


// middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    fileLogger.warn("Zugriffsversuch ohne gültigen Token");
    return res.status(401).json({error: "Kein oder ungültiger Token vorhanden"});
  }

  const token = authHeader.split(" ")[1];

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      fileLogger.warn("Ungültiger Token");
      return res.status(403).json({error: "Token ungültig"});
    }

    console.log("Benutzerdaten aus Token:", user);
    req.user = user;
    fileLogger.info({userId: user.id}, "Token validiert");
    next();
  });
};

module.exports = {initializeAPI, authenticateToken};
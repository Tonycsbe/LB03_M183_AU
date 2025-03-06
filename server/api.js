const { initializeDatabase, queryDB, insertDB } = require("./database");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();
const SECRET_KEY = process.env.JWT_SECRET || "meinFallbackSchlüssel";

let db;

const initializeAPI = async (app) => {
  db = await initializeDatabase();
  app.get("/api/feed", getFeed);
  app.post("/api/feed", postTweet);
  app.post("/api/login", login);
};

const getFeed = async (req, res) => {
  const query = req.query.q;
  const tweets = await queryDB(db, query);
  res.json(tweets);
};

const postTweet = async (req, res) => {
  const {text} = req.body;
  const username = req.user.username; // benutzer aus token lesen

  if (!text || text.trim() === "") {
    return res.status(400).json({error: "Tweet darf nicht leer sein!"});
  }

  const query = `INSERT INTO tweets (username, timestamp, text)
                 VALUES (?, ?, ?)`;
  const params = [username, new Date().toISOString(), text];

  insertDB(db, query, params)
      .then(() => res.json({status: "ok"}))
      .catch((err) => res.status(500).json({error: "Fehler beim Speichern des Tweets!"}));
};

const login = async (req, res) => {
  const {username, password} = req.body;

  // sichere SQL-Anfrage verhindert SQL-Injection
  const query = "SELECT * FROM users WHERE username = ?";
  try {
    const user = await queryDB(db, query, [username]);

    if (user.length === 0) {
      return res.status(401).json({error: "Benutzer nicht gefunden!"});
    }

    // passwortüberprüfung via bcrypt.compare
    const isValid = await bcrypt.compare(password, user[0].password);

    if (!isValid) {
      return res.status(401).json({error: "Falsches Passwort!"});
    }

    // jwt token generierung
    const token = jwt.sign(
        {id: user[0].id, username: user[0].username},
        SECRET_KEY,
        {expiresIn: "1h"}
    );

    res.json({username: user[0].username, token});
  } catch (error) {
    console.error("Fehler beim Login:", error);
    res.status(500).json({error: "Interner Serverfehler!"});
  }
};

// middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({error: "Kein Token vorhanden"});
  }

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) {
      return res.status(403).json({error: "Token ungültig"});
    }
    req.user = user; // benutzerinfos speichern
    next();
  });
};

module.exports = {initializeAPI, authenticateToken};
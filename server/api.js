const { initializeDatabase, queryDB, insertDB } = require("./database");
const bcrypt = require("bcrypt");

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

const postTweet = (req, res) => {
  insertDB(db, req.body.query);
  res.json({ status: "ok" });
};

const login = async (req, res) => {
  const { username, password } = req.body;

  // sichere sql anfrage verhindert sql injection
  const query = "SELECT * FROM users WHERE username = ?";
  try {
    const user = await queryDB(db, query, [username]);

    if (user.length === 0) {
      return res.status(401).json({error: "Benutzer nicht gefunden!"});
    }

    // passwortüberprüfung via bcrypt.compare()
    const isValid = await bcrypt.compare(password, user[0].password);

    if (!isValid) {
      return res.status(401).json({error: "Falsches Passwort!"});
    }

    res.json({username: user[0].username});
  } catch (error) {
    console.error("Fehler beim Login:", error);
    res.status(500).json({error: "Interner Serverfehler!"});
  }
};

module.exports = { initializeAPI };

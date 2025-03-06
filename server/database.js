const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt")

const tweetsTableExists =
  "SELECT name FROM sqlite_master WHERE type='table' AND name='tweets'";

const createTweetsTable = `CREATE TABLE tweets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  timestamp TEXT,
  text TEXT
)`;

const usersTableExists =
  "SELECT name FROM sqlite_master WHERE type='table' AND name='users'";

const createUsersTable = `CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  password TEXT
)`;

const hashPassword = async (password) => {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

const insertUsers = async (db, resolve, reject) => {
  try {
    // pw hashen
    const hashedUser1 = await hashPassword("123456");
    const hashedUser2 = await hashPassword("123456");
    const hashedUser3 = await hashPassword("123456");

    db.run(
        `INSERT INTO users (username, password) VALUES 
      ('switzerchees', ?), 
      ('john', ?), 
      ('jane', ?);`,
        [hashedUser1, hashedUser2, hashedUser3],
        (err) => {
          if (err) return console.error(err.message);
          console.log("Benutzer-Passwörter wurden gehasht und gespeichert!");
          resolve(db);
        }
    );
  } catch (error) {
    console.error("Fehler beim Hashen der Passwörter:", error);
    reject(error);
  }
};

// initialisierung der datenbank
const initializeDatabase = () => {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database("./minitwitter.db", (err) => {
      if (err) {
        console.error("Fehler beim Öffnen der Datenbank:", err.message);
        return reject(err);
      }

      console.log("Verbindung zur SQLite-Datenbank hergestellt.");

      // tweets tabelle
      db.get(tweetsTableExists, [], (err, row) => {
        if (err) return console.error(err.message);
        if (!row) {
          db.run(createTweetsTable, (err) => {
            if (err) console.error("Fehler beim Erstellen der Tweets-Tabelle:", err.message);
          });
        }
      });

      // tabelle der user erstellen
      db.get(usersTableExists, [], (err, row) => {
        if (err) return console.error(err.message);
        if (!row) {
          db.run(createUsersTable, [], (err) => {
            if (err) return console.error(err.message);

            console.log("Users-Tabelle wurde erstellt. Benutzer werden hinzugefügt...");
            insertUsers(db, resolve, reject);
          });
        } else {
          console.log("Users-Tabelle existiert bereits.");
          resolve(db);
        }
      });
    });
  });
};

// promises
const insertDB = (db, query) => {
  return new Promise((resolve, reject) => {
    db.run(query, [], (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
};

const queryDB = (db, query, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
};


module.exports = {initializeDatabase, queryDB, insertDB};
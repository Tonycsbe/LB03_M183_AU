const crypto = require("crypto");
const dotenv = require("dotenv");
dotenv.config();

const algorithm = "aes-256-cbc";
const key = Buffer.from(process.env.AES_SECRET_KEY, "utf-8");
const iv = crypto.randomBytes(16);

// verschlüsselung
const encrypt = (text) => {
    if (!text) return null;
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(text, "utf-8", "hex");
    encrypted += cipher.final("hex");
    return `${iv.toString("hex")}:${encrypted}`;
};

// entschlüsselung
const decrypt = (text) => {
    if (!text) return null;
    const [ivHex, encryptedText] = text.split(":");
    const decipher = crypto.createDecipheriv(algorithm, key, Buffer.from(ivHex, "hex"));
    let decrypted = decipher.update(encryptedText, "hex", "utf-8");
    decrypted += decipher.final("utf-8");
    return decrypted;
};

module.exports = {encrypt, decrypt};

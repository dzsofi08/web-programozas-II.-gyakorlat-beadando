require("dotenv").config();
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const connectDB = require("./config/db");
const Film = require("./models/Film");
const Mozi = require("./models/Mozi");
const Hely = require("./models/Hely");
const User = require("./models/User");
const Message = require("./models/Message");

const readTSV = (filename) => {
    const content = fs.readFileSync(path.join(__dirname, "data", filename), "utf-8");
    return content
        .split(/\r?\n/)
        .slice(1)
        .filter((line) => line.trim() !== "")
        .map((line) => line.split("\t"));
};

const seed = async () => {
    await connectDB();

    console.log("Korábbi film, mozi és hely adatok törlése...");
    await Promise.all([
        Film.deleteMany({}),
        Mozi.deleteMany({}),
        Hely.deleteMany({})
    ]);

    const filmek = readTSV("film.txt").map((c) => ({
        fkod: Number(c[0]),
        filmcim: (c[1] || "").replace(/^"|"$/g, "").trim(),
        szines: Number(c[2]) === -1,
        szinkron: (c[3] || "").trim(),
        szarmazas: (c[4] || "").trim(),
        mufaj: (c[5] || "").trim() || "Ismeretlen",
        hossz: Number(c[6]) || 90
    }));
    await Film.insertMany(filmek);
    console.log(`${filmek.length} film feltöltve.`);

    const mozik = readTSV("mozi.txt").map((c) => ({
        moziazon: Number(c[0]),
        mozinev: (c[1] || "").trim(),
        irszam: Number(c[2]) || 1000,
        cim: (c[3] || "").trim(),
        telefon: (c[4] || "").trim()
    }));
    await Mozi.insertMany(mozik);
    console.log(`${mozik.length} mozi feltöltve.`);

    const helyek = readTSV("hely.txt").map((c) => ({
        fkod: Number(c[0]),
        moziazon: Number(c[1])
    }));
    await Hely.insertMany(helyek);
    console.log(`${helyek.length} vetítési helyszín kapcsolat feltöltve.`);

    
    const adminExists = await User.findOne({ username: "admin" });
    if (!adminExists) {
        const hash = await bcrypt.hash("admin123", 10);
        await User.create({ username: "admin", password: hash, role: "admin" });
        console.log("Admin felhasználó létrehozva: admin / admin123");
    }

    
    const userExists = await User.findOne({ username: "tesztuser" });
    if (!userExists) {
        const hash = await bcrypt.hash("user123", 10);
        await User.create({ username: "tesztuser", password: hash, role: "user" });
        console.log("Teszt felhasználó létrehozva: tesztuser / user123");
    }

    
    const msgCount = await Message.countDocuments();
    if (msgCount === 0) {
        await Message.create({
            name: "Kovács Anna",
            email: "anna.kovacs@example.hu",
            subject: "Érdeklődés a műsorról",
            text: "Üdvözlöm! Szeretném megkérdezni, hogy a Művész moziban mikor frissül a jövő heti műsor?"
        });
        console.log("Minta üzenet létrehozva.");
    }

    console.log("Adatbázis feltöltés befejezve!");
    process.exit(0);
};

seed().catch((err) => {
    console.error("Hiba a feltöltés során:", err);
    process.exit(1);
});

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Film = require("../models/Film");
const Mozi = require("../models/Mozi");
const Hely = require("../models/Hely");
const Message = require("../models/Message");


exports.homeIndex = async (req, res) => {
    try {
        const [filmCount, moziCount, helyCount, featuredFilms] = await Promise.all([
            Film.countDocuments(),
            Mozi.countDocuments(),
            Hely.countDocuments(),
            Film.find().sort({ hossz: -1 }).limit(6).lean()
        ]);
        res.render("home", {
            stats: { filmCount, moziCount, helyCount },
            featuredFilms
        });
    } catch (err) {
        console.error(err);
        res.render("home", {
            stats: { filmCount: 0, moziCount: 0, helyCount: 0 },
            featuredFilms: []
        });
    }
};


exports.adatbazisIndex = async (req, res) => {
    try {
        const { q = "", mufaj = "", mozi = "" } = req.query;

        const [filmek, mozik, helyek] = await Promise.all([
            Film.find().sort({ fkod: 1 }).lean(),
            Mozi.find().sort({ mozinev: 1 }).lean(),
            Hely.find().lean()
        ]);

        const moziMap = new Map(mozik.map((m) => [m.moziazon, m]));
        const filmMozikMap = new Map();

        helyek.forEach((h) => {
            const mObj = moziMap.get(h.moziazon);
            if (mObj) {
                if (!filmMozikMap.has(h.fkod)) filmMozikMap.set(h.fkod, []);
                filmMozikMap.get(h.fkod).push(mObj);
            }
        });

        
        const mufajok = [...new Set(filmek.map((f) => f.mufaj).filter(Boolean))].sort((a, b) =>
            a.localeCompare(b, "hu")
        );

       
        let musor = filmek.map((f) => ({
            ...f,
            mozik: filmMozikMap.get(f.fkod) || []
        }));

        if (q.trim()) {
            const term = q.trim().toLowerCase();
            musor = musor.filter(
                (f) =>
                    f.filmcim.toLowerCase().includes(term) ||
                    f.szarmazas.toLowerCase().includes(term)
            );
        }
        if (mufaj) {
            musor = musor.filter((f) => f.mufaj === mufaj);
        }
        if (mozi) {
            const moziId = Number(mozi);
            musor = musor.filter((f) => f.mozik.some((m) => m.moziazon === moziId));
        }

        res.render("adatbazis", {
            musor,
            mozik,
            mufajok,
            filters: { q, mufaj, mozi }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Hiba az adatbázis lekérdezésekor.");
    }
};


exports.kapcsolatGet = (req, res) => {
    res.render("kapcsolat", { errors: [], formData: {} });
};

exports.kapcsolatPost = async (req, res) => {
    const { name = "", email = "", subject = "", text = "" } = req.body;
    const errors = [];

    if (name.trim().length < 3) {
        errors.push("A név megadása kötelező (legalább 3 karakter).");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        errors.push("Kérjük, adjon meg egy érvényes e-mail címet.");
    }
    if (subject.trim().length < 3) {
        errors.push("A tárgy megadása kötelező (legalább 3 karakter).");
    }
    if (text.trim().length < 10) {
        errors.push("Az üzenet szövege legalább 10 karakter hosszú legyen.");
    }

    if (errors.length > 0) {
        return res.status(400).render("kapcsolat", {
            errors,
            formData: { name, email, subject, text }
        });
    }

    try {
        await Message.create({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            text: text.trim()
        });
        req.session.message = "Köszönjük! Üzenetét sikeresen rögzítettük az adatbázisban.";
        req.session.messageType = "success";
        res.redirect("/kapcsolat");
    } catch (err) {
        console.error(err);
        res.status(500).render("kapcsolat", {
            errors: ["Váratlan hiba történt az üzenet mentésekor."],
            formData: { name, email, subject, text }
        });
    }
};


exports.uzenetekIndex = async (req, res) => {
    try {
        const messages = await Message.find().sort({ createdAt: -1 }).lean();
        res.render("uzenetek", { messages });
    } catch (err) {
        console.error(err);
        res.status(500).send("Hiba az üzenetek betöltésekor.");
    }
};


exports.diagramIndex = async (req, res) => {
    try {
        
        const genreAgg = await Film.aggregate([
            { $group: { _id: "$mufaj", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        
        const [mozik, helyAgg] = await Promise.all([
            Mozi.find().lean(),
            Hely.aggregate([
                { $group: { _id: "$moziazon", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        const moziMap = new Map(mozik.map((m) => [m.moziazon, m.mozinev]));
        const topCinemas = helyAgg.map((h) => ({
            label: moziMap.get(h._id) || `Mozi #${h._id}`,
            count: h.count
        }));

        res.render("diagram", {
            genreData: {
                labels: genreAgg.map((g) => g._id || "Ismeretlen"),
                counts: genreAgg.map((g) => g.count)
            },
            cinemaData: {
                labels: topCinemas.map((c) => c.label),
                counts: topCinemas.map((c) => c.count)
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Hiba a diagram adatainak lekérdezésekor.");
    }
};


exports.userIndex = (req, res) => {
    res.render("user");
};

exports.adminIndex = (req, res) => {
    res.render("admin");
};

exports.registerGet = (req, res) => {
    res.render("register");
};

exports.registerPost = async (req, res) => {
    const username = (req.body.username || "").trim();
    const password = req.body.password || "";

    if (username.length < 3 || password.length < 4) {
        req.session.message = "A felhasználónév legalább 3, a jelszó legalább 4 karakter legyen!";
        req.session.messageType = "error";
        return res.redirect("/register");
    }

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            req.session.message = "Ez a felhasználónév már foglalt!";
            req.session.messageType = "error";
            return res.redirect("/register");
        }
        const hash = await bcrypt.hash(password, 10);
        await User.create({ username, password: hash, role: "user" });
        req.session.message = "Sikeres regisztráció! Most már bejelentkezhet.";
        req.session.messageType = "success";
        res.redirect("/login");
    } catch (err) {
        console.error(err);
        req.session.message = "Hiba történt a regisztráció során.";
        req.session.messageType = "error";
        res.redirect("/register");
    }
};

exports.loginGet = (req, res) => {
    res.render("login");
};

exports.loginPost = async (req, res) => {
    const username = (req.body.username || "").trim();
    const password = req.body.password || "";

    try {
        const user = await User.findOne({ username });
        if (!user) {
            req.session.message = "Hibás felhasználónév vagy jelszó!";
            req.session.messageType = "error";
            return res.redirect("/login");
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            req.session.message = "Hibás felhasználónév vagy jelszó!";
            req.session.messageType = "error";
            return res.redirect("/login");
        }
        req.session.user = { id: user._id, username: user.username, role: user.role };
        req.session.message = `Üdvözöljük, ${user.username}!`;
        req.session.messageType = "success";

        if (user.role === "admin") {
            res.redirect("/crud");
        } else {
            res.redirect("/uzenetek");
        }
    } catch (err) {
        console.error(err);
        req.session.message = "Bejelentkezési hiba történt.";
        req.session.messageType = "error";
        res.redirect("/login");
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
};


exports.crudIndex = async (req, res) => {
    try {
        const filmek = await Film.find().sort({ fkod: -1 }).lean();
        res.render("crud", { filmek });
    } catch (err) {
        console.error(err);
        res.status(500).send("Hiba a filmek listázásakor.");
    }
};

exports.crudNewGet = async (req, res) => {
    const lastFilm = await Film.findOne().sort({ fkod: -1 }).lean();
    const nextFkod = lastFilm ? lastFilm.fkod + 1 : 1;
    res.render("crud_form", {
        mode: "create",
        film: { fkod: nextFkod, filmcim: "", szines: true, szinkron: "mb", szarmazas: "", mufaj: "", hossz: 90 },
        errors: []
    });
};

exports.crudNewPost = async (req, res) => {
    const { fkod, filmcim, szines, szinkron, szarmazas, mufaj, hossz } = req.body;
    const errors = [];

    if (!fkod || isNaN(Number(fkod))) errors.push("Érvényes film kód megadása kötelező.");
    if (!filmcim || filmcim.trim().length < 1) errors.push("A film címe kötelező.");
    if (!hossz || isNaN(Number(hossz)) || Number(hossz) < 1) errors.push("A vetítési idő pozitív szám legyen.");

    const filmData = {
        fkod: Number(fkod),
        filmcim: (filmcim || "").trim(),
        szines: szines === "on" || szines === "true",
        szinkron: (szinkron || "").trim(),
        szarmazas: (szarmazas || "").trim(),
        mufaj: (mufaj || "").trim() || "Ismeretlen",
        hossz: Number(hossz)
    };

    if (errors.length > 0) {
        return res.status(400).render("crud_form", { mode: "create", film: filmData, errors });
    }

    try {
        const exists = await Film.findOne({ fkod: filmData.fkod });
        if (exists) {
            return res.status(400).render("crud_form", {
                mode: "create",
                film: filmData,
                errors: ["Ez a film kód (fkod) már létezik az adatbázisban!"]
            });
        }
        await Film.create(filmData);
        req.session.message = `"${filmData.filmcim}" sikeresen hozzáadva!`;
        req.session.messageType = "success";
        res.redirect("/crud");
    } catch (err) {
        console.error(err);
        res.status(500).render("crud_form", {
            mode: "create",
            film: filmData,
            errors: ["Hiba történt a mentés során."]
        });
    }
};

exports.crudEditGet = async (req, res) => {
    try {
        const film = await Film.findById(req.params.id).lean();
        if (!film) {
            req.session.message = "A keresett film nem található.";
            req.session.messageType = "error";
            return res.redirect("/crud");
        }
        res.render("crud_form", { mode: "edit", film, errors: [] });
    } catch (err) {
        res.redirect("/crud");
    }
};

exports.crudEditPost = async (req, res) => {
    const { filmcim, szines, szinkron, szarmazas, mufaj, hossz } = req.body;
    const errors = [];

    if (!filmcim || filmcim.trim().length < 1) errors.push("A film címe kötelező.");
    if (!hossz || isNaN(Number(hossz)) || Number(hossz) < 1) errors.push("A vetítési idő pozitív szám legyen.");

    const updated = {
        filmcim: (filmcim || "").trim(),
        szines: szines === "on" || szines === "true",
        szinkron: (szinkron || "").trim(),
        szarmazas: (szarmazas || "").trim(),
        mufaj: (mufaj || "").trim() || "Ismeretlen",
        hossz: Number(hossz)
    };

    if (errors.length > 0) {
        const film = await Film.findById(req.params.id).lean();
        return res.status(400).render("crud_form", {
            mode: "edit",
            film: { ...film, ...updated },
            errors
        });
    }

    try {
        await Film.findByIdAndUpdate(req.params.id, updated);
        req.session.message = `"${updated.filmcim}" sikeresen módosítva!`;
        req.session.messageType = "success";
        res.redirect("/crud");
    } catch (err) {
        console.error(err);
        req.session.message = "Hiba történt a módosítás során.";
        req.session.messageType = "error";
        res.redirect("/crud");
    }
};

exports.crudDeletePost = async (req, res) => {
    try {
        const film = await Film.findByIdAndDelete(req.params.id);
        if (film) {
            await Hely.deleteMany({ fkod: film.fkod });
            req.session.message = `"${film.filmcim}" törölve az adatbázisból.`;
            req.session.messageType = "success";
        }
        res.redirect("/crud");
    } catch (err) {
        console.error(err);
        req.session.message = "Hiba történt a törlés során.";
        req.session.messageType = "error";
        res.redirect("/crud");
    }
};

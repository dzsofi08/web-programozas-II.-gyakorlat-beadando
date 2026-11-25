require("dotenv").config();
const express = require("express");
const session = require("express-session");
const path = require("path");
const connectMongo = require("connect-mongo");
const MongoStore = connectMongo.MongoStore || connectMongo.default || connectMongo;
const connectDB = require("./config/db");

const app = express();


connectDB();


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));


app.use(session({
    secret: process.env.SESSION_SECRET || "mozimusorTitkosKulcs2026",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.SESSION_MONGO_URI || process.env.MONGO_URI,
        collectionName: "sessions"
    })
}));


app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    res.locals.message = req.session.message || "";
    res.locals.messageType = req.session.messageType || "info";
    res.locals.currentPath = req.path;
    req.session.message = "";
    req.session.messageType = "info";
    next();
});


app.use("/", require("./routes/mainRouter"));


app.use((req, res) => {
    res.status(404).render("home", {
        stats: { filmCount: 0, moziCount: 0, helyCount: 0 },
        featuredFilms: []
    });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Szerver fut: http://localhost:${port}`);
});

const router = require("express").Router();
const controller = require("../controllers/mainController");

const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        return next();
    }
    req.session.message = "Az oldal megtekintéséhez bejelentkezés szükséges!";
    req.session.messageType = "error";
    res.redirect("/login");
};

const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === "admin") {
        return next();
    }
    req.session.message = "Hozzáférés megtagadva! Ez az oldal csak adminisztrátorok számára érhető el.";
    req.session.messageType = "error";
    res.redirect("/");
};


router.get("/", controller.homeIndex);
router.get("/adatbazis", controller.adatbazisIndex);
router.get("/kapcsolat", controller.kapcsolatGet);
router.post("/kapcsolat", controller.kapcsolatPost);
router.get("/diagram", controller.diagramIndex);


router.get("/register", controller.registerGet);
router.post("/register", controller.registerPost);
router.get("/login", controller.loginGet);
router.post("/login", controller.loginPost);
router.get("/logout", controller.logout);


router.get("/user", isLoggedIn, controller.userIndex);
router.get("/uzenetek", isLoggedIn, controller.uzenetekIndex);


router.get("/admin", isAdmin, controller.adminIndex);
router.get("/crud", isAdmin, controller.crudIndex);
router.get("/crud/new", isAdmin, controller.crudNewGet);
router.post("/crud/new", isAdmin, controller.crudNewPost);
router.get("/crud/edit/:id", isAdmin, controller.crudEditGet);
router.post("/crud/edit/:id", isAdmin, controller.crudEditPost);
router.post("/crud/delete/:id", isAdmin, controller.crudDeletePost);

module.exports = router;

// error codes from db module
const dbErrors = {
    codes: ["signatures_e_mail_key", "signatures_image_check", "auth_error"],
    msgs: [
        "E-mail already in use!",
        "Please click and drag in the box to sign.",
        "Invalid e-mail/password combination.",
    ],
};

const express = require("express");
const db = require("./db");
const bc = require("./bc");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const csurf = require("csurf");

const app = express();

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(
    express.urlencoded({
        extended: false,
    })
); // url encode

app.use(express.static("./public"));

app.use(
    cookieSession({
        secret: "This is my closest guarded secret.",
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
); // cookie-session init

app.use(csurf());
app.use((req, res, next) => {
    res.set("x-frame-options", "deny");
    res.locals.csrfToken = req.csrfToken();
    res.locals.userId = req.session.userId;
    res.locals.signatureId = req.session.signatureId;
    next();
}); // csurf init + setting session cookies

app.get("/", (req, res) => {
    console.log("---------- getting / ----------");
    console.log("req.query:", req.query);

    res.render("landing", {
        landing: true,
        error: dbErrors.msgs[decodeURI(req.query.error)] || undefined,
    });

    console.log("------------ got / ------------");
});

app.post("/login", (req, res) => {
    console.log("----- posting /login -----");

    let backURL = req.header("Referer").split("?")[0] || "/";
    console.log("backURL:", backURL);

    bc.hash(req.body.password)
        .then((hashed) =>
            db.authenticateUser({ email: req.body.email, password: hashed })
        )
        .then((result) => {
            req.session.userId = result.id;
            res.redirect(backURL);
        })
        .catch((err) => handleDbErrors(err, res, backURL));

    console.log("----- done posting /login -----");
});

app.get("/registration", (req, res) => {
    console.log("---------- getting /registration ----------");
    res.render("registration", {
        error: dbErrors.msgs[decodeURI(req.query.error)] || undefined,
    });
    console.log("------------ got /registration ------------");
});

app.get("/petition", (req, res) => {
    if (req.session.signatureId) {
        res.redirect("/thanks");
    } else {
        res.render("petition", {
            error: req.query.error,
        });
    }
});

app.post("/petition", (req, res) => {
    db.addSignature(req.body)
        .then((result) => {
            req.session.signatureId = result.id;
            res.redirect("/thanks");
        })
        .catch((err) => handleDbErrors(err, res, "/petition"));
});

app.get("/thanks", (req, res) => {
    db.getSignature(req.session.signatureId)
        .then((result) => {
            res.render("thanks", { title: "thx!!", imgData: result.image });
        })
        .catch((err) => {
            res.status(500).send(`${err.name}: ${err.message}`);
            console.error(err);
        });
});

app.get("/clear", (req, res) => {
    req.session = null;
    res.redirect("/");
});

app.get("/set", (req, res) => {
    req.session.signatureId = 3;
    res.redirect("/");
});

app.listen(8080, () => console.log("listening..."));

function handleDbErrors(err, res, destination = "/") {
    let code = err.constraint || err.message;

    let index = dbErrors.codes.indexOf(code);
    if (index > -1) {
        res.redirect(`${destination}?error=${encodeURI(index)}`);
    } else {
        res.status(500).send(`${err.name}: ${err.message}`);
        console.error(err);
    }
}

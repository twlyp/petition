const express = require("express");
const db = require("./db");
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
);

app.use(express.static("./public"));

app.use(
    cookieSession({
        secret: "This is my closest guarded secret.",
        maxAge: 1000 * 60 * 60 * 24 * 14,
    })
);

app.use(csurf());
app.use((req, res, next) => {
    res.set("x-frame-options", "deny");
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.get("/", (req, res) => {
    res.render("home");
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

// errors when invalid data is submitted
const formErrors = {
    codes: ["signatures_e_mail_key", "signatures_image_check"],
    msgs: [
        "E-mail already in use!",
        "Please click and drag in the box to sign.",
    ],
};

app.post("/petition", (req, res) => {
    db.addSignature(req.body)
        .then((result) => {
            req.session.signatureId = result.id;
            res.redirect("/thanks");
        })
        .catch((err) => {
            let index = formErrors.codes.indexOf(err.constraint);
            if (index > -1) {
                res.redirect(`/petition?error=${formErrors.msgs[index]}`);
            } else {
                res.status(500).send(`${err.name}: ${err.message}`);
                console.error(err);
            }
        });
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

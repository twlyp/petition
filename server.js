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
const morgan = require("morgan");
const db = require("./db");

const bc = require("./bc");
// returns the "body" object with password changed to its hash
const hashPsw = (body) =>
    bc
        .hash(body.password)
        .then((hashed) =>
            Object.defineProperty(body, "password", { value: hashed })
        );

const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const csurf = require("csurf");

const app = express();

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

app.use(morgan("tiny"));

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
    res.locals.userFirst = req.session.userFirst;
    // if there's an error set the error message then clear the cookie
    res.locals.error = req.session.errorCode
        ? dbErrors.msgs[req.session.errorCode]
        : undefined;
    req.session.errorCode = null;

    next();
}); // csurf init + setting session cookies

app.get("/", (req, res) => {
    // console.log("req.session.errorCode:", req.session.errorCode);
    // console.log("res.locals.error:", res.locals.error);
    // console.log("req.session.userId:", req.session.userId);
    // console.log("res.locals.userId:", res.locals.userId);
    // console.log("res.locals.signatureId:", res.locals.signatureId);

    res.render("landing", {
        landing: true,
    });
});

app.route("/login").post(async function (req, res, next) {
    let backURL = req.header("Referer") || "/";
    let dbUser = await db.getUser("email", req.body.email);
    let match =
        dbUser.length === 1
            ? bc.compare(req.body.password, dbUser[0].password)
            : null;
    if (match) {
        req.session.userId = dbUser[0].id;
        req.session.userFirst = dbUser[0].first;
        res.redirect(backURL);
    } else {
        req.session.errorCode = 2;
        res.redirect(backURL);
    }
});

app.route("/registration")
    .get((req, res) => {
        if (req.session.userId) return res.redirect("/petition");
        res.render("registration");
    })
    .post((req, res) =>
        hashPsw(req.body)
            .then((hashedBody) => db.addUser(hashedBody))
            .then((result) => {
                req.session.userId = result.id;
                req.session.userFirst = result.first;
                res.redirect("/moreinfo");
            })
    );

app.route("/moreinfo")
    .get(isLoggedIn, (req, res) => res.render("moreinfo"))
    .post(isLoggedIn, (req, res) => {
        const httpMask = /^https?:\/\//;
        req.body.url = req.body.url.trim();
        // if it doesn't start with http(s):// add it
        req.body.url =
            `${httpMask.test(req.body.url) ? "" : "http://"}` + req.body.url;

        return db
            .addInfo(req.session.userId, req.body)
            .then(() => res.redirect("/petition"));
    });

app.route("/petition")
    .get(isLoggedIn, (req, res) => {
        if (req.session.hasSigned) {
            res.redirect("/thanks");
        } else {
            res.render("petition");
        }
    })
    .post(isLoggedIn, (req, res) => {
        db.addSignature({
            userId: req.session.userId,
            signature: req.body.signature,
        }).then(() => {
            req.session.hasSigned = true;
            res.redirect("/thanks");
        });
    });

app.route("/signers/:city?").get((req, res) =>
    db
        .listSignatures(req.params.city)
        .then((result) => res.render("signers", { rows: result }))
);

app.route("/thanks").get(isLoggedIn, (req, res) =>
    db.getSignature(req.session.userId).then((result) => {
        if (result.length === 0 || !result[0].signature) {
            req.session.hasSigned = null;
            return res.redirect("/petition");
        }
        req.session.hasSigned = true;
        return res.render("thanks", { imgData: result[0].signature });
    })
);

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/");
});

app.use((err, req, res, next) => {
    console.log("i caught the error");
    console.log(err);
    //next(err);

    let backURL = req.header("Referer") || "/";

    let code = err.constraint || err.message;

    let index = dbErrors.codes.indexOf(code);
    if (index > -1) {
        req.session.errorCode = index;
        res.redirect(backURL);
    } else {
        res.status(500).send(`${err.name}: ${err.message}`);
    }
});

app.listen(8080, () => console.log("listening..."));

function isLoggedIn(req, res, next) {
    if (req.session.userId) return next();
    res.redirect("back");
}

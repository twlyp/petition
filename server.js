// ================================ ERROR HELPERS ================================ //
const ERRORS = (exports.ERRORS = {
    auth_error: "Invalid e-mail/password combination.",
    reg_error: "I couldn't register this user.",
    sig_error: "I couldn't find your signature.",
    user_notfound: "I couldn't find your user profile.",
});

const parseDbErrors = (exports.parseDbErrors = function (string) {
    const COLS = {
        first: "first name",
        last: "last name",
        email: "e-mail address",
        password: "password",
        signature: "signature",
        user_id: "user ID",
        age: "age",
        city: "city",
        url: "home page",
    };

    let segments = string.split("_");
    const table = segments.shift();
    const constraintType = segments.pop();
    const column = segments.join("_");

    if (table == "signatures" && constraintType == "key")
        return "You already signed the petition!";
    if (constraintType == "key") return `This ${COLS[column]} already exists.`;
    if (constraintType == "check")
        return `Please input a valid ${COLS[column]}.`;
});

// ================================ REQUIRES ================================ //
const express = require("express");
// const morgan = require("morgan");
const db = require("./db");

const bc = require("./bc");
const hb = require("express-handlebars");
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const redis = require("./redis");

// ================================ INIT ================================ //
const app = (exports.app = express());

app.engine("handlebars", hb());
app.set("view engine", "handlebars");

// app.use(morgan("tiny"));

app.use(
    express.urlencoded({
        extended: false,
    })
); // url encode

app.use(express.static("./public"));

app.use(
    cookieSession({
        secret: process.env.SESSION_SECRET || "whatever",
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
    res.locals.error = req.session.errorMsg;

    next();
}); // csurf init + setting session cookies

// ================================ ROUTES ================================ //
app.get("/", (req, res) => res.render("landing"));

app.route("/login")
    .get(ifLoggedIn("/petition"), (req, res) => res.render("login"))
    .post(ifLoggedIn("/petition"), async function (req, res, next) {
        try {
            const queryUser = await db.getUserBy("email", req.body.email);
            const match =
                queryUser.length === 1
                    ? await bc.compare(req.body.password, queryUser[0].password)
                    : null;
            if (!match) {
                req.session.errorMsg = ERRORS.auth_error;
            } else {
                req.session.userId = queryUser[0].id;
                req.session.userFirst = queryUser[0].first;
                const querySignature = await db.getSignatureId(
                    req.session.userId
                );
                req.session.signatureId =
                    querySignature.length === 1 ? querySignature[0].id : null;
            }
            return res.redirect("/petition");
        } catch (e) {
            next(e);
        }
    });

app.route("/registration")
    .get(ifLoggedIn("/petition"), (req, res) => res.render("registration"))
    .post(ifLoggedIn("/petition"), async function (req, res, next) {
        try {
            req.body.password = await bc.hash(req.body.password);
            let queryUser = await db.addUser(req.body);
            if (queryUser.length != 1) {
                req.session.errorMsg = ERRORS.reg_error;
                return res.redirect("/registration");
            }
            req.session.userId = queryUser[0].id;
            req.session.userFirst = queryUser[0].first;
            return res.redirect("/moreinfo");
        } catch (e) {
            if (/Illegal\sarguments/.test(e.message))
                next({ constraint: "users_password_check" });
            next(e);
        }
    });

app.route("/moreinfo")
    .get(ifLoggedOut("/registration"), (req, res) => res.render("moreinfo"))
    .post(ifLoggedOut("/registration"), (req, res) => {
        let promises = [];

        const httpMask = /^https?:\/\//;
        if (req.body.url) {
            req.body.url = req.body.url.trim();
            // if it doesn't start with http(s):// add it
            req.body.url =
                `${httpMask.test(req.body.url) ? "" : "http://"}` +
                req.body.url;
            promises.push(
                db.addToProfile(req.session.userId, "url", req.body.url)
            );
        }

        const COLS = ["age", "city"];
        COLS.forEach((el) =>
            req.body[el]
                ? promises.push(
                      db.addToProfile(req.session.userId, el, req.body[el])
                  )
                : undefined
        );

        return Promise.all(promises).then(() => res.redirect("/petition"));
    });

app.route("/petition")
    .get(ifLoggedOut("/registration"), ifHasSigned("/thanks"), (req, res) =>
        res.render("petition")
    )
    .post(
        ifLoggedOut("/registration"),
        ifHasSigned("/thanks"),
        async function (req, res, next) {
            try {
                const querySignature = await db.addSignature({
                    userId: req.session.userId,
                    signature: req.body.signature,
                });
                if (querySignature.length != 1) {
                    req.session.errorMsg = ERRORS.sig_error;
                    return res.redirect("/petition");
                }
                req.session.signatureId = querySignature[0].id;
                redis.del("signatures");
                return res.redirect("/thanks");
            } catch (e) {
                next(e);
            }
        }
    );

app.route("/signers/:city?").get(
    ifLoggedOut("/registration"),
    ifNotSigned("/petition"),
    async function (req, res, next) {
        try {
            const cached = await redis.get("signatures");
            const parsed = JSON.parse(cached) || {};
            if (cached && parsed.byCity == req.params.city)
                return res.render("signers", parsed);
            const signaturesQuery = await db.listSignatures(req.params.city);
            const parameters = {
                rows: signaturesQuery,
                byCity: req.params.city,
            };
            redis.set("signatures", JSON.stringify(parameters));
            return res.render("signers", parameters);
        } catch (e) {
            next(e);
        }
    }
);

app.route("/thanks").get(
    ifLoggedOut("/registration"),
    ifNotSigned("/petition"),
    async function (req, res, next) {
        try {
            const querySignature = await db.getSignature(req.session.userId);
            if (querySignature.length != 1) {
                req.session.signatureId = null;
                req.session.errorMsg = ERRORS.sig_error;
                return res.redirect("/petition");
            }
            return res.render("thanks", {
                imgData: querySignature[0].signature,
            });
        } catch (e) {
            next(e);
        }
    }
);

app.route("/edit")
    .get(ifLoggedOut("/registration"), async function (req, res, next) {
        try {
            let queryUserData = await db.getData(req.session.userId);
            if (queryUserData.length != 1) {
                req.session = null;
                req.session.errorMsg = ERRORS.user_notfound;
                return res.redirect("/registration");
            }
            return res.render("edit", { data: queryUserData[0] });
        } catch (e) {
            next(e);
        }
    })
    .post(ifLoggedOut("/registration"), (req, res) => {
        const destructurer = ({ first, last, email, age, city, url }) => [
            { first, last, email },
            { age, city, url },
        ];
        const destructuredBody = destructurer(req.body);

        let updatePassword = req.body.password
            ? bc
                  .hash(req.body.password)
                  .then((hashed) =>
                      db.updatePassword(req.session.userId, hashed)
                  )
            : Promise.resolve();
        let updateUserData = db.updateUserData(
            req.session.userId,
            destructuredBody[0]
        );
        let updateProfileData = db.addInfo(
            req.session.userId,
            destructuredBody[1]
        );

        return Promise.all([updatePassword, updateUserData, updateProfileData])
            .then(() => redis.del("signatures"))
            .then(() => res.redirect("/signers"));
    });

app.route("/delete/:what").post(ifLoggedOut("/registration"), (req, res) => {
    if (req.params.what == "signature")
        return db.deleteSignature(req.session.userId).then(() => {
            req.session.signatureId = null;
            res.redirect("/petition");
        });
    if (req.params.what == "user")
        return db.deleteUser(req.session.userId).then(() => {
            req.session = null;
            res.redirect("/registration");
        });
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/");
});

app.post("/clearerror", (req, res) => {
    req.session.errorMsg = null;
    res.redirect("back");
});

app.use((err, req, res, next) => {
    if (err.constraint) {
        req.session.errorMsg = parseDbErrors(err.constraint);
        return res.redirect("back");
    }

    return res.status(500).send(`${err.name}: ${err.stack}`);
});

if (require.main == module) {
    app.listen(process.env.PORT || 8080);
}

// ================================ MIDDLEWARE ================================ //

function ifLoggedOut(destination = "/registration") {
    return (req, res, next) =>
        req.session.userId ? next() : res.redirect(destination);
}

function ifLoggedIn(destination = "/petition") {
    return (req, res, next) =>
        req.session.userId ? res.redirect(destination) : next();
}

function ifNotSigned(destination = "/petition") {
    return (req, res, next) =>
        req.session.signatureId ? next() : res.redirect(destination);
}

function ifHasSigned(destination = "/thanks") {
    return (req, res, next) =>
        req.session.signatureId ? res.redirect(destination) : next();
}

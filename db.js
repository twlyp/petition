const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:leo@localhost/petition");

module.exports.listUsers = () =>
    db.query("SELECT * FROM users").then((result) => result.rows);
module.exports.listSignatures = () =>
    db.query("SELECT * FROM signatures").then((result) => result.rows);

module.exports.addUser = ({ first, last, email, password }) =>
    db
        .query(
            "INSERT INTO users (first, last, email, password) " +
                "VALUES ($1, $2, $3, $4) " +
                "RETURNING id",
            [first, last, email, password]
        )
        .then((result) => result.rows[0]);

module.exports.authenticateUser = ({ email, password }) =>
    db
        .query("SELECT id FROM users WHERE email = $1 AND password = $2", [
            email,
            password,
        ])
        .then((result) => result.row[0])
        .catch((err) => {
            if (err instanceof TypeError) {
                throw new Error("auth_error");
            } else {
                throw err;
            }
        });

module.exports.addSignature = ({ userId, signature }) =>
    db
        .query(
            "INSERT INTO signatures (user_id, signature) " +
                "VALUES ($1, $2) " +
                "RETURNING id",
            [userId, signature]
        )
        .then((result) => result.rows[0]);

module.exports.getSignature = (id) =>
    db
        .query("SELECT signature FROM signatures WHERE id = $1", [id])
        .then((result) => result.rows[0]);

module.exports.getSignatureId = (userId) =>
    db
        .query("SELECT id FROM signatures WHERE user_id = $1", [userId])
        .then((result) => result.rows[0]);

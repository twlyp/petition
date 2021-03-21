const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:leo@localhost/petition");

module.exports.listUsers = () =>
    db.query("SELECT * FROM users").then((result) => result.rows);

module.exports.listSignatures = (city) => {
    let queryString =
        "SELECT users.first, users.last, " +
        "user_profiles.age, user_profiles.city, user_profiles.url " +
        "FROM users " +
        "INNER JOIN signatures ON users.id = signatures.user_id " +
        "LEFT OUTER JOIN user_profiles ON users.id = user_profiles.user_id ";
    if (city) queryString += "WHERE user_profiles.city = $1";

    return db
        .query(queryString, city ? [city] : null)
        .then((result) => result.rows);
};

module.exports.addUser = ({ first, last, email, password }) =>
    db
        .query(
            "INSERT INTO users (first, last, email, password) " +
                "VALUES ($1, $2, $3, $4) " +
                "RETURNING id, first",
            [first, last, email, password]
        )
        .then((result) => result.rows);

module.exports.deleteUser = (userId) =>
    Promise.all(
        db.query("DELETE FROM signatures WHERE user_id = $1", [userId]),
        db.query("DELETE FROM user_profiles WHERE user_id = $1", [userId])
    ).then(db.query("DELETE FROM users WHERE user_id = $1", [userId]));

module.exports.updateUserData = (userId, { first, last, email }) =>
    db.query(
        "UPDATE users SET (first, last, email) = ($2, $3, $4) WHERE id = $1",
        [userId, first, last, email]
    );

module.exports.getUserBy = (parameter, value) => {
    return db
        .query(`SELECT * FROM users WHERE ${parameter} = $1`, [value])
        .then((result) => result.rows);
};

module.exports.getPassword = (email) =>
    db
        .query("SELECT password FROM users WHERE email = $1", [email])
        .then((result) => result.rows);

module.exports.addSignature = ({ userId, signature }) =>
    db
        .query(
            "INSERT INTO signatures (user_id, signature) " +
                "VALUES ($1, $2) " +
                "RETURNING id",
            [userId, signature]
        )
        .then((result) => result.rows);

module.exports.getSignatureId = (userId) =>
    db
        .query("SELECT id FROM signatures WHERE user_id = $1", [userId])
        .then((result) => result.rows);

module.exports.getSignature = (userId) =>
    db
        .query("SELECT signature FROM signatures WHERE user_id = $1", [userId])
        .then((result) => result.rows);

module.exports.deleteSignature = (userId) =>
    db.query("DELETE FROM signatures WHERE user_id = $1", [userId]);

module.exports.addInfo = (userId, { age, city, url }) =>
    db.query(
        "INSERT INTO user_profiles (user_id, age, city, url) " +
            "VALUES ($1, $2, $3, $4) " +
            "ON CONFLICT (user_id) " +
            "DO UPDATE SET (age, city, url) = ($2, $3, $4)",
        [userId, age, city, url]
    );

module.exports.getData = (userId) =>
    db
        .query(
            "SELECT users.first, users.last, users.email, " +
                "user_profiles.age, user_profiles.city, user_profiles.url " +
                "FROM users " +
                "LEFT OUTER JOIN user_profiles ON users.id = user_profiles.user_id " +
                "WHERE users.id = $1",
            [userId]
        )
        .then((result) => result.rows);

module.exports.updatePassword = (userId, password) =>
    db.query("UPDATE users SET password = $2 WHERE id = $1", [
        userId,
        password,
    ]);

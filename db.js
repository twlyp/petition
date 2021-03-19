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
        .then((result) => result.rows[0]);

module.exports.getUser = (parameter, value) => {
    return db
        .query(`SELECT * FROM users WHERE ${parameter} = $1`, [value])
        .then((result) => result.rows);
};

module.exports.getPassword = (email) =>
    db
        .query("SELECT password FROM users WHERE email = $1", [email])
        .then((result) => result.rows);

module.exports.addSignature = ({ userId, signature }) =>
    db.query(
        "INSERT INTO signatures (user_id, signature) " + "VALUES ($1, $2) ",
        [userId, signature]
    );

module.exports.getSignatureId = (id) =>
    db
        .query("SELECT signature FROM signatures WHERE id = $1", [id])
        .then((result) => result.rows[0]);

module.exports.getSignature = (userId) =>
    db
        .query("SELECT signature FROM signatures WHERE user_id = $1", [userId])
        .then((result) => result.rows);

module.exports.addInfo = (userId, { age, city, www }) =>
    db.query(
        "INSERT INTO user_profiles (user_id, age, city, url) " +
            "VALUES ($1, $2, $3, $4) " +
            "ON CONFLICT (user_id) " +
            "DO UPDATE SET (age, city, url) = ($2, $3, $4)",
        [userId, age, city, www]
    );

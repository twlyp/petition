var spicedPg = require("spiced-pg");

const db = spicedPg("postgres:leo@localhost/petition");

// module.exports.getSignatures = () => db.query("SELECT * FROM signatures");
module.exports.addSignature = ({ firstName, lastName, image, eMail }) =>
    db
        .query(
            "INSERT INTO signatures (first_name, last_name, image, e_mail) " +
                "VALUES ($1, $2, $3, $4) " +
                "RETURNING id",
            [firstName, lastName, image, eMail]
        )
        .then((result) => result.rows[0]);
module.exports.getSignature = (id) =>
    db
        .query("SELECT image FROM signatures WHERE id = $1", [id])
        .then((result) => result.rows[0]);

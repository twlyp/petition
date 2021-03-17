const { TestScheduler } = require("jest");
const db = require("./db");

const testUser = {
    first: "Arturo",
    last: "Bini",
    email: "arturo@bini.it",
    password: "testpassword",
};

const randomString = (length = 8) => {
    return Math.random().toString(16).substr(2, length);
};

//db.listUsers().then(console.log);
//db.listSignatures().then(console.log);
// db.addUser({
//     first: randomString(),
//     last: randomString(),
//     email: randomString(),
//     password: randomString(),
// }).then(console.log);
//console.log(randomString());
// db.addUser(testUser)
//     .then(() => db.authenticateUser(testUser))
//     .then(console.log);
db.authenticateUser({ email: "", password: "" })
    .then(console.log)
    .catch((err) => console.log(err));

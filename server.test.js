const supertest = require("supertest");
const { app, ERRORS, parseDbErrors } = require("./server.js");
const cookieSession = require("cookie-session");
const e = require("express");
const request = supertest(app);

test("[logged out] petition redirects to registration", () => {
    cookieSession.mockSessionOnce({});
    return request
        .get("/petition")
        .expect(302)
        .expect("location", "/registration");
});

test("[logged in] (registration || login) redirects to petition", () => {
    cookieSession.mockSession({ userId: 1 });
    return Promise.all([
        request
            .get("/registration")
            .expect(302)
            .expect("location", "/petition"),
        request.get("/login").expect(302).expect("location", "/petition"),
    ]);
});

test("[logged in, signed] (petition || submit signature) redirects to thank you", () => {
    cookieSession.mockSession({ userId: 1, signatureId: 1 });
    return Promise.all([
        request.get("/petition").expect(302).expect("location", "/thanks"),
        request.post("/petition").expect(302).expect("location", "/thanks"),
    ]);
});

test("[logged in, not signed] (thanks | signers) redirects to petition", () => {
    cookieSession.mockSession({ userId: 1, signatureId: undefined });
    return Promise.all([
        request.get("/thanks").expect(302).expect("location", "/petition"),
        request.get("/signers").expect(302).expect("location", "/petition"),
    ]);
});

const testUser = {
    first: "Arturo",
    last: "Bini",
    email: "arturo@bini.it",
    password: "testpassword",
    age: 32,
    city: "berlin",
    url: "bini.it",
};

const stringifyData = (arr, user) => {
    let result = [];
    arr.forEach((el) => result.push(`${el}=${user[el]}`));

    return result.join("&");
};

// test("registration succeeds with good data", () => {
//     cookieSession.mockSession({});
//     return request
//         .post("/registration")
//         .send(stringifyData(["first", "last", "email", "password"], testUser))
//         .expect(302)
//         .expect("location", "/moreinfo")
//         .expect((res) => {
//             expect(res.body).not.toContain("error-overlay");
//         });
// });

test("registration fails with bad data", () => {
    cookieSession.mockSession({});
    return request.post("/registration").send("first=test").expect(302);
});

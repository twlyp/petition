const { TestScheduler } = require("jest");
const countries = require("./countries");

test("empty string returns empty array", () => {
    expect(countries.find("")).toStrictEqual([]);
});

test("returned array contains no more than four matches", () => {
    expect(countries.find("a").length).toBeLessThanOrEqual(4);
});
test("search is case-insensitive", () => {
    expect(countries.find("GErmaNY")).toStrictEqual(countries.find("gErMaNY"));
});
test("if there are no matching countries, empty array is returned", () => {
    expect(countries.find("arad doman")).toStrictEqual([]);
});

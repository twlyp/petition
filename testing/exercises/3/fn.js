module.exports = function fn(first) {
    const reverse = (str) =>
        typeof str === "string" ? str.split("").reverse().join("") : null;

    if (!Array.isArray(first)) {
        return reverse(first);
    } else {
        let result = [];
        first.forEach((el) => result.push(reverse(el)));
        return result;
    }
};

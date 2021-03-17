(function () {
    $("#error-btn").click(() => $("#error-overlay").remove());
    $("#signup").click(() => (window.location = "/registration"));
    $("#logout").click(() => (window.location = "/logout"));
})(); // iife

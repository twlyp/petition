(function () {
    $("#error-btn").click(() => $("#error-overlay").remove());
    $("#nav-signup").click(() => (window.location = "/registration"));
    $("#nav-logout").click(() => (window.location = "/logout"));
})(); // iife

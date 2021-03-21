(function () {
    const goSign = $("#go-sign");
    const tail = $('<div class="tail"/>').appendTo(goSign);

    goSign
        .on("pointerenter", () => {
            tail.addClass("wiggle");
        })
        .on("pointerleave", () => tail.removeClass("wiggle"))
        .on("click", (e) => {
            goSign.off("pointerleave");
            goSign.animate(
                {
                    top: "0",
                    left: "+=300",
                },
                1000,
                "linear",
                () => (window.location = "/petition")
            );
        });
})(); // iife

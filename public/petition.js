// (function () {
const canvas = $("#signature-canvas");
const imgData = $("#signature-img-data");
const ctx = canvas[0].getContext("2d");
ctx.lineWidth = 2;

let isTracking = false;
imgData.val("");

canvas
    .on("pointerdown", startTracking)
    .on("pointermove", trackMovement)
    .on("pointerup", stopTracking)
    .on("pointerleave", stopTracking);

function startTracking(e) {
    let coords = eventToCtx(e);
    imgData.val("");

    ctx.beginPath();
    ctx.moveTo(...coords);

    isTracking = true;
}

function trackMovement(e) {
    if (!isTracking) return;

    let coords = eventToCtx(e);
    ctx.lineTo(...coords);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(...coords);
}

function stopTracking(e) {
    let coords = eventToCtx(e);

    if (isTracking) {
        ctx.lineTo(...coords);
        ctx.stroke();

        imgData.val(canvas[0].toDataURL());
    }

    isTracking = false;
}

$("#reset").click(() => {
    ctx.clearRect(0, 0, canvas.width(), canvas.height());
    imgData.val("");
});
$("#submit").click((e) => {
    if (!imgData.val()) {
        e.preventDefault();
    }
});

function eventToCtx({ pageX: eX, pageY: eY, target }) {
    let offset = $(target).offset();
    return [eX - offset.left, eY - offset.top];
}
// })(); // iife

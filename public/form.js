const canvas = $("#signature-canvas");
const imgData = $("#signature-img-data");
const output = $("#signature-output");
const form = $("#signature-form");
const submitBtn = $('button[type="submit"]');
const ctx = canvas[0].getContext("2d");

let isTracking = false;
imgData.val("");
// setImgData(imgData, output, "");

canvas
    .on("pointerdown", startTracking)
    .on("pointermove", trackMovement)
    .on("pointerup", stopTracking)
    .on("pointerleave", stopTracking);

// form.on("submit", (e) => {
//     if (imgData.val) {
//         canvas.removeClass("invalid");
//         return true;
//     }
//     e.preventDefault();
//     canvas.addClass("invalid");
//     return false;
// });

function startTracking(e) {
    let coords = eventToCtx(e);
    imgData.val("");
    // setImgData(imgData, output, "");

    ctx.clearRect(0, 0, canvas.width(), canvas.height());
    ctx.beginPath();
    ctx.moveTo(...coords);

    isTracking = true;
}

function stopTracking(e) {
    let coords = eventToCtx(e);

    if (isTracking) {
        ctx.lineTo(...coords);
        ctx.stroke();
        // setImgData(imgData, output, canvas[0].toDataURL());

        imgData.val(canvas[0].toDataURL());
    }

    isTracking = false;
}

function trackMovement(e) {
    if (!isTracking) return;

    let coords = eventToCtx(e);
    ctx.lineTo(...coords);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(...coords);
}

function eventToCtx({ pageX: eX, pageY: eY, target }) {
    let offset = $(target).offset();
    return [eX - offset.left, eY - offset.top];
}

function setImgData(dataField, outputField, value) {
    dataField.val(value);
    outputField[0].setCustomValidity(
        value === "" ? "" : "Click and drag to draw your signature."
    );
}

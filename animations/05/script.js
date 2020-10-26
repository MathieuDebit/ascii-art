let canvas, context, ascii, mouseX, mouseY;
const width = window.innerWidth / 16;
const height = window.innerHeight / 16;
const charMap = ' @#%*+=-:.';
const newLine = '<br/>';

window.onload = init;

function init() {
    canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);

    context = canvas.getContext('2d');

    ascii = document.createElement('div');
    ascii.setAttribute('id', 'ascii');
    ascii.style.width = width * 8 + 'px';
    ascii.style.height = height * 8 + 'px';
    document.body.appendChild(ascii);

    document.body.onmousemove = mouseMove;

    loop();
}

function mouseMove(event) {
    mouseX = event.clientX;
    mouseY = event.clientY;
}

function loop(time) {
    renderCanvas(time);
    renderASCII();

    requestAnimationFrame(loop);
}

function renderCanvas(time) {
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.beginPath();
    context.arc(mouseX / 16, mouseY / 16, 5, 0, 2 * Math.PI);
    context.fillStyle = 'red';
    context.fill();

    context.rect((Math.cos(time / 500) + 1) * 10, 0, 20, 20);
    const gradient = context.createLinearGradient(0, 0, 20, 0);
    gradient.addColorStop(0, 'rgba(255, 0, 0, 1');
    gradient.addColorStop(0.9, 'rgba(255, 255, 255, 1');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0');
    context.fillStyle = gradient;
    context.fill();
}

function renderASCII() {
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let asciiPixels = '';

    for (let i = 0, l = data.length; i < l; i += 4) {
        asciiPixels += charMap[
            Math.round(
            (charMap.length - 1) * (0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2]) / 255
            )
        ];

        if (Math.ceil((i + 1) / 4) % canvas.width === 0) {
            asciiPixels += newLine;
        }
    }

    ascii.innerHTML = asciiPixels.replace(/ /g, "&nbsp;");
}
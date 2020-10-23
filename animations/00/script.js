const canvas = document.getElementById('canvas');
canvas.width = window.innerWidth / 8;
canvas.height = window.innerHeight / 8;

const output = document.getElementById('output');

window.onload = startup;

let mouseX = 0;
let mouseY = 0;

const NEWLINE = "<br/>";
const map = " @#%*+=-:. ";

function startup() {
    //`mousemove`, not `mouseover`
    canvas.onmousemove = mouseMove;

    loop();
}

//use `requestAnimationFrame` for the game loop
//so you stay sync with the browsers rendering
//makes it a smoother animation
function loop(){
    moveBall();
    requestAnimationFrame(loop);
}

function mouseMove(evt) {
    mouseX = evt.clientX;
    mouseY = evt.clientY;
}

function moveBall() {
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);

    context.beginPath();
    context.arc(mouseX / 8, mouseY / 8, 10, 0, 2 * Math.PI);
    const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 100);
    gradient.addColorStop(0, 'white');
    gradient.addColorStop(1, 'red');
    context.fillStyle = gradient;
    context.fill();

    let data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let asciiPixels = "";

    for (let i = 0, l = data.length; i < l; i += 4) { // do reds only, since it will be greyscaled
        asciiPixels += map[
            Math.round(
                (map.length - 1) * (0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2]) / 255
            )
            ];

        if (Math.ceil((i + 1) / 4) % canvas.width === 0) {
            asciiPixels += NEWLINE;
        }
    }

    output.innerHTML = asciiPixels.replace(/ /g, "&nbsp;");
}
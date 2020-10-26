import * as THREE from 'https://unpkg.com/three@0.121.1/build/three.module.js';

const width = window.innerWidth / 16;
const height = window.innerHeight / 16;

let stop = false;
let frameCount = 0;
let fps, fpsInterval, startTime2, now, then, elapsed;

let ascii, gl;
const newLine = '<br/>';

let camera, scene, renderer;
let uniforms;
let startTime;

init();

startAnimating(20);

function startAnimating(fps) {
    fpsInterval = 1000 / fps;
    then = Date.now();
    startTime2 = then;
    console.log(startTime2);
    animate();
}
animate();

function init() {
    ascii = document.createElement('div');
    ascii.setAttribute('id', 'ascii');
    ascii.style.width = width * 32 + 'px';
    ascii.style.height = height * 32 + 'px';
    document.body.appendChild(ascii);

    // Get A WebGL context
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);
    gl = canvas.getContext("webgl");

    renderer = new THREE.WebGLRenderer({ canvas });

    startTime = Date.now();
    camera = new THREE.Camera();
    camera.position.z = 1;
    scene = new THREE.Scene();
    var geometry = new THREE.PlaneBufferGeometry(2, 2 );
    uniforms = {
        iGlobalTime: { type: "f", value: 1.0 },
        iResolution: { type: "v1", value: new THREE.Vector2(), }
    };


    var material = new THREE.ShaderMaterial( {
        uniforms: uniforms,
        vertexShader: document.getElementById( 'vertexShader' ).textContent,
        fragmentShader: document.getElementById( 'fragmentShader' ).textContent
    });

    var mesh = new THREE.Mesh( geometry, material );
    scene.add( mesh );
}

function animate() {
    if (stop) {
        return;
    }

    requestAnimationFrame( animate );

    now = Date.now();
    elapsed = now - then;

    if (elapsed > fpsInterval) {
        then = now - (elapsed % fpsInterval);

        render();
        renderASCII();
    }
}

function render() {
    var currentTime = Date.now();
    uniforms.iGlobalTime.value = (currentTime - startTime) * 0.01;
    renderer.render( scene, camera );
}


function renderASCII() {
    const data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
    // console.log(data);

    let asciiPixels = '';

    for (let i = data.length - 4; i > 0; i -= 4) {
        //const charMap = '  .:-=+*%#@';
        const charMap = '   .+' + Math.random().toString(36).substr(2, 7);

        asciiPixels += charMap[
            Math.round(
                (charMap.length - 1) * (0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2]) / 255
            )
        ];

        if (Math.ceil((i - 1) / 4) % canvas.width === 0) {
            asciiPixels += newLine;
        }
    }

    asciiPixels = asciiPixels.split('');
    asciiPixels[0] = asciiPixels[0] === ' ' ? 'M' : asciiPixels[0];
    asciiPixels[1] = asciiPixels[1] === ' ' ? 'a' : asciiPixels[1];
    asciiPixels[2] = asciiPixels[2] === ' ' ? 't' : asciiPixels[2];
    asciiPixels[3] = asciiPixels[3] === ' ' ? 'h' : asciiPixels[3];
    asciiPixels[4] = asciiPixels[4] === ' ' ? 'i' : asciiPixels[4];
    asciiPixels[5] = asciiPixels[5] === ' ' ? 'e' : asciiPixels[5];
    asciiPixels[6] = asciiPixels[6] === ' ' ? 'u' : asciiPixels[6];
    asciiPixels[8] = asciiPixels[8] === ' ' ? 'D' : asciiPixels[8];
    asciiPixels[9] = asciiPixels[9] === ' ' ? 'é' : asciiPixels[9];
    asciiPixels[10] = asciiPixels[10] === ' ' ? 'b' : asciiPixels[10];
    asciiPixels[11] = asciiPixels[11] === ' ' ? 'i' : asciiPixels[11];
    asciiPixels[12] = asciiPixels[12] === ' ' ? 't' : asciiPixels[12];
    asciiPixels = asciiPixels.join('');
    // asciiPixels = asciiPixels.replace(/^\s.{13}/g, 'Mathieu Débit');
    ascii.innerHTML = asciiPixels.replace(/ /g, "&nbsp;");
}
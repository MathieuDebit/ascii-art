"use strict";

let gl;
const width = window.innerWidth / 16;
const height = window.innerHeight / 16;

let stop = false;
let frameCount = 0;
let fps, fpsInterval, startTime, now, then, elapsed;

let ascii;
const newLine = '<br/>';

let mouseX = 0;
let mouseY = 0;

const vertexShaderSource = `
    // an attribute will receive data from a buffer
    attribute vec4 a_position;
    
    // all shaders have a main function
    void main() {
        // gl_Position is a special variable a vertex shader
        // is responsible for setting
        gl_Position = a_position;
    }
`;

const fragmentShaderSource = `
    precision highp float;
    uniform vec2 iResolution;
    uniform vec2 iMouse;
    uniform float iTime;
    
    // Protean clouds by nimitz (twitter: @stormoid)
// https://www.shadertoy.com/view/3l23Rh
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License
// Contact the author for other licensing options

/*
\tTechnical details:

\tThe main volume noise is generated from a deformed periodic grid, which can produce
\ta large range of noise-like patterns at very cheap evalutation cost. Allowing for multiple
\tfetches of volume gradient computation for improved lighting.

\tTo further accelerate marching, since the volume is smooth, more than half the the density
\tinformation isn't used to rendering or shading but only as an underlying volume\tdistance to 
\tdetermine dynamic step size, by carefully selecting an equation\t(polynomial for speed) to 
\tstep as a function of overall density (not necessarialy rendered) the visual results can be 
\tthe\tsame as a naive implementation with ~40% increase in rendering performance.

\tSince the dynamic marching step size is even less uniform due to steps not being rendered at all
\tthe fog is evaluated as the difference of the fog integral at each rendered step.

*/

mat2 rot(in float a){float c = cos(a), s = sin(a);return mat2(c,s,-s,c);}
const mat3 m3 = mat3(0.33338, 0.56034, -0.71817, -0.87887, 0.32651, -0.15323, 0.15162, 0.69596, 0.61339)*1.93;
float mag2(vec2 p){return dot(p,p);}
float linstep(in float mn, in float mx, in float x){ return clamp((x - mn)/(mx - mn), 0., 1.); }
float prm1 = 0.;
vec2 bsMo = vec2(0);

vec2 disp(float t){ return vec2(sin(t*0.22)*1., cos(t*0.175)*1.)*2.; }

vec2 map(vec3 p)
{
    vec3 p2 = p;
    p2.xy -= disp(p.z).xy;
    p.xy *= rot(sin(p.z+iTime)*(0.1 + prm1*0.05) + iTime*0.09);
    float cl = mag2(p2.xy);
    float d = 0.;
    p *= .61;
    float z = 1.;
    float trk = 1.;
    float dspAmp = 0.1 + prm1*0.2;
    for(int i = 0; i < 5; i++)
    {
        p += sin(p.zxy*0.75*trk + iTime*trk*.8)*dspAmp;
        d -= abs(dot(cos(p), sin(p.yzx))*z);
        z *= 0.57;
        trk *= 1.4;
        p = p*m3;
    }
    d = abs(d + prm1*3.)+ prm1*.3 - 2.5 + bsMo.y;
    return vec2(d + cl*.2 + 0.25, cl);
}

vec4 render( in vec3 ro, in vec3 rd, float time )
{
    vec4 rez = vec4(0);
    const float ldst = 8.;
    vec3 lpos = vec3(disp(time + ldst)*0.5, time + ldst);
    float t = 1.5;
    float fogT = 0.;
    for(int i=0; i<130; i++)
    {
        if(rez.a > 0.99)break;

        vec3 pos = ro + t*rd;
        vec2 mpv = map(pos);
        float den = clamp(mpv.x-0.3,0.,1.)*1.12;
        float dn = clamp((mpv.x + 2.),0.,3.);

        vec4 col = vec4(0);
        if (mpv.x > 0.6)
        {

            col = vec4(sin(vec3(5.,0.4,0.2) + mpv.y*0.1 +sin(pos.z*0.4)*0.5 + 1.8)*0.5 + 0.5,0.08);
            col *= den*den*den;
            col.rgb *= linstep(4.,-2.5, mpv.x)*2.3;
            float dif =  clamp((den - map(pos+.8).x)/9., 0.001, 1. );
            dif += clamp((den - map(pos+.35).x)/2.5, 0.001, 1. );
            col.xyz *= den*(vec3(0.005,.045,.075) + 1.5*vec3(0.033,0.07,0.03)*dif);
        }

        float fogC = exp(t*0.2 - 2.2);
        col.rgba += vec4(0.06,0.11,0.11, 0.1)*clamp(fogC-fogT, 0., 1.);
        fogT = fogC;
        rez = rez + col*(1. - rez.a);
        t += clamp(0.5 - dn*dn*.05, 0.09, 0.3);
    }
    return clamp(rez, 0.0, 1.0);
}

float getsat(vec3 c)
{
    float mi = min(min(c.x, c.y), c.z);
    float ma = max(max(c.x, c.y), c.z);
    return (ma - mi)/(ma+ 1e-7);
}

//from my "Will it blend" shader (https://www.shadertoy.com/view/lsdGzN)
vec3 iLerp(in vec3 a, in vec3 b, in float x)
{
    vec3 ic = mix(a, b, x) + vec3(1e-6,0.,0.);
    float sd = abs(getsat(ic) - mix(getsat(a), getsat(b), x));
    vec3 dir = normalize(vec3(2.*ic.x - ic.y - ic.z, 2.*ic.y - ic.x - ic.z, 2.*ic.z - ic.y - ic.x));
    float lgt = dot(vec3(1.0), ic);
    float ff = dot(dir, normalize(ic));
    ic += 1.5*dir*sd*ff*lgt;
    return clamp(ic,0.,1.);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 q = fragCoord.xy/iResolution.xy;
    vec2 p = (gl_FragCoord.xy - 0.5*iResolution.xy)/iResolution.y;
    bsMo = (iMouse.xy - 0.5*iResolution.xy)/iResolution.y;

    float time = iTime*3.;
    vec3 ro = vec3(0,0,time);

    ro += vec3(sin(iTime)*0.5,sin(iTime*1.)*0.,0);

    float dspAmp = .85;
    ro.xy += disp(ro.z)*dspAmp;
    float tgtDst = 3.5;

    vec3 target = normalize(ro - vec3(disp(time + tgtDst)*dspAmp, time + tgtDst));
    ro.x -= bsMo.x*2.;
    vec3 rightdir = normalize(cross(target, vec3(0,1,0)));
    vec3 updir = normalize(cross(rightdir, target));
    rightdir = normalize(cross(updir, target));
    vec3 rd=normalize((p.x*rightdir + p.y*updir)*1. - target);
    rd.xy *= rot(-disp(time + 3.5).x*0.2 + bsMo.x);
    prm1 = smoothstep(-0.4, 0.4,sin(iTime*0.3));
    vec4 scn = render(ro, rd, time);

    vec3 col = scn.rgb;
    col = iLerp(col.bgr, col.rgb, clamp(1.-prm1,0.05,1.));

    col = pow(col, vec3(.55,0.65,0.6))*vec3(1.,.97,.9);

    col *= pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.12)*0.7+0.3; //Vign

    fragColor = vec4( col, 1.0 );
}

    void main() {
        mainImage(gl_FragColor, gl_FragCoord.xy);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) {
        return shader;
    }

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    const success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function main() {
    ascii = document.createElement('div');
    ascii.setAttribute('id', 'ascii');
    ascii.style.width = width * 16 + 'px';
    ascii.style.height = height * 16 + 'px';
    document.body.appendChild(ascii);

    // Get A WebGL context
    const canvas = document.createElement('canvas');
    canvas.setAttribute('id', 'canvas');
    canvas.width = width;
    canvas.height = height;
    document.body.appendChild(canvas);
    gl = canvas.getContext("webgl");
    if (!gl) {
        return;
    }

    // create GLSL shaders, upload the GLSL source, compile the shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    // Link the two shaders into a program
    const program = createProgram(gl, vertexShader, fragmentShader);

    // look up where the vertex data needs to go.
    const positionAttributeLocation = gl.getAttribLocation(program, "a_position");

    // look up uniform locations
    const resolutionLocation = gl.getUniformLocation(program, "iResolution");
    const mouseLocation = gl.getUniformLocation(program, "iMouse");
    const timeLocation = gl.getUniformLocation(program, "iTime");

    // Create a buffer and put three 2d clip space points in it
    var positionBuffer = gl.createBuffer();

    // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    var positions = [
        -1, -1,  // first triangle
        1, -1,
        -1, 1,
        -1, 1,  // second triangle
        1, -1,
        1, 1,
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // code above this line is initialization code.

    function render(time) {
        // code below this line is rendering code.

        time *= 0.001;  // convert to seconds

        // stop
        if (stop) {
            return;
        }

        // request another frame

        requestAnimationFrame(render);

        // calc elapsed time since last loop

        now = Date.now();
        elapsed = now - then;

        // if enough time has elapsed, draw the next frame

        if (elapsed > fpsInterval) {

            // Get ready for next frame by setting then=now, but...
            // Also, adjust for fpsInterval not being multiple of 16.67
            then = now - (elapsed % fpsInterval);

            // draw stuff here
            // webglUtils.resizeCanvasToDisplaySize(gl.canvas);

            // Tell WebGL how to convert from clip space to pixels
            gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

            // Clear the canvas
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);

            // Tell it to use our program (pair of shaders)
            gl.useProgram(program);

            // Turn on the attribute
            gl.enableVertexAttribArray(positionAttributeLocation);

            gl.uniform2f(resolutionLocation, gl.canvas.width, gl.canvas.height);
            gl.uniform2f(mouseLocation, mouseX, mouseY);
            gl.uniform1f(timeLocation, time);

            // Bind the position buffer.
            gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

            gl.vertexAttribPointer(
                positionAttributeLocation,
                2,          // 2 components per iteration
                gl.FLOAT,   // the data is 32bit floats
                false,      // don't normalize the data
                0,          // 0 = move forward size * sizeof(type) each iteration to get the next position
                0,          // start at the beginning of the buffer
            );

            gl.drawArrays(
                gl.TRIANGLES,
                0,     // offset
                6,     // num vertices to process
            );

            renderASCII();

        }
    }

    startAnimating(25);

    function startAnimating(fps) {
        fpsInterval = 1000 / fps;
        then = Date.now();
        startTime = then;
        console.log(startTime);
        render();
    }

    function setMousePosition(e) {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = rect.height - (e.clientY - rect.top) - 1;  // bottom is 0 in WebGL
    }

    document.body.addEventListener('mousemove', setMousePosition);

    requestAnimationFrame(render);
}

function renderASCII() {
    var data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
    gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
    // console.log(data);

    let asciiPixels = '';

    for (let i = data.length - 4; i > 0; i -= 4) {
        //const charMap = '  .:-=+*%#@';
        const charMap = '      .:-=+*%#@' + Math.random().toString(36).substr(2, 7);

        asciiPixels += charMap[
            Math.round(
                (charMap.length - 1) * (0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2]) / 255
            )
        ];

        if (Math.ceil((i - 1) / 4) % canvas.width === 0) {
            asciiPixels += newLine;
        }
    }

    ascii.innerHTML = asciiPixels.replace(/ /g, "&nbsp;");
}

main();
"use client";

import { useEffect, useRef } from "react";

import horseMarkUrl from "@/assets/horse-mark.bin";
import {
  decodeHorseMesh,
  knightView,
  multiply,
  perspective,
  rotationY,
} from "@/lib/knight-mark-mesh";

import "./brand-mark.css";

const SPIN_PERIOD_MS = 5500;
const SPIN_RAD_PER_MS = (Math.PI * 2) / SPIN_PERIOD_MS;
const REST_YAW = 0.7;

const FACE_VS = `#version 300 es
in vec3 aPos;
in vec3 aNrm;
uniform mat4 uMVP;
uniform mat3 uNrm;
out vec3 vN;
void main() {
  vN = uNrm * aNrm;
  gl_Position = uMVP * vec4(aPos, 1.0);
}`;

const FACE_FS = `#version 300 es
precision mediump float;
in vec3 vN;
out vec4 fragColor;
void main() {
  vec3 n = normalize(vN);
  vec3 L = normalize(vec3(0.38, 0.82, 0.46));
  vec3 fillL = normalize(vec3(-0.62, 0.18, 0.32));
  vec3 V = normalize(vec3(0.06, 0.16, 1.0));
  float ndl = max(dot(n, L), 0.0);
  float wrap = max(dot(n, L) * 0.55 + 0.45, 0.0);
  float fill = max(dot(n, fillL), 0.0);
  float hemi = n.y * 0.5 + 0.5;
  vec3 h = normalize(L + V);
  float spec = pow(max(dot(n, h), 0.0), 56.0);
  float rim = pow(max(1.0 - max(dot(n, V), 0.0), 0.0), 2.6) * 0.2;
  vec3 albedo = vec3(0.70, 0.72, 0.76);
  vec3 ambient = vec3(0.055, 0.058, 0.066) + hemi * vec3(0.055, 0.058, 0.064);
  vec3 color = albedo * (ambient + wrap * 0.38 + ndl * 0.42 + fill * 0.12)
    + spec * vec3(0.34, 0.35, 0.37)
    + rim * vec3(0.42, 0.44, 0.48);
  fragColor = vec4(color, 1.0);
}`;

type GL = WebGL2RenderingContext;

function compile(gl: GL, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl: GL, vsSrc: string, fsSrc: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, vsSrc);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fsSrc);
  if (!vs || !fs) return null;
  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

function bindFloat(gl: GL, program: WebGLProgram, name: string, size: number, stride: number, offset: number) {
  const loc = gl.getAttribLocation(program, name);
  if (loc < 0) return;
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
}

function syncCanvas(canvas: HTMLCanvasElement) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const size = Math.max(1, Math.round(canvas.clientWidth * dpr));
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size;
    canvas.height = size;
    return true;
  }
  return false;
}

export function BrandMark({ animate = true }: { animate?: boolean; priority?: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: true,
      depth: true,
      premultipliedAlpha: true,
      powerPreference: "low-power",
    });
    const faceProgram = gl ? createProgram(gl, FACE_VS, FACE_FS) : null;
    if (!gl || !faceProgram) return;

    let faceVao: WebGLVertexArrayObject | null = null;
    let faceBuffer: WebGLBuffer | null = null;
    let indexBuffer: WebGLBuffer | null = null;
    let disposed = false;
    let frame = 0;
    let visible = true;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let resume = () => {};

    const io = new IntersectionObserver((entries) => {
      visible = entries.some((entry) => entry.isIntersecting);
      resume();
    });
    io.observe(canvas);

    const cleanup = () => {
      disposed = true;
      cancelAnimationFrame(frame);
      io.disconnect();
      motion.removeEventListener("change", resume);
      document.removeEventListener("visibilitychange", resume);
      resize.disconnect();
      if (faceBuffer) gl.deleteBuffer(faceBuffer);
      if (indexBuffer) gl.deleteBuffer(indexBuffer);
      if (faceVao) gl.deleteVertexArray(faceVao);
      gl.deleteProgram(faceProgram);
    };

    const resize = new ResizeObserver(() => resume());
    resize.observe(canvas);

    fetch(horseMarkUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Horse mark failed to load");
        return res.arrayBuffer();
      })
      .then((buffer) => {
        if (disposed) return;
        const mesh = decodeHorseMesh(buffer);
        faceVao = gl.createVertexArray();
        gl.bindVertexArray(faceVao);
        faceBuffer = gl.createBuffer();
        const packed = new Float32Array(mesh.vertexCount * 6);
        for (let i = 0; i < mesh.vertexCount; i += 1) {
          packed[i * 6] = mesh.positions[i * 3];
          packed[i * 6 + 1] = mesh.positions[i * 3 + 1];
          packed[i * 6 + 2] = mesh.positions[i * 3 + 2];
          packed[i * 6 + 3] = mesh.normals[i * 3];
          packed[i * 6 + 4] = mesh.normals[i * 3 + 1];
          packed[i * 6 + 5] = mesh.normals[i * 3 + 2];
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, faceBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, packed, gl.STATIC_DRAW);
        bindFloat(gl, faceProgram, "aPos", 3, 24, 0);
        bindFloat(gl, faceProgram, "aNrm", 3, 24, 12);
        indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);

        const uFaceMVP = gl.getUniformLocation(faceProgram, "uMVP");
        const uFaceNrm = gl.getUniformLocation(faceProgram, "uNrm");
        const { view, fovy, near, far } = knightView(mesh);
        gl.enable(gl.DEPTH_TEST);
        gl.disable(gl.BLEND);
        gl.clearColor(0, 0, 0, 0);

        const draw = (yaw: number) => {
          syncCanvas(canvas);
          gl.viewport(0, 0, canvas.width, canvas.height);
          const model = rotationY(yaw);
          const mvp = multiply(perspective(fovy, 1, near, far), multiply(view, model));
          const c = Math.cos(yaw);
          const s = Math.sin(yaw);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          gl.useProgram(faceProgram);
          gl.bindVertexArray(faceVao);
          gl.uniformMatrix4fv(uFaceMVP, false, mvp);
          gl.uniformMatrix3fv(uFaceNrm, false, [c, 0, -s, 0, 1, 0, s, 0, c]);
          gl.drawElements(gl.TRIANGLES, mesh.indexCount, gl.UNSIGNED_SHORT, 0);
        };

        const tick = (now: number) => {
          if (disposed) return;
          const spinning = animate && !motion.matches && visible && !document.hidden;
          if (spinning) {
            draw(now * SPIN_RAD_PER_MS);
            frame = requestAnimationFrame(tick);
            return;
          }
          draw(REST_YAW);
        };

        resume = () => {
          if (disposed) return;
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(tick);
        };

        motion.addEventListener("change", resume);
        document.addEventListener("visibilitychange", resume);
        resume();
      })
      .catch(() => undefined);

    return cleanup;
  }, [animate]);

  return (
    <canvas
      ref={canvasRef}
      className="wordmark-logo aichessathon-mark"
      width={72}
      height={72}
      aria-hidden="true"
    />
  );
}

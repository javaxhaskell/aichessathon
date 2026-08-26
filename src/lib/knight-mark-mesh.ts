export type Vec3 = [number, number, number];

export type KnightMesh = {
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint16Array;
  vertexCount: number;
  indexCount: number;
  height: number;
  radius: number;
  centerY: number;
};

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function length(a: Vec3) {
  return Math.hypot(a[0], a[1], a[2]);
}

function normalize(a: Vec3): Vec3 {
  const len = length(a);
  return len < 1e-8 ? [0, 1, 0] : [a[0] / len, a[1] / len, a[2] / len];
}

export function decodeHorseMesh(buffer: ArrayBuffer): KnightMesh {
  const bytes = new Uint8Array(buffer);
  if (bytes.byteLength < 16 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "HRS1") {
    throw new Error("Invalid horse mark mesh");
  }

  const header = new DataView(buffer, 0, 12);
  const vertexCount = header.getUint32(4, true);
  const indexCount = header.getUint32(8, true);
  const posOffset = 12;
  const nrmOffset = posOffset + vertexCount * 12;
  const idxOffset = nrmOffset + vertexCount * 12;
  if (idxOffset + indexCount * 2 > buffer.byteLength) {
    throw new Error("Truncated horse mark mesh");
  }

  const positions = new Float32Array(buffer.slice(posOffset, nrmOffset));
  const normals = new Float32Array(buffer.slice(nrmOffset, idxOffset));
  const indices = new Uint16Array(buffer.slice(idxOffset, idxOffset + indexCount * 2));

  let minY = Infinity;
  let maxY = -Infinity;
  let radius = 0;
  for (let i = 0; i < vertexCount; i += 1) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    radius = Math.max(radius, Math.hypot(x, y, z));
  }

  return {
    positions,
    normals,
    indices,
    vertexCount,
    indexCount,
    height: maxY - minY,
    radius,
    centerY: (minY + maxY) * 0.5,
  };
}

export function knightView(mesh: KnightMesh) {
  const pad = 1.42;
  const half = Math.max(mesh.radius, mesh.height * 0.5) * pad;
  const fovy = 0.34;
  const dist = half / Math.tan(fovy / 2);
  return {
    view: lookAt([dist * 0.06, mesh.centerY, dist], [0, mesh.centerY, 0], [0, 1, 0]),
    fovy,
    near: Math.max(0.08, dist - mesh.radius * 2.4),
    far: dist + mesh.radius * 2.4,
  };
}

export function perspective(fovy: number, aspect: number, near: number, far: number) {
  const f = 1 / Math.tan(fovy / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (far + near) / (near - far);
  out[11] = -1;
  out[14] = (2 * far * near) / (near - far);
  return out;
}

export function lookAt(eye: Vec3, target: Vec3, up: Vec3) {
  const z = normalize(sub(eye, target));
  const x = normalize(cross(up, z));
  const y = cross(z, x);
  const out = new Float32Array(16);
  out[0] = x[0];
  out[1] = y[0];
  out[2] = z[0];
  out[4] = x[1];
  out[5] = y[1];
  out[6] = z[1];
  out[8] = x[2];
  out[9] = y[2];
  out[10] = z[2];
  out[12] = -dot(x, eye);
  out[13] = -dot(y, eye);
  out[14] = -dot(z, eye);
  out[15] = 1;
  return out;
}

export function multiply(a: Float32Array, b: Float32Array) {
  const out = new Float32Array(16);
  for (let i = 0; i < 4; i += 1) {
    const ai0 = a[i];
    const ai1 = a[i + 4];
    const ai2 = a[i + 8];
    const ai3 = a[i + 12];
    out[i] = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3];
    out[i + 4] = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7];
    out[i + 8] = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11];
    out[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
  }
  return out;
}

export function rotationY(rad: number) {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  const out = new Float32Array(16);
  out[0] = c;
  out[2] = -s;
  out[5] = 1;
  out[8] = s;
  out[10] = c;
  out[15] = 1;
  return out;
}

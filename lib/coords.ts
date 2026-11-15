import { Vector3 } from "three";

export function latLonToVector(latDeg: number, lonDeg: number, radius: number): Vector3 {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  // Convenção: +Y norte, +X interseção equador/meridiano 0, +Z leste (ajustada para textura equiretangular)
  return new Vector3(
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
    radius * Math.cos(lat) * Math.cos(lon),
  );
}

export function vectorToLatLon(vec: Vector3): { lat: number; lon: number } {
  const v = vec.clone().normalize();
  const lat = Math.asin(clamp(v.y, -1, 1));
  const lon = Math.atan2(v.x, v.z);
  return { lat: (lat * 180) / Math.PI, lon: (lon * 180) / Math.PI };
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

export function formatCoord(lat: number, lon: number): string {
  const ns = lat >= 0 ? "N" : "S";
  const ew = lon >= 0 ? "E" : "W";
  return `${Math.abs(lat).toFixed(3)}° ${ns} · ${Math.abs(lon).toFixed(3)}° ${ew}`;
}

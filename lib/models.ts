// LUNARIS — modelo de dados (frontend).
// Assinatura consumida pela UI. A camada de serviços adapta respostas do backend
// para esta forma; não inventa valores científicos.

export type DataSource = "real" | "mock" | "unavailable" | "synthetic";
export type CoordinateSystem = "meanEarth" | "planetocentric" | "planetographic";

export interface Location {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  coordinateSystem: CoordinateSystem;
  altitudeM?: number;
  color: string;
  source: DataSource;
  notes?: string;
  createdAt?: string;
}

export interface LocationInput {
  name: string;
  latitude: string;
  longitude: string;
  altitudeM?: string;
  color: string;
  coordinateSystem: CoordinateSystem;
}

export interface AnalysisRequest {
  locationIds: string[];
  intervalStart: string; // YYYY-MM-DD
  intervalEnd: string; // YYYY-MM-DD
  stepHours: number;
}

export interface EphemerisPoint {
  instant: string; // ISO timestamp
  solarElevationDeg: number | null;
  solarAzimuthDeg: number | null;
  earthElevationDeg: number | null;
  earthAzimuthDeg: number | null;
  earthVisibility: number | null; // 0..1 ou percentual conforme fonte; UI normaliza para exibição
  solarVisibility: number | null;
  commWindow: boolean | null;
  distanceKm: number | null;
  horizonOcclusion: number | null;
  illuminationCondition?: string | null;
  source: DataSource;
  quality: number | null; // 0..1
}

export interface EphemerisResponse {
  locationId: string;
  name?: string;
  color?: string;
  source: DataSource;
  quality: number | null;
  provenance?: string[];
  points: EphemerisPoint[];
  note?: string;
}

export interface DataQualityInfo {
  locationId: string;
  source: DataSource;
  quality: number | null;
  provenance: string[];
  notes?: string;
}

export interface ApiError {
  code: string;
  message: string;
  endpoint?: string;
  cause?: unknown;
}

export type ApiBackend = "offline" | "live";

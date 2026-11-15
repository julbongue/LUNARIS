"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useLoader, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import { useLocations } from "./LocationsContext";
import { formatCoord, latLonToVector, vectorToLatLon } from "@/lib/coords";

const MOON_RADIUS = 1;
const TEXTURE_URL = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_1024.jpg";
const BUMP_URL = "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/moon_bump.jpg";

function Marker({ lat, lon, color, label, onClick }: { lat: number; lon: number; color: string; label: string; onClick?: () => void }) {
  const pos = useMemo(() => latLonToVector(lat, lon, MOON_RADIUS + 0.015), [lat, lon]);
  return (
    <group position={pos}>
      <mesh onClick={(e) => { e.stopPropagation(); onClick?.(); }}>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
      </mesh>
      <Html distanceFactor={6} position={[0, 0.03, 0]} center>
        <div className="pointer-events-none select-none rounded-md border px-2 py-0.5 text-[10px] font-medium shadow-sm" style={{ background: "rgba(16,24,32,0.85)", color: "#F1F0EB", borderColor: color }}>
          {label}
        </div>
      </Html>
    </group>
  );
}

function MoonMesh({ onPick }: { onPick: (lat: number, lon: number) => void }) {
  const colorMap = useLoader(THREE.TextureLoader, TEXTURE_URL) as THREE.Texture;
  const [bumpMap, setBumpMap] = useState<THREE.Texture | null>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    let cancelled = false;
    const loader = new THREE.TextureLoader();
    loader.load(
      BUMP_URL,
      (tex) => { if (!cancelled) setBumpMap(tex); },
      undefined,
      () => { if (!cancelled) setBumpMap(null); },
    );
    return () => { cancelled = true; };
  }, []);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (!meshRef.current) return;
    const local = meshRef.current.worldToLocal(e.point.clone());
    const { lat, lon } = vectorToLatLon(local);
    onPick(lat, lon);
  };

  return (
    <mesh ref={meshRef} onClick={handleClick}>
      <sphereGeometry args={[MOON_RADIUS, 128, 128]} />
      <meshStandardMaterial
        map={colorMap}
        bumpMap={bumpMap ?? undefined}
        bumpScale={bumpMap ? 0.02 : 0}
        roughness={1}
        metalness={0}
      />
    </mesh>
  );
}

function SceneControls({ recenterToken }: { recenterToken: number }) {
  const controls = useRef<React.ElementRef<typeof OrbitControls> | null>(null);
  const { camera } = useThree();
  useEffect(() => {
    if (!controls.current) return;
    camera.position.set(0, 0, 2.6);
    controls.current.target.set(0, 0, 0);
    controls.current.update();
  }, [recenterToken, camera]);
  return <OrbitControls ref={controls} enablePan enableZoom enableRotate minDistance={1.2} maxDistance={6} />;
}

export function Globe() {
  const { sites, addSite, setPendingPoint, pendingPoint, isMax } = useLocations();
  const [showMarkers, setShowMarkers] = useState(true);
  const [showCoords, setShowCoords] = useState(true);
  const [hover, setHover] = useState<{ lat: number; lon: number } | null>(null);
  const [recenterToken, setRecenterToken] = useState(0);

  const onPick = (lat: number, lon: number) => {
    setHover({ lat, lon });
    if (isMax) {
      setPendingPoint({ lat, lon });
      return;
    }
    // Seleção direta no globo cria um local personalizado.
    void addSite({
      name: `Local ${lat.toFixed(2)}, ${lon.toFixed(2)}`,
      latitude: lat.toFixed(4),
      longitude: lon.toFixed(4),
      color: sites.length === 0 ? "#E89A55" : sites.length === 1 ? "#8FAFC7" : "#D5D2C9",
      coordinateSystem: "meanEarth",
    });
  };

  return (
    <div className="relative h-full min-h-[420px] w-full overflow-hidden rounded-2xl border border-[#1e2a37] bg-[#0a1018]">
      <Canvas camera={{ position: [0, 0, 2.6], fov: 45 }} onPointerMissed={() => setHover(null)}>
        <color attach="background" args={["#060b12"]} />
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 2, 3]} intensity={1.4} color="#F1F0EB" />
        <directionalLight position={[-3, -1, -2]} intensity={0.2} color="#8FAFC7" />
        <Suspense fallback={null}>
          <MoonMesh onPick={onPick} />
          {showMarkers && sites.map((s) => (
            <Marker key={s.id} lat={s.latitude} lon={s.longitude} color={s.color} label={s.name} />
          ))}
        </Suspense>
        <Stars radius={50} depth={20} count={1500} factor={2} saturation={0} fade speed={0.2} />
        <SceneControls recenterToken={recenterToken} />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-3">
        <div className="pointer-events-auto flex flex-wrap gap-2">
          <button className="rounded-md border border-[#2a3a4a] bg-[#101820]/90 px-2.5 py-1.5 text-xs text-[#D5D2C9] hover:bg-[#172B40]" onClick={() => setShowMarkers((v) => !v)}>
            {showMarkers ? "Ocultar" : "Mostrar"} marcadores
          </button>
          <button className="rounded-md border border-[#2a3a4a] bg-[#101820]/90 px-2.5 py-1.5 text-xs text-[#D5D2C9] hover:bg-[#172B40]" onClick={() => setShowCoords((v) => !v)}>
            {showCoords ? "Ocultar" : "Mostrar"} coordenadas
          </button>
          <button className="rounded-md border border-[#2a3a4a] bg-[#101820]/90 px-2.5 py-1.5 text-xs text-[#D5D2C9] hover:bg-[#172B40]" onClick={() => setRecenterToken((n) => n + 1)}>
            Recentrar
          </button>
        </div>
        <div className="rounded-md border border-[#2a3a4a] bg-[#101820]/90 px-2.5 py-1.5 text-[11px] text-[#8FAFC7]">
          Textura visual: NASA/USGS (LRO) via three.js · Dados científicos: backend
        </div>
      </div>

      {showCoords && (hover || pendingPoint) && (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-[#2a3a4a] bg-[#101820]/90 px-3 py-2 text-xs text-[#F1F0EB]">
          <div className="text-[#8FAFC7]">Coordenadas</div>
          <div className="font-mono">{formatCoord((hover || pendingPoint)!.lat, (hover || pendingPoint)!.lon)}</div>
          {isMax && pendingPoint && <div className="mt-1 text-[#E89A55]">Limite de 3 locais atingido.</div>}
        </div>
      )}

      <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-[#2a3a4a] bg-[#101820]/90 px-3 py-2 text-[11px] text-[#D5D2C9]">
        <div className="mb-1 font-medium text-[#8FAFC7]">Legenda</div>
        <div>• Globo: textura visual (não análise)</div>
        <div>• Marcadores: locais selecionados ({sites.length}/3)</div>
        <div>• Arrastar: orbitar · Scroll: zoom · Botão dir.: pan</div>
      </div>
    </div>
  );
}

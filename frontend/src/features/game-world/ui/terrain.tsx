import type { MapTheme } from "@/features/game-world/model/types";

type TerrainProps = {
  mapTheme: MapTheme;
};

export function Terrain({ mapTheme }: TerrainProps) {
  const grassStripPosition: [number, number, number] = [-5.6, 0.01, 0];
  const mountainStripPosition: [number, number, number] = [6.2, 0.011, 0];

  return (
    <>
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[24, 24, 1, 1]} />
        <meshStandardMaterial color={mapTheme.groundColor} roughness={0.95} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={grassStripPosition}>
        <planeGeometry args={[12.6, 24]} />
        <meshStandardMaterial color={mapTheme.grassColor} roughness={0.93} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={mountainStripPosition}>
        <planeGeometry args={[10.8, 24]} />
        <meshStandardMaterial color={mapTheme.mountainColor} roughness={0.96} />
      </mesh>

      {mapTheme.grassPatches.map(([x, z, radius]) => (
        <mesh
          key={`${x}-${z}-${radius}`}
          receiveShadow
          rotation={[-Math.PI / 2, 0, 0]}
          position={[x, 0.018, z]}
        >
          <circleGeometry args={[radius, 28]} />
          <meshStandardMaterial color={mapTheme.grassColor} roughness={0.9} />
        </mesh>
      ))}

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={mapTheme.pathPosition}>
        <planeGeometry args={mapTheme.pathSize} />
        <meshStandardMaterial color={mapTheme.pathColor} roughness={0.88} metalness={0.1} />
      </mesh>

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={mapTheme.pondPosition}>
        <circleGeometry args={[2.3, 50]} />
        <meshStandardMaterial color={mapTheme.pondColor} metalness={0.2} roughness={0.5} />
      </mesh>

      {mapTheme.mountainSpots.map(([x, z, scale], index) => (
        <group key={`${x}-${z}-${index}`} position={[x, 0, z]} scale={[scale, scale, scale]}>
          <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
            <cylinderGeometry args={[1.2, 1.75, 0.45, 7]} />
            <meshStandardMaterial color={mapTheme.mountainColor} roughness={0.98} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 1.36, 0]}>
            <coneGeometry args={[1.3, 2.45, 7]} />
            <meshStandardMaterial color={mapTheme.mountainColor} roughness={0.95} />
          </mesh>
          <mesh castShadow receiveShadow position={[0, 2.34, 0]}>
            <coneGeometry args={[0.54, 0.98, 7]} />
            <meshStandardMaterial color={mapTheme.mountainPeakColor} roughness={0.75} />
          </mesh>
          <mesh castShadow receiveShadow position={[0.36, 0.9, -0.26]} scale={[0.62, 0.72, 0.62]}>
            <coneGeometry args={[1.05, 2.05, 6]} />
            <meshStandardMaterial color={mapTheme.mountainColor} roughness={0.95} />
          </mesh>
        </group>
      ))}
    </>
  );
}

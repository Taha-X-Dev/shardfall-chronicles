import type { MapTheme } from "@/features/game-world/model/types";

type TreesProps = {
  mapTheme: MapTheme;
};

export function Trees({ mapTheme }: TreesProps) {
  return (
    <>
      {mapTheme.treeSpots.map((spot, index) => {
        const scale = 0.82 + (index % 3) * 0.14;
        const upperLeafHeight = 1.62 + (index % 2) * 0.12;

        return (
          <group key={`${spot[0]}-${spot[1]}`} position={[spot[0], 0, spot[1]]} scale={[scale, scale, scale]}>
            <mesh castShadow position={[0, 0.45, 0]}>
              <cylinderGeometry args={[0.08, 0.11, 0.9, 10]} />
              <meshStandardMaterial color={mapTheme.treeTrunkColor} roughness={0.95} />
            </mesh>
            <mesh castShadow position={[0, 1.2, 0]}>
              <coneGeometry args={[0.48, 1.1, 12]} />
              <meshStandardMaterial color={mapTheme.treeLeafColor} roughness={0.9} />
            </mesh>
            <mesh castShadow position={[0, upperLeafHeight, 0]}>
              <coneGeometry args={[0.32, 0.58, 10]} />
              <meshStandardMaterial color={mapTheme.treeLeafColor} roughness={0.88} />
            </mesh>
          </group>
        );
      })}
    </>
  );
}

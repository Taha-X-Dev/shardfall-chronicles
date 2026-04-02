import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";

type ScenePostEffectsProps = {
  intensity: number;
};

export function ScenePostEffects({ intensity }: ScenePostEffectsProps) {
  const { gl } = useThree();

  if (!gl.capabilities.isWebGL2) {
    return null;
  }

  return (
    <EffectComposer>
      <Bloom intensity={intensity} luminanceThreshold={0.25} mipmapBlur />
    </EffectComposer>
  );
}

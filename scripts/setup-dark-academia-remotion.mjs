import fs from 'node:fs';
import path from 'node:path';

const REMOTION_DIR = 'C:/Users/ygnat/Desktop/PROYECTOS TGP 2026/tgp-REMOTION/src';

const COMPONENT_CODE = `import React from 'react';
import { AbsoluteFill, useCurrentFrame, interpolate, Img } from 'remotion';
import { TransitionSeries, linearTiming } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { z } from 'zod';

export const darkAcademiaLoopSchema = z.object({
  imageUrls: z.array(z.string()).min(1),
  duracionPorEscena: z.number().default(90),
  duracionTransicion: z.number().default(20),
});

export type DarkAcademiaLoopProps = z.infer<typeof darkAcademiaLoopSchema>;

const FilmGrain: React.FC = () => {
  const frame = useCurrentFrame();
  const seed = Math.floor(frame / 2);
  return (
    <AbsoluteFill style={{ pointerEvents: 'none', opacity: 0.08, mixBlendMode: 'overlay', zIndex: 20 }}>
      <svg width="100%" height="100%" style={{ filter: 'contrast(160%) brightness(100%)' }}>
        <filter id="dark-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" seed={seed} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#dark-grain)" />
      </svg>
    </AbsoluteFill>
  );
};

const VignetteLayer: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        pointerEvents: 'none',
        zIndex: 15,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(5,7,12,0.45) 75%, rgba(2,3,6,0.92) 100%)',
      }}
    />
  );
};

const CinematicShot: React.FC<{
  imageUrl: string;
  shotIndex: number;
  durationInFrames: number;
}> = ({ imageUrl, shotIndex, durationInFrames }) => {
  const frame = useCurrentFrame();

  let scale = 1.0;
  let translateX = 0;
  let translateY = 0;

  if (shotIndex % 4 === 0) {
    scale = interpolate(frame, [0, durationInFrames], [1.0, 1.045], { extrapolateRight: 'clamp' });
  } else if (shotIndex % 4 === 1) {
    scale = 1.035;
    translateX = interpolate(frame, [0, durationInFrames], [0, -2.0], { extrapolateRight: 'clamp' });
  } else if (shotIndex % 4 === 2) {
    scale = interpolate(frame, [0, durationInFrames], [1.05, 1.01], { extrapolateRight: 'clamp' });
  } else {
    scale = 1.03;
    translateY = interpolate(frame, [0, durationInFrames], [0, -1.8], { extrapolateRight: 'clamp' });
  }

  return (
    <AbsoluteFill style={{ overflow: 'hidden', backgroundColor: '#07090d' }}>
      <Img
        src={imageUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          transform: \`scale(\${scale}) translate(\${translateX}%, \${translateY}%)\`,
          filter: 'contrast(106%) brightness(96%) saturate(92%)',
        }}
      />
    </AbsoluteFill>
  );
};

export const DarkAcademiaCinematicLoop16x9: React.FC<DarkAcademiaLoopProps> = ({
  imageUrls,
  duracionPorEscena = 90,
  duracionTransicion = 20,
}) => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#05070a' }}>
      <TransitionSeries>
        {imageUrls.map((url, idx) => (
          <React.Fragment key={idx}>
            <TransitionSeries.Sequence durationInFrames={duracionPorEscena}>
              <CinematicShot
                imageUrl={url}
                shotIndex={idx}
                durationInFrames={duracionPorEscena}
              />
            </TransitionSeries.Sequence>
            {idx < imageUrls.length - 1 && (
              <TransitionSeries.Transition
                presentation={fade()}
                timing={linearTiming({ durationInFrames: duracionTransicion })}
              />
            )}
          </React.Fragment>
        ))}
      </TransitionSeries>

      <VignetteLayer />
      <FilmGrain />

      <AbsoluteFill
        style={{
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
          zIndex: 30,
        }}
      />
    </AbsoluteFill>
  );
};
`;

const compPath = path.join(REMOTION_DIR, 'DarkAcademiaLoop16x9.tsx');
fs.writeFileSync(compPath, COMPONENT_CODE, 'utf8');
console.log('✅ DarkAcademiaLoop16x9.tsx creado en Remotion.');

// Modificar Root.tsx para registrar la composición si no está
const rootPath = path.join(REMOTION_DIR, 'Root.tsx');
let rootCode = fs.readFileSync(rootPath, 'utf8');

if (!rootCode.includes('DarkAcademiaCinematicLoop16x9')) {
  rootCode = `import { DarkAcademiaCinematicLoop16x9, darkAcademiaLoopSchema } from './DarkAcademiaLoop16x9';\n` + rootCode;
  
  const compositionTag = `
      <Composition
        id="dark-academia-loop-16x9"
        component={DarkAcademiaCinematicLoop16x9}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        schema={darkAcademiaLoopSchema}
        defaultProps={{
          imageUrls: [
            'https://storage.thegreatpuzzleproject.com/vault-media/1792217491714-e27fde94.webp',
            'https://storage.thegreatpuzzleproject.com/vault-media/1792217505902-206dbd92.webp',
            'https://storage.thegreatpuzzleproject.com/vault-media/1792217519518-b5ba057e.webp',
            'https://storage.thegreatpuzzleproject.com/vault-media/1792217532545-045e2f7b.webp'
          ],
          duracionPorEscena: 90,
          duracionTransicion: 20
        }}
      />\n`;

  rootCode = rootCode.replace('return (', `return (\n${compositionTag}`);
  fs.writeFileSync(rootPath, rootCode, 'utf8');
  console.log('✅ Composición "dark-academia-loop-16x9" (1920x1080, 300 frames = 10s) registrada en Root.tsx.');
} else {
  console.log('ℹ️ Composición ya estaba registrada en Root.tsx.');
}

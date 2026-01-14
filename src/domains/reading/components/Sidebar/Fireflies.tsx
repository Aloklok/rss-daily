import React, { useEffect, useState } from 'react';

interface Firefly {
  id: number;
  left: string;
  top: string;
  animationDuration: string;
  animationDelay: string;
  flashDuration: string;
  flashDelay: string;
  size: string;
}

export const Fireflies: React.FC = () => {
  const [fireflies, setFireflies] = useState<Firefly[]>([]);

  useEffect(() => {
    const count = 8; // Reduced to 8 per user request
    const newFireflies: Firefly[] = [];

    const rows = 4;
    const cols = 2;
    for (let i = 0; i < count; i++) {
      // Sector-based positioning to ensure coverage
      const row = Math.floor(i / cols);
      const col = i % cols;

      // Base position + Random Jitter within the sector
      const leftBase = col * (100 / cols);
      const topBase = row * (100 / rows);
      const leftJitter = Math.random() * (100 / cols);
      const topJitter = Math.random() * (100 / rows);

      newFireflies.push({
        id: i,
        left: `${leftBase + leftJitter}%`,
        top: `${topBase + topJitter}%`,
        animationDuration: `${40 + Math.random() * 50}s`, // Slower drift: 40s-90s
        animationDelay: `${Math.random() * -30}s`,
        flashDuration: `${5 + Math.random() * 5}s`, // Slow breathing: 5-10s
        flashDelay: `${Math.random() * -5}s`,
        size: `${2 + Math.random() * 3}px`, // Adjusted: 2px - 5px
      });
    }

    // Check if window exists to ensure client-side execution
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line
      setFireflies(newFireflies);
    }
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 hidden overflow-hidden dark:block">
      <style>{`
                @keyframes firefly-move {
                    0% { transform: translate(0, 0); }
                    50% { transform: translate(60px, -60px); }
                    100% { transform: translate(0, 0); }
                }
                @keyframes firefly-flash {
                    0%, 100% { opacity: 0.5; }
                    50% { opacity: 1; }
                }
            `}</style>
      {fireflies.map((firefly) => (
        <div
          key={firefly.id}
          // "Hot Core" Design: White-ish center (light source) + Golden Aura (glow)
          // This prevents the "solid ball" look.
          className="absolute rounded-full bg-yellow-100 shadow-[0_0_8px_3px_rgba(251,191,36,0.5)] blur-[0.5px]"
          style={{
            left: firefly.left,
            top: firefly.top,
            width: firefly.size,
            height: firefly.size,
            // Combine animations: move (slow) and flash (fast)
            animation: `
                            firefly-move ${firefly.animationDuration} ease-in-out infinite alternate,
                            firefly-flash ${firefly.flashDuration} ease-in-out infinite
                        `,
            animationDelay: `${firefly.animationDelay}, ${firefly.flashDelay}`,
          }}
        />
      ))}
    </div>
  );
};

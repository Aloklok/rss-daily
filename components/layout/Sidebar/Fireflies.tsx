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
    const count = 6; // Reduced from 15
    const newFireflies: Firefly[] = [];

    for (let i = 0; i < count; i++) {
      newFireflies.push({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        animationDuration: `${25 + Math.random() * 35}s`,
        animationDelay: `${Math.random() * -30}s`,
        flashDuration: `${3 + Math.random() * 4}s`, // Faster blinking: 3-7s
        flashDelay: `${Math.random() * -5}s`,
        size: `${1.5 + Math.random() * 2.5}px`,
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
                    0%, 100% { opacity: 0.2; }
                    50% { opacity: 1; }
                }
            `}</style>
      {fireflies.map((firefly) => (
        <div
          key={firefly.id}
          className="absolute bg-yellow-300 blur-[1px]"
          style={{
            left: firefly.left,
            top: firefly.top,
            width: firefly.size,
            height: firefly.size,
            borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
            // Combine animations: move (slow) and flash (fast)
            animation: `
                            firefly-move ${firefly.animationDuration} ease-in-out infinite alternate,
                            firefly-flash ${firefly.flashDuration} ease-in-out infinite
                        `,
            animationDelay: `${firefly.animationDelay}, ${firefly.flashDelay}`,
            boxShadow: '0 0 20px 5px rgba(253, 224, 71, 0.9)',
          }}
        />
      ))}
    </div>
  );
};

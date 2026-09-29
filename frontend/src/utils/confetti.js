import confetti from 'canvas-confetti';

const RAINBOW = ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#2979ff', '#d500f9'];

// Full-screen rainbow confetti burst — used when a task group hits 100%.
export function celebrateSectionComplete() {
  const duration = 1500;
  const end = Date.now() + duration;

  confetti({
    particleCount: 150,
    spread: 100,
    startVelocity: 45,
    origin: { y: 0.5 },
    colors: RAINBOW,
    zIndex: 9999,
  });

  (function sideCannons() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 70,
      startVelocity: 55,
      origin: { x: 0, y: 0.6 },
      colors: RAINBOW,
      zIndex: 9999,
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 70,
      startVelocity: 55,
      origin: { x: 1, y: 0.6 },
      colors: RAINBOW,
      zIndex: 9999,
    });
    if (Date.now() < end) {
      requestAnimationFrame(sideCannons);
    }
  })();
}

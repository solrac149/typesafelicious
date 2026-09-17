import { useEffect, useRef } from "react";

type SignalFieldProps = {
  probabilities: Record<string, number>;
  intensity: number;
};

type Particle = {
  offset: number;
  speed: number;
  lane: number;
  size: number;
};

const colors: Record<string, string> = {
  neutral: "26, 26, 24",
  happy: "255, 206, 45",
  excited: "255, 48, 220",
  sad: "63, 155, 255",
  angry: "255, 61, 33",
  anxious: "47, 214, 196",
  affectionate: "255, 106, 148",
  sarcastic: "157, 255, 77",
};

function buildParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, index) => ({
    offset: ((index * 73) % count) / count,
    speed: 0.25 + ((index * 17) % 70) / 100,
    lane: ((index * 41) % 100) / 100,
    size: 0.7 + ((index * 29) % 20) / 10,
  }));
}

export function SignalField({ probabilities, intensity }: SignalFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const signalRef = useRef({ probabilities, intensity });

  useEffect(() => {
    signalRef.current = { probabilities, intensity };
  }, [intensity, probabilities]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const particles = buildParticles(520);
    let frame = 0;
    let animationFrame = 0;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;
    let previousTime = 0;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const draw = (time = 0) => {
      const strength = Math.max(0, Math.min(1, signalRef.current.intensity));
      const elapsed = previousTime ? Math.min(time - previousTime, 50) / 16.67 : 0;
      previousTime = time;
      if (!reducedMotion.matches) frame += elapsed * (0.2 + strength * 1.8);
      context.clearRect(0, 0, width, height);

      const entries = Object.entries(signalRef.current.probabilities);
      const total = entries.reduce((sum, [, probability]) => sum + probability, 0);

      particles.forEach((particle, index) => {
        // Assign colors by cumulative probability; movement depends on intensity only.
        const position = ((index + 0.5) / particles.length) * total;
        let cumulative = 0;
        const [emotion] = entries.find(([, probability]) => {
          cumulative += probability;
          return position < cumulative;
        }) ?? ["neutral", 1];
        const progress = (particle.offset + frame * 0.0007 * particle.speed) % 1;
        const direction = index % 2 === 0 ? 1 : -1;
        const centerY = height * (0.48 + (particle.lane - 0.5) * 0.4);
        const wave = Math.sin(progress * Math.PI * 4 + particle.lane * 8 + frame * 0.008);
        const x = direction > 0 ? progress * width : width - progress * width;
        const pull = Math.sin(progress * Math.PI) * strength * 100;
        const y = centerY + wave * (8 + strength * 58) + (particle.lane - 0.5) * pull;
        const alpha = 0.25;

        context.fillStyle = `rgba(${colors[emotion] ?? colors.neutral}, ${alpha})`;
        context.fillRect(x, y, particle.size, particle.size);
      });

      context.strokeStyle = "rgba(20, 20, 18, 0.08)";
      context.lineWidth = 1;
      for (let row = 1; row < 5; row += 1) {
        const y = (height / 5) * row;
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
      }

      animationFrame = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="signal-field" aria-hidden="true" />;
}

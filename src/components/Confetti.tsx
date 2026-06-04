export function Confetti() {
  const pieces = Array.from({ length: 40 });
  const colors = [
    "bg-pink-500",
    "bg-cyan-400",
    "bg-yellow-400",
    "bg-violet-500",
    "bg-emerald-400",
    "bg-orange-400",
  ];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const color = colors[i % colors.length];
        const size = 6 + Math.random() * 8;
        return (
          <span
            key={i}
            className={`confetti-piece absolute ${color} rounded-sm`}
            style={{
              left: `${left}%`,
              top: "-10px",
              width: `${size}px`,
              height: `${size}px`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}
    </div>
  );
}

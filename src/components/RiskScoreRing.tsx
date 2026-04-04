interface Props {
  score: number;
  size?: number;
}

function getColor(score: number): string {
  if (score >= 75) return "hsl(0, 72%, 55%)";
  if (score >= 55) return "hsl(38, 92%, 55%)";
  if (score >= 30) return "hsl(185, 70%, 50%)";
  return "hsl(142, 60%, 45%)";
}

export default function RiskScoreRing({ score, size = 48 }: Props) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = getColor(score);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(220, 14%, 18%)" strokeWidth={3} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={3}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-mono font-semibold" style={{ color }}>{score}</span>
    </div>
  );
}

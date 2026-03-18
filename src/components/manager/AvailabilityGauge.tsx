interface AvailabilityGaugeProps {
  percentage: number;
}

export function AvailabilityGauge({ percentage }: AvailabilityGaugeProps) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 90 ? "hsl(var(--status-closed))" : percentage >= 70 ? "hsl(var(--priority-medium))" : "hsl(var(--priority-critical))";

  return (
    <svg width="70" height="70" viewBox="0 0 70 70" className="mx-auto">
      <circle cx="35" cy="35" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
      <circle
        cx="35"
        cy="35"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 35 35)"
        className="transition-all duration-700"
      />
      <text x="35" y="38" textAnchor="middle" fill="hsl(var(--foreground))" fontSize="13" fontWeight="bold">
        {percentage}%
      </text>
    </svg>
  );
}

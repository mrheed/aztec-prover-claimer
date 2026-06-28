/** Minimal dependency-free SVG sparkline from a series of numbers. */
export function Sparkline({
  data,
  width = 76,
  height = 22,
  color = 'var(--lime)',
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const h = height - pad * 2;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = pad + (h - ((v - min) / range) * h);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

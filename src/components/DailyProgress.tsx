interface DailyProgressProps {
  prayed: number;
  total: number;
}

export function DailyProgress({ prayed, total }: DailyProgressProps) {
  const pct = Math.round((prayed / total) * 100);
  return (
    <>
      <div className="section-header">
        <div className="section-title">The Hours</div>
        <div className="section-subtitle">{prayed} of {total} prayed</div>
      </div>
      <div className="progress-wrap">
        <div className="progress-label">
          <span>Daily rhythm</span>
          <span>{pct}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </>
  );
}

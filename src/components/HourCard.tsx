import type { Hour } from '../types';

interface HourCardProps {
  hour: Hour;
}

export function HourCard({ hour }: HourCardProps) {
  const cardClass = [
    'hour-card',
    hour.status === 'prayed' ? 'prayed' : '',
    hour.status === 'now' ? 'now' : '',
  ].filter(Boolean).join(' ');

  const showChevron = hour.badge === 'live' || hour.badge === 'recorded';

  return (
    <article className={cardClass}>
      <div className="hour-time-col">
        <div className="hour-time">{hour.time}</div>
        <div className="hour-ampm">{hour.ampm}</div>
      </div>
      <div className="hour-divider" />
      <div className="hour-info">
        <div className="hour-name">{hour.name}</div>
        <div className="hour-latin">{hour.latin}</div>
        <div className="hour-partner">{hour.partner}</div>
      </div>
      <div className="hour-right">
        {hour.badge === 'done' && <div className="badge-done">✓</div>}
        {hour.badge === 'live' && <div className="badge-live">Live</div>}
        {hour.badge === 'recorded' && <div className="badge-recorded">Recorded</div>}
        {showChevron && <div className="chevron">›</div>}
      </div>
    </article>
  );
}

interface TodayBannerProps {
  feastName: string;
  season: string;
  nextHourName: string;
  nextHourTime: string;
}

export function TodayBanner({
  feastName,
  season,
  nextHourName,
  nextHourTime,
}: TodayBannerProps) {
  return (
    <section className='today-banner'>
      <div>
        <div className='today-label'>Today</div>
        <div className='today-feast'>{feastName}</div>
        <div className='today-season'>{season}</div>
      </div>
      <div className='next-hour-pill'>
        <div className='next-hour-label'>Next Hour</div>
        <div className='next-hour-name'>{nextHourName}</div>
        <div className='next-hour-time'>{nextHourTime}</div>
      </div>
    </section>
  );
}

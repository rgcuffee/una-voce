interface LiveCardProps {
  hourName: string;
  partner: string;
  viewerCount: number;
}

export function LiveCard({ hourName, partner, viewerCount }: LiveCardProps) {
  return (
    <section className='live-card'>
      <div className='live-card-header'>
        <div className='live-badge'>
          <span className='live-dot' />
          Live Now
        </div>
        <div className='live-viewers'>{viewerCount} praying</div>
      </div>
      <div className='live-card-body'>
        <div className='live-hour-name'>{hourName}</div>
        <div className='live-partner'>
          with <strong>{partner}</strong>
        </div>
        <button className='live-join-btn'>Join the Prayer</button>
      </div>
    </section>
  );
}

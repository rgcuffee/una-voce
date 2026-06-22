interface FeaturedCardProps {
  kicker: string;
  title: string;
  copy: string;
  imageUrl: string;
}

export function FeaturedCard({
  kicker,
  title,
  copy,
  imageUrl,
}: FeaturedCardProps) {
  return (
    <section
      className='featured-card'
      style={{
        background: `linear-gradient(120deg, rgba(28,28,30,0.92), rgba(28,28,30,0.48)), url("${imageUrl}")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className='featured-kicker'>{kicker}</div>
      <div className='featured-title'>{title}</div>
      <div className='featured-copy'>{copy}</div>
    </section>
  );
}

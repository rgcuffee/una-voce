import type { ReactNode } from 'react';

export function MonthlyCompanionsHeroContent({
  titleId,
  action,
}: {
  titleId: string;
  action: ReactNode;
}) {
  return (
    <>
      <div className="home-hero-copy">
        <div className="page-eyebrow">Prayer in print</div>
        <h1 id={titleId}>Make room for prayer on the page.</h1>
        <p>
          Meet Alto, Magnificat, and Give Us This Day—three monthly companions
          for daily prayer, Mass, and reflection.
        </p>
        <div className="home-hero-actions">{action}</div>
      </div>
      <div className="home-hero-products" aria-hidden="true">
        <span className="home-hero-product home-hero-product--alto">
          <img src="/images/print-resources/alto.jpg" alt="" />
        </span>
        <span className="home-hero-product home-hero-product--magnificat">
          <img src="/images/print-resources/magnificat.png" alt="" />
        </span>
        <span className="home-hero-product home-hero-product--give-us-this-day">
          <img src="/images/print-resources/give-us-this-day.jpg" alt="" />
        </span>
      </div>
    </>
  );
}

import {
  getPartnerBadgeMeta,
  type PartnerBadgeStatus,
} from '../data/partnerCommunities';

export function PartnerBadge({
  status,
  className,
}: {
  status: PartnerBadgeStatus;
  className?: string;
}) {
  const meta = getPartnerBadgeMeta(status);
  const classes = ['partner-badge', `partner-badge-${status}`, className]
    .filter(Boolean)
    .join(' ');

  return (
    <span className={classes} aria-label={meta.description}>
      <span className='partner-badge-label'>{meta.label}</span>
      <span className='partner-badge-tooltip' role='tooltip' aria-hidden='true'>
        {meta.description}
      </span>
    </span>
  );
}

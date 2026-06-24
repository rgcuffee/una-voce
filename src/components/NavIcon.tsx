import type { IconName } from '../navigation';

const PATHS: Record<IconName, JSX.Element> = {
  // Sunrise over the horizon: the daily round of the Hours.
  today: (
    <>
      <path d='M3 18h18' />
      <path d='M7 18a5 5 0 0 1 10 0' />
      <path d='M12 4v3' />
      <path d='M5.2 8.2 6.6 9.6' />
      <path d='M18.8 8.2 17.4 9.6' />
    </>
  ),
  // Compass: discover voices and creators.
  discover: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='m15.5 8.5-2 5-5 2 2-5z' />
    </>
  ),
  // Radiating signal: live streams.
  live: (
    <>
      <circle cx='12' cy='12' r='2.2' />
      <path d='M7.8 7.8a6 6 0 0 0 0 8.4' />
      <path d='M16.2 16.2a6 6 0 0 0 0-8.4' />
      <path d='M5 5a10 10 0 0 0 0 14' />
      <path d='M19 19a10 10 0 0 0 0-14' />
    </>
  ),
  // Two figures: community.
  community: (
    <>
      <circle cx='9' cy='8' r='3' />
      <path d='M3.5 19a5.5 5.5 0 0 1 11 0' />
      <path d='M16 5.2a3 3 0 0 1 0 5.6' />
      <path d='M17 13.4A5.5 5.5 0 0 1 20.5 19' />
    </>
  ),
  // Ellipsis: more.
  more: (
    <>
      <circle cx='5' cy='12' r='1.4' />
      <circle cx='12' cy='12' r='1.4' />
      <circle cx='19' cy='12' r='1.4' />
    </>
  ),
};

export function NavIcon({ name }: { name: IconName }) {
  return (
    <svg
      className='nav-svg'
      viewBox='0 0 24 24'
      width='22'
      height='22'
      fill='none'
      stroke='currentColor'
      strokeWidth='1.5'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      {PATHS[name]}
    </svg>
  );
}

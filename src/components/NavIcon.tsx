import type { IconName } from '../navigation';

const PATHS: Record<IconName, JSX.Element> = {
  // Simple house: homepage doorway.
  home: (
    <>
      <path d='M4 11 12 4l8 7' />
      <path d='M6 10v10h12V10' />
      <path d='M10 20v-5h4v5' />
    </>
  ),
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
  // Compass: discover voices, creators, and live prayer.
  discover: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='m15.5 8.5-2 5-5 2 2-5z' />
    </>
  ),
  // Simple gathered circle: communities and partner profiles.
  community: (
    <>
      <circle cx='8' cy='9' r='3' />
      <circle cx='16' cy='9' r='3' />
      <path d='M4 20a4 4 0 0 1 8 0' />
      <path d='M12 20a4 4 0 0 1 8 0' />
    </>
  ),
  // Flag at the start of the path: getting started.
  'getting-started': (
    <>
      <path d='M6 21V4' />
      <path d='M6 4h11l-2.5 3.5L17 11H6' />
    </>
  ),
  // Parish doorway: a church roof with a simple door.
  parishes: (
    <>
      <path d='M4 11 12 5l8 6' />
      <path d='M6 10v10h12V10' />
      <path d='M10 20v-5h4v5' />
      <path d='M12 5V2' />
      <path d='M10.5 3.5h3' />
    </>
  ),
  // Info circle: about.
  about: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M12 11v5' />
      <path d='M12 8h.01' />
    </>
  ),
  // Ellipsis in a circle: secondary pages and support.
  more: (
    <>
      <circle cx='12' cy='12' r='9' />
      <path d='M8 12h.01' />
      <path d='M12 12h.01' />
      <path d='M16 12h.01' />
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

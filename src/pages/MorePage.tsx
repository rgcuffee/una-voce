import type { ViewKey, ViewNavigator } from '../navigation';

type MenuLink = {
  view: ViewKey;
  title: string;
  description: string;
  icon: string;
};

export function MorePage({ onNavigate }: { onNavigate: ViewNavigator }) {
  const links: MenuLink[] = [
    {
      view: 'getting-started',
      title: 'Start Here',
      description:
        'New to the Hours? Begin with one simple Hour of prayer.',
      icon: '✣',
    },
    {
      view: 'parishes',
      title: 'For Parishes',
      description:
        'Use Una Voce with OCIA, adult formation, ministry groups, and parish invitations.',
      icon: '⌂',
    },
    {
      view: 'about',
      title: 'About Una Voce',
      description:
        'What this platform is, why it exists, and the tradition it serves.',
      icon: '☩',
    },
    {
      view: 'contact',
      title: 'Contact',
      description:
        'Send a note about partnerships, community listings, content, or support.',
      icon: '✉',
    },
  ];

  return (
    <article className='page'>
      <header className='page-hero'>
        <div className='page-eyebrow'>More</div>
        <h1 className='page-hero-title'>Guidance, parishes, and support</h1>
        <p className='page-lead'>
          Start with the Hours or learn why Una Voce exists.
        </p>
      </header>

      <nav className='menu-list'>
        {links.map((link) => (
          <button
            key={link.view}
            type='button'
            className='menu-item'
            onClick={() => onNavigate(link.view)}
          >
            <span className='menu-item-icon'>{link.icon}</span>
            <span className='menu-item-body'>
              <span className='menu-item-title'>{link.title}</span>
              <span className='menu-item-desc'>{link.description}</span>
            </span>
            <span className='menu-item-chevron'>›</span>
          </button>
        ))}
      </nav>
    </article>
  );
}

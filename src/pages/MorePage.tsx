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
      title: 'Getting Started',
      description:
        'New to the Hours? A simple, five-step path into the prayer of the Church.',
      icon: '✣',
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
        'Send feedback, suggest a community, or start a partnership conversation.',
      icon: '✉',
    },
  ];

  return (
    <article className='page'>
      <header className='page-hero'>
        <div className='page-eyebrow'>More</div>
        <h1 className='page-hero-title'>Guidance, story, and support</h1>
        <p className='page-lead'>
          Start with the Hours, learn why Una Voce exists, or send a note to
          the team.
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

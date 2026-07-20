import { NavLink } from 'react-router-dom';

interface AppHeaderProps {
  dateLabel: string;
}

const NAV_ITEMS = [
  { path: '/', label: 'Home' },
  { path: '/pray', label: 'Pray Today' },
  { path: '/start', label: 'Start Here' },
  { path: '/discover', label: 'Discover' },
  { path: '/about', label: 'About' },
];

export function AppHeader({ dateLabel }: AppHeaderProps) {
  return (
    <header className='app-header'>
      <div className='header-mobile'>
        <div className='header-top'>
          <div className='logo'>
            UNA <span>VOCE</span>
          </div>
          <div className='header-icon'>☩</div>
        </div>
        <div className='date-line'>{dateLabel}</div>
      </div>

      <div className='header-desktop'>
        <div className='desktop-brand-block'>
          <div className='logo'>
            UNA <span>VOCE</span>
          </div>
          <div className='date-line'>{dateLabel}</div>
        </div>

        <nav className='header-nav' aria-label='Primary'>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `header-nav-item${isActive ? ' active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className='header-action'>☩</div>
      </div>
    </header>
  );
}

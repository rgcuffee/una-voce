import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', icon: '⌂', label: 'Home' },
  { path: '/pray', icon: '☰', label: 'Pray' },
  { path: '/start', icon: '⚑', label: 'Start' },
  { path: '/discover', icon: '✦', label: 'Discover' },
  { path: '/parishes', icon: '⌂', label: 'Parish' },
  { path: '/about', icon: '☩', label: 'About' },
];

export function BottomNav() {
  return (
    <nav className='bottom-nav'>
      {NAV_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <div className='nav-icon'>{item.icon}</div>
          <div className='nav-label'>{item.label}</div>
        </NavLink>
      ))}
    </nav>
  );
}

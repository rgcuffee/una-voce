import { NavLink } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', icon: '☰', label: 'Today' },
  { path: '/pray', icon: '▶', label: 'Pray' },
  { path: '/communities', icon: '✦', label: 'Communities' },
  { path: '/more', icon: '☩', label: 'More' },
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

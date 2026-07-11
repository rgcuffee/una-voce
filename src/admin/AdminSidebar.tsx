import { useState, type ReactNode } from 'react';

type AdminSidebarProps = {
  title: string;
  label?: string;
  children: ReactNode;
};

export function AdminSidebar({
  title,
  label = 'Una Voce',
  children,
}: AdminSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside
      className={`engine-sidebar${isOpen ? ' open' : ''}`}
      aria-label={`${title} sections`}
    >
      <div className="engine-brand">
        <span>{label}</span>
        <strong>{title}</strong>
      </div>
      <button
        type="button"
        className="engine-sidebar-toggle"
        aria-expanded={isOpen}
        aria-controls="engine-sidebar-nav"
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>Menu</span>
        <span aria-hidden="true">{isOpen ? '−' : '+'}</span>
      </button>
      <div
        id="engine-sidebar-nav"
        className="engine-sidebar-menu"
        onClick={(event) => {
          const target = event.target;

          if (target instanceof Element && target.closest('a, button')) {
            setIsOpen(false);
          }
        }}
      >
        {children}
      </div>
    </aside>
  );
}

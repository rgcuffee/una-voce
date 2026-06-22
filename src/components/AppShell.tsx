import type { ReactNode } from 'react';
import { AppHeader } from './AppHeader';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  dateLabel: string;
  children: ReactNode;
}

export function AppShell({ dateLabel, children }: AppShellProps) {
  return (
    <div className="phone">
      <div className="shell-content">
        <AppHeader dateLabel={dateLabel} />
        {children}
      </div>
      <BottomNav />
    </div>
  );
}

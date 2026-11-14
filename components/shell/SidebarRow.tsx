import Link from 'next/link';

export function SidebarRow({
  href,
  icon,
  label,
  active,
  onNavigate,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      className="sidebar-row"
      title={label}
      data-testid="sidebar-row"
      aria-current={active ? 'page' : undefined}
      onClick={onNavigate}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

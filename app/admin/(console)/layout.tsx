import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { signOut } from '@/app/actions/auth';
import { getPlatformAdmin } from '@/lib/platform';

export const metadata: Metadata = { title: 'Pipemouse Admin', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getPlatformAdmin();
  // Everyone else, signed in or not, is sent to the admin sign-in and learns nothing more.
  if (!admin) redirect('/admin/login');
  return (
    <div className="admin-shell">
      <header className="admin-bar">
        <span className="admin-bar-title">Pipemouse Admin</span>
        <Link href="/admin">Workspaces</Link>
        <Link href="/admin/messages">Messages</Link>
        <Link href="/admin/audit">Audit log</Link>
        <span className="admin-bar-spacer" />
        <span>{admin.email}</span>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </header>
      {children}
    </div>
  );
}

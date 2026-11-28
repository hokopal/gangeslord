import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { ProductChooser } from '@/components/auth/ProductChooser';
import { Landing } from '@/components/site/Landing';
import { onAppHost } from '@/lib/origin';
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/site';
import { getUser } from '@/lib/supabase/server';
import { listMyWorkspaces } from '@/lib/workspaces';

export const metadata: Metadata = {
  title: { absolute: `${SITE_NAME}: ${SITE_TAGLINE}` },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
};

/** Signed-in people choose a product. Everyone else sees what Pipemouse is. */
export default async function Home() {
  const user = await getUser();
  if (!user) {
    if (await onAppHost()) redirect('/login');
    return <Landing />;
  }
  const workspaces = await listMyWorkspaces();
  const roomsHref = workspaces.length === 0 ? '/onboarding' : `/w/${workspaces[0].slug}/library`;
  return <ProductChooser roomsHref={roomsHref} />;
}

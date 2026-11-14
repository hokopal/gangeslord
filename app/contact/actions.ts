'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { saveContactMessage } from '@/lib/contact';
import { withinLimit } from '@/lib/rate-limit';

const text = (formData: FormData, key: string) => String(formData.get(key) ?? '').trim();

export async function sendContactAction(formData: FormData): Promise<void> {
  // A field people never see. Only an automated form-filler completes it, and it gets a quiet success.
  if (text(formData, 'website') !== '') redirect('/contact?sent=1');
  // Five messages an hour from one network address, whatever email addresses are typed.
  if (!(await withinLimit(await headers(), 'contact', 5, 3600))) redirect('/contact?error=contact_rate_limited');
  try {
    await saveContactMessage({ name: text(formData, 'name'), email: text(formData, 'email'), topic: text(formData, 'topic'), message: text(formData, 'message') });
  } catch (error) {
    redirect(`/contact?error=${encodeURIComponent(error instanceof Error ? error.message : 'contact_failed')}`);
  }
  redirect('/contact?sent=1');
}

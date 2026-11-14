import type { Metadata } from 'next';
import { SitePage } from '@/components/site/SiteChrome';
import { TOPICS } from '@/lib/contact';
import { errorMessage } from '@/lib/messages';
import { sendContactAction } from './actions';

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Send the Pipemouse team a question about the product, your account, your data or plans.',
  alternates: { canonical: '/contact' },
};

export default async function ContactPage({ searchParams }: { searchParams: Promise<{ sent?: string; error?: string }> }) {
  const { sent, error } = await searchParams;
  return (
    <SitePage title="Contact" intro="Questions about Pipemouse, your account or your data. A person reads every message." dated={false}>
      {sent ? (
        <p className="site-note" role="status">
          Thank you. Your message has been sent, and we will reply to the email address you gave.
        </p>
      ) : (
        <>
          {error ? (
            <p className="site-note site-note-error" role="alert">
              {errorMessage(error)}
            </p>
          ) : null}
          <form action={sendContactAction} className="site-form">
            <label>
              Your name
              <input name="name" required maxLength={120} autoComplete="name" />
            </label>
            <label>
              Your email address
              <input name="email" type="email" required maxLength={254} autoComplete="email" />
            </label>
            <label>
              What is it about?
              <select name="topic" defaultValue="general">
                {Object.entries(TOPICS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your message
              <textarea name="message" required minLength={10} maxLength={4000} />
            </label>
            <label className="site-form-trap" aria-hidden="true">
              Website
              <input name="website" tabIndex={-1} autoComplete="off" />
            </label>
            <button type="submit" className="site-btn site-btn-dark site-btn-lg">
              Send message
            </button>
          </form>
        </>
      )}
    </SitePage>
  );
}

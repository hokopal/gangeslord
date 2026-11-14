'use client';

import { useFormStatus } from 'react-dom';

/** A submit button that shows a spinner and an optional label while its form is being sent. */
export function SubmitButton({
  children,
  className = 'btn',
  pendingLabel,
}: {
  children: React.ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? <span className="spinner" aria-hidden="true" /> : null}
      {pending && pendingLabel ? pendingLabel : children}
    </button>
  );
}

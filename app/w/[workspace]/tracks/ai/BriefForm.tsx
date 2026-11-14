'use client';

import { Check, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { SubmitButton } from '@/components/ui/SubmitButton';
import { generateTrackAction } from './actions';

const STEPS = ['Reading your library', 'Choosing what fits this buyer', 'Putting it in order'];

/** A stepped progress panel shown while the draft is being written. */
function Working() {
  const { pending } = useFormStatus();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 3500);
    return () => {
      window.clearInterval(timer);
      setStep(0);
    };
  }, [pending]);

  if (!pending) return null;
  return (
    <div className="work-panel" role="status">
      <div className="work-title">
        <span className="spinner" aria-hidden="true" />
        Drafting your track. This usually takes 10 to 30 seconds.
      </div>
      {STEPS.map((label, index) => (
        <div key={label} className="work-row" data-state={index < step ? 'done' : 'working'}>
          {index < step ? (
            <Check className="pop success-mark" aria-hidden="true" />
          ) : index === step ? (
            <span className="spinner" aria-hidden="true" />
          ) : (
            <span style={{ width: 16 }} />
          )}
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

export function BriefForm({ workspaceSlug, initialBrief }: { workspaceSlug: string; initialBrief: string }) {
  const [brief, setBrief] = useState(initialBrief);
  return (
    <form action={generateTrackAction}>
      <input type="hidden" name="workspace" value={workspaceSlug} />
      <div className="field">
        <label className="label" htmlFor="brief">
          Who is this room for?
        </label>
        <textarea
          id="brief"
          name="brief"
          className="textarea"
          style={{ minHeight: 120 }}
          required
          minLength={10}
          maxLength={2000}
          placeholder="For example: VP of Support at a mid-size insurer, evaluating QA automation, late stage. Cares about compliance and agent coaching."
          value={brief}
          onChange={(event) => setBrief(event.target.value)}
        />
        <span className="hint">{brief.trim().length} of 2,000 characters. Mention role, company type, deal stage and what they care about.</span>
      </div>
      <SubmitButton className="btn btn-primary" pendingLabel="Drafting…">
        <Sparkles width={14} height={14} aria-hidden="true" />
        Draft track
      </SubmitButton>
      <Working />
    </form>
  );
}

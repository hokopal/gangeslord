import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OS_URL } from '@/lib/site';
import { ProductChooser } from './ProductChooser';

describe('ProductChooser', () => {
  it('links to OS and the current Rooms workspace', () => {
    const html = renderToStaticMarkup(<ProductChooser roomsHref="/w/acme/library" />);

    expect(html).toContain('Where would you like to go?');
    expect(html).toContain(`href="${OS_URL}"`);
    expect(html).toContain('href="/w/acme/library"');
    expect(html).toContain('Open Pipemouse OS');
    expect(html).toContain('Open Rooms');
  });

  it('links new users to Rooms onboarding', () => {
    const html = renderToStaticMarkup(<ProductChooser roomsHref="/onboarding" />);

    expect(html).toContain('href="/onboarding"');
  });
});

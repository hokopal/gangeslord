import type { Metadata } from 'next';
import Link from 'next/link';
import { MARKETING_PAGES, pageAt, type MarketingPage } from '@/lib/marketing';
import { SITE_NAME, SITE_URL } from '@/lib/site';
import { SiteFooter, SiteHeader } from './SiteChrome';

const START = '/login';

export function marketingMetadata(path: string): Metadata {
  const page = pageAt(path);
  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: page.path, types: { 'text/markdown': `/md${page.path}` } },
    openGraph: { type: page.schemaType === 'Article' ? 'article' : 'website', title: `${page.title} | ${SITE_NAME}`, description: page.description, url: `${SITE_URL}${page.path}` },
    twitter: { card: 'summary_large_image', title: `${page.title} | ${SITE_NAME}`, description: page.description },
  };
}

/** Breadcrumb trail from the path, e.g. Home > Use cases > For sales. Intermediate folders have no page, so they are named but not linked. */
function crumbs(page: MarketingPage) {
  const parts = page.path.split('/').filter(Boolean);
  const trail: { name: string; href?: string }[] = [{ name: 'Home', href: '/' }];
  const folders: Record<string, string> = { 'use-cases': 'Use cases', compare: 'Comparisons', guides: 'Guides' };
  parts.slice(0, -1).forEach((part) => trail.push({ name: folders[part] ?? part }));
  trail.push({ name: page.label });
  return trail;
}

function structuredData(page: MarketingPage) {
  const url = `${SITE_URL}${page.path}`;
  const trail = crumbs(page);
  const graph: Record<string, unknown>[] = [
    {
      '@type': page.schemaType,
      '@id': `${url}#page`,
      url,
      name: page.title,
      headline: page.h1,
      description: page.description,
      abstract: page.answer,
      inLanguage: 'en',
      dateModified: page.updated,
      isPartOf: { '@id': `${SITE_URL}/#website` },
      publisher: { '@id': `${SITE_URL}/#organization` },
      about: { '@type': 'SoftwareApplication', name: SITE_NAME, applicationCategory: 'BusinessApplication', operatingSystem: 'Web', url: SITE_URL },
      breadcrumb: { '@id': `${url}#breadcrumb` },
      speakable: { '@type': 'SpeakableSpecification', cssSelector: ['.mk-answer p'] },
      ...(page.schemaType === 'FAQPage' && page.faq ? { mainEntity: page.faq.map(question) } : {}),
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${url}#breadcrumb`,
      itemListElement: trail.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, ...(c.href || i === trail.length - 1 ? { item: `${SITE_URL}${c.href ?? page.path}` } : {}) })),
    },
    { '@type': 'Organization', '@id': `${SITE_URL}/#organization`, name: SITE_NAME, url: SITE_URL, logo: `${SITE_URL}/icon.svg` },
  ];
  if (page.schemaType !== 'FAQPage' && page.faq?.length) graph.push({ '@type': 'FAQPage', '@id': `${url}#faq`, mainEntity: page.faq.map(question) });
  return { '@context': 'https://schema.org', '@graph': graph };
}

const question = (f: { q: string; a: string }) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } });

export function MarketingPageView({ path }: { path: string }) {
  const page = pageAt(path);
  const trail = crumbs(page);
  return (
    <div className="site">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData(page)).replace(/</g, '\\u003c') }} />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- one display face, loaded only on the public site */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&display=swap" precedence="default" />
      <div className="site-top">
        <SiteHeader />
        <div className="site-page-head">
          <nav aria-label="Breadcrumb" className="mk-crumbs">
            <ol>
              {trail.map((c, i) => (
                <li key={c.name}>
                  {c.href ? <Link href={c.href}>{c.name}</Link> : <span aria-current={i === trail.length - 1 ? 'page' : undefined}>{c.name}</span>}
                </li>
              ))}
            </ol>
          </nav>
          <p className="mk-eyebrow">{page.eyebrow}</p>
          <h1 className="text-balance">{page.h1}</h1>
          <p className="text-pretty">{page.intro}</p>
        </div>
      </div>

      <main className="site-prose mk-main">
        <article>
          <section className="mk-answer" aria-labelledby="short-answer">
            <h2 id="short-answer">The short answer</h2>
            <p>{page.answer}</p>
          </section>

          {page.sections.length > 1 ? (
            <nav aria-label="On this page" className="mk-toc">
              <h2>On this page</h2>
              <ol>
                {page.sections.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`}>{s.heading}</a>
                  </li>
                ))}
                {page.faq?.length && page.schemaType !== 'FAQPage' ? (
                  <li>
                    <a href="#questions">Questions</a>
                  </li>
                ) : null}
              </ol>
            </nav>
          ) : null}

          {page.sections.map((s) => (
            <section key={s.id} aria-labelledby={s.id}>
              <h2 id={s.id}>{s.heading}</h2>
              {s.paragraphs?.map((p) => (
                <p key={p}>{p}</p>
              ))}
              {s.list ? (
                <ul>
                  {s.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
              {s.table ? (
                <div className="site-table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {s.table.head.map((h, i) => (
                          <th key={`${h}-${i}`} scope="col">
                            {h || <span className="sr-only">Feature</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {s.table.rows.map((row) => (
                        <tr key={row[0]}>
                          {row.map((cell, i) => (i === 0 ? <th key={i} scope="row">{cell}</th> : <td key={i}>{cell}</td>))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </section>
          ))}

          {page.faq?.length ? (
            <section aria-labelledby="questions" className="mk-faq">
              <h2 id="questions">{page.schemaType === 'FAQPage' ? 'All questions' : 'Questions'}</h2>
              {page.faq.map((f) => (
                <div key={f.q}>
                  <h3>{f.q}</h3>
                  <p>{f.a}</p>
                </div>
              ))}
            </section>
          ) : null}

          <p className="mk-updated">
            Last updated <time dateTime={page.updated}>{new Date(page.updated).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}</time>.{' '}
            <a href={`/md${page.path}`}>Read this page as markdown</a>.
          </p>
        </article>

        <aside aria-labelledby="related" className="mk-related">
          <h2 id="related">Keep reading</h2>
          <ul>
            {page.related.map((p) => {
              const r = MARKETING_PAGES.find((m) => m.path === p)!;
              return (
                <li key={p}>
                  <Link href={p}>
                    <span>{r.label}</span>
                    <small>{r.description}</small>
                  </Link>
                </li>
              );
            })}
          </ul>
        </aside>
      </main>

      <section className="site-close">
        <h2>Your next buyer is going to get a link. Make it a room.</h2>
        <Link href={START} className="site-btn site-btn-lamp site-btn-lg">
          Start free
        </Link>
        <p>Every plan is free. No card needed.</p>
      </section>
      <SiteFooter />
    </div>
  );
}

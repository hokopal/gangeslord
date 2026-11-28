import { ArrowRight, BarChart3, Building2, FileText, Workflow } from 'lucide-react';

/** A suite-level product snapshot: internal GTM context and buyer engagement in one loop. */
export function SuiteDemo() {
  return (
    <div className="suite-demo" aria-label="Pipemouse OS and Rooms sharing customer context and buyer engagement">
      <div className="suite-demo-top">
        <strong>Pipemouse</strong>
        <span>One connected GTM platform</span>
      </div>

      <div className="suite-demo-grid">
        <section className="suite-demo-product" aria-label="Pipemouse OS customer workspace example">
          <div className="suite-demo-product-head">
            <span><Building2 aria-hidden="true" /> Pipemouse OS</span>
            <small>Customer context</small>
          </div>
          <div className="suite-demo-account">
            <small>ACTIVE DEAL</small>
            <strong>Acme · Expansion</strong>
            <span>Discovery · Buying group mapped</span>
          </div>
          <ul className="suite-demo-list">
            <li><Workflow aria-hidden="true" /><span>Enrichment workflow</span><small>Complete</small></li>
            <li><Building2 aria-hidden="true" /><span>Account stakeholders</span><small>4 people</small></li>
            <li><BarChart3 aria-hidden="true" /><span>Next best action</span><small>Follow up</small></li>
          </ul>
        </section>

        <section className="suite-demo-product" aria-label="Rooms buyer engagement example">
          <div className="suite-demo-product-head">
            <span><FileText aria-hidden="true" /> Rooms</span>
            <small>Buyer experience</small>
          </div>
          <div className="suite-demo-account">
            <small>PERSONAL ROOM</small>
            <strong>For Dana at Acme</strong>
            <span>Everything for the decision, in one link</span>
          </div>
          <ul className="suite-demo-list">
            <li><FileText aria-hidden="true" /><span>Security overview</span><small>Read</small></li>
            <li><FileText aria-hidden="true" /><span>Product tour</span><small>Watching</small></li>
            <li><BarChart3 aria-hidden="true" /><span>Implementation overview</span><small>Returned</small></li>
          </ul>
        </section>
      </div>

      <div className="suite-demo-flow" aria-label="Customer context informs the buyer experience, and buyer signals inform the next action">
        <span>Customer context</span>
        <ArrowRight aria-hidden="true" />
        <span>Buyer signals</span>
        <ArrowRight aria-hidden="true" />
        <span>Next action</span>
      </div>
      <p className="suite-demo-caption">An illustrative workflow with made-up names, showing how OS and Rooms work together.</p>
    </div>
  );
}

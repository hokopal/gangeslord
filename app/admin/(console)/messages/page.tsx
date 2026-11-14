import { redirect } from 'next/navigation';
import { listContactMessages, TOPICS } from '@/lib/contact';
import { getPlatformAdmin } from '@/lib/platform';

const formatWhen = (iso: string) =>
  `${new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`;

export default async function AdminMessagesPage() {
  const admin = await getPlatformAdmin();
  if (!admin) redirect('/admin/login');
  const messages = await listContactMessages();

  return (
    <div className="page page-wide">
      <h1 className="page-title">Messages</h1>
      <p className="page-subtitle">Sent through the public contact page, newest first. Reply from your own email.</p>
      {messages.length === 0 ? (
        <p className="hint">No messages yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>When</th>
                <th>From</th>
                <th>About</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((message) => (
                <tr key={message.id}>
                  <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{formatWhen(message.createdAt)}</td>
                  <td style={{ verticalAlign: 'top' }}>
                    {message.name}
                    <br />
                    <a className="link" href={`mailto:${message.email}`}>
                      {message.email}
                    </a>
                  </td>
                  <td style={{ whiteSpace: 'nowrap', verticalAlign: 'top' }}>{TOPICS[message.topic] ?? message.topic}</td>
                  <td style={{ whiteSpace: 'pre-wrap', maxWidth: 520 }}>{message.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

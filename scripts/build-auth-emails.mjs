// Builds the Supabase Auth email templates in supabase/templates/ from one branded layout.
// Run: node scripts/build-auth-emails.mjs   then paste each file into
// Supabase > Authentication > Emails > Templates (subjects are listed in SUBJECTS below).
//
// Links go straight to https://www.pipemouse.com/auth/callback with the token hash, rather than
// Supabase's {{ .ConfirmationURL }}, so every link in every email is on the pipemouse.com domain.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://www.pipemouse.com';
const LOGO = `${SITE}/apple-icon`;

const night = '#1d1630';
const paper = '#f6f4f1';
const ink = '#1a1523';
const lamp = '#ffc247';
const moss = '#6b5ca5';
const mist = '#ddd8e6';

const display = "'Bricolage Grotesque', 'Segoe UI', Helvetica, Arial, sans-serif";
const body = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

const link = (type) =>
  `${SITE}/auth/callback?token_hash={{ .TokenHash }}&type=${type}&redirect_to={{ .RedirectTo }}`;

export const EMAILS = [
  {
    file: 'confirmation.html',
    template: 'Confirm signup',
    subject: 'Confirm your email for Pipemouse',
    preheader: 'One click and your workspace is ready.',
    heading: 'Welcome to Pipemouse',
    lines: ['Confirm this is your email address and we’ll open your workspace.'],
    action: 'Confirm my email',
    href: link('email'),
  },
  {
    file: 'magic_link.html',
    template: 'Magic link',
    subject: 'Your Pipemouse sign-in link',
    preheader: 'Sign in to Pipemouse with one click.',
    heading: 'Sign in to Pipemouse',
    lines: ['Use the button below to sign in. The link works once and expires in an hour.'],
    action: 'Sign in',
    href: link('email'),
  },
  {
    file: 'invite.html',
    template: 'Invite user',
    subject: 'You’ve been invited to Pipemouse',
    preheader: 'Accept your invitation to join the workspace.',
    heading: 'You’re invited',
    lines: ['You’ve been invited to join a workspace on Pipemouse. Accept to set up your account.'],
    action: 'Accept invitation',
    href: link('invite'),
  },
  {
    file: 'email_change.html',
    template: 'Change email address',
    subject: 'Confirm your new email for Pipemouse',
    preheader: 'Confirm the change to your Pipemouse email.',
    heading: 'Confirm your new email',
    lines: [
      'You asked to change your Pipemouse email from {{ .Email }} to {{ .NewEmail }}.',
      'Confirm the change to start using the new address.',
    ],
    action: 'Confirm new email',
    href: link('email_change'),
  },
  {
    file: 'recovery.html',
    template: 'Reset password',
    subject: 'Get back into Pipemouse',
    preheader: 'A link to get back into your Pipemouse account.',
    heading: 'Get back into your account',
    lines: ['Someone asked to recover access to the Pipemouse account for {{ .Email }}. Use the button below to sign in.'],
    action: 'Sign in to Pipemouse',
    href: link('recovery'),
  },
  {
    file: 'reauthentication.html',
    template: 'Reauthentication',
    subject: 'Your Pipemouse confirmation code',
    preheader: 'Your one-time confirmation code.',
    heading: 'Confirm it’s you',
    lines: ['Enter this code in Pipemouse to continue. It expires shortly.'],
    code: '{{ .Token }}',
  },
];

function button(label, href) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 8px;">
                <tr>
                  <td bgcolor="${lamp}" style="border-radius:8px;">
                    <a href="${href}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${body};font-size:16px;font-weight:600;line-height:20px;color:${ink};text-decoration:none;border-radius:8px;">${label}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-family:${body};font-size:13px;line-height:20px;color:${moss};">Button not working? Paste this link into your browser:<br><a href="${href}" target="_blank" style="color:${moss};word-break:break-all;">${href}</a></p>`;
}

function codeBlock(code) {
  return `<p style="margin:28px 0 8px;padding:18px 0;background:${paper};border:1px solid ${mist};border-radius:8px;text-align:center;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;color:${ink};">${code}</p>`;
}

export function render(email) {
  const paragraphs = email.lines
    .map((line) => `<p style="margin:0 0 14px;font-family:${body};font-size:16px;line-height:25px;color:${ink};">${line}</p>`)
    .join('\n              ');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <title>${email.subject}</title>
  </head>
  <body style="margin:0;padding:0;background:${paper};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${email.preheader}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${paper}" style="background:${paper};">
      <tr>
        <td align="center" style="padding:40px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">
            <tr>
              <td bgcolor="${night}" style="background:${night};border-radius:14px 14px 0 0;padding:22px 32px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="vertical-align:middle;"><img src="${LOGO}" width="32" height="32" alt="" style="display:block;border:0;border-radius:8px;"></td>
                    <td style="vertical-align:middle;padding-left:12px;font-family:${display};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#ffffff;">Pipemouse</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="#ffffff" style="background:#ffffff;border:1px solid ${mist};border-top:0;border-radius:0 0 14px 14px;padding:36px 32px 32px;">
              <h1 style="margin:0 0 16px;font-family:${display};font-size:28px;font-weight:700;line-height:32px;letter-spacing:-0.02em;color:${ink};">${email.heading}</h1>
              ${paragraphs}
              ${email.code ? codeBlock(email.code) : button(email.action, email.href)}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0;font-family:${body};font-size:13px;line-height:20px;color:${moss};">
                If you didn’t ask for this email, you can ignore it. Nothing changes until the link is used.<br>
                <a href="${SITE}" target="_blank" style="color:${moss};">pipemouse.com</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'templates');
  mkdirSync(out, { recursive: true });
  for (const email of EMAILS) writeFileSync(join(out, email.file), render(email));
  console.log(EMAILS.map((e) => `${e.template.padEnd(22)} ${e.file.padEnd(24)} ${e.subject}`).join('\n'));
}

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

const VERSION = 'v1';
const INFO = 'fello-ai-key';

function derive(secret: string): Buffer {
  if (secret.length < 16) throw new Error('ai_secret_missing');
  return Buffer.from(hkdfSync('sha256', secret, 'fello', INFO, 32));
}

/** Encrypts an API key with AES-256-GCM under a key derived from a server-only secret. */
export function encryptKey(plain: string, secret: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', derive(secret), iv);
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}

/** Reverses encryptKey. Throws ai_key_unreadable if the value was tampered with or the secret changed. */
export function decryptKey(stored: string, secret: string): string {
  const [version, iv, tag, body] = stored.split('.');
  if (version !== VERSION || !iv || !tag || !body) throw new Error('ai_key_unreadable');
  try {
    const decipher = createDecipheriv('aes-256-gcm', derive(secret), Buffer.from(iv, 'base64url'));
    decipher.setAuthTag(Buffer.from(tag, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new Error('ai_key_unreadable');
  }
}

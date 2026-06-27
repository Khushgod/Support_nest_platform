import crypto from 'crypto';

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

/**
 * Derive a 32-byte AES-256 key from the configured secret.
 * Using SHA-256 means the env value can be any length/format.
 */
function deriveKey(key: string): Buffer {
  return crypto.createHash('sha256').update(key).digest();
}

/**
 * Encrypt a buffer with AES-256-CBC. The random IV is prepended to the
 * ciphertext so decryptFile is self-contained.
 */
export function encryptFile(buffer: Buffer, key: string): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, deriveKey(key), iv);
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
  return Buffer.concat([iv, encrypted]);
}

/** Reverse of encryptFile: reads the leading IV, then decrypts the remainder. */
export function decryptFile(buffer: Buffer, key: string): Buffer {
  const iv = buffer.subarray(0, IV_LENGTH);
  const data = buffer.subarray(IV_LENGTH);
  const decipher = crypto.createDecipheriv(ALGORITHM, deriveKey(key), iv);
  return Buffer.concat([decipher.update(data), decipher.final()]);
}

/** SHA-256 hex digest of the plaintext, used for deduplication. */
export function calculateHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function getEncryptionKey(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY is not set');
  return key;
}

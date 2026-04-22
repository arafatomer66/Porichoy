import { generateKeyPair, exportJWK, importPKCS8, importSPKI, type KeyLike } from 'jose';
import * as fs from 'fs';
import * as path from 'path';

const KEYS_DIR = path.join(process.cwd(), '.keys');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const PUBLIC_KEY_PATH = path.join(KEYS_DIR, 'public.pem');

let privateKey: KeyLike;
let publicKey: KeyLike;
let jwks: { keys: object[] };

export async function initKeys(): Promise<void> {
  if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });

  if (fs.existsSync(PRIVATE_KEY_PATH) && fs.existsSync(PUBLIC_KEY_PATH)) {
    const privPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8');
    const pubPem = fs.readFileSync(PUBLIC_KEY_PATH, 'utf-8');
    privateKey = await importPKCS8(privPem, 'RS256');
    publicKey = await importSPKI(pubPem, 'RS256');
  } else {
    const pair = await generateKeyPair('RS256', { modulusLength: 2048 });
    privateKey = pair.privateKey;
    publicKey = pair.publicKey;
    const { subtle } = globalThis.crypto;
    const privDer = await subtle.exportKey('pkcs8', privateKey as CryptoKey);
    const pubDer = await subtle.exportKey('spki', publicKey as CryptoKey);
    fs.writeFileSync(PRIVATE_KEY_PATH, toPem(privDer, 'PRIVATE KEY'));
    fs.writeFileSync(PUBLIC_KEY_PATH, toPem(pubDer, 'PUBLIC KEY'));
  }

  const pubJwk = await exportJWK(publicKey);
  pubJwk.use = 'sig';
  pubJwk.alg = 'RS256';
  pubJwk.kid = 'porichoy-1';
  jwks = { keys: [pubJwk] };
}

function toPem(der: ArrayBuffer, label: string): string {
  const b64 = Buffer.from(der).toString('base64');
  const lines = b64.match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

export function getPrivateKey(): KeyLike { return privateKey; }
export function getPublicKey(): KeyLike { return publicKey; }
export function getJwks(): { keys: object[] } { return jwks; }

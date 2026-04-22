import { generateKeyPair, exportJWK, exportPKCS8, exportSPKI, importPKCS8, importSPKI, type KeyLike } from 'jose';
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
    const privPem = await exportPKCS8(privateKey);
    const pubPem = await exportSPKI(publicKey);
    fs.writeFileSync(PRIVATE_KEY_PATH, privPem);
    fs.writeFileSync(PUBLIC_KEY_PATH, pubPem);
  }

  const pubJwk = await exportJWK(publicKey);
  pubJwk.use = 'sig';
  pubJwk.alg = 'RS256';
  pubJwk.kid = 'porichoy-1';
  jwks = { keys: [pubJwk] };
}

export function getPrivateKey(): KeyLike { return privateKey; }
export function getPublicKey(): KeyLike { return publicKey; }
export function getJwks(): { keys: object[] } { return jwks; }

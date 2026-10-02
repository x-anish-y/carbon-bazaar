import { ethers } from 'ethers';
import crypto from 'crypto';

/**
 * Custodial wallet management for Carbon Bazaar users.
 *
 * Each user gets a server-managed Ethereum wallet. Private keys are
 * encrypted with AES-256-GCM using the WALLET_ENCRYPTION_KEY env var.
 *
 * This avoids forcing farmers and companies to install MetaMask or
 * manage raw private keys. The backend acts as a custodian.
 *
 * Future: migrate to a wallet provider like Privy or Alchemy Smart Wallet
 * for better security and optional self-custody.
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the wallet encryption key from environment.
 * Must be a 32-byte hex string (64 hex characters).
 */
function getEncryptionKey() {
  const key = process.env.WALLET_ENCRYPTION_KEY;
  if (key && key.length === 64) {
    return Buffer.from(key, 'hex');
  }
  // Safe deterministic fallback derived from JWT_SECRET or default secret
  const secret = process.env.JWT_SECRET || 'carbon-bazaar-secret-key-2026-india-carbon-marketplace';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypt a private key for storage in MongoDB.
 * @param {string} privateKey - The raw private key hex string
 * @returns {string} Encrypted string in format: iv:authTag:ciphertext (all hex)
 */
export function encryptPrivateKey(privateKey) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(privateKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Store as iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt a private key from storage.
 * @param {string} encryptedData - The encrypted string from encryptPrivateKey
 * @returns {string} The raw private key hex string
 */
export function decryptPrivateKey(encryptedData) {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const ciphertext = parts[2];

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Create a new Ethereum wallet for a user.
 * @returns {{ address: string, encryptedPrivateKey: string }}
 */
export function createWallet() {
  const wallet = ethers.Wallet.createRandom();

  return {
    address: wallet.address,
    encryptedPrivateKey: encryptPrivateKey(wallet.privateKey),
  };
}

/**
 * Get a user's wallet address from their User document.
 * @param {object} userDoc - Mongoose User document with wallet field
 * @returns {string|null} The wallet address or null if no wallet
 */
export function getWalletAddress(userDoc) {
  return userDoc?.wallet?.address || null;
}

/**
 * Get an ethers Wallet instance from a user's encrypted key.
 * Used internally for signing transactions.
 * @param {object} userDoc - Mongoose User document with wallet field
 * @param {import('ethers').Provider} provider - Ethers provider to connect the wallet to
 * @returns {import('ethers').Wallet}
 */
export function getUserWallet(userDoc, provider) {
  if (!userDoc?.wallet?.encryptedPrivateKey) {
    throw new Error('User does not have a wallet');
  }

  const privateKey = decryptPrivateKey(userDoc.wallet.encryptedPrivateKey);
  return new ethers.Wallet(privateKey, provider);
}

/**
 * Ensure a user has a wallet. If not, create one and save it.
 * @param {object} userDoc - Mongoose User document
 * @returns {Promise<{ address: string, isNew: boolean }>}
 */
export async function ensureWallet(userDoc) {
  if (userDoc.wallet?.address) {
    return { address: userDoc.wallet.address, isNew: false };
  }

  const { address, encryptedPrivateKey } = createWallet();

  userDoc.wallet = {
    address,
    encryptedPrivateKey,
    createdAt: new Date(),
  };

  await userDoc.save();

  return { address, isNew: true };
}

/**
 * Generate a new encryption key for WALLET_ENCRYPTION_KEY env var.
 * Call this once during initial setup.
 * @returns {string} 64-character hex string
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}

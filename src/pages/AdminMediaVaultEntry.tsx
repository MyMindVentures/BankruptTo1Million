import { AdminMediaVaultOffersPage } from './AdminMediaVaultOffersPage';

/**
 * Dedicated Media Vault entry point.
 * Keeping this entry separate forces a fresh Vite chunk whenever the grouped
 * Media Vault contract changes, preventing an older admin chunk from silently
 * surviving a deployment.
 */
export function AdminMediaVaultEntry() {
  return <AdminMediaVaultOffersPage />;
}

export type I18nManifestEntityContent = {
  rpc?: string;
  tables?: string[];
};

export type I18nManifest = {
  componentKey: string;
  namespace: string;
  translationKeys: readonly string[];
  keyPatterns?: readonly string[];
  entityContent?: I18nManifestEntityContent;
};

export function manifestCoversKey(manifest: I18nManifest, key: string): boolean {
  if (manifest.translationKeys.includes(key)) return true;
  if (!manifest.keyPatterns?.length) return false;
  return manifest.keyPatterns.some((pattern) => {
    if (pattern.endsWith('.*')) {
      return key.startsWith(pattern.slice(0, -1));
    }
    if (pattern.includes('*')) {
      const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
      return new RegExp(`^${escaped}$`).test(key);
    }
    return pattern === key;
  });
}

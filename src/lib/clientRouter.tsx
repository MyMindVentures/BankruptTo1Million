import {
  createContext,
  type AnchorHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

export type RouterLocation = {
  pathname: string;
  search: string;
  hash: string;
  key: string;
};

type NavigateOptions = {
  replace?: boolean;
  preserveLanguage?: boolean;
  scroll?: boolean;
};

type RouterContextValue = {
  location: RouterLocation;
  href: (to: string, preserveLanguage?: boolean) => string;
  navigate: (to: string, options?: NavigateOptions) => void;
  isActive: (to: string, exact?: boolean) => boolean;
};

const RouterContext = createContext<RouterContextValue | null>(null);

function readLocation(): RouterLocation {
  const { pathname, search, hash } = window.location;
  return { pathname, search, hash, key: `${pathname}${search}${hash}` };
}

function normalizePathname(pathname: string): string {
  const collapsed = pathname.replace(/\/{2,}/g, '/');
  return collapsed !== '/' ? collapsed.replace(/\/+$/, '') : '/';
}

function buildHref(to: string, currentSearch: string, preserveLanguage = true): string {
  const target = new URL(to, window.location.origin);
  target.pathname = normalizePathname(target.pathname);

  if (preserveLanguage) {
    const language = new URLSearchParams(currentSearch).get('lang');
    if (language && !target.searchParams.has('lang')) target.searchParams.set('lang', language);
  }

  return `${target.pathname}${target.search}${target.hash}`;
}

function shouldHandleAnchor(event: MouseEvent, anchor: HTMLAnchorElement): boolean {
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    anchor.target ||
    anchor.hasAttribute('download') ||
    anchor.getAttribute('rel')?.split(/\s+/).includes('external')
  ) return false;

  const url = new URL(anchor.href, window.location.href);
  return url.origin === window.location.origin;
}

function scrollToLocation(hash: string, behavior: ScrollBehavior = 'auto') {
  if (!hash) {
    window.scrollTo({ top: 0, left: 0, behavior });
    return;
  }

  const id = decodeURIComponent(hash.slice(1));
  window.requestAnimationFrame(() => {
    document.getElementById(id)?.scrollIntoView({ behavior, block: 'start' });
  });
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<RouterLocation>(readLocation);

  const syncLocation = useCallback(() => setLocation(readLocation()), []);

  const navigate = useCallback((to: string, options: NavigateOptions = {}) => {
    const nextHref = buildHref(to, window.location.search, options.preserveLanguage !== false);
    const currentHref = `${window.location.pathname}${window.location.search}${window.location.hash}`;

    if (nextHref === currentHref) {
      if (options.scroll !== false) scrollToLocation(window.location.hash, 'smooth');
      return;
    }

    window.history[options.replace ? 'replaceState' : 'pushState']({}, '', nextHref);
    syncLocation();
  }, [syncLocation]);

  useEffect(() => {
    const onPopState = () => syncLocation();
    const onDocumentClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      const anchor = target?.closest<HTMLAnchorElement>('a[href]');
      if (!anchor || !shouldHandleAnchor(event, anchor)) return;

      event.preventDefault();
      navigate(anchor.href, { preserveLanguage: false });
    };

    window.addEventListener('popstate', onPopState);
    document.addEventListener('click', onDocumentClick);
    return () => {
      window.removeEventListener('popstate', onPopState);
      document.removeEventListener('click', onDocumentClick);
    };
  }, [navigate, syncLocation]);

  useEffect(() => {
    scrollToLocation(location.hash);
  }, [location.key]);

  const value = useMemo<RouterContextValue>(() => ({
    location,
    href: (to, preserveLanguage = true) => buildHref(to, location.search, preserveLanguage),
    navigate,
    isActive: (to, exact = false) => {
      const target = new URL(buildHref(to, location.search), window.location.origin);
      const targetPath = normalizePathname(target.pathname);
      const currentPath = normalizePathname(location.pathname);
      const pathMatches = exact
        ? currentPath === targetPath
        : currentPath === targetPath || (targetPath !== '/' && currentPath.startsWith(`${targetPath}/`));
      const hashMatches = !target.hash || target.hash === location.hash;
      return pathMatches && hashMatches;
    },
  }), [location, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterContextValue {
  const router = useContext(RouterContext);
  if (!router) throw new Error('useRouter must be used within RouterProvider');
  return router;
}

type RouterLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  to: string;
  replace?: boolean;
  preserveLanguage?: boolean;
};

export function RouterLink({
  to,
  replace = false,
  preserveLanguage = true,
  onClick,
  ...props
}: RouterLinkProps) {
  const router = useRouter();
  const href = router.href(to, preserveLanguage);

  const handleClick = (event: ReactMouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      props.target ||
      props.download
    ) return;

    event.preventDefault();
    router.navigate(to, { replace, preserveLanguage });
  };

  return <a {...props} href={href} onClick={handleClick} />;
}

import { useEffect, useState } from 'react';

export type RouteKey =
  | 'home'
  | 'dashboard'
  | 'meal-plan'
  | 'recipes'
  | 'recipe'
  | 'tracker'
  | 'map'
  | 'learn'
  | 'care'
  | 'account';

export interface Route {
  key: RouteKey;
  param?: string;
}

function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, '').split('?')[0];
  const [first, second] = path.split('/');
  switch (first) {
    case '':
      return { key: 'home' };
    case 'recipes':
      return second ? { key: 'recipe', param: second } : { key: 'recipes' };
    case 'dashboard':
    case 'meal-plan':
    case 'tracker':
    case 'map':
    case 'learn':
    case 'care':
    case 'account':
      return { key: first };
    default:
      return { key: 'home' };
  }
}

export function href(path: string): string {
  return `#/${path.replace(/^\//, '')}`;
}

export function navigate(path: string) {
  window.location.hash = href(path);
}

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  return route;
}

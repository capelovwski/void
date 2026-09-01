import { useEffect, useState } from 'react';

/** Mesmos limites declarados em `@theme` no src/index.css. */
export const BREAKPOINTS = { tablet: 810, desktop: 1200 } as const;

export type Breakpoint = 'mobile' | 'tablet' | 'desktop';

function readBreakpoint(): Breakpoint {
  const width = window.innerWidth;
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
}

/**
 * Ponto único de decisão entre os dois layouts.
 *
 * O CSS resolve a maior parte da responsividade; este hook existe para os casos
 * em que a estrutura muda de verdade — o Horizonte em grade de 31x12 no desktop
 * e em lista rolável no mobile são componentes diferentes, não o mesmo com
 * outro padding. Os limites vêm das mesmas constantes do Tailwind para os dois
 * lados nunca discordarem sobre onde o layout vira.
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>(readBreakpoint);

  useEffect(() => {
    // `resize` também dispara em rotação de tela e ao abrir o teclado no iOS,
    // então o valor inicial calculado no useState não precisa ser refeito aqui.
    const onResize = () => setBreakpoint(readBreakpoint());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return breakpoint;
}

export function useIsMobile(): boolean {
  return useBreakpoint() === 'mobile';
}

export function useIsDesktop(): boolean {
  return useBreakpoint() === 'desktop';
}

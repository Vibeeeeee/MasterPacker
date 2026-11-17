'use client';

import Link from 'next/link';
import { useThemeContext } from '@/components/ThemeProvider';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/', label: 'Inventory' },
  { href: '/boxes', label: 'Boxes' },
  { href: '/trips', label: 'Trips' },
  { href: '/tags', label: 'Tags' },
  { href: '/settings', label: 'Settings' },
];

export default function Header() {
  const { resolvedTheme, toggleTheme } = useThemeContext();
  const pathname = usePathname();

  const isAuthPage = pathname?.startsWith('/login') || pathname?.startsWith('/register');

  if (isAuthPage) {
    return null;
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/' || pathname?.startsWith('/items');
    return pathname?.startsWith(href);
  };

  return (
    <header
      className="sticky top-0 z-30 border-b"
      style={{
        background: 'var(--surface-glass)',
        borderColor: 'var(--surface-border)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                boxShadow: '0 4px 14px var(--accent-glow)',
              }}
            >
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 20l6-13 3.5 7.5L15 11l6 9H3z" />
              </svg>
            </div>
            <div className="leading-tight">
              <span className="block text-lg font-extrabold tracking-tight" style={{ color: 'var(--ink-900)' }}>
                Master<span className="text-gradient">Packer</span>
              </span>
              <span className="hidden sm:block text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'var(--ink-400)' }}>
                Pack everything
              </span>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-1 p-1 rounded-full" style={{ background: 'var(--surface-glass-strong)', border: '1px solid var(--surface-border)' }}>
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all"
                  style={active ? {
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                    color: '#fff',
                    boxShadow: '0 2px 10px var(--accent-glow)',
                  } : {
                    color: 'var(--ink-500)',
                  }}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full transition-all"
            style={{ background: 'var(--surface-glass-strong)', border: '1px solid var(--surface-border)' }}
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" style={{ color: 'var(--ink-500)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden border-t" style={{ borderColor: 'var(--surface-border)' }}>
        <div className="px-3 py-2 flex gap-1.5 overflow-x-auto">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className="px-3.5 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap"
                style={active ? {
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-strong))',
                  color: '#fff',
                } : {
                  color: 'var(--ink-500)',
                  background: 'var(--surface-glass-strong)',
                  border: '1px solid var(--surface-border)',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useCircleTransition } from '@/components/CircleTransition';
import { useI18n, useT } from '@/components/I18nProvider';
import { Languages, Layers, LogIn, LogOut, User } from '@/components/icons';
import { cn } from '@/lib/cn';
import { LANGUAGE_NAMES, LOCALES, type Locale } from '@/lib/i18n';

interface AccountButtonProps {
  className?: string;
}

const MENU_EASE = [0.4, 0, 0.2, 1] as const;

/**
 * Round account control living in the search bar's trailing corner: the entry
 * point to signing in, switching account and — once they exist — the maps of
 * saved places.
 *
 * The saved-maps entry stays inert until those exist; it is the only one
 * that does.
 *
 * @param props - Extra classes for the trigger.
 * @returns The account button and its menu.
 */
export default function AccountButton({ className }: AccountButtonProps) {
  const t = useT();
  const { locale, setLocale } = useI18n();
  const { navigate } = useCircleTransition();
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const goToMaps = () => {
    setOpen(false);
    navigate('/maps', { mode: 'fade' });
  };

  const goToLogin = () => {
    setOpen(false);
    const rect = triggerRef.current?.getBoundingClientRect();
    navigate('/login', {
      origin: rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : undefined,
      tone: 'black',
    });
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-label={t('account_label')}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={cn(
          'bg-surface2 text-ink2 hover:bg-surface3 hover:text-ink flex size-9 items-center justify-center rounded-pill transition-colors',
          open && 'bg-emerald-soft text-emerald-deep',
          className,
        )}>
        <User size={18} />
      </button>

      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16, ease: MENU_EASE }}
            className="bg-surface shadow-e3 border-line absolute end-0 top-[calc(100%+10px)] z-50 w-60 overflow-hidden rounded-lg border">
            <div className="border-line flex items-center gap-2.5 border-b px-4 py-3">
              <span className="bg-emerald-soft text-emerald-deep flex size-8 shrink-0 items-center justify-center rounded-pill">
                <User size={16} />
              </span>
              <span className="min-w-0">
                <span className="text-ink block truncate text-[13.5px] font-semibold tracking-tight">
                  {user?.name || user?.email || t('account_guest')}
                </span>
                <span className="text-mute block truncate font-mono text-[11px]">
                  {user ? user.email : t('account_signed_out')}
                </span>
              </span>
            </div>

            {user ? (
              <MenuItem
                icon={<LogOut size={16} />}
                label={t('account_sign_out')}
                onClick={() => {
                  setOpen(false);
                  void signOut();
                }}
              />
            ) : (
              <MenuItem
                icon={<LogIn size={16} />}
                label={t('account_sign_in')}
                onClick={goToLogin}
              />
            )}
            <MenuItem
              icon={<Layers size={16} />}
              label={t('account_my_maps')}
              onClick={() => goToMaps()}
            />

            <div className="border-line border-t px-4 py-3">
              <label className="text-mute flex items-center gap-2 font-mono text-[11px]">
                <Languages size={14} />
                {t('lang_label')}
              </label>
              <select
                value={locale}
                onChange={event => setLocale(event.target.value as Locale)}
                aria-label={t('lang_label')}
                className="border-line bg-surface2 text-ink mt-2 w-full rounded-md border px-2 py-1.5 text-[13px] outline-none">
                {LOCALES.map(code => (
                  <option key={code} value={code}>
                    {LANGUAGE_NAMES[code]}
                  </option>
                ))}
              </select>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/**
 * One row of the account menu. Disabled until authentication lands, so the
 * menu shows its shape without pretending to work.
 *
 * @param props - Row icon, label and an optional trailing badge.
 * @returns The menu row.
 */
function MenuItem({
  icon,
  label,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={!onClick}
      className="text-ink hover:bg-surface2 flex w-full items-center gap-2.5 px-4 py-2.5 text-start text-[13.5px] font-medium transition-colors disabled:opacity-45 disabled:hover:bg-transparent">
      <span className="text-mute shrink-0">{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="bg-surface2 text-mute shrink-0 rounded-pill px-2 py-0.5 font-mono text-[10px]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

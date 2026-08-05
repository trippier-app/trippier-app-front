'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import { useCircleTransition } from '@/components/CircleTransition';
import { useT } from '@/components/I18nProvider';
import { ArrowLeft, User } from '@/components/icons';

type Mode = 'signIn' | 'signUp';

/**
 * Standalone account screen: signing in and creating an account share one
 * form, since the fields differ only by an optional display name.
 *
 * The screen is born from the transition's black disc, so it keeps that black
 * rather than dressing it up: fields are hairlines on the void, and the anchor
 * is the app's own map pin at portrait scale — on the map a place is an
 * emerald pin, and here the person is the one the map cannot place yet.
 *
 * @returns The login screen.
 */
export default function LoginScreen() {
  const t = useT();
  const { navigate } = useCircleTransition();
  const { signIn, signUp } = useAuth();
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === 'signUp';

  const leave = (event: React.MouseEvent<HTMLElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    navigate('/discover', {
      origin: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 },
      tone: 'white',
    });
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isSignUp) {
        await signUp(email, password, name.trim() || undefined);
      } else {
        await signIn(email, password);
      }
      navigate('/discover', { tone: 'white' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('auth_error_generic'));
      setBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-black text-white">
      <div className="p-6">
        <button
          type="button"
          aria-label={t('auth_close')}
          onClick={leave}
          className="flex size-[42px] items-center justify-center rounded-pill border border-white/15 text-white transition-colors hover:border-white/40 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
          <ArrowLeft size={20} />
        </button>
      </div>

      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className="mx-auto flex w-full max-w-[380px] flex-1 flex-col justify-center px-6 pb-16">
        <span className="bg-emerald mb-7 flex size-12 items-center justify-center rounded-pill text-white ring-2 ring-white/90">
          <User size={22} />
        </span>

        <h1 className="text-[42px] leading-[1.05] font-bold tracking-[-1.6px]">
          {t(isSignUp ? 'auth_sign_up_title' : 'auth_sign_in_title')}
          <span className="text-emerald">.</span>
        </h1>
        <p className="text-emerald mt-3 font-mono text-[12px] tracking-[0.6px] lowercase">
          {t(isSignUp ? 'auth_sign_up_caption' : 'auth_sign_in_caption')}
        </p>

        <form onSubmit={submit} className="mt-9 flex flex-col gap-6">
          {isSignUp ? (
            <Field
              label={t('auth_name_optional')}
              type="text"
              value={name}
              onChange={setName}
              autoComplete="name"
            />
          ) : null}
          <Field
            label={t('auth_email')}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label={t('auth_password')}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            hint={isSignUp ? t('auth_password_hint') : undefined}
            minLength={isSignUp ? 6 : undefined}
            required
          />

          {error ? (
            <p role="alert" className="font-mono text-[12px] text-red-400">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="bg-emerald hover:bg-emerald-deep mt-1 rounded-pill py-[15px] text-[15px] font-semibold tracking-[-0.1px] text-white transition-colors focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-50">
            {busy ? t('auth_working') : t(isSignUp ? 'auth_submit_sign_up' : 'auth_submit_sign_in')}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(isSignUp ? 'signIn' : 'signUp');
            setError(null);
          }}
          className="mt-8 self-start font-mono text-[12px] tracking-[0.4px] text-white/45 underline-offset-4 transition-colors hover:text-white hover:underline focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none">
          {t(isSignUp ? 'auth_to_sign_in' : 'auth_to_sign_up')}
        </button>
      </motion.div>
    </div>
  );
}

/**
 * One form field: a mono label over a bare input on the void, underlined by a
 * hairline that turns emerald on focus. No filled box — a grey slab on pure
 * black reads as an inverted light-theme form.
 *
 * @param props - Label, input attributes and the controlled value.
 * @returns The field.
 */
function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  hint,
  minLength,
  required,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  hint?: string;
  minLength?: number;
  required?: boolean;
}) {
  return (
    <label className="group flex flex-col gap-2">
      <span className="font-mono text-[11px] tracking-[0.7px] text-white/45 lowercase">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={event => onChange(event.target.value)}
        autoComplete={autoComplete}
        minLength={minLength}
        required={required}
        className="focus:border-emerald border-b border-white/15 bg-transparent pb-2 text-[17px] tracking-[-0.2px] text-white transition-colors outline-none"
      />
      {hint ? (
        <span className="font-mono text-[11px] tracking-[0.4px] text-white/30">{hint}</span>
      ) : null}
    </label>
  );
}

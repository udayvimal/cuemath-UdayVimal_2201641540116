import React from 'react';

/**
 * Button variants:
 *   primary   — filled indigo, main actions
 *   secondary — outlined, secondary actions
 *   danger    — red, destructive actions
 *   ghost     — no border, subtle actions
 *   rating-*  — special rating buttons (again/hard/good/easy)
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  className = '',
  ...rest
}) {
  const base = 'btn';
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-danger',
    ghost: 'btn-ghost',
    'rating-again': 'btn-rating-again',
    'rating-hard': 'btn-rating-hard',
    'rating-good': 'btn-rating-good',
    'rating-easy': 'btn-rating-easy',
  };
  const sizes = {
    sm: 'btn-sm',
    md: 'btn-md',
    lg: 'btn-lg',
    xl: 'btn-xl',
  };

  const classes = [
    base,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    fullWidth ? 'btn-full' : '',
    loading ? 'btn-loading' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      className={classes}
      disabled={disabled || loading}
      onClick={onClick}
      {...rest}
    >
      {loading && <span className="btn-spinner" aria-hidden="true" />}
      {children}
    </button>
  );
}

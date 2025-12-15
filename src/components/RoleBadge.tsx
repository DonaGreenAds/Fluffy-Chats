'use client';

import { Crown, Shield, Eye } from 'lucide-react';
import { UserRole } from '@/types/auth';
import { ROLE_DISPLAY } from '@/lib/permissions';
import clsx from 'clsx';

interface RoleBadgeProps {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showDescription?: boolean;
  className?: string;
}

const ROLE_ICONS = {
  owner: Crown,
  admin: Shield,
  viewer: Eye,
};

const SIZE_CLASSES = {
  sm: {
    badge: 'px-2 py-0.5 text-xs gap-1',
    icon: 'w-3 h-3',
    iconWrapper: 'w-4 h-4',
  },
  md: {
    badge: 'px-2.5 py-1 text-sm gap-1.5',
    icon: 'w-3.5 h-3.5',
    iconWrapper: 'w-5 h-5',
  },
  lg: {
    badge: 'px-3 py-1.5 text-base gap-2',
    icon: 'w-4 h-4',
    iconWrapper: 'w-6 h-6',
  },
};

export default function RoleBadge({
  role,
  size = 'md',
  showLabel = true,
  showDescription = false,
  className,
}: RoleBadgeProps) {
  const display = ROLE_DISPLAY[role];
  const Icon = ROLE_ICONS[role];
  const sizeClasses = SIZE_CLASSES[size];

  return (
    <div className={clsx('inline-flex flex-col', className)}>
      <div
        className={clsx(
          'inline-flex items-center rounded-full font-medium',
          display.bgColor,
          display.color,
          `border ${display.borderColor}`,
          sizeClasses.badge
        )}
      >
        <span
          className={clsx(
            'inline-flex items-center justify-center rounded-full bg-gradient-to-br',
            display.gradient,
            sizeClasses.iconWrapper
          )}
        >
          <Icon className={clsx(sizeClasses.icon, 'text-white')} />
        </span>
        {showLabel && <span>{display.label}</span>}
      </div>
      {showDescription && (
        <p className="text-xs text-[var(--muted-foreground)] mt-1 max-w-[200px]">
          {display.description}
        </p>
      )}
    </div>
  );
}

// Minimal icon-only version for compact spaces
export function RoleIcon({
  role,
  size = 'md',
  className,
}: {
  role: UserRole;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const display = ROLE_DISPLAY[role];
  const Icon = ROLE_ICONS[role];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  const innerIconSizes = {
    sm: 'w-2.5 h-2.5',
    md: 'w-3 h-3',
    lg: 'w-3.5 h-3.5',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded-full bg-gradient-to-br',
        display.gradient,
        iconSizes[size],
        className
      )}
      title={display.label}
    >
      <Icon className={clsx(innerIconSizes[size], 'text-white')} />
    </span>
  );
}

// Selector component for choosing roles
export function RoleSelector({
  value,
  onChange,
  disabled,
  excludeRoles = [],
  className,
}: {
  value: UserRole;
  onChange: (role: UserRole) => void;
  disabled?: boolean;
  excludeRoles?: UserRole[];
  className?: string;
}) {
  const allRoles: UserRole[] = ['owner', 'admin', 'viewer'];
  const roles = allRoles.filter((r) => !excludeRoles.includes(r));

  return (
    <div className={clsx('flex gap-2', className)}>
      {roles.map((role) => {
        const display = ROLE_DISPLAY[role];
        const Icon = ROLE_ICONS[role];
        const isSelected = value === role;

        return (
          <button
            key={role}
            type="button"
            disabled={disabled}
            onClick={() => onChange(role)}
            className={clsx(
              'flex items-center gap-2 px-3 py-2 rounded-lg border transition-all',
              isSelected
                ? `${display.bgColor} ${display.borderColor} ${display.color} ring-2 ring-offset-1`
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)] hover:text-[var(--foreground)]',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              ...(isSelected && {
                '--tw-ring-color': role === 'owner' ? '#f59e0b' : role === 'admin' ? '#6366f1' : '#64748b',
              } as React.CSSProperties),
            }}
          >
            <span
              className={clsx(
                'inline-flex items-center justify-center w-5 h-5 rounded-full',
                isSelected ? `bg-gradient-to-br ${display.gradient}` : 'bg-[var(--muted)]'
              )}
            >
              <Icon className={clsx('w-3 h-3', isSelected ? 'text-white' : 'text-[var(--muted-foreground)]')} />
            </span>
            <span className="text-sm font-medium">{display.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// Card variant for detailed role display
export function RoleCard({
  role,
  isSelected,
  onClick,
  disabled,
  className,
}: {
  role: UserRole;
  isSelected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}) {
  const display = ROLE_DISPLAY[role];
  const Icon = ROLE_ICONS[role];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        'flex flex-col items-center p-4 rounded-xl border transition-all text-center',
        isSelected
          ? `${display.bgColor} ${display.borderColor} ring-2 ring-offset-2`
          : 'border-[var(--border)] hover:border-[var(--primary)] hover:shadow-md',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
      style={{
        ...(isSelected && {
          '--tw-ring-color': role === 'owner' ? '#f59e0b' : role === 'admin' ? '#6366f1' : '#64748b',
        } as React.CSSProperties),
      }}
    >
      <span
        className={clsx(
          'inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br mb-3',
          display.gradient
        )}
      >
        <Icon className="w-6 h-6 text-white" />
      </span>
      <h4 className={clsx('font-semibold', isSelected ? display.color : 'text-[var(--foreground)]')}>
        {display.label}
      </h4>
      <p className="text-xs text-[var(--muted-foreground)] mt-1">{display.description}</p>
    </button>
  );
}

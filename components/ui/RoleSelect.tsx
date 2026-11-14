'use client';

import { ROLES, type Role } from '@/lib/roles';

const LABELS: Record<Role, string> = { admin: 'Admin', editor: 'Editor', seller: 'Seller', viewer: 'Viewer' };

export function roleLabel(role: Role): string {
  return LABELS[role];
}

/** Role dropdown. With `autoSubmit` it submits its form as soon as the value changes. */
export function RoleSelect({
  name = 'role',
  defaultValue,
  autoSubmit = false,
  label,
}: {
  name?: string;
  defaultValue: Role;
  autoSubmit?: boolean;
  label: string;
}) {
  return (
    <select
      name={name}
      className="select"
      aria-label={label}
      defaultValue={defaultValue}
      onChange={autoSubmit ? (e) => e.currentTarget.form?.requestSubmit() : undefined}
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {LABELS[role]}
        </option>
      ))}
    </select>
  );
}

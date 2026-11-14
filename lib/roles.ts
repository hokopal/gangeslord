export type Role = 'admin' | 'editor' | 'seller' | 'viewer';

export type Action =
  | 'content.read'
  | 'content.write'
  | 'content.publish'
  | 'content.delete'
  | 'links.write'
  | 'analytics.read'
  | 'settings.read'
  | 'settings.write'
  | 'members.manage';

export const ROLES: readonly Role[] = ['admin', 'editor', 'seller', 'viewer'];

const PERMISSIONS: Record<Role, ReadonlySet<Action>> = {
  admin: new Set<Action>([
    'content.read', 'content.write', 'content.publish', 'content.delete',
    'links.write', 'analytics.read', 'settings.read', 'settings.write', 'members.manage',
  ]),
  editor: new Set<Action>([
    'content.read', 'content.write', 'content.publish', 'links.write', 'analytics.read', 'settings.read',
  ]),
  // A seller shares rooms and follows up: personal links and analytics, but no editing.
  seller: new Set<Action>(['content.read', 'links.write', 'analytics.read']),
  viewer: new Set<Action>(['content.read', 'analytics.read']),
};

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role].has(action);
}

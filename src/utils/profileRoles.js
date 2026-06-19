/** Infer operator + household capabilities from profile fields (handles legacy single-role rows). */
export function getProfileRoles(profile) {
  if (!profile) return [];

  const roles = new Set();

  if (Array.isArray(profile.roles)) {
    profile.roles.forEach((r) => {
      if (r === 'operator' || r === 'household') roles.add(r);
    });
  } else if (typeof profile.roles === 'string') {
    try {
      const parsed = JSON.parse(profile.roles);
      if (Array.isArray(parsed)) {
        parsed.forEach((r) => {
          if (r === 'operator' || r === 'household') roles.add(r);
        });
      }
    } catch {
      /* ignore */
    }
  }

  if (profile.has_operator) roles.add('operator');
  if (profile.has_household) roles.add('household');

  if (profile.operator_barangay_code || profile.operator_barangay_name) {
    roles.add('operator');
  }

  if (profile.household_id) roles.add('household');

  const status = String(profile.status ?? '').toLowerCase();
  if (status === 'pending' || status === 'rejected') roles.add('household');

  const primary = String(profile.role ?? '').toLowerCase().trim();
  if (primary === 'operator' || primary === 'household') roles.add(primary);

  if (roles.size === 0) return ['operator'];

  const ordered = [];
  if (roles.has('operator')) ordered.push('operator');
  if (roles.has('household')) ordered.push('household');
  return ordered;
}

export function profileHasRole(profile, role) {
  return getProfileRoles(profile).includes(role);
}

export function rolesKey(profile) {
  return getProfileRoles(profile).join('|');
}

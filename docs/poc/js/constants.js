export const PHASES = [
  { id: 0, label: 'Requirements', color: 'bg-slate-400', actionRequired: false },
  { id: 1, label: 'Research', color: 'bg-indigo-500', actionRequired: false },
  { id: 2, label: 'Review PRD', color: 'bg-pink-500', actionRequired: true },
  { id: 3, label: 'Planning', color: 'bg-sky-500', actionRequired: false },
  { id: 4, label: 'Review Plan', color: 'bg-purple-500', actionRequired: true },
  { id: 5, label: 'Implementation', color: 'bg-amber-500', actionRequired: false },
  { id: 6, label: 'QA Check', color: 'bg-orange-500', actionRequired: true },
  { id: 7, label: 'Final Approval', color: 'bg-emerald-600', actionRequired: true },
  { id: 8, label: 'Live', color: 'bg-emerald-500', actionRequired: false },
];

/**
 * Feature suggestion presets for quick demo feature creation
 * These are only used to pre-fill the form, not as actual data
 */
export const PRESETS = [
  {
    title: 'SSO Integration',
    description:
      'Implement Single Sign-On using SAML 2.0/OIDC. Integrate with Okta and Google Workspace.',
    priority: 'high',
    tags: [
      { id: 'tag_sso_1', label: 'Security', color: 'red' },
      { id: 'tag_sso_2', label: 'Auth', color: 'purple' },
    ],
  },
  {
    title: 'API Rate Limiting',
    description: 'Implement sliding window rate limiting for public endpoints using Redis.',
    priority: 'high',
    tags: [
      { id: 'tag_rate_1', label: 'API', color: 'blue' },
      { id: 'tag_rate_2', label: 'Performance', color: 'amber' },
    ],
  },
  {
    title: 'Audit Logging',
    description:
      'Track all create/update/delete actions on critical resources with 90-day retention.',
    priority: 'medium',
    tags: [
      { id: 'tag_audit_1', label: 'Compliance', color: 'slate' },
      { id: 'tag_audit_2', label: 'Logging', color: 'indigo' },
    ],
  },
  {
    title: 'Dark Mode Support',
    description: 'Implement system-wide theme switching with Tailwind dark variant.',
    priority: 'low',
    tags: [
      { id: 'tag_dark_1', label: 'UI', color: 'emerald' },
      { id: 'tag_dark_2', label: 'UX', color: 'teal' },
    ],
  },
  {
    title: '2FA Authentication',
    description: 'Add TOTP based two-factor authentication with QR codes.',
    priority: 'critical',
    tags: [
      { id: 'tag_2fa_1', label: 'Security', color: 'red' },
      { id: 'tag_2fa_2', label: 'Auth', color: 'purple' },
    ],
  },
  {
    title: 'Real-time Notifications',
    description: 'WebSocket-based push notifications for user actions and system events.',
    priority: 'medium',
    tags: [
      { id: 'tag_notif_1', label: 'WebSocket', color: 'cyan' },
      { id: 'tag_notif_2', label: 'UX', color: 'teal' },
    ],
  },
  {
    title: 'Data Export Feature',
    description: 'Allow users to export their data in CSV, JSON, and PDF formats.',
    priority: 'low',
    tags: [
      { id: 'tag_export_1', label: 'Data', color: 'indigo' },
      { id: 'tag_export_2', label: 'UX', color: 'teal' },
    ],
  },
];

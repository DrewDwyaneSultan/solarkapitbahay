import React from 'react';
import Card from '../components/ui/Card';

const labels = {
  dashboard: 'Dashboard',
  households: 'Households',
  alerts: 'Alerts',
  settings: 'Settings',
};

export default function ComingSoonPage({ pageId }) {
  const title = labels[pageId] ?? 'Page';

  return (
    <Card>
      <p className="font-serif text-xl text-sk-ink mb-2">{title}</p>
      <p className="text-sm text-sk-ink-muted">
        This section is ready to be wired — add your route component here when the feature is built.
      </p>
    </Card>
  );
}

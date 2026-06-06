import React from 'react';
import CommunityBatteryScene from './CommunityBatteryScene';

export default function BatteryOrganism({ data, capacityKwh = 100 }) {
  return (
    <div className="rounded-2xl border border-[#e2e8ee] bg-white shadow-sm overflow-hidden p-1 sm:p-2">
      <CommunityBatteryScene data={data} capacityKwh={capacityKwh} />
    </div>
  );
}

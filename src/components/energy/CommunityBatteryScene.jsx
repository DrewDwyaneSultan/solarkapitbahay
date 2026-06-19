import React from 'react';

const FONT = 'system-ui, -apple-system, sans-serif';
const BAR_W = 688;
const BATT_FILL_H = 107;
const VIEW_H = 505;
const BAR_Y = 68;
const SCENE_Y = 55;
const PANEL_Y = 78;

function fmtW(w) {
  return w >= 0 ? `+${w}W` : `${w}W`;
}

/** Parallelogram shadow aligned to isometric base — covers front slab + side panel footprint */
function HouseFootprintShadow({ id, points }) {
  return (
    <polygon points={points} fill={`url(#${id})`} />
  );
}

export default function CommunityBatteryScene({ data, capacityKwh = 100 }) {
  const pct = Math.round(data.battery);
  const kwhNow = Math.round(pct * capacityKwh * 0.01);

  const surplusA = data.houseA.solar - data.houseA.load;
  const surplusB = data.houseB.solar - data.houseB.load;
  const aSends = surplusA >= surplusB && surplusA > 0;
  const transferW = Math.min(
    Math.abs(surplusA),
    Math.max(0, aSends ? data.houseB.load - data.houseB.solar : data.houseA.load - data.houseA.solar),
  );
  const flowActive = transferW > 10;

  const fillH = (pct / 100) * BATT_FILL_H;
  const fillY = 96 + (BATT_FILL_H - fillH);
  const barFillW = (pct / 100) * BAR_W;

  const aSupply = surplusA > 0;
  const bSupply = surplusB > 0;
  const leftFlowClass = flowActive ? (aSends ? 'cb-fl-r' : 'cb-fl-l') : '';
  const rightFlowClass = flowActive ? (aSends ? 'cb-fl-l' : 'cb-fl-r') : '';

  const sender = aSends ? 'House A' : 'House B';
  const receiver = aSends ? 'House B' : 'House A';

  return (
    <svg
      width="100%"
      viewBox={`0 0 740 ${VIEW_H}`}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={`Community battery at ${pct}%. ${sender} sharing energy with ${receiver}.`}
      className="block max-w-full"
    >
      <title>Community Battery Dashboard</title>

      <defs>
        {/* Front (bottom-left) → back (top-right) along isometric depth */}
        <linearGradient id="cb-shadow-a" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2C2C2A" stopOpacity="0.17" />
          <stop offset="50%" stopColor="#2C2C2A" stopOpacity="0.11" />
          <stop offset="100%" stopColor="#2C2C2A" stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id="cb-shadow-b" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2C2C2A" stopOpacity="0.17" />
          <stop offset="50%" stopColor="#2C2C2A" stopOpacity="0.11" />
          <stop offset="100%" stopColor="#2C2C2A" stopOpacity="0.04" />
        </linearGradient>
      </defs>

      <text x="26" y="30" fontSize="16" fontWeight="500" fill="#2C2C2A" fontFamily={FONT}>
        Community Battery
      </text>
      <text x="26" y="47" fontSize="12" fill="#888780" fontFamily={FONT}>
        House A &amp; House B · 2 circuits
      </text>
      <text x="714" y="30" fontSize="24" fontWeight="500" fill="#1D9E75" textAnchor="end" fontFamily={FONT}>
        {pct}%
      </text>
      <text x="714" y="47" fontSize="12" fill="#888780" textAnchor="end" fontFamily={FONT}>
        {kwhNow} / {capacityKwh} kWh
      </text>

      <rect x="26" y={BAR_Y} width={BAR_W} height="8" rx="4" fill="#E1F5EE" />
      <rect
        x="26"
        y={BAR_Y}
        width={barFillW}
        height="8"
        rx="4"
        fill="#1D9E75"
        className="cb-bar"
        style={{ transition: 'width 0.7s ease-out' }}
      />

      <g transform={`translate(0, ${SCENE_Y})`}>
      {/* House A */}
      <g>
        <HouseFootprintShadow
          id="cb-shadow-a"
          points="46,222 194,222 240,186 88,186"
        />
        <polygon points="148,92 156,87 156,72 148,77" fill="#B4B2A9" />
        <polygon points="156,87 164,82 164,67 156,72" fill="#C8C6BE" />
        <rect x="146" y="70" width="20" height="4" rx="1" fill="#888780" />
        <polygon points="50,215 190,215 232,187 92,187" fill="#B0AEA6" />
        <polygon points="190,138 232,110 232,187 190,215" fill="#C8C6BE" />
        <polygon points="50,138 190,138 190,215 50,215" fill="#E8E6DF" />
        <line x1="50" y1="160" x2="190" y2="160" stroke="#D3D1C7" strokeWidth="0.5" />
        <line x1="50" y1="182" x2="190" y2="182" stroke="#D3D1C7" strokeWidth="0.5" />
        <line x1="100" y1="138" x2="100" y2="160" stroke="#D3D1C7" strokeWidth="0.5" />
        <line x1="150" y1="138" x2="150" y2="160" stroke="#D3D1C7" strokeWidth="0.5" />
        <line x1="75" y1="160" x2="75" y2="182" stroke="#D3D1C7" strokeWidth="0.5" />
        <line x1="125" y1="160" x2="125" y2="182" stroke="#D3D1C7" strokeWidth="0.5" />
        <line x1="175" y1="160" x2="175" y2="182" stroke="#D3D1C7" strokeWidth="0.5" />
        <polygon points="190,138 232,110 162,64 120,92" fill="#C8C6BE" />
        <polygon points="50,138 190,138 120,92" fill="#E8E0D0" />
        <line x1="50" y1="138" x2="120" y2="92" stroke="#D4CCB8" strokeWidth="0.7" />
        <line x1="190" y1="138" x2="120" y2="92" stroke="#D4CCB8" strokeWidth="0.7" />
        <line x1="85" y1="115" x2="155" y2="115" stroke="#D4CCB8" strokeWidth="0.5" />
        <line x1="68" y1="127" x2="172" y2="127" stroke="#D4CCB8" strokeWidth="0.5" />
        <polygon points="198,120 224,104 220,98 194,114" fill="#2C4B7A" opacity={aSupply ? 0.85 : 0.4} />
        <polygon points="212,112 224,104 220,98 208,106" fill="#3A5F9A" opacity={aSupply ? 0.6 : 0.25} />
        <line x1="216" y1="101" x2="202" y2="117" stroke="#1a3560" strokeWidth="0.5" opacity="0.7" />
        <line x1="120" y1="92" x2="162" y2="64" stroke="#B8B0A0" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="105" y="179" width="32" height="36" rx="2" fill="#7A6548" />
        <rect x="105" y="179" width="32" height="36" rx="2" fill="none" stroke="#5C4A30" strokeWidth="0.8" />
        <rect x="109" y="183" width="10" height="13" rx="1" fill="#6B5A42" opacity="0.5" />
        <rect x="123" y="183" width="10" height="13" rx="1" fill="#6B5A42" opacity="0.5" />
        <circle cx="133" cy="198" r="2" fill="#C8A96A" />
        <rect x="55" y="143" width="36" height="28" rx="2" fill="#A8C8E8" opacity="0.9" />
        <rect x="55" y="143" width="36" height="28" rx="2" fill="none" stroke="#7AAACE" strokeWidth="0.6" />
        <line x1="73" y1="143" x2="73" y2="171" stroke="#7AAACE" strokeWidth="0.8" />
        <line x1="55" y1="157" x2="91" y2="157" stroke="#7AAACE" strokeWidth="0.8" />
        <rect x="152" y="143" width="30" height="28" rx="2" fill="#A8C8E8" opacity="0.9" />
        <rect x="152" y="143" width="30" height="28" rx="2" fill="none" stroke="#7AAACE" strokeWidth="0.6" />
        <line x1="167" y1="143" x2="167" y2="171" stroke="#7AAACE" strokeWidth="0.8" />
        <line x1="152" y1="157" x2="182" y2="157" stroke="#7AAACE" strokeWidth="0.8" />
        <polygon points="200,151 220,138 220,162 200,175" fill="#A8C8E8" opacity="0.65" />
        <polygon points="200,151 220,138 220,162 200,175" fill="none" stroke="#7AAACE" strokeWidth="0.7" />
        <line x1="210" y1="144" x2="210" y2="168" stroke="#7AAACE" strokeWidth="0.7" opacity="0.8" />
        <line x1="200" y1="163" x2="220" y2="150" stroke="#7AAACE" strokeWidth="0.7" opacity="0.8" />
        <rect
          x="66"
          y="93"
          width="64"
          height="17"
          rx="4"
          fill={data.houseA.online && data.houseA.relay ? '#1D9E75' : '#888780'}
        />
        <text x="98" y="106" textAnchor="middle" fontSize="10" fontWeight="500" fill="#E1F5EE" fontFamily={FONT}>
          House A · {!data.houseA.online ? 'OFFLINE' : data.houseA.relay ? 'ON' : 'OFF'}
        </text>
      </g>

      {/* House B */}
      <g>
        <HouseFootprintShadow
          id="cb-shadow-b"
          points="474,222 622,222 668,186 514,186"
        />
        <polygon points="576,92 584,87 584,72 576,77" fill="#E8A0A0" />
        <polygon points="584,87 592,82 592,67 584,72" fill="#F0B0B0" />
        <rect x="574" y="70" width="20" height="4" rx="1" fill="#D08080" />
        <polygon points="478,215 618,215 660,187 520,187" fill="#E0AAAA" />
        <polygon points="618,138 660,110 660,187 618,215" fill="#F7C1C1" />
        <polygon points="478,138 618,138 618,215 478,215" fill="#FCEBEB" />
        <line x1="478" y1="160" x2="618" y2="160" stroke="#F0C0C0" strokeWidth="0.5" />
        <line x1="478" y1="182" x2="618" y2="182" stroke="#F0C0C0" strokeWidth="0.5" />
        <line x1="528" y1="138" x2="528" y2="160" stroke="#F0C0C0" strokeWidth="0.5" />
        <line x1="578" y1="138" x2="578" y2="160" stroke="#F0C0C0" strokeWidth="0.5" />
        <line x1="503" y1="160" x2="503" y2="182" stroke="#F0C0C0" strokeWidth="0.5" />
        <line x1="553" y1="160" x2="553" y2="182" stroke="#F0C0C0" strokeWidth="0.5" />
        <line x1="603" y1="160" x2="603" y2="182" stroke="#F0C0C0" strokeWidth="0.5" />
        <polygon points="618,138 660,110 590,64 548,92" fill="#F0B0B0" />
        <polygon points="478,138 618,138 548,92" fill="#FCDDDD" />
        <line x1="478" y1="138" x2="548" y2="92" stroke="#F0C8C8" strokeWidth="0.7" />
        <line x1="618" y1="138" x2="548" y2="92" stroke="#F0C8C8" strokeWidth="0.7" />
        <line x1="513" y1="115" x2="583" y2="115" stroke="#F0C8C8" strokeWidth="0.5" />
        <line x1="496" y1="127" x2="600" y2="127" stroke="#F0C8C8" strokeWidth="0.5" />
        <polygon points="626,120 652,104 648,98 622,114" fill="#2C4B7A" opacity={bSupply ? 0.85 : 0.4} />
        <polygon points="640,112 652,104 648,98 636,106" fill="#3A5F9A" opacity={bSupply ? 0.6 : 0.25} />
        <line x1="644" y1="101" x2="630" y2="117" stroke="#1a3560" strokeWidth="0.5" opacity="0.35" />
        <line x1="548" y1="92" x2="590" y2="64" stroke="#D09090" strokeWidth="1.5" strokeLinecap="round" />
        <rect x="533" y="179" width="32" height="36" rx="2" fill="#B08070" />
        <rect x="533" y="179" width="32" height="36" rx="2" fill="none" stroke="#906050" strokeWidth="0.8" />
        <rect x="537" y="183" width="10" height="13" rx="1" fill="#A07060" opacity="0.5" />
        <rect x="551" y="183" width="10" height="13" rx="1" fill="#A07060" opacity="0.5" />
        <circle cx="561" cy="198" r="2" fill="#D4A080" />
        <rect x="483" y="143" width="36" height="28" rx="2" fill="#A8C8E8" opacity="0.5" />
        <rect x="483" y="143" width="36" height="28" rx="2" fill="none" stroke="#7AAACE" strokeWidth="0.6" />
        <line x1="501" y1="143" x2="501" y2="171" stroke="#7AAACE" strokeWidth="0.8" opacity="0.6" />
        <line x1="483" y1="157" x2="519" y2="157" stroke="#7AAACE" strokeWidth="0.8" opacity="0.6" />
        <rect x="580" y="143" width="30" height="28" rx="2" fill="#A8C8E8" opacity="0.5" />
        <rect x="580" y="143" width="30" height="28" rx="2" fill="none" stroke="#7AAACE" strokeWidth="0.6" />
        <line x1="595" y1="143" x2="595" y2="171" stroke="#7AAACE" strokeWidth="0.8" opacity="0.6" />
        <line x1="580" y1="157" x2="610" y2="157" stroke="#7AAACE" strokeWidth="0.8" opacity="0.6" />
        <polygon points="628,151 648,138 648,162 628,175" fill="#A8C8E8" opacity="0.4" />
        <polygon points="628,151 648,138 648,162 628,175" fill="none" stroke="#7AAACE" strokeWidth="0.7" />
        <line x1="638" y1="144" x2="638" y2="168" stroke="#7AAACE" strokeWidth="0.7" opacity="0.7" />
        <line x1="628" y1="163" x2="648" y2="150" stroke="#7AAACE" strokeWidth="0.7" opacity="0.7" />
        <rect
          x="494"
          y="93"
          width="64"
          height="17"
          rx="4"
          fill={data.houseB.online && data.houseB.relay ? '#1D9E75' : '#888780'}
        />
        <text x="526" y="106" textAnchor="middle" fontSize="10" fontWeight="500" fill="#F1EFE8" fontFamily={FONT}>
          House B · {!data.houseB.online ? 'OFFLINE' : data.houseB.relay ? 'ON' : 'OFF'}
        </text>
      </g>

      {/* Battery */}
      <g className="cb-batt">
        <rect x="326" y="82" width="70" height="8" rx="3" fill="#5DCAA5" />
        <rect x="314" y="88" width="94" height="122" rx="10" fill="#E1F5EE" stroke="#5DCAA5" strokeWidth="1" />
        <rect x="322" y="96" width="78" height="107" rx="7" fill="#9FE1CB" />
        <rect
          x="322"
          y={fillY}
          width="78"
          height={fillH}
          rx="7"
          fill="#1D9E75"
          style={{ transition: 'y 0.7s ease-out, height 0.7s ease-out' }}
        />
        <line x1="339" y1="143" x2="383" y2="143" stroke="#E1F5EE" strokeWidth="3.5" strokeLinecap="round" />
        <line x1="361" y1="121" x2="361" y2="165" stroke="#E1F5EE" strokeWidth="3.5" strokeLinecap="round" />
        <text x="361" y="228" textAnchor="middle" fontSize="14" fontWeight="500" fill="#0F6E56" fontFamily={FONT}>
          {pct}%
        </text>
        <text x="361" y="243" textAnchor="middle" fontSize="10" fill="#5DCAA5" fontFamily={FONT}>
          SHARED
        </text>
      </g>

      {/* Flow lines */}
      {flowActive && (
        <>
          <line
            className={leftFlowClass}
            x1="238"
            y1="175"
            x2="310"
            y2="150"
            stroke={aSends ? '#1D9E75' : '#E24B4A'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <line
            className={rightFlowClass}
            x1="412"
            y1="150"
            x2="474"
            y2="172"
            stroke={aSends ? '#E24B4A' : '#1D9E75'}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </>
      )}
      </g>

      <g transform={`translate(0, ${PANEL_Y})`}>
      {/* House A stat card */}
      <StatCard
        x={26}
        watts={surplusA}
        supply={aSupply}
        solar={data.houseA.solar}
        load={data.houseA.load}
        side="left"
      />

      {/* House B stat card */}
      <StatCard
        x={514}
        watts={surplusB}
        supply={bSupply}
        solar={data.houseB.solar}
        load={data.houseB.load}
        side="right"
      />

      {/* Footer */}
      {flowActive && (
        <g>
          <rect x="185" y="378" width="370" height="34" rx="8" fill="#F1EFE8" stroke="#D3D1C7" strokeWidth="0.5" />
          <text x="370" y="400" textAnchor="middle" fontSize="12" fontFamily={FONT}>
            <tspan fill="#0F6E56" fontWeight="500">
              {sender}
            </tspan>
            <tspan fill="#5F5E5A"> sharing ~{transferW}W with </tspan>
            <tspan fill="#A32D2D" fontWeight="500">
              {receiver}
            </tspan>
            <tspan fill="#5F5E5A"> via community battery</tspan>
          </text>
        </g>
      )}
      </g>
    </svg>
  );
}

function StatCard({ x, watts, supply, solar, load, side }) {
  const green = supply;
  const bg = green ? '#E1F5EE' : '#FCEBEB';
  const border = green ? '#5DCAA5' : '#F09595';
  const wattsFill = green ? '#0F6E56' : '#A32D2D';
  const labelFill = green ? '#5DCAA5' : '#F09595';
  const rowFill = green ? '#085041' : '#501313';
  const divider = green ? '#9FE1CB' : '#F7C1C1';
  const textX = side === 'left' ? x + 20 : x + 20;
  const valueEnd = x + 184;

  return (
    <g>
      <rect x={x} y="268" width="200" height="90" rx="10" fill={bg} stroke={border} strokeWidth="0.8" />
      <text x={textX} y="292" fontSize="20" fontWeight="500" fill={wattsFill} fontFamily={FONT}>
        {fmtW(watts)}
      </text>
      <text x={textX} y="308" fontSize="11" fill={labelFill} fontFamily={FONT}>
        {supply ? 'Supplying' : 'Drawing'}
      </text>
      <line x1={textX} y1="318" x2={valueEnd} y2="318" stroke={divider} strokeWidth="0.5" />
      <text x={textX} y="332" fontSize="11" fill={rowFill} fontFamily={FONT}>
        Solar
      </text>
      <text x={valueEnd} y="332" textAnchor="end" fontSize="11" fontWeight="500" fill={rowFill} fontFamily={FONT}>
        {solar}W
      </text>
      <text x={textX} y="348" fontSize="11" fill={rowFill} fontFamily={FONT}>
        Load
      </text>
      <text x={valueEnd} y="348" textAnchor="end" fontSize="11" fontWeight="500" fill={rowFill} fontFamily={FONT}>
        {load}W
      </text>
    </g>
  );
}

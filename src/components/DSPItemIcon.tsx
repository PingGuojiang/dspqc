import React, { useState, useEffect } from 'react';
import { DSPItem, DSPBelt, DSPSorter, DSPFacility } from '../data/dspData';

interface DSPItemIconProps {
  item?: DSPItem | null;
  size?: number; // size in pixels, default 24
  className?: string;
  showTooltip?: boolean;
}

export const DSPItemIcon: React.FC<DSPItemIconProps> = ({
  item,
  size = 24,
  className = '',
  showTooltip = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Reset error & load states if item or icon identity changes
  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [item?.id, item?.iconName, item?.iconUrl]);

  if (!item) {
    return (
      <div 
        style={{ width: size, height: size }}
        className={`rounded bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 ${className}`}
      >
        <span className="text-[10px] text-slate-500 font-mono">?</span>
      </div>
    );
  }

  // Calculate clean base URL
  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const iconSrc = item.iconName 
    ? `${cleanBase}dsp_icons/${item.iconName}.png`
    : item.iconUrl 
    ? (item.iconUrl.startsWith('/') && cleanBase !== '/' ? `${cleanBase}${item.iconUrl.slice(1)}` : item.iconUrl)
    : undefined;

  const symbolText = item.iconSymbol || (item.name ? item.name.slice(0, 2) : '??');
  const itemColor = item.color || '#38bdf8';

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-md overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 border border-slate-700/80 shadow-xs select-none ${className}`}
      title={showTooltip ? item.name : undefined}
    >
      {/* Fallback 1: CSS Sci-Fi Industrial Tech-Symbol Badge (Always present underneath) */}
      <div 
        className="absolute inset-0 flex items-center justify-center font-mono font-bold uppercase tracking-tighter select-none"
        style={{ 
          backgroundColor: `${itemColor}22`, 
          color: itemColor,
          fontSize: size <= 20 ? '8px' : size <= 28 ? '9px' : '11px',
        }}
      >
        {symbolText}
      </div>

      {/* Fallback 2: Real high-res DSP PNG loaded eagerly, reveals upon successful load without flicker or broken icon */}
      {!hasError && iconSrc && (
        <img
          src={iconSrc}
          alt={showTooltip ? item.name : ''}
          title={showTooltip ? item.name : undefined}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`relative z-10 w-full h-full object-contain p-0.5 transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
};

/** Product badge used by both workspaces: the same cyan outline and pixel shadow. */
export const DSPFramedItemIcon: React.FC<DSPItemIconProps> = ({ size = 24, ...props }) => (
  <div style={{ width: size + 8, height: size + 8 }} className="rounded-lg bg-black border-2 border-[#00f0ff] p-0.5 flex items-center justify-center shrink-0 shadow-[2px_2px_0px_#00f0ff]">
    <DSPItemIcon {...props} size={size} />
  </div>
);

// =========================================================================
// DSP Belt Item Icon Component (belt-1.png, belt-2.png, belt-3.png)
// =========================================================================
export interface DSPBeltIconProps {
  belt?: DSPBelt | null;
  tier?: 1 | 2 | 3;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

export const DSPBeltIcon: React.FC<DSPBeltIconProps> = ({
  belt,
  tier = belt?.tier || 1,
  size = 24,
  className = '',
  showTooltip = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [tier]);

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const iconSrc = `${cleanBase}dsp_icons/belt-${tier}.png`;

  const beltNames: Record<number, string> = {
    1: '传送带 Mk.I (黄带)',
    2: '高速传送带 Mk.II (绿带)',
    3: '极速传送带 Mk.III (蓝带)',
  };
  const beltColors: Record<number, string> = {
    1: '#eab308',
    2: '#22c55e',
    3: '#0ea5e9',
  };

  const displayName = belt?.name || beltNames[tier] || `传送带 T${tier}`;
  const color = belt?.color || beltColors[tier] || '#0ea5e9';

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-md overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 border border-slate-700/80 shadow-xs select-none ${className}`}
      title={showTooltip ? displayName : undefined}
    >
      {/* Fallback Badge */}
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-bold uppercase tracking-tighter select-none"
        style={{
          backgroundColor: `${color}25`,
          color,
          fontSize: size <= 20 ? '8px' : size <= 28 ? '9px' : '11px',
        }}
      >
        {`B${tier}`}
      </div>

      {!hasError && (
        <img
          src={iconSrc}
          alt={displayName}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`relative z-10 w-full h-full object-contain p-0.5 transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
};

// =========================================================================
// DSP Sorter (Inserter) Item Icon Component (inserter-1.png ~ inserter-4.png)
// =========================================================================
export interface DSPSorterIconProps {
  sorter?: DSPSorter | null;
  tier?: 1 | 2 | 3 | 4;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

export const DSPSorterIcon: React.FC<DSPSorterIconProps> = ({
  sorter,
  tier = sorter?.tier || 1,
  size = 24,
  className = '',
  showTooltip = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [tier]);

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const iconSrc = `${cleanBase}dsp_icons/inserter-${tier}.png`;

  const sorterNames: Record<number, string> = {
    1: '分拣器 Mk.I (黄爪)',
    2: '高速分拣器 Mk.II (绿爪)',
    3: '极速分拣器 Mk.III (蓝爪)',
    4: '集装分拣器 Mk.IV (白爪)',
  };
  const sorterColors: Record<number, string> = {
    1: '#eab308',
    2: '#22c55e',
    3: '#3b82f6',
    4: '#f8fafc',
  };

  const displayName = sorter?.name || sorterNames[tier] || `分拣器 T${tier}`;
  const color = sorter?.hexColor || sorterColors[tier] || '#3b82f6';

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-md overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 border border-slate-700/80 shadow-xs select-none ${className}`}
      title={showTooltip ? displayName : undefined}
    >
      {/* Fallback Badge */}
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-bold uppercase tracking-tighter select-none"
        style={{
          backgroundColor: `${color}25`,
          color,
          fontSize: size <= 20 ? '8px' : size <= 28 ? '9px' : '11px',
        }}
      >
        {`S${tier}`}
      </div>

      {!hasError && (
        <img
          src={iconSrc}
          alt={displayName}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`relative z-10 w-full h-full object-contain p-0.5 transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
};

// =========================================================================
// DSP Power Pole Icon Component (power-node-1, power-node-2, power-node-3)
// =========================================================================
export interface DSPPowerPoleIconProps {
  category?: 'tesla' | 'wireless' | 'satellite';
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

export const DSPPowerPoleIcon: React.FC<DSPPowerPoleIconProps> = ({
  category = 'tesla',
  size = 24,
  className = '',
  showTooltip = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [category]);

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const poleMeta = {
    tesla: { name: '电力感应塔', icon: 'tesla-coil', color: '#38bdf8', symbol: '塔' },
    wireless: { name: '无线输电塔', icon: 'charging-pole', color: '#22c55e', symbol: '线' },
    satellite: { name: '卫星配电站', icon: 'orbital-substation', color: '#a855f7', symbol: '星' },
  }[category] || { name: '电网塔', icon: 'tesla-coil', color: '#38bdf8', symbol: '塔' };

  const iconSrc = `${cleanBase}dsp_icons/${poleMeta.icon}.png`;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-md overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 border border-slate-700/80 shadow-xs select-none ${className}`}
      title={showTooltip ? poleMeta.name : undefined}
    >
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-bold uppercase tracking-tighter select-none"
        style={{
          backgroundColor: `${poleMeta.color}25`,
          color: poleMeta.color,
          fontSize: size <= 20 ? '8px' : size <= 28 ? '9px' : '11px',
        }}
      >
        {poleMeta.symbol}
      </div>

      {!hasError && (
        <img
          src={iconSrc}
          alt={poleMeta.name}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`relative z-10 w-full h-full object-contain p-0.5 transition-opacity duration-150 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
};

// =========================================================================
// DSP Facility Tech Code & Icon Component
// =========================================================================
export function getFacilityTechCode(facilityName: string): string {
  const match = facilityName.match(/(Mk\.[I|V|X]+)/i);
  if (match) return match[1];
  if (facilityName.includes('重组')) return 'Mk.Re';
  if (facilityName.includes('位面')) return 'Mk.II';
  if (facilityName.includes('负熵')) return 'Mk.III';
  if (facilityName.includes('自化')) return 'Mk.II';
  if (facilityName.includes('量子')) return 'Mk.II';
  if (facilityName.includes('对撞')) return 'Mk.Col';
  if (facilityName.includes('精炼')) return 'Mk.Ref';
  return 'Mk.I';
}

export interface DSPFacilityIconProps {
  facility: DSPFacility;
  size?: number;
  className?: string;
  showTooltip?: boolean;
}

export const DSPFacilityIcon: React.FC<DSPFacilityIconProps> = ({
  facility,
  size = 28,
  className = '',
  showTooltip = false,
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const techCode = getFacilityTechCode(facility.name);

  useEffect(() => {
    setHasError(false);
    setIsLoaded(false);
  }, [facility.id, facility.numericId, facility.iconName]);

  const baseUrl = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
  const cleanBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

  const iconFilename = facility.iconName || (facility.category === 'assembler' 
    ? (facility.id === 'assembler_1' ? 'assembler-1' : facility.id === 'assembler_2' ? 'assembler-2' : facility.id === 'assembler_3' ? 'assembler-3' : 'reassembler')
    : facility.category === 'smelter'
    ? (facility.id === 'smelter_1' ? 'smelter' : facility.id === 'smelter_plane' ? 'smelter-2' : 'negentropy')
    : facility.numericId || facility.id);

  const iconSrc = `${cleanBase}dsp_icons/${iconFilename}.png`;

  return (
    <div
      style={{ width: size, height: size }}
      className={`relative rounded-md overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 border border-slate-700/80 shadow-xs select-none ${className}`}
      title={showTooltip ? `${facility.name} [${techCode}]` : undefined}
    >
      {/* Tech Badge Underlay / Fallback */}
      <div
        className="absolute inset-0 flex items-center justify-center rounded font-mono font-bold select-none"
        style={{
          fontSize: size <= 22 ? '8px' : size <= 28 ? '9px' : '10px',
          color: facility.color || '#38bdf8',
          backgroundColor: `${facility.color || '#38bdf8'}18`,
        }}
      >
        <span>{techCode}</span>
      </div>

      {/* Official Game Icon PNG */}
      {!hasError && (
        <img
          src={iconSrc}
          alt={facility.name}
          width={size}
          height={size}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          onLoad={() => setIsLoaded(true)}
          className={`relative z-10 w-full h-full object-contain p-0.5 filter drop-shadow transition-opacity duration-150 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="eager"
          decoding="async"
        />
      )}
    </div>
  );
};

import React from 'react';
import { resolveTeam } from '../../data/teams';

import AR from 'country-flag-icons/react/3x2/AR';
import AT from 'country-flag-icons/react/3x2/AT';
import AU from 'country-flag-icons/react/3x2/AU';
import BA from 'country-flag-icons/react/3x2/BA';
import BE from 'country-flag-icons/react/3x2/BE';
import BR from 'country-flag-icons/react/3x2/BR';
import CA from 'country-flag-icons/react/3x2/CA';
import CD from 'country-flag-icons/react/3x2/CD';
import CH from 'country-flag-icons/react/3x2/CH';
import CI from 'country-flag-icons/react/3x2/CI';
import CO from 'country-flag-icons/react/3x2/CO';
import CV from 'country-flag-icons/react/3x2/CV';
import CW from 'country-flag-icons/react/3x2/CW';
import CZ from 'country-flag-icons/react/3x2/CZ';
import DE from 'country-flag-icons/react/3x2/DE';
import DZ from 'country-flag-icons/react/3x2/DZ';
import EC from 'country-flag-icons/react/3x2/EC';
import EG from 'country-flag-icons/react/3x2/EG';
import ES from 'country-flag-icons/react/3x2/ES';
import FR from 'country-flag-icons/react/3x2/FR';
import GB_ENG from 'country-flag-icons/react/3x2/GB-ENG';
import GB_SCT from 'country-flag-icons/react/3x2/GB-SCT';
import GH from 'country-flag-icons/react/3x2/GH';
import HR from 'country-flag-icons/react/3x2/HR';
import HT from 'country-flag-icons/react/3x2/HT';
import IQ from 'country-flag-icons/react/3x2/IQ';
import IR from 'country-flag-icons/react/3x2/IR';
import JO from 'country-flag-icons/react/3x2/JO';
import JP from 'country-flag-icons/react/3x2/JP';
import KR from 'country-flag-icons/react/3x2/KR';
import MA from 'country-flag-icons/react/3x2/MA';
import MX from 'country-flag-icons/react/3x2/MX';
import NL from 'country-flag-icons/react/3x2/NL';
import NO from 'country-flag-icons/react/3x2/NO';
import NZ from 'country-flag-icons/react/3x2/NZ';
import PA from 'country-flag-icons/react/3x2/PA';
import PT from 'country-flag-icons/react/3x2/PT';
import PY from 'country-flag-icons/react/3x2/PY';
import QA from 'country-flag-icons/react/3x2/QA';
import SA from 'country-flag-icons/react/3x2/SA';
import SE from 'country-flag-icons/react/3x2/SE';
import SN from 'country-flag-icons/react/3x2/SN';
import TN from 'country-flag-icons/react/3x2/TN';
import TR from 'country-flag-icons/react/3x2/TR';
import US from 'country-flag-icons/react/3x2/US';
import UY from 'country-flag-icons/react/3x2/UY';
import UZ from 'country-flag-icons/react/3x2/UZ';
import ZA from 'country-flag-icons/react/3x2/ZA';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isoToFlag: Record<string, React.FC<any>> = {
  AR, AT, AU, BA, BE, BR, CA, CD, CH, CI, CO, CV, CW, CZ,
  DE, DZ, EC, EG, ES, FR,
  'GB-ENG': GB_ENG,
  'GB-SCT': GB_SCT,
  GH, HR, HT, IQ, IR, JO, JP, KR, MA, MX, NL, NO, NZ,
  PA, PT, PY, QA, SA, SE, SN, TN, TR, US, UY, UZ, ZA,
};

function FallbackBadge({ code }: { code: string }) {
  return (
    <div className="w-8 h-6 rounded bg-primaryLight flex items-center justify-center text-textLight text-xs font-bold border border-accentMuted/30">
      {code}
    </div>
  );
}

export function FlagIcon({ teamName }: { teamName: string }) {
  const team = resolveTeam(teamName);

  if (!team) {
    return (
      <div className="w-8 h-6 rounded bg-primaryLight/50 flex items-center justify-center text-textMuted text-xs border border-accentMuted/30">
        ?
      </div>
    );
  }

  const FlagComponent = isoToFlag[team.isoCode];
  if (FlagComponent) {
    return <FlagComponent className="w-8 h-6 rounded shadow-sm" />;
  }

  return <FallbackBadge code={team.shortCode} />;
}

export function TeamDisplay({
  name,
  placeholder,
  side,
}: {
  name: string | null;
  placeholder: string | null;
  side?: 'left' | 'right';
}) {
  if (name) {
    const team = resolveTeam(name);
    const displayName = team?.displayNameEs ?? name;

    return (
      <div className="flex items-center gap-2">
        {(!side || side === 'left') && <FlagIcon teamName={name} />}
        <span className={`text-textLight font-semibold ${side ? 'text-base' : ''}`}>
          {displayName}
        </span>
        {side === 'right' && <FlagIcon teamName={name} />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="w-8 h-6 rounded bg-primaryLight/50 flex items-center justify-center text-textMuted text-xs border border-accentMuted/20">
        ?
      </div>
      <span className="text-textMuted italic text-sm">
        {placeholder ?? 'Por definir'}
      </span>
    </div>
  );
}

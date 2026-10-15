export type AccountingPeriodStatus = 'ABIERTO' | 'EN_REVISION' | 'CERRADO';

export type AccountingPeriod = {
  id: string;
  code: string;
  startsOn: string;
  endsOn: string;
  status: AccountingPeriodStatus;
};

export function isPeriodOpen(period: AccountingPeriod): boolean {
  return period.status === 'ABIERTO';
}

export function isPeriodClosed(period: AccountingPeriod): boolean {
  return period.status === 'CERRADO';
}

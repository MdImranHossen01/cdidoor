export const fmt = (n: number) =>
  'TK. ' + n.toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmtDate = (d: string | Date) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

export const today = () => new Date().toISOString().split('T')[0];

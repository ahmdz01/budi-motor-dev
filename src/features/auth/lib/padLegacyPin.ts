import 'server-only';

export function padLegacyPin(pin: string): string {
  return `${pin}-bm`;
}
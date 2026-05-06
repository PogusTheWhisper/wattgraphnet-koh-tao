export function formatNumber(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatKW(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)} MW`;
  return `${formatNumber(n, 0)} kW`;
}

export function formatKWh(n: number): string {
  if (Math.abs(n) >= 1000) return `${(n / 1000).toFixed(2)} MWh`;
  return `${formatNumber(n, 0)} kWh`;
}

export function formatTHB(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `฿${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `฿${(n / 1_000).toFixed(1)}k`;
  return `฿${formatNumber(n, 0)}`;
}

export function formatHour(iso: string): string {
  const d = new Date(iso);
  return d
    .toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Bangkok",
    })
    .replace(":00", "");
}

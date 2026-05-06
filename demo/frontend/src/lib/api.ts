export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE?.replace(/\/$/, "") ??
  "http://localhost:8000";

async function get<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    cache: "no-store",
    ...init,
  });
  if (!res.ok) {
    throw new Error(`API ${path} failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export type Meta = {
  model: string;
  version: string;
  generated_at: string;
  inference_ms: number;
  horizon_hours: number;
};

export type ForecastPoint = {
  t: string;
  load_kw: number;
  pv_kw: number;
  lower_kw: number;
  upper_kw: number;
};

export type StationForecast = {
  station_id: string;
  station_name: string;
  points: ForecastPoint[];
};

export type ForecastResponse = {
  meta: Meta;
  stations: StationForecast[];
  sb_wape_pct: number;
};

export type DispatchPoint = {
  t: string;
  load_kw: number;
  pv_kw: number;
  bess_kw: number;
  diesel_kw: number;
  soc_pct: number;
  thb_saved: number;
  co2_saved_kg: number;
};

export type OptimizeResponse = {
  meta: Meta;
  weight_cost: number;
  weight_carbon: number;
  schedule: DispatchPoint[];
  totals: {
    load_kwh: number;
    pv_kwh: number;
    bess_kwh: number;
    diesel_kwh: number;
    thb_saved: number;
    co2_saved_kg: number;
  };
};

export type Alert = {
  id: string;
  severity: "info" | "warn" | "critical";
  title: string;
  message: string;
  lead_time_h: number;
  station_id: string;
  issued_at: string;
  eta: string;
};

export type AlertsResponse = {
  meta: Meta;
  alerts: Alert[];
};

export type Station = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  type: "substation" | "load" | "pv" | "bess" | "diesel";
  capacity_kw: number;
};

export type GraphEdge = {
  source: string;
  target: string;
  weight: number;
};

export type GraphResponse = {
  meta: Meta;
  stations: Station[];
  edges: GraphEdge[];
  matrix: number[][];
};

export type SavingsResponse = {
  model: string;
  annual_net_savings_thb: number;
  annual_diesel_avoided_kwh: number;
  annual_co2_avoided_tons: number;
  payback_months: number;
  pilot_months: number;
  sb_wape_pct: number;
  inference_ms_cpu: number;
  model_size_mb: number;
  stations_nationwide: number;
};

export const api = {
  forecast: (horizon = 24) =>
    get<ForecastResponse>(`/api/forecast?horizon=${horizon}`),
  optimize: (weightCost: number, horizon = 24) =>
    get<OptimizeResponse>(
      `/api/optimize?weight_cost=${weightCost}&horizon=${horizon}`
    ),
  alerts: () => get<AlertsResponse>(`/api/alerts`),
  graph: () => get<GraphResponse>(`/api/graph`),
  savings: () => get<SavingsResponse>(`/api/savings`),
  stations: () => get<{ stations: Station[] }>(`/api/stations`),
};

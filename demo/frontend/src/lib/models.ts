export type Vec3 = [number, number, number];

// Per-station segment: 3D anchor position + on-screen radius (px).
// Tune positions via tune mode; tweak radius for visual fit per model.
export type Segment = { pos: Vec3; radius?: number };
export type HotspotLayout = Partial<Record<string, Segment>>;

// Anchors over the CITY cluster (azure-paradise: south-center buildings).
// Tune via tune button if positions drift on other models.
const DEFAULT_LAYOUT: HotspotLayout = {
  "GRID-CBL": { pos: [-0.55, 0.20,  0.50], radius: 70 },
  "DG-01":    { pos: [-0.10, 0.20,  0.55], radius: 60 },
  "BESS01":   { pos: [-0.05, 0.20,  0.50], radius: 60 },
  "PV-AGG":   { pos: [ 0.30, 0.20,  0.30], radius: 90 },
  "LD-MAE":   { pos: [-0.30, 0.20,  0.45], radius: 95 },
  "LD-SAI":   { pos: [-0.15, 0.20,  0.50], radius: 95 },
  "LD-CHA":   { pos: [ 0.05, 0.20,  0.55], radius: 80 },
};

export type IslandModel = {
  id: string;
  label: string;
  src: string;
  layout: HotspotLayout;
};

export const ISLAND_MODELS: IslandModel[] = [
  { id: "azure-paradise",        label: "Azure Paradise Island",   src: "/models/min/azure-paradise.glb",        layout: DEFAULT_LAYOUT },
  { id: "emerald-archipelago-1", label: "Emerald Archipelago I",   src: "/models/min/emerald-archipelago-1.glb", layout: DEFAULT_LAYOUT },
  { id: "emerald-archipelago-2", label: "Emerald Archipelago II",  src: "/models/min/emerald-archipelago-2.glb", layout: DEFAULT_LAYOUT },
  { id: "turquoise-isle",        label: "Isle of Turquoise Water", src: "/models/min/turquoise-isle.glb",        layout: DEFAULT_LAYOUT },
];

export const DEFAULT_MODEL_ID = "azure-paradise";

export function resolveModel(id?: string): IslandModel {
  const wanted = (id ?? DEFAULT_MODEL_ID).trim();
  return (
    ISLAND_MODELS.find((m) => m.id === wanted) ??
    ISLAND_MODELS.find((m) => m.id === DEFAULT_MODEL_ID) ??
    ISLAND_MODELS[0]
  );
}

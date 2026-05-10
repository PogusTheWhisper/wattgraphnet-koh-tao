export type Vec3 = [number, number, number];

// Per-station segment: 3D anchor position + on-screen radius (px).
// Tune positions via tune mode; tweak radius for visual fit per model.
export type Segment = { pos: Vec3; radius?: number };
export type HotspotLayout = Partial<Record<string, Segment>>;

const DEFAULT_LAYOUT: HotspotLayout = {
  "GRID-CBL": { pos: [-0.85, 0.25,  0.55], radius: 90 },
  "DG-01":    { pos: [ 0.05, 0.30,  0.10], radius: 70 },
  "BESS01":   { pos: [ 0.10, 0.30,  0.05], radius: 70 },
  "PV-AGG":   { pos: [ 0.45, 0.45, -0.55], radius: 100 },
  "LD-MAE":   { pos: [-0.50, 0.40, -0.30], radius: 110 },
  "LD-SAI":   { pos: [-0.55, 0.40, -0.10], radius: 110 },
  "LD-CHA":   { pos: [ 0.30, 0.40,  0.65], radius: 95 },
};

export type IslandModel = {
  id: string;
  label: string;
  src: string;
  layout: HotspotLayout;
};

export const ISLAND_MODELS: IslandModel[] = [
  { id: "azure-paradise",        label: "Azure Paradise Island",   src: "/models/azure-paradise.glb",        layout: DEFAULT_LAYOUT },
  { id: "emerald-archipelago-1", label: "Emerald Archipelago I",   src: "/models/emerald-archipelago-1.glb", layout: DEFAULT_LAYOUT },
  { id: "emerald-archipelago-2", label: "Emerald Archipelago II",  src: "/models/emerald-archipelago-2.glb", layout: DEFAULT_LAYOUT },
  { id: "turquoise-isle",        label: "Isle of Turquoise Water", src: "/models/turquoise-isle.glb",        layout: DEFAULT_LAYOUT },
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

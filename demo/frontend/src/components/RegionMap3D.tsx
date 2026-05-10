"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { CableSegment, Station } from "@/lib/api";

type LiveFlows = {
  load_kw: number;
  pv_kw: number;
  grid_kw: number;
  bess_kw: number;
  diesel_kw: number;
};

type Props = {
  stations: Station[];
  cableRoute?: [number, number][];
  cableSegments?: CableSegment[];
  flows: LiveFlows;
  className?: string;
};

const TYPE_COLOR: Record<Station["type"], string> = {
  substation: "#a78bfa",
  main_grid:  "#a78bfa",
  load:       "#f472b6",
  pv:         "#fbbf24",
  bess:       "#34d399",
  diesel:     "#f87171",
};

const TYPE_LABEL: Record<Station["type"], string> = {
  substation: "Substation",
  main_grid:  "Main Grid",
  load:       "Load Zone",
  pv:         "Solar PV",
  bess:       "BESS",
  diesel:     "Diesel Plant",
};

const ESRI_SAT =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_LABELS =
  "https://server.arcgisonline.com/arcgis/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";

const STYLE: maplibregl.StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    sat: {
      type: "raster",
      tiles: [ESRI_SAT],
      tileSize: 256,
      attribution: "Esri · Maxar · Earthstar Geographics",
    },
    labels: { type: "raster", tiles: [ESRI_LABELS], tileSize: 256 },
  },
  layers: [
    { id: "sat", type: "raster", source: "sat" },
    { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.85 } },
  ],
  sky: {
    "sky-color": "#0c1426",
    "horizon-color": "#1b2a4a",
    "fog-color": "#060a14",
    "fog-ground-blend": 0.6,
    "horizon-fog-blend": 0.5,
    "sky-horizon-blend": 0.5,
    "atmosphere-blend": 0.5,
  } as never,
};

function el(tag: string, style: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  e.style.cssText = style;
  if (text !== undefined) e.textContent = text;
  return e;
}

function buildPopupNode(
  s: Station,
  kw: number,
  color: string,
  utilPct: number
): HTMLElement {
  const wrap = el(
    "div",
    `min-width:170px;padding:8px 10px;background:rgba(12,20,38,0.98);
     border:1px solid ${color}55;border-radius:6px;color:#e2e8f0;
     font:11px/1.35 var(--font-mono, ui-monospace, Menlo, monospace);
     font-variant-numeric: tabular-nums;`
  );
  wrap.appendChild(
    el(
      "div",
      `color:${color};font-weight:700;font-size:9px;letter-spacing:.1em;text-transform:uppercase`,
      TYPE_LABEL[s.type]
    )
  );
  wrap.appendChild(
    el("div", "margin-top:2px;color:#fff;font-weight:600;font-size:12px", s.name)
  );

  const row = el(
    "div",
    "margin-top:6px;display:flex;gap:6px;align-items:baseline"
  );
  row.appendChild(
    el(
      "span",
      "color:#fff;font-size:14px;font-weight:700",
      (kw / 1000).toFixed(2)
    )
  );
  row.appendChild(
    el(
      "span",
      "color:#94a3b8;font-size:10px",
      `/ ${(s.capacity_kw / 1000).toFixed(1)} MW`
    )
  );
  row.appendChild(
    el(
      "span",
      "margin-left:auto;color:#94a3b8;font-size:10px",
      `${utilPct}%`
    )
  );
  wrap.appendChild(row);

  const barTrack = el(
    "div",
    "margin-top:5px;height:2px;background:#1b2a4a;border-radius:1px;overflow:hidden"
  );
  barTrack.appendChild(
    el("div", `width:${utilPct}%;height:100%;background:${color}`)
  );
  wrap.appendChild(barTrack);
  return wrap;
}

function buildMarkerNode(_s: Station, color: string): HTMLElement {
  // Dot only — popup carries the data on hover. Avoids chip stacking when
  // multiple stations sit at near-identical lat/lon (Tao city cluster).
  const root = el("div", "position:relative;cursor:pointer");
  const dot = el(
    "div",
    `width:14px;height:14px;border-radius:50%;background:${color};
     box-shadow:0 0 0 4px ${color}33,0 0 14px ${color};
     border:2px solid #0c1426;transition:transform 0.12s`
  );
  root.appendChild(dot);
  root.addEventListener("mouseenter", () => {
    dot.style.transform = "scale(1.25)";
  });
  root.addEventListener("mouseleave", () => {
    dot.style.transform = "scale(1)";
  });
  return root;
}

// Spread stations that share near-identical lat/lon so they don't stack into
// a single dot. Adjusts in-place at small angular offset (≈ 80–200 m).
function spreadStations(stations: Station[]): Station[] {
  const groups = new Map<string, Station[]>();
  for (const s of stations) {
    const key = `${s.lat.toFixed(2)}_${s.lon.toFixed(2)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(s);
  }
  const out: Station[] = [];
  for (const group of groups.values()) {
    if (group.length <= 1) {
      out.push(...group);
      continue;
    }
    const radius = 0.0018; // ~200 m at this latitude
    group.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / group.length;
      out.push({
        ...s,
        lat: s.lat + radius * Math.cos(angle),
        lon: s.lon + radius * Math.sin(angle),
      });
    });
  }
  return out;
}

export function RegionMap3D({
  stations,
  cableRoute,
  cableSegments,
  flows,
  className,
}: Props) {
  const spread = useMemo(() => spreadStations(stations), [stations]);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  const perStation = useMemo(() => {
    const loads = spread.filter((s) => s.type === "load");
    const totalLoadCap = loads.reduce((s, x) => s + x.capacity_kw, 0) || 1;
    const m = new Map<string, number>();
    for (const s of spread) {
      let kw = 0;
      if (s.type === "load") kw = (s.capacity_kw / totalLoadCap) * flows.load_kw;
      else if (s.type === "pv") kw = flows.pv_kw;
      else if (s.type === "bess") kw = Math.abs(flows.bess_kw);
      else if (s.type === "diesel") kw = flows.diesel_kw;
      else if (s.type === "substation" || s.type === "main_grid") kw = flows.grid_kw;
      m.set(s.id, kw);
    }
    return m;
  }, [spread, flows]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [99.95, 9.65],
      zoom: 8.4,
      pitch: 45,
      bearing: -15,
      maxPitch: 75,
      fadeDuration: 0,
      attributionControl: { compact: true },
    });
    map.addControl(
      new maplibregl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );
    map.on("load", () => setLoaded(true));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;

    // Cable network — typed segments by voltage tier
    const segments = cableSegments && cableSegments.length
      ? cableSegments
      : cableRoute && cableRoute.length >= 2
        ? [
            {
              id: "legacy",
              name: "Submarine Cable",
              voltage_kv: 33,
              circuits: 1,
              length_km: 0,
              status: "operational",
              coords: cableRoute,
            } as CableSegment,
          ]
        : [];

    const fc: GeoJSON.FeatureCollection = {
      type: "FeatureCollection",
      features: segments.map((seg) => ({
        type: "Feature",
        geometry: { type: "LineString", coordinates: seg.coords },
        properties: { ...seg },
      })),
    };
    const cableSrcId = "cable-network";
    const cableSrc = map.getSource(cableSrcId);
    if (cableSrc) {
      (cableSrc as maplibregl.GeoJSONSource).setData(fc);
    } else {
      map.addSource(cableSrcId, { type: "geojson", data: fc });
      map.addLayer({
        id: "cable-glow",
        type: "line",
        source: cableSrcId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "planned-2029",
            "#34d399",
            "#38bdf8",
          ],
          "line-width": [
            "match",
            ["get", "voltage_kv"],
            230, 14,
            115, 12,
            33, 8,
            8,
          ],
          "line-opacity": 0.18,
          "line-blur": 6,
        },
      });
      map.addLayer({
        id: "cable-line",
        type: "line",
        source: cableSrcId,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": [
            "match",
            ["get", "status"],
            "planned-2029",
            "#34d399",
            "#38bdf8",
          ],
          "line-width": [
            "match",
            ["get", "voltage_kv"],
            230, 4,
            115, 3,
            33, 1.8,
            1.8,
          ],
          "line-opacity": 0.95,
          "line-dasharray": [
            "match",
            ["get", "status"],
            "planned-2029", ["literal", [4, 3]],
            ["literal", [2, 2]],
          ] as never,
        },
      });

      // Cable hover popup
      const cablePopup = new Popup({
        offset: 12,
        closeButton: false,
        closeOnClick: false,
        className: "wgn-popup",
      });
      map.on("mousemove", "cable-line", (e) => {
        if (!e.features?.[0]) return;
        map.getCanvas().style.cursor = "pointer";
        const p = e.features[0].properties as Record<string, unknown>;
        const node = el(
          "div",
          `min-width:170px;padding:8px 10px;background:rgba(12,20,38,0.98);
           border:1px solid #38bdf855;border-radius:6px;color:#e2e8f0;
           font:11px/1.35 var(--font-mono, ui-monospace, Menlo, monospace);
           font-variant-numeric:tabular-nums`
        );
        node.appendChild(
          el(
            "div",
            "color:#38bdf8;font-weight:700;font-size:9px;letter-spacing:.1em;text-transform:uppercase",
            `${p.voltage_kv} kV submarine cable`
          )
        );
        node.appendChild(
          el(
            "div",
            "margin-top:2px;color:#fff;font-weight:600;font-size:12px",
            String(p.name)
          )
        );
        const meta = el(
          "div",
          "margin-top:6px;display:flex;gap:8px;color:#94a3b8;font-size:10px"
        );
        meta.appendChild(el("span", "", `${p.length_km} km`));
        meta.appendChild(el("span", "", `${p.circuits} ckt`));
        meta.appendChild(
          el(
            "span",
            `margin-left:auto;color:${p.status === "planned-2029" ? "#34d399" : "#94a3b8"}`,
            String(p.status)
          )
        );
        node.appendChild(meta);
        cablePopup.setLngLat(e.lngLat).setDOMContent(node).addTo(map);
      });
      map.on("mouseleave", "cable-line", () => {
        map.getCanvas().style.cursor = "";
        cablePopup.remove();
      });
    }

    // Markers
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    spread.forEach((s) => {
      const color = TYPE_COLOR[s.type] ?? "#38bdf8";
      const kw = perStation.get(s.id) ?? 0;
      const utilPct = Math.round(
        Math.min(100, (kw / Math.max(50, s.capacity_kw)) * 100)
      );
      const node = buildMarkerNode(s, color);
      const popup = new Popup({
        offset: 18,
        closeButton: false,
        closeOnClick: false,
        className: "wgn-popup",
      }).setDOMContent(buildPopupNode(s, kw, color, utilPct));

      const marker = new Marker({ element: node, anchor: "center" })
        .setLngLat([s.lon, s.lat])
        .setPopup(popup)
        .addTo(map);

      node.addEventListener("mouseenter", () => marker.togglePopup());
      node.addEventListener("mouseleave", () => marker.togglePopup());

      markerRefs.current.push(marker);
    });
  }, [loaded, spread, cableRoute, cableSegments, perStation]);

  return (
    <div
      className={className ?? "relative h-[520px] w-full"}
      style={{ position: "relative", borderRadius: "0.75rem", overflow: "hidden" }}
    >
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      <div
        style={{
          position: "absolute",
          left: 12,
          bottom: 12,
          padding: "6px 10px",
          fontSize: 10,
          letterSpacing: "0.08em",
          color: "#cbd5e1",
          background: "rgba(12,20,38,0.78)",
          border: "1px solid #1b2a4a",
          borderRadius: 6,
          textTransform: "uppercase",
          fontFamily:
            "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        Khanom · Samui · Phangan · Koh Tao · 33 kV submarine cable
      </div>
    </div>
  );
}

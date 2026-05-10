"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map as MLMap, Marker, Popup } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Station } from "@/lib/api";

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
    terrain: {
      type: "raster-dem",
      tiles: [
        "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      encoding: "terrarium",
      maxzoom: 14,
    },
  },
  layers: [
    { id: "sat", type: "raster", source: "sat" },
    { id: "labels", type: "raster", source: "labels", paint: { "raster-opacity": 0.85 } },
  ],
  terrain: { source: "terrain", exaggeration: 1.4 },
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

function buildMarkerNode(s: Station, color: string, kw: number): HTMLElement {
  const root = el("div", "position:relative;cursor:pointer");
  const dot = el(
    "div",
    `width:14px;height:14px;border-radius:50%;background:${color};
     box-shadow:0 0 0 4px ${color}33,0 0 14px ${color};
     border:2px solid #0c1426`
  );
  root.appendChild(dot);

  const chip = el(
    "div",
    `position:absolute;left:50%;top:-4px;transform:translate(-50%,-100%);
     white-space:nowrap;padding:3px 8px;border-radius:999px;
     background:rgba(12,20,38,0.94);border:1px solid ${color}88;color:#fff;
     font:700 9px/1 var(--font-mono, ui-monospace, Menlo, monospace);
     font-variant-numeric:tabular-nums;letter-spacing:0.05em;
     box-shadow:0 2px 8px rgba(0,0,0,0.6);pointer-events:none`
  );
  const dotSpan = el("span", `color:${color}`, "●");
  chip.appendChild(dotSpan);
  chip.appendChild(document.createTextNode(` ${(kw / 1000).toFixed(2)} MW`));
  root.appendChild(chip);
  return root;
}

export function RegionMap3D({ stations, cableRoute, flows, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const markerRefs = useRef<Marker[]>([]);
  const [loaded, setLoaded] = useState(false);

  const perStation = useMemo(() => {
    const loads = stations.filter((s) => s.type === "load");
    const totalLoadCap = loads.reduce((s, x) => s + x.capacity_kw, 0) || 1;
    const m = new Map<string, number>();
    for (const s of stations) {
      let kw = 0;
      if (s.type === "load") kw = (s.capacity_kw / totalLoadCap) * flows.load_kw;
      else if (s.type === "pv") kw = flows.pv_kw;
      else if (s.type === "bess") kw = Math.abs(flows.bess_kw);
      else if (s.type === "diesel") kw = flows.diesel_kw;
      else if (s.type === "substation" || s.type === "main_grid") kw = flows.grid_kw;
      m.set(s.id, kw);
    }
    return m;
  }, [stations, flows]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: [99.95, 9.65],
      zoom: 8.4,
      pitch: 55,
      bearing: -15,
      maxPitch: 75,
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

    // Cable route
    if (cableRoute && cableRoute.length >= 2) {
      const routeId = "cable-route";
      const geo: GeoJSON.Feature = {
        type: "Feature",
        geometry: { type: "LineString", coordinates: cableRoute },
        properties: {},
      };
      const src = map.getSource(routeId);
      if (src) {
        (src as maplibregl.GeoJSONSource).setData(
          geo as unknown as GeoJSON.FeatureCollection
        );
      } else {
        map.addSource(routeId, { type: "geojson", data: geo });
        map.addLayer({
          id: "cable-glow",
          type: "line",
          source: routeId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#38bdf8",
            "line-width": 8,
            "line-opacity": 0.18,
            "line-blur": 6,
          },
        });
        map.addLayer({
          id: "cable-line",
          type: "line",
          source: routeId,
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#38bdf8",
            "line-width": 2,
            "line-opacity": 0.95,
            "line-dasharray": [2, 2],
          },
        });
      }
    }

    // Markers
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    stations.forEach((s) => {
      const color = TYPE_COLOR[s.type] ?? "#38bdf8";
      const kw = perStation.get(s.id) ?? 0;
      const utilPct = Math.round(
        Math.min(100, (kw / Math.max(50, s.capacity_kw)) * 100)
      );
      const node = buildMarkerNode(s, color, kw);
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
  }, [loaded, stations, cableRoute, perStation]);

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

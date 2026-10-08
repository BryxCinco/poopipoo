"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import L from "leaflet";
import { Marker, Popup, useMap, useMapEvents } from "react-leaflet";

import { useI18n } from "@/hooks/use-i18n";
import { plural } from "@/lib/i18n/format";
import type { Restroom } from "@/types/restroom";

/**
 * Restroom markers with simple grid clustering (no extra package).
 *
 * With hundreds of restrooms (OSM import), drawing every pin at city zoom
 * buries the map and slows it down. Instead, pins that fall in the same
 * ~64 px screen cell are drawn as one bubble with a count; tapping it zooms
 * in. Only restrooms inside the visible area (plus a margin) are drawn.
 * From zoom 16 up, every restroom gets its own pin.
 */

const CELL_PX = 64;
const NO_CLUSTER_ZOOM = 16;

interface ClusteredMarkersProps {
  restrooms: Restroom[];
  restroomIcon: L.DivIcon;
  renderPopup: (restroom: Restroom) => React.ReactNode;
}

type Item = { kind: "single"; restroom: Restroom } | { kind: "cluster"; key: string; restrooms: Restroom[]; center: L.LatLng };

const clusterIcons = new Map<number, L.DivIcon>();

/** Count bubble; bigger for bigger clusters. Cached per count. */
function clusterIcon(count: number): L.DivIcon {
  let icon = clusterIcons.get(count);
  if (!icon) {
    const size = count < 10 ? 36 : count < 100 ? 42 : 48;
    icon = L.divIcon({
      className: "",
      html: `<div class="flex items-center justify-center rounded-full border-2 border-white bg-primary text-sm font-bold text-primary-foreground shadow-md ring-4 ring-primary/25 transition-transform duration-150 hover:scale-110" style="width:${size}px;height:${size}px">${count}</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    clusterIcons.set(count, icon);
  }
  return icon;
}

export function ClusteredMarkers({ restrooms, restroomIcon, renderPopup }: ClusteredMarkersProps) {
  const map = useMap();
  const { t } = useI18n();
  // Bumped on every pan/zoom so the clusters are recomputed for the new view
  const [view, setView] = useState(0);
  const refresh = useCallback(() => setView((v) => v + 1), []);
  useMapEvents({ moveend: refresh, zoomend: refresh });
  useEffect(refresh, [refresh]);

  const items = useMemo<Item[]>(() => {
    void view; // dependency: the map's current view
    const zoom = map.getZoom();
    const bounds = map.getBounds().pad(0.25);
    const visible = restrooms.filter((r) => bounds.contains([r.latitude, r.longitude]));
    if (zoom >= NO_CLUSTER_ZOOM) return visible.map((restroom) => ({ kind: "single", restroom }));

    // Group by screen cell at the current zoom
    const cells = new Map<string, Restroom[]>();
    for (const restroom of visible) {
      const point = map.project([restroom.latitude, restroom.longitude], zoom);
      const key = `${Math.floor(point.x / CELL_PX)}:${Math.floor(point.y / CELL_PX)}`;
      const cell = cells.get(key);
      if (cell) cell.push(restroom);
      else cells.set(key, [restroom]);
    }
    return Array.from(cells, ([key, group]): Item => {
      if (group.length === 1) return { kind: "single", restroom: group[0] };
      const lat = group.reduce((sum, r) => sum + r.latitude, 0) / group.length;
      const lng = group.reduce((sum, r) => sum + r.longitude, 0) / group.length;
      return { kind: "cluster", key, restrooms: group, center: L.latLng(lat, lng) };
    });
  }, [map, restrooms, view]);

  return (
    <>
      {items.map((item) =>
        item.kind === "single" ? (
          <Marker
            key={item.restroom.id}
            position={[item.restroom.latitude, item.restroom.longitude]}
            icon={restroomIcon}
            title={item.restroom.name}
          >
            <Popup>{renderPopup(item.restroom)}</Popup>
          </Marker>
        ) : (
          <Marker
            key={`cluster-${item.key}-${item.restrooms.length}`}
            position={item.center}
            icon={clusterIcon(item.restrooms.length)}
            title={plural(t.map.clusterLabel, item.restrooms.length)}
            alt={plural(t.map.clusterLabel, item.restrooms.length)}
            eventHandlers={{
              click: () => {
                // Zoom to fit the group (at least 2 levels closer)
                const groupBounds = L.latLngBounds(item.restrooms.map((r) => [r.latitude, r.longitude]));
                const target = Math.min(Math.max(map.getBoundsZoom(groupBounds, false, L.point(40, 40)), map.getZoom() + 2), 18);
                map.flyTo(groupBounds.getCenter(), target, { duration: 0.5 });
              },
            }}
          />
        )
      )}
    </>
  );
}

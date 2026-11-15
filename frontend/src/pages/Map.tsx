import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  fetchNearbyFacilities,
  fetchRoute,
  fetchWardHeatmaps,
  type Facility,
  type FacilityType,
  type RouteResponse,
  type WardVulnerability,
} from '../api';
import { PageHeader } from '../components/Layout';
import { Badge, Loading, riskTone } from '../components/ui';

const DEFAULT_LOCATION = { lat: 9.281, lon: 7.378, label: 'Bwari Central' };

const TYPE_LABEL: Record<FacilityType, string> = {
  PHC: 'Health centre',
  CHW: 'Health worker',
  AgroMarket: 'Food market',
};

const TYPE_COLOUR: Record<FacilityType, string> = {
  PHC: '#3e706a',
  CHW: '#2563eb',
  AgroMarket: '#b45309',
};

type Filter = 'all' | FacilityType;

function createMarkerIcon(colour: string, isSelected: boolean) {
  const size = isSelected ? 22 : 16;
  const border = isSelected ? 3 : 2;
  return L.divIcon({
    className: 'custom-osm-pin',
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background-color: ${colour};
        border: ${border}px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        transition: transform 0.2s;
      "></div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function createUserIcon() {
  return L.divIcon({
    className: 'custom-user-pin',
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background-color: #0f172a;
        border: 3px solid #ffffff;
        border-radius: 50%;
        box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.25);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

export function MapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const heatLayerRef = useRef<L.LayerGroup | null>(null);

  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [facilities, setFacilities] = useState<Facility[] | null>(null);
  const [wards, setWards] = useState<WardVulnerability[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [showRisk, setShowRisk] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [route, setRoute] = useState<RouteResponse | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // 1. Initialize OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [location.lat, location.lon],
      zoom: 13,
      zoomControl: true,
    });

    // Real OpenStreetMap Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    heatLayerRef.current = L.layerGroup().addTo(map);

    mapInstanceRef.current = map;

    return () => {
      markersLayerRef.current = null;
      heatLayerRef.current = null;
      routeLayerRef.current = null;
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Fetch facilities & ward heatmaps from API
  useEffect(() => {
    fetchWardHeatmaps().then(setWards);
  }, []);

  useEffect(() => {
    fetchNearbyFacilities(location.lat, location.lon).then((list) => {
      setFacilities(list);
      setSelectedId((cur) => cur ?? list[0]?.id ?? null);
    });
  }, [location]);

  const selected = facilities?.find((f) => f.id === selectedId) ?? null;

  useEffect(() => {
    setRoute(null);
  }, [selectedId]);

  const visible = useMemo(
    () => (facilities ?? []).filter((f) => filter === 'all' || f.facility_type === filter),
    [facilities, filter],
  );

  // 3. Render markers on OpenStreetMap
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layer = markersLayerRef.current;
    if (!map || !layer) return;

    layer.clearLayers();

    // User location marker
    const userMarker = L.marker([location.lat, location.lon], { icon: createUserIcon() }).addTo(layer);
    userMarker.bindPopup(`<strong>Your location:</strong> ${location.label}`);

    // Facility markers
    visible.forEach((f) => {
      const isSelected = f.id === selectedId;
      const icon = createMarkerIcon(TYPE_COLOUR[f.facility_type], isSelected);
      const marker = L.marker([f.latitude, f.longitude], { icon }).addTo(layer);

      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px;">
          <strong style="color: ${TYPE_COLOUR[f.facility_type]};">${TYPE_LABEL[f.facility_type]}</strong><br/>
          <strong>${f.name}</strong><br/>
          <span style="color: #64748b;">${f.ward_name}, ${f.state}</span><br/>
          ${f.distance_km != null ? `<span>Distance: ${f.distance_km} km</span>` : ''}
        </div>
      `);

      marker.on('click', () => {
        setSelectedId(f.id);
      });
    });
  }, [visible, selectedId, location]);

  // 4. Render Ward Vulnerability Heatmaps on OpenStreetMap
  useEffect(() => {
    const layer = heatLayerRef.current;
    if (!layer) return;

    layer.clearLayers();
    if (!showRisk || !facilities || facilities.length === 0) return;

    wards.forEach((w) => {
      const inWard = facilities.filter((f) => f.ward_name === w.ward_name);
      if (inWard.length === 0) return;

      const lat = inWard.reduce((a, f) => a + f.latitude, 0) / inWard.length;
      const lon = inWard.reduce((a, f) => a + f.longitude, 0) / inWard.length;

      const tone = riskTone(w.stunting_risk_level);
      const color = tone === 'danger' ? '#dc2626' : tone === 'warning' ? '#d97706' : '#16a34a';

      const circle = L.circle([lat, lon], {
        radius: 1200 + w.iron_deficiency_pct * 15,
        color: color,
        fillColor: color,
        fillOpacity: 0.12,
        weight: 1.5,
        dashArray: '5, 5',
      }).addTo(layer);

      circle.bindTooltip(
        `<strong>${w.ward_name}</strong><br/>Iron deficiency: ${w.iron_deficiency_pct}%<br/>Risk: ${w.stunting_risk_level}`,
        { permanent: false, direction: 'top' },
      );
    });
  }, [wards, facilities, showRisk]);

  // 5. Render Routing Path on OpenStreetMap
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    if (selected && route) {
      const line = L.polyline(
        [
          [location.lat, location.lon],
          [selected.latitude, selected.longitude],
        ],
        {
          color: '#3e706a',
          weight: 4,
          dashArray: '6, 8',
          opacity: 0.85,
        },
      ).addTo(map);

      routeLayerRef.current = line;
      map.fitBounds(line.getBounds(), { padding: [50, 50] });
    }
  }, [route, selected, location]);

  // Pan to selected facility
  const handleSelectFacility = (id: number) => {
    setSelectedId(id);
    const target = facilities?.find((f) => f.id === id);
    if (target && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([target.latitude, target.longitude], 14, { duration: 0.8 });
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Location is not supported on this device.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, label: 'Your location' };
        setLocation(coords);
        setLocating(false);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([coords.lat, coords.lon], 14);
        }
      },
      () => {
        setLocError('Unable to get your location. Showing the default area.');
        setLocating(false);
      },
      { timeout: 8000 },
    );
  };

  const getDirections = async () => {
    if (!selected) return;
    const r = await fetchRoute(location.label, selected.name);
    setRoute(r);
  };

  return (
    <>
      <PageHeader
        eyebrow="OpenStreetMap GIS"
        title="Health centres, health workers and markets"
        description="Live OpenStreetMap view of primary healthcare centres, community health workers and food markets with ward-level nutrition risk."
        actions={
          <button type="button" className="btn-secondary" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating...' : 'Use my location'}
          </button>
        }
      />

      <div className="container-page py-8">
        {locError && <p className="mb-4 rounded-md bg-amber-50 px-4 py-2 text-sm text-amber-800">{locError}</p>}

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {(['all', 'PHC', 'CHW', 'AgroMarket'] as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  filter === f ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {f === 'all' ? 'All' : `${TYPE_LABEL[f]}s`}
              </button>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showRisk}
              onChange={(e) => setShowRisk(e.target.checked)}
              className="h-4 w-4 accent-brand"
            />
            Show ward nutrition risk overlay
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="card flex flex-col overflow-hidden">
            {!facilities && <Loading label="Connecting to OpenStreetMap" />}
            
            {/* Real OpenStreetMap Viewport */}
            <div
              ref={mapContainerRef}
              className="h-[540px] w-full bg-slate-100"
              style={{ zIndex: 1 }}
            />

            <div className="flex flex-wrap items-center justify-between border-t border-slate-200 px-4 py-3 text-xs text-slate-600">
              <div className="flex flex-wrap gap-4">
                {(Object.keys(TYPE_LABEL) as FacilityType[]).map((t) => (
                  <span key={t} className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: TYPE_COLOUR[t] }} />
                    {TYPE_LABEL[t]}
                  </span>
                ))}
                <span className="inline-flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  Current location
                </span>
              </div>
              <span className="text-[11px] text-slate-400">OpenStreetMap &middot; Geodesic Distance Engine</span>
            </div>
          </div>

          <aside className="space-y-6">
            {selected && (
              <div className="card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="eyebrow">{TYPE_LABEL[selected.facility_type]}</p>
                    <h2 className="mt-1 text-lg font-semibold">{selected.name}</h2>
                  </div>
                  {selected.distance_km != null && (
                    <span className="shrink-0 text-sm font-semibold text-brand">{selected.distance_km} km</span>
                  )}
                </div>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Ward</dt>
                    <dd className="text-right">
                      {selected.ward_name}, {selected.state}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-slate-500">Hours</dt>
                    <dd className="text-right">{selected.operating_hours}</dd>
                  </div>
                  {selected.contact_phone && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">Phone</dt>
                      <dd>
                        <a
                          className="text-brand hover:underline"
                          href={`tel:${selected.contact_phone.replace(/\s/g, '')}`}
                        >
                          {selected.contact_phone}
                        </a>
                      </dd>
                    </div>
                  )}
                </dl>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selected.has_nutrition_clinic && <Badge tone="success">Nutrition services</Badge>}
                  {selected.has_ussd_dispatch && <Badge>Reachable by USSD</Badge>}
                </div>
                <button type="button" className="btn-primary mt-5 w-full" onClick={getDirections}>
                  Get walking directions
                </button>

                {route && (
                  <div className="mt-5 border-t border-slate-200 pt-4">
                    <p className="text-sm font-semibold">
                      {route.total_distance_km} km &middot; about {route.estimated_walk_mins} min walk
                    </p>
                    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-600">
                      {route.steps.map((s, i) => (
                        <li key={i}>
                          {s.instruction} <span className="text-slate-400">({s.distance_m} m)</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}

            <div className="card">
              <h2 className="border-b border-slate-200 px-6 py-4 text-sm font-semibold">Nearest to you</h2>
              <ul className="max-h-[360px] divide-y divide-slate-100 overflow-y-auto">
                {visible.map((f) => (
                  <li key={f.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectFacility(f.id)}
                      className={`flex w-full items-center justify-between gap-3 px-6 py-3 text-left text-sm transition-colors ${
                        f.id === selectedId ? 'bg-brand-soft' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-slate-900">{f.name}</span>
                        <span className="text-xs text-slate-500">
                          {TYPE_LABEL[f.facility_type]} &middot; {f.ward_name}
                        </span>
                      </span>
                      {f.distance_km != null && (
                        <span className="shrink-0 font-semibold text-brand">{f.distance_km} km</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

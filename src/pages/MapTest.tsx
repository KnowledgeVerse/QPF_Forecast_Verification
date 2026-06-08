import { useEffect, useState, useMemo } from "react";
import { Map as MapIcon, Info, Layers, AlertTriangle } from "lucide-react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Tooltip,
  useMap,
  LayersControl,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import proj4 from "proj4";

// Define the projection for EPSG:32644 (UTM Zone 44N)
proj4.defs("EPSG:32644", "+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs");

function MapAutoZoom({ bounds }: { bounds: any }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !bounds) return;
    map.fitBounds(bounds, { padding: [30, 30] });
    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => map.invalidateSize());
    });
    resizeObserver.observe(map.getContainer());
    return () => resizeObserver.disconnect();
  }, [bounds, map]);

  return null;
}

export default function MapTest() {
  const [geoData, setGeoData] = useState<any>(null);
  const [selectedBasin, setSelectedBasin] = useState<any>(null);
  const [hoveredBasin, setHoveredBasin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null);

        // Correct Vite Way: Fetch directly from the public folder using BASE_URL
        const mapUrl =
          import.meta.env.BASE_URL +
          "Map/Sub_Basin_Patna/Sub_Basin_Patna.geojson";
        const res = await fetch(mapUrl);

        // Agar file nahi milti to Vite error html return karta hai, usko yaha handle karna hoga
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error(
            `Map file missing! Kripya check karein ki 'public/Map/Sub_Basin_Patna/Sub_Basin_Patna.geojson' file maujud hai ya nahi.`,
          );
        }

        if (!res.ok)
          throw new Error(
            "File not found in public/Map directory, or was blocked.",
          );
        const data = await res.json();
        setGeoData(data);
      } catch (err: any) {
        console.error("Map Load Error:", err);
        setErrorMsg(err.message || "Failed to load GeoJSON map data.");
      } finally {
        setIsLoading(false);
      }
    };

    loadMapData();
  }, []);

  const handleManualUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        setGeoData(data);
        setErrorMsg(null);
      } catch (err) {
        setErrorMsg("Uploaded file is not a valid JSON.");
      }
    };
    reader.readAsText(file);
  };

  // Convert EPSG:32644 to EPSG:4326 (Lat/Lon) for Leaflet Map
  const mapData = useMemo(() => {
    if (!geoData || !Array.isArray(geoData.features)) return null;

    try {
      let minLat = Infinity,
        maxLat = -Infinity,
        minLng = Infinity,
        maxLng = -Infinity;

      const features = geoData.features
        .filter((f: any) => f.geometry)
        .map((feature: any) => {
          const modifiedFeature = {
            ...feature,
            properties: { ...feature.properties },
          };
          if (modifiedFeature.properties.SUBBASIN === "Kone") {
            modifiedFeature.properties.SUBBASIN = "Sone";
          }

          const isMulti = modifiedFeature.geometry.type === "MultiPolygon";
          const coords = modifiedFeature.geometry.coordinates;

          const convertRing = (ring: any[]) =>
            ring.map((pt) => {
              const [lng, lat] = proj4("EPSG:32644", "EPSG:4326", [
                pt[0],
                pt[1],
              ]);
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
              if (lng < minLng) minLng = lng;
              if (lng > maxLng) maxLng = lng;
              return [lat, lng]; // Leaflet expects [lat, lng]
            });

          let latLngs;
          if (isMulti) {
            latLngs = coords.map((polygon: any[]) => polygon.map(convertRing));
          } else {
            latLngs = coords.map(convertRing);
          }
          return { ...modifiedFeature, latLngs };
        });

      if (minLat === Infinity)
        throw new Error("No valid coordinates processed.");
      return {
        features,
        bounds: [
          [minLat, minLng] as [number, number],
          [maxLat, maxLng] as [number, number],
        ] as import("leaflet").LatLngBoundsExpression,
      };
    } catch (err: any) {
      console.error("Map parsing error:", err);
      setErrorMsg("Error parsing Proj4 coordinates: " + err.message);
      return null;
    }
  }, [geoData]);

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] space-y-4 animate-in fade-in duration-500">
      {/* CSS injection to make tooltips transparent & nice */}
      <style>{`
        .basin-tooltip {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          color: #fff !important;
          font-weight: 800 !important;
          font-size: 13px !important;
          text-shadow: 0px 0px 4px rgba(0,0,0,0.8), 0px 0px 8px rgba(0,0,0,0.8) !important;
        }
        .basin-tooltip::before { display: none !important; }
      `}</style>

      {/* Header */}
      <div className="bg-[#111d32] border border-[#1e3a5f] rounded-xl p-4 flex items-center gap-3 shadow-md shrink-0">
        <div className="p-2 bg-[#3b82f6]/20 rounded-lg">
          <MapIcon className="text-[#3b82f6]" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#e2e8f0]">Map Prototype</h1>
          <p className="text-sm text-[#94a3b8]">
            Interactive Sub-Basin Map Selection Test
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
        {/* Map Container */}
        <div className="flex-1 bg-[#0a1628] border border-[#1e3a5f] rounded-xl shadow-inner relative overflow-hidden flex items-center justify-center z-0 min-h-[500px]">
          {isLoading ? (
            <div className="text-[#94a3b8] flex flex-col items-center animate-pulse">
              <MapIcon size={48} className="mb-2 opacity-50" />
              <p>Loading GeoJSON Map...</p>
            </div>
          ) : errorMsg ? (
            <div className="flex flex-col items-center justify-center text-[#ef4444] text-center p-6 bg-[#1a2d4a] rounded-xl border border-[#ef4444] shadow-lg max-w-lg m-4">
              <AlertTriangle size={48} className="mb-4" />
              <p className="font-bold text-lg mb-2">Error Loading Map</p>
              <p className="text-sm font-mono text-white bg-black/20 p-2 rounded mb-4 w-full break-words">
                {errorMsg}
              </p>
              <p className="text-xs text-[#94a3b8] max-w-md">
                Ensure that the file exists at{" "}
                <b className="text-white">
                  Map/Sub_Basin_Patna/Sub_Basin_Patna.geojson
                </b>{" "}
                and all NPM libraries (proj4, react-leaflet) are installed.
              </p>
              <div className="mt-6 border-t border-[#ef4444]/30 pt-4 w-full text-center">
                <p className="text-white text-sm font-bold mb-2">
                  Temporary Fix: Upload Map File Manually
                </p>
                <input
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleManualUpload}
                  className="text-sm text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#3b82f6] file:text-white hover:file:bg-[#2563eb] cursor-pointer"
                />
              </div>
            </div>
          ) : !mapData ? (
            <div className="text-[#ef4444] text-center">
              <p className="font-bold text-lg">Failed to load map data.</p>
              <p className="text-sm mt-1">
                Please ensure the file is at:{" "}
                <b className="block mt-2 mb-2 p-2 bg-[#1a2d4a] rounded text-[#e2e8f0]">
                  public/Map/Sub_Basin_Patna/Sub_Basin_Patna.geojson
                </b>
              </p>
            </div>
          ) : (
            <MapContainer
              style={{ width: "100%", height: "100%", zIndex: 0 }}
              bounds={mapData.bounds}
              zoom={7}
              center={[26.0, 85.0]} // Fallback center
            >
              <MapAutoZoom bounds={mapData.bounds} />
              <LayersControl position="topright">
                <LayersControl.BaseLayer checked name="Google Streets">
                  <TileLayer
                    url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                    maxZoom={20}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Google Satellite">
                  <TileLayer
                    url="https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}"
                    maxZoom={20}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="Google Terrain">
                  <TileLayer
                    url="https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}"
                    maxZoom={20}
                  />
                </LayersControl.BaseLayer>
                <LayersControl.BaseLayer name="OpenStreetMap">
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    maxZoom={19}
                  />
                </LayersControl.BaseLayer>
              </LayersControl>

              {/* Draw Polygons */}
              {mapData.features.map((feature: any, idx: number) => {
                const basinName = feature.properties.SUBBASIN;
                const isSelected =
                  selectedBasin?.properties?.SUBBASIN === basinName;
                const isHovered = hoveredBasin === basinName;

                return (
                  <Polygon
                    key={`poly-${idx}`}
                    positions={feature.latLngs}
                    pathOptions={{
                      fillColor: isSelected ? "#3b82f6" : "#2563eb",
                      fillOpacity: isSelected ? 0.7 : isHovered ? 0.4 : 0.15,
                      color: isSelected ? "#ffffff" : "#1e40af",
                      weight: isSelected ? 3 : 1.5,
                    }}
                    eventHandlers={{
                      click: () => setSelectedBasin(feature),
                      mouseover: () => setHoveredBasin(basinName),
                      mouseout: () => setHoveredBasin(null),
                    }}
                  >
                    {/* Tooltip embedded cleanly at the center of each polygon */}
                    <Tooltip
                      permanent
                      direction="center"
                      className="basin-tooltip"
                    >
                      {basinName}
                    </Tooltip>
                  </Polygon>
                );
              })}
            </MapContainer>
          )}
        </div>

        {/* Info Panel */}
        <div className="w-full lg:w-80 bg-[#111d32] border border-[#1e3a5f] rounded-xl p-5 shadow-md flex flex-col shrink-0">
          <h2 className="text-sm font-bold text-[#e2e8f0] uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-[#1e3a5f] pb-3">
            <Info size={18} className="text-[#10b981]" />
            Selection Details
          </h2>

          {selectedBasin ? (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#94a3b8]">Sub-Basin Name</p>
                <p className="text-lg font-bold text-[#3b82f6]">
                  {selectedBasin.properties.SUBBASIN}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#94a3b8]">Parent Basin</p>
                <p className="text-sm font-medium text-[#e2e8f0]">
                  {selectedBasin.properties.BASIN}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#94a3b8]">Area (Sq. KM)</p>
                <p className="text-sm font-mono text-[#f59e0b]">
                  {selectedBasin.properties.AREA_SQKM?.toFixed(2)} km²
                </p>
              </div>
              <div>
                <p className="text-xs text-[#94a3b8]">FMO</p>
                <p className="text-sm font-medium text-[#e2e8f0]">
                  {selectedBasin.properties.FMO}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-[#64748b] text-center opacity-70">
              <Layers size={48} className="mb-3" />
              <p className="text-sm">
                Click on any region in the map to view its details.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

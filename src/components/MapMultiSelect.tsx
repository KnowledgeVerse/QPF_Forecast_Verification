import { useEffect, useState, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polygon,
  Tooltip,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import proj4 from "proj4";
import { Map as MapIcon, AlertTriangle } from "lucide-react";

// Define the projection for EPSG:32644 (UTM Zone 44N)
proj4.defs("EPSG:32644", "+proj=utm +zone=44 +datum=WGS84 +units=m +no_defs");

function MapAutoZoom({
  bounds,
  legendMode,
}: {
  bounds: any;
  legendMode?: boolean;
}) {
  const map = useMap();
  useEffect(() => {
    if (!map || !bounds) return;
    // Agar legend show ho raha hai, toh right side se extra space (180px) chhodenge
    // Taki map left side me theek se shift ho jaye aur cut na ho.
    const padRight = legendMode ? 180 : 30;
    map.fitBounds(bounds, {
      paddingTopLeft: [30, 30],
      paddingBottomRight: [padRight, 30],
    });

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(() => map.invalidateSize());
    });
    resizeObserver.observe(map.getContainer());
    return () => resizeObserver.disconnect();
  }, [bounds, map, legendMode]);

  return null;
}

const QPF_COLORS: Record<string, { bg: string; text: string }> = {
  "0": { bg: "#ffffff", text: "#1f2937" },
  "0.1-10": { bg: "#bbf7d0", text: "#14532d" },
  "11-25": { bg: "#22c55e", text: "#ffffff" },
  "26-50": { bg: "#facc15", text: "#111827" },
  "51-100": { bg: "#f97316", text: "#ffffff" },
  ">100": { bg: "#dc2626", text: "#ffffff" },
};

const LEGEND_COLORS = [
  "#ef4444",
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f43f5e",
  "#84cc16",
  "#06b6d4",
  "#0ea5e9",
  "#6366f1",
  "#d946ef",
  "#f97316",
];

interface MapMultiSelectProps {
  selectedBasins: string[];
  onChange: (basins: string[]) => void;
  grid?: any[];
  mapViewDay?: string;
  title?: string;
  legendMode?: boolean;
  mapLayer?: string;
  heightClass?: string;
}

export default function MapMultiSelect({
  selectedBasins,
  onChange,
  grid,
  mapViewDay = "day1",
  title,
  legendMode = false,
  mapLayer = "m",
  heightClass = "h-[400px] md:h-[500px]",
}: MapMultiSelectProps) {
  const [geoData, setGeoData] = useState<any>(null);
  const [hoveredBasin, setHoveredBasin] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const loadMapData = async () => {
      try {
        setIsLoading(true);
        setErrorMsg(null);
        const mapUrl =
          import.meta.env.BASE_URL +
          "Map/Sub_Basin_Patna/Sub_Basin_Patna.geojson";
        const res = await fetch(mapUrl);

        // Agar file server par nahi milti toh Hostinger index.html bhej deta hai, jo crash kar sakta hai
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
          throw new Error(
            "Map file missing on server! Ensure 'Map' folder is inside 'public/' folder.",
          );
        }

        if (!res.ok) throw new Error("File not found in public/Map directory.");
        const data = await res.json();
        setGeoData(data);
      } catch (err: any) {
        console.error("Map Load Error:", err);
        setErrorMsg(err.message || "Failed to load map data.");
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
              return [lat, lng];
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
          [minLat, minLng],
          [maxLat, maxLng],
        ] as import("leaflet").LatLngBoundsExpression,
      };
    } catch (err: any) {
      console.error("Map parsing error:", err);
      setErrorMsg("Error parsing coordinates.");
      return null;
    }
  }, [geoData]);

  // Handle Multi-Select Click Logic
  const handleBasinClick = (basinName: string) => {
    if (selectedBasins.includes(basinName)) {
      // Remove if already selected
      onChange(selectedBasins.filter((b) => b !== basinName));
    } else {
      // Add if not selected
      onChange([...selectedBasins, basinName]);
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-[400px] bg-[#0a1628] rounded-xl flex flex-col items-center justify-center text-[#94a3b8] animate-pulse border border-[#1e3a5f]">
        <MapIcon size={48} className="mb-2 opacity-50" />
        <p>Loading Map Selection...</p>
      </div>
    );
  }

  if (errorMsg || !mapData) {
    return (
      <div className="w-full h-[400px] bg-[#1a2d4a] rounded-xl border border-[#ef4444] flex flex-col items-center justify-center text-[#ef4444] p-4 text-center">
        <AlertTriangle size={48} className="mb-4" />
        <p className="font-bold">Error Loading Map</p>
        <p className="text-sm mt-2 text-[#94a3b8]">
          {errorMsg || "Map data unavailable"}
        </p>
        <div className="mt-4 pt-3 border-t border-[#ef4444]/30 w-full text-center">
          <p className="text-xs font-bold text-white mb-2">
            Upload your map (.geojson / .json) directly to view it:
          </p>
          <input
            type="file"
            accept=".geojson,.json"
            onChange={handleManualUpload}
            className="text-xs text-[#94a3b8] file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:bg-[#3b82f6] file:text-white cursor-pointer mx-auto block"
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full ${heightClass} rounded-xl overflow-hidden border border-[#1e3a5f] relative z-0 bg-[#0a1628]`}
    >
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
      <MapContainer
        style={{ width: "100%", height: "100%" }}
        bounds={mapData.bounds}
        zoom={7}
      >
        {title && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 px-4 py-1.5 rounded-lg shadow-md z-[400] text-sm font-bold text-black border border-black/20">
            {title}
          </div>
        )}

        {legendMode && (
          <div className="absolute top-2 right-2 bg-white/95 p-3 rounded-lg shadow-lg z-[400] text-xs max-h-[90%] overflow-y-auto border border-black/20">
            <h4 className="font-bold border-b border-gray-300 pb-1.5 mb-2 text-black text-sm uppercase">
              Basin Legend
            </h4>
            <div className="grid grid-cols-1 gap-1.5">
              {mapData.features.map((f: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 block rounded-sm shadow-sm"
                    style={{
                      backgroundColor:
                        LEGEND_COLORS[idx % LEGEND_COLORS.length],
                    }}
                  ></span>
                  <span className="text-gray-800 font-bold">
                    {f.properties.SUBBASIN}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <MapAutoZoom bounds={mapData.bounds} legendMode={legendMode} />

        <TileLayer
          url={`https://mt1.google.com/vt/lyrs=${mapLayer}&x={x}&y={y}&z={z}`}
          maxZoom={20}
        />
        {mapData.features.map((feature: any, idx: number) => {
          const basinName = feature.properties.SUBBASIN;
          const isSelected = selectedBasins.includes(basinName);
          const isHovered = hoveredBasin === basinName;

          // Retrieve the applied value for this basin on the selected view day
          const gridRow = grid?.find((r: any) => r.subBasin === basinName);
          const qpfValue = gridRow && mapViewDay ? gridRow[mapViewDay] : "0";
          const hasValue = qpfValue && qpfValue !== "0";
          const colorObj = QPF_COLORS[qpfValue] || QPF_COLORS["0"];

          let fillColor = isSelected ? "#10b981" : "#2563eb";
          let fillOpacity = isSelected ? 0.7 : isHovered ? 0.4 : 0.15;

          if (legendMode) {
            fillColor = LEGEND_COLORS[idx % LEGEND_COLORS.length];
            fillOpacity = 0.8;
          } else if (hasValue) {
            fillColor = colorObj.bg;
            fillOpacity = isSelected ? 0.9 : 0.65;
          }

          return (
            <Polygon
              key={`poly-${idx}`}
              positions={feature.latLngs}
              pathOptions={{
                fillColor: fillColor,
                fillOpacity: fillOpacity,
                color: isSelected ? "#ffffff" : "#1e40af",
                weight: isSelected ? 3 : legendMode ? 2 : 1.5,
              }}
              eventHandlers={{
                click: () => handleBasinClick(basinName),
                mouseover: () => setHoveredBasin(basinName),
                mouseout: () => setHoveredBasin(null),
              }}
            >
              <Tooltip permanent direction="center" className="basin-tooltip">
                <div className="flex flex-col items-center justify-center">
                  <span className="drop-shadow-md">{basinName}</span>
                  {hasValue && (
                    <span
                      className="mt-1 px-1.5 py-0.5 text-[11px] font-bold rounded border border-black/20"
                      style={{
                        backgroundColor: colorObj.bg,
                        color: colorObj.text,
                        textShadow: "none",
                      }}
                    >
                      {qpfValue}
                    </span>
                  )}
                </div>
              </Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>
    </div>
  );
}

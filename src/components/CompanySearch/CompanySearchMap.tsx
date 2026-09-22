import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { type CompanySearchResult } from "@/hooks/useCompanySearch";

interface CompanySearchMapProps {
  results: CompanySearchResult[];
  selectedResult: CompanySearchResult | null;
  onSelectResult: (result: CompanySearchResult) => void;
  onOpenDetails: (result: CompanySearchResult) => void;
  onAddToCompanies: (result: CompanySearchResult) => void;
  canAdd: boolean;
}

// Custom SVGs for map markers
const createCustomIcon = (isSelected: boolean, isAdded: boolean) => {
  const bgColor = isAdded ? "#10b981" : isSelected ? "#2563eb" : "#475569";
  const ringColor = isSelected ? "#bfdbfe" : "#ffffff";
  const size = isSelected ? 38 : 28;

  const svgHtml = `
    <div style="position: relative; width: ${size}px; height: ${size}px;">
      ${
        isSelected
          ? `<div style="
              position: absolute;
              top: -6px;
              left: -6px;
              width: ${size + 12}px;
              height: ${size + 12}px;
              border-radius: 50%;
              background: rgba(37, 99, 235, 0.35);
              animation: pulse 1.5s infinite;
            "></div>`
          : ""
      }
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: ${bgColor};
        border: ${isSelected ? "3px" : "2px"} solid ${ringColor};
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(0,0,0,0.35);
        cursor: pointer;
        transition: all 0.25s ease;
        z-index: 2;
      ">
        <div style="
          transform: rotate(45deg);
          width: ${isSelected ? "12px" : "9px"};
          height: ${isSelected ? "12px" : "9px"};
          background: white;
          border-radius: 50%;
        "></div>
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgHtml,
    className: "custom-map-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

export const CompanySearchMap: React.FC<CompanySearchMapProps> = ({
  results,
  selectedResult,
  onSelectResult,
  onOpenDetails,
  onAddToCompanies,
  canAdd,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [43.2557, -79.8711], // Default center
        zoom: 11,
        zoomControl: true,
      });

      // Google Maps Roadmap layer (default)
      const googleRoadmap = L.tileLayer("https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        attribution: "&copy; Google Maps",
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      }).addTo(map);

      // Google Maps Satellite / Hybrid layer
      const googleHybrid = L.tileLayer("https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}", {
        attribution: "&copy; Google Maps",
        maxZoom: 20,
        subdomains: ["mt0", "mt1", "mt2", "mt3"],
      });

      // Layer Control (Roadmap vs Satellite)
      L.control.layers(
        {
          "Google Map": googleRoadmap,
          "Google Satellite": googleHybrid,
        },
        undefined,
        { position: "topright" }
      ).addTo(map);

      mapInstanceRef.current = map;
    }

    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Update Markers & Auto-Fit Bounds
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const validCoordinatesResults = results.filter(
      (r) => r.latitude !== null && r.latitude !== undefined && r.longitude !== null && r.longitude !== undefined
    );

    if (validCoordinatesResults.length === 0) return;

    const latLngs: L.LatLngExpression[] = [];

    validCoordinatesResults.forEach((company) => {
      const lat = company.latitude!;
      const lng = company.longitude!;
      const isSelected = selectedResult?.id === company.id;
      const isAdded = company.status === "Added" || !!company.company_id;

      const marker = L.marker([lat, lng], {
        icon: createCustomIcon(isSelected, isAdded),
        zIndexOffset: isSelected ? 1000 : 0,
      }).addTo(map);

      marker.on("click", () => {
        onSelectResult(company);
      });

      // Bind rich popup
      const popupContent = document.createElement("div");
      popupContent.className = "p-1 min-w-[220px] max-w-[280px] text-xs font-sans";
      popupContent.innerHTML = `
        <div class="font-bold text-sm text-foreground mb-0.5 leading-snug">${company.company_name}</div>
        <div class="text-[11px] text-muted-foreground mb-1.5">${company.vertical || "Company"}</div>
        ${company.address_line1 ? `<div class="text-[11px] text-muted-foreground mb-1 flex items-start gap-1">📍 <span>${company.address_line1}</span></div>` : ""}
        ${company.phone_number ? `<div class="text-[11px] text-foreground font-medium mb-1 flex items-center gap-1">📞 <span>${company.phone_number}</span></div>` : ""}
        ${company.email ? `<div class="text-[11px] text-blue-600 dark:text-blue-400 mb-1.5 truncate flex items-center gap-1">✉️ <span>${company.email}</span></div>` : ""}
        <div class="mt-2 pt-1.5 border-t border-border flex items-center gap-1.5">
          <button id="popup-view-${company.id}" class="px-2 py-1 bg-secondary text-secondary-foreground rounded text-[11px] font-medium hover:bg-secondary/80 transition-colors flex-1 flex items-center justify-center gap-1">
            View details
          </button>
          ${
            canAdd && !isAdded
              ? `<button id="popup-add-${company.id}" class="px-2 py-1 bg-primary text-primary-foreground rounded text-[11px] font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-1">
                  + Add
                </button>`
              : ""
          }
        </div>
      `;

      // Attach button listeners inside popup
      marker.bindPopup(popupContent);
      marker.on("popupopen", () => {
        const viewBtn = popupContent.querySelector(`#popup-view-${company.id}`);
        viewBtn?.addEventListener("click", () => onOpenDetails(company));

        const addBtn = popupContent.querySelector(`#popup-add-${company.id}`);
        addBtn?.addEventListener("click", () => onAddToCompanies(company));
      });

      markersRef.current.set(company.id, marker);
      latLngs.push([lat, lng]);
    });

    // Auto-fit map view to markers
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [results, canAdd, onOpenDetails, onAddToCompanies, onSelectResult, selectedResult?.id]);

  // Center and highlight selected marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !selectedResult) return;

    if (selectedResult.latitude && selectedResult.longitude) {
      map.flyTo([selectedResult.latitude, selectedResult.longitude], 14, {
        animate: true,
        duration: 0.7,
      });

      const marker = markersRef.current.get(selectedResult.id);
      if (marker) {
        setTimeout(() => {
          marker.openPopup();
        }, 300);
      }
    }
  }, [selectedResult]);

  return (
    <div className="relative w-full h-full min-h-[350px] rounded-xl overflow-hidden border border-border shadow-xs bg-muted/20">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
      <div className="absolute bottom-2 left-2 z-10 bg-background/90 backdrop-blur-xs px-2.5 py-1 rounded-md text-[10px] text-muted-foreground border border-border shadow-xs flex items-center gap-3">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" /> Discovered
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> In Configuration
        </span>
      </div>
    </div>
  );
};

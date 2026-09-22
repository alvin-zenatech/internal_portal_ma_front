import React, { useState, useRef, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  X,
  Plus,
  ChevronDown,
  Search,
  Check,
  Building2,
  Sparkles,
} from "lucide-react";
import {
  COUNTRIES,
  getStatesForCountry,
  getStateDisplayName,
  searchCitySuggestions,
  resolveCountryCode,
  type CountryItem,
  type StateItem,
} from "./geoData";

interface LocationChipsSelectorProps {
  businessType: string;
  onBusinessTypeChange?: (val: string) => void;
  cities: string[];
  onCitiesChange: (cities: string[]) => void;
  stateCode: string;
  onStateCodeChange: (state: string) => void;
  country: string;
  onCountryChange: (country: string) => void;
  disabled?: boolean;
}

export const LocationChipsSelector: React.FC<LocationChipsSelectorProps> = ({
  businessType,
  cities,
  onCitiesChange,
  stateCode,
  onStateCodeChange,
  country,
  onCountryChange,
  disabled = false,
}) => {
  // Popover States
  const [countryOpen, setCountryOpen] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [cityInputOpen, setCityInputOpen] = useState(false);

  // Search queries inside popovers
  const [countrySearch, setCountrySearch] = useState("");
  const [stateSearch, setStateSearch] = useState("");
  const [cityInput, setCityInput] = useState("");

  const cityInputRef = useRef<HTMLInputElement>(null);

  // Active Country object
  const activeCountryCode = resolveCountryCode(country);
  const activeCountry = useMemo(() => {
    return COUNTRIES.find((c) => c.code === activeCountryCode) || COUNTRIES[0];
  }, [activeCountryCode]);

  // Available States for active country
  const availableStates = useMemo(() => {
    return getStatesForCountry(activeCountryCode);
  }, [activeCountryCode]);

  // Active State display name
  const activeStateName = useMemo(() => {
    return getStateDisplayName(activeCountryCode, stateCode) || stateCode;
  }, [activeCountryCode, stateCode]);

  // Filtered Countries list for dropdown
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return COUNTRIES;
    const q = countrySearch.toLowerCase();
    return COUNTRIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    );
  }, [countrySearch]);

  // Filtered States list for dropdown
  const filteredStates = useMemo(() => {
    if (!stateSearch.trim()) return availableStates;
    const q = stateSearch.toLowerCase();
    return availableStates.filter(
      (s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );
  }, [availableStates, stateSearch]);

  // City Auto-complete Suggestions based on input
  const citySuggestions = useMemo(() => {
    return searchCitySuggestions(cityInput, activeCountryCode, stateCode, 12);
  }, [cityInput, activeCountryCode, stateCode]);

  // Handlers
  const handleSelectCountry = (c: CountryItem) => {
    onCountryChange(c.name);
    // Auto-update or reset state to first available if previous state doesn't match
    const newStates = getStatesForCountry(c.code);
    if (newStates.length > 0) {
      const exists = newStates.some((s) => s.code === stateCode || s.name === stateCode);
      if (!exists) {
        onStateCodeChange(newStates[0].name);
      }
    } else {
      onStateCodeChange("");
    }
    setCountryOpen(false);
  };

  const handleSelectState = (s: StateItem) => {
    onStateCodeChange(s.name);
    setStateOpen(false);
  };

  const handleAddCity = (cityName: string) => {
    const trimmed = cityName.trim();
    if (trimmed && !cities.includes(trimmed)) {
      onCitiesChange([...cities, trimmed]);
    }
    setCityInput("");
    setCityInputOpen(false);
  };

  const handleRemoveCity = (cityToRemove: string) => {
    onCitiesChange(cities.filter((c) => c !== cityToRemove));
  };

  const handleKeyDownCityInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (cityInput.trim()) {
        handleAddCity(cityInput);
      }
    } else if (e.key === "Escape") {
      setCityInputOpen(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
      <span className="text-[11px] text-muted-foreground mr-0.5">Target:</span>

      {/* Business Type Badge */}
      {businessType && (
        <Badge
          variant="secondary"
          className="px-2.5 py-1 text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-200/50 flex items-center gap-1 shadow-2xs"
        >
          <Building2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span>{businessType}</span>
        </Badge>
      )}

      {/* Selected City Chips */}
      {cities.map((c) => (
        <Badge
          key={c}
          variant="secondary"
          className="px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 flex items-center gap-1.5 shadow-2xs transition-all animate-in fade-in"
        >
          <span className="text-xs">📍</span>
          <span className="font-semibold">{c}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => handleRemoveCity(c)}
              className="hover:text-destructive hover:bg-emerald-500/20 rounded-full p-0.5 transition-colors cursor-pointer"
              title={`Remove ${c}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </Badge>
      ))}

      {/* City Auto-complete Popover / Input */}
      {!disabled && (
        <Popover open={cityInputOpen} onOpenChange={setCityInputOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-6.5 px-2.5 text-[11px] font-medium border-dashed border-emerald-300 hover:border-emerald-500 text-emerald-700 dark:text-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20 hover:bg-emerald-100/60 transition-all gap-1 rounded-full cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>Add City</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2 shadow-xl border-border bg-popover" align="start">
            <div className="space-y-2">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground" />
                <Input
                  ref={cityInputRef}
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={handleKeyDownCityInput}
                  placeholder={`Search or type city in ${activeStateName || activeCountry.name}...`}
                  className="h-8 pl-8 text-xs bg-background"
                  autoFocus
                />
              </div>

              {/* City Suggestions */}
              <div className="max-h-48 overflow-y-auto space-y-0.5 text-xs">
                <div className="text-[10px] uppercase font-semibold text-muted-foreground px-2 py-1 flex items-center justify-between">
                  <span>Suggestions ({activeStateName || activeCountry.name})</span>
                  <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                </div>
                {citySuggestions.length === 0 ? (
                  <div className="p-2 text-center text-muted-foreground text-xs">
                    {cityInput ? `Press Enter to add "${cityInput}"` : "No matching cities found."}
                  </div>
                ) : (
                  citySuggestions.map((cityName) => {
                    const isAlreadyAdded = cities.includes(cityName);
                    return (
                      <button
                        key={cityName}
                        type="button"
                        onClick={() => handleAddCity(cityName)}
                        disabled={isAlreadyAdded}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                          isAlreadyAdded
                            ? "opacity-50 cursor-not-allowed bg-muted/40"
                            : "hover:bg-primary/10 hover:text-primary cursor-pointer"
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>📍</span>
                          <span className="font-medium">{cityName}</span>
                        </span>
                        {isAlreadyAdded && <Check className="w-3 h-3 text-muted-foreground" />}
                      </button>
                    );
                  })
                )}

                {cityInput && !citySuggestions.includes(cityInput.trim()) && (
                  <button
                    type="button"
                    onClick={() => handleAddCity(cityInput)}
                    className="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-primary font-medium hover:bg-primary/10 transition-colors flex items-center gap-1.5 border-t border-border/40 mt-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add custom city: "{cityInput}"</span>
                  </button>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* State / Province Auto-Complete Popover Chip */}
      <Popover open={stateOpen} onOpenChange={setStateOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-6.5 px-2.5 text-[11px] font-medium border-border/80 bg-background hover:bg-muted text-foreground transition-all gap-1 rounded-full cursor-pointer shadow-2xs"
          >
            <span>{activeStateName || "Select State / Province"}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 shadow-xl border-border bg-popover" align="start">
          <div className="space-y-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground" />
              <Input
                value={stateSearch}
                onChange={(e) => setStateSearch(e.target.value)}
                placeholder="Search state / province..."
                className="h-8 pl-8 text-xs bg-background"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5 text-xs">
              {filteredStates.map((s) => {
                const isSelected =
                  s.name.toLowerCase() === (stateCode || "").toLowerCase() ||
                  s.code.toLowerCase() === (stateCode || "").toLowerCase();
                return (
                  <button
                    key={s.code}
                    type="button"
                    onClick={() => handleSelectState(s)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-foreground cursor-pointer"
                    }`}
                  >
                    <span>{s.name}</span>
                    <span className="text-[10px] opacity-75 font-mono">{s.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Country Auto-Complete Popover Chip */}
      <Popover open={countryOpen} onOpenChange={setCountryOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled}
            className="h-6.5 px-2.5 text-[11px] font-medium border-border/80 bg-background hover:bg-muted text-foreground transition-all gap-1 rounded-full cursor-pointer shadow-2xs"
          >
            <span>{activeCountry.flag}</span>
            <span>{activeCountry.name}</span>
            <ChevronDown className="w-3 h-3 text-muted-foreground opacity-70" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2 shadow-xl border-border bg-popover" align="start">
          <div className="space-y-2">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-2.5 text-muted-foreground" />
              <Input
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
                placeholder="Search country..."
                className="h-8 pl-8 text-xs bg-background"
                autoFocus
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-0.5 text-xs">
              {filteredCountries.map((c) => {
                const isSelected = c.code === activeCountryCode;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelectCountry(c)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "hover:bg-muted text-foreground cursor-pointer"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                    </span>
                    <span className="text-[10px] opacity-75 font-mono">{c.code}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

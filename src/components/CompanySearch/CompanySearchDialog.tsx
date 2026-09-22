import React, { useState, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  SlidersHorizontal,
  X,
  Loader2,
  MapPin,
  Building2,
  CheckCircle2,
  ArrowUpDown,
  Plus,
  Eye,
  Sparkles,
  Download,
  Globe,
  RefreshCw,
  ShieldAlert,
  HelpCircle,
  Trash2,
} from "lucide-react";
import {
  useParseQuery,
  useCreateSearchJob,
  useSearchJob,
  useJobResults,
  useSearchJobSSE,
  useCancelSearchJob,
  downloadJobCsv,
  type CompanySearchResult,
  type BusinessFinderProgressEvent,
} from "@/hooks/useCompanySearch";
import { CompanySearchMap } from "./CompanySearchMap";
import { CompanyDetailDrawer } from "./CompanyDetailDrawer";
import { AddToCompaniesModal } from "./AddToCompaniesModal";
import { LocationChipsSelector } from "./LocationChipsSelector";
import { useAuth } from "@/lib/AuthContext";

interface CompanySearchDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanySearchDialog: React.FC<CompanySearchDialogProps> = ({ isOpen, onClose }) => {
  const { user, hasPermission, canAccessNavigationItem } = useAuth();
  const canAddCompanies = Boolean(
    user?.is_super_admin || hasPermission("COMPANY_SEARCH_CREATE") || canAccessNavigationItem("PIPELINE_COMPANIES", "CREATE")
  );
  const isAdmin = Boolean(user?.is_super_admin || hasPermission("ADMIN"));

  const [searchQuery, setSearchQuery] = useState("");
  const [activeJobId, setActiveJobId] = useState<string | null>(() => {
    return localStorage.getItem("company_search_active_job_id") || null;
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [promptQuestion, setPromptQuestion] = useState<string | null>(null);

  // Editable Token Inputs
  const [businessType, setBusinessType] = useState<string>("");
  const [vertical, setVertical] = useState<string>("");
  const [cities, setCities] = useState<string[]>([]);
  const [stateCode, setStateCode] = useState<string>("");
  const [country, setCountry] = useState<string>("Canada");
  const [maxResults, setMaxResults] = useState<number>(25);
  const [startFresh, setStartFresh] = useState<boolean>(false);
  const [provider, setProvider] = useState<string>("playwright");

  // Filtering & Sorting within results
  const [tableSearch, setTableSearch] = useState("");
  const [selectedCityFilter, setSelectedCityFilter] = useState<string>("all");
  const [minQualityFilter, setMinQualityFilter] = useState<number>(0);
  const [sortBy, setSortBy] = useState<"name" | "score" | "city">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selection & Modals
  const [selectedResult, setSelectedResult] = useState<CompanySearchResult | null>(null);
  const [drawerCompany, setDrawerCompany] = useState<CompanySearchResult | null>(null);
  const [companyToAddToConfig, setCompanyToAddToConfig] = useState<CompanySearchResult | null>(null);

  // Progress State
  const [liveEvent, setLiveEvent] = useState<BusinessFinderProgressEvent | null>(null);

  const queryClient = useQueryClient();

  // API Hooks
  const { mutate: parseQuery, isPending: isParsing } = useParseQuery();
  const { mutate: createJob, isPending: isCreatingJob } = useCreateSearchJob();
  const { data: jobData, refetch: refetchJob } = useSearchJob(activeJobId);
  const { data: results = [], isLoading: isLoadingResults, refetch: refetchResults } = useJobResults(activeJobId);
  const { mutate: cancelJob, isPending: isCancelling } = useCancelSearchJob();

  // Only stream SSE if job is actively running or newly created
  const isJobActive = !jobData || ["QUEUED", "RUNNING"].includes(jobData.status);
  const sseJobId = (isCreatingJob || isJobActive) ? activeJobId : null;

  // SSE hook
  useSearchJobSSE(sseJobId, (evt) => {
    setLiveEvent(evt);
    if (evt.event === "job_completed" || evt.event === "verification_blocked") {
      refetchJob();
      refetchResults();
    }
  });

  // Save active job to localStorage
  useEffect(() => {
    if (activeJobId) {
      localStorage.setItem("company_search_active_job_id", activeJobId);
    }
  }, [activeJobId]);

  // Clear search results and reset view
  const handleClearResults = () => {
    if (activeJobId) {
      queryClient.setQueryData(["company-search-results", activeJobId], []);
      queryClient.removeQueries({ queryKey: ["company-search-results", activeJobId] });
      queryClient.removeQueries({ queryKey: ["company-search-job", activeJobId] });
    }
    localStorage.removeItem("company_search_active_job_id");
    setActiveJobId(null);
    setSelectedResult(null);
    setDrawerCompany(null);
    setLiveEvent(null);
    setTableSearch("");
    toast.success("Search results cleared");
  };

  // Handle Query Parsing on Input Change / Blur
  const handleParseInput = () => {
    if (!searchQuery.trim()) return;
    parseQuery(searchQuery.trim(), {
      onSuccess: (res) => {
        setBusinessType(res.parsed.business_type || "");
        setVertical(res.parsed.vertical || res.parsed.business_type || "");
        setCities(res.parsed.cities || (res.parsed.city ? [res.parsed.city] : []));
        setStateCode(res.parsed.state || res.parsed.province_or_state || "");
        setCountry(res.parsed.country || "Canada");
        setPromptQuestion(res.question || null);
      },
    });
  };

  // Execute Search
  const handleExecuteSearch = () => {
    if (cities.length === 0 || !businessType.trim()) {
      return;
    }

    createJob(
      {
        business_type: businessType.trim(),
        vertical: vertical.trim() || businessType.trim(),
        cities: cities,
        state: stateCode.trim(),
        country: country.trim() || "Canada",
        max_results: maxResults,
        start_fresh: startFresh,
        provider: provider,
      },
      {
        onSuccess: (res) => {
          setActiveJobId(res.job_id);
          setLiveEvent(null);
        },
      }
    );
  };

  // Job Status calculations
  const currentStatus = liveEvent?.status || jobData?.status || "IDLE";
  const isRunning = currentStatus === "RUNNING" || currentStatus === "QUEUED";
  const isBlockedVerification = currentStatus === "BLOCKED_VERIFICATION";

  const progressPercent = liveEvent?.percent ?? jobData?.progress_percent ?? 0;
  const currentCityText = liveEvent?.city || jobData?.current_city || (cities[0] || "");
  const currentCityIndex = liveEvent?.city_index ?? 1;
  const currentCityTotal = liveEvent?.city_total ?? Math.max(1, cities.length);
  const currentOperation = liveEvent?.current_operation || (isRunning ? `Searching in ${currentCityText}...` : "");

  // Unique list of cities in results
  const availableCities = useMemo(() => {
    const s = new Set<string>();
    results.forEach((r) => {
      if (r.city) s.add(r.city);
    });
    return Array.from(s);
  }, [results]);

  // Filtered & Sorted Results
  const filteredResults = useMemo(() => {
    return results
      .filter((r) => {
        // Table search
        if (tableSearch.trim()) {
          const q = tableSearch.toLowerCase();
          const matchName = r.company_name?.toLowerCase().includes(q);
          const matchLead = r.leader_1_name?.toLowerCase().includes(q) || r.leader_2_name?.toLowerCase().includes(q);
          const matchPhone = r.phone_number?.includes(q);
          const matchEmail = r.email?.toLowerCase().includes(q);
          if (!matchName && !matchLead && !matchPhone && !matchEmail) return false;
        }
        // City filter
        if (selectedCityFilter !== "all" && r.city?.toLowerCase() !== selectedCityFilter.toLowerCase()) {
          return false;
        }
        // Quality filter
        if ((r.data_quality_score || 0) < minQualityFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === "name") {
          cmp = (a.company_name || "").localeCompare(b.company_name || "");
        } else if (sortBy === "score") {
          cmp = (a.data_quality_score || 0) - (b.data_quality_score || 0);
        } else if (sortBy === "city") {
          cmp = (a.city || "").localeCompare(b.city || "");
        }
        return sortOrder === "asc" ? cmp : -cmp;
      });
  }, [results, tableSearch, selectedCityFilter, minQualityFilter, sortBy, sortOrder]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-[98vw] sm:max-w-[98vw] max-w-[98vw] h-[95vh] max-h-[95vh] sm:h-[93vh] sm:max-h-[93vh] p-0 gap-0 overflow-hidden flex flex-col bg-background sm:rounded-xl rounded-none shadow-2xl border-border"
        aria-describedby="company-search-desc"
      >
        <DialogHeader className="px-5 py-3.5 border-b flex flex-row items-center justify-between shrink-0 bg-card/60 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                Company Search Engine
                <Badge variant="outline" className="text-[10px] font-normal uppercase tracking-wider text-muted-foreground">
                  Playwright Chromium
                </Badge>
              </DialogTitle>
              <DialogDescription id="company-search-desc" className="text-xs text-muted-foreground">
                High-fidelity Google Maps business discovery, website contact enrichment & leadership verification.
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(activeJobId || results.length > 0) && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-destructive hover:border-destructive/40"
                onClick={handleClearResults}
                title="Clear current results and start fresh"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear Results
              </Button>
            )}
            {activeJobId && results.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => downloadJobCsv(activeJobId)}
              >
                <Download className="w-3.5 h-3.5" /> Export CSV ({results.length})
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-border">
          {/* Left Column: Search controls, Progress, Results Table (7/8 cols on wide) */}
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full overflow-hidden bg-background">
            {/* Top Search Input Section */}
            <div className="p-4 border-b space-y-3 bg-muted/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="e.g. Land surveying companies in Hamilton and Burlington, Ontario, Canada"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleParseInput();
                      }
                    }}
                    onBlur={handleParseInput}
                    className="pl-9 pr-24 h-10 text-xs bg-background shadow-xs font-medium"
                    disabled={isRunning}
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleParseInput}
                    disabled={isParsing || !searchQuery.trim() || isRunning}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 text-[11px] gap-1 px-2.5 text-primary hover:text-primary"
                  >
                    {isParsing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    Parse
                  </Button>
                </div>

                <Button
                  onClick={handleExecuteSearch}
                  disabled={isRunning || isCreatingJob || cities.length === 0 || !businessType.trim()}
                  className="h-10 px-5 text-xs font-semibold gap-1.5 shadow-xs bg-primary text-primary-foreground"
                >
                  {isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </Button>

                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="h-10 w-10 shrink-0"
                  title="Advanced search parameters"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </Button>
              </div>

              {/* Interactive Location Chips Selector with Auto-complete */}
              <LocationChipsSelector
                businessType={businessType}
                onBusinessTypeChange={setBusinessType}
                cities={cities}
                onCitiesChange={setCities}
                stateCode={stateCode}
                onStateCodeChange={setStateCode}
                country={country}
                onCountryChange={setCountry}
                disabled={isRunning}
              />

              {/* Missing field question prompt */}
              {promptQuestion && cities.length === 0 && (
                <div className="flex items-center gap-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300">
                  <HelpCircle className="w-4 h-4 shrink-0" />
                  <span>{promptQuestion}</span>
                </div>
              )}

              {/* Advanced Collapsible Settings */}
              {showAdvancedFilters && (
                <div className="pt-2 border-t grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Vertical / Industry</label>
                    <Input
                      value={vertical}
                      onChange={(e) => setVertical(e.target.value)}
                      placeholder="e.g. Civil Engineering"
                      className="h-8 text-xs"
                      disabled={isRunning}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Max Results / City</label>
                    <Input
                      type="number"
                      min={5}
                      max={100}
                      value={maxResults}
                      onChange={(e) => setMaxResults(parseInt(e.target.value) || 25)}
                      className="h-8 text-xs"
                      disabled={isRunning}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground uppercase">Resume Mode</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setStartFresh(!startFresh)}
                      className="h-8 w-full text-xs justify-start"
                      disabled={isRunning}
                    >
                      {startFresh ? "Start Fresh" : "Resume Checkpoint"}
                    </Button>
                  </div>

                  {isAdmin && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-muted-foreground uppercase">Search Provider</label>
                      <select
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="h-8 w-full text-xs rounded-md border border-input bg-background px-2"
                        disabled={isRunning}
                      >
                        <option value="playwright">Playwright Chromium (Default)</option>
                        <option value="google_places">Google Places API (Paid Key)</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Live Animated Progress Bar */}
            {isRunning && (
              <div className="px-4 py-3 bg-card border-b space-y-2 shrink-0 animate-in fade-in duration-200">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>
                      City {currentCityIndex} of {currentCityTotal}: <span className="text-primary font-bold">{currentCityText}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-[11px]">{progressPercent}% overall</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => activeJobId && cancelJob(activeJobId)}
                      disabled={isCancelling}
                      className="h-6 text-[10px] text-destructive hover:text-destructive px-2"
                    >
                      Cancel Search
                    </Button>
                  </div>
                </div>

                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${Math.max(4, progressPercent)}%` }}
                  />
                </div>

                {currentOperation && (
                  <p className="text-[11px] text-muted-foreground italic truncate">
                    {currentOperation}
                  </p>
                )}
              </div>
            )}

            {/* Verification Challenge / CAPTCHA Banner */}
            {isBlockedVerification && (
              <div className="p-4 bg-amber-500/10 border-b border-amber-500/30 space-y-2 shrink-0">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs">
                  <ShieldAlert className="w-4 h-4" />
                  Google Human Verification Challenge Detected
                </div>
                <p className="text-xs text-muted-foreground">
                  Google Maps has requested human verification. Automation was halted safely without attempting to bypass security controls.
                  All {results.length} collected businesses have been preserved in your checkpoint.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => handleExecuteSearch()}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry Later (Resume)
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      if (activeJobId) downloadJobCsv(activeJobId);
                    }}
                  >
                    <Download className="w-3 h-3 mr-1" /> Use Existing Results ({results.length})
                  </Button>
                </div>
              </div>
            )}

            {/* Results Table Filters Bar */}
            <div className="p-2.5 px-4 border-b flex items-center justify-between gap-2 bg-muted/5 shrink-0 text-xs">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <Input
                  placeholder="Filter results by name, leader, phone..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>

              <div className="flex items-center gap-2">
                {availableCities.length > 1 && (
                  <select
                    value={selectedCityFilter}
                    onChange={(e) => setSelectedCityFilter(e.target.value)}
                    className="h-7 text-xs rounded border bg-background px-2"
                  >
                    <option value="all">All Cities ({results.length})</option>
                    {availableCities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                )}

                <select
                  value={minQualityFilter}
                  onChange={(e) => setMinQualityFilter(parseInt(e.target.value) || 0)}
                  className="h-7 text-xs rounded border bg-background px-2"
                >
                  <option value={0}>All Scores</option>
                  <option value={40}>Score ≥ 40%</option>
                  <option value={60}>Score ≥ 60%</option>
                  <option value={80}>Score ≥ 80% (High Quality)</option>
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1 px-2"
                  onClick={() => {
                    if (sortBy === "score") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("score");
                      setSortOrder("desc");
                    }
                  }}
                >
                  <ArrowUpDown className="w-3 h-3" />
                  Score {sortBy === "score" ? (sortOrder === "desc" ? "↓" : "↑") : ""}
                </Button>
              </div>
            </div>

            {/* Results Table Scrollable View */}
            <div className="flex-1 overflow-y-auto">
              {isLoadingResults ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="text-xs">Loading discovered businesses...</span>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-2 text-center p-6 text-muted-foreground">
                  <Building2 className="w-10 h-10 stroke-1 opacity-40 mb-1" />
                  <p className="font-semibold text-sm text-foreground">No companies found</p>
                  <p className="text-xs max-w-sm">
                    {searchQuery
                      ? "Try refining your target city, state, or keywords above and run a search."
                      : "Enter a natural language search query above to discover businesses."}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs border-b z-10 text-[11px] font-semibold text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3 min-w-[160px]">Business Name</th>
                      <th className="py-2.5 px-2 hidden sm:table-cell">Vertical</th>
                      <th className="py-2.5 px-2">Location</th>
                      <th className="py-2.5 px-2">Phone</th>
                      <th className="py-2.5 px-2">Email</th>
                      <th className="py-2.5 px-2 min-w-[120px]">Leader 1</th>
                      <th className="py-2.5 px-2 min-w-[120px] hidden xl:table-cell">Leader 2</th>
                      <th className="py-2.5 px-2">Score</th>
                      <th className="py-2.5 px-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredResults.map((r, idx) => {
                      const rowKey = r.id || `${r.company_name || "item"}-${idx}`;
                      const isSelected = selectedResult?.id === r.id;
                      const isAdded = r.status === "Added" || !!r.company_id;

                      return (
                        <tr
                          key={rowKey}
                          onClick={() => {
                            setSelectedResult(r);
                            setDrawerCompany(r);
                          }}
                          className={`hover:bg-muted/40 cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 max-w-[220px]">
                            <div className="font-semibold text-foreground truncate">{r.company_name}</div>
                            {r.website_url && (
                              <a
                                href={r.website_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                              >
                                <Globe className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{r.website_url.replace(/^https?:\/\//, "")}</span>
                              </a>
                            )}
                          </td>

                          <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap hidden sm:table-cell">
                            <span className="truncate max-w-[120px] block">{r.vertical || businessType || "-"}</span>
                          </td>

                          <td className="py-2.5 px-2 text-muted-foreground whitespace-nowrap">
                            <span>{r.city ? `${r.city}${r.province_or_state || r.state ? `, ${r.province_or_state || r.state}` : ""}` : "-"}</span>
                          </td>

                          <td className="py-2.5 px-2 whitespace-nowrap">
                            {r.phone_number ? (
                              <span className="font-medium text-foreground">{r.phone_number}</span>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-2 max-w-[140px] truncate">
                            {r.email ? (
                              <span className="text-blue-600 dark:text-blue-400 truncate">{r.email}</span>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-2 max-w-[140px]">
                            {r.leader_1_name ? (
                              <div>
                                <span className="font-medium text-foreground block truncate">{r.leader_1_name}</span>
                                {r.leader_1_title && (
                                  <span className="text-[10px] text-muted-foreground block truncate">{r.leader_1_title}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-2 max-w-[140px] hidden xl:table-cell">
                            {r.leader_2_name ? (
                              <div>
                                <span className="font-medium text-foreground block truncate">{r.leader_2_name}</span>
                                {r.leader_2_title && (
                                  <span className="text-[10px] text-muted-foreground block truncate">{r.leader_2_title}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground italic text-[11px]">-</span>
                            )}
                          </td>

                          <td className="py-2.5 px-2 whitespace-nowrap">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] px-1.5 py-0 font-bold ${
                                (r.data_quality_score || 0) >= 70
                                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200"
                                  : (r.data_quality_score || 0) >= 40
                                  ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {r.data_quality_score ?? 0}%
                            </Badge>
                          </td>

                          <td className="py-2.5 px-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                title="View details"
                                onClick={() => setDrawerCompany(r)}
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>

                              {isAdded ? (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-300">
                                  <CheckCircle2 className="w-3 h-3 mr-1" /> Added
                                </Badge>
                              ) : (
                                canAddCompanies && (
                                  <Button
                                    size="sm"
                                    className="h-7 text-[11px] px-2 gap-1 bg-primary text-primary-foreground"
                                    onClick={() => setCompanyToAddToConfig(r)}
                                  >
                                    <Plus className="w-3 h-3" /> Add
                                  </Button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Right Column: Interactive Map with Slide-Over Details Drawer (Option 1) */}
          <div className="lg:col-span-5 xl:col-span-4 flex flex-col h-full overflow-hidden bg-muted/10 relative border-l border-border/60">
            {/* 100% Height Interactive Map */}
            <div className="flex flex-col flex-1 h-full p-3 overflow-hidden">
              <div className="flex items-center justify-between pb-1.5 shrink-0">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> Geographic Discovery Map
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {results.filter((r) => r.latitude && r.longitude).length} mapped locations
                </span>
              </div>

              <div className="flex-1 w-full h-full min-h-[250px] overflow-hidden rounded-lg border border-border/60 relative">
                <CompanySearchMap
                  results={results}
                  selectedResult={selectedResult || drawerCompany}
                  onSelectResult={(comp) => {
                    setSelectedResult(comp);
                    setDrawerCompany(comp);
                  }}
                  onOpenDetails={(comp) => {
                    setSelectedResult(comp);
                    setDrawerCompany(comp);
                  }}
                  onAddToCompanies={(comp) => setCompanyToAddToConfig(comp)}
                  canAdd={canAddCompanies}
                />

                {/* Floating Reopen Button if details are closed but a company is selected */}
                {!drawerCompany && selectedResult && (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-[400] shadow-lg animate-in fade-in duration-200">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDrawerCompany(selectedResult)}
                      className="h-8 text-xs font-semibold gap-1.5 bg-card/95 backdrop-blur-sm border shadow-md hover:bg-card text-foreground"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      View Details: <span className="font-bold truncate max-w-[140px]">{selectedResult.company_name}</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Slide-Over Floating Details Drawer (Overlay over map) */}
            {drawerCompany && (
              <div className="absolute inset-0 z-20 flex flex-col bg-background/95 backdrop-blur-md shadow-2xl border-l border-border animate-in slide-in-from-right duration-300">
                <CompanyDetailDrawer
                  company={drawerCompany}
                  onClose={() => {
                    setDrawerCompany(null);
                  }}
                  onAddToCompanies={(comp) => setCompanyToAddToConfig(comp)}
                  canAdd={canAddCompanies}
                />
              </div>
            )}
          </div>
        </div>

        {/* Add To Companies Modal */}
        <AddToCompaniesModal
          company={companyToAddToConfig}
          isOpen={!!companyToAddToConfig}
          onClose={() => setCompanyToAddToConfig(null)}
          onSuccess={() => {
            refetchResults();
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

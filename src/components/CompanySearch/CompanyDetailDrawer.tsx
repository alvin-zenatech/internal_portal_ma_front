import React from "react";
import { type CompanySearchResult } from "@/hooks/useCompanySearch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  X,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  ExternalLink,
  Plus,
  Users,
  CheckCircle2,
  Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface CompanyDetailDrawerProps {
  company: CompanySearchResult | null;
  onClose: () => void;
  onAddToCompanies: (company: CompanySearchResult) => void;
  canAdd: boolean;
}

export const CompanyDetailDrawer: React.FC<CompanyDetailDrawerProps> = ({
  company,
  onClose,
  onAddToCompanies,
  canAdd,
}) => {
  const navigate = useNavigate();

  if (!company) return null;

  const isAdded = company.status === "Added" || !!company.company_id;

  return (
    <div className="flex flex-col h-full bg-card/95 backdrop-blur-md border-l border-border animate-in slide-in-from-right duration-200 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between p-4 border-b bg-muted/30 shrink-0">
        <div className="space-y-1 pr-3 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base text-foreground leading-tight truncate">{company.company_name}</h3>
            {isAdded && (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Added
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{company.vertical || "General Business"}</p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-[11px] gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Hide details to view full map"
          >
            <MapPin className="w-3 h-3 text-primary" /> View Map
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={onClose}
            title="Close"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Data Quality Score Banner */}
        <div className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                Data Quality Score
                <Badge variant="secondary" className="font-bold text-xs">
                  {company.data_quality_score ?? 0}%
                </Badge>
              </div>
              <div className="text-[11px] text-muted-foreground">Scored on email, phone, leadership & location verification</div>
            </div>
          </div>
        </div>

        {/* Contact & Location */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-[10px] text-muted-foreground">
            Contact & Location
          </h4>

          <div className="grid grid-cols-1 gap-2 bg-muted/10 p-3 rounded-lg border border-border/60">
            {/* Address */}
            <div className="flex items-start gap-2.5">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground block">Location / Address</span>
                <span className="text-foreground font-medium">{company.address_line1 || `${company.city || ""}, ${company.province_or_state || ""}, ${company.country || ""}`}</span>
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-2.5">
              <Phone className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground block">Phone</span>
                {company.phone_number ? (
                  <a href={`tel:${company.phone_number}`} className="text-foreground font-medium hover:underline text-blue-600 dark:text-blue-400">
                    {company.phone_number}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Not discovered</span>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-2.5">
              <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground block">Verified Email</span>
                {company.email ? (
                  <a href={`mailto:${company.email}`} className="text-blue-600 dark:text-blue-400 font-medium hover:underline">
                    {company.email}
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Not discovered</span>
                )}
              </div>
            </div>

            {/* Website */}
            <div className="flex items-start gap-2.5">
              <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground block">Official Website</span>
                {company.website_url ? (
                  <a
                    href={company.website_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-1"
                  >
                    {company.website_url}
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Not available</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Leadership Information */}
        <div className="space-y-2.5">
          <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-[10px] text-muted-foreground">
            Leadership & Executives
          </h4>

          <div className="space-y-2 bg-muted/10 p-3 rounded-lg border border-border/60">
            {/* Leader 1 */}
            <div className="flex items-start gap-2.5">
              <User className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground block">Primary Executive (Leader 1)</span>
                {company.leader_1_name ? (
                  <div>
                    <span className="text-foreground font-semibold">{company.leader_1_name}</span>
                    {company.leader_1_title && (
                      <span className="text-muted-foreground text-[11px] block">{company.leader_1_title}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Not discovered</span>
                )}
              </div>
            </div>

            {/* Leader 2 */}
            <div className="flex items-start gap-2.5 pt-2 border-t border-border/50">
              <Users className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="text-[10px] text-muted-foreground block">Secondary Executive (Leader 2)</span>
                {company.leader_2_name ? (
                  <div>
                    <span className="text-foreground font-semibold">{company.leader_2_name}</span>
                    {company.leader_2_title && (
                      <span className="text-muted-foreground text-[11px] block">{company.leader_2_title}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground italic text-[11px]">Not discovered</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Source / Provenance */}
        {company.source_url && (
          <div className="space-y-1.5">
            <h4 className="font-semibold text-foreground text-xs uppercase tracking-wider text-[10px] text-muted-foreground">
              Source & Reference
            </h4>
            <div className="p-2.5 rounded border bg-card/60 text-[11px]">
              <a
                href={company.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1 truncate"
              >
                <Globe className="w-3 h-3 shrink-0" />
                <span className="truncate">{company.source_url}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t bg-muted/20 flex items-center justify-between gap-2">
        <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
          Close
        </Button>
        {isAdded && company.company_id ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 text-emerald-600 border-emerald-300"
            onClick={() => {
              onClose();
              navigate("/pipeline/companies");
            }}
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Open in Companies
          </Button>
        ) : (
          canAdd && (
            <Button size="sm" onClick={() => onAddToCompanies(company)} className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground">
              <Plus className="w-3.5 h-3.5" /> Add to Companies
            </Button>
          )
        )}
      </div>
    </div>
  );
};

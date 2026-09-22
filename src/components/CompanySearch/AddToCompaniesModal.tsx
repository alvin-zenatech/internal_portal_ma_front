import React, { useState, useEffect } from "react";
import { type CompanySearchResult, useAddToCompanies, useCheckDuplicateCompany } from "@/hooks/useCompanySearch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

interface AddToCompaniesModalProps {
  company: CompanySearchResult | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (companyId: string) => void;
}

export const AddToCompaniesModal: React.FC<AddToCompaniesModalProps> = ({
  company,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [countryCode, setCountryCode] = useState("Canada");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");

  const { mutate: checkDuplicate, data: dupCheck } = useCheckDuplicateCompany();
  const { mutate: addToCompanies, isPending: isSaving } = useAddToCompanies();

  useEffect(() => {
    if (company && isOpen) {
      setName(company.company_name || "");
      setPhone(company.phone_number || "");
      setLocation(company.address_line1 || company.city || "");
      setStateCode(company.province_or_state || "");
      setCountryCode(company.country || "Canada");
      setContactName(company.leader_1_name || "");
      setEmail(company.email || "");

      // Check duplicates
      checkDuplicate({
        company_name: company.company_name,
        phone: company.phone_number,
        city: company.city,
        state: company.province_or_state,
      });
    }
  }, [company, isOpen, checkDuplicate]);

  if (!company) return null;

  const handleSubmit = (existingId?: number | string) => {
    addToCompanies(
      {
        resultId: company.id,
        payload: {
          company_name: name.trim(),
          phone: phone.trim() || undefined,
          location: location.trim() || undefined,
          state_code: stateCode.trim() || undefined,
          country_code: countryCode.trim() || undefined,
          contact_name: contactName.trim() || undefined,
          email: email.trim() || undefined,
          update_existing_id: existingId,
        },
      },
      {
        onSuccess: (res) => {
          onSuccess(res.company_id);
          onClose();
        },
      }
    );
  };

  const hasDuplicateMatches = dupCheck?.has_match && (dupCheck.matches || []).length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[550px] p-5 max-h-[90vh] overflow-y-auto" aria-describedby="add-to-companies-desc">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Building2 className="w-5 h-5 text-primary" />
            Add to Configuration → Companies
          </DialogTitle>
          <DialogDescription id="add-to-companies-desc" className="text-xs">
            Review scraped information before inserting or linking to your company repository.
          </DialogDescription>
        </DialogHeader>

        {/* Duplicate Warning Banner */}
        {hasDuplicateMatches && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Possible Duplicate Company Found in Database
            </div>
            <p className="text-[11px] text-muted-foreground">
              A company matching this record already exists in your Configuration repository.
            </p>
            <div className="space-y-1.5 pt-1">
              {dupCheck.matches.map((m, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border bg-card/60 text-[11px] flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-foreground">{m.existing_name}</span>
                    <span className="text-muted-foreground block text-[10px]">
                      Match: {m.match_type} ({Math.round(m.match_confidence * 100)}% match)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px]"
                    onClick={() => handleSubmit(m.existing_id)}
                    disabled={isSaving}
                  >
                    Link to Existing
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 py-2 text-xs">
          <div className="space-y-1">
            <Label className="text-[11px]">Company Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Address / Location</Label>
            <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-8 text-xs" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px]">State / Province</Label>
              <Input value={stateCode} onChange={(e) => setStateCode(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Country</Label>
              <Input value={countryCode} onChange={(e) => setCountryCode(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Primary Contact (Leader 1)</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving} className="h-8 text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={() => handleSubmit()} disabled={isSaving || !name.trim()} className="h-8 text-xs gap-1.5">
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Confirm & Save to Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

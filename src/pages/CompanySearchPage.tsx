import React from "react";
import { useNavigate } from "react-router-dom";
import { CompanySearchDialog } from "@/components/CompanySearch/CompanySearchDialog";

export const CompanySearchPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <CompanySearchDialog
      isOpen={true}
      onClose={() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate("/");
        }
      }}
    />
  );
};

export default CompanySearchPage;

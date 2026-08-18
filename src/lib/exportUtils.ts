import { format } from "date-fns";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number | null | undefined | boolean;
}

/**
 * Escapes a cell value for standard CSV format.
 * Quotes strings containing commas, quotes, or newlines, and escapes internal double-quotes.
 */
function escapeCsvValue(val: string | number | null | undefined | boolean): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "boolean") return val ? "Yes" : "No";
  
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports data to a CSV file and triggers a browser download.
 * Prepends UTF-8 BOM (\uFEFF) so Excel correctly handles UTF-8 characters.
 */
export function exportToCsv<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filenamePrefix: string
) {
  if (!data || data.length === 0) {
    throw new Error("No data available to export.");
  }

  // 1. Build CSV header row
  const headerRow = columns.map((col) => escapeCsvValue(col.header)).join(",");

  // 2. Build data rows
  const dataRows = data.map((row) =>
    columns.map((col) => escapeCsvValue(col.accessor(row))).join(",")
  );

  // 3. Combine with UTF-8 BOM
  const csvContent = "\uFEFF" + [headerRow, ...dataRows].join("\r\n");

  // 4. Create Blob and trigger download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `${filenamePrefix}_${timestamp}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

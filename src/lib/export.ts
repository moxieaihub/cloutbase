/**
 * Client-side report exports for the admin dashboard.
 * CSV is built by hand; PDF is drawn with jsPDF, loaded lazily so it never
 * enters the SSR bundle.
 */

export type ExportColumn<T> = { header: string; value: (row: T) => string | number };

function escapeCsv(value: string | number) {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "report"
  );
}

export function exportCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]) {
  const lines = [
    columns.map((c) => escapeCsv(c.header)).join(","),
    ...rows.map((r) => columns.map((c) => escapeCsv(c.value(r))).join(",")),
  ];
  download(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${filename}.csv`);
}

export async function exportPdf<T>(
  filename: string,
  title: string,
  subtitle: string,
  columns: ExportColumn<T>[],
  rows: T[],
  summary?: { label: string; value: string }[],
) {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableModule.default;

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  doc.setFontSize(16);
  doc.text(title, 40, 44);
  doc.setFontSize(9);
  doc.setTextColor(110);
  doc.text(subtitle, 40, 60);

  let startY = 78;
  if (summary?.length) {
    doc.setTextColor(30);
    doc.setFontSize(10);
    summary.forEach((s, i) => {
      const x = 40 + (i % 4) * 190;
      const y = startY + Math.floor(i / 4) * 30;
      doc.setTextColor(120);
      doc.setFontSize(8);
      doc.text(s.label, x, y);
      doc.setTextColor(20);
      doc.setFontSize(12);
      doc.text(s.value, x, y + 14);
    });
    startY += Math.ceil(summary.length / 4) * 30 + 12;
  }

  autoTable(doc, {
    startY,
    head: [columns.map((c) => c.header)],
    body: rows.map((r) => columns.map((c) => String(c.value(r)))),
    styles: { fontSize: 8, cellPadding: 5 },
    headStyles: { fillColor: [11, 11, 12], textColor: 245 },
    alternateRowStyles: { fillColor: [245, 244, 240] },
    margin: { left: 40, right: 40 },
  });

  doc.save(`${filename}.pdf`);
}

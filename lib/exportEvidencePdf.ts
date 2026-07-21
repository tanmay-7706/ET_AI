import { jsPDF } from "jspdf";
import { Doc } from "@/convex/_generated/dataModel";

export function generateEvidencePdf(evidencePackage: Doc<"evidencePackages">) {
  const doc = new jsPDF();

  const marginX = 20;
  let cursorY = 20;

  // Helper for text
  const addText = (text: string, x: number, y: number, options?: { fontSize?: number; fontStyle?: "normal" | "bold" | "italic"; color?: number[] }) => {
    if (options?.fontSize) doc.setFontSize(options.fontSize);
    if (options?.fontStyle) doc.setFont("helvetica", options.fontStyle);
    if (options?.color) doc.setTextColor(options.color[0], options.color[1], options.color[2]);
    else doc.setTextColor(0, 0, 0);

    const splitText = doc.splitTextToSize(text, 170); // 210mm width - 40mm margins
    doc.text(splitText, x, y);
    const lines = splitText.length;
    return lines * (options?.fontSize ? options.fontSize * 0.35 : 5); // Approximate height
  };

  // 1. Header
  doc.setFillColor(30, 41, 59); // Slate 800
  doc.rect(0, 0, 210, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Digital Safety Shield — Evidence Package", marginX, 15);
  
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 200);
  doc.text(`Generated: ${new Date().toISOString()}`, marginX, 22);
  doc.text(`Package ID: ${evidencePackage.packageId}`, 210 - marginX, 22, { align: "right" });

  cursorY = 45;

  // 2. Confidence Score & Status
  addText(`Confidence Score: ${(evidencePackage.confidenceScore * 100).toFixed(1)}%`, marginX, cursorY, { fontSize: 14, fontStyle: "bold", color: [220, 38, 38] }); // Red-600
  cursorY += 10;
  addText(`Status: ${evidencePackage.status.toUpperCase()}`, marginX, cursorY, { fontSize: 12, fontStyle: "bold" });
  cursorY += 15;

  // 3. Related IDs
  addText("Related Sessions:", marginX, cursorY, { fontSize: 12, fontStyle: "bold" });
  cursorY += 8;
  addText(evidencePackage.relatedSessionIds.join(", ") || "None", marginX, cursorY, { fontSize: 10, fontStyle: "normal" });
  cursorY += 12;

  addText("Related Entities:", marginX, cursorY, { fontSize: 12, fontStyle: "bold" });
  cursorY += 8;
  addText(evidencePackage.relatedEntityIds.join(", ") || "None", marginX, cursorY, { fontSize: 10, fontStyle: "normal" });
  cursorY += 15;

  // 4. Timeline
  doc.setDrawColor(200, 200, 200);
  doc.line(marginX, cursorY, 210 - marginX, cursorY);
  cursorY += 10;

  addText("Chronological Timeline", marginX, cursorY, { fontSize: 14, fontStyle: "bold" });
  cursorY += 12;

  const timeline = [...evidencePackage.timeline].sort((a, b) => a.timestamp - b.timestamp);

  for (const item of timeline) {
    if (cursorY > 260) {
      // Add Footer before new page
      addFooter(doc);
      doc.addPage();
      cursorY = 20;
    }

    const timeString = new Date(item.timestamp).toISOString();
    const h = addText(timeString, marginX, cursorY, { fontSize: 9, fontStyle: "bold", color: [100, 116, 139] });
    cursorY += h + 2;

    const eventH = addText(item.event, marginX + 5, cursorY, { fontSize: 11, fontStyle: "normal", color: [15, 23, 42] });
    cursorY += eventH + 2;

    const citH = addText(`Citation: ${item.sourceCitation}`, marginX + 5, cursorY, { fontSize: 9, fontStyle: "italic", color: [71, 85, 105] });
    cursorY += citH + 8;
  }

  // Footer for the last page
  addFooter(doc);

  // Trigger download
  doc.save(`evidence_${evidencePackage.packageId}.pdf`);
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(241, 245, 249); // Slate 100
    doc.rect(0, 280, 210, 17, "F");
    
    doc.setTextColor(220, 38, 38); // Red 600
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("SIMULATED DEMO DATA — Hackathon prototype, not an official law-enforcement record.", 105, 288, { align: "center" });
  }
}

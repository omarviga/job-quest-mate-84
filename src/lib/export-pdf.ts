import { jsPDF } from "jspdf";

import type { KeywordSuggestion, MatchAnalysisResult } from "./analyzer.functions";

export interface ExportPdfOptions {
  jobTitle: string;
  candidateName?: string;
  dateStr?: string;
  result: MatchAnalysisResult;
}

export function exportAnalysisToPdf({
  jobTitle,
  candidateName = "Lucía Ferrer",
  dateStr,
  result,
}: ExportPdfOptions) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(requiredHeight: number) {
    if (y + requiredHeight > pageHeight - margin - 10) {
      doc.addPage();
      y = margin;
      drawHeaderSmall();
    }
  }

  function drawHeaderSmall() {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(140, 140, 140);
    doc.text("RUMBO · Reporte de Coincidencia CV vs. Vacante", margin, y);
    doc.text("Generado con Gemini IA", pageWidth - margin, y, { align: "right" });
    y += 4;
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;
  }

  // --- 1. COVER / TOP BANNER ---
  // Background brand badge
  doc.setFillColor(235, 94, 40); // Accent brand color
  doc.roundedRect(margin, y, 10, 10, 2, 2, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("R", margin + 3.5, y + 7);

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("RUMBO", margin + 14, y + 5);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text("CENTRO DE CONTROL DE EMPLEO · MOTOR GEMINI IA", margin + 14, y + 9);

  const formattedDate =
    dateStr ||
    new Date().toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  doc.text(formattedDate, pageWidth - margin, y + 6, { align: "right" });
  y += 16;

  // Thin separator
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);
  y += 6;

  // Title of Report
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(20, 20, 20);
  doc.text("Reporte de Coincidencia de Perfil y Palabras Clave", margin, y);
  y += 6;

  // Job Title & Candidate Info
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Candidato: `, margin, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  doc.text(candidateName, margin + 21, y);

  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text(`Vacante analizada: `, margin, y);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 30, 30);
  const cleanJobTitle = jobTitle.length > 70 ? `${jobTitle.slice(0, 67)}...` : jobTitle;
  doc.text(cleanJobTitle, margin + 33, y);
  y += 8;

  // --- 2. MATCH SCORE & VERDICT BOX ---
  checkPageBreak(38);
  const scoreBoxY = y;
  const isGood = result.matchPercentage >= 80;
  const isMedium = result.matchPercentage >= 60;

  // Fill background box
  if (isGood) {
    doc.setFillColor(240, 253, 244); // light emerald
    doc.setDrawColor(187, 247, 208);
  } else if (isMedium) {
    doc.setFillColor(254, 252, 232); // light amber
    doc.setDrawColor(254, 240, 138);
  } else {
    doc.setFillColor(255, 241, 242); // light rose
    doc.setDrawColor(254, 205, 211);
  }
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, scoreBoxY, contentWidth, 28, 3, 3, "FD");

  // Score number
  if (isGood) {
    doc.setTextColor(22, 101, 52);
  } else if (isMedium) {
    doc.setTextColor(161, 98, 7);
  } else {
    doc.setTextColor(190, 18, 60);
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.text(`${result.matchPercentage}%`, margin + 6, scoreBoxY + 16);

  doc.setFontSize(7.5);
  doc.setFont("helvetica", "bold");
  doc.text("AFINIDAD ATS", margin + 6, scoreBoxY + 22);

  // Verdict text on right side of score
  doc.setTextColor(40, 40, 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const verdictLines = doc.splitTextToSize(result.matchVerdict, contentWidth - 45);
  doc.text(verdictLines, margin + 40, scoreBoxY + 9);

  y = scoreBoxY + 34;

  // --- 3. SUGGESTED KEYWORDS SECTION ---
  checkPageBreak(30);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("1. Palabras Clave Recomendadas para tu CV", margin, y);
  y += 2;
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(110, 110, 110);
  doc.text(
    "Términos técnicos y metodológicos detectados por Gemini que aumentarán tu puntuación en filtros ATS:",
    margin,
    y + 3,
  );
  y += 7;

  result.suggestedKeywords.forEach((kw: KeywordSuggestion) => {
    const isCritical = kw.importance === "crítica";
    const boxHeight = 18;
    checkPageBreak(boxHeight + 2);

    // Keyword item card
    doc.setFillColor(250, 250, 250);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, y, contentWidth, boxHeight, 2, 2, "FD");

    // Keyword Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(20, 20, 20);
    doc.text(kw.keyword, margin + 4, y + 6);

    // Importance pill
    const kwWidth = doc.getTextWidth(kw.keyword);
    const pillX = margin + 4 + kwWidth + 3;
    if (isCritical) {
      doc.setFillColor(254, 226, 226);
      doc.setTextColor(185, 28, 28);
    } else {
      doc.setFillColor(224, 242, 254);
      doc.setTextColor(3, 105, 161);
    }
    doc.roundedRect(pillX, y + 2, 22, 5, 1, 1, "F");
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "bold");
    doc.text(isCritical ? "CRÍTICA" : "RECOMENDADA", pillX + 2.5, y + 5.5);

    // Category
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(120, 120, 120);
    doc.text(`Categoría: ${kw.category}`, pageWidth - margin - 4, y + 6, { align: "right" });

    // Action recommendation
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(60, 60, 60);
    const actionLines = doc.splitTextToSize(`Acción: ${kw.action}`, contentWidth - 8);
    doc.text(actionLines, margin + 4, y + 12);

    y += boxHeight + 3;
  });

  y += 4;

  // --- 4. STRENGTHS VS CRITICAL GAPS ---
  checkPageBreak(40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("2. Fortalezas vs. Brechas Detectadas", margin, y);
  y += 6;

  // Strengths
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(22, 101, 52);
  doc.text("Puntos Fuertes Detectados:", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  result.matchingStrengths.forEach((str) => {
    checkPageBreak(12);
    // Draw green indicator dot
    doc.setFillColor(34, 197, 94);
    doc.circle(margin + 2, y - 1, 1, "F");

    const bulletLines = doc.splitTextToSize(str, contentWidth - 8);
    doc.text(bulletLines, margin + 6, y);
    y += bulletLines.length * 4.2 + 1.5;
  });

  y += 3;

  // Gaps
  checkPageBreak(25);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(180, 83, 9);
  doc.text("Brechas Críticas y Requisitos a Cubrir:", margin, y);
  y += 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(40, 40, 40);
  result.criticalGaps.forEach((gap) => {
    checkPageBreak(12);
    // Draw amber indicator dot
    doc.setFillColor(245, 158, 11);
    doc.circle(margin + 2, y - 1, 1, "F");

    const bulletLines = doc.splitTextToSize(gap, contentWidth - 8);
    doc.text(bulletLines, margin + 6, y);
    y += bulletLines.length * 4.2 + 1.5;
  });

  y += 5;

  // --- 5. ACTION PLAN ---
  checkPageBreak(35);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(20, 20, 20);
  doc.text("3. Plan de Acción Recomendado", margin, y);
  y += 6;

  result.actionPlan.forEach((step, idx) => {
    checkPageBreak(14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(235, 94, 40);
    doc.text(`Paso ${idx + 1}:`, margin + 2, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(40, 40, 40);
    const stepLines = doc.splitTextToSize(step, contentWidth - 20);
    doc.text(stepLines, margin + 18, y);
    y += stepLines.length * 4.2 + 3;
  });

  // --- FOOTER ON ALL PAGES ---
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.text(
      "RUMBO — Centro de control de empleo · Análisis asistido por Google Gemini",
      margin,
      pageHeight - 8,
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: "right",
    });
  }

  // Generate safe filename
  const safeTitle = jobTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 30);
  const filename = `rumbo-analisis-${safeTitle || "vacante"}-${Date.now().toString().slice(-4)}.pdf`;

  // Trigger download
  doc.save(filename);
}

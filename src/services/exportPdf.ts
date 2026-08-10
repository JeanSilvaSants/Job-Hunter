import { jsPDF } from 'jspdf';
import saveAs from 'file-saver';
import { FullResumeData } from './fullResume';
import { sanitizeFilename } from './exportDocx';

/**
 * Formats a date range string into a compact month format.
 * Example: "Setembro de 2022 – Novembro de 2023" -> "Set 2022 – Nov 2023"
 */
export function formatCompactPeriod(period: string): string {
  if (!period) return '';

  const monthMap: Record<string, string> = {
    janeiro: 'Jan',
    fevereiro: 'Fev',
    março: 'Mar',
    marco: 'Mar',
    abril: 'Abr',
    maio: 'Mai',
    junho: 'Jun',
    julho: 'Jul',
    agosto: 'Ago',
    setembro: 'Set',
    outubro: 'Out',
    novembro: 'Nov',
    dezembro: 'Dez',
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec',
  };

  let formatted = period;

  // Remove " de " between month word and 4-digit year (e.g. "Setembro de 2022" -> "Setembro 2022")
  formatted = formatted.replace(/([a-zA-ZçÇáéíóúÁÉÍÓÚ]+)\s+de\s+(\d{4})/gi, '$1 $2');

  // Abbreviate month names to 3 letters
  Object.entries(monthMap).forEach(([full, abbr]) => {
    const regex = new RegExp(`\\b${full}\\b`, 'gi');
    formatted = formatted.replace(regex, abbr);
  });

  // Normalize hyphen / dash separators
  formatted = formatted.replace(/\s*–\s*/g, ' – ').replace(/\s*-\s*/g, ' – ');

  return formatted.trim();
}

/**
 * Generates an ATS-friendly .pdf document with vector text and precise line wrapping.
 */
export async function generatePdfBlob(resume: FullResumeData): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageHeight = 297;
  const marginTop = 18;
  const marginBottom = 18;
  const marginLeft = 18;
  const contentWidth = 174; // 210 - 36 (margins)
  let y = marginTop;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  }

  function addSectionHeading(title: string) {
    checkPageBreak(14);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(title.toUpperCase(), marginLeft, y);
    y += 2.5;

    // Subtle line divider
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.setLineWidth(0.3);
    doc.line(marginLeft, y, marginLeft + contentWidth, y);
    y += 5;
  }

  // NAME
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text(resume.name, marginLeft, y);
  y += 6;

  // HEADLINE
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(37, 99, 235); // Blue-600
  const headlineLines = doc.splitTextToSize(resume.headline, contentWidth);
  doc.text(headlineLines, marginLeft, y);
  y += headlineLines.length * 4.5;

  // CONTACT INFO
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  const contactText = `Contato: ${resume.phone} | ${resume.email} | ${resume.linkedin} | ${resume.location}`;
  const contactLines = doc.splitTextToSize(contactText, contentWidth);
  doc.text(contactLines, marginLeft, y);
  y += contactLines.length * 4 + 4;

  // RESUMO PROFISSIONAL
  addSectionHeading('Resumo Profissional');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85); // Slate-700
  const summaryLines = doc.splitTextToSize(resume.professionalSummary, contentWidth);
  checkPageBreak(summaryLines.length * 4);
  doc.text(summaryLines, marginLeft, y);
  y += summaryLines.length * 4.2 + 5;

  // COMPETÊNCIAS & FERRAMENTAS
  addSectionHeading('Competências & Ferramentas');
  doc.setFontSize(8.5);

  const skillsText = `Competências Prioritárias: ${resume.prioritySkills.join(' • ')}`;
  const skillsLines = doc.splitTextToSize(skillsText, contentWidth);
  checkPageBreak(skillsLines.length * 3.8);
  doc.text(skillsLines, marginLeft, y);
  y += skillsLines.length * 3.8 + 2;

  const toolsText = `Ferramentas & Sistemas: ${resume.tools.join(', ')}`;
  const toolsLines = doc.splitTextToSize(toolsText, contentWidth);
  checkPageBreak(toolsLines.length * 3.8);
  doc.text(toolsLines, marginLeft, y);
  y += toolsLines.length * 3.8 + 2;

  const langsText = `Idiomas: ${resume.languages.map((l) => `${l.language} (${l.level})`).join(', ')}`;
  const langsLines = doc.splitTextToSize(langsText, contentWidth);
  checkPageBreak(langsLines.length * 3.8);
  doc.text(langsLines, marginLeft, y);
  y += langsLines.length * 3.8 + 5;

  // EXPERIÊNCIA PROFISSIONAL
  addSectionHeading('Experiência Profissional');

  resume.experiences.forEach((exp) => {
    // Check space for Company name + first role header + at least 1 bullet
    checkPageBreak(18);

    // Company Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(15, 23, 42); // Slate-900
    const companyLines = doc.splitTextToSize(exp.company.toUpperCase(), contentWidth);
    doc.text(companyLines, marginLeft, y);
    y += companyLines.length * 4.5 + 1.5;

    exp.roles.forEach((role) => {
      const formattedPeriod = formatCompactPeriod(role.period);

      // Measure width of role title and date
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      const titleWidth = doc.getTextWidth(role.title);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      const dateWidth = doc.getTextWidth(formattedPeriod);

      const minimumGap = 8; // 8mm gap required between title and date
      const fitsOnOneLine = titleWidth + dateWidth + minimumGap <= contentWidth;

      if (fitsOnOneLine) {
        checkPageBreak(12); // Title line + bullet minimum space

        // Title at Left
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.text(role.title, marginLeft, y);

        // Date right-aligned at content edge
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text(formattedPeriod, marginLeft + contentWidth, y, { align: 'right' });

        y += 4.5;
      } else {
        // Multi-line header (Role title on top, Date on next line)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        const titleLines = doc.splitTextToSize(role.title, contentWidth);

        const neededHeaderHeight = titleLines.length * 4.5 + 4.5;
        checkPageBreak(neededHeaderHeight + 8);

        doc.setTextColor(30, 41, 59);
        doc.text(titleLines, marginLeft, y);
        y += titleLines.length * 4.5;

        // Date rendered on next line, right-aligned to maintain alignment
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text(formattedPeriod, marginLeft + contentWidth, y, { align: 'right' });

        y += 4.5;
      }

      // Highlights / Bullets
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85); // Slate-700

      role.highlights.forEach((h) => {
        const bulletPrefix = '• ';
        const bulletIndent = 3; // 3mm indent
        const bulletWidth = contentWidth - bulletIndent;

        const hLines = doc.splitTextToSize(`${bulletPrefix}${h}`, bulletWidth);
        checkPageBreak(hLines.length * 3.6 + 1);

        doc.text(hLines, marginLeft + bulletIndent, y);
        y += hLines.length * 3.6 + 1.5;
      });

      y += 2.5; // Spacing after role
    });

    y += 2; // Spacing after company
  });

  // FORMAÇÃO ACADÊMICA
  addSectionHeading('Formação Acadêmica');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  resume.education.forEach((edu) => {
    const eduText = `•  ${edu.degree} — ${edu.institution} (${edu.status})`;
    const eduLines = doc.splitTextToSize(eduText, contentWidth);
    checkPageBreak(eduLines.length * 3.8 + 1);
    doc.text(eduLines, marginLeft, y);
    y += eduLines.length * 3.8 + 1.5;
  });

  y += 4;

  // IDIOMAS
  addSectionHeading('Idiomas');
  doc.setFontSize(8.5);
  resume.languages.forEach((lang) => {
    const lText = `•  ${lang.language}: ${lang.level}`;
    const lLines = doc.splitTextToSize(lText, contentWidth);
    checkPageBreak(lLines.length * 3.8 + 1);
    doc.text(lLines, marginLeft, y);
    y += lLines.length * 3.8 + 1;
  });

  const pdfOutput = doc.output('blob');
  return pdfOutput;
}

/**
 * Triggers browser download of PDF resume file.
 */
export async function exportResumeToPdf(
  resume: FullResumeData,
  companyName: string,
  jobTitle: string
): Promise<void> {
  const blob = await generatePdfBlob(resume);
  const compSanitized = sanitizeFilename(companyName);
  const titleSanitized = sanitizeFilename(jobTitle);
  const filename = `Jean_Silva_${compSanitized}_${titleSanitized}.pdf`;

  saveAs(blob, filename);
}

import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import { FullResumeData } from './fullResume';
import { sanitizeFilename } from './exportDocx';

/**
 * Generates an ATS-friendly .pdf document with vector text.
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
  const contentWidth = 174; // 210 - 36
  let y = marginTop;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - marginBottom) {
      doc.addPage();
      y = marginTop;
    }
  }

  function addSectionHeading(title: string) {
    checkPageBreak(12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59); // Slate-800
    doc.text(title.toUpperCase(), marginLeft, y);
    y += 2;

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
    checkPageBreak(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(exp.company.toUpperCase(), marginLeft, y);
    y += 4.5;

    exp.roles.forEach((role) => {
      checkPageBreak(6);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59);
      doc.text(role.title, marginLeft, y);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      const periodWidth = doc.getTextWidth(` (${role.period})`);
      doc.text(` (${role.period})`, marginLeft + doc.getTextWidth(role.title), y);
      y += 4;

      doc.setTextColor(51, 65, 85);
      role.highlights.forEach((h) => {
        const bulletText = `•  ${h}`;
        const hLines = doc.splitTextToSize(bulletText, contentWidth - 2);
        checkPageBreak(hLines.length * 3.6);
        doc.text(hLines, marginLeft + 2, y);
        y += hLines.length * 3.6 + 1;
      });

      y += 2;
    });

    y += 2;
  });

  // FORMAÇÃO ACADÊMICA
  addSectionHeading('Formação Acadêmica');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);

  resume.education.forEach((edu) => {
    const eduText = `•  ${edu.degree} — ${edu.institution} (${edu.status})`;
    const eduLines = doc.splitTextToSize(eduText, contentWidth);
    checkPageBreak(eduLines.length * 3.8);
    doc.text(eduLines, marginLeft, y);
    y += eduLines.length * 3.8 + 1.5;
  });

  y += 4;

  // IDIOMAS
  addSectionHeading('Idiomas');
  doc.setFontSize(8.5);
  resume.languages.forEach((lang) => {
    const lText = `•  ${lang.language}: ${lang.level}`;
    checkPageBreak(4);
    doc.text(lText, marginLeft, y);
    y += 4;
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

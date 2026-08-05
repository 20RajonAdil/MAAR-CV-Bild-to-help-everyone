/**
 * VitaForge Export Module
 * High-quality PDF via html2canvas + jsPDF
 * Word-compatible .doc via HTML blob (opens cleanly in Microsoft Word)
 */

(function () {
  'use strict';

  function showOverlay(show) {
    const el = document.getElementById('export-overlay');
    if (!el) return;
    if (show) {
      el.classList.remove('hidden');
      el.setAttribute('aria-hidden', 'false');
    } else {
      el.classList.add('hidden');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function getFileName() {
    const state = window.VitaForge?.getState?.() || {};
    const name = (state.fullName || 'My-CV').trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
    return name || 'VitaForge-CV';
  }

  async function exportPDF() {
    const preview = window.VitaForge?.getPreviewElement?.();
    if (!preview) {
      window.VitaForge?.toast?.('Preview not ready', 'error');
      return;
    }

    showOverlay(true);

    try {
      // Temporarily reset zoom for accurate capture
      const originalTransform = preview.style.transform;
      preview.style.transform = 'scale(1)';

      // Ensure white background and proper sizing
      const canvas = await html2canvas(preview, {
        scale: 2.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: preview.scrollWidth,
        windowHeight: preview.scrollHeight
      });

      preview.style.transform = originalTransform;

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const { jsPDF } = window.jspdf;

      // A4 dimensions in mm
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(getFileName() + '.pdf');
      window.VitaForge?.toast?.('PDF downloaded successfully');
    } catch (err) {
      console.error(err);
      window.VitaForge?.toast?.('PDF export failed. Try Print instead.', 'error');
    } finally {
      showOverlay(false);
    }
  }

  function exportDOCX() {
    // Generate a clean HTML document that Microsoft Word opens as editable .doc
    const state = window.VitaForge?.getState?.() || {};
    const preview = window.VitaForge?.getPreviewElement?.();
    if (!preview) return;

    const content = preview.innerHTML;

    const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${(state.fullName || 'CV').replace(/</g, '')}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    @page { size: A4; margin: 18mm 16mm; }
    body {
      font-family: Calibri, Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #111827;
      margin: 0;
      padding: 0;
    }
    .cv-header { text-align: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1.5pt solid #e5e7eb; }
    .cv-name { font-size: 20pt; font-weight: 700; margin-bottom: 4px; color: #0f172a; }
    .cv-contact { font-size: 9.5pt; color: #4b5563; }
    .cv-contact span { margin: 0 8px; }
    .cv-section { margin-bottom: 12px; }
    .cv-section-title {
      font-size: 11pt; font-weight: 700; text-transform: uppercase;
      letter-spacing: 0.06em; color: #1e293b;
      border-bottom: 1pt solid #e5e7eb; padding-bottom: 3px; margin-bottom: 6px;
    }
    .cv-body { color: #374151; font-size: 10pt; text-align: justify; }
    .cv-edu-header { margin-bottom: 2px; }
    .cv-edu-name { font-weight: 600; }
    .cv-edu-dates { float: right; color: #6b7280; font-size: 9.5pt; }
    .cv-edu-detail { color: #4b5563; font-size: 10pt; }
    .cv-gcse-table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 4px; }
    .cv-gcse-table th { text-align: left; font-weight: 600; border-bottom: 1pt solid #e5e7eb; padding: 2px 0; }
    .cv-gcse-table td { padding: 2px 0; color: #4b5563; }
    .cv-gcse-table td:last-child { text-align: right; width: 60px; }
    .cv-skills { margin: 0; padding: 0; }
    .cv-skill { display: inline; margin-right: 12px; font-size: 10pt; }
    .cv-skill::before { content: "• "; color: #6366f1; }
    .cv-job-title { font-weight: 600; }
    .cv-job-company { color: #4b5563; }
    .cv-job-dates { float: right; color: #6b7280; font-size: 9.5pt; }
    .cv-duties { margin: 2px 0 0 18px; padding: 0; color: #4b5563; font-size: 10pt; }
    .cv-duties li { margin-bottom: 1px; }
    .cv-empty-hint { display: none; }
    em { font-style: italic; color: #9ca3af; }
  </style>
</head>
<body>
  ${content}
</body>
</html>`;

    // Use .doc extension so Word opens it directly (HTML-based DOC)
    const blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getFileName() + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.VitaForge?.toast?.('Word document downloaded');
  }

  // Bind after DOM + app ready
  function bind() {
    const pdfBtn = document.getElementById('export-pdf');
    const docxBtn = document.getElementById('export-docx');
    if (pdfBtn) pdfBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelector('.export-dropdown')?.classList.remove('open');
      exportPDF();
    });
    if (docxBtn) docxBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelector('.export-dropdown')?.classList.remove('open');
      exportDOCX();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();

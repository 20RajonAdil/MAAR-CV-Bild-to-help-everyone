/**
 * MAAR CV — Export Module
 * Reliable single-page PDF + editable Word document
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
    const state = window.MAARCV?.getState?.() || {};
    const name = (state.fullName || 'My-CV').trim().replace(/\s+/g, '-').replace(/[^a-zA-Z0-9\-]/g, '');
    return name || 'MAAR-CV';
  }

  function getJsPDF() {
    // Support different ways the UMD build may expose itself
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (window.jsPDF) return window.jsPDF;
    if (typeof jspdf !== 'undefined' && jspdf.jsPDF) return jspdf.jsPDF;
    return null;
  }

  async function exportPDF() {
    const preview = window.MAARCV?.getPreviewElement?.();
    if (!preview) {
      window.MAARCV?.toast?.('Preview not ready', 'error');
      return;
    }

    // Check libraries are loaded
    if (typeof html2canvas !== 'function') {
      window.MAARCV?.toast?.('PDF library missing. Use the Print button instead.', 'error');
      console.error('html2canvas is not loaded. Check js/lib/html2canvas.min.js');
      return;
    }

    const JsPDFConstructor = getJsPDF();
    if (!JsPDFConstructor) {
      window.MAARCV?.toast?.('PDF library missing. Use the Print button instead.', 'error');
      console.error('jsPDF is not loaded. Check js/lib/jspdf.umd.min.js. window.jspdf =', window.jspdf);
      return;
    }

    showOverlay(true);

    const originalTransform = preview.style.transform;
    const originalMaxHeight = preview.style.maxHeight;
    const originalOverflow = preview.style.overflow;
    const originalWidth = preview.style.width;
    const originalHeight = preview.style.height;

    try {
      // Force clean capture state (pixels are more reliable than mm for canvas)
      preview.style.transform = 'none';
      preview.style.maxHeight = 'none';
      preview.style.overflow = 'visible';
      // Keep the visual size but ensure layout is stable
      preview.style.width = '210mm';

      await new Promise(function (r) { setTimeout(r, 120); });

      const canvas = await html2canvas(preview, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: -window.scrollY,
        windowWidth: preview.scrollWidth,
        windowHeight: preview.scrollHeight,
        onclone: function (clonedDoc) {
          // Make sure the cloned A4 page has no transform / max-height
          var cloned = clonedDoc.getElementById('cv-preview');
          if (cloned) {
            cloned.style.transform = 'none';
            cloned.style.maxHeight = 'none';
            cloned.style.overflow = 'visible';
          }
        }
      });

      // Restore immediately
      preview.style.transform = originalTransform;
      preview.style.maxHeight = originalMaxHeight;
      preview.style.overflow = originalOverflow;
      preview.style.width = originalWidth;
      preview.style.height = originalHeight;

      if (!canvas || canvas.width < 10 || canvas.height < 10) {
        throw new Error('Canvas capture failed (empty image)');
      }

      var imgData = canvas.toDataURL('image/jpeg', 0.95);

      var pdf = new JsPDFConstructor({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      var pageWidth = 210;
      var pageHeight = 297;
      var naturalImgHeight = (canvas.height * pageWidth) / canvas.width;

      if (naturalImgHeight <= pageHeight + 1) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, naturalImgHeight);
      } else {
        // Force single page by scaling to fit
        pdf.addImage(imgData, 'JPEG', 0, 0, pageWidth, pageHeight);
      }

      pdf.save(getFileName() + '.pdf');
      window.MAARCV?.toast?.('PDF downloaded successfully');
    } catch (err) {
      console.error('PDF export error:', err);
      preview.style.transform = originalTransform;
      preview.style.maxHeight = originalMaxHeight;
      preview.style.overflow = originalOverflow;
      preview.style.width = originalWidth;
      preview.style.height = originalHeight;

      window.MAARCV?.toast?.('PDF failed. Click Print and choose "Save as PDF".', 'error');
    } finally {
      showOverlay(false);
    }
  }

  function exportDOCX() {
    var state = window.MAARCV?.getState?.() || {};
    if (!state) return;

    function esc(str) {
      return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }
    function has(val) {
      return val && String(val).trim().length > 0;
    }

    var s = state;
    var body = '';

    // Header
    body += '<p class="name">' + (esc(s.fullName) || 'Your Full Name') + '</p>';
    var contacts = [];
    if (has(s.phone)) contacts.push(esc(s.phone));
    if (has(s.email)) contacts.push(esc(s.email));
    if (has(s.address) || has(s.postcode)) {
      contacts.push([s.address, s.postcode].filter(has).map(esc).join(', '));
    }
    body += '<p class="contact">' + contacts.join(' &nbsp;&middot;&nbsp; ') + '</p>';
    body += '<hr class="divider"/>';

    // Personal Profile
    if (has(s.studying) || has(s.skillsDeveloped) || has(s.careerGoal)) {
      body += '<p class="section-title">PERSONAL PROFILE</p>';
      var p = 'I am currently studying ';
      p += has(s.studying) ? esc(s.studying) : '[course]';
      p += ' and I would like to find the chance to get some work experience. I am a reliable, hard-working and motivated person who likes to learn and to be a member of a team. I have developed such skills as ';
      p += has(s.skillsDeveloped) ? esc(s.skillsDeveloped) : '[skills]';
      p += ' during my education and daily activities. I want to ';
      p += has(s.careerGoal) ? esc(s.careerGoal) : '[goal]';
      p += ' in the future. I am ready to study further, to be a part of the team and to make a successful career.';
      body += '<p class="body-text">' + p + '</p>';
    }

    // Education
    var hasSchool = has(s.schoolName) || has(s.schoolFrom) || has(s.schoolTo);
    var validGcse = (s.gcse || []).filter(function (g) { return has(g.subject) || has(g.grade); });
    var hasCollege = has(s.collegeName) || has(s.collegeCourse);

    if (hasSchool || validGcse.length || hasCollege) {
      body += '<p class="section-title">EDUCATION</p>';

      if (hasSchool) {
        body += '<p class="edu-line"><b>' + (esc(s.schoolName) || 'School') + '</b>';
        if (has(s.schoolFrom) || has(s.schoolTo)) {
          body += ' <span class="dates">' + [s.schoolFrom, s.schoolTo].filter(has).map(esc).join(' – ') + '</span>';
        }
        body += '</p>';
      }

      if (validGcse.length) {
        body += '<p class="sub-heading">GCSE Results</p>';
        body += '<table class="gcse"><thead><tr><th>Subject</th><th>Grade</th></tr></thead><tbody>';
        validGcse.forEach(function (g) {
          body += '<tr><td>' + (esc(g.subject) || '—') + '</td><td>' + (esc(g.grade) || '—') + '</td></tr>';
        });
        body += '</tbody></table>';
      }

      if (hasCollege) {
        body += '<p class="edu-line" style="margin-top:8pt"><b>' + (esc(s.collegeName) || 'College') + '</b></p>';
        if (has(s.collegeCourse)) {
          body += '<p class="body-text">' + esc(s.collegeCourse) + '</p>';
        }
      }
    }

    // Current Studies
    if (has(s.currentCourse) || has(s.currentSkills) || has(s.currentInclude)) {
      body += '<p class="section-title">CURRENT STUDIES</p>';
      var c = 'I am currently studying ';
      c += has(s.currentCourse) ? esc(s.currentCourse) : '[course]';
      c += '. During this course, I am gaining knowledge and practical skills in ';
      c += has(s.currentSkills) ? esc(s.currentSkills) : '[areas]';
      c += ', which include ';
      c += has(s.currentInclude) ? esc(s.currentInclude) : '[activities]';
      c += '.';
      body += '<p class="body-text">' + c + '</p>';
    }

    // Skills
    var validSkills = (s.skills || []).filter(has);
    if (validSkills.length) {
      body += '<p class="section-title">SKILLS</p>';
      body += '<p class="body-text">' + validSkills.map(function (sk) { return '&bull; ' + esc(sk); }).join('&nbsp;&nbsp;&nbsp;') + '</p>';
    }

    // Work Experience
    if (has(s.jobTitle) || has(s.company) || has(s.jobDuties)) {
      body += '<p class="section-title">WORK EXPERIENCE</p>';
      body += '<p class="edu-line"><b>' + (esc(s.jobTitle) || 'Role') + '</b>';
      if (has(s.company)) body += ' &mdash; ' + esc(s.company);
      if (has(s.jobDate)) body += ' <span class="dates">' + esc(s.jobDate) + '</span>';
      body += '</p>';
      if (has(s.jobDuties)) {
        s.jobDuties.split('\n').filter(function (l) { return l.trim(); }).forEach(function (d) {
          body += '<p class="bullet">&bull; ' + esc(d.trim()) + '</p>';
        });
      }
    }

    // Volunteering
    if (has(s.volOrg) || has(s.volPosition) || has(s.volDuties)) {
      body += '<p class="section-title">VOLUNTEERING</p>';
      body += '<p class="edu-line"><b>' + (esc(s.volPosition) || 'Volunteer') + '</b>';
      if (has(s.volOrg)) body += ' &mdash; ' + esc(s.volOrg);
      body += '</p>';
      if (has(s.volDuties)) {
        s.volDuties.split('\n').filter(function (l) { return l.trim(); }).forEach(function (d) {
          body += '<p class="bullet">&bull; ' + esc(d.trim()) + '</p>';
        });
      }
    }

    // Achievements
    var validAch = (s.achievements || []).filter(has);
    if (validAch.length) {
      body += '<p class="section-title">ACHIEVEMENTS &amp; CERTIFICATIONS</p>';
      validAch.forEach(function (a) {
        body += '<p class="bullet">&bull; ' + esc(a) + '</p>';
      });
    }

    var html = '<!DOCTYPE html>\n' +
'<html xmlns:o="urn:schemas-microsoft-com:office:office"\n' +
'      xmlns:w="urn:schemas-microsoft-com:office:word"\n' +
'      xmlns="http://www.w3.org/TR/REC-html40">\n' +
'<head>\n' +
'  <meta charset="utf-8">\n' +
'  <title>' + (esc(s.fullName) || 'CV') + '</title>\n' +
'  <!--[if gte mso 9]>\n' +
'  <xml>\n' +
'    <w:WordDocument>\n' +
'      <w:View>Print</w:View>\n' +
'      <w:Zoom>100</w:Zoom>\n' +
'      <w:DoNotOptimizeForBrowser/>\n' +
'    </w:WordDocument>\n' +
'  </xml>\n' +
'  <![endif]-->\n' +
'  <style>\n' +
'    @page { size: A4; margin: 15mm 16mm; }\n' +
'    body {\n' +
'      font-family: Calibri, Arial, Helvetica, sans-serif;\n' +
'      font-size: 11pt;\n' +
'      line-height: 1.35;\n' +
'      color: #111827;\n' +
'      margin: 0;\n' +
'      padding: 0;\n' +
'    }\n' +
'    p.name {\n' +
'      font-size: 20pt;\n' +
'      font-weight: 700;\n' +
'      text-align: center;\n' +
'      margin: 0 0 4pt 0;\n' +
'      padding: 0;\n' +
'      color: #0f172a;\n' +
'    }\n' +
'    p.contact {\n' +
'      font-size: 10pt;\n' +
'      text-align: center;\n' +
'      color: #4b5563;\n' +
'      margin: 0 0 8pt 0;\n' +
'      padding: 0;\n' +
'    }\n' +
'    hr.divider {\n' +
'      border: none;\n' +
'      border-top: 1.5pt solid #d1d5db;\n' +
'      margin: 0 0 12pt 0;\n' +
'    }\n' +
'    p.section-title {\n' +
'      font-size: 11pt;\n' +
'      font-weight: 700;\n' +
'      text-transform: uppercase;\n' +
'      letter-spacing: 0.6pt;\n' +
'      color: #1e293b;\n' +
'      border-bottom: 1pt solid #e5e7eb;\n' +
'      margin-top: 16pt;\n' +
'      margin-bottom: 6pt;\n' +
'      padding-bottom: 3pt;\n' +
'    }\n' +
'    p.sub-heading {\n' +
'      font-size: 10.5pt;\n' +
'      font-weight: 600;\n' +
'      margin: 8pt 0 3pt 0;\n' +
'      padding: 0;\n' +
'      color: #374151;\n' +
'    }\n' +
'    p.body-text {\n' +
'      font-size: 10.5pt;\n' +
'      color: #374151;\n' +
'      margin: 0 0 4pt 0;\n' +
'      padding: 0;\n' +
'      text-align: justify;\n' +
'    }\n' +
'    p.edu-line {\n' +
'      font-size: 10.5pt;\n' +
'      margin: 3pt 0 2pt 0;\n' +
'      padding: 0;\n' +
'    }\n' +
'    span.dates {\n' +
'      color: #6b7280;\n' +
'      font-size: 10pt;\n' +
'      float: right;\n' +
'    }\n' +
'    p.bullet {\n' +
'      font-size: 10.5pt;\n' +
'      color: #374151;\n' +
'      margin: 2pt 0 2pt 14pt;\n' +
'      padding: 0;\n' +
'    }\n' +
'    table.gcse {\n' +
'      width: 100%;\n' +
'      border-collapse: collapse;\n' +
'      font-size: 10pt;\n' +
'      margin: 3pt 0 8pt 0;\n' +
'    }\n' +
'    table.gcse th {\n' +
'      text-align: left;\n' +
'      font-weight: 600;\n' +
'      border-bottom: 1pt solid #e5e7eb;\n' +
'      padding: 2pt 0;\n' +
'      color: #374151;\n' +
'    }\n' +
'    table.gcse td {\n' +
'      padding: 1.5pt 0;\n' +
'      color: #4b5563;\n' +
'    }\n' +
'    table.gcse td:last-child {\n' +
'      text-align: right;\n' +
'      width: 50pt;\n' +
'    }\n' +
'  </style>\n' +
'</head>\n' +
'<body>\n' +
body +
'\n</body>\n</html>';

    var blob = new Blob(['\ufeff' + html], { type: 'application/msword' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = getFileName() + '.doc';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    window.MAARCV?.toast?.('Word document downloaded – fully editable');
  }

  function bind() {
    var pdfBtn = document.getElementById('export-pdf');
    var docxBtn = document.getElementById('export-docx');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var dd = document.querySelector('.export-dropdown');
        if (dd) dd.classList.remove('open');
        exportPDF();
      });
    }
    if (docxBtn) {
      docxBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        var dd = document.querySelector('.export-dropdown');
        if (dd) dd.classList.remove('open');
        exportDOCX();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }
})();

/**
 * MAARCV — Premium CV Builder
 * Core application logic: state, live preview, localStorage, undo/redo, guided inputs
 */

(function () {
  'use strict';

  // ========== STATE ==========
  const defaultState = {
    fullName: 'Md Adil Ahmed Rajon',
    phone: '+447440445929',
    email: 'rajonadil@gmail.com',
    address: 'Birmingham',
    postcode: 'B19 1LH',
    studying: 'Business Level 2',
    skillsDeveloped: 'Communication skills and Web designing',
    careerGoal: 'become a Website Developer',
    schoolName: 'Fortis Academy',
    schoolFrom: 'April 2022',
    schoolTo: 'June 2026',
    gcse: [
      { subject: 'English Language', grade: '2' },
      { subject: 'English Literature', grade: '2' },
      { subject: 'Mathematics', grade: '2' },
      { subject: 'Science', grade: '3-2' },
      { subject: 'Food Prep And Nutrition Written', grade: '4' },
      { subject: 'Geography', grade: '2' },
      { subject: 'Bengali Tier H', grade: '8' },
      { subject: 'Performing Art', grade: 'D1' }
    ],
    collegeName: 'Matthew Boulton College',
    collegeCourse: 'Business Level 1, Business Level 2',
    collegeFrom: '',
    collegeTo: '',
    currentCourse: 'Business Level 2',
    currentSkills: 'Marketing, Communication skills and money management',
    currentInclude: 'Talking to people and Presentation',
    skills: [
      'Leadership skill',
      'Communication skill',
      'IT skill',
      'Prom engineering',
      'Website designing'
    ],
    jobTitle: '',
    company: '',
    jobDate: '',
    jobDuties: '',
    volOrg: '',
    volPosition: '',
    volDuties: '',
    achievements: [
      'EAL Certificate',
      'Business Level 1 certificate',
      'Food Prep And Nutrition Written',
      'Performing Art',
      'Bengali Tier H'
    ]
  };

  let state = structuredClone(defaultState);
  let history = [structuredClone(state)];
  let historyIndex = 0;
  const MAX_HISTORY = 50;
  let zoom = 1;
  let saveTimeout = null;
  let isRestoring = false;

  // ========== DOM REFS ==========
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const preview = $('#cv-preview');
  const gcseList = $('#gcse-list');
  const skillsList = $('#skills-list');
  const achievementsList = $('#achievements-list');
  const saveStatus = $('#save-status');
  const themeToggle = $('#theme-toggle');
  const exportBtn = $('#btn-export');
  const exportMenu = $('#export-menu');

  // ========== UTILITIES ==========
  function toast(msg, type = 'success') {
    const container = $('#toast-container');
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    container.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(8px)';
      el.style.transition = 'all 0.3s';
      setTimeout(() => el.remove(), 300);
    }, 2800);
  }

  function debounce(fn, ms) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  // ========== THEME ==========
  function initTheme() {
    const saved = localStorage.getItem('maar-theme') || 
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleTheme() {
    const html = document.documentElement;
    const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('maar-theme', next);
  }

  // ========== HISTORY (Undo / Redo) ==========
  function pushHistory() {
    if (isRestoring) return;
    // Truncate future if we branched
    history = history.slice(0, historyIndex + 1);
    history.push(structuredClone(state));
    if (history.length > MAX_HISTORY) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  }

  const debouncedPush = debounce(pushHistory, 400);

  function undo() {
    if (historyIndex <= 0) return;
    historyIndex--;
    isRestoring = true;
    state = structuredClone(history[historyIndex]);
    syncFormFromState();
    renderPreview();
    isRestoring = false;
    updateHistoryButtons();
    toast('Undone');
  }

  function redo() {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    isRestoring = true;
    state = structuredClone(history[historyIndex]);
    syncFormFromState();
    renderPreview();
    isRestoring = false;
    updateHistoryButtons();
    toast('Redone');
  }

  function updateHistoryButtons() {
    $('#btn-undo').disabled = historyIndex <= 0;
    $('#btn-redo').disabled = historyIndex >= history.length - 1;
    $('#btn-undo').style.opacity = historyIndex <= 0 ? '0.4' : '1';
    $('#btn-redo').style.opacity = historyIndex >= history.length - 1 ? '0.4' : '1';
  }

  // ========== LOCAL STORAGE ==========
  function saveLocal() {
    try {
      localStorage.setItem('maar-cv-data', JSON.stringify(state));
      saveStatus.textContent = 'All changes saved locally';
    } catch (e) {
      saveStatus.textContent = 'Unable to save';
    }
  }

  const debouncedSave = debounce(saveLocal, 500);

  function loadLocal() {
    try {
      const raw = localStorage.getItem('maar-cv-data');
      if (raw) {
        const parsed = JSON.parse(raw);
        // If the saved data is empty / old, prefer the rich default
        if (!parsed.fullName || !String(parsed.fullName).trim()) {
          state = structuredClone(defaultState);
        } else {
          state = { ...structuredClone(defaultState), ...parsed };
        }
        // Ensure arrays
        if (!Array.isArray(state.gcse) || state.gcse.length === 0) {
          state.gcse = structuredClone(defaultState.gcse);
        }
        if (!Array.isArray(state.skills) || state.skills.length === 0) {
          state.skills = structuredClone(defaultState.skills);
        }
        if (!Array.isArray(state.achievements) || state.achievements.length === 0) {
          state.achievements = structuredClone(defaultState.achievements);
        }
        history = [structuredClone(state)];
        historyIndex = 0;
      }
    } catch (e) { /* ignore */ }
  }

  // ========== FORM SYNC ==========
  function syncFormFromState() {
    // Simple fields
    const map = [
      'fullName', 'phone', 'email', 'address', 'postcode',
      'studying', 'skillsDeveloped', 'careerGoal',
      'schoolName', 'schoolFrom', 'schoolTo',
      'collegeName', 'collegeCourse', 'collegeFrom', 'collegeTo',
      'currentCourse', 'currentSkills', 'currentInclude',
      'jobTitle', 'company', 'jobDate', 'jobDuties',
      'volOrg', 'volPosition', 'volDuties'
    ];
    map.forEach(key => {
      const el = document.getElementById(key) || document.querySelector(`[data-field="${key}"]`);
      if (el) el.value = state[key] || '';
    });

    renderGcseRows();
    renderSkillRows();
    renderAchievementRows();
  }

  function updateStateFromInput(field, value) {
    if (field in state) {
      state[field] = value;
      debouncedSave();
      debouncedPush();
      renderPreview();
    }
  }

  // ========== DYNAMIC LISTS ==========
  function renderGcseRows() {
    gcseList.innerHTML = '';
    state.gcse.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'gcse-row';
      row.innerHTML = `
        <input type="text" placeholder="Subject" value="${escapeAttr(item.subject)}" data-gcse-idx="${i}" data-gcse-key="subject" aria-label="GCSE subject ${i+1}" />
        <input type="text" placeholder="Grade" value="${escapeAttr(item.grade)}" data-gcse-idx="${i}" data-gcse-key="grade" aria-label="GCSE grade ${i+1}" />
        <button type="button" class="btn-remove" data-remove-gcse="${i}" title="Remove" aria-label="Remove subject">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      gcseList.appendChild(row);
    });
  }

  function renderSkillRows() {
    skillsList.innerHTML = '';
    state.skills.forEach((sk, i) => {
      const row = document.createElement('div');
      row.className = 'skill-row';
      row.innerHTML = `
        <input type="text" placeholder="e.g. Communication, Teamwork, Microsoft Office" value="${escapeAttr(sk)}" data-skill-idx="${i}" aria-label="Skill ${i+1}" />
        <button type="button" class="btn-remove" data-remove-skill="${i}" title="Remove" aria-label="Remove skill">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      skillsList.appendChild(row);
    });
  }

  function renderAchievementRows() {
    achievementsList.innerHTML = '';
    state.achievements.forEach((ach, i) => {
      const row = document.createElement('div');
      row.className = 'achievement-row';
      row.innerHTML = `
        <input type="text" placeholder="e.g. First Aid Certificate, Duke of Edinburgh Bronze" value="${escapeAttr(ach)}" data-ach-idx="${i}" aria-label="Achievement ${i+1}" />
        <button type="button" class="btn-remove" data-remove-ach="${i}" title="Remove" aria-label="Remove achievement">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      `;
      achievementsList.appendChild(row);
    });
  }

  function escapeAttr(str) {
    return String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ========== LIVE PREVIEW RENDER ==========
  function hasContent(val) {
    return val && String(val).trim().length > 0;
  }

  function renderPreview() {
    const s = state;
    let html = '';

    // === HEADER ===
    const name = hasContent(s.fullName) ? escapeHtml(s.fullName) : '<span class="cv-empty-hint">Your Full Name</span>';
    html += `<div class="cv-header">
      <div class="cv-name">${name}</div>
      <div class="cv-contact">`;
    const contacts = [];
    if (hasContent(s.phone)) contacts.push(`<span>${escapeHtml(s.phone)}</span>`);
    if (hasContent(s.email)) contacts.push(`<span>${escapeHtml(s.email)}</span>`);
    if (hasContent(s.address) || hasContent(s.postcode)) {
      contacts.push(`<span>${[s.address, s.postcode].filter(hasContent).map(escapeHtml).join(', ')}</span>`);
    }
    if (contacts.length) html += contacts.join('');
    else html += `<span class="cv-empty-hint">Phone · Email · City, Postcode</span>`;
    html += `</div></div>`;

    // === PERSONAL PROFILE ===
    if (hasContent(s.studying) || hasContent(s.skillsDeveloped) || hasContent(s.careerGoal)) {
      let p = 'I am currently studying ';
      p += hasContent(s.studying) ? escapeHtml(s.studying) : '<em>[course]</em>';
      p += ' and I would like to find the chance to get some work experience. I am a reliable, hard-working and motivated person who likes to learn and to be a member of a team. I have developed such skills as ';
      p += hasContent(s.skillsDeveloped) ? escapeHtml(s.skillsDeveloped) : '<em>[skills]</em>';
      p += ' during my education and daily activities. I want to ';
      p += hasContent(s.careerGoal) ? escapeHtml(s.careerGoal) : '<em>[goal]</em>';
      p += ' in the future. I am ready to study further, to be a part of the team and to make a successful career.';
      html += `<div class="cv-section"><div class="cv-section-title">Personal Profile</div><div class="cv-body cv-profile">${p}</div></div>`;
    }

    // === EDUCATION (School + GCSE + College) ===
    const hasSchool = hasContent(s.schoolName) || hasContent(s.schoolFrom) || hasContent(s.schoolTo);
    const validGcse = (s.gcse || []).filter(g => hasContent(g.subject) || hasContent(g.grade));
    const hasCollege = hasContent(s.collegeName) || hasContent(s.collegeCourse);

    if (hasSchool || validGcse.length || hasCollege) {
      html += `<div class="cv-section"><div class="cv-section-title">Education</div>`;

      if (hasSchool) {
        html += `<div class="cv-edu-item">
          <div class="cv-edu-header">
            <span class="cv-edu-name">${escapeHtml(s.schoolName) || 'School'}</span>
            <span class="cv-edu-dates">${[s.schoolFrom, s.schoolTo].filter(hasContent).map(escapeHtml).join(' – ')}</span>
          </div>
        </div>`;
      }

      if (validGcse.length) {
        html += `<div class="cv-edu-item" style="margin-top:6px">
          <div class="cv-edu-detail" style="font-weight:600;margin-bottom:3px">GCSE Results</div>
          <table class="cv-gcse-table">
            <thead><tr><th>Subject</th><th>Grade</th></tr></thead>
            <tbody>`;
        validGcse.forEach(g => {
          html += `<tr><td>${escapeHtml(g.subject) || '—'}</td><td>${escapeHtml(g.grade) || '—'}</td></tr>`;
        });
        html += `</tbody></table></div>`;
      }

      if (hasCollege) {
        html += `<div class="cv-edu-item" style="margin-top:8px">
          <div class="cv-edu-header">
            <span class="cv-edu-name">${escapeHtml(s.collegeName) || 'College'}</span>
            <span class="cv-edu-dates">${[s.collegeFrom, s.collegeTo].filter(hasContent).map(escapeHtml).join(' – ')}</span>
          </div>
          ${hasContent(s.collegeCourse) ? `<div class="cv-edu-detail">${escapeHtml(s.collegeCourse)}</div>` : ''}
        </div>`;
      }

      html += `</div>`;
    }

    // === CURRENT STUDIES ===
    if (hasContent(s.currentCourse) || hasContent(s.currentSkills) || hasContent(s.currentInclude)) {
      let c = 'I am currently studying ';
      c += hasContent(s.currentCourse) ? escapeHtml(s.currentCourse) : '<em>[course]</em>';
      c += '. During this course, I am gaining knowledge and practical skills in ';
      c += hasContent(s.currentSkills) ? escapeHtml(s.currentSkills) : '<em>[areas]</em>';
      c += ', which include ';
      c += hasContent(s.currentInclude) ? escapeHtml(s.currentInclude) : '<em>[activities]</em>';
      c += '.';
      html += `<div class="cv-section"><div class="cv-section-title">Current Studies</div><div class="cv-body">${c}</div></div>`;
    }

    // === SKILLS ===
    const validSkills = (s.skills || []).filter(hasContent);
    if (validSkills.length) {
      html += `<div class="cv-section"><div class="cv-section-title">Skills</div><div class="cv-skills">`;
      validSkills.forEach(sk => {
        html += `<span class="cv-skill">${escapeHtml(sk)}</span>`;
      });
      html += `</div></div>`;
    }

    // === WORK EXPERIENCE (only if filled) ===
    if (hasContent(s.jobTitle) || hasContent(s.company) || hasContent(s.jobDuties)) {
      html += `<div class="cv-section"><div class="cv-section-title">Work Experience</div>
        <div class="cv-job-header">
          <div>
            <span class="cv-job-title">${escapeHtml(s.jobTitle) || 'Role'}</span>
            ${hasContent(s.company) ? ` — <span class="cv-job-company">${escapeHtml(s.company)}</span>` : ''}
          </div>
          ${hasContent(s.jobDate) ? `<span class="cv-job-dates">${escapeHtml(s.jobDate)}</span>` : ''}
        </div>`;
      if (hasContent(s.jobDuties)) {
        const duties = s.jobDuties.split('\n').filter(l => l.trim());
        if (duties.length) {
          html += `<ul class="cv-duties">`;
          duties.forEach(d => { html += `<li>${escapeHtml(d.trim())}</li>`; });
          html += `</ul>`;
        }
      }
      html += `</div>`;
    }

    // === VOLUNTEERING (only if filled) ===
    if (hasContent(s.volOrg) || hasContent(s.volPosition) || hasContent(s.volDuties)) {
      html += `<div class="cv-section"><div class="cv-section-title">Volunteering</div>
        <div class="cv-job-header">
          <div>
            <span class="cv-job-title">${escapeHtml(s.volPosition) || 'Volunteer'}</span>
            ${hasContent(s.volOrg) ? ` — <span class="cv-job-company">${escapeHtml(s.volOrg)}</span>` : ''}
          </div>
        </div>`;
      if (hasContent(s.volDuties)) {
        const duties = s.volDuties.split('\n').filter(l => l.trim());
        if (duties.length) {
          html += `<ul class="cv-duties">`;
          duties.forEach(d => { html += `<li>${escapeHtml(d.trim())}</li>`; });
          html += `</ul>`;
        }
      }
      html += `</div>`;
    }

    // === ACHIEVEMENTS (only if filled) ===
    const validAch = (s.achievements || []).filter(hasContent);
    if (validAch.length) {
      html += `<div class="cv-section"><div class="cv-section-title">Achievements &amp; Certifications</div>
        <ul class="cv-duties">`;
      validAch.forEach(a => { html += `<li>${escapeHtml(a)}</li>`; });
      html += `</ul></div>`;
    }

    preview.innerHTML = html || '<div style="padding:40px;text-align:center;color:#9ca3af;font-size:11pt">Start filling the form — your CV will appear here in real time</div>';
  }

  // ========== EVENT BINDING ==========
  function bindEvents() {
    // Theme
    themeToggle.addEventListener('click', toggleTheme);

    // Undo / Redo / Reset
    $('#btn-undo').addEventListener('click', undo);
    $('#btn-redo').addEventListener('click', redo);
    $('#btn-reset').addEventListener('click', () => {
      if (confirm('Reset all fields? This cannot be undone from history after reset.')) {
        state = structuredClone(defaultState);
        history = [structuredClone(state)];
        historyIndex = 0;
        syncFormFromState();
        renderPreview();
        saveLocal();
        updateHistoryButtons();
        toast('CV reset');
      }
    });

    // Print mode
    $('#btn-print').addEventListener('click', () => {
      document.body.classList.add('print-mode');
      window.print();
      setTimeout(() => document.body.classList.remove('print-mode'), 500);
    });

    // Export dropdown
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      $('.export-dropdown').classList.toggle('open');
      exportBtn.setAttribute('aria-expanded', $('.export-dropdown').classList.contains('open'));
    });
    document.addEventListener('click', () => {
      $('.export-dropdown').classList.remove('open');
      exportBtn.setAttribute('aria-expanded', 'false');
    });

    // Zoom
    $('#zoom-in').addEventListener('click', () => {
      zoom = Math.min(1.4, zoom + 0.1);
      applyZoom();
    });
    $('#zoom-out').addEventListener('click', () => {
      zoom = Math.max(0.6, zoom - 0.1);
      applyZoom();
    });

    // Simple text fields + guided
    document.querySelectorAll('[data-field]').forEach(el => {
      el.addEventListener('input', () => {
        updateStateFromInput(el.dataset.field, el.value);
      });
    });

    // GCSE add
    $('#add-gcse').addEventListener('click', () => {
      state.gcse.push({ subject: '', grade: '' });
      renderGcseRows();
      pushHistory();
      saveLocal();
      renderPreview();
    });

    // Skills add
    $('#add-skill').addEventListener('click', () => {
      state.skills.push('');
      renderSkillRows();
      pushHistory();
      saveLocal();
    });

    // Achievements add
    $('#add-achievement').addEventListener('click', () => {
      state.achievements.push('');
      renderAchievementRows();
      pushHistory();
      saveLocal();
    });

    // Delegated events for dynamic lists
    gcseList.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.gcseIdx !== undefined) {
        const i = +t.dataset.gcseIdx;
        const key = t.dataset.gcseKey;
        state.gcse[i][key] = t.value;
        debouncedSave();
        debouncedPush();
        renderPreview();
      }
    });
    gcseList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-gcse]');
      if (btn) {
        const i = +btn.dataset.removeGcse;
        state.gcse.splice(i, 1);
        if (state.gcse.length === 0) state.gcse.push({ subject: '', grade: '' });
        renderGcseRows();
        pushHistory();
        saveLocal();
        renderPreview();
      }
    });

    skillsList.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.skillIdx !== undefined) {
        state.skills[+t.dataset.skillIdx] = t.value;
        debouncedSave();
        debouncedPush();
        renderPreview();
      }
    });
    skillsList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-skill]');
      if (btn) {
        const i = +btn.dataset.removeSkill;
        state.skills.splice(i, 1);
        if (state.skills.length === 0) state.skills.push('');
        renderSkillRows();
        pushHistory();
        saveLocal();
        renderPreview();
      }
    });

    achievementsList.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.achIdx !== undefined) {
        state.achievements[+t.dataset.achIdx] = t.value;
        debouncedSave();
        debouncedPush();
        renderPreview();
      }
    });
    achievementsList.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-remove-ach]');
      if (btn) {
        const i = +btn.dataset.removeAch;
        state.achievements.splice(i, 1);
        if (state.achievements.length === 0) state.achievements.push('');
        renderAchievementRows();
        pushHistory();
        saveLocal();
        renderPreview();
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    });

    // Button ripple
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('pointerdown', (e) => {
        const rect = btn.getBoundingClientRect();
        btn.style.setProperty('--x', (e.clientX - rect.left) + 'px');
        btn.style.setProperty('--y', (e.clientY - rect.top) + 'px');
      });
    });
  }

  function applyZoom() {
    preview.style.transform = `scale(${zoom})`;
    $('#zoom-level').textContent = Math.round(zoom * 100) + '%';
  }

  // ========== INIT ==========
  function init() {
    initTheme();
    loadLocal();
    syncFormFromState();
    renderPreview();
    bindEvents();
    updateHistoryButtons();
    applyZoom();

    // Expose state for export module
    window.MAARCV = {
      getState: () => structuredClone(state),
      getPreviewElement: () => preview,
      toast
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

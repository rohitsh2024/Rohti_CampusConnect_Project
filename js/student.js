/*
  Student Dashboard Script (student.js)

 */

document.addEventListener('DOMContentLoaded', () => {

  // ── Stub data — temporary UI state for testing ────────────
  const NOTICES = [
    { id: 1, title: 'Mid-Semester Exam Schedule Released', date: '2026-07-08', body: 'Mid-sem exams are scheduled from July 20–28. Timetable is available on the portal.', category: 'academic' },
    { id: 2, title: 'Annual Tech Fest — Registrations Open', date: '2026-07-06', body: 'Register before July 15 to participate in TechFest 2026. All streams welcome.', category: 'event' },
    { id: 3, title: 'Library Holiday Notice', date: '2026-07-04', body: 'Library will remain closed on July 10 (campus holiday).', category: 'general' },
  ];

  const ASSIGNMENTS = [
    { id: 1, title: 'Binary Search Tree Implementation', subject: 'Data Structures', due: '2026-07-15', status: 'pending' },
    { id: 2, title: 'ER Diagram — College DB',           subject: 'DBMS',            due: '2026-07-12', status: 'submitted' },
    { id: 3, title: 'TCP/IP Layer Analysis Report',      subject: 'Computer Networks',due: '2026-07-20', status: 'pending' },
    { id: 4, title: 'Sorting Algorithm Comparison',      subject: 'Data Structures', due: '2026-07-08', status: 'graded' },
  ];

  const JOBS = [
    { id: 1, title: 'Software Engineer Intern',  company: 'TechCorp India',    tags: ['React', 'Node.js', 'Remote'], deadline: '2026-07-25', link: '#' },
    { id: 2, title: 'Data Analyst Intern',       company: 'DataWorks Pvt. Ltd',tags: ['Python', 'SQL', 'Mumbai'],    deadline: '2026-07-30', link: '#' },
    { id: 3, title: 'UI/UX Design Intern',       company: 'DesignHub',         tags: ['Figma', 'CSS', 'Hybrid'],     deadline: '2026-08-05', link: '#' },
  ];

  const PROFILE = {
    firstName: 'Rohit', lastName: 'Sharma',
    email: 'rohit.sharma@campus.edu',
    roll: 'CS2024042', dept: 'Computer Science', year: '3rd Year',
  };

  // ── Render notices ────────────────────────────────────────
  const noticeList  = document.getElementById('notice-list');
  const noticesEmpty = document.getElementById('notices-empty');
  const noticeCount = document.getElementById('notices-count');

  if (noticeList) {
    if (NOTICES.length === 0) {
      noticesEmpty?.removeAttribute('hidden');
    } else {
      NOTICES.forEach(n => {
        const li = document.createElement('li');
        li.innerHTML = `
          <article class="notice-card">
            <header class="notice-card__header">
              <h3 class="notice-card__title">${n.title}</h3>
              <time class="notice-card__date" datetime="${n.date}">${formatDate(n.date)}</time>
            </header>
            <p class="notice-card__body">${n.body}</p>
          </article>`;
        noticeList.appendChild(li);
      });
      if (noticeCount) noticeCount.textContent = `${NOTICES.length} notice${NOTICES.length !== 1 ? 's' : ''}`;
    }
  }

  // ── Render assignments ────────────────────────────────────
  const assignList   = document.getElementById('assignment-list');
  const assignEmpty  = document.getElementById('assignments-empty');
  const assignCount  = document.getElementById('assignments-count');

  function renderAssignments(filter = 'all') {
    if (!assignList) return;
    assignList.innerHTML = '';
    const filtered = filter === 'all' ? ASSIGNMENTS : ASSIGNMENTS.filter(a => a.status === filter);

    if (filtered.length === 0) {
      assignEmpty?.removeAttribute('hidden');
    } else {
      assignEmpty?.setAttribute('hidden', '');
      filtered.forEach(a => {
        const li = document.createElement('li');
        li.innerHTML = `
          <article class="assignment-card">
            <div class="assignment-card__info">
              <h3 class="assignment-card__title">${a.title}</h3>
              <p class="assignment-card__subject">${a.subject}</p>
            </div>
            <div class="assignment-card__meta">
              <time class="assignment-card__due">${formatDate(a.due)}</time>
              <span class="badge badge--${a.status}">${capitalise(a.status)}</span>
            </div>
          </article>`;
        assignList.appendChild(li);
      });
    }
    if (assignCount) assignCount.textContent = `${ASSIGNMENTS.length} total`;
  }
  renderAssignments();

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      renderAssignments(btn.dataset.filter);
    });
  });

  // ── Render jobs ───────────────────────────────────────────
  const jobList  = document.getElementById('job-list');
  const jobEmpty = document.getElementById('jobs-empty');
  const jobCount = document.getElementById('jobs-count');
  const jobSearch = document.getElementById('job-search');

  function renderJobs(query = '') {
    if (!jobList) return;
    jobList.innerHTML = '';
    const filtered = query
      ? JOBS.filter(j =>
          j.title.toLowerCase().includes(query) ||
          j.company.toLowerCase().includes(query) ||
          j.tags.some(t => t.toLowerCase().includes(query))
        )
      : JOBS;

    if (filtered.length === 0) {
      jobEmpty?.removeAttribute('hidden');
    } else {
      jobEmpty?.setAttribute('hidden', '');
      filtered.forEach(j => {
        const tags = j.tags.map(t => `<li class="tag">${t}</li>`).join('');
        const li = document.createElement('li');
        li.innerHTML = `
          <article class="job-card">
            <header class="job-card__header">
              <h3 class="job-card__title">${j.title}</h3>
              <span class="job-card__company">${j.company}</span>
            </header>
            <ul class="job-card__tags">${tags}</ul>
            <footer class="job-card__footer">
              <time class="job-card__deadline">Deadline: ${formatDate(j.deadline)}</time>
              <a class="btn btn--sm btn--outline" href="${j.link}">Apply →</a>
            </footer>
          </article>`;
        jobList.appendChild(li);
      });
    }
    if (jobCount) jobCount.textContent = `${JOBS.length} listing${JOBS.length !== 1 ? 's' : ''}`;
  }
  renderJobs();

  jobSearch?.addEventListener('input', e => renderJobs(e.target.value.toLowerCase().trim()));

  // ── Render profile ────────────────────────────────────────
  const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setEl('profile-name',   `${PROFILE.firstName} ${PROFILE.lastName}`);
  setEl('profile-email',  PROFILE.email);
  setEl('profile-roll',   PROFILE.roll);
  setEl('profile-dept',   PROFILE.dept);
  setEl('profile-year',   PROFILE.year);
  setEl('student-name',   PROFILE.firstName);
  setEl('student-avatar', PROFILE.firstName[0]);
  setEl('profile-avatar', PROFILE.firstName[0]);

  // ── Stats bar ─────────────────────────────────────────────
  setEl('stat-notices',   NOTICES.length);
  setEl('stat-pending',   ASSIGNMENTS.filter(a => a.status === 'pending').length);
  setEl('stat-jobs',      JOBS.length);
  setEl('stat-submitted', ASSIGNMENTS.filter(a => a.status === 'submitted').length);

  // ── Profile edit toggle ───────────────────────────────────
  const editBtn    = document.getElementById('btn-edit-profile');
  const editForm   = document.getElementById('profile-edit-form');
  const cancelBtn  = document.getElementById('btn-cancel-edit');
  const profileCard = document.getElementById('profile-card');

  editBtn?.addEventListener('click', () => {
    const isOpen = editForm.hidden === false;
    editForm.hidden  = isOpen;
    profileCard.hidden = !isOpen;
    editBtn.setAttribute('aria-expanded', String(!isOpen));

    if (!isOpen) {
      // Pre-fill the form with current values
      document.getElementById('edit-firstname').value = PROFILE.firstName;
      document.getElementById('edit-lastname').value  = PROFILE.lastName;
      document.getElementById('edit-dept').value      = PROFILE.dept;
    }
  });

  cancelBtn?.addEventListener('click', () => {
    editForm.hidden   = true;
    profileCard.hidden = false;
    editBtn?.setAttribute('aria-expanded', 'false');
  });

  editForm?.addEventListener('submit', e => {
    e.preventDefault();
    // TODO: PATCH /api/profile with updated data
    PROFILE.firstName = document.getElementById('edit-firstname').value;
    PROFILE.lastName  = document.getElementById('edit-lastname').value;
    PROFILE.dept      = document.getElementById('edit-dept').value;
    setEl('profile-name',   `${PROFILE.firstName} ${PROFILE.lastName}`);
    setEl('profile-dept',   PROFILE.dept);
    setEl('student-name',   PROFILE.firstName);
    editForm.hidden   = true;
    profileCard.hidden = false;
    showToast('Profile updated!', 'success');
  });

  // ── Hamburger nav ─────────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('topbar-nav');
  hamburger?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', String(open));
  });

  // ── Current date display ──────────────────────────────────
  const dateEl = document.getElementById('current-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-IN', { dateStyle: 'long' });

  // ── Helpers ───────────────────────────────────────────────
  function formatDate(str) {
    return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function capitalise(str) { return str.charAt(0).toUpperCase() + str.slice(1); }

  function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className   = `toast toast--show toast--${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3000);
  }

});

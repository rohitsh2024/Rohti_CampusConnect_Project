/* Admin Script (admin.js)*/

document.addEventListener('DOMContentLoaded', () => {

  // ── Stub data stores — replace with API later ─────────────
  let students    = [
    { id: 1, firstName: 'Rohit',   lastName: 'Sharma',  email: 'rohit@campus.edu',  rollNumber: 'CS2024042', department: 'Computer Science', year: '3' },
    { id: 2, firstName: 'Priya',   lastName: 'Patel',   email: 'priya@campus.edu',  rollNumber: 'CS2024018', department: 'Computer Science', year: '3' },
    { id: 3, firstName: 'Arjun',   lastName: 'Mehta',   email: 'arjun@campus.edu',  rollNumber: 'EE2024007', department: 'Electronics',      year: '2' },
  ];
  let assignments = [
    { id: 1, title: 'BST Implementation', subject: 'Data Structures', dueDate: '2026-07-15', targetYear: 'all' },
    { id: 2, title: 'ER Diagram',         subject: 'DBMS',            dueDate: '2026-07-12', targetYear: '3'   },
  ];
  let jobs = [
    { id: 1, title: 'SWE Intern', company: 'TechCorp India', package: '₹25,000/mo', deadline: '2026-07-25' },
    { id: 2, title: 'Data Analyst Intern', company: 'DataWorks', package: '₹20,000/mo', deadline: '2026-07-30' },
  ];
  let notices = [
    { id: 1, title: 'Mid-Sem Exam Schedule', category: 'academic', audience: 'all', date: '2026-07-08' },
    { id: 2, title: 'Tech Fest Registrations', category: 'event', audience: 'student', date: '2026-07-06' },
  ];

  let nextId = { students: 4, assignments: 3, jobs: 3, notices: 3 };

  // ── Stats bar ─────────────────────────────────────────────
  function updateStats() {
    const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
    set('stat-students',    students.length);
    set('stat-assignments', assignments.length);
    set('stat-jobs',        jobs.length);
    set('stat-notices',     notices.length);
  }
  updateStats();

  // ── Generic form toggle helper ────────────────────────────
  function setupToggle(btnId, formId) {
    const btn  = document.getElementById(btnId);
    const form = document.getElementById(formId);
    if (!btn || !form) return;

    btn.addEventListener('click', () => {
      const isOpen = !form.hidden;
      form.hidden = isOpen;
      btn.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) form.reset();
    });

    // Cancel buttons inside the form
    form.querySelectorAll('[data-cancel]').forEach(cancelBtn => {
      cancelBtn.addEventListener('click', () => {
        form.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        form.reset();
      });
    });
  }

  setupToggle('btn-add-student',    'form-add-student');
  setupToggle('btn-add-assignment', 'form-add-assignment');
  setupToggle('btn-add-job',        'form-add-job');
  setupToggle('btn-add-notice',     'form-add-notice');

  // ── STUDENTS CRUD ─────────────────────────────────────────
  function renderStudents(query = '') {
    const tbody = document.getElementById('tbody-students');
    if (!tbody) return;
    const list = query
      ? students.filter(s =>
          `${s.firstName} ${s.lastName} ${s.email} ${s.rollNumber}`.toLowerCase().includes(query)
        )
      : students;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6"><p class="empty-state">No students found.</p></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(s => `
      <tr>
        <td>${s.rollNumber}</td>
        <td>${s.firstName} ${s.lastName}</td>
        <td>${s.email}</td>
        <td>${s.department}</td>
        <td>${s.year}${getSuffix(s.year)} Year</td>
        <td>
          <div class="table-actions">
            <button class="btn btn--sm btn--outline" onclick="editStudent(${s.id})">Edit</button>
            <button class="btn btn--sm btn--danger"  onclick="deleteStudent(${s.id})">Delete</button>
          </div>
        </td>
      </tr>`).join('');
  }
  renderStudents();

  const studentForm = document.getElementById('form-add-student');
  studentForm?.addEventListener('submit', e => {
    e.preventDefault();
    const id = parseInt(document.getElementById('s-id').value);
    const data = {
      firstName:  document.getElementById('s-firstname').value.trim(),
      lastName:   document.getElementById('s-lastname').value.trim(),
      email:      document.getElementById('s-email').value.trim(),
      rollNumber: document.getElementById('s-roll').value.trim(),
      department: document.getElementById('s-dept').value.trim(),
      year:       document.getElementById('s-year').value,
    };

    if (id) {
      const idx = students.findIndex(s => s.id === id);
      if (idx > -1) students[idx] = { id, ...data };
    } else {
      students.push({ id: nextId.students++, ...data });
    }
    renderStudents();
    updateStats();
    studentForm.reset();
    studentForm.hidden = true;
    document.getElementById('btn-add-student')?.setAttribute('aria-expanded', 'false');
    showToast(id ? 'Student updated.' : 'Student added.', 'success');
  });

  window.editStudent = (id) => {
    const s = students.find(s => s.id === id);
    if (!s) return;
    document.getElementById('s-id').value        = s.id;
    document.getElementById('s-firstname').value  = s.firstName;
    document.getElementById('s-lastname').value   = s.lastName;
    document.getElementById('s-email').value      = s.email;
    document.getElementById('s-roll').value       = s.rollNumber;
    document.getElementById('s-dept').value       = s.department;
    document.getElementById('s-year').value       = s.year;
    document.getElementById('student-form-title').textContent = 'Edit Student';
    studentForm.hidden = false;
    document.getElementById('btn-add-student')?.setAttribute('aria-expanded', 'true');
    studentForm.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  window.deleteStudent = (id) => {
    if (!confirm('Delete this student?')) return;
    students = students.filter(s => s.id !== id);
    renderStudents();
    updateStats();
    showToast('Student removed.', 'error');
  };

  document.getElementById('search-students')?.addEventListener('input', e => {
    renderStudents(e.target.value.toLowerCase().trim());
  });

  // ── ASSIGNMENTS CRUD ──────────────────────────────────────
  function renderAssignments(query = '') {
    const tbody = document.getElementById('tbody-assignments');
    if (!tbody) return;
    const list = query
      ? assignments.filter(a => `${a.title} ${a.subject}`.toLowerCase().includes(query))
      : assignments;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><p class="empty-state">No assignments found.</p></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(a => `
      <tr>
        <td>${a.title}</td>
        <td>${a.subject}</td>
        <td>${formatDate(a.dueDate)}</td>
        <td>${a.targetYear === 'all' ? 'All Years' : a.targetYear + getSuffix(a.targetYear) + ' Year'}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn--sm btn--outline" onclick="editAssignment(${a.id})">Edit</button>
            <button class="btn btn--sm btn--danger"  onclick="deleteAssignment(${a.id})">Delete</button>
          </div>
        </td>
      </tr>`).join('');
  }
  renderAssignments();

  document.getElementById('form-add-assignment')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const id = parseInt(document.getElementById('a-id').value);
    const data = {
      title:      document.getElementById('a-title').value.trim(),
      subject:    document.getElementById('a-subject').value.trim(),
      dueDate:    document.getElementById('a-due').value,
      targetYear: document.getElementById('a-target').value,
    };
    if (id) {
      const idx = assignments.findIndex(a => a.id === id);
      if (idx > -1) assignments[idx] = { id, ...data };
    } else {
      assignments.push({ id: nextId.assignments++, ...data });
    }
    renderAssignments();
    updateStats();
    form.reset();
    form.hidden = true;
    document.getElementById('btn-add-assignment')?.setAttribute('aria-expanded', 'false');
    showToast(id ? 'Assignment updated.' : 'Assignment published.', 'success');
  });

  window.editAssignment = (id) => {
    const a = assignments.find(a => a.id === id);
    if (!a) return;
    document.getElementById('a-id').value      = a.id;
    document.getElementById('a-title').value   = a.title;
    document.getElementById('a-subject').value = a.subject;
    document.getElementById('a-due').value     = a.dueDate;
    document.getElementById('a-target').value  = a.targetYear;
    document.getElementById('assignment-form-title').textContent = 'Edit Assignment';
    const form = document.getElementById('form-add-assignment');
    form.hidden = false;
    document.getElementById('btn-add-assignment')?.setAttribute('aria-expanded', 'true');
  };

  window.deleteAssignment = (id) => {
    if (!confirm('Delete this assignment?')) return;
    assignments = assignments.filter(a => a.id !== id);
    renderAssignments();
    updateStats();
    showToast('Assignment removed.', 'error');
  };

  document.getElementById('search-assignments')?.addEventListener('input', e => {
    renderAssignments(e.target.value.toLowerCase().trim());
  });

  // ── JOBS CRUD ─────────────────────────────────────────────
  function renderJobs(query = '') {
    const tbody = document.getElementById('tbody-jobs');
    if (!tbody) return;
    const list = query
      ? jobs.filter(j => `${j.title} ${j.company}`.toLowerCase().includes(query))
      : jobs;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><p class="empty-state">No jobs found.</p></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(j => `
      <tr>
        <td>${j.title}</td>
        <td>${j.company}</td>
        <td>${j.package || '—'}</td>
        <td>${formatDate(j.deadline)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn--sm btn--outline" onclick="editJob(${j.id})">Edit</button>
            <button class="btn btn--sm btn--danger"  onclick="deleteJob(${j.id})">Delete</button>
          </div>
        </td>
      </tr>`).join('');
  }
  renderJobs();

  document.getElementById('form-add-job')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const id = parseInt(document.getElementById('j-id').value);
    const data = {
      title:    document.getElementById('j-title').value.trim(),
      company:  document.getElementById('j-company').value.trim(),
      package:  document.getElementById('j-package').value.trim(),
      location: document.getElementById('j-location').value.trim(),
      deadline: document.getElementById('j-deadline').value,
    };
    if (id) {
      const idx = jobs.findIndex(j => j.id === id);
      if (idx > -1) jobs[idx] = { id, ...data };
    } else {
      jobs.push({ id: nextId.jobs++, ...data });
    }
    renderJobs();
    updateStats();
    form.reset();
    form.hidden = true;
    document.getElementById('btn-add-job')?.setAttribute('aria-expanded', 'false');
    showToast(id ? 'Job listing updated.' : 'Job posted.', 'success');
  });

  window.editJob = (id) => {
    const j = jobs.find(j => j.id === id);
    if (!j) return;
    document.getElementById('j-id').value      = j.id;
    document.getElementById('j-title').value   = j.title;
    document.getElementById('j-company').value = j.company;
    document.getElementById('j-package').value = j.package;
    document.getElementById('j-deadline').value = j.deadline;
    document.getElementById('job-form-title').textContent = 'Edit Job Listing';
    const form = document.getElementById('form-add-job');
    form.hidden = false;
    document.getElementById('btn-add-job')?.setAttribute('aria-expanded', 'true');
  };

  window.deleteJob = (id) => {
    if (!confirm('Delete this job listing?')) return;
    jobs = jobs.filter(j => j.id !== id);
    renderJobs();
    updateStats();
    showToast('Job listing removed.', 'error');
  };

  document.getElementById('search-jobs')?.addEventListener('input', e => {
    renderJobs(e.target.value.toLowerCase().trim());
  });

  // ── NOTICES CRUD ──────────────────────────────────────────
  function renderNotices(query = '') {
    const tbody = document.getElementById('tbody-notices');
    if (!tbody) return;
    const list = query
      ? notices.filter(n => n.title.toLowerCase().includes(query))
      : notices;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5"><p class="empty-state">No notices found.</p></td></tr>`;
      return;
    }
    tbody.innerHTML = list.map(n => `
      <tr>
        <td>${n.title}</td>
        <td><span class="badge badge--${n.category}">${capitalise(n.category)}</span></td>
        <td>${capitalise(n.audience)}</td>
        <td>${formatDate(n.date)}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn--sm btn--outline" onclick="editNotice(${n.id})">Edit</button>
            <button class="btn btn--sm btn--danger"  onclick="deleteNotice(${n.id})">Delete</button>
          </div>
        </td>
      </tr>`).join('');
  }
  renderNotices();

  document.getElementById('form-add-notice')?.addEventListener('submit', e => {
    e.preventDefault();
    const form = e.target;
    const id = parseInt(document.getElementById('n-id').value);
    const data = {
      title:    document.getElementById('n-title').value.trim(),
      body:     document.getElementById('n-body').value.trim(),
      category: document.getElementById('n-category').value,
      audience: document.getElementById('n-audience').value,
      date:     new Date().toISOString().split('T')[0],
    };
    if (id) {
      const idx = notices.findIndex(n => n.id === id);
      if (idx > -1) notices[idx] = { id, ...data };
    } else {
      notices.push({ id: nextId.notices++, ...data });
    }
    renderNotices();
    updateStats();
    form.reset();
    form.hidden = true;
    document.getElementById('btn-add-notice')?.setAttribute('aria-expanded', 'false');
    showToast(id ? 'Notice updated.' : 'Notice published.', 'success');
  });

  window.editNotice = (id) => {
    const n = notices.find(n => n.id === id);
    if (!n) return;
    document.getElementById('n-id').value       = n.id;
    document.getElementById('n-title').value    = n.title;
    document.getElementById('n-body').value     = n.body || '';
    document.getElementById('n-category').value = n.category;
    document.getElementById('n-audience').value = n.audience;
    document.getElementById('notice-form-title').textContent = 'Edit Notice';
    const form = document.getElementById('form-add-notice');
    form.hidden = false;
    document.getElementById('btn-add-notice')?.setAttribute('aria-expanded', 'true');
  };

  window.deleteNotice = (id) => {
    if (!confirm('Delete this notice?')) return;
    notices = notices.filter(n => n.id !== id);
    renderNotices();
    updateStats();
    showToast('Notice removed.', 'error');
  };

  document.getElementById('search-notices')?.addEventListener('input', e => {
    renderNotices(e.target.value.toLowerCase().trim());
  });

  // ── Hamburger nav ─────────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const nav       = document.getElementById('topbar-nav');
  hamburger?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    hamburger.setAttribute('aria-expanded', String(open));
  });

  // ── Helpers ───────────────────────────────────────────────
  function formatDate(str) {
    if (!str) return '—';
    return new Date(str).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  function capitalise(str) { return str ? str.charAt(0).toUpperCase() + str.slice(1) : ''; }
  function getSuffix(n) {
    const s = ['th','st','nd','rd'];
    const v = parseInt(n) % 100;
    return s[(v - 20) % 10] || s[v] || s[0];
  }

  function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.className   = `toast toast--show toast--${type}`;
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => { toast.className = 'toast'; }, 3000);
  }

});
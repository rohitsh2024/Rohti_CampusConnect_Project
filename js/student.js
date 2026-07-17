// Firebase setup — same project as auth.js
var _S_CFG = {
  apiKey:            "AIzaSyDqj-QVN4aSFC0iBDQEBviXORVBqF4muM0",
  authDomain:        "campus-connect-e33be.firebaseapp.com",
  projectId:         "campus-connect-e33be",
  storageBucket:     "campus-connect-e33be.firebasestorage.app",
  messagingSenderId: "214537333711",
  appId:             "1:214537333711:web:be5eeaf0bdc65d873d40ba"
};
if (!firebase.apps.length) firebase.initializeApp(_S_CFG);
var _sAuth = firebase.auth();
var _sDb   = firebase.firestore();

var _sCurrentUser = null;
var _sBooted      = false;

// Check whether this user is allowed to see the student dashboard
_sAuth.onAuthStateChanged(function(user) {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  var cached = sessionStorage.getItem("cc_role");

  // Fast path — auth.js already verified the role before redirecting here
  if (cached === "student") {
    _sReady(function() { sBoot(user, {}); });
    // Load the full profile from Firestore quietly in the background
    _sDb.collection("users").doc(user.uid).get()
      .then(function(snap) { if (snap.exists) sEnrich(snap.data()); })
      .catch(function() {});
    return;
  }

  if (cached && cached !== "student") {
    alert("Access Denied. This page is for students only.");
    _sAuth.signOut();
    sessionStorage.removeItem("cc_role");
    window.location.replace("index.html");
    return;
  }

  // Slow path — user navigated directly to this URL, so we check Firestore
  _sDb.collection("users").doc(user.uid).get()
    .then(function(snap) {
      if (!snap.exists || !snap.data().role) {
        _sAuth.signOut();
        window.location.replace("index.html");
        return;
      }
      var role = snap.data().role;
      if (role !== "student") {
        alert("Access Denied. This page is for students only.");
        _sAuth.signOut();
        sessionStorage.removeItem("cc_role");
        window.location.replace("index.html");
        return;
      }
      sessionStorage.setItem("cc_role", "student");
      var profile = snap.data();
      _sReady(function() { sBoot(user, profile); });
    })
    .catch(function(err) {
      // Firestore is unreachable — the user still passed Firebase Auth so let them in
      console.warn("student.js Firestore guard error:", err.code, err.message);
      sessionStorage.setItem("cc_role", "student");
      _sReady(function() { sBoot(user, {}); });
    });
});

function _sReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

// Updates the UI with profile data loaded in the background
function sEnrich(d) {
  if (!d) return;
  var name  = d.displayName || ((d.firstName || "") + " " + (d.lastName || "")).trim();
  var fname = d.firstName || name.split(" ")[0] || "";
  if (fname) {
    sSet("student-name",  fname);
    sSet("page-greeting", "Hello, " + fname + " \uD83D\uDC4B");
  }
  if (name) {
    sSet("profile-name",   name);
    sSet("student-avatar", name.charAt(0).toUpperCase());
    sSet("profile-avatar", name.charAt(0).toUpperCase());
  }
  if (d.rollNumber) sSet("profile-roll", d.rollNumber);
  if (d.department) sSet("profile-dept", d.department);
  if (d.year)       sSet("profile-year", d.year + sOrd(d.year) + " Year");
}

// Runs once we know the user is definitely a student
function sBoot(user, profile) {
  if (_sBooted) return;
  _sBooted      = true;
  _sCurrentUser = user;
  profile       = profile || {};

  var name    = profile.displayName || user.displayName || "Student";
  var fname   = profile.firstName   || name.split(" ")[0] || "Student";
  var email   = user.email || "";
  var initial = name.charAt(0).toUpperCase();

  sSet("student-name",   fname);
  sSet("student-avatar", initial);

  var dateEl = document.getElementById("current-date");
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString("en-IN", { dateStyle: "long" });

  sSet("page-greeting", "Hello, " + fname + " \uD83D\uDC4B");
  sSet("profile-name",   name);
  sSet("profile-email",  email);
  sSet("profile-roll",   profile.rollNumber || "\u2014");
  sSet("profile-dept",   profile.department || "\u2014");
  sSet("profile-year",   profile.year ? profile.year + sOrd(profile.year) + " Year" : "\u2014");
  sSet("profile-avatar", initial);

  // Start listening to all the live data
  sListenNotices();
  sListenAssignments();
  sListenCompanies();

  sSetupProfileEdit(profile);

  // Job search filter
  var jobSearch = document.getElementById("job-search");
  if (jobSearch) {
    jobSearch.addEventListener("input", function() {
      var q = this.value.toLowerCase().trim();
      document.querySelectorAll(".job-card").forEach(function(card) {
        var li = card.closest("li");
        if (li) li.style.display = (!q || card.textContent.toLowerCase().includes(q)) ? "" : "none";
      });
    });
  }

  // Assignment status filter pills
  document.querySelectorAll(".s-filter").forEach(function(btn) {
    btn.addEventListener("click", function() {
      document.querySelectorAll(".s-filter").forEach(function(b) { b.classList.remove("active"); });
      btn.classList.add("active");
      var f = btn.dataset.filter;
      document.querySelectorAll(".assignment-card").forEach(function(card) {
        var li = card.closest("li");
        if (li) li.style.display = (f === "all" || card.dataset.status === f) ? "" : "none";
      });
    });
  });

  // Mobile menu toggle
  var ham = document.getElementById("hamburger");
  var nav = document.getElementById("topbar-nav");
  if (ham && nav) {
    ham.addEventListener("click", function() {
      var open = nav.classList.toggle("open");
      ham.classList.toggle("open", open);
      ham.setAttribute("aria-expanded", String(open));
    });
  }

  // User avatar dropdown
  var trigger  = document.getElementById("user-trigger");
  var dropdown = document.getElementById("user-dropdown");
  if (trigger && dropdown) {
    trigger.addEventListener("click", function(e) {
      e.stopPropagation();
      var open = dropdown.classList.toggle("open");
      trigger.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("click", function() {
      dropdown.classList.remove("open");
      trigger.setAttribute("aria-expanded", "false");
    });
  }

  // Sign out button
  var btnSignout = document.getElementById("btn-signout");
  if (btnSignout) {
    btnSignout.addEventListener("click", function() {
      _sAuth.signOut().then(function() {
        sessionStorage.removeItem("cc_role");
        window.location.replace("index.html");
      });
    });
  }
}

// Notices — live updates from Firestore
function sListenNotices() {
  _sDb.collection("notices").orderBy("createdAt", "desc")
    .onSnapshot(function(snap) {
      var list  = document.getElementById("notice-list");
      var empty = document.getElementById("notices-empty");
      var count = document.getElementById("notices-count");
      if (!list) return;
      list.innerHTML = "";

      if (snap.empty) {
        if (empty) empty.removeAttribute("hidden");
        sSet("stat-notices", 0);
        if (count) count.textContent = "";
        return;
      }

      if (empty) empty.setAttribute("hidden", "");
      sSet("stat-notices", snap.size);
      if (count) count.textContent = snap.size + " notice" + (snap.size !== 1 ? "s" : "");

      snap.docs.forEach(function(doc) {
        var n  = doc.data();
        var li = document.createElement("li");
        li.innerHTML =
          '<article class="notice-card notice-card--' + sEsc(n.category || "general") + '">' +
            '<header class="notice-card__header">' +
              '<h3 class="notice-card__title">' + sEsc(n.title) + '</h3>' +
              '<time class="notice-card__date">' + sFmt(n.date) + '</time>' +
            '</header>' +
            '<p class="notice-card__body">' + sEsc(n.content || n.body || "") + '</p>' +
          '</article>';
        list.appendChild(li);
      });
    }, function(err) { console.error("Notices listener:", err); });
}

// Assignments — live updates with a submit box under each one
function sListenAssignments() {
  _sDb.collection("assignments").orderBy("createdAt", "desc")
    .onSnapshot(function(snap) {
      var list  = document.getElementById("assignment-list");
      var empty = document.getElementById("assignments-empty");
      var count = document.getElementById("assignments-count");
      if (!list) return;
      list.innerHTML = "";

      if (snap.empty) {
        if (empty) empty.removeAttribute("hidden");
        sSet("stat-pending",   0);
        sSet("stat-submitted", 0);
        if (count) count.textContent = "0";
        return;
      }

      if (empty) empty.setAttribute("hidden", "");
      if (count) count.textContent = snap.size + " total";

      snap.docs.forEach(function(doc) {
        var a  = doc.data();
        var id = doc.id;
        var li = document.createElement("li");
        li.innerHTML =
          '<article class="assignment-card" data-status="pending" data-id="' + id + '">' +
            '<div class="assignment-card__info">' +
              '<h3 class="assignment-card__title">' + sEsc(a.title) + '</h3>' +
              '<p class="assignment-card__subject">' + sEsc(a.subject || a.description || "") + '</p>' +
            '</div>' +
            '<div class="assignment-card__meta">' +
              '<time class="assignment-card__due">Due ' + sFmt(a.deadline || a.dueDate) + '</time>' +
              '<span class="badge badge--pending assignment-status-badge" id="status-' + id + '">Pending</span>' +
            '</div>' +
          '</article>' +
          '<div class="submit-zone" id="submit-zone-' + id + '" ' +
            'style="margin-top:.75rem;padding:.85rem 1rem;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;">' +
            '<p style="font-size:.8rem;font-weight:600;color:rgba(255,255,255,.7);margin-bottom:.4rem;">Submit your work</p>' +
            '<div style="display:flex;gap:.5rem;align-items:center;">' +
              '<input type="text" id="sub-link-' + id + '" placeholder="Paste submission link or text\u2026" ' +
                'style="flex:1;padding:.6rem .8rem;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);' +
                'border-radius:8px;font-size:.87rem;font-family:inherit;outline:none;color:#e2e8f0;"/>' +
              '<button type="button" class="btn btn--primary btn--sm" ' +
                'onclick="sSubmitAssignment(\'' + id + '\')">Submit</button>' +
            '</div>' +
            '<p id="sub-msg-' + id + '" style="font-size:.78rem;margin-top:.35rem;display:none;"></p>' +
          '</div>';
        list.appendChild(li);

        // Check if this student already submitted this one
        if (_sCurrentUser) {
          _sDb.collection("submissions")
            .where("studentUid",   "==", _sCurrentUser.uid)
            .where("assignmentId", "==", id)
            .limit(1).get()
            .then(function(ex) {
              if (!ex.empty) sMarkSubmitted(id, ex.docs[0].data().submissionText);
            });
        }
      });

      sUpdateAssignmentStats();
    }, function(err) { console.error("Assignments listener:", err); });
}

function sMarkSubmitted(assignmentId, text) {
  var article = document.querySelector('.assignment-card[data-id="' + assignmentId + '"]');
  var badge   = document.getElementById("status-"      + assignmentId);
  var input   = document.getElementById("sub-link-"    + assignmentId);
  var zone    = document.getElementById("submit-zone-" + assignmentId);
  var msg     = document.getElementById("sub-msg-"     + assignmentId);

  if (article) article.dataset.status = "submitted";
  if (badge)   { badge.textContent = "Submitted"; badge.className = "badge badge--submitted assignment-status-badge"; }
  if (input)   { input.value = text || ""; input.disabled = true; }
  if (zone)    { var btn = zone.querySelector("button"); if (btn) btn.disabled = true; }
  if (msg)     { msg.textContent = "\u2705 Submitted successfully."; msg.style.display = "block"; msg.style.color = "#059669"; }

  sUpdateAssignmentStats();
}

window.sSubmitAssignment = function(assignmentId) {
  var input = document.getElementById("sub-link-" + assignmentId);
  var msg   = document.getElementById("sub-msg-"  + assignmentId);
  var text  = input ? input.value.trim() : "";

  if (!text) {
    if (msg) { msg.textContent = "Please enter a submission link or text."; msg.style.display = "block"; msg.style.color = "#e11d48"; }
    return;
  }
  if (!_sCurrentUser) { sToast("You must be signed in to submit.", "error"); return; }

  _sDb.collection("submissions")
    .where("studentUid",   "==", _sCurrentUser.uid)
    .where("assignmentId", "==", assignmentId)
    .limit(1).get()
    .then(function(ex) {
      if (!ex.empty) {
        if (msg) { msg.textContent = "Already submitted."; msg.style.display = "block"; msg.style.color = "#d97706"; }
        return null;
      }
      return _sDb.collection("submissions").add({
        studentUid:     _sCurrentUser.uid,
        studentEmail:   _sCurrentUser.email,
        assignmentId:   assignmentId,
        submissionText: text,
        submittedAt:    firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(function(ref) {
      if (!ref) return;
      sMarkSubmitted(assignmentId, text);
      sToast("Assignment submitted!", "success");
    })
    .catch(function(e) {
      if (msg) { msg.textContent = "Submission failed: " + e.message; msg.style.display = "block"; msg.style.color = "#e11d48"; }
      sToast("Submission failed.", "error");
    });
};

function sUpdateAssignmentStats() {
  var all  = document.querySelectorAll(".assignment-card");
  var done = document.querySelectorAll('.assignment-card[data-status="submitted"]');
  sSet("stat-pending",   all.length - done.length);
  sSet("stat-submitted", done.length);
}

// Job listings — live updates with an Apply Now button
function sListenCompanies() {
  _sDb.collection("companies").orderBy("createdAt", "desc")
    .onSnapshot(function(snap) {
      var list  = document.getElementById("job-list");
      var empty = document.getElementById("jobs-empty");
      var count = document.getElementById("jobs-count");
      if (!list) return;
      list.innerHTML = "";

      if (snap.empty) {
        if (empty) empty.removeAttribute("hidden");
        sSet("stat-jobs", 0);
        if (count) count.textContent = "";
        return;
      }

      if (empty) empty.setAttribute("hidden", "");
      sSet("stat-jobs", snap.size);
      if (count) count.textContent = snap.size + " listing" + (snap.size !== 1 ? "s" : "");

      snap.docs.forEach(function(doc) {
        var c  = doc.data();
        var id = doc.id;
        var li = document.createElement("li");
        li.innerHTML =
          '<article class="job-card" data-company-id="' + id + '">' +
            '<header class="job-card__header">' +
              '<div>' +
                '<h3 class="job-card__title">' + sEsc(c.name) + '</h3>' +
                '<p class="job-card__company">\uD83D\uDCCB ' + sEsc(c.profile || "") + '</p>' +
              '</div>' +
              (c.package ? '<span class="job-card__package">\uD83D\uDCB0 ' + sEsc(c.package) + '</span>' : "") +
            '</header>' +
            '<footer class="job-card__footer" style="margin-top:.75rem;padding-top:.7rem;' +
              'border-top:1px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:space-between;">' +
              (c.deadline ? '<time class="job-card__deadline">\uD83D\uDCC5 Deadline: ' + sFmt(c.deadline) + '</time>' : '<span></span>') +
              '<button type="button" class="btn btn--sm btn--primary apply-btn" id="apply-' + id + '" ' +
                'onclick="sApply(\'' + id + '\',\'' + sEsc(c.name) + '\')">Apply Now</button>' +
            '</footer>' +
          '</article>';
        list.appendChild(li);

        // Check if the student already applied to this company
        if (_sCurrentUser) {
          _sDb.collection("applications")
            .where("studentUid", "==", _sCurrentUser.uid)
            .where("companyId",  "==", id)
            .limit(1).get()
            .then(function(ex) { if (!ex.empty) sMarkApplied(id); });
        }
      });
    }, function(err) { console.error("Companies listener:", err); });
}

function sMarkApplied(companyId) {
  var btn = document.getElementById("apply-" + companyId);
  if (btn) {
    btn.textContent = "\u2705 Applied";
    btn.disabled    = true;
    btn.className   = "btn btn--sm btn--success apply-btn";
  }
}

window.sApply = function(companyId, companyName) {
  if (!_sCurrentUser) { sToast("You must be signed in to apply.", "error"); return; }

  _sDb.collection("applications")
    .where("studentUid", "==", _sCurrentUser.uid)
    .where("companyId",  "==", companyId)
    .limit(1).get()
    .then(function(ex) {
      if (!ex.empty) {
        sToast("Already applied to " + companyName + ".", "info");
        sMarkApplied(companyId);
        return null;
      }
      return _sDb.collection("applications").add({
        studentUid:   _sCurrentUser.uid,
        studentEmail: _sCurrentUser.email,
        companyId:    companyId,
        companyName:  companyName,
        appliedAt:    firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(function(ref) {
      if (!ref) return;
      sMarkApplied(companyId);
      sToast("Applied to " + companyName + "!", "success");
    })
    .catch(function(e) { sToast("Application failed: " + e.message, "error"); });
};

// Profile edit form
function sSetupProfileEdit(profile) {
  var editBtn     = document.getElementById("btn-edit-profile");
  var editForm    = document.getElementById("profile-edit-form");
  var cancelBtn   = document.getElementById("btn-cancel-edit");
  var profileCard = document.getElementById("profile-card");
  if (!editBtn || !editForm) return;

  editBtn.addEventListener("click", function() {
    var name  = (_sAuth.currentUser && _sAuth.currentUser.displayName) || "";
    var parts = name.split(" ");
    var fnEl  = document.getElementById("edit-firstname");
    var lnEl  = document.getElementById("edit-lastname");
    var dpEl  = document.getElementById("edit-dept");
    if (fnEl) fnEl.value = profile.firstName  || parts[0] || "";
    if (lnEl) lnEl.value = profile.lastName   || parts.slice(1).join(" ") || "";
    if (dpEl) dpEl.value = profile.department || "";
    if (profileCard) profileCard.setAttribute("hidden", "");
    editForm.removeAttribute("hidden");
    editBtn.setAttribute("aria-expanded", "true");
  });

  if (cancelBtn) {
    cancelBtn.addEventListener("click", function() {
      editForm.setAttribute("hidden", "");
      if (profileCard) profileCard.removeAttribute("hidden");
      editBtn.setAttribute("aria-expanded", "false");
    });
  }

  editForm.addEventListener("submit", function(e) {
    e.preventDefault();
    var fnEl   = document.getElementById("edit-firstname");
    var lnEl   = document.getElementById("edit-lastname");
    var deptEl = document.getElementById("edit-dept");
    var yrEl   = document.getElementById("edit-year");
    var fn     = fnEl   ? fnEl.value.trim()   : "";
    var ln     = lnEl   ? lnEl.value.trim()   : "";
    var dept   = deptEl ? deptEl.value.trim() : "";
    var yr     = yrEl   ? yrEl.value          : "";
    if (!fn) return;

    var newName = (fn + " " + ln).trim();
    var cu = _sAuth.currentUser;
    if (!cu) return;

    cu.updateProfile({ displayName: newName })
      .then(function() {
        return _sDb.collection("users").doc(cu.uid).set(
          { firstName: fn, lastName: ln, displayName: newName, department: dept, year: yr },
          { merge: true }
        );
      })
      .then(function() {
        sSet("profile-name",   newName);
        sSet("profile-dept",   dept || "\u2014");
        sSet("profile-year",   yr ? yr + sOrd(yr) + " Year" : "\u2014");
        sSet("student-name",   fn);
        sSet("student-avatar", fn.charAt(0).toUpperCase());
        sSet("profile-avatar", fn.charAt(0).toUpperCase());
        editForm.setAttribute("hidden", "");
        if (profileCard) profileCard.removeAttribute("hidden");
        editBtn.setAttribute("aria-expanded", "false");
        sToast("Profile updated!", "success");
      })
      .catch(function() { sToast("Could not update profile.", "error"); });
  });
}

// Small utility functions used throughout this file
function sSet(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = String(val !== null && val !== undefined ? val : "");
}

function sEsc(s) {
  var str = (s !== null && s !== undefined) ? String(s) : "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sFmt(s) {
  try {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch(e) {
    return s || "\u2014";
  }
}

function sOrd(n) {
  var s = ["th", "st", "nd", "rd"];
  var v = parseInt(n) % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function sToast(msg, type) {
  type = type || "default";
  var t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className   = "toast show" + (type !== "default" ? " " + type : "");
  clearTimeout(t._tid);
  t._tid = setTimeout(function() { t.className = "toast"; }, 4500);
}

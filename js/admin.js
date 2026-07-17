// Firebase setup — same project as auth.js
var _A_CFG = {
  apiKey:            "AIzaSyDqj-QVN4aSFC0iBDQEBviXORVBqF4muM0",
  authDomain:        "campus-connect-e33be.firebaseapp.com",
  projectId:         "campus-connect-e33be",
  storageBucket:     "campus-connect-e33be.firebasestorage.app",
  messagingSenderId: "214537333711",
  appId:             "1:214537333711:web:be5eeaf0bdc65d873d40ba"
};
if (!firebase.apps.length) firebase.initializeApp(_A_CFG);
var _aAuth = firebase.auth();
var _aDb   = firebase.firestore();

// Check whether this user is allowed to see the admin dashboard
_aAuth.onAuthStateChanged(function(user) {
  if (!user) {
    window.location.replace("index.html");
    return;
  }

  var cached = sessionStorage.getItem("cc_role");

  // Fast path — auth.js already verified the role before redirecting here
  if (cached === "admin") {
    _aReady(function() { bootAdmin(user); });
    return;
  }

  if (cached && cached !== "admin") {
    alert("Access Denied. This page is for administrators only.");
    _aAuth.signOut();
    sessionStorage.removeItem("cc_role");
    window.location.replace("index.html");
    return;
  }

  // Slow path — user navigated directly to this URL
  _aDb.collection("users").doc(user.uid).get()
    .then(function(snap) {
      if (!snap.exists || !snap.data().role) {
        _aAuth.signOut();
        window.location.replace("index.html");
        return;
      }
      var role = snap.data().role;
      if (role !== "admin") {
        alert("Access Denied. This page is for administrators only.");
        _aAuth.signOut();
        sessionStorage.removeItem("cc_role");
        window.location.replace("index.html");
        return;
      }
      sessionStorage.setItem("cc_role", "admin");
      _aReady(function() { bootAdmin(user); });
    })
    .catch(function(err) {
      // Firestore is unreachable — user still passed Firebase Auth so let them in
      console.warn("admin.js Firestore guard error:", err.code, err.message);
      sessionStorage.setItem("cc_role", "admin");
      _aReady(function() { bootAdmin(user); });
    });
});

function _aReady(fn) {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", fn);
  } else {
    fn();
  }
}

var _aBooted = false;

// Runs once we know the user is definitely an admin
function bootAdmin(user) {
  if (_aBooted) return;
  _aBooted = true;

  var name    = user.displayName || "Admin";
  var initial = name.charAt(0).toUpperCase();
  aSet("admin-name",   name.split(" ")[0]);
  aSet("admin-avatar", initial);

  // Wire up all the live data listeners
  aListenNotices();
  aListenCompanies();
  aListenAssignments();
  aListenStudents();

  // Form open/close toggles
  aSetupToggle("btn-add-student",    "form-add-student");
  aSetupToggle("btn-add-assignment", "form-add-assignment");
  aSetupToggle("btn-add-job",        "form-add-job");
  aSetupToggle("btn-add-notice",     "form-add-notice");

  aBindForms();

  // Live search for each table
  var searches = [
    { id: "search-students",    tbody: "tbody-students",    cols: 6 },
    { id: "search-assignments", tbody: "tbody-assignments", cols: 5 },
    { id: "search-jobs",        tbody: "tbody-jobs",        cols: 5 },
    { id: "search-notices",     tbody: "tbody-notices",     cols: 5 }
  ];
  searches.forEach(function(s) {
    var el = document.getElementById(s.id);
    if (el) {
      el.addEventListener("input", function() {
        aFilterTable(s.tbody, this.value.toLowerCase(), s.cols);
      });
    }
  });

  // Sidebar mobile toggle — the menu button in the topbar
  var menuBtn = document.getElementById("topbar-nav");
  var sidebar = document.getElementById("a-sidebar");
  if (menuBtn && sidebar) {
    menuBtn.addEventListener("click", function(e) {
      e.stopPropagation();
      sidebar.classList.toggle("open");
    });
    document.addEventListener("click", function(e) {
      if (sidebar.classList.contains("open") && !sidebar.contains(e.target)) {
        sidebar.classList.remove("open");
      }
    });
  }

  // Sidebar nav links — set active state on click
  document.querySelectorAll(".a-nav-link").forEach(function(link) {
    link.addEventListener("click", function() {
      document.querySelectorAll(".a-nav-link").forEach(function(l) { l.classList.remove("active"); });
      this.classList.add("active");
      if (sidebar) sidebar.classList.remove("open");
    });
  });

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
      if (dropdown) dropdown.classList.remove("open");
      if (trigger)  trigger.setAttribute("aria-expanded", "false");
    });
  }

  // Sign out — both sidebar button and topbar dropdown button
  function doSignOut() {
    _aAuth.signOut().then(function() {
      sessionStorage.removeItem("cc_role");
      window.location.replace("index.html");
    });
  }
  var btnSO = document.getElementById("btn-signout");
  if (btnSO) btnSO.addEventListener("click", doSignOut);
  var btnSOT = document.getElementById("btn-signout-top");
  if (btnSOT) btnSOT.addEventListener("click", doSignOut);
}

// Notices — live updates from Firestore with Edit / Delete
function aListenNotices() {
  _aDb.collection("notices").orderBy("createdAt", "desc")
    .onSnapshot(function(snap) {
      var tbody = document.getElementById("tbody-notices");
      if (!tbody) return;
      aSet("stat-notices", snap.size);
      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="5"><p class="empty-state">No notices yet.</p></td></tr>';
        return;
      }
      tbody.innerHTML = snap.docs.map(function(doc) {
        var n  = doc.data();
        var id = doc.id;
        return '<tr>' +
          '<td>' + aEsc(n.title) + '</td>' +
          '<td><span class="badge badge--' + aEsc(n.category || "general") + '">' + aCap(n.category || "general") + '</span></td>' +
          '<td>' + aCap(n.audience || "all") + '</td>' +
          '<td>' + aFmt(n.date) + '</td>' +
          '<td><div class="table-actions">' +
            '<button class="btn btn--sm btn--outline" onclick="aEditNotice(\'' + id + '\')">Edit</button>' +
            '<button class="btn btn--sm btn--danger"  onclick="aDelNotice(\'' + id + '\')">Delete</button>' +
          '</div></td></tr>';
      }).join("");
    }, function(err) { console.error("Notices listener:", err); });
}

window.aDelNotice = function(id) {
  if (!confirm("Delete this notice?")) return;
  _aDb.collection("notices").doc(id).delete()
    .then(function() { aToast("Notice deleted.", "error"); })
    .catch(function(e) { aToast("Delete failed: " + e.message, "error"); });
};

window.aEditNotice = function(id) {
  _aDb.collection("notices").doc(id).get()
    .then(function(snap) {
      if (!snap.exists) return;
      var n = snap.data();
      aSv("n-id",       id);
      aSv("n-title",    n.title    || "");
      aSv("n-body",     n.content  || "");
      aSv("n-category", n.category || "general");
      aSv("n-audience", n.audience || "all");
      aSet("notice-form-title", "Edit Notice");
      aShowForm("form-add-notice", "btn-add-notice");
    })
    .catch(function(e) { aToast("Load failed: " + e.message, "error"); });
};

// Companies (job listings) — live updates with Edit / Delete
function aListenCompanies() {
  _aDb.collection("companies").orderBy("createdAt", "desc")
    .onSnapshot(function(snap) {
      var tbody = document.getElementById("tbody-jobs");
      if (!tbody) return;
      aSet("stat-jobs", snap.size);
      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="5"><p class="empty-state">No companies yet.</p></td></tr>';
        return;
      }
      tbody.innerHTML = snap.docs.map(function(doc) {
        var c  = doc.data();
        var id = doc.id;
        return '<tr>' +
          '<td>' + aEsc(c.name)            + '</td>' +
          '<td>' + aEsc(c.profile || "\u2014") + '</td>' +
          '<td>' + aEsc(c.package || "\u2014") + '</td>' +
          '<td>' + aFmt(c.deadline)         + '</td>' +
          '<td><div class="table-actions">' +
            '<button class="btn btn--sm btn--outline" onclick="aEditCompany(\'' + id + '\')">Edit</button>' +
            '<button class="btn btn--sm btn--danger"  onclick="aDelCompany(\'' + id + '\')">Delete</button>' +
          '</div></td></tr>';
      }).join("");
    }, function(err) { console.error("Companies listener:", err); });
}

window.aDelCompany = function(id) {
  if (!confirm("Delete this company?")) return;
  _aDb.collection("companies").doc(id).delete()
    .then(function() { aToast("Company removed.", "error"); })
    .catch(function(e) { aToast("Delete failed: " + e.message, "error"); });
};

window.aEditCompany = function(id) {
  _aDb.collection("companies").doc(id).get()
    .then(function(snap) {
      if (!snap.exists) return;
      var c = snap.data();
      aSv("j-id",       id);
      aSv("j-title",    c.name     || "");
      aSv("j-company",  c.profile  || "");
      aSv("j-package",  c.package  || "");
      aSv("j-location", c.location || "");
      aSv("j-deadline", c.deadline || "");
      aSet("job-form-title", "Edit Company");
      aShowForm("form-add-job", "btn-add-job");
    })
    .catch(function(e) { aToast("Load failed: " + e.message, "error"); });
};

// Assignments — live updates with Edit / Delete
function aListenAssignments() {
  _aDb.collection("assignments").orderBy("createdAt", "desc")
    .onSnapshot(function(snap) {
      var tbody = document.getElementById("tbody-assignments");
      if (!tbody) return;
      aSet("stat-assignments", snap.size);
      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="5"><p class="empty-state">No assignments yet.</p></td></tr>';
        return;
      }
      tbody.innerHTML = snap.docs.map(function(doc) {
        var a  = doc.data();
        var id = doc.id;
        var yr = a.targetYear === "all" ? "All Years" : (a.targetYear || "All") + " Year";
        return '<tr>' +
          '<td>' + aEsc(a.title)                           + '</td>' +
          '<td>' + aEsc(a.subject || a.description || "\u2014") + '</td>' +
          '<td>' + aFmt(a.deadline || a.dueDate)            + '</td>' +
          '<td>' + yr                                       + '</td>' +
          '<td><div class="table-actions">' +
            '<button class="btn btn--sm btn--outline" onclick="aEditAssignment(\'' + id + '\')">Edit</button>' +
            '<button class="btn btn--sm btn--danger"  onclick="aDelAssignment(\'' + id + '\')">Delete</button>' +
          '</div></td></tr>';
      }).join("");
    }, function(err) { console.error("Assignments listener:", err); });
}

window.aDelAssignment = function(id) {
  if (!confirm("Delete this assignment?")) return;
  _aDb.collection("assignments").doc(id).delete()
    .then(function() { aToast("Assignment removed.", "error"); })
    .catch(function(e) { aToast("Delete failed: " + e.message, "error"); });
};

window.aEditAssignment = function(id) {
  _aDb.collection("assignments").doc(id).get()
    .then(function(snap) {
      if (!snap.exists) return;
      var a = snap.data();
      aSv("a-id",      id);
      aSv("a-title",   a.title             || "");
      aSv("a-subject", a.subject           || "");
      aSv("a-desc",    a.description       || "");
      aSv("a-due",     a.deadline || a.dueDate || "");
      aSv("a-target",  a.targetYear        || "all");
      aSet("assignment-form-title", "Edit Assignment");
      aShowForm("form-add-assignment", "btn-add-assignment");
    })
    .catch(function(e) { aToast("Load failed: " + e.message, "error"); });
};

// Students — pulls everyone with role "student" from the users collection
function aListenStudents() {
  _aDb.collection("users").where("role", "==", "student")
    .onSnapshot(function(snap) {
      var tbody = document.getElementById("tbody-students");
      if (!tbody) return;
      aSet("stat-students", snap.size);
      if (snap.empty) {
        tbody.innerHTML = '<tr><td colspan="6"><p class="empty-state">No students registered yet.</p></td></tr>';
        return;
      }
      tbody.innerHTML = snap.docs.map(function(doc) {
        var s  = doc.data();
        var id = doc.id;
        return '<tr>' +
          '<td>' + aEsc(s.rollNumber || "\u2014") + '</td>' +
          '<td>' + aEsc((s.firstName || "") + " " + (s.lastName || "")) + '</td>' +
          '<td>' + aEsc(s.email      || "")  + '</td>' +
          '<td>' + aEsc(s.department || "\u2014") + '</td>' +
          '<td>' + (s.year ? s.year + aOrd(s.year) + " Year" : "\u2014") + '</td>' +
          '<td><div class="table-actions">' +
            '<button class="btn btn--sm btn--danger" onclick="aRemoveStudent(\'' + id + '\')">Remove</button>' +
          '</div></td></tr>';
      }).join("");
    }, function(err) { console.error("Students listener:", err); });
}

window.aRemoveStudent = function(id) {
  if (!confirm("Remove this student record? (Does NOT delete their login account.)")) return;
  _aDb.collection("users").doc(id).update({ role: "removed" })
    .then(function() { aToast("Student removed.", "error"); })
    .catch(function(e) { aToast("Remove failed: " + e.message, "error"); });
};

// All four "add / edit" forms write their data to Firestore
function aBindForms() {

  var fNotice = document.getElementById("form-add-notice");
  if (fNotice) {
    fNotice.addEventListener("submit", function(e) {
      e.preventDefault();
      var docId   = aGv("n-id");
      var payload = {
        title:    aGv("n-title"),
        content:  aGv("n-body"),
        category: aGv("n-category") || "general",
        audience: aGv("n-audience") || "all",
        date:     new Date().toISOString().split("T")[0]
      };
      if (!payload.title || !payload.content) { aToast("Title and content are required.", "error"); return; }
      var p = docId
        ? _aDb.collection("notices").doc(docId).update(payload)
        : (payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(),
           _aDb.collection("notices").add(payload));
      p.then(function() {
        aToast(docId ? "Notice updated." : "Notice published.", "success");
        fNotice.reset();
        aSv("n-id", "");
        aSet("notice-form-title", "New Announcement");
        fNotice.hidden = true;
        var btn = document.getElementById("btn-add-notice");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }).catch(function(err) { aToast("Save failed: " + err.message, "error"); });
    });
  }

  var fJob = document.getElementById("form-add-job");
  if (fJob) {
    fJob.addEventListener("submit", function(e) {
      e.preventDefault();
      var docId   = aGv("j-id");
      var payload = {
        name:     aGv("j-title"),
        profile:  aGv("j-company"),
        package:  aGv("j-package"),
        location: aGv("j-location"),
        deadline: aGv("j-deadline")
      };
      if (!payload.name) { aToast("Company name is required.", "error"); return; }
      var p = docId
        ? _aDb.collection("companies").doc(docId).update(payload)
        : (payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(),
           _aDb.collection("companies").add(payload));
      p.then(function() {
        aToast(docId ? "Company updated." : "Company posted.", "success");
        fJob.reset();
        aSv("j-id", "");
        aSet("job-form-title", "Post New Job");
        fJob.hidden = true;
        var btn = document.getElementById("btn-add-job");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }).catch(function(err) { aToast("Save failed: " + err.message, "error"); });
    });
  }

  var fAssign = document.getElementById("form-add-assignment");
  if (fAssign) {
    fAssign.addEventListener("submit", function(e) {
      e.preventDefault();
      var docId   = aGv("a-id");
      var payload = {
        title:       aGv("a-title"),
        subject:     aGv("a-subject"),
        description: aGv("a-desc"),
        deadline:    aGv("a-due"),
        targetYear:  aGv("a-target") || "all"
      };
      if (!payload.title || !payload.deadline) { aToast("Title and deadline are required.", "error"); return; }
      var p = docId
        ? _aDb.collection("assignments").doc(docId).update(payload)
        : (payload.createdAt = firebase.firestore.FieldValue.serverTimestamp(),
           _aDb.collection("assignments").add(payload));
      p.then(function() {
        aToast(docId ? "Assignment updated." : "Assignment published.", "success");
        fAssign.reset();
        aSv("a-id", "");
        aSet("assignment-form-title", "Create Assignment");
        fAssign.hidden = true;
        var btn = document.getElementById("btn-add-assignment");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }).catch(function(err) { aToast("Save failed: " + err.message, "error"); });
    });
  }

  var fStudent = document.getElementById("form-add-student");
  if (fStudent) {
    fStudent.addEventListener("submit", function(e) {
      e.preventDefault();
      var payload = {
        firstName:  aGv("s-firstname"),
        lastName:   aGv("s-lastname"),
        email:      aGv("s-email"),
        rollNumber: aGv("s-roll"),
        department: aGv("s-dept"),
        year:       aGv("s-year"),
        role:       "student",
        createdAt:  firebase.firestore.FieldValue.serverTimestamp()
      };
      if (!payload.firstName || !payload.email) { aToast("Name and email are required.", "error"); return; }
      var docKey = payload.email.replace(/\./g, "_").replace(/@/g, "__");
      _aDb.collection("users").doc(docKey).set(payload, { merge: true })
        .then(function() {
          aToast("Student added.", "success");
          fStudent.reset();
          fStudent.hidden = true;
          var btn = document.getElementById("btn-add-student");
          if (btn) btn.setAttribute("aria-expanded", "false");
        })
        .catch(function(err) { aToast("Save failed: " + err.message, "error"); });
    });
  }
}

// Toggles a form open and closed when the Add button is clicked
function aSetupToggle(btnId, formId) {
  var btn  = document.getElementById(btnId);
  var form = document.getElementById(formId);
  if (!btn || !form) return;
  btn.addEventListener("click", function() {
    var open = !form.hidden;
    form.hidden = open;
    btn.setAttribute("aria-expanded", String(!open));
    if (!open) form.reset();
  });
  form.querySelectorAll("[data-cancel]").forEach(function(c) {
    c.addEventListener("click", function() {
      form.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      form.reset();
    });
  });
}

// Filters table rows as the user types in the search box
function aFilterTable(tbodyId, query, colspan) {
  var tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  var visible = 0;
  tbody.querySelectorAll("tr:not(.no-results-row)").forEach(function(row) {
    var show = !query || row.textContent.toLowerCase().includes(query);
    row.style.display = show ? "" : "none";
    if (show) visible++;
  });
  var noRow = tbody.querySelector(".no-results-row");
  if (visible === 0 && query) {
    if (!noRow) {
      var tr = document.createElement("tr");
      tr.className = "no-results-row";
      tr.innerHTML = '<td colspan="' + colspan + '"><p class="empty-state">No results for "' + aEsc(query) + '".</p></td>';
      tbody.appendChild(tr);
    }
  } else if (noRow) {
    noRow.remove();
  }
}

// Opens a form and scrolls it into view
function aShowForm(formId, btnId) {
  var f = document.getElementById(formId);
  var b = document.getElementById(btnId);
  if (f) { f.hidden = false; f.scrollIntoView({ behavior: "smooth", block: "nearest" }); }
  if (b) b.setAttribute("aria-expanded", "true");
}

// Small utility functions used throughout this file
function aGv(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

function aSv(id, val) {
  var el = document.getElementById(id);
  if (el) el.value = (val !== null && val !== undefined) ? val : "";
}

function aSet(id, val) {
  var el = document.getElementById(id);
  if (el) el.textContent = String(val !== null && val !== undefined ? val : "");
}

function aEsc(s) {
  var str = (s !== null && s !== undefined) ? String(s) : "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function aCap(s)  { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ""; }

function aFmt(s) {
  try {
    return new Date(s).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch(e) {
    return s || "\u2014";
  }
}

function aOrd(n) {
  var s = ["th", "st", "nd", "rd"];
  var v = parseInt(n) % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function aToast(msg, type) {
  type = type || "default";
  var t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.className   = "toast show" + (type !== "default" ? " " + type : "");
  clearTimeout(t._tid);
  t._tid = setTimeout(function() { t.className = "toast"; }, 4000);
}

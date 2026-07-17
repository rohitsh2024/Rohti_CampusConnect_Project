// Firebase setup
var FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDqj-QVN4aSFC0iBDQEBviXORVBqF4muM0",
  authDomain:        "campus-connect-e33be.firebaseapp.com",
  projectId:         "campus-connect-e33be",
  storageBucket:     "campus-connect-e33be.firebasestorage.app",
  messagingSenderId: "214537333711",
  appId:             "1:214537333711:web:be5eeaf0bdc65d873d40ba"
};
if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);

var auth = firebase.auth();
var db   = firebase.firestore();

// Friendly messages for every Firebase auth error
var AUTH_ERRORS = {
  "auth/user-not-found":         "No account found with that email.",
  "auth/wrong-password":         "Incorrect password. Please try again.",
  "auth/invalid-credential":     "Incorrect email or password.",
  "auth/email-already-in-use":   "This email already has an account. Try signing in.",
  "auth/invalid-email":          "That doesn't look like a valid email address.",
  "auth/weak-password":          "Password too weak — use at least 8 characters.",
  "auth/too-many-requests":      "Too many attempts. Please wait a moment.",
  "auth/network-request-failed": "Network error. Check your connection.",
  "auth/user-disabled":          "This account has been disabled.",
  "auth/operation-not-allowed":  "Email/password sign-in is not enabled."
};

function authErr(code) {
  return AUTH_ERRORS[code] || ("Something went wrong. Code: " + (code || "unknown"));
}

// If someone lands on the login page while already signed in, send them home
auth.onAuthStateChanged(function(user) {
  var overlay = document.getElementById("init-overlay");
  if (overlay) overlay.classList.add("done");

  if (!user) return;

  db.collection("users").doc(user.uid).get()
    .then(function(snap) {
      if (snap.exists && snap.data().role) {
        var role = snap.data().role;
        sessionStorage.setItem("cc_role", role);
        window.location.replace(role === "admin" ? "admin.html" : "student.html");
      }
    })
    .catch(function() {
      // Firestore unreachable — just stay on the login page
    });
});

document.addEventListener("DOMContentLoaded", function() {

  var paneSignin   = document.getElementById("pane-signin");
  var paneRegister = document.getElementById("pane-register");
  var tabBtns      = document.querySelectorAll(".tab-btn");
  var cardTitle    = document.getElementById("card-title");
  var cardSub      = document.getElementById("card-sub");
  var formSignin   = document.getElementById("form-signin");
  var formRegister = document.getElementById("form-register");
  var btnSignin    = document.getElementById("btn-signin");
  var btnRegister  = document.getElementById("btn-register");
  var strengthFill = document.getElementById("strength-bar");
  var strengthLbl  = document.getElementById("strength-lbl");

  var COPY = {
    signin:   { title: "Welcome back",        sub: "Sign in to access your campus dashboard."     },
    register: { title: "Create your account", sub: "Join CampusConnect — it only takes a minute." }
  };

  // Switches between Sign In and Create Account tabs
  function showPane(key) {
    tabBtns.forEach(function(b) {
      b.classList.toggle("tab-btn--active", b.dataset.tab === key);
      b.setAttribute("aria-selected", String(b.dataset.tab === key));
    });

    if (key === "signin") {
      paneSignin.removeAttribute("hidden");
      paneRegister.setAttribute("hidden", "");
    } else {
      paneRegister.removeAttribute("hidden");
      paneSignin.setAttribute("hidden", "");
    }

    var active = key === "signin" ? paneSignin : paneRegister;
    active.classList.remove("pane-enter");
    void active.offsetWidth;
    active.classList.add("pane-enter");

    if (cardTitle) cardTitle.textContent = COPY[key].title;
    if (cardSub)   cardSub.textContent   = COPY[key].sub;

    active.querySelectorAll(".err").forEach(function(el) { el.classList.remove("err"); });
  }

  tabBtns.forEach(function(b) {
    b.addEventListener("click", function() { showPane(b.dataset.tab); });
  });

  document.querySelectorAll("[data-switch]").forEach(function(btn) {
    btn.addEventListener("click", function() { showPane(btn.dataset.switch); });
  });

  // Show or hide the password when the eye icon is clicked
  document.querySelectorAll(".eye-btn").forEach(function(btn) {
    btn.addEventListener("click", function() {
      var inp = document.getElementById(btn.dataset.for);
      if (!inp) return;
      var show = inp.type === "password";
      inp.type = show ? "text" : "password";
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      var eo = btn.querySelector(".eye-open");
      var es = btn.querySelector(".eye-shut");
      if (eo) eo.style.display = show ? "none"  : "block";
      if (es) es.style.display = show ? "block" : "none";
    });
  });

  // Live password strength indicator
  var pwdInput = document.getElementById("rg-pwd");
  if (pwdInput) {
    pwdInput.addEventListener("input", function() {
      var v = this.value;
      var score = 0;
      if (v.length >= 8)          score++;
      if (/[A-Z]/.test(v))        score++;
      if (/[0-9]/.test(v))        score++;
      if (/[^A-Za-z0-9]/.test(v)) score++;

      var levels = [
        { pct: "0%",   col: "transparent", lbl: ""       },
        { pct: "33%",  col: "#ef4444",     lbl: "Weak"   },
        { pct: "67%",  col: "#f59e0b",     lbl: "Fair"   },
        { pct: "100%", col: "#22c55e",     lbl: "Strong" }
      ];
      var lv = score === 0 ? 0 : score <= 2 ? 1 : score === 3 ? 2 : 3;

      if (strengthFill) {
        strengthFill.style.width      = levels[lv].pct;
        strengthFill.style.background = levels[lv].col;
      }
      if (strengthLbl) {
        strengthLbl.textContent = levels[lv].lbl ? "Strength: " + levels[lv].lbl : "";
        strengthLbl.style.color = levels[lv].col;
      }
    });
  }

  // Clear the red border as soon as the user starts typing
  document.querySelectorAll(".field-input, .field-select").forEach(function(el) {
    el.addEventListener("input",  function() { el.classList.remove("err"); });
    el.addEventListener("change", function() { el.classList.remove("err"); });
  });

  function setLoading(btn, on) {
    btn.disabled = on;
    btn.classList.toggle("loading", on);
  }

  function validateFields(rules) {
    var ok = true;
    rules.forEach(function(r) {
      var fail = r.test ? !r.test(r.el) : !r.el.value.trim();
      r.el.classList.toggle("err", fail);
      if (fail) ok = false;
    });
    return ok;
  }

  // Sends a password reset email
  var btnForgot = document.getElementById("btn-forgot");
  if (btnForgot) {
    btnForgot.addEventListener("click", function() {
      var emailEl = document.getElementById("si-email");
      if (!emailEl || !emailEl.value.trim()) {
        if (emailEl) emailEl.classList.add("err");
        showToast("Enter your email address first.", "error");
        return;
      }
      auth.sendPasswordResetEmail(emailEl.value.trim())
        .then(function() { showToast("Password reset email sent! Check your inbox.", "success"); })
        .catch(function(e) { showToast(authErr(e.code), "error"); });
    });
  }

  // Sign in flow
  if (formSignin) {
    formSignin.addEventListener("submit", function(e) {
      e.preventDefault();

      var roleEl  = document.getElementById("si-role");
      var emailEl = document.getElementById("si-email");
      var pwdEl   = document.getElementById("si-pwd");

      if (!validateFields([
        { el: roleEl,  test: function(el) { return el.value !== ""; } },
        { el: emailEl, test: function(el) { return el.value.trim().length > 0; } },
        { el: pwdEl,   test: function(el) { return el.value.length > 0; } }
      ])) {
        showToast("Please fill in all required fields.", "error");
        return;
      }

      setLoading(btnSignin, true);

      var selectedRole = roleEl.value;
      var email        = emailEl.value.trim();
      var password     = pwdEl.value;

      // Step 1 — authenticate with Firebase
      auth.signInWithEmailAndPassword(email, password)
        .then(function(cred) {
          var uid  = cred.user.uid;
          var user = cred.user;

          // Step 2 — read the stored role from Firestore
          return db.collection("users").doc(uid).get()
            .then(function(snap) {
              if (snap.exists && snap.data().role) {
                return snap.data().role;
              }

              // No document found — create one now so future logins work
              console.log("No Firestore doc for", uid, "— creating with role:", selectedRole);
              return db.collection("users").doc(uid).set({
                uid:         uid,
                email:       user.email || "",
                displayName: user.displayName || "",
                role:        selectedRole,
                createdAt:   firebase.firestore.FieldValue.serverTimestamp()
              }, { merge: true }).then(function() {
                return selectedRole;
              });
            })
            .catch(function(fsErr) {
              // Firestore is unreachable — fall back to the dropdown selection
              console.warn("Firestore read failed:", fsErr.code, fsErr.message);
              return selectedRole;
            });
        })
        .then(function(firestoreRole) {
          // Step 3 — make sure the user picked the right portal
          if (firestoreRole !== selectedRole) {
            return auth.signOut().then(function() {
              sessionStorage.removeItem("cc_role");
              showToast(
                'Wrong portal. Your account is "' + firestoreRole + '". ' +
                'Please select "' + firestoreRole + '" from the dropdown.',
                "error"
              );
              setLoading(btnSignin, false);
            });
          }

          // Step 4 — everything checks out, redirect
          sessionStorage.setItem("cc_role", firestoreRole);
          showToast("Signed in! Redirecting…", "success");
          setTimeout(function() {
            window.location.replace(firestoreRole === "admin" ? "admin.html" : "student.html");
          }, 700);
        })
        .catch(function(e) {
          showToast(authErr(e.code), "error");
          setLoading(btnSignin, false);
        });
    });
  }

  // Register flow
  if (formRegister) {
    formRegister.addEventListener("submit", function(e) {
      e.preventDefault();

      var fnEl      = document.getElementById("rg-fname");
      var lnEl      = document.getElementById("rg-lname");
      var roleEl    = document.getElementById("rg-role");
      var emailEl   = document.getElementById("rg-email");
      var pwdEl     = document.getElementById("rg-pwd");
      var confirmEl = document.getElementById("rg-confirm");
      var termsEl   = document.getElementById("rg-terms");

      if (!validateFields([
        { el: fnEl,      test: function(el) { return el.value.trim().length > 0; } },
        { el: lnEl,      test: function(el) { return el.value.trim().length > 0; } },
        { el: roleEl,    test: function(el) { return el.value !== ""; } },
        { el: emailEl,   test: function(el) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value.trim()); } },
        { el: pwdEl,     test: function(el) { return el.value.length >= 8; } },
        { el: confirmEl, test: function(el) { return el.value.length > 0; } }
      ])) {
        showToast("Please fill in all fields correctly.", "error");
        return;
      }

      if (pwdEl.value !== confirmEl.value) {
        confirmEl.classList.add("err");
        showToast("Passwords do not match.", "error");
        return;
      }
      if (!termsEl.checked) {
        showToast("Please accept the Terms of Service.", "error");
        return;
      }

      setLoading(btnRegister, true);

      var firstName = fnEl.value.trim();
      var lastName  = lnEl.value.trim();
      var email     = emailEl.value.trim();
      var password  = pwdEl.value;
      var role      = roleEl.value;

      // Create the Firebase Auth account
      auth.createUserWithEmailAndPassword(email, password)
        .then(function(cred) {
          var user = cred.user;
          return user.updateProfile({ displayName: firstName + " " + lastName })
            .then(function() {
              // Save the user profile and role to Firestore — doc ID must be the UID
              return db.collection("users").doc(user.uid).set({
                uid:         user.uid,
                firstName:   firstName,
                lastName:    lastName,
                displayName: firstName + " " + lastName,
                email:       email,
                role:        role,
                createdAt:   firebase.firestore.FieldValue.serverTimestamp()
              });
            });
        })
        .then(function() {
          return auth.signOut();
        })
        .then(function() {
          sessionStorage.removeItem("cc_role");
          showToast("Account created! Welcome, " + firstName + ". Please sign in.", "success");

          setTimeout(function() {
            formRegister.reset();
            if (strengthFill) { strengthFill.style.width = "0"; strengthFill.style.background = "transparent"; }
            if (strengthLbl)    strengthLbl.textContent = "";
            document.querySelectorAll(".eye-btn").forEach(function(btn) {
              var inp = document.getElementById(btn.dataset.for);
              if (inp) inp.type = "password";
              var eo = btn.querySelector(".eye-open");
              var es = btn.querySelector(".eye-shut");
              if (eo) eo.style.display = "block";
              if (es) es.style.display = "none";
            });
            showPane("signin");
            setLoading(btnRegister, false);
          }, 1600);
        })
        .catch(function(e) {
          showToast(authErr(e.code), "error");
          setLoading(btnRegister, false);
        });
    });
  }

});

// Global toast helper — works on every page
var _toastTimer;
function showToast(msg, type) {
  type = type || "default";
  var el = document.getElementById("toast");
  if (!el) return;
  el.textContent = msg;
  el.className   = "toast show" + (type !== "default" ? " " + type : "");
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function() { el.className = "toast"; }, 5000);
}
window.showToast = showToast;

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";

const app = initializeApp({
  apiKey: "AIzaSyCtS1sdqEEV1S5n6u4ArQ-ZaRS_qZBQ4qw",
  authDomain: "ls-invoice.firebaseapp.com",
  projectId: "ls-invoice",
  storageBucket: "ls-invoice.firebasestorage.app",
  messagingSenderId: "960868224955",
  appId: "1:960868224955:web:8b6ed717eec02968407e9e",
});
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

onAuthStateChanged(auth, (u) => {
  if (u) window.location.href = "dashboard.html";
});

const $ = (id) => document.getElementById(id);

const errMap = {
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Try again.",
  "auth/email-already-in-use": "This email is already registered.",
  "auth/weak-password": "Password must be at least 8 characters.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/popup-closed-by-user": "Google sign-in was cancelled.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/invalid-credential": "Incorrect email or password.",
};
const friendlyError = (code) => errMap[code] || "Something went wrong. Please try again.";

function isValidEmail(email) {
  return emailRegex.test(email);
}

function setLoading(id, on) {
  const b = $(id);
  b.classList.toggle("loading", on);
  b.disabled = on;
}

function showAlert(msg, type) {
  $("alert-icon").textContent = type === "success" ? "✅" : "⚠️";
  $("alert-msg").textContent = msg;
  $("alert-box").className = "alert show " + type;
}

function clearAlert() {
  $("alert-box").className = "alert";
}

function showErr(id, show) {
  $(id).classList.toggle("show", show);
}

function switchTab(tab) {
  $("tab-login").classList.toggle("active", tab === "login");
  $("tab-signup").classList.toggle("active", tab === "signup");
  $("login-form").style.display = tab === "login" ? "block" : "none";
  $("signup-form").style.display = tab === "signup" ? "block" : "none";
  clearAlert();
}

function togglePw(inputId, btn) {
  const inp = $(inputId);
  inp.type = inp.type === "text" ? "password" : "text";
  btn.textContent = inp.type === "password" ? "👁️" : "🙈";
}

$("tab-login").onclick = () => switchTab("login");
$("tab-signup").onclick = () => switchTab("signup");
$("goto-signup").onclick = () => switchTab("signup");
$("toggle-login-pw").onclick = () => togglePw("login-password", $("toggle-login-pw"));
$("toggle-signup-pw").onclick = () => togglePw("signup-password", $("toggle-signup-pw"));

$("signup-password").oninput = function () {
  const pw = this.value;
  $("pw-strength").classList.toggle("show", pw.length > 0);
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const colors = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71"];
  const labels = ["Too weak", "Fair", "Good", "Strong 💪"];
  for (let i = 1; i <= 4; i++) {
    $("bar" + i).style.background = i <= score ? colors[score - 1] : "#E0DDD6";
  }
  $("pw-label").textContent = pw.length > 0 ? labels[score - 1] || "Too weak" : "";
};

$("forgot-link").onclick = () => {
  $("auth-panel").style.display = "none";
  $("forgot-panel").style.display = "block";
};

$("back-btn").onclick = () => {
  $("forgot-panel").style.display = "none";
  $("auth-panel").style.display = "block";
};

$("forgot-btn").onclick = async () => {
  const email = $("forgot-email").value.trim();
  if (!isValidEmail(email)) {
    showErr("forgot-email-err", true);
    return;
  }
  showErr("forgot-email-err", false);
  setLoading("forgot-btn", true);
  try {
    await sendPasswordResetEmail(auth, email);
    const el = $("forgot-alert");
    el.className = "alert show success";
    el.textContent = "✅ Reset link sent! Check your inbox.";
  } catch (e) {
    const el = $("forgot-alert");
    el.className = "alert show danger";
    el.textContent = "⚠️ " + friendlyError(e.code);
  }
  setLoading("forgot-btn", false);
};

$("login-btn").onclick = async () => {
  const email = $("login-email").value.trim();
  const pw = $("login-password").value;
  let ok = true;
  if (!isValidEmail(email)) {
    showErr("login-email-err", true);
    ok = false;
  } else {
    showErr("login-email-err", false);
  }
  if (!pw) {
    showErr("login-pw-err", true);
    ok = false;
  } else {
    showErr("login-pw-err", false);
  }
  if (!ok) return;
  setLoading("login-btn", true);
  clearAlert();
  try {
    await signInWithEmailAndPassword(auth, email, pw);
    showAlert("Logged in! Redirecting...", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 900);
  } catch (e) {
    showAlert(friendlyError(e.code), "danger");
    setLoading("login-btn", false);
  }
};

$("signup-btn").onclick = async () => {
  const name = $("signup-name").value.trim();
  const email = $("signup-email").value.trim();
  const pw = $("signup-password").value;
  let ok = true;
  if (!name) {
    showErr("signup-name-err", true);
    ok = false;
  } else {
    showErr("signup-name-err", false);
  }
  if (!isValidEmail(email)) {
    showErr("signup-email-err", true);
    ok = false;
  } else {
    showErr("signup-email-err", false);
  }
  if (pw.length < 8) {
    showErr("signup-pw-err", true);
    ok = false;
  } else {
    showErr("signup-pw-err", false);
  }
  if (!ok) return;
  setLoading("signup-btn", true);
  clearAlert();
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pw);
    await updateProfile(result.user, { displayName: name });
    showAlert("Account created! Welcome 🎉", "success");
    setTimeout(() => (window.location.href = "dashboard.html"), 900);
  } catch (e) {
    showAlert(friendlyError(e.code), "danger");
    setLoading("signup-btn", false);
  }
};

async function googleSignIn() {
  clearAlert();
  try {
    await signInWithPopup(auth, provider);
    window.location.href = "dashboard.html";
  } catch (e) {
    showAlert(friendlyError(e.code), "danger");
  }
}

$("google-login-btn").onclick = googleSignIn;
$("google-signup-btn").onclick = googleSignIn;

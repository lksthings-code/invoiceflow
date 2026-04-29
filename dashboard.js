import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

const app = initializeApp({
  apiKey: "AIzaSyCtS1sdqEEV1S5n6u4ArQ-ZaRS_qZBQ4qw",
  authDomain: "ls-invoice.firebaseapp.com",
  projectId: "ls-invoice",
  storageBucket: "ls-invoice.firebasestorage.app",
  messagingSenderId: "960868224955",
  appId: "1:960868224955:web:8b6ed717eec02968407e9e",
});
const auth = getAuth(app);
const db = getFirestore(app);
const $ = (id) => document.getElementById(id);

let allInvoices = [];
let currentFilter = "all";
let deleteTarget = null;
let currentUser = null;

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

function getDisplayCurrency(invoices) {
  const currencies = new Set(invoices.map((i) => i.currency || "$"));
  return currencies.size === 1 ? [...currencies][0] : "Mixed";
}

function formatMoney(amount, currency) {
  if (currency === "Mixed") return amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " (mixed)";
  return currency + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }
  currentUser = user;
  const name = user.displayName || user.email.split("@")[0];
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  $("user-name").textContent = name;
  $("user-avatar").textContent = initials;
  await loadInvoices();
});

$("logout-btn").onclick = async () => {
  await signOut(auth);
  window.location.href = "login.html";
};

async function loadInvoices() {
  try {
    const q = query(collection(db, "invoices"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    allInvoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch {
    const q2 = query(collection(db, "invoices"), where("userId", "==", currentUser.uid));
    const snap = await getDocs(q2);
    allInvoices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  $("loading-state").style.display = "none";
  renderStats();
  renderTable();
}

function renderStats() {
  const total = allInvoices.reduce((s, i) => s + (i.amount || 0), 0);
  const paid = allInvoices.filter((i) => i.status === "paid");
  const pending = allInvoices.filter((i) => i.status === "pending");
  const overdue = allInvoices.filter((i) => i.status === "overdue");

  $("stat-total").textContent = formatMoney(total, getDisplayCurrency(allInvoices));
  $("stat-paid").textContent = formatMoney(paid.reduce((s, i) => s + (i.amount || 0), 0), getDisplayCurrency(paid));
  $("stat-pending").textContent = formatMoney(pending.reduce((s, i) => s + (i.amount || 0), 0), getDisplayCurrency(pending));
  $("stat-overdue").textContent = formatMoney(overdue.reduce((s, i) => s + (i.amount || 0), 0), getDisplayCurrency(overdue));
  $("stat-paid-count").textContent = paid.length + " invoice" + (paid.length !== 1 ? "s" : "");
  $("stat-pending-count").textContent = pending.length + " invoice" + (pending.length !== 1 ? "s" : "");
  $("stat-overdue-count").textContent = overdue.length + " invoice" + (overdue.length !== 1 ? "s" : "");

  const badge = $("overdue-badge");
  badge.textContent = String(overdue.length);
  badge.style.display = overdue.length > 0 ? "inline-block" : "none";
}

function buildRow(inv) {
  const tr = document.createElement("tr");

  const invoiceCell = document.createElement("td");
  const invoiceSpan = document.createElement("span");
  invoiceSpan.className = "inv-num";
  invoiceSpan.textContent = inv.invoiceNumber || "—";
  invoiceCell.appendChild(invoiceSpan);

  const clientCell = document.createElement("td");
  clientCell.textContent = inv.clientName || "—";

  const dateCell = document.createElement("td");
  const dateSpan = document.createElement("span");
  dateSpan.className = "inv-date";
  dateSpan.textContent = inv.invoiceDate || "—";
  dateCell.appendChild(dateSpan);

  const amountCell = document.createElement("td");
  const amountSpan = document.createElement("span");
  amountSpan.className = "amount";
  amountSpan.textContent = (inv.currency || "$") + (inv.amount || 0).toFixed(2);
  amountCell.appendChild(amountSpan);

  const statusCell = document.createElement("td");
  const statusSpan = document.createElement("span");
  const status = inv.status || "draft";
  statusSpan.className = "badge " + status;
  statusSpan.textContent = capitalize(status);
  statusCell.appendChild(statusSpan);

  const actionsCell = document.createElement("td");
  const actions = document.createElement("div");
  actions.className = "actions";

  const paidBtn = document.createElement("button");
  paidBtn.className = "act-btn";
  paidBtn.textContent = "✅ Paid";
  paidBtn.disabled = inv.status === "paid";
  paidBtn.addEventListener("click", () => markPaid(inv.id));

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "act-btn delete";
  deleteBtn.textContent = "🗑 Delete";
  deleteBtn.addEventListener("click", () => openDelete(inv.id, inv.invoiceNumber || inv.id));

  actions.append(paidBtn, deleteBtn);
  actionsCell.appendChild(actions);

  tr.append(invoiceCell, clientCell, dateCell, amountCell, statusCell, actionsCell);
  return tr;
}

function renderTable() {
  const search = $("search-input").value.toLowerCase();
  const list = allInvoices.filter((inv) => {
    const matchFilter = currentFilter === "all" || inv.status === currentFilter;
    const matchSearch =
      (inv.invoiceNumber || "").toLowerCase().includes(search) || (inv.clientName || "").toLowerCase().includes(search);
    return matchFilter && matchSearch;
  });

  const table = $("invoices-table");
  const empty = $("empty-state");
  const tbody = $("invoice-tbody");

  if (list.length === 0) {
    table.style.display = "none";
    empty.style.display = "block";
    return;
  }

  table.style.display = "table";
  empty.style.display = "none";
  tbody.textContent = "";
  list.forEach((inv) => tbody.appendChild(buildRow(inv)));
}

async function markPaid(id) {
  try {
    await updateDoc(doc(db, "invoices", id), { status: "paid" });
    const inv = allInvoices.find((i) => i.id === id);
    if (inv) inv.status = "paid";
    renderStats();
    renderTable();
    showToast("✅ Invoice marked as paid!");
  } catch {
    showToast("⚠️ Could not update invoice.");
  }
}

function openDelete(id, name) {
  deleteTarget = id;
  $("delete-inv-name").textContent = name;
  $("delete-modal").classList.add("show");
}

$("cancel-delete").onclick = () => {
  $("delete-modal").classList.remove("show");
  deleteTarget = null;
};

$("confirm-delete").onclick = async () => {
  if (!deleteTarget) return;
  try {
    await deleteDoc(doc(db, "invoices", deleteTarget));
    allInvoices = allInvoices.filter((i) => i.id !== deleteTarget);
    renderStats();
    renderTable();
    showToast("🗑 Invoice deleted.");
  } catch {
    showToast("⚠️ Could not delete invoice.");
  }
  $("delete-modal").classList.remove("show");
  deleteTarget = null;
};

document.querySelectorAll(".filter-tab").forEach((btn) => {
  btn.onclick = () => {
    document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    currentFilter = btn.dataset.filter;
    renderTable();
  };
});

$("search-input").oninput = () => renderTable();
$("top-new-btn").onclick = () => (window.location.href = "index.html");
$("empty-new-btn").onclick = () => (window.location.href = "index.html");

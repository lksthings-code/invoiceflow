import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-firestore.js";

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
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

let currentUser = null;

function getCurrency() {
  return $("currency").value;
}

function fmt(n) {
  return getCurrency() + parseFloat(n || 0).toFixed(2);
}

function showToast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 3000);
}

function collectItems() {
  return [...document.querySelectorAll(".item-row")].map((r) => {
    const inputs = r.querySelectorAll("input");
    return {
      description: inputs[0].value.trim(),
      qty: parseFloat(inputs[1].value) || 0,
      price: parseFloat(inputs[2].value) || 0,
    };
  });
}

function hasValidInvoiceItems(items) {
  return items.some((item) => item.description && item.qty > 0 && item.price >= 0);
}

function validateInvoiceBasics() {
  const fromName = $("from-name").value.trim();
  const toName = $("to-name").value.trim();
  const fromEmail = $("from-email").value.trim();
  const toEmail = $("to-email").value.trim();
  const items = collectItems();

  if (!fromName || !toName) {
    showToast("⚠️ Add both your name and client name.");
    return false;
  }

  if (fromEmail && !emailRegex.test(fromEmail)) {
    showToast("⚠️ Enter a valid sender email.");
    return false;
  }

  if (toEmail && !emailRegex.test(toEmail)) {
    showToast("⚠️ Enter a valid client email.");
    return false;
  }

  if (!hasValidInvoiceItems(items)) {
    showToast("⚠️ Add at least one item with description and quantity.");
    return false;
  }

  return true;
}

function calcTotals() {
  let sub = 0;
  document.querySelectorAll(".item-row").forEach((r) => {
    const inp = r.querySelectorAll("input");
    sub += (parseFloat(inp[1].value) || 0) * (parseFloat(inp[2].value) || 0);
  });
  const taxRate = parseFloat($("tax-rate").value) || 0;
  const tax = (sub * taxRate) / 100;
  const grand = sub + tax;
  return { sub, tax, grand, taxRate };
}

function addItem() {
  const list = $("items-list");
  const row = document.createElement("div");
  row.className = "item-row";
  row.innerHTML = `
    <input type="text" placeholder="Service or product description" />
    <input type="number" value="1" min="0" />
    <input type="number" value="0" min="0" step="0.01" />
    <button class="remove-btn" type="button" aria-label="Remove item">×</button>
  `;

  const [desc, qty, price] = row.querySelectorAll("input");
  const removeBtn = row.querySelector(".remove-btn");
  desc.addEventListener("input", updatePreview);
  qty.addEventListener("input", updatePreview);
  price.addEventListener("input", updatePreview);
  removeBtn.addEventListener("click", () => {
    row.remove();
    updatePreview();
  });

  list.appendChild(row);
  updatePreview();
}

function updatePreview() {
  const { sub, tax, grand, taxRate } = calcTotals();
  $("subtotal").textContent = fmt(sub);
  $("tax-label").textContent = taxRate;
  $("tax-amount").textContent = fmt(tax);
  $("grand-total").textContent = fmt(grand);

  const get = (id) => $(id).value;
  $("p-from-name").textContent = get("from-name") || "—";
  $("p-from-email").textContent = get("from-email") || "—";
  $("p-from-phone").textContent = get("from-phone");
  $("p-to-name").textContent = get("to-name") || "—";
  $("p-to-email").textContent = get("to-email") || "—";
  $("p-to-address").textContent = get("to-address");
  $("p-inv-num").textContent = "#" + (get("inv-number") || "INV-001");
  $("p-inv-date").textContent = get("inv-date") || "—";
  $("p-due-date").textContent = get("due-date") || "—";

  const tbody = $("p-items");
  tbody.textContent = "";
  const rows = document.querySelectorAll(".item-row");

  if (!rows.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 4;
    td.style.color = "#ccc";
    td.style.textAlign = "center";
    td.style.padding = "20px";
    td.textContent = "Add items above";
    tr.appendChild(td);
    tbody.appendChild(tr);
  } else {
    rows.forEach((r) => {
      const inp = r.querySelectorAll("input");
      const qty = parseFloat(inp[1].value) || 0;
      const price = parseFloat(inp[2].value) || 0;
      const tr = document.createElement("tr");

      const descriptionTd = document.createElement("td");
      descriptionTd.textContent = inp[0].value || "—";

      const qtyTd = document.createElement("td");
      qtyTd.style.textAlign = "right";
      qtyTd.textContent = String(qty);

      const priceTd = document.createElement("td");
      priceTd.style.textAlign = "right";
      priceTd.textContent = fmt(price);

      const amountTd = document.createElement("td");
      amountTd.style.textAlign = "right";
      amountTd.style.fontWeight = "600";
      amountTd.textContent = fmt(qty * price);

      tr.append(descriptionTd, qtyTd, priceTd, amountTd);
      tbody.appendChild(tr);
    });
  }

  $("p-subtotal").textContent = fmt(sub);
  $("p-tax").textContent = fmt(tax) + " (" + taxRate + "%)";
  $("p-total").textContent = "Total: " + fmt(grand);

  const notesEl = $("p-notes");
  const notes = get("notes").trim();
  notesEl.textContent = notes ? "📝 " + notes : "";
  notesEl.style.display = notes ? "block" : "none";
}

async function saveToFirebase() {
  if (!currentUser) {
    showToast("⚠️ Please log in to save invoices.");
    return;
  }
  if (!validateInvoiceBasics()) return;

  const { grand } = calcTotals();
  const items = collectItems().filter((item) => item.description && item.qty > 0);

  try {
    $("save-btn").textContent = "⏳ Saving...";
    $("save-btn").disabled = true;
    await addDoc(collection(db, "invoices"), {
      userId: currentUser.uid,
      invoiceNumber: $("inv-number").value || "INV-001",
      clientName: $("to-name").value || "Unknown",
      clientEmail: $("to-email").value,
      clientAddress: $("to-address").value,
      fromName: $("from-name").value,
      fromEmail: $("from-email").value,
      invoiceDate: $("inv-date").value,
      dueDate: $("due-date").value,
      currency: $("currency").value,
      taxRate: $("tax-rate").value,
      notes: $("notes").value,
      items,
      amount: grand,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    showToast("☁️ Invoice saved to your dashboard!");
  } catch (e) {
    showToast("⚠️ Save failed: " + e.message);
  }

  $("save-btn").textContent = "☁️ Save";
  $("save-btn").disabled = false;
}

function downloadPDF() {
  if (!validateInvoiceBasics()) return;

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const { sub, tax, grand, taxRate } = calcTotals();
  const cur = getCurrency();
  const f = (n) => cur + parseFloat(n || 0).toFixed(2);
  const get = (id) => $(id).value;

  doc.setFillColor(17, 17, 17);
  doc.rect(0, 0, 210, 32, "F");
  doc.setTextColor(245, 200, 66);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("InvoiceFlow", 14, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("INVOICE", 196, 14, { align: "right" });
  doc.setFontSize(9);
  doc.text("#" + (get("inv-number") || "INV-001"), 196, 22, { align: "right" });

  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.text("FROM", 14, 44);
  doc.text("TO", 105, 44);
  doc.setTextColor(20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(get("from-name") || "Your Business", 14, 52);
  doc.text(get("to-name") || "Client", 105, 52);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80);
  if (get("from-email")) doc.text(get("from-email"), 14, 59);
  if (get("to-email")) doc.text(get("to-email"), 105, 59);
  if (get("to-address")) doc.text(get("to-address"), 105, 66);

  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Date: " + get("inv-date"), 14, 78);
  doc.text("Due:  " + get("due-date"), 14, 85);

  doc.setFillColor(245, 200, 66);
  doc.rect(14, 92, 182, 1, "F");
  doc.setFillColor(244, 242, 238);
  doc.rect(14, 95, 182, 9, "F");
  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.setFont("helvetica", "bold");
  doc.text("DESCRIPTION", 16, 101);
  doc.text("QTY", 130, 101, { align: "right" });
  doc.text("PRICE", 160, 101, { align: "right" });
  doc.text("AMOUNT", 196, 101, { align: "right" });

  let y = 112;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  document.querySelectorAll(".item-row").forEach((r, i) => {
    const inp = r.querySelectorAll("input");
    const qty = parseFloat(inp[1].value) || 0;
    const price = parseFloat(inp[2].value) || 0;
    if (i % 2 === 1) {
      doc.setFillColor(250, 249, 246);
      doc.rect(14, y - 6, 182, 9, "F");
    }
    doc.setTextColor(30);
    doc.text((inp[0].value || "—").substring(0, 45), 16, y);
    doc.text(String(qty), 130, y, { align: "right" });
    doc.setTextColor(60);
    doc.text(f(price), 160, y, { align: "right" });
    doc.setTextColor(20);
    doc.setFont("helvetica", "bold");
    doc.text(f(qty * price), 196, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 10;
  });

  y += 6;
  doc.setFillColor(244, 242, 238);
  doc.rect(120, y - 5, 76, 28, "F");
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Subtotal:", 125, y + 2);
  doc.text(f(sub), 196, y + 2, { align: "right" });
  doc.text("Tax (" + taxRate + "%):", 125, y + 10);
  doc.text(f(tax), 196, y + 10, { align: "right" });
  doc.setFillColor(17, 17, 17);
  doc.rect(120, y + 14, 76, 10, "F");
  doc.setTextColor(245, 200, 66);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("TOTAL:", 125, y + 21);
  doc.text(f(grand), 196, y + 21, { align: "right" });

  const notes = get("notes").trim();
  if (notes) {
    y += 40;
    doc.setFillColor(255, 251, 230);
    doc.rect(14, y, 182, 18, "F");
    doc.setFillColor(245, 200, 66);
    doc.rect(14, y, 3, 18, "F");
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Notes:", 20, y + 7);
    doc.setTextColor(60);
    doc.text(notes.substring(0, 90), 20, y + 14);
  }

  doc.setFillColor(17, 17, 17);
  doc.rect(0, 282, 210, 15, "F");
  doc.setTextColor(100);
  doc.setFontSize(7);
  doc.text("Generated by InvoiceFlow", 105, 291, { align: "center" });

  doc.save("invoice-" + (get("inv-number") || "INV-001") + ".pdf");
  showToast("✅ PDF downloaded!");
}

function setupDatesAndItems() {
  const today = new Date().toISOString().split("T")[0];
  $("inv-date").value = today;
  const due = new Date();
  due.setDate(due.getDate() + 14);
  $("due-date").value = due.toISOString().split("T")[0];

  addItem();
  addItem();
}

function setupButtons() {
  $("nav-auth-btn").addEventListener("click", () => {
    if (!currentUser) window.location.href = "login.html";
  });
  document.querySelector(".btn-primary").addEventListener("click", updatePreview);
  document.querySelector(".btn-download").addEventListener("click", downloadPDF);
  $("save-btn").addEventListener("click", saveToFirebase);
  document.querySelector(".add-item-btn").addEventListener("click", addItem);
}

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) {
    const name = user.displayName || user.email.split("@")[0];
    $("nav-user").textContent = "👤 " + name;
    $("nav-user").style.display = "inline";
    $("nav-auth-btn").textContent = "Dashboard";
    $("nav-auth-btn").onclick = () => (window.location.href = "dashboard.html");
    $("save-btn").disabled = false;
    $("save-note").style.display = "none";
  } else {
    $("save-btn").disabled = true;
  }
});

window.addItem = addItem;
window.updatePreview = updatePreview;
window.downloadPDF = downloadPDF;
window.saveToFirebase = saveToFirebase;

setupDatesAndItems();
setupButtons();
updatePreview();

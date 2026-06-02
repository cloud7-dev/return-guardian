import {
  amountToCents,
  buildDashboardGroups,
  createCsvExport,
  createJsonExport,
  daysBetween,
  formatDisplayDate,
  formatFileSize,
  formatMoney,
  formatRelativeDeadline,
  getPurchaseDeadlineEvents,
  makeExportRecord,
  toLocalDateString,
  uuid,
} from "./domain.js";
import {
  deletePurchase,
  getAttachmentBlob,
  loadAppData,
  removeSampleData,
  resetSampleData,
  saveExportRecord,
  savePurchase,
  seedSampleDataOnce,
  updatePurchase,
} from "./storage.js";

const app = document.querySelector("#app");
let data = { purchases: [], receipts: [], attachments: [], reminders: [] };
let notice = "";
let objectUrls = [];

const icons = {
  home: "⌂",
  list: "≡",
  plus: "+",
  export: "⇩",
  settings: "⚙",
  shield: "✓",
  receipt: "▤",
  clock: "◷",
  calendar: "□",
  warning: "!",
  edit: "✎",
  trash: "×",
  upload: "↥",
};

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function attr(value = "") {
  return escapeHtml(value);
}

function icon(name) {
  return `<span class="ui-icon" aria-hidden="true">${icons[name] || "•"}</span>`;
}

function parseRoute() {
  const path = (window.location.hash || "#/").replace(/^#/, "");
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return { view: "dashboard" };
  if (parts[0] === "purchases" && parts[1] === "new") return { view: "new" };
  if (parts[0] === "purchases" && parts[1] && parts[2] === "edit") return { view: "edit", id: parts[1] };
  if (parts[0] === "purchases" && parts[1]) return { view: "detail", id: parts[1] };
  if (parts[0] === "purchases") return { view: "purchases" };
  if (parts[0] === "exports") return { view: "exports" };
  if (parts[0] === "settings") return { view: "settings" };
  return { view: "dashboard" };
}

function setHash(hash) {
  window.location.hash = hash;
}

async function refresh() {
  await seedSampleDataOnce();
  data = await loadAppData();
  render();
}

function shell(route, content) {
  return `
    <div class="app-shell">
      ${sidebar(route)}
      <main class="main-shell" aria-live="polite">
        ${topbar()}
        ${content}
      </main>
    </div>
  `;
}

function sidebar(route) {
  return `
    <aside class="sidebar" aria-label="Primary navigation">
      <a class="brand" href="#/" aria-label="Return Guardian dashboard">
        <span class="brand-mark">${icon("shield")}</span>
        <span>
          <strong>Return Guardian</strong>
          <small>Local purchase memory</small>
        </span>
      </a>
      <nav class="nav-list">
        ${navItem("#/", "home", "Dashboard", route.view === "dashboard")}
        ${navItem("#/purchases", "list", "Purchases", route.view === "purchases")}
        ${navItem("#/purchases/new", "plus", "Add purchase", route.view === "new")}
        ${navItem("#/exports", "export", "Export", route.view === "exports")}
        ${navItem("#/settings", "settings", "Settings", route.view === "settings")}
      </nav>
      <div class="privacy-panel">
        ${icon("shield")}
        <div>
          <strong>Local data</strong>
          <p>Records and receipt files stay in this browser's IndexedDB.</p>
        </div>
      </div>
    </aside>
  `;
}

function navItem(href, iconName, label, active) {
  return `
    <a class="nav-item ${active ? "active" : ""}" href="${href}" ${active ? 'aria-current="page"' : ""}>
      ${icon(iconName)}
      <span>${label}</span>
    </a>
  `;
}

function topbar() {
  return `
    <header class="topbar">
      <div>
        <p class="eyebrow">Never miss a return window or warranty again.</p>
        <h1>Receipt, return, and warranty deadlines in one local workspace.</h1>
      </div>
      <div class="topbar-actions">
        ${notice ? `<span class="notice">${escapeHtml(notice)}</span>` : ""}
        <a class="button secondary" href="#/exports">${icon("export")}Export</a>
        <a class="button primary" href="#/purchases/new">${icon("plus")}Add purchase</a>
      </div>
    </header>
  `;
}

function render() {
  objectUrls.forEach((url) => URL.revokeObjectURL(url));
  objectUrls = [];
  const route = parseRoute();
  let content = "";

  if (route.view === "dashboard") content = dashboardView();
  if (route.view === "purchases") content = purchasesView();
  if (route.view === "new") content = purchaseFormView();
  if (route.view === "exports") content = exportView();
  if (route.view === "settings") content = settingsView();
  if (route.view === "detail") {
    const purchase = data.purchases.find((item) => item.id === route.id);
    content = purchase ? detailView(purchase) : notFoundView();
  }
  if (route.view === "edit") {
    const purchase = data.purchases.find((item) => item.id === route.id);
    content = purchase ? purchaseFormView(purchase) : notFoundView();
  }

  app.innerHTML = shell(route, content);
  hydrateAttachmentPreviews();
}

function dashboardView() {
  const groups = buildDashboardGroups(data.purchases);
  const recent = data.purchases.filter((purchase) => purchase.status === "active").slice(0, 5);
  const selected = recent[0];

  return `
    <div class="dashboard-grid">
      <section class="dashboard-main">
        <div class="summary-grid" aria-label="Deadline summary">
          ${summaryCard("Today", groups.today.length, "clock", "urgent")}
          ${summaryCard("This week", groups.thisWeek.length, "calendar", "warning")}
          ${summaryCard("Warranty soon", groups.warrantySoon.length, "shield", "safe")}
          ${summaryCard("Receipts", data.attachments.length, "receipt", "neutral")}
        </div>
        ${deadlineSection("Today", "No deadlines due today.", groups.today, "urgent")}
        ${deadlineSection("This week", "No return or refund windows closing this week.", groups.thisWeek, "warning")}
        ${deadlineSection("Warranty soon", "No warranties expiring in the next 30 days.", groups.warrantySoon, "safe")}
        <section class="panel">
          <div class="section-heading">
            <div>
              <h2>Recent purchases</h2>
              <p>Latest records stored in this browser.</p>
            </div>
            <a class="text-link" href="#/purchases">View all</a>
          </div>
          ${
            recent.length
              ? `<div class="purchase-list">${recent.map(purchaseRow).join("")}</div>`
              : emptyState()
          }
        </section>
      </section>
      <aside class="detail-rail" aria-label="Selected purchase preview">
        ${selected ? detailPreview(selected) : `<section class="panel">${emptyState()}</section>`}
      </aside>
    </div>
  `;
}

function summaryCard(title, value, iconName, tone) {
  return `
    <article class="summary-card ${tone}">
      <span class="summary-icon">${icon(iconName)}</span>
      <div>
        <strong>${value}</strong>
        <span>${title}</span>
      </div>
    </article>
  `;
}

function deadlineSection(title, emptyText, events, tone) {
  return `
    <section class="panel">
      <div class="section-heading">
        <div>
          <h2>${title}</h2>
          <p>${events.length ? "Sorted by the closest deadline." : emptyText}</p>
        </div>
      </div>
      ${
        events.length
          ? `<div class="deadline-grid">${events.map((event) => deadlineCard(event, tone)).join("")}</div>`
          : `<p class="muted">${emptyText}</p>`
      }
    </section>
  `;
}

function deadlineCard(event, tone) {
  return `
    <a class="deadline-card" href="#/purchases/${attr(event.purchaseId)}">
      <div class="deadline-card-top">
        <span class="deadline-badge ${tone}">${escapeHtml(event.label)}</span>
        <span class="deadline-relative">${escapeHtml(formatRelativeDeadline(event.daysAway))}</span>
      </div>
      <strong>${escapeHtml(event.productName)}</strong>
      <span>${escapeHtml(event.merchantName)}</span>
      <div class="deadline-card-meta">
        <span>${formatMoney(event.amountCents, event.currency)}</span>
        <span>${formatDisplayDate(event.date)}</span>
        <span>${event.attachmentCount} file</span>
      </div>
    </a>
  `;
}

function purchaseRow(purchase) {
  const next = getPurchaseDeadlineEvents(purchase)
    .filter((event) => event.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway)[0];

  return `
    <a class="purchase-row" href="#/purchases/${attr(purchase.id)}">
      <div class="purchase-row-main">
        <strong>${escapeHtml(purchase.productName)}</strong>
        <span>${escapeHtml(purchase.merchantName)} · ${formatDisplayDate(purchase.purchaseDate)}</span>
      </div>
      <div class="purchase-row-meta">
        ${purchase.isSample ? `<span class="sample-tag">Sample</span>` : ""}
        <span>${formatMoney(purchase.amountCents, purchase.currency)}</span>
        <span>${purchase.attachmentIds.length} attachment</span>
        ${
          next
            ? `<span class="status-pill ${next.daysAway <= 0 ? "urgent" : "safe"}">${next.label} ${formatRelativeDeadline(next.daysAway)}</span>`
            : ""
        }
      </div>
    </a>
  `;
}

function detailPreview(purchase) {
  const attachments = data.attachments.filter((attachment) => attachment.purchaseId === purchase.id);
  const events = getPurchaseDeadlineEvents(purchase).sort((a, b) => a.daysAway - b.daysAway);

  return `
    <section class="panel sticky-panel">
      <div class="section-heading">
        <div>
          <h2>Selected purchase</h2>
          <p>${purchase.isSample ? "Sample data" : "User record"}</p>
        </div>
      </div>
      <div class="detail-preview">
        <div>
          <strong>${escapeHtml(purchase.productName)}</strong>
          <span>${escapeHtml(purchase.merchantName)}</span>
        </div>
        <p class="amount">${formatMoney(purchase.amountCents, purchase.currency)}</p>
        <div class="receipt-preview-box">
          ${icon("receipt")}
          <span>${attachments.length ? `${attachments.length} receipt file attached` : "No receipt file attached"}</span>
        </div>
        <div class="timeline">
          ${
            events.length
              ? events.map(timelineItem).join("")
              : `<p class="muted">No deadlines entered.</p>`
          }
        </div>
        <a class="button full secondary" href="#/purchases/${attr(purchase.id)}">Open detail</a>
      </div>
    </section>
  `;
}

function timelineItem(event) {
  return `
    <div class="timeline-item">
      <span class="timeline-dot ${event.status}"></span>
      <div>
        <strong>${escapeHtml(event.label)}</strong>
        <span>${formatDisplayDate(event.date)} · ${formatRelativeDeadline(event.daysAway)}</span>
      </div>
    </div>
  `;
}

function purchasesView() {
  const purchases = data.purchases.filter((purchase) => purchase.status === "active");
  return `
    <section class="panel page-panel">
      <div class="section-heading">
        <div>
          <h2>Purchases</h2>
          <p>Every purchase record saved in this browser.</p>
        </div>
        <a class="button primary" href="#/purchases/new">${icon("plus")}Add purchase</a>
      </div>
      <div class="purchase-list">
        ${purchases.length ? purchases.map(purchaseRow).join("") : emptyState()}
      </div>
    </section>
  `;
}

function detailView(purchase) {
  const attachments = data.attachments.filter((attachment) => attachment.purchaseId === purchase.id);
  const receipts = data.receipts.filter((receipt) => receipt.purchaseId === purchase.id);
  const events = getPurchaseDeadlineEvents(purchase).sort((a, b) => a.daysAway - b.daysAway);

  return `
    <div class="detail-layout">
      <section class="panel page-panel">
        <div class="section-heading">
          <div>
            <h2>${escapeHtml(purchase.productName)}</h2>
            <p>${escapeHtml(purchase.merchantName)} · ${formatDisplayDate(purchase.purchaseDate)}</p>
          </div>
          <div class="button-row">
            <a class="button secondary" href="#/purchases/${attr(purchase.id)}/edit">${icon("edit")}Edit</a>
            <button class="button secondary" type="button" data-export-single="${attr(purchase.id)}">${icon("export")}Export JSON</button>
            <button class="button danger" type="button" data-delete-purchase="${attr(purchase.id)}">${icon("trash")}Delete</button>
          </div>
        </div>
        <div class="detail-facts">
          ${fact("Amount", formatMoney(purchase.amountCents, purchase.currency))}
          ${fact("Return deadline", formatDisplayDate(purchase.returnDeadline))}
          ${fact("Refund deadline", formatDisplayDate(purchase.refundDeadline))}
          ${fact("Warranty expires", formatDisplayDate(purchase.warrantyExpiresOn))}
          ${fact("Category", purchase.category || "Not set")}
          ${fact("Tags", purchase.tags.length ? purchase.tags.join(", ") : "None")}
        </div>
        ${
          purchase.notes
            ? `<div class="notes-box"><h3>Notes</h3><p>${escapeHtml(purchase.notes)}</p></div>`
            : ""
        }
      </section>
      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>Receipt files</h2>
            <p>${attachments.length ? "Stored locally in IndexedDB." : "No receipt files attached."}</p>
          </div>
        </div>
        ${
          attachments.length
            ? `<div class="attachment-list">${attachments.map(attachmentCard).join("")}</div>`
            : `<p class="muted">Use Edit to attach an image or PDF receipt.</p>`
        }
        ${
          receipts.length
            ? `<div class="receipt-meta-list">${receipts
                .map(
                  (receipt) =>
                    `<div class="receipt-meta">${icon("receipt")}<span>Receipt metadata · ${escapeHtml(receipt.source)} · ${formatDisplayDate(receipt.receiptDate)}</span></div>`,
                )
                .join("")}</div>`
            : ""
        }
      </section>
      <section class="panel">
        <div class="section-heading">
          <div>
            <h2>Reminder timeline</h2>
            <p>Return, refund, and warranty dates.</p>
          </div>
        </div>
        <div class="timeline">${events.length ? events.map(timelineItem).join("") : `<p class="muted">No deadlines entered for this purchase.</p>`}</div>
      </section>
    </div>
  `;
}

function fact(label, value) {
  return `
    <div class="fact">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function attachmentCard(attachment) {
  return `
    <article class="attachment-card">
      <div
        class="attachment-preview js-attachment-preview"
        data-blob-key="${attr(attachment.blobKey)}"
        data-mime-type="${attr(attachment.mimeType)}"
        data-file-name="${attr(attachment.fileName)}"
      >
        ${icon("receipt")}
      </div>
      <div>
        <strong>${escapeHtml(attachment.fileName)}</strong>
        <span>${escapeHtml(attachment.mimeType)} · ${formatFileSize(attachment.sizeBytes)}</span>
      </div>
      <a class="button secondary js-attachment-open" data-blob-link="${attr(attachment.blobKey)}" href="#" target="_blank" rel="noreferrer">Open</a>
    </article>
  `;
}

function purchaseFormView(existingPurchase) {
  const form = existingPurchase
    ? {
        productName: existingPurchase.productName,
        merchantName: existingPurchase.merchantName,
        purchaseDate: existingPurchase.purchaseDate,
        amount: (existingPurchase.amountCents / 100).toFixed(2),
        currency: existingPurchase.currency,
        returnDeadline: existingPurchase.returnDeadline || "",
        refundDeadline: existingPurchase.refundDeadline || "",
        warrantyExpiresOn: existingPurchase.warrantyExpiresOn || "",
        category: existingPurchase.category || "",
        tags: existingPurchase.tags.join(", "),
        notes: existingPurchase.notes || "",
      }
    : {
        productName: "",
        merchantName: "",
        purchaseDate: toLocalDateString(),
        amount: "",
        currency: "USD",
        returnDeadline: "",
        refundDeadline: "",
        warrantyExpiresOn: "",
        category: "",
        tags: "",
        notes: "",
      };
  const existingAttachments = existingPurchase
    ? data.attachments.filter((attachment) => attachment.purchaseId === existingPurchase.id)
    : [];

  return `
    <section class="panel page-panel">
      <div class="section-heading">
        <div>
          <h2>${existingPurchase ? "Edit purchase" : "Add purchase"}</h2>
          <p>Manual entry keeps the MVP reliable before OCR is added.</p>
        </div>
      </div>
      <form class="purchase-form" data-purchase-form="${existingPurchase ? attr(existingPurchase.id) : ""}" novalidate>
        ${field("Product name", "productName", `<input name="productName" value="${attr(form.productName)}" placeholder="Wireless headphones" aria-describedby="productName-error" />`)}
        ${field("Purchase place", "merchantName", `<input name="merchantName" value="${attr(form.merchantName)}" placeholder="Best Buy" aria-describedby="merchantName-error" />`)}
        ${field("Purchase date", "purchaseDate", `<input name="purchaseDate" type="date" value="${attr(form.purchaseDate)}" aria-describedby="purchaseDate-error" />`)}
        ${field("Amount", "amount", `<input name="amount" type="number" min="0" step="0.01" value="${attr(form.amount)}" placeholder="249.99" aria-describedby="amount-error" />`)}
        ${field("Currency", "currency", `<input name="currency" value="${attr(form.currency)}" maxlength="3" />`)}
        ${field("Return deadline", "returnDeadline", `<input name="returnDeadline" type="date" value="${attr(form.returnDeadline)}" aria-describedby="returnDeadline-error" />`)}
        ${field("Refund deadline", "refundDeadline", `<input name="refundDeadline" type="date" value="${attr(form.refundDeadline)}" aria-describedby="refundDeadline-error" />`)}
        ${field("Warranty expiration", "warrantyExpiresOn", `<input name="warrantyExpiresOn" type="date" value="${attr(form.warrantyExpiresOn)}" aria-describedby="warrantyExpiresOn-error" />`)}
        ${field("Category", "category", `<input name="category" value="${attr(form.category)}" placeholder="Electronics" />`)}
        ${field("Tags", "tags", `<input name="tags" value="${attr(form.tags)}" placeholder="audio, gift" />`)}
        <label class="field full">
          <span>Receipt image or PDF</span>
          <span class="file-drop">
            ${icon("upload")}
            <span data-file-label>${existingAttachments.length ? `${existingAttachments.length} existing attachment(s); choose a new file to add another.` : "Choose an image or PDF receipt"}</span>
            <input name="receiptFile" type="file" accept="image/*,application/pdf" aria-describedby="file-error" />
          </span>
          <small class="field-error" id="file-error" data-error-for="file"></small>
        </label>
        ${field("Notes", "notes", `<textarea name="notes" rows="4" placeholder="Fit, return policy, warranty claim notes...">${escapeHtml(form.notes)}</textarea>`, "full")}
        <div class="form-actions full">
          <a class="button secondary" href="${existingPurchase ? `#/purchases/${attr(existingPurchase.id)}` : "#/"}">Cancel</a>
          <button class="button primary" type="submit">${icon("shield")}${existingPurchase ? "Save changes" : "Save purchase"}</button>
        </div>
      </form>
    </section>
  `;
}

function field(label, name, control, className = "") {
  return `
    <label class="field ${className}">
      <span>${label}</span>
      ${control}
      <small class="field-error" id="${name}-error" data-error-for="${name}"></small>
    </label>
  `;
}

function exportView() {
  return `
    <section class="panel page-panel">
      <div class="section-heading">
        <div>
          <h2>Export</h2>
          <p>Exports are generated locally. Binary receipt files are not included in MVP JSON.</p>
        </div>
      </div>
      <div class="export-grid">
        <article class="export-card">
          ${icon("export")}
          <div>
            <h3>CSV purchases</h3>
            <p>Spreadsheet-friendly purchase rows with next deadline fields.</p>
          </div>
          <button class="button primary" type="button" data-export-csv>${icon("export")}Download CSV</button>
        </article>
        <article class="export-card">
          ${icon("receipt")}
          <div>
            <h3>JSON data</h3>
            <p>Structured purchases, receipt metadata, attachment metadata, reminders, and export metadata.</p>
          </div>
          <button class="button primary" type="button" data-export-json>${icon("export")}Download JSON</button>
        </article>
      </div>
    </section>
  `;
}

function settingsView() {
  const userCount = data.purchases.filter((purchase) => !purchase.isSample).length;
  const sampleCount = data.purchases.filter((purchase) => purchase.isSample).length;

  return `
    <section class="panel page-panel">
      <div class="section-heading">
        <div>
          <h2>Settings</h2>
          <p>Local data controls for the MVP.</p>
        </div>
      </div>
      <div class="settings-grid">
        <article class="settings-card">
          ${icon("shield")}
          <div>
            <h3>Storage</h3>
            <p>${userCount} user purchase(s), ${sampleCount} sample purchase(s), ${data.attachments.length} attachment metadata record(s).</p>
          </div>
        </article>
        <article class="settings-card">
          ${icon("settings")}
          <div>
            <h3>Sample data</h3>
            <p>Reset or remove demo records without changing user purchases.</p>
            <div class="button-row">
              <button class="button secondary" type="button" data-reset-samples>Reset samples</button>
              <button class="button danger" type="button" data-remove-samples>Remove samples</button>
            </div>
          </div>
        </article>
      </div>
    </section>
  `;
}

function emptyState() {
  return `
    <div class="empty-state">
      ${icon("warning")}
      <div>
        <strong>No records yet</strong>
        <p>Add a purchase or use the included sample data to preview deadline tracking.</p>
      </div>
      <a class="button primary" href="#/purchases/new">${icon("plus")}Add purchase</a>
    </div>
  `;
}

function notFoundView() {
  return `
    <section class="panel page-panel">
      <h2>Purchase not found</h2>
      <p class="muted">The selected record may have been deleted.</p>
      <a class="button primary" href="#/purchases">Back to purchases</a>
    </section>
  `;
}

function validateForm(form, existingPurchase) {
  const formData = new FormData(form);
  const errors = {};
  const amountCents = amountToCents(formData.get("amount"));
  const purchaseDate = formData.get("purchaseDate");
  const file = form.elements.receiptFile.files[0];

  if (!String(formData.get("productName") || "").trim()) errors.productName = "Product name is required.";
  if (!String(formData.get("merchantName") || "").trim()) errors.merchantName = "Purchase place is required.";
  if (!purchaseDate) errors.purchaseDate = "Purchase date is required.";
  if (!Number.isFinite(amountCents) || amountCents < 0) errors.amount = "Amount must be zero or greater.";

  for (const fieldName of ["returnDeadline", "refundDeadline", "warrantyExpiresOn"]) {
    const value = formData.get(fieldName);
    if (value && purchaseDate && daysBetween(purchaseDate, value) < 0) {
      errors[fieldName] = "Deadline cannot be before purchase date.";
    }
  }

  if (file && !["application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
    errors.file = "Receipt attachment must be an image or PDF.";
  }

  if (existingPurchase?.isSample && !formData.get("productName")) {
    errors.productName = "Sample records can be edited, but product name is still required.";
  }

  return errors;
}

function showFormErrors(form, errors) {
  form.querySelectorAll("[data-error-for]").forEach((node) => {
    node.textContent = errors[node.dataset.errorFor] || "";
  });
  const first = Object.keys(errors)[0];
  if (first) form.querySelector(`[name="${first === "file" ? "receiptFile" : first}"]`)?.focus();
}

async function handlePurchaseSubmit(form) {
  const existingId = form.dataset.purchaseForm || "";
  const existingPurchase = existingId ? data.purchases.find((purchase) => purchase.id === existingId) : undefined;
  const errors = validateForm(form, existingPurchase);
  showFormErrors(form, errors);
  if (Object.keys(errors).length > 0) return;

  const formData = new FormData(form);
  const file = form.elements.receiptFile.files[0];
  const now = new Date().toISOString();
  const purchaseId = existingPurchase?.id || uuid();
  const receiptId = file ? uuid() : undefined;
  const attachmentId = file ? uuid() : undefined;
  const blobKey = file ? `receipt/${purchaseId}/${attachmentId}/${file.name}` : undefined;
  const receiptIds = receiptId ? [...(existingPurchase?.receiptIds || []), receiptId] : existingPurchase?.receiptIds || [];
  const attachmentIds = attachmentId ? [...(existingPurchase?.attachmentIds || []), attachmentId] : existingPurchase?.attachmentIds || [];

  const purchase = {
    id: purchaseId,
    schemaVersion: 1,
    productName: String(formData.get("productName")).trim(),
    merchantName: String(formData.get("merchantName")).trim(),
    purchaseDate: String(formData.get("purchaseDate")),
    amountCents: amountToCents(formData.get("amount")),
    currency: String(formData.get("currency") || "USD").trim().toUpperCase(),
    returnDeadline: String(formData.get("returnDeadline") || "") || undefined,
    refundDeadline: String(formData.get("refundDeadline") || "") || undefined,
    warrantyExpiresOn: String(formData.get("warrantyExpiresOn") || "") || undefined,
    category: String(formData.get("category") || "").trim() || undefined,
    tags: String(formData.get("tags") || "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean),
    notes: String(formData.get("notes") || "").trim() || undefined,
    receiptIds,
    attachmentIds,
    reminderIds: existingPurchase?.reminderIds || [],
    status: "active",
    isSample: existingPurchase?.isSample || false,
    createdAt: existingPurchase?.createdAt || now,
    updatedAt: now,
  };

  const receipt =
    file && receiptId
      ? {
          id: receiptId,
          schemaVersion: 1,
          purchaseId,
          merchantName: purchase.merchantName,
          receiptDate: purchase.purchaseDate,
          totalAmountCents: purchase.amountCents,
          currency: purchase.currency,
          attachmentId,
          source: "file-attachment",
          createdAt: now,
          updatedAt: now,
        }
      : undefined;

  const attachment =
    file && attachmentId && blobKey
      ? {
          id: attachmentId,
          schemaVersion: 1,
          purchaseId,
          receiptId,
          kind: file.type === "application/pdf" ? "receipt-pdf" : "receipt-image",
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          blobKey,
          createdAt: now,
        }
      : undefined;

  if (existingPurchase) {
    await updatePurchase({ purchase, receipt, attachment, attachmentFile: file });
    notice = "Purchase updated locally.";
  } else {
    await savePurchase({ purchase, receipt, attachment, attachmentFile: file });
    notice = "Purchase saved locally.";
  }

  await refresh();
  setHash(`#/purchases/${purchaseId}`);
}

function downloadTextFile(fileName, mimeType, contents) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function handleCsvExport() {
  const fileName = `return-guardian-purchases-${toLocalDateString()}.csv`;
  const record = makeExportRecord("csv", data, fileName);
  downloadTextFile(fileName, "text/csv;charset=utf-8", createCsvExport(data.purchases));
  await saveExportRecord(record);
  notice = "CSV export generated locally.";
  await refresh();
}

async function handleJsonExport() {
  const fileName = `return-guardian-export-${toLocalDateString()}.json`;
  const record = makeExportRecord("json", data, fileName);
  downloadTextFile(fileName, "application/json;charset=utf-8", createJsonExport(data, record));
  await saveExportRecord(record);
  notice = "JSON export generated locally.";
  await refresh();
}

function handleSingleExport(purchaseId) {
  const purchase = data.purchases.find((item) => item.id === purchaseId);
  if (!purchase) return;
  downloadTextFile(
    `return-guardian-${purchase.id}-${toLocalDateString()}.json`,
    "application/json;charset=utf-8",
    JSON.stringify(
      {
        app: "return-guardian",
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        purchase,
      },
      null,
      2,
    ),
  );
}

async function hydrateAttachmentPreviews() {
  const previews = [...document.querySelectorAll(".js-attachment-preview")];
  for (const preview of previews) {
    const blob = await getAttachmentBlob(preview.dataset.blobKey);
    if (!blob) continue;
    const url = URL.createObjectURL(blob);
    objectUrls.push(url);
    const openLink = document.querySelector(`[data-blob-link="${CSS.escape(preview.dataset.blobKey)}"]`);
    if (openLink) openLink.href = url;

    if (preview.dataset.mimeType?.startsWith("image/")) {
      preview.innerHTML = `<img src="${url}" alt="Receipt attachment ${attr(preview.dataset.fileName)}" />`;
    }
  }
}

document.addEventListener("submit", (event) => {
  const form = event.target.closest("[data-purchase-form]");
  if (!form) return;
  event.preventDefault();
  void handlePurchaseSubmit(form);
});

document.addEventListener("change", (event) => {
  if (event.target.name !== "receiptFile") return;
  const file = event.target.files[0];
  const label = event.target.closest(".file-drop")?.querySelector("[data-file-label]");
  if (label && file) label.textContent = `${file.name} · ${formatFileSize(file.size)}`;
});

document.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-purchase]");
  const singleExportButton = event.target.closest("[data-export-single]");

  if (event.target.closest("[data-export-csv]")) {
    void handleCsvExport();
  }
  if (event.target.closest("[data-export-json]")) {
    void handleJsonExport();
  }
  if (singleExportButton) {
    handleSingleExport(singleExportButton.dataset.exportSingle);
  }
  if (deleteButton) {
    const purchase = data.purchases.find((item) => item.id === deleteButton.dataset.deletePurchase);
    if (!purchase) return;
    if (window.confirm(`Delete "${purchase.productName}"? This local record may not be recoverable unless exported.`)) {
      void deletePurchase(purchase.id).then(async () => {
        notice = "Purchase deleted.";
        await refresh();
        setHash("#/");
      });
    }
  }
  if (event.target.closest("[data-reset-samples]")) {
    void resetSampleData().then(async () => {
      notice = "Sample data reset.";
      await refresh();
    });
  }
  if (event.target.closest("[data-remove-samples]")) {
    void removeSampleData().then(async () => {
      notice = "Sample data removed.";
      await refresh();
    });
  }
});

window.addEventListener("hashchange", render);

app.innerHTML = `
  <div class="app-shell">
    <main class="main-shell">
      <section class="panel loading-panel" aria-busy="true">
        <span class="ui-icon" aria-hidden="true">◷</span>
        <p>Loading local purchase data...</p>
      </section>
    </main>
  </div>
`;

void refresh();


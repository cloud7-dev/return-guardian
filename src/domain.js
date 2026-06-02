export const APP_VERSION = "0.1.0";

const DAY_MS = 86_400_000;
const CSV_COLUMNS = [
  "id",
  "product_name",
  "merchant_name",
  "purchase_date",
  "amount",
  "currency",
  "return_deadline",
  "refund_deadline",
  "warranty_expires_on",
  "category",
  "tags",
  "notes",
  "receipt_count",
  "attachment_count",
  "next_deadline",
  "next_deadline_type",
  "status",
  "created_at",
  "updated_at",
];

export function uuid() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function pad2(value) {
  return String(value).padStart(2, "0");
}

export function toLocalDateString(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(dateString, days) {
  const date = parseLocalDate(dateString);
  date.setDate(date.getDate() + days);
  return toLocalDateString(date);
}

export function daysBetween(startDate, endDate) {
  return Math.round((parseLocalDate(endDate).getTime() - parseLocalDate(startDate).getTime()) / DAY_MS);
}

export function formatDisplayDate(dateString) {
  if (!dateString) return "Not set";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parseLocalDate(dateString));
}

export function formatRelativeDeadline(daysAway) {
  if (daysAway < 0) return `${Math.abs(daysAway)}d overdue`;
  if (daysAway === 0) return "Due today";
  if (daysAway === 1) return "Due tomorrow";
  return `${daysAway}d left`;
}

export function formatMoney(amountCents, currency) {
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amountCents / 100);
}

export function amountToCents(amount) {
  const parsed = Number.parseFloat(String(amount).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) return Number.NaN;
  return Math.round(parsed * 100);
}

export function formatFileSize(sizeBytes) {
  if (sizeBytes < 1024) return `${sizeBytes} B`;
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`;
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDeadlineLabel(kind) {
  switch (kind) {
    case "return-deadline":
      return "Return";
    case "refund-deadline":
      return "Refund";
    case "warranty-expiration":
      return "Warranty";
    case "receipt-missing":
      return "Receipt";
    default:
      return "Reminder";
  }
}

export function getPurchaseDeadlineEvents(purchase, today = toLocalDateString()) {
  const candidates = [
    { date: purchase.returnDeadline, kind: "return-deadline" },
    { date: purchase.refundDeadline, kind: "refund-deadline" },
    { date: purchase.warrantyExpiresOn, kind: "warranty-expiration" },
  ];

  return candidates.flatMap(({ date, kind }) => {
    if (!date) return [];
    const daysAway = daysBetween(today, date);
    return [
      {
        id: `${purchase.id}:${kind}:${date}`,
        purchaseId: purchase.id,
        productName: purchase.productName,
        merchantName: purchase.merchantName,
        amountCents: purchase.amountCents,
        currency: purchase.currency,
        date,
        kind,
        label: getDeadlineLabel(kind),
        daysAway,
        status: daysAway < 0 ? "overdue" : daysAway === 0 ? "today" : "upcoming",
        isSample: purchase.isSample,
        attachmentCount: purchase.attachmentIds.length,
      },
    ];
  });
}

export function buildDashboardGroups(purchases, today = toLocalDateString()) {
  const activePurchases = purchases.filter((purchase) => purchase.status === "active");
  const events = activePurchases
    .flatMap((purchase) => getPurchaseDeadlineEvents(purchase, today))
    .sort((a, b) => a.daysAway - b.daysAway || a.productName.localeCompare(b.productName));

  return {
    overdue: events.filter((event) => event.daysAway < 0),
    today: events.filter((event) => event.daysAway === 0),
    thisWeek: events.filter(
      (event) =>
        event.daysAway > 0 &&
        event.daysAway <= 7 &&
        (event.kind === "return-deadline" || event.kind === "refund-deadline"),
    ),
    warrantySoon: events.filter(
      (event) => event.daysAway >= 0 && event.daysAway <= 30 && event.kind === "warranty-expiration",
    ),
    activeReturnWindow: events.filter(
      (event) =>
        event.daysAway >= 0 &&
        (event.kind === "return-deadline" || event.kind === "refund-deadline"),
    ),
    noDeadline: activePurchases.filter(
      (purchase) => !purchase.returnDeadline && !purchase.refundDeadline && !purchase.warrantyExpiresOn,
    ),
  };
}

export function createRemindersForPurchase(purchase, now = new Date().toISOString()) {
  const reminders = [];

  if (purchase.returnDeadline) {
    reminders.push({
      id: `${purchase.id}:return-deadline`,
      schemaVersion: 1,
      purchaseId: purchase.id,
      kind: "return-deadline",
      title: "Return window closes",
      dueDate: purchase.returnDeadline,
      leadDays: 7,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  if (purchase.refundDeadline) {
    reminders.push({
      id: `${purchase.id}:refund-deadline`,
      schemaVersion: 1,
      purchaseId: purchase.id,
      kind: "refund-deadline",
      title: "Refund period closes",
      dueDate: purchase.refundDeadline,
      leadDays: 7,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  if (purchase.warrantyExpiresOn) {
    reminders.push({
      id: `${purchase.id}:warranty-expiration`,
      schemaVersion: 1,
      purchaseId: purchase.id,
      kind: "warranty-expiration",
      title: "Warranty expires",
      dueDate: purchase.warrantyExpiresOn,
      leadDays: 30,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  }

  return reminders;
}

export function createSampleData(today = toLocalDateString(), now = new Date().toISOString()) {
  const backpack = {
    id: "sample-backpack",
    schemaVersion: 1,
    productName: "Travel Laptop Backpack",
    merchantName: "REI",
    purchaseDate: addDays(today, -1),
    amountCents: 12900,
    currency: "USD",
    returnDeadline: today,
    category: "Travel",
    tags: ["sample"],
    notes: "Decide today whether the laptop compartment is large enough.",
    receiptIds: ["sample-receipt-backpack"],
    attachmentIds: [],
    reminderIds: ["sample-backpack:return-deadline"],
    status: "active",
    isSample: true,
    createdAt: now,
    updatedAt: now,
  };

  const headphones = {
    id: "sample-headphones",
    schemaVersion: 1,
    productName: "Wireless Noise Canceling Headphones",
    merchantName: "Best Buy",
    purchaseDate: addDays(today, -4),
    amountCents: 24999,
    currency: "USD",
    returnDeadline: addDays(today, 3),
    warrantyExpiresOn: addDays(today, 365),
    category: "Electronics",
    tags: ["audio", "sample"],
    notes: "Check fit and Bluetooth behavior before the return window closes.",
    receiptIds: ["sample-receipt-headphones"],
    attachmentIds: ["sample-attachment-headphones"],
    reminderIds: ["sample-headphones:return-deadline", "sample-headphones:warranty-expiration"],
    status: "active",
    isSample: true,
    createdAt: now,
    updatedAt: now,
  };

  const coffeeMaker = {
    id: "sample-coffee-maker",
    schemaVersion: 1,
    productName: "Compact Coffee Maker",
    merchantName: "Target",
    purchaseDate: addDays(today, -330),
    amountCents: 8999,
    currency: "USD",
    returnDeadline: addDays(today, -300),
    warrantyExpiresOn: addDays(today, 18),
    category: "Kitchen",
    tags: ["appliance", "sample"],
    notes: "Warranty expires soon. Keep receipt ready before calling support.",
    receiptIds: [],
    attachmentIds: [],
    reminderIds: ["sample-coffee-maker:warranty-expiration"],
    status: "active",
    isSample: true,
    createdAt: now,
    updatedAt: now,
  };

  const deskLamp = {
    id: "sample-desk-lamp",
    schemaVersion: 1,
    productName: "LED Desk Lamp",
    merchantName: "IKEA",
    purchaseDate: addDays(today, -12),
    amountCents: 3499,
    currency: "USD",
    category: "Home Office",
    tags: ["sample"],
    notes: "No deadline entered yet.",
    receiptIds: [],
    attachmentIds: [],
    reminderIds: [],
    status: "active",
    isSample: true,
    createdAt: now,
    updatedAt: now,
  };

  return {
    purchases: [backpack, headphones, coffeeMaker, deskLamp],
    receipts: [
      {
        id: "sample-receipt-headphones",
        schemaVersion: 1,
        purchaseId: "sample-headphones",
        merchantName: "Best Buy",
        receiptDate: headphones.purchaseDate,
        totalAmountCents: headphones.amountCents,
        currency: "USD",
        attachmentId: "sample-attachment-headphones",
        source: "sample",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "sample-receipt-backpack",
        schemaVersion: 1,
        purchaseId: "sample-backpack",
        merchantName: "REI",
        receiptDate: backpack.purchaseDate,
        totalAmountCents: backpack.amountCents,
        currency: "USD",
        source: "sample",
        createdAt: now,
        updatedAt: now,
      },
    ],
    attachments: [
      {
        id: "sample-attachment-headphones",
        schemaVersion: 1,
        purchaseId: "sample-headphones",
        receiptId: "sample-receipt-headphones",
        kind: "receipt-pdf",
        fileName: "sample-headphones-receipt.pdf",
        mimeType: "application/pdf",
        sizeBytes: 180000,
        blobKey: "sample/blob/headphones-receipt",
        createdAt: now,
      },
    ],
    reminders: [
      ...createRemindersForPurchase(backpack, now),
      ...createRemindersForPurchase(headphones, now),
      ...createRemindersForPurchase(coffeeMaker, now),
    ],
  };
}

function csvEscape(value) {
  const text = value === undefined || value === null ? "" : String(value);
  if (/[",\n;]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

export function nextDeadlineFor(purchase, today = toLocalDateString()) {
  const upcoming = getPurchaseDeadlineEvents(purchase, today)
    .filter((event) => event.daysAway >= 0)
    .sort((a, b) => a.daysAway - b.daysAway)[0];
  return upcoming ? { date: upcoming.date, type: upcoming.kind } : { date: "", type: "" };
}

export function createCsvExport(purchases, today = toLocalDateString()) {
  const rows = purchases.map((purchase) => {
    const nextDeadline = nextDeadlineFor(purchase, today);
    return [
      purchase.id,
      purchase.productName,
      purchase.merchantName,
      purchase.purchaseDate,
      (purchase.amountCents / 100).toFixed(2),
      purchase.currency,
      purchase.returnDeadline,
      purchase.refundDeadline,
      purchase.warrantyExpiresOn,
      purchase.category,
      purchase.tags.join(";"),
      purchase.notes,
      purchase.receiptIds.length,
      purchase.attachmentIds.length,
      nextDeadline.date,
      nextDeadline.type,
      purchase.status,
      purchase.createdAt,
      purchase.updatedAt,
    ].map(csvEscape);
  });

  return [CSV_COLUMNS, ...rows].map((row) => row.join(",")).join("\n");
}

export function makeExportRecord(format, data, fileName) {
  return {
    id: uuid(),
    schemaVersion: 1,
    format,
    appVersion: APP_VERSION,
    exportedAt: new Date().toISOString(),
    purchaseCount: data.purchases.length,
    receiptCount: data.receipts.length,
    attachmentMetadataCount: data.attachments.length,
    reminderCount: data.reminders.length,
    includesAttachmentFiles: false,
    fileName,
  };
}

export function createJsonExport(data, exportRecord) {
  return JSON.stringify(
    {
      app: "return-guardian",
      schemaVersion: 1,
      exportedAt: exportRecord.exportedAt,
      includesAttachmentFiles: false,
      purchases: data.purchases,
      receipts: data.receipts,
      attachments: data.attachments,
      reminders: data.reminders,
      exports: [exportRecord],
    },
    null,
    2,
  );
}

export function samplePdfBlob() {
  return new Blob(
    [
      "%PDF-1.4\n",
      "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n",
      "2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n",
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 180]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj\n",
      "4 0 obj<</Length 116>>stream\n",
      "BT /F1 14 Tf 24 132 Td (Return Guardian sample receipt) Tj 0 -24 Td (Wireless Headphones - Best Buy) Tj 0 -24 Td (Sample data only) Tj ET\n",
      "endstream endobj\n",
      "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj\n",
      "trailer<</Root 1 0 R/Size 6>>\n%%EOF\n",
    ],
    { type: "application/pdf" },
  );
}


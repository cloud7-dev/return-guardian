import { createRemindersForPurchase, createSampleData, samplePdfBlob } from "./domain.js";

const DB_NAME = "return-guardian";
const DB_VERSION = 1;
let dbPromise;

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });
}

function txDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener("complete", () => resolve());
    transaction.addEventListener("error", () => reject(transaction.error));
    transaction.addEventListener("abort", () => reject(transaction.error));
  });
}

function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.addEventListener("upgradeneeded", () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("purchases")) {
        const store = db.createObjectStore("purchases", { keyPath: "id" });
        store.createIndex("status", "status");
        store.createIndex("purchaseDate", "purchaseDate");
      }
      if (!db.objectStoreNames.contains("receipts")) {
        const store = db.createObjectStore("receipts", { keyPath: "id" });
        store.createIndex("purchaseId", "purchaseId");
      }
      if (!db.objectStoreNames.contains("attachments")) {
        const store = db.createObjectStore("attachments", { keyPath: "id" });
        store.createIndex("purchaseId", "purchaseId");
      }
      if (!db.objectStoreNames.contains("attachmentBlobs")) {
        db.createObjectStore("attachmentBlobs", { keyPath: "blobKey" });
      }
      if (!db.objectStoreNames.contains("reminders")) {
        const store = db.createObjectStore("reminders", { keyPath: "id" });
        store.createIndex("purchaseId", "purchaseId");
        store.createIndex("dueDate", "dueDate");
        store.createIndex("status", "status");
      }
      if (!db.objectStoreNames.contains("exports")) {
        db.createObjectStore("exports", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("settings")) {
        db.createObjectStore("settings", { keyPath: "key" });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error));
  });

  return dbPromise;
}

async function getAll(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName);
  return requestToPromise(tx.objectStore(storeName).getAll());
}

async function getByKey(storeName, key) {
  const db = await openDb();
  const tx = db.transaction(storeName);
  return requestToPromise(tx.objectStore(storeName).get(key));
}

export async function loadAppData() {
  const [purchases, receipts, attachments, reminders] = await Promise.all([
    getAll("purchases"),
    getAll("receipts"),
    getAll("attachments"),
    getAll("reminders"),
  ]);

  return {
    purchases: purchases.sort((a, b) => b.purchaseDate.localeCompare(a.purchaseDate)),
    receipts,
    attachments,
    reminders,
  };
}

export async function seedSampleDataOnce() {
  const setting = await getByKey("settings", "sampleDataSeededAt");
  if (setting) return false;

  const sampleData = createSampleData();
  const db = await openDb();
  const tx = db.transaction(
    ["purchases", "receipts", "attachments", "attachmentBlobs", "reminders", "settings"],
    "readwrite",
  );

  sampleData.purchases.forEach((record) => tx.objectStore("purchases").put(record));
  sampleData.receipts.forEach((record) => tx.objectStore("receipts").put(record));
  sampleData.attachments.forEach((record) => tx.objectStore("attachments").put(record));
  sampleData.reminders.forEach((record) => tx.objectStore("reminders").put(record));
  tx.objectStore("attachmentBlobs").put({
    blobKey: "sample/blob/headphones-receipt",
    blob: samplePdfBlob(),
  });
  tx.objectStore("settings").put({ key: "sampleDataSeededAt", value: new Date().toISOString() });

  await txDone(tx);
  return true;
}

export async function resetSampleData() {
  await removeSampleData({ markSeeded: false });
  await seedSampleDataOnce();
}

export async function removeSampleData({ markSeeded = true } = {}) {
  const db = await openDb();
  const data = await loadAppData();
  const sampleIds = new Set(data.purchases.filter((purchase) => purchase.isSample).map((purchase) => purchase.id));
  const tx = db.transaction(
    ["purchases", "receipts", "attachments", "attachmentBlobs", "reminders", "settings"],
    "readwrite",
  );

  data.purchases
    .filter((purchase) => purchase.isSample)
    .forEach((purchase) => tx.objectStore("purchases").delete(purchase.id));
  data.receipts
    .filter((receipt) => sampleIds.has(receipt.purchaseId))
    .forEach((receipt) => tx.objectStore("receipts").delete(receipt.id));
  data.attachments
    .filter((attachment) => sampleIds.has(attachment.purchaseId))
    .forEach((attachment) => {
      tx.objectStore("attachments").delete(attachment.id);
      tx.objectStore("attachmentBlobs").delete(attachment.blobKey);
    });
  data.reminders
    .filter((reminder) => sampleIds.has(reminder.purchaseId))
    .forEach((reminder) => tx.objectStore("reminders").delete(reminder.id));

  if (markSeeded) {
    tx.objectStore("settings").put({ key: "sampleDataSeededAt", value: new Date().toISOString() });
  } else {
    tx.objectStore("settings").delete("sampleDataSeededAt");
  }

  await txDone(tx);
}

export async function savePurchase({ purchase, receipt, attachment, attachmentFile }) {
  const now = new Date().toISOString();
  const reminders = createRemindersForPurchase(purchase, now);
  const record = { ...purchase, reminderIds: reminders.map((reminder) => reminder.id), updatedAt: now };
  const db = await openDb();
  const tx = db.transaction(["purchases", "receipts", "attachments", "attachmentBlobs", "reminders"], "readwrite");

  tx.objectStore("purchases").put(record);
  reminders.forEach((reminder) => tx.objectStore("reminders").put(reminder));
  if (receipt) tx.objectStore("receipts").put(receipt);
  if (attachment && attachmentFile) {
    tx.objectStore("attachments").put(attachment);
    tx.objectStore("attachmentBlobs").put({ blobKey: attachment.blobKey, blob: attachmentFile });
  }

  await txDone(tx);
}

export async function updatePurchase({ purchase, receipt, attachment, attachmentFile }) {
  const data = await loadAppData();
  const db = await openDb();
  const now = new Date().toISOString();
  const reminders = createRemindersForPurchase(purchase, now);
  const record = { ...purchase, reminderIds: reminders.map((reminder) => reminder.id), updatedAt: now };
  const tx = db.transaction(["purchases", "receipts", "attachments", "attachmentBlobs", "reminders"], "readwrite");

  tx.objectStore("purchases").put(record);
  data.reminders
    .filter((reminder) => reminder.purchaseId === purchase.id)
    .forEach((reminder) => tx.objectStore("reminders").delete(reminder.id));
  reminders.forEach((reminder) => tx.objectStore("reminders").put(reminder));
  if (receipt) tx.objectStore("receipts").put(receipt);
  if (attachment && attachmentFile) {
    tx.objectStore("attachments").put(attachment);
    tx.objectStore("attachmentBlobs").put({ blobKey: attachment.blobKey, blob: attachmentFile });
  }

  await txDone(tx);
}

export async function deletePurchase(id) {
  const data = await loadAppData();
  const db = await openDb();
  const tx = db.transaction(["purchases", "receipts", "attachments", "attachmentBlobs", "reminders"], "readwrite");

  tx.objectStore("purchases").delete(id);
  data.receipts
    .filter((receipt) => receipt.purchaseId === id)
    .forEach((receipt) => tx.objectStore("receipts").delete(receipt.id));
  data.attachments
    .filter((attachment) => attachment.purchaseId === id)
    .forEach((attachment) => {
      tx.objectStore("attachments").delete(attachment.id);
      tx.objectStore("attachmentBlobs").delete(attachment.blobKey);
    });
  data.reminders
    .filter((reminder) => reminder.purchaseId === id)
    .forEach((reminder) => tx.objectStore("reminders").delete(reminder.id));

  await txDone(tx);
}

export async function getAttachmentBlob(blobKey) {
  const record = await getByKey("attachmentBlobs", blobKey);
  return record?.blob;
}

export async function saveExportRecord(record) {
  const db = await openDb();
  const tx = db.transaction("exports", "readwrite");
  tx.objectStore("exports").put(record);
  await txDone(tx);
}


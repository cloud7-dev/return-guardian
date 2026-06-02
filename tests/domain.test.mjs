import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addDays,
  buildDashboardGroups,
  createCsvExport,
  createJsonExport,
  daysBetween,
  makeExportRecord,
} from "../src/domain.js";

function purchase(overrides = {}) {
  return {
    id: "p1",
    schemaVersion: 1,
    productName: "Test product",
    merchantName: "Test merchant",
    purchaseDate: "2026-06-01",
    amountCents: 1000,
    currency: "USD",
    tags: [],
    receiptIds: [],
    attachmentIds: [],
    reminderIds: [],
    status: "active",
    isSample: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("date and dashboard logic", () => {
  it("adds days and compares date-only values without timezone drift", () => {
    assert.equal(addDays("2026-06-01", 7), "2026-06-08");
    assert.equal(daysBetween("2026-06-01", "2026-06-08"), 7);
  });

  it("groups return deadlines for today and this week", () => {
    const groups = buildDashboardGroups(
      [
        purchase({ id: "today", returnDeadline: "2026-06-02" }),
        purchase({ id: "week", returnDeadline: "2026-06-05" }),
        purchase({ id: "later", returnDeadline: "2026-06-12" }),
      ],
      "2026-06-02",
    );

    assert.equal(groups.today.length, 1);
    assert.deepEqual(
      groups.thisWeek.map((event) => event.purchaseId),
      ["week"],
    );
  });

  it("groups warranty deadlines within 30 days", () => {
    const groups = buildDashboardGroups(
      [
        purchase({ id: "soon", warrantyExpiresOn: "2026-06-30" }),
        purchase({ id: "later", warrantyExpiresOn: "2026-07-05" }),
      ],
      "2026-06-02",
    );

    assert.deepEqual(
      groups.warrantySoon.map((event) => event.purchaseId),
      ["soon"],
    );
  });
});

describe("export logic", () => {
  it("creates escaped CSV rows", () => {
    const csv = createCsvExport(
      [
        purchase({
          productName: 'Mixer, "Pro"',
          amountCents: 12999,
          notes: "Keep receipt\nfor return.",
          returnDeadline: "2026-06-08",
          tags: ["appliance", "gift"],
          receiptIds: ["r1"],
          attachmentIds: ["a1"],
        }),
      ],
      "2026-06-02",
    );

    assert.match(csv, /product_name/);
    assert.match(csv, /"Mixer, ""Pro"""/);
    assert.match(csv, /"Keep receipt\nfor return\."/);
    assert.match(csv, /129\.99/);
  });

  it("creates JSON without binary attachment files", () => {
    const data = {
      purchases: [purchase()],
      receipts: [],
      attachments: [],
      reminders: [],
    };
    const record = makeExportRecord("json", data, "return-guardian-export-2026-06-02.json");
    const parsed = JSON.parse(createJsonExport(data, record));

    assert.equal(parsed.includesAttachmentFiles, false);
    assert.equal(parsed.purchases[0].id, "p1");
    assert.equal(parsed.exports[0].fileName, "return-guardian-export-2026-06-02.json");
  });
});


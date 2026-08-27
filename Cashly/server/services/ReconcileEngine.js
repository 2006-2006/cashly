/**
 * ReconcileEngine.js  —  v2 (Sales ↔ Receivables matching)
 *
 * WHAT WE MATCH
 * ─────────────
 *   paymentReceipts  (sales records)   ←→  invoiceRegister (receivables)
 *
 *   A sale record   = money received from a customer
 *   A receivable    = an invoice issued to that same customer that is/was outstanding
 *
 *   Matching them answers: "Which of our outstanding invoices have been paid?"
 *
 * THREE PASSES (progressively relaxed)
 * ─────────────────────────────────────
 *   Pass 1 — Exact Customer Name + Amount ≤1%
 *     payer (from sale.customer) === customer_name (from receivable)
 *     AND |saleAmt − invoiceAmt| / invoiceAmt ≤ 1%
 *     Confidence: HIGH
 *
 *   Pass 2 — Amount ≤5% + Date within 7 days
 *     |saleAmt − invoiceAmt| / invoiceAmt ≤ 5%
 *     AND |daysDiff(saleDate, invoiceDate)| ≤ 7
 *     Confidence: MEDIUM
 *
 *   Pass 3 — Partial Customer Name Match + Amount ≤10%
 *     partialNameMatch(payer, customer_name)
 *     AND |saleAmt − invoiceAmt| / invoiceAmt ≤ 10%
 *     Confidence: LOW
 *
 * EXCEPTIONS
 * ──────────
 *   UNPAID_INVOICE   — receivable has no matched sale (invoice not yet collected)
 *   UNLINKED_RECEIPT — sale has no matched invoice (payment received, no invoice on file)
 *   AMT_MISMATCH     — related record found but amount delta exceeds tolerance
 *   DATE_OUT_OF_WINDOW — name matches but date is outside reconciliation window
 */

const crypto = require('crypto');

// ─── String / Date Utilities ──────────────────────────────────────────────────

/** Normalise a name: lowercase, collapse whitespace, strip punctuation */
function normName(s) {
    if (!s) return '';
    return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

/** True if the two name strings are equal after normalisation */
function exactNameMatch(a, b) {
    const na = normName(a), nb = normName(b);
    if (!na || !nb) return false;
    return na === nb;
}

/** True if names share at least one meaningful word (≥3 chars), or one contains the other */
function partialNameMatch(a, b) {
    const na = normName(a), nb = normName(b);
    if (!na || !nb) return false;
    if (na === nb) return true;
    if (na.includes(nb) || nb.includes(na)) return true;
    const wordsA = na.split(' ').filter(w => w.length >= 3);
    const setB   = new Set(nb.split(' ').filter(w => w.length >= 3));
    return wordsA.some(w => setB.has(w));
}

/** Absolute day difference between two date strings */
function dayDiff(dateA, dateB) {
    const a = new Date(dateA), b = new Date(dateB);
    if (isNaN(a) || isNaN(b)) return 9999;
    return Math.abs(a - b) / 86_400_000;
}

/** Amount delta as a fraction of the larger value (avoids div-by-zero) */
function amtDeltaPct(a, b) {
    const denom = Math.max(Math.abs(a), Math.abs(b), 0.01);
    return Math.abs(a - b) / denom;
}

function fmt(n) { return Math.round(n * 100) / 100; }

// ─── Core Engine ──────────────────────────────────────────────────────────────

class ReconcileEngine {
    /**
     * @param {object} opts
     * @param {number} [opts.amtTolerancePct=0.01]  Pass-1 amount tolerance  (1%)
     * @param {number} [opts.dateWindowDays=7]       Pass-2 date window       (7 days)
     * @param {number} [opts.fuzzyAmtPct=0.10]       Pass-3 amount tolerance  (10%)
     */
    constructor({
        amtTolerancePct = 0.01,
        dateWindowDays  = 7,
        fuzzyAmtPct     = 0.10,
    } = {}) {
        this.amtTolerancePct = amtTolerancePct;
        this.dateWindowDays  = dateWindowDays;
        this.fuzzyAmtPct     = fuzzyAmtPct;
    }

    /**
     * Run reconciliation.
     * @param {object} dataset  { bankLedger, invoiceRegister, paymentReceipts }
     *   bankLedger       — expenses  (included in totals, not in matching)
     *   invoiceRegister  — receivables (outstanding invoices — the "invoice" side)
     *   paymentReceipts  — sales      (money received    — the "payment" side)
     */
    run(dataset) {
        const { bankLedger = [], invoiceRegister = [], paymentReceipts = [] } = dataset;

        const runId     = crypto.randomBytes(6).toString('hex');
        const startedAt = Date.now();

        // Working maps — entries are deleted once matched to prevent double-counting
        const unmatchedInvoices = new Map(invoiceRegister.map(inv => [inv.id, inv]));

        const matched    = [];
        const exceptions = [];
        const passStats  = [];

        // Sales are the primary iteration set
        let pendingReceipts = [...paymentReceipts];

        // ── Pass 1: Exact Customer Name + Amount ≤1% ─────────────────────────
        const p1Start = Date.now();
        const afterP1 = [];

        for (const pay of pendingReceipts) {
            let found = null;
            for (const [, inv] of unmatchedInvoices) {
                if (exactNameMatch(pay.payer, inv.vendor) &&
                    amtDeltaPct(pay.amount, inv.amount) <= this.amtTolerancePct) {
                    found = inv; break;
                }
            }
            if (found) {
                matched.push(buildMatch(matched.length, 1, 'HIGH', pay, found,
                    'Exact customer name + amount match'));
                unmatchedInvoices.delete(found.id);
            } else {
                afterP1.push(pay);
            }
        }

        passStats.push(buildPassStat(1, 'Exact Reference Match',
            pendingReceipts.length, pendingReceipts.length - afterP1.length,
            afterP1.length, Date.now() - p1Start));
        pendingReceipts = afterP1;

        // ── Pass 2: Amount ≤5% + Date ≤7 days ────────────────────────────────
        const p2Start = Date.now();
        const afterP2 = [];

        for (const pay of pendingReceipts) {
            let found = null;
            for (const [, inv] of unmatchedInvoices) {
                if (amtDeltaPct(pay.amount, inv.amount) <= 0.05 &&
                    dayDiff(pay.date, inv.date) <= this.dateWindowDays) {
                    found = inv; break;
                }
            }
            if (found) {
                matched.push(buildMatch(matched.length, 2, 'MEDIUM', pay, found,
                    'Amount + date window match'));
                unmatchedInvoices.delete(found.id);
            } else {
                afterP2.push(pay);
            }
        }

        passStats.push(buildPassStat(2, 'Amount + Date Window',
            pendingReceipts.length, pendingReceipts.length - afterP2.length,
            afterP2.length, Date.now() - p2Start));
        pendingReceipts = afterP2;

        // ── Pass 3: Fuzzy Name + Amount ≤10% ─────────────────────────────────
        const p3Start = Date.now();
        const afterP3 = [];

        for (const pay of pendingReceipts) {
            let found = null, bestAmt = Infinity;
            for (const [, inv] of unmatchedInvoices) {
                const delta = amtDeltaPct(pay.amount, inv.amount);
                if (partialNameMatch(pay.payer, inv.vendor) &&
                    delta <= this.fuzzyAmtPct && delta < bestAmt) {
                    bestAmt = delta; found = inv;
                }
            }
            if (found) {
                matched.push(buildMatch(matched.length, 3, 'LOW', pay, found,
                    `Fuzzy name match (amt-delta=${(bestAmt * 100).toFixed(1)}%)`));
                unmatchedInvoices.delete(found.id);
            } else {
                afterP3.push(pay);
            }
        }

        passStats.push(buildPassStat(3, 'Fuzzy Amount Tolerance',
            pendingReceipts.length, pendingReceipts.length - afterP3.length,
            afterP3.length, Date.now() - p3Start));

        // ── Exceptions ────────────────────────────────────────────────────────

        // Sales that couldn't be matched to any invoice
        for (const pay of afterP3) {
            const rc = deriveReceiptReasonCode(pay, invoiceRegister);
            exceptions.push({
                exceptionId:  `EX-${exceptions.length + 1}`,
                sourceId:     pay.id,
                sourceType:   'payment_receipt',
                date:         pay.date,
                amount:       pay.amount,
                reference:    pay.memo || pay.id,
                counterparty: pay.payer,
                reasonCode:   rc,
                description:  reasonCodeDescription(rc),
            });
        }

        // Receivables that were never matched to any sale
        for (const [, inv] of unmatchedInvoices) {
            const rc = deriveInvoiceReasonCode(inv, paymentReceipts);
            exceptions.push({
                exceptionId:  `EX-${exceptions.length + 1}`,
                sourceId:     inv.id,
                sourceType:   'invoice',
                date:         inv.date,
                amount:       inv.amount,
                reference:    inv.refCode || inv.id,
                counterparty: inv.vendor,
                reasonCode:   rc,
                description:  reasonCodeDescription(rc),
            });
        }

        // ── Summary ───────────────────────────────────────────────────────────
        const totalPayments = paymentReceipts.length;
        const totalMatched  = matched.length;
        const matchRate     = totalPayments > 0
            ? fmt((totalMatched / totalPayments) * 100) : 0;

        return {
            runId,
            completedAt: new Date().toISOString(),
            durationMs:  Date.now() - startedAt,
            summary: {
                totalRecords:     bankLedger.length + invoiceRegister.length + paymentReceipts.length,
                bankEntries:      paymentReceipts.length,   // primary set (sales / receipts)
                invoiceEntries:   invoiceRegister.length,   // outstanding invoices
                paymentEntries:   bankLedger.length,        // expense ledger
                totalMatched,
                totalExceptions:  exceptions.length,
                matchRate,
                matchRateFraction: fmt(totalMatched / Math.max(totalPayments, 1)),
            },
            passes:     passStats,
            matched,
            exceptions,
        };
    }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildMatch(matchedLen, pass, confidence, pay, inv, reason) {
    return {
        matchId:    `M-${matchedLen + 1}`,
        pass,
        confidence,
        bank:       pay,    // the incoming payment (sale record)
        invoice:    inv,    // the matched receivable
        payment:    null,
        reason,
        amtDelta:   fmt(Math.abs(pay.amount - inv.amount)),
        dayDelta:   fmt(dayDiff(pay.date, inv.date)),
    };
}

function buildPassStat(pass, name, processed, matchedCount, excCount, durationMs) {
    return { pass, name, processed, matched: matchedCount, exceptions: excCount, durationMs };
}

function deriveReceiptReasonCode(pay, allInvoices) {
    for (const inv of allInvoices) {
        if (amtDeltaPct(pay.amount, inv.amount) <= 0.05) return 'AMT_MISMATCH';
    }
    for (const inv of allInvoices) {
        if (partialNameMatch(pay.payer, inv.vendor) &&
            dayDiff(pay.date, inv.date) > 7) return 'DATE_OUT_OF_WINDOW';
    }
    return 'UNLINKED_RECEIPT';
}

function deriveInvoiceReasonCode(inv, allSales) {
    for (const pay of allSales) {
        if (amtDeltaPct(pay.amount, inv.amount) <= 0.05) return 'AMT_MISMATCH';
    }
    return 'UNPAID_INVOICE';
}

function reasonCodeDescription(code) {
    const map = {
        UNPAID_INVOICE:         'No payment receipt found — this invoice has not been reconciled to any incoming payment',
        UNLINKED_RECEIPT:       'Payment received but no matching invoice exists on record',
        AMT_MISMATCH:           'A related record exists but the amount difference exceeds the tolerance threshold',
        DATE_OUT_OF_WINDOW:     'Customer name matches but payment date falls outside the reconciliation window',
        // Legacy codes for backward compatibility
        REF_MISMATCH:           'Bank reference does not match any invoice reference code',
        AMT_TOLERANCE_EXCEEDED: 'Amount delta exceeds tolerance threshold',
        NO_COUNTERPART:         'No corresponding bank entry found for this invoice',
        DUPLICATE_CANDIDATE:    'Multiple entries reference the same invoice',
        MISSING_MEMO:           'Payment receipt has an empty memo field',
    };
    return map[code] || 'Unreconciled entry — requires manual review';
}

module.exports = { ReconcileEngine };

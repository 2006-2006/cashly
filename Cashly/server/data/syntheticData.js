/**
 * syntheticData.js
 * Deterministic 60-record generator for the Finance-Ops Reconciliation Agent.
 * Produces 3 source tables (20 records each):
 *   - Bank Ledger       (bankLedger)
 *   - Invoice Register  (invoiceRegister)
 *   - Payment Receipts  (paymentReceipts)
 *
 * Design: ~72% of records have a natural counterpart across sources.
 * The remainder are intentional exceptions (duplicates, missing refs,
 * amount mismatches, date outliers) to produce an honest exception list.
 */

// ─── Tiny deterministic PRNG (mulberry32) ───────────────────────────────────
function makePRNG(seed) {
    let s = seed >>> 0;
    return () => {
        s += 0x6D2B79F5;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const rand = makePRNG(0xCAFEBABE);

// ─── Helpers ─────────────────────────────────────────────────────────────────
const addDays = (baseDate, n) => {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + n);
    return d.toISOString().split('T')[0];
};

const BASE_DATE = '2026-01-01';

const VENDORS = [
    'Apex Supplies Ltd', 'BlueStar Logistics', 'CoreTech Solutions',
    'Delta Freight Co', 'Ember Marketing', 'FusionPay Inc',
    'GreenLeaf Consulting', 'HorizonWorks', 'Ironclad Services', 'Jetstream Corp'
];

const fmt = (n) => Math.round(n * 100) / 100;

// Generate a ref code in format "INV-YYYYMMDD-NNN"
const refCode = (date, n) => `INV-${date.replace(/-/g, '')}-${String(n).padStart(3, '0')}`;

// Slight fuzzy variant of a ref (swap two chars) for Pass-3 testing
const fuzzyRef = (ref) => {
    const arr = ref.split('');
    const i = arr.length - 3;
    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
    return arr.join('');
};

// ─── Record Factories ─────────────────────────────────────────────────────────

/**
 * Build the 20 Bank Ledger entries.
 * IDs: BNK-001 … BNK-020
 */
function buildBankLedger() {
    const entries = [];
    for (let i = 1; i <= 20; i++) {
        const dayOffset = Math.floor(rand() * 90);          // spread over Q1
        const date = addDays(BASE_DATE, dayOffset);
        const baseAmt = fmt(500 + rand() * 9500);           // ₹500–₹10,000
        const vendor = VENDORS[Math.floor(rand() * VENDORS.length)];
        const ref = refCode(date, i);

        // Records 17-20 are intentional exceptions
        let amount = baseAmt;
        let reference = ref;

        if (i === 17) reference = `GARBAGE-${i}`;          // REF_MISMATCH
        if (i === 18) amount = fmt(baseAmt * 1.25);         // AMT_TOLERANCE_EXCEEDED
        if (i === 19) reference = fuzzyRef(ref);            // fuzzy — may match in Pass 3
        if (i === 20) reference = refCode(addDays(BASE_DATE, dayOffset + 45), i); // DATE_OUT_OF_WINDOW

        entries.push({
            id: `BNK-${String(i).padStart(3, '0')}`,
            type: 'bank_ledger',
            date,
            amount,
            counterparty: vendor,
            reference,
            rawRef: ref,         // original ref, kept for engine use
            description: `Payment to ${vendor}`,
        });
    }
    return entries;
}

/**
 * Build the 20 Invoice Register records.
 * IDs: INV-001 … INV-020
 */
function buildInvoiceRegister(bankLedger) {
    const entries = [];
    for (let i = 1; i <= 20; i++) {
        const bankEntry = bankLedger[i - 1];

        // Records 1–16 mirror corresponding bank entries (matchable)
        // Records 17–20 are orphans / mismatches
        let date = bankEntry.date;
        let amount = bankEntry.amount;
        let vendor = bankEntry.counterparty;
        let ref = bankEntry.rawRef;
        let status = 'unpaid';

        if (i === 17) {
            // Orphan invoice — no bank entry will match
            date = addDays(BASE_DATE, 10);
            amount = fmt(1200 + rand() * 3000);
            vendor = VENDORS[3];
            ref = refCode(date, 100 + i);
            status = 'unpaid';
        }
        if (i === 18) {
            // Amount mismatch — bank paid 25% more
            ref = bankEntry.rawRef;
            amount = bankEntry.amount / 1.25;  // invoice has lower amount
        }
        if (i === 19) {
            // Fuzzy ref — slightly different ref from bank
            ref = bankEntry.rawRef;             // exact on invoice side
        }
        if (i === 20) {
            // Date outlier — invoice date 45 days before bank date
            date = bankEntry.date;
            ref = bankEntry.rawRef;
            amount = bankEntry.amount;
        }

        entries.push({
            id: `INV-${String(i).padStart(3, '0')}`,
            type: 'invoice',
            date,
            amount: fmt(amount),
            vendor,
            refCode: ref,
            status,
            dueDate: addDays(date, 30),
        });
    }
    return entries;
}

/**
 * Build the 20 Payment Receipts.
 * IDs: PAY-001 … PAY-020
 */
function buildPaymentReceipts(bankLedger) {
    const entries = [];
    for (let i = 1; i <= 20; i++) {
        const bankEntry = bankLedger[i - 1];

        let date = addDays(bankEntry.date, Math.floor(rand() * 3));   // ±0-2 days
        let amount = bankEntry.amount;
        let payer = bankEntry.counterparty;
        let memo = bankEntry.reference;

        // Records 15–20: introduce exceptions
        if (i === 15) memo = '';                                    // missing memo
        if (i === 16) amount = fmt(amount * 0.99);                  // 1% short-pay (within tolerance)
        if (i === 17) memo = `DUPLICATE-${bankEntry.reference}`;    // duplicate candidate
        if (i === 18) amount = fmt(amount * 1.30);                  // way over (exception)
        if (i === 19) memo = fuzzyRef(bankEntry.reference);         // fuzzy memo
        if (i === 20) date = addDays(bankEntry.date, 50);           // way outside date window

        entries.push({
            id: `PAY-${String(i).padStart(3, '0')}`,
            type: 'payment_receipt',
            date,
            amount: fmt(amount),
            payer,
            memo,
            channel: ['NEFT', 'RTGS', 'UPI', 'IMPS'][Math.floor(rand() * 4)],
        });
    }
    return entries;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the full synthetic dataset.
 * @returns {{ bankLedger: [], invoiceRegister: [], paymentReceipts: [], meta: {} }}
 */
function generateSyntheticData() {
    // Reset PRNG for determinism on every call
    const rng = makePRNG(0xCAFEBABE);
    // Re-run generators with fresh PRNG (override module-level rand)
    // We re-instantiate inline to keep the output deterministic regardless of call order.
    const freshRand = makePRNG(0xCAFEBABE);
    const _addDays = addDays;

    // Rebuild with a closure over freshRand
    const bankLedger = (() => {
        const entries = [];
        for (let i = 1; i <= 20; i++) {
            const dayOffset = Math.floor(freshRand() * 90);
            const date = _addDays(BASE_DATE, dayOffset);
            const baseAmt = fmt(500 + freshRand() * 9500);
            const vendor = VENDORS[Math.floor(freshRand() * VENDORS.length)];
            const ref = refCode(date, i);
            let amount = baseAmt;
            let reference = ref;
            if (i === 17) reference = `GARBAGE-${i}`;
            if (i === 18) amount = fmt(baseAmt * 1.25);
            if (i === 19) reference = fuzzyRef(ref);
            if (i === 20) reference = refCode(_addDays(BASE_DATE, dayOffset + 45), i);
            entries.push({
                id: `BNK-${String(i).padStart(3, '0')}`,
                type: 'bank_ledger',
                date,
                amount,
                counterparty: vendor,
                reference,
                rawRef: ref,
                description: `Payment to ${vendor}`,
            });
        }
        return entries;
    })();

    const invoiceRegister = (() => {
        const entries = [];
        for (let i = 1; i <= 20; i++) {
            const b = bankLedger[i - 1];
            let date = b.date, amount = b.amount, vendor = b.counterparty, ref = b.rawRef, status = 'unpaid';
            if (i === 17) { date = _addDays(BASE_DATE, 10); amount = fmt(1200 + freshRand() * 3000); vendor = VENDORS[3]; ref = refCode(date, 100 + i); }
            if (i === 18) { ref = b.rawRef; amount = b.amount / 1.25; }
            if (i === 19) { ref = b.rawRef; }
            if (i === 20) { date = b.date; ref = b.rawRef; amount = b.amount; }
            entries.push({ id: `INV-${String(i).padStart(3, '0')}`, type: 'invoice', date, amount: fmt(amount), vendor, refCode: ref, status, dueDate: _addDays(date, 30) });
        }
        return entries;
    })();

    const paymentReceipts = (() => {
        const entries = [];
        for (let i = 1; i <= 20; i++) {
            const b = bankLedger[i - 1];
            let date = _addDays(b.date, Math.floor(freshRand() * 3));
            let amount = b.amount, payer = b.counterparty, memo = b.reference;
            if (i === 15) memo = '';
            if (i === 16) amount = fmt(amount * 0.99);
            if (i === 17) memo = `DUPLICATE-${b.reference}`;
            if (i === 18) amount = fmt(amount * 1.30);
            if (i === 19) memo = fuzzyRef(b.reference);
            if (i === 20) date = _addDays(b.date, 50);
            entries.push({ id: `PAY-${String(i).padStart(3, '0')}`, type: 'payment_receipt', date, amount: fmt(amount), payer, memo, channel: ['NEFT', 'RTGS', 'UPI', 'IMPS'][Math.floor(freshRand() * 4)] });
        }
        return entries;
    })();

    return {
        bankLedger,
        invoiceRegister,
        paymentReceipts,
        meta: {
            totalRecords: 60,
            sources: 3,
            generatedAt: new Date().toISOString(),
            seed: '0xCAFEBABE',
            description: 'Deterministic synthetic batch for finance-ops reconciliation demo',
        }
    };
}

module.exports = { generateSyntheticData };

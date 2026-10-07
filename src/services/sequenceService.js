import { doc, runTransaction } from "firebase/firestore";
import { db } from "../firebase/firebase.js";

const STARTING_SEQUENCES = {
  PRD: 10001,
  CUS: 10001,
  ORD: 10001,
  PAY: 10001,
  REV: 10001,
  CAT: 10001,
  ACT: 10001,
  CRT: 10001,
};

/**
 * Generates the next sequential business ID (e.g., PRD-10001, CUS-10001, ORD-10001).
 * Uses a Firestore transaction on the `counters` collection to guarantee uniqueness and continuity.
 *
 * @param {'PRD'|'CUS'|'ORD'|'PAY'|'REV'|'CAT'|'ACT'|'CRT'} prefix
 * @returns {Promise<string>} e.g. "ORD-10001"
 */
export async function getNextBusinessId(prefix) {
  const sanitizedPrefix = (prefix || "").toUpperCase();
  const counterDocRef = doc(db, "counters", sanitizedPrefix);

  try {
    const nextSeq = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterDocRef);
      let currentSeq;

      if (!counterDoc.exists()) {
        currentSeq = STARTING_SEQUENCES[sanitizedPrefix] || 10001;
        transaction.set(counterDocRef, {
          prefix: sanitizedPrefix,
          currentValue: currentSeq,
          updatedAt: new Date(),
        });
      } else {
        const data = counterDoc.data();
        currentSeq = (data.currentValue || STARTING_SEQUENCES[sanitizedPrefix] || 10001) + 1;
        transaction.update(counterDocRef, {
          currentValue: currentSeq,
          updatedAt: new Date(),
        });
      }

      return currentSeq;
    });

    return `${sanitizedPrefix}-${nextSeq}`;
  } catch (error) {
    console.warn(`Counter transaction failed for ${sanitizedPrefix}, using fallback:`, error);
    const fallbackSeq = Math.floor(10000 + (Date.now() % 90000));
    return `${sanitizedPrefix}-${fallbackSeq}`;
  }
}

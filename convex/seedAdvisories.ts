"use node";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

import { embedText } from "../lib/embeddings";

/**
 * Advisory corpus chunks — 15 realistic-sounding but clearly summarized
 * advisory content covering:
 *   - Digital arrest scam warning signs
 *   - RBI guidance on suspicious transactions
 *   - MHA cybercrime reporting process
 *   - Counterfeit currency identification guidance
 *
 * These are paraphrased summaries, not verbatim quotes from real documents.
 */
const ADVISORY_CHUNKS = [
  // ─── Digital Arrest Scam Warning Signs ─────────────────────────
  {
    id: "adv_da_01",
    title: "Advisory on Digital Arrest Scam Patterns",
    type: "NCRB" as const,
    text: "Digital arrest scams involve criminals impersonating law enforcement officers via video calls. They create false urgency by claiming the victim is involved in illegal activity such as money laundering or drug trafficking. No real law enforcement agency conducts arrests or investigations over video calls.",
  },
  {
    id: "adv_da_02",
    title: "Advisory on Digital Arrest Scam Patterns",
    type: "MHA" as const,
    text: "Common tactics in digital arrest scams include: displaying fake police ID badges, showing fake arrest warrants, threatening immediate imprisonment, demanding victims remain on video call continuously, and requesting urgent fund transfers to so-called 'verification accounts' controlled by the scammers.",
  },
  {
    id: "adv_da_03",
    title: "Advisory on Impersonation of CBI and ED Officers",
    type: "MHA" as const,
    text: "The Central Bureau of Investigation (CBI) and Enforcement Directorate (ED) do not conduct interrogations or arrests through video calls or WhatsApp. Any call claiming to be from CBI/ED demanding money or personal information is fraudulent. Citizens should immediately disconnect and report to cybercrime helpline 1930.",
  },
  {
    id: "adv_da_04",
    title: "Advisory on Customs and Courier Parcel Scams",
    type: "NCRB" as const,
    text: "Scammers frequently claim that an illegal parcel has been intercepted by customs in the victim's name, containing contraband such as fake passports or drugs. Real customs authorities issue formal notices through official channels and do not demand immediate payment over phone or video calls.",
  },
  // ─── Suspicious Transaction Guidance ───────────────────────────
  {
    id: "adv_st_01",
    title: "Guidance on Identifying Suspicious Financial Transactions",
    type: "RBI" as const,
    text: "Banks and financial institutions should flag transactions where customers make unusual large transfers to unfamiliar beneficiaries under apparent duress, especially when the transfer is preceded by an extended phone or video call. This pattern is strongly associated with digital arrest fraud.",
  },
  {
    id: "adv_st_02",
    title: "Guidance on UPI Fraud Prevention and Account Freezing",
    type: "RBI" as const,
    text: "Suspicious UPI transactions include rapid sequential transfers to multiple new beneficiaries, transfers initiated during ongoing calls with unknown numbers, and transactions to accounts flagged in prior fraud reports. Banks may freeze suspicious accounts pending investigation under RBI guidelines.",
  },
  {
    id: "adv_st_03",
    title: "Guidance on Mule Account Detection",
    type: "RBI" as const,
    text: "Mule accounts are bank accounts used to receive and launder proceeds of fraud. Key indicators include: newly opened accounts receiving large inflows followed by immediate withdrawals, accounts with no prior transaction history suddenly receiving multiple transfers from different sources, and accounts whose KYC details do not match the actual account operator.",
  },
  // ─── Cybercrime Reporting Process ──────────────────────────────
  {
    id: "adv_cr_01",
    title: "National Cybercrime Reporting Process Guide",
    type: "MHA" as const,
    text: "Citizens who suspect they are victims of cybercrime should report immediately through the National Cybercrime Reporting Portal (cybercrime.gov.in) or the helpline number 1930. Early reporting within the 'golden hour' significantly increases the chances of freezing fraudulent transactions and recovering funds.",
  },
  {
    id: "adv_cr_02",
    title: "Law Enforcement Coordination Protocol for Digital Fraud",
    type: "NCRB" as const,
    text: "State cyber cells should coordinate with banks through the I4C (Indian Cyber Crime Coordination Centre) for rapid account freezing. When a digital arrest fraud is reported, the immediate priority is to freeze the destination accounts before funds are withdrawn or further transferred.",
  },
  {
    id: "adv_cr_03",
    title: "Evidence Preservation Guidelines for Cybercrime Cases",
    type: "NCRB" as const,
    text: "Victims and investigators should preserve call recordings, screenshots of video calls, transaction receipts, chat messages, and any other digital evidence. Digital evidence must maintain chain of custody documentation to be admissible in court proceedings.",
  },
  // ─── Counterfeit Currency Identification ───────────────────────
  {
    id: "adv_cc_01",
    title: "Guidance on Identifying Counterfeit Indian Currency Notes",
    type: "RBI" as const,
    text: "Security features of genuine Indian currency notes include: intaglio printing that feels rough to touch, watermark of Mahatma Gandhi visible when held against light, security thread that changes color when viewed at different angles, microprinting visible under magnification, and latent image of the denomination numeral visible when held at 45 degrees.",
  },
  {
    id: "adv_cc_02",
    title: "Mandatory Reporting of Counterfeit Currency Notes",
    type: "RBI" as const,
    text: "All banks and financial institutions must report detection of counterfeit notes to the Reserve Bank of India and local police. Seized counterfeit notes must be impounded and forwarded to the police with a panchnama. The serial numbers of counterfeit notes should be recorded and cross-referenced with existing databases of known counterfeit series.",
  },
  // ─── Convergence of Digital and Financial Crimes ───────────────
  {
    id: "adv_conv_01",
    title: "Report on Convergence of Digital Scams and Counterfeit Operations",
    type: "NCRB" as const,
    text: "Recent investigations reveal that digital arrest scam networks and counterfeit currency operations frequently share infrastructure: the same bank accounts used to collect scam proceeds are also used to distribute counterfeit notes. Device fingerprints and phone numbers overlap between the two crime categories, suggesting coordinated criminal networks.",
  },
  {
    id: "adv_conv_02",
    title: "Cross-Category Crime Network Analysis Advisory",
    type: "NCRB" as const,
    text: "Law enforcement agencies are advised to cross-reference entities (phone numbers, bank accounts, device identifiers) across digital fraud and counterfeit currency case databases. The detection of a shared entity between these categories — known as a convergence signal — is a strong indicator of an organized crime network and should trigger escalated investigation.",
  },
  {
    id: "adv_conv_03",
    title: "Integrated Financial Crime Investigation Framework",
    type: "MHA" as const,
    text: "The Ministry recommends an integrated approach to investigating digital arrest scams and counterfeit currency circulation. When entities such as bank accounts, phone numbers, or device fingerprints appear in both categories, investigating agencies should treat these as connected cases and share intelligence through the I4C coordination framework.",
  },
];

/**
 * Seed the advisories table with advisory chunks and their embeddings.
 * Idempotent: clears existing advisories before reseeding.
 */
export const seedAdvisories = internalAction({
  args: {},
  handler: async (ctx) => {
    // Clear existing advisories
    const existing = await ctx.runQuery(internal.advisoriesHelpers.getAllAdvisoryIds);
    for (const id of existing) {
      await ctx.runMutation(internal.advisories.deleteAdvisory, { id });
    }

    // Insert each advisory chunk with its embedding
    for (const chunk of ADVISORY_CHUNKS) {
      const embedding = await embedText(chunk.text);
      await ctx.runMutation(internal.advisories.insertAdvisoryChunk, {
        advisoryId: chunk.id,
        sourceTitle: chunk.title,
        sourceType: chunk.type,
        chunkText: chunk.text,
        embedding,
        createdAt: Date.now(),
      });
    }

    return `Seeded ${ADVISORY_CHUNKS.length} advisory chunks.`;
  },
});

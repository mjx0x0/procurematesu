# Procurement knowledge-base repair

## Why this repair exists

The Supabase knowledge base contains chunks from the current RA 12009 IRR and the PMO Administrative Manual whose `embedding` field is NULL. **Important architecture note:** the active application's `lib/document-retrieval.ts` currently retrieves chunks with keyword-based `ilike` searches on `chunk_text`; it does not call a vector-search RPC or use the stored embeddings in its current chat retrieval path. Therefore, filling NULL embeddings is a data-quality/future-vector-search repair, not by itself a fix to current chat retrieval. In this branch, the changes most directly affecting current retrieval are source provenance, legacy-source filtering, and keyword ranking. Using embeddings in runtime retrieval would require a separate, tested vector-retrieval change.

There were also legacy RA 9184 chunks whose metadata described the 2014 Local Government Units Procurement Manual as coming from `data/ra12009.txt`, which is an ingestion filename rather than the original source document.

The repair script is deliberately separate from `scripts/ingest-docs.js`. The original ingestion script inserts new rows and should not be used to repair existing rows because repeated runs can create duplicates.

## Safe steps

1. Review this branch first, then run from the active `procurematesu` repository root after the code change is tested.
2. Make sure your local `.env.local` contains `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never commit this file or paste the service-role key into frontend code.
3. Run a dry run first:

   ```bash
   node scripts/repair-knowledge-base.js --embeddings-only
   ```

4. Confirm the dry run reports only the expected missing-embedding counts. The read-only count at the time of this update is 408 total missing vectors: 376 IRR chunks, 30 PMO Administrative Manual chunks, one university-directory chunk, and one temporary-relocation-advisory chunk. Recheck the counts at run time.

5. If the counts are as expected and the local `.env.local` points to the intended Supabase project, apply **only the missing embeddings**:

   ```bash
   node scripts/repair-knowledge-base.js --apply --embeddings-only
   ```

   This option skips the separate metadata/provenance repair. The script updates only rows whose `embedding` is currently NULL; it does not insert new chunks or delete rows. It uses `Xenova/all-MiniLM-L6-v2` and checks for 384 dimensions, matching the existing embedding space.

6. Confirm in Supabase SQL Editor:

   ```sql
   select document_name, count(*) as missing_embeddings
   from public.document_chunks
   where embedding is null
   group by document_name
   order by document_name;
   ```

   An empty result means no chunks have NULL embeddings. Because this run uses `--embeddings-only`, it intentionally does not change the separate legacy-manual provenance metadata.

## Verified IRR edition (checked 24 October 2026)

The actual PDF used for the current Supabase IRR chunks was inspected: `Implementing-Rules-and-Regulations-of-RA-12009(1).pdf`. Its PDF metadata reports the title `Draft_IRR of R.A. 12009_as of 10 February 2025`, creation date 10 February 2025, and 193 pages. Its opening text (Section 1) and final page (Section 117, Effectivity) match the corresponding opening and ending text/pages of the 193-page IRR PDF hosted by GPPB. The Supabase chunks also identify this filename as their `source_file`. This confirms the **edition-level identity** of the file in the current knowledge base as the GPPB-approved IRR, approved through Resolution No. 02-2025, rather than the withdrawn March 2026 edition. This was a content/metadata comparison, not a cryptographic byte-for-byte hash comparison.

**Do not confuse it with the separate Library file `IRR-of-RA-12009-1st-Edition.pdf`.** Its cover and text explicitly say “As of March 30, 2026 | 1st Edition.” GPPB Public Advisory No. 09-2026, posted 31 July 2026, says that edition was withdrawn and must no longer be used. Keep that withdrawn file out of the current-law knowledge base. Official references: [GPPB Public Advisory No. 09-2026](https://www.gppb.gov.ph/public-advisory-no-09-2026/), [GPPB-approved IRR PDF](https://www.gppb.gov.ph/wp-content/uploads/2025/02/IRR-of-RA-No.-12009.pdf), and [GPPB notice of the approved IRR](https://www.gppb.gov.ph/exciting-announcement-issuance-and-publication-of-the-irr-for-the-new-government-procurement-act/).

## Source-use policy in the chatbot

- Current legal questions should use RA 12009 and its IRR first.
- RA 9184, the 2016 IRR, and the 2014 LGU manual should be retrieved only when the question explicitly asks about those sources or the transition period; they must not be presented as automatically current.
- The PMO Administrative Manual is an institutional procedure source, not legislation. The knowledge-base metadata does not verify its approval/version status, so its procedures should be presented as internal guidance and confirmed with the PMO.
- Do not answer specific thresholds, quotation counts, posting periods, or forms from memory when the retrieved current source does not establish them.
- **Known source conflict to flag:** the PMO Administrative Manual contains wording that says to post SVPs with an ABC of “₱200,000 and above,” while Section 34.3(b) of the GPPB-approved RA 12009 IRR says ABCs of ₱200,000 and below do not require posting. For exactly ₱200,000, this is a conflict in the local manual's wording; the official IRR controls, and the institutional manual should be confirmed/corrected by the PMO. Do not silently repeat the internal wording as law.
- Later GPPB circulars/resolutions must be added as independently versioned sources as they become applicable. In particular, GPPB Resolution No. 05-2025 states that the new standard procurement forms became mandatory on 21 September 2025 and that the three-year transition is reckoned from approval of the forms on 14 May 2025, with full compliance due by 15 May 2028. GPPB Resolution No. 10-2026 / Circular No. 06-2026, published on 19 June 2026, consolidates documentary requirements and relevant guidance for specific RA 12009 procurement modes, including Small Value Procurement. These should be ingested as separately versioned sources rather than folded into the Act or IRR text. See the [GPPB Resolutions list](https://www.gppb.gov.ph/resolutions/) and [Circular No. 06-2026](https://www.gppb.gov.ph/wp-content/uploads/2026/06/Annex-A-Circular-No.-06-2026.pdf).

## After running the repair

Test at least:
- A direct RA 12009 question with a cited section.
- A current-law question about a threshold or quotation/posting requirement.
- An MSU-specific PR workflow question.
- An explicit RA 9184 / transitory-period question.
- A question that has no matching source; the assistant should admit the retrieval gap instead of guessing.

Do not call the test complete merely because embeddings exist. In the current keyword-based implementation, verify source ranking/filtering and answer grounding directly. Separately test vector retrieval if/when that feature is implemented.
## Retrieval and answer-grounding regression fixes

The chat route now has source-gated deterministic answers for three high-risk, repeatedly tested question types:

- **Small Value Procurement:** only uses the handler when the retrieved context contains the RA 12009 IRR Section 34 threshold/quotation text and posting-rule text. It cites Section 34.1 and 34.3(a)–(g), including the ₱200,000-or-below posting exception, the three-calendar-day posting rule, the at-least-three quotation requests, the one-quotation evaluation rule within the threshold, and the no-quotation deadline-extension limit. The posting rule is Section **34.3(b)**, not Section 50.3.2.
- **Historical RA 9184 questions:** retrieval is restricted to the RA 9184 and IRR 2016 sources; the response cites the Official Gazette's RA 9184 page and GPPB's 2016 Revised IRR page. IRR 2016 is explicitly recognized as a legacy source and is filtered from ordinary current-law answers.
- **MSU-Gensan PR workflow:** when the PMO Administrative Manual source supports the key workflow steps, the response identifies these as internal procedures and separates them from national procurement-law requirements.

The retrieval layer also avoids ranking unrelated Negotiated Procurement passages as SVP evidence and avoids labeling the continuation of Section 34.3(b)–(g) with the next Section 35 heading when the source chunker has split the text across records.

Run the source-level regression tests from the repository root:

```bash
npm run test:procurement
```

The tests cover subsection mapping, threshold/posting exceptions, the split posting paragraph, historical source selection, internal-versus-legal workflow wording, and the requirement not to hard-code institutional contact answers. Also run `npm run lint` and a full `npx next build` before merging. This working branch has not been merged to `master`.

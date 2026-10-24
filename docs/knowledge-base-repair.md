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
   node scripts/repair-knowledge-base.js
   ```

4. Check the reported source counts. If they match the expected missing-embedding/provenance rows, explicitly apply the repair:

   ```bash
   node scripts/repair-knowledge-base.js --apply
   ```

   The script only updates rows whose `embedding` is currently NULL and separately corrects the provenance metadata on the named 2014 LGU manual rows. It does not insert new chunks or delete rows. It uses `Xenova/all-MiniLM-L6-v2`, which matches the existing 384-dimensional embedding model.

5. Confirm in Supabase SQL Editor:

   ```sql
   select document_name, count(*) as missing_embeddings
   from public.document_chunks
   where embedding is null
   group by document_name
   order by document_name;
   ```

   An empty result means no chunks have NULL embeddings. Also inspect the source metadata for `Local Government Units Procurement Manual (2014)` and confirm `source_file` points to `LocalGovUnitsProcManual.pdf` while `ingestion_file` is `data/ra12009.txt`.

## Verify the stored IRR edition before production use

The current Supabase chunk metadata records the source file as `Implementing-Rules-and-Regulations-of-RA-12009(1).pdf`, but the metadata inspected so far does not establish the edition/approval date. Before treating the source record as fully verified, compare the original file used for ingestion against the GPPB-approved IRR approved through Resolution No. 02-2025. GPPB Public Advisory No. 09-2026 (31 July 2026) says the separate “1st Edition, as of 31 March 2026” IRR issued by GPPB-TSO was withdrawn and must no longer be used. Use only the approved IRR linked from GPPB's advisory. Do not infer the source edition from the chunk title or from the fact that one section's text matches.

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

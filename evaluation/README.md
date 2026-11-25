# GAB AI RAGAS collection

The chat API records RAGAS captures only for authenticated, active **end-user** accounts. Exact retrieved chunks and final answers are saved in the existing `chat_messages.metadata.ragas_capture` JSON field; no database migration is needed.

## Collect

1. Wait until the Vercel preview deployment containing this fix is marked **Ready**.
2. Sign in to ProcureMSU with an active **end-user** account.
3. Open the **end-user dashboard** and use the GAB AI chatbot there. Ask the selected procurement knowledge test questions. Use one fresh chat for the test batch.
4. Export the captured turns with `bun run ragas:export` from the project root.

Optional filters: `bun run ragas:export --since 2026-11-26T00:00:00+08:00`, `--session-id <UUID>`, `--limit 30`, or `--output <file>`.

The local `.env.local` must contain `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Never commit `.env.local` or expose the service-role key.

The export includes the actual user question, final answer, retrieved passages, source metadata, answer path, model/provider provenance, and identifiers. `reference` and `reference_contexts` are deliberately blank and must be completed independently from authoritative sources. Do not use the chatbot's own answer as its reference.

**Coverage limitation:** only general procurement Q&A that reaches the document-retrieval path is captured. PR tracking, PR drafting, scope refusals, small talk, institutional answers handled before retrieval, and early deterministic handlers are excluded. This is an intentional RAG evaluation dataset, not a complete transcript export.

# Implementation Summary: Blank PR Number on Forms During Stages 1-3 with Temporary Tracking

## Overview
As requested, the PR Number on the official/printable Purchase Request (PR) form is now kept blank during stages 1 to 3 (and Draft) so the Procurement Office can physically handwrite or stamp the official number on the underline space. A temporary PR tracking number (e.g., `PR-TEMP-YYYY-XXXX`) is assigned and displayed in the digital UI for tracking across the system until the Procurement Office inputs the official PR number at Step 4 (Pre-Numbering and Control of PRs), at which point the official PR number updates and displays on the official form.

---

## Changes Implemented

### 1. `lib/procurement-process.ts`
- **`isTemporaryPR(prNo)`**: Checks whether a PR number is temporary or draft (`TEMP`, `AUTO-GENERATED`, `DRAFT`).
- **`getFormDisplayPrNumber(prNo, stageKey)`**:
  - During early stages (`draft`, `receipt_of_pr`, `ppmp_app_verification`, `pmo_director_validation`) or whenever `isTemporaryPR(prNo)` is true, returns `""` (empty string) so the official form underline remains blank.
  - At Step 4 (`pr_pre_numbering`) and onward once an official number is assigned, returns the official PR number.

### 2. Official PR Views & Print Templates
- **`app/dashboard/pr-print/PRPrintContent.tsx`**:
  - PR No. table cell now renders `{getFormDisplayPrNumber(data.pr_no, data.current_stage) || "\u00A0"}` with standard underline and min-height, providing a clear blank line for handwriting/stamping.
  - Screen action bar (`print:hidden`) displays `System Tracking ID: {data.pr_no}` with temporary control badge.
  - Added direct loading by `?id=PR-...` alongside encoded data.
  - Added subtle audit footnote displaying `System Tracking Control: {data.pr_no}`.
- **`components/PRPDF.tsx`**:
  - Uses `getFormDisplayPrNumber(safePr.pr_no, safePr.current_stage) || " "` in the official header box.
  - Added subtle footnote at the bottom of the PDF page displaying `System Tracking Control: {safePr.pr_no}` when temporary.
- **`app/dashboard/pr/[pr_no]/page.tsx`**:
  - The boxed form template renders `{getFormDisplayPrNumber(pr.pr_no, pr.current_stage) || "\u00A0"}`.
  - Top header and tracking timeline clearly display `{pr.pr_no}` with an informational banner explaining the temporary control number and that the official number will be assigned at Step 4.
- **`components/AdminPRFullFormModal.tsx`**:
  - Form PR No. cell renders `{getFormDisplayPrNumber(String(pr.pr_no || ""), String(pr.current_stage || "")) || "\u00A0"}`.

### 3. PR Creation & Clarifications
- **`app/dashboard/new-pr/ProcurementRequestForm.tsx`**:
  - Form input labeled as `Blank on form (Auto-tracked)` with hint: `Blank on printed PR form; official No. assigned at Step 4`.
  - Submission dialog informs users that the printed PR form leaves the PR No. blank for the Procurement Office to write the official control number, while the system temporary number tracks the request digitally.

---

## Verification
- Both `compile_applet` and `lint_applet` passed with zero errors.

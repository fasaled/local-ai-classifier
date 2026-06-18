# File Classifier Model Comparison Results

**Date:** June 12, 2026
**Last Updated:** June 12, 2026
**Test Files:** 24 files across 4 test sets
**Labels:** 9 (family, banking, marketing, technology, pets, corporate-governance, labor-relations, pedro-juan-business-trip, pedro-juan-creative-cooking)
**Implementation:** llama-server (HTTP API)

---

## Architecture

The classifier uses **llama-server** as an external process:
- Server runs as a separate process
- Model loads once and stays in memory
- Classification via HTTP requests to localhost:8080
- Supports multiple models (Qwen, Gemma, Llama, Phi, Mistral)

---

## Test Files

### set-a (9 files) — Basic 5-label classification
- `birthday-card.txt` → family
- `holiday-card.txt` → family
- `school-notice.txt` → family
- `medical-record.txt` → family
- `social-media-calendar.txt` → marketing
- `brand-guidelines.txt` → marketing
- `adoption-papers.txt` → pets
- `vet-records.txt` → pets
- `vaccination-cert.txt` → pets

### set-b (9 files) — Banking, Technology, Marketing
- `bank-statement.txt` → banking
- `tax-return.txt` → banking
- `credit-card-bill.txt` → banking
- `investment-statement.txt` → banking
- `press-release.txt` → marketing
- `sales-proposal.txt` → marketing
- `microservices-architecture.txt` → technology
- `cloud-security-guide.txt` → technology
- `training-notes.txt` → pets

### set-c (2 files) — Context-dependent corporate documents
- `board-meeting-minutes.txt` → corporate-governance
- `union-negotiation-meeting.txt` → labor-relations

### set-d (4 files) — Same entities, different context
- `pedro-juan-business-trip-pure.txt` → pedro-juan-business-trip
- `pedro-juan-business-trip-ambiguous.txt` → pedro-juan-business-trip
- `pedro-juan-creative-cooking-pure.txt` → pedro-juan-creative-cooking
- `pedro-juan-creative-cooking-ambiguous.txt` → pedro-juan-creative-cooking

> **Ambiguous documents** in set-d contain explicit distractors: the business-trip documents mention cooking demonstrations at a gastronomy congress, and the creative-cooking documents include a brief paragraph on food cost and franchise expansion. Correct classification requires identifying the dominant context.

---

## Labels Definition

```yaml
family: "Personal family documents including personal letters, birthday cards, family photos descriptions, home videos notes, school documents, medical records, insurance policies"
banking: "Banking and financial documents including account statements, investment portfolios, tax returns, credit card bills, loan applications, ATM receipts"
marketing: "Marketing and sales documents including sales proposals, brochures, social media posts, press releases, market analysis, advertising materials"
technology: "Technology documents including software architecture, programming guides, system design, technical documentation, API specifications, security guides"
pets: "Pet-related documents including veterinary records, vaccination certificates, pet care guides, adoption papers, pet insurance, pet training notes, pet health records"
corporate-governance: "Corporate governance documents including board of directors minutes, executive committee meetings between president and vice-president, board resolutions, shareholder meeting minutes, appointments of officers, bylaws amendments, fiduciary decisions, annual governance reports"
labor-relations: "Labor relations documents including meetings with union representatives, collective bargaining negotiations, union grievance procedures, works council sessions, labor dispute records, collective agreement drafts, strike notices, union demands and counterproposals"
pedro-juan-business-trip: "Documents in which Pedro and Juan are mentioned together in the context of business travel, including client visits, industry conferences, trade fairs, sales trips, international meetings, on-site negotiations, flight and hotel arrangements for work, expense reports for business trips, agendas of professional trips"
pedro-juan-creative-cooking: "Documents in which Pedro and Juan are mentioned together in the context of creative cooking at a restaurant, including new menu development, recipe experimentation, kitchen brigade coordination, tasting sessions, gastronomic creativity, plating techniques, chef collaborations in a restaurant kitchen"
```

---

## Available Models

| Model | Size | Status |
|-------|------|--------|
| Qwen 2.5-1.5B Instruct Q4_K_M | 1.0GB | Tested |
| Llama 3.2-3B Instruct Q4_K_M | 1.9GB | Tested |
| Phi-4-mini-instruct Q4_K_M | 2.3GB | Tested |
| Mistral 3-3B Instruct Q4_K_M | ~2.0GB | Tested |
| Gemma 4 E2B-it Q4_K_M | 2.9GB | Tested |

---

## Summary

| Model | set-a (9) | set-b (9) | set-c (2) | set-d (4) | **Total (24)** |
|-------|-----------|-----------|-----------|-----------|-----------------|
| **Gemma 4 E2B** | 9/9 | 8/9 | 2/2 | 4/4 | **23/24 (95.8%)** |
| **Mistral 3B** | 9/9 | 8/9 | 2/2 | 4/4 | **23/24 (95.8%)** |
| **Phi-4 mini** | 6/9 | 8/9 | 2/2 | 4/4 | **20/24 (83.3%)** |
| **Llama 3.2 3B** | 8/9 | 8/9 | 2/2 | 0/4 | **18/24 (75.0%)** |
| **Qwen 1.5B** | 2/9 | 4/9 | 1/2 | 2/4 | **9/24 (37.5%)** |

> **Note on determinism:** Results were obtained with `temperature: 0` and may vary on re-run for borderline cases. See the "Determinism Caveat" section at the bottom.

---

## Gemma 4 E2B-it Results

**Size:** 2.9GB | **Accuracy:** 95.8% (23/24) | **Avg Time:** ~6s/file

| File | Set | Expected | Result | OK? |
|------|-----|----------|--------|-----|
| birthday-card.txt | a | family | family | ✓ |
| holiday-card.txt | a | family | family | ✓ |
| school-notice.txt | a | family | family | ✓ |
| medical-record.txt | a | family | family | ✓ |
| social-media-calendar.txt | a | marketing | marketing | ✓ |
| brand-guidelines.txt | a | marketing | marketing | ✓ |
| adoption-papers.txt | a | pets | pets | ✓ |
| vet-records.txt | a | pets | pets | ✓ |
| vaccination-cert.txt | a | pets | pets | ✓ |
| bank-statement.txt | b | banking | banking | ✓ |
| tax-return.txt | b | banking | banking | ✓ |
| credit-card-bill.txt | b | banking | banking | ✓ |
| investment-statement.txt | b | banking | banking | ✓ |
| press-release.txt | b | marketing | **pets** | ✗ |
| sales-proposal.txt | b | marketing | marketing | ✓ |
| microservices-architecture.txt | b | technology | technology | ✓ |
| cloud-security-guide.txt | b | technology | technology | ✓ |
| training-notes.txt | b | pets | pets | ✓ |
| board-meeting-minutes.txt | c | corporate-governance | corporate-governance | ✓ |
| union-negotiation-meeting.txt | c | labor-relations | labor-relations | ✓ |
| pedro-juan-business-trip-pure.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-business-trip-ambiguous.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-creative-cooking-pure.txt | d | pedro-juan-creative-cooking | pedro-juan-creative-cooking | ✓ |
| pedro-juan-creative-cooking-ambiguous.txt | d | pedro-juan-creative-cooking | pedro-juan-creative-cooking | ✓ |

### Errors
- `press-release.txt` (set-b) → pets. The PawPrint product-launch press release was misclassified because the document domain (pet supplies) outweighed the document type (press release / marketing). This is the only error, and it is the same kind of failure that affects Mistral and Phi-4 — the press release is genuinely ambiguous between `marketing` (the document type) and `pets` (the product domain).

### Notes
- Strongest model overall. Resolves all of set-c and set-d correctly.

---

## Mistral 3-3B Results

**Size:** ~2.0GB | **Accuracy:** 95.8% (23/24) | **Avg Time:** ~1.5s/file

| File | Set | Expected | Result | OK? |
|------|-----|----------|--------|-----|
| birthday-card.txt | a | family | family | ✓ |
| holiday-card.txt | a | family | family | ✓ |
| school-notice.txt | a | family | family | ✓ |
| medical-record.txt | a | family | family | ✓ |
| social-media-calendar.txt | a | marketing | marketing | ✓ |
| brand-guidelines.txt | a | marketing | marketing | ✓ |
| adoption-papers.txt | a | pets | pets | ✓ |
| vet-records.txt | a | pets | pets | ✓ |
| vaccination-cert.txt | a | pets | pets | ✓ |
| bank-statement.txt | b | banking | banking | ✓ |
| tax-return.txt | b | banking | banking | ✓ |
| credit-card-bill.txt | b | banking | banking | ✓ |
| investment-statement.txt | b | banking | banking | ✓ |
| press-release.txt | b | marketing | **pets** | ✗ |
| sales-proposal.txt | b | marketing | marketing | ✓ |
| microservices-architecture.txt | b | technology | technology | ✓ |
| cloud-security-guide.txt | b | technology | technology | ✓ |
| training-notes.txt | b | pets | pets | ✓ |
| board-meeting-minutes.txt | c | corporate-governance | corporate-governance | ✓ |
| union-negotiation-meeting.txt | c | labor-relations | labor-relations | ✓ |
| pedro-juan-business-trip-pure.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-business-trip-ambiguous.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-creative-cooking-pure.txt | d | pedro-juan-creative-cooking | pedro-juan-creative-cooking | ✓ |
| pedro-juan-creative-cooking-ambiguous.txt | d | pedro-juan-creative-cooking | pedro-juan-creative-cooking | ✓ |

### Errors
- `press-release.txt` (set-b) → pets. The document is a press release announcing a new product line from PawPrint Pet Supplies. Mistral weighted the product domain over the document's marketing intent, misclassifying the document type.

### Notes
- Resolves the most challenging case (set-d) correctly: 4/4 including the ambiguous documents.
- Fastest 3B-class model tested (~1.5s per file).
- Good balance of speed and accuracy.

---

## Phi-4-mini-instruct Results

**Size:** 2.3GB | **Accuracy:** 83.3% (20/24) | **Avg Time:** ~2s/file

| File | Set | Expected | Result | OK? |
|------|-----|----------|--------|-----|
| birthday-card.txt | a | family | family | ✓ |
| holiday-card.txt | a | family | family | ✓ |
| school-notice.txt | a | family | **NONE** | ✗ |
| medical-record.txt | a | family | **NONE** | ✗ |
| social-media-calendar.txt | a | marketing | marketing | ✓ |
| brand-guidelines.txt | a | marketing | **pets** | ✗ |
| adoption-papers.txt | a | pets | pets | ✓ |
| vet-records.txt | a | pets | pets | ✓ |
| vaccination-cert.txt | a | pets | pets | ✓ |
| bank-statement.txt | b | banking | banking | ✓ |
| tax-return.txt | b | banking | banking | ✓ |
| credit-card-bill.txt | b | banking | banking | ✓ |
| investment-statement.txt | b | banking | banking | ✓ |
| press-release.txt | b | marketing | **pets** | ✗ |
| sales-proposal.txt | b | marketing | marketing | ✓ |
| microservices-architecture.txt | b | technology | technology | ✓ |
| cloud-security-guide.txt | b | technology | technology | ✓ |
| training-notes.txt | b | pets | pets | ✓ |
| board-meeting-minutes.txt | c | corporate-governance | corporate-governance | ✓ |
| union-negotiation-meeting.txt | c | labor-relations | labor-relations | ✓ |
| pedro-juan-business-trip-pure.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-business-trip-ambiguous.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-creative-cooking-pure.txt | d | pedro-juan-creative-cooking | pedro-juan-creative-cooking | ✓ |
| pedro-juan-creative-cooking-ambiguous.txt | d | pedro-juan-creative-cooking | pedro-juan-creative-cooking | ✓ |

### Errors
- `school-notice.txt` → NONE. The model's response did not match any valid label.
- `medical-record.txt` → NONE. Same issue.
- `brand-guidelines.txt` → pets. Pet supply brand guide misclassified as pet document.
- `press-release.txt` → pets. Same misclassification as Mistral (PawPrint product focus dominates).

### Notes
- Two files returned **NONE** (no label matched), which is worse than a wrong label: it provides no information.
- The `NONE` returns suggest the model's response formatting drifts and the keyword-based parser cannot extract a valid label.
- Surprisingly strong on set-d (4/4) and set-c (2/2). For pure context-disambiguation tasks, this 3.8B model performs comparably to Mistral 3B.

---

## Llama 3.2-3B Results

**Size:** 1.9GB | **Accuracy:** 75% (18/24) | **Avg Time:** ~1.5s/file

| File | Set | Expected | Result | OK? |
|------|-----|----------|--------|-----|
| birthday-card.txt | a | family | family | ✓ |
| holiday-card.txt | a | family | **marketing** | ✗ |
| school-notice.txt | a | family | family | ✓ |
| medical-record.txt | a | family | family | ✓ |
| social-media-calendar.txt | a | marketing | marketing | ✓ |
| brand-guidelines.txt | a | marketing | marketing | ✓ |
| adoption-papers.txt | a | pets | pets | ✓ |
| vet-records.txt | a | pets | pets | ✓ |
| vaccination-cert.txt | a | pets | pets | ✓ |
| bank-statement.txt | b | banking | banking | ✓ |
| tax-return.txt | b | banking | banking | ✓ |
| credit-card-bill.txt | b | banking | banking | ✓ |
| investment-statement.txt | b | banking | banking | ✓ |
| press-release.txt | b | marketing | marketing | ✓ |
| sales-proposal.txt | b | marketing | marketing | ✓ |
| microservices-architecture.txt | b | technology | **marketing** | ✗ |
| cloud-security-guide.txt | b | technology | technology | ✓ |
| training-notes.txt | b | pets | pets | ✓ |
| board-meeting-minutes.txt | c | corporate-governance | corporate-governance | ✓ |
| union-negotiation-meeting.txt | c | labor-relations | labor-relations | ✓ |
| pedro-juan-business-trip-pure.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-business-trip-ambiguous.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-creative-cooking-pure.txt | d | pedro-juan-creative-cooking | **pedro-juan-business-trip** | ✗ |
| pedro-juan-creative-cooking-ambiguous.txt | d | pedro-juan-creative-cooking | **pedro-juan-business-trip** | ✗ |

### Errors
- `holiday-card.txt` → marketing (expected family)
- `microservices-architecture.txt` → marketing (expected technology)
- `pedro-juan-creative-cooking-pure.txt` → pedro-juan-business-trip (expected creative-cooking)
- `pedro-juan-creative-cooking-ambiguous.txt` → pedro-juan-business-trip (expected creative-cooking)

### Notes
- Total collapse on set-d: classifies every Pedro/Juan document as `pedro-juan-business-trip`. The model cannot distinguish the two contexts at all — when the document mentions Pedro and Juan, it picks the first or most "business-like" of the two labels regardless of content.
- Performs reasonably on structured documents (banking, governance, marketing) but struggles with personal/family content and entity-disambiguation tasks.

---

## Qwen 2.5-1.5B Results

**Size:** 1.0GB | **Accuracy:** 37.5% (9/24) | **Avg Time:** ~500ms/file

| File | Set | Expected | Result | OK? |
|------|-----|----------|--------|-----|
| birthday-card.txt | a | family | **pedro-juan-business-trip** | ✗ |
| holiday-card.txt | a | family | family | ✓ |
| school-notice.txt | a | family | family | ✓ |
| medical-record.txt | a | family | **pedro-juan-business-trip** | ✗ |
| social-media-calendar.txt | a | marketing | **pedro-juan-business-trip** | ✗ |
| brand-guidelines.txt | a | marketing | **pedro-juan-business-trip** | ✗ |
| adoption-papers.txt | a | pets | **pedro-juan-business-trip** | ✗ |
| vet-records.txt | a | pets | **pedro-juan-business-trip** | ✗ |
| vaccination-cert.txt | a | pets | **pedro-juan-business-trip** | ✗ |
| bank-statement.txt | b | banking | banking | ✓ |
| tax-return.txt | b | banking | banking | ✓ |
| credit-card-bill.txt | b | banking | banking | ✓ |
| investment-statement.txt | b | banking | banking | ✓ |
| press-release.txt | b | marketing | **banking** | ✗ |
| sales-proposal.txt | b | marketing | marketing | ✓ |
| microservices-architecture.txt | b | technology | **pedro-juan-business-trip** | ✗ |
| cloud-security-guide.txt | b | technology | **pedro-juan-business-trip** | ✗ |
| training-notes.txt | b | pets | **pedro-juan-business-trip** | ✗ |
| board-meeting-minutes.txt | c | corporate-governance | corporate-governance | ✓ |
| union-negotiation-meeting.txt | c | labor-relations | **pedro-juan-business-trip** | ✗ |
| pedro-juan-business-trip-pure.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-business-trip-ambiguous.txt | d | pedro-juan-business-trip | pedro-juan-business-trip | ✓ |
| pedro-juan-creative-cooking-pure.txt | d | pedro-juan-creative-cooking | **pedro-juan-business-trip** | ✗ |
| pedro-juan-creative-cooking-ambiguous.txt | d | pedro-juan-creative-cooking | **pedro-juan-business-trip** | ✗ |

### Errors
- Seven of nine set-a documents collapsed to `pedro-juan-business-trip` regardless of content. The fallback label used for collapse may shift between runs.
- `press-release.txt` → banking
- `union-negotiation-meeting.txt` → pedro-juan-business-trip
- Both set-d cooking documents → pedro-juan-business-trip

### Notes
- The 1.5B parameter count is below the threshold needed for this classification task. The model exhibits strong label-collapse behaviour and cannot disambiguate.

---

## Recommendations

### Best Overall: Gemma 4 E2B-it
- **95.8% accuracy** (23/24) across all sets, including the most challenging set-d (4/4)
- ~6s per file, slowest of the group but well within acceptable range
- 2.9GB footprint
- Handles ambiguous contexts, mixed-domain documents, and entity-disambiguation reliably
- **Recommended for production use when classification quality is critical**

### Best Speed/Accuracy Tradeoff: Mistral 3-3B
- **95.8% accuracy** (23/24) — tied with Gemma, faster, smaller
- ~1.5s per file, the fastest model tested
- ~2.0GB footprint
- Handles the hardest test (set-d) perfectly
- **Recommended for general use**, especially when processing many files or when GPU/memory is constrained

### Strong Third Option: Phi-4 mini
- 83.3% accuracy (20/24) — solid for its size
- Strong on context-disambiguation tasks (4/4 set-d, 2/2 set-c)
- Two `NONE` responses on set-a are a concern: silent failures are worse than wrong answers
- Worth considering when format-stable labels are guaranteed and the input is well-bounded

### Not Recommended
- **Llama 3.2 3B**: 75% accuracy with total failure on set-d (0/4 — all 4 documents misclassified as `pedro-juan-business-trip`). The model cannot distinguish the two Pedro/Juan contexts.
- **Qwen 2.5-1.5B**: 37.5% accuracy with severe label-collapse behaviour. 7 of 9 set-a documents collapsed to `pedro-juan-business-trip`. The 1.5B parameter count is below the threshold for this task.

---

## Determinism Caveat

The classifier calls llama-server with `temperature: 0`, which should produce deterministic output. In practice, **results are not deterministic across runs**, even for the same model on the same input.

Likely causes:
- llama-server batches and parallel-slot scheduling can affect sampling order in borderline cases.
- Q4_K_M quantization can produce slightly different logits run-to-run depending on the underlying numerical state.
- The keyword-based parser is sensitive to minor formatting variations in the model's response.

**Practical implication:** the test scores above should be treated as point estimates within a ±5% confidence band, not exact figures. Models that score ≥95% are reliably strong; models that score <50% are reliably weak. Models in the 70-85% range have more run-to-run variance and require a larger test set to characterize.

**For mission-critical deployments:** consider running classification twice and accepting the result only when both runs agree. Or, constrain the prompt format more strictly to reduce model-side variance (e.g., logit-bias toward label tokens, or JSON-mode output).

---

## Implementation Details

- **API Endpoint:** `/v1/chat/completions` (OpenAI-compatible)
- **Context Size:** 32 768 tokens
- **Prompt:** Instructs model to output only the label name
- **Parser:** Extracts label names using keyword matching (case-insensitive substring)
- **Temperature:** 0 (declared; actual outputs are not fully deterministic — see caveat above)
- **Chunked Classification:** For documents exceeding context, uses majority voting across chunks
- **Load Time:** ~5 seconds to load model into memory
- **Per-File Time:** ~500ms (Qwen 1.5B) to ~6s (Gemma) for small files; chunked files take longer

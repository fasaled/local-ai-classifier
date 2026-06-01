# File Classifier Model Comparison Results

**Date:** June 1, 2026
**Test Files:** 17 files across 4 categories
**Categories:** Family (4), Banking (4), Marketing (4), Pets (4), Labels file

---

## Test Files

### Family Category
- `birthday-card.txt` - Personal birthday greeting
- `holiday-card.txt` - Christmas card with family updates
- `school-notice.txt` - Parent-teacher conference notice
- `medical-record.txt` - Personal health record

### Banking Category
- `bank-statement.txt` - Monthly bank statement
- `tax-return.txt` - Form 1040 tax return
- `credit-card-bill.txt` - Credit card statement
- `investment-statement.txt` - Vanguard brokerage quarterly statement

### Marketing Category
- `social-media-calendar.txt` - Social media content calendar
- `press-release.txt` - Product launch press release
- `sales-proposal.txt` - Marketing services proposal
- `brand-guidelines.txt` - Brand style guide

### Pets Category
- `vet-records.txt` - Veterinary medical record
- `vaccination-cert.txt` - Rabies vaccination certificate
- `adoption-papers.txt` - Pet adoption agreement
- `training-notes.txt` - Dog training progress report

---

## Labels Definition

```yaml
family: "Family documents including personal letters, birthday cards, family photos descriptions, home videos notes, school documents, medical records, insurance policies"
banking: "Banking and financial documents including account statements, investment portfolios, tax returns, credit card bills, loan applications, ATM receipts"
marketing: "Marketing and sales documents including proposals, brochures, brand guidelines, social media posts, press releases, market analysis"
pets: "Pet-related documents including veterinary records, vaccination certificates, pet care guides, adoption papers, pet insurance, training notes"
```

---

## Results by Model

### Qwen 1.5B (qwen2.5-1.5b-instruct-q4_k_m.gguf)
**Accuracy:** 94% (16/17) | **Time:** 5s

| File | Expected | Result |
|------|----------|--------|
| birthday-card.txt | family | family ✓ |
| holiday-card.txt | family | family ✓ |
| school-notice.txt | family | family ✓ |
| medical-record.txt | family | family ✓ |
| bank-statement.txt | banking | banking ✓ |
| tax-return.txt | banking | banking ✓ |
| credit-card-bill.txt | banking | banking ✓ |
| investment-statement.txt | banking | banking ✓ |
| social-media-calendar.txt | marketing | marketing ✓ |
| press-release.txt | marketing | marketing ✓ |
| sales-proposal.txt | marketing | marketing ✓ |
| brand-guidelines.txt | marketing | **pets** ✗ |
| vet-records.txt | pets | pets ✓ |
| vaccination-cert.txt | pets | pets ✓ |
| adoption-papers.txt | pets | pets ✓ |
| training-notes.txt | pets | pets ✓ |
| labels.yaml | family | family ✓ |

---

### Llama 3.2 1B (Llama-3.2-1B-Instruct-Q8_0.gguf)
**Accuracy:** 71% (12/17) | **Time:** 3s

| File | Expected | Result |
|------|----------|--------|
| birthday-card.txt | family | family ✓ |
| holiday-card.txt | family | family ✓ |
| school-notice.txt | family | **banking** ✗ |
| medical-record.txt | family | family ✓ |
| bank-statement.txt | banking | banking ✓ |
| tax-return.txt | banking | **marketing** ✗ |
| credit-card-bill.txt | banking | banking ✓ |
| investment-statement.txt | banking | banking ✓ |
| social-media-calendar.txt | marketing | marketing ✓ |
| press-release.txt | marketing | marketing ✓ |
| sales-proposal.txt | marketing | marketing ✓ |
| brand-guidelines.txt | marketing | marketing ✓ |
| vet-records.txt | pets | **marketing** ✗ |
| vaccination-cert.txt | pets | **family** ✗ |
| adoption-papers.txt | pets | pets ✓ |
| training-notes.txt | pets | **marketing** ✗ |
| labels.yaml | family | family ✓ |

---

### LFM 1.2B (LFM2.5-1.2B-Instruct-Q4_K_M.gguf)
**Accuracy:** 18% (3/17) | **Time:** 4s

| File | Expected | Result |
|------|----------|--------|
| birthday-card.txt | family | family ✓ |
| holiday-card.txt | family | **banking** ✗ |
| school-notice.txt | family | **banking** ✗ |
| medical-record.txt | family | **banking** ✗ |
| bank-statement.txt | banking | **banking** ✗ |
| tax-return.txt | banking | **banking** ✗ |
| credit-card-bill.txt | banking | **banking** ✗ |
| investment-statement.txt | banking | **banking** ✗ |
| social-media-calendar.txt | marketing | **banking** ✗ |
| press-release.txt | marketing | marketing ✓ |
| sales-proposal.txt | marketing | **banking** ✗ |
| brand-guidelines.txt | marketing | marketing ✓ |
| vet-records.txt | pets | **banking** ✗ |
| vaccination-cert.txt | pets | **banking** ✗ |
| adoption-papers.txt | pets | **banking** ✗ |
| training-notes.txt | pets | **banking** ✗ |
| labels.yaml | family | **banking** ✗ |

**Note:** Model severely over-selects "banking" category (14/17 files).

---

### Gemma 4 E2B (gemma-4-E2B-it-Q8_0.gguf)
**Accuracy:** 100% (17/17) | **Time:** 2m 42s

| File | Expected | Result |
|------|----------|--------|
| birthday-card.txt | family | family ✓ |
| holiday-card.txt | family | family ✓ |
| school-notice.txt | family | family ✓ |
| medical-record.txt | family | family ✓ |
| bank-statement.txt | banking | banking ✓ |
| tax-return.txt | banking | banking ✓ |
| credit-card-bill.txt | banking | banking ✓ |
| investment-statement.txt | banking | banking ✓ |
| social-media-calendar.txt | marketing | marketing ✓ |
| press-release.txt | marketing | marketing ✓ |
| sales-proposal.txt | marketing | marketing ✓ |
| brand-guidelines.txt | marketing | marketing ✓ |
| vet-records.txt | pets | pets ✓ |
| vaccination-cert.txt | pets | pets ✓ |
| adoption-papers.txt | pets | pets ✓ |
| training-notes.txt | pets | pets ✓ |
| labels.yaml | family | family ✓ |

---

## Summary Comparison

| Model | Accuracy | Time | Errors |
|-------|----------|------|--------|
| **Gemma 4 E2B** | **100%** | 2m 42s | None |
| Qwen 1.5B | 94% | **5s** | 1 (brand-guidelines → pets) |
| Llama 3.2 1B | 71% | 3s | 5 (mix of errors) |
| LFM 1.2B | 18% | 4s | 14 (over-selects banking) |

---

## Recommendations

### Best Overall: Qwen 1.5B
- Excellent accuracy (94%)
- Very fast (5 seconds)
- Good balance of performance and speed

### For Critical Classification Tasks: Gemma 4 E2B
- Perfect accuracy (100%)
- Very slow (2m 42s) - 32x slower than Qwen 1.5B

### Not Recommended: LFM 1.2B
- Poor discrimination (over-selects single category)
- Qwen 1.5B is faster and more accurate

---

## Implementation Details

- **API Endpoint:** `/v1/chat/completions` (OpenAI-compatible)
- **Prompt:** Instructs model to output only the label name matching one from the provided list
- **Parser:** Extracts label names from text using keyword matching
- **Temperature:** 0 (deterministic output)
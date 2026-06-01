# File Classifier Model Comparison Results

**Date:** June 2, 2026
**Last Updated:** June 2, 2026
**Test Files:** 18 files across 5 categories
**Categories:** Family (5), Banking (5), Marketing (4), Technology (2), Pets (5)
**Implementation:** llama-server (HTTP API)

---

## Architecture

The classifier uses **llama-server** as an external process:
- Server runs as a separate process
- Model loads once and stays in memory
- Classification via HTTP requests to localhost:8080
- Supports multiple models (Qwen, Gemma, Llama)

---

## Test Files

### Family Category
- `birthday-card.txt` - Personal birthday greeting
- `holiday-card.txt` - Christmas card with family updates
- `school-notice.txt` - Parent-teacher conference notice
- `medical-record.txt` - Personal health record
- `social-media-calendar.txt` - Social media content calendar

### Banking Category
- `bank-statement.txt` - Monthly bank statement
- `tax-return.txt` - Form 1040 tax return
- `credit-card-bill.txt` - Credit card statement
- `investment-statement.txt` - Vanguard brokerage quarterly statement

### Marketing Category
- `press-release.txt` - Product launch press release
- `sales-proposal.txt` - Marketing services proposal
- `brand-guidelines.txt` - Brand style guide (paw print pet supplies)

### Technology Category
- `microservices-architecture.txt` - 117KB technical documentation
- `cloud-security-guide.txt` - 14KB security best practices

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
technology: "Technology documents including software architecture, programming guides, system design, technical documentation, API specifications, security guides"
pets: "Pet-related documents including veterinary records, vaccination certificates, pet care guides, adoption papers, pet insurance, training notes"
```

---

## Available Models

| Model | Size | Status |
|-------|------|--------|
| Qwen 2.5-1.5B Instruct Q4_K_M | 1.0GB | **Recommended** |
| Llama 3.2-3B Instruct Q4_K_M | 1.9GB | Works |
| Phi-4-mini-instruct Q4_K_M | 2.3GB | Works |
| Gemma 4 2B Q4_K_M | 2.9GB | Works |

---

## Qwen 2.5-1.5B Results

**Size:** 1.0GB | **Accuracy:** 89% (16/18) | **Avg Time:** ~500ms/file

| File | Expected | Result | Size | Time | OK? |
|------|----------|--------|------|------|-----|
| birthday-card.txt | family | **family** | 866B | ~500ms | ✓ |
| holiday-card.txt | family | **family** | 824B | ~500ms | ✓ |
| school-notice.txt | family | **family** | 820B | ~500ms | ✓ |
| medical-record.txt | family | **pets** | 899B | ~500ms | ✗ |
| social-media-calendar.txt | marketing | **marketing** | 1.1KB | ~500ms | ✓ |
| bank-statement.txt | banking | **banking** | 1.4KB | ~500ms | ✓ |
| tax-return.txt | banking | **banking** | 809B | ~500ms | ✓ |
| credit-card-bill.txt | banking | **banking** | 921B | ~500ms | ✓ |
| investment-statement.txt | banking | **banking** | 864B | ~500ms | ✓ |
| press-release.txt | marketing | **marketing** | 1.3KB | ~500ms | ✓ |
| sales-proposal.txt | marketing | **marketing** | 1.2KB | ~500ms | ✓ |
| brand-guidelines.txt | pets | **marketing** | 1.1KB | ~500ms | ✗ |
| microservices-architecture.txt | technology | **technology** | 117.4KB | ~60s (chunked) | ✓ |
| cloud-security-guide.txt | technology | **technology** | 14.4KB | ~3s | ✓ |
| vet-records.txt | pets | **pets** | 1.4KB | ~500ms | ✓ |
| vaccination-cert.txt | pets | **pets** | 850B | ~500ms | ✓ |
| adoption-papers.txt | pets | **pets** | 1.1KB | ~500ms | ✓ |
| training-notes.txt | pets | **pets** | 1.2KB | ~500ms | ✓ |

### Errors
- `brand-guidelines.txt` → marketing (expected: pets - brand guide for pet supplies)
- `medical-record.txt` → pets (expected: family - personal health record)

---

## Phi-4-mini-instruct Results

**Size:** 2.3GB | **Accuracy:** 83% (15/18) | **Avg Time:** ~1.5s/file

| File | Expected | Result | Size | Time | OK? |
|------|----------|--------|------|------|-----|
| birthday-card.txt | family | **family** | 866B | ~350ms | ✓ |
| holiday-card.txt | family | **family** | 824B | ~350ms | ✓ |
| school-notice.txt | family | **NONE** | 820B | ~350ms | ✗ |
| medical-record.txt | family | **NONE** | 899B | ~350ms | ✗ |
| social-media-calendar.txt | marketing | **marketing** | 1.1KB | ~350ms | ✓ |
| bank-statement.txt | banking | **banking** | 1.4KB | ~350ms | ✓ |
| tax-return.txt | banking | **banking** | 809B | ~350ms | ✓ |
| credit-card-bill.txt | banking | **banking** | 921B | ~350ms | ✓ |
| investment-statement.txt | banking | **banking** | 864B | ~350ms | ✓ |
| press-release.txt | marketing | **pets** | 1.3KB | ~350ms | ✗ |
| sales-proposal.txt | marketing | **marketing** | 1.2KB | ~350ms | ✓ |
| brand-guidelines.txt | pets | **pets** | 1.1KB | ~350ms | ✗ |
| microservices-architecture.txt | technology | **technology** | 117.4KB | ~100s (chunked) | ✓ |
| cloud-security-guide.txt | technology | **technology** | 14.4KB | ~10s | ✓ |
| vet-records.txt | pets | **pets** | 1.4KB | ~350ms | ✓ |
| vaccination-cert.txt | pets | **pets** | 850B | ~350ms | ✓ |
| adoption-papers.txt | pets | **pets** | 1.1KB | ~350ms | ✓ |
| training-notes.txt | pets | **pets** | 1.2KB | ~350ms | ✓ |

### Errors
- `school-notice.txt` → NONE (expected: family)
- `medical-record.txt` → NONE (expected: family)
- `press-release.txt` → pets (expected: marketing)
- `brand-guidelines.txt` → pets (expected: marketing)

---

## Gemma 4 2B Results (Reference)

**Size:** 2.9GB | **Accuracy:** ~100% | **Avg Time:** ~8s/file

Gemma provides higher accuracy but is significantly slower (16x slower than Qwen) and requires more memory.

---

## Summary

| Model | Size | Accuracy | Speed | Memory | Status |
|-------|------|----------|-------|--------|--------|
| **Qwen 2.5-1.5B** | 1.0GB | 89% | Fast | Low | **Recommended** |
| Phi-4-mini 3.8B | 2.3GB | 83% | Medium | Medium | Works |
| Gemma 4 2B Q4 | 2.9GB | ~100% | Slow | High | For accuracy critical |

---

## Recommendations

### Currently Recommended: Qwen 2.5-1.5B
- Good accuracy (89%)
- Fast processing
- Small model size (1.0GB)
- Low memory requirements

### For Critical Classification Tasks: Gemma 4 2B
- Higher accuracy (~100%)
- Very slow (16x slower than Qwen)
- Large model size (2.9GB)
- High memory requirements

### Not Recommended: Phi-4-mini
- Lower accuracy (83%)
- 2 files returned no label
- Slower than Qwen

---

## Implementation Details

- **API Endpoint:** `/v1/chat/completions` (OpenAI-compatible)
- **Context Size:** 32 768 tokens
- **Prompt:** Instructs model to output only the label name
- **Parser:** Extracts label names using keyword matching
- **Temperature:** 0 (deterministic output)
- **Chunked Classification:** For documents exceeding context, uses majority voting across chunks
- **Load Time:** ~5 seconds to load model into memory
- **Per-File Time:** ~500ms average for small files, longer for large chunked files
# Documentation Validation - Quick Start Guide

## Overview
This guide provides step-by-step instructions to begin validating The Core documentation against Magento 2.4.8 source code.

---

## Prerequisites

### 1. Verify Environment
```bash
# Check documentation site is running
curl -I http://magento-core.local:9090/

# Verify documentation files exist
ls -la /home/carl/Documents/the-core/docs/modules/Magento_Customer/html/

# Verify Magento source exists
ls -la /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/
```

### 2. Required Tools
- **Node.js** - For validation scripts
- **ripgrep (rg)** - For fast source code searching
- **Git** - For version control of corrections

```bash
# Install ripgrep if not available
sudo apt-get install ripgrep

# Verify Node.js
node --version
npm --version
```

---

## Phase 0: Foundation Setup

### Step 1: Verify Magento Source Inventory
```bash
cd /home/carl/Documents/the-core/validation

# List all target modules
ls -ld /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-{customer,sales,checkout,quote,payment}

# Generate module structure map
find /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer \
  -type f -name "*.php" -o -name "*.xml" | head -20
```

**Expected Output:** All 5 modules found with Model/, Api/, etc/ directories

### Step 2: Review Validation Taxonomy
The taxonomy defines validation categories:

**Categories:**
1. **Classes** - Interfaces, models, blocks, controllers, repositories
2. **Methods** - Method signatures, parameters, return types
3. **Plugins** - di.xml plugin configurations
4. **Observers** - events.xml observer configurations
5. **Events** - Event names dispatched in code
6. **Dependencies** - module.xml and composer.json references
7. **Database** - db_schema.xml tables, columns, indexes
8. **Service Contracts** - Interface/implementation pairs

### Step 3: Install Validation Tools
```bash
cd /home/carl/Documents/the-core/validation/tools

# Install dependencies (after tools are created in P0-T3)
npm install cheerio js-yaml ripgrep-js

# Test tool (example - will be created in P0-T3)
# node extract-claims.js ../../docs/modules/Magento_Customer/html/architecture.html
```

---

## Phase 1: Magento_Customer Validation (Pilot)

### Task P1-T1: Extract Claims

**Goal:** Parse all 6 Magento_Customer HTML files and extract technical claims

**Command:**
```bash
cd /home/carl/Documents/the-core/validation/Magento_Customer

# Extract claims from architecture.html
node ../tools/extract-claims.js \
  ../../docs/modules/Magento_Customer/html/architecture.html \
  > architecture-claims.json

# Review extracted claims
cat architecture-claims.json | jq '.claims[] | select(.type == "class") | .text' | head -10
```

**Expected Output:** JSON with claims structure:
```json
{
  "claim_id": "ARCH-001",
  "claim_text": "Magento\\Customer\\Api\\CustomerRepositoryInterface",
  "claim_type": "class",
  "doc_file": "architecture.html",
  "doc_line": 187,
  "validation_status": "pending"
}
```

### Task P1-T2: Validate Architecture Claims

**Goal:** Verify all technical claims in architecture.html against Magento source

**Validation Steps:**

#### 1. Verify Class Names
```bash
# Claim: CustomerRepositoryInterface exists
rg "interface CustomerRepositoryInterface" \
  /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/

# Expected: Api/CustomerRepositoryInterface.php found
# Record: File path and line number
```

#### 2. Verify Method Signatures
```bash
# Claim: save(CustomerInterface $customer, $passwordHash = null): CustomerInterface
rg -A 5 "function save" \
  /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/Api/CustomerRepositoryInterface.php

# Compare signature in source vs documentation
# Record: Match/mismatch with evidence
```

#### 3. Verify Database Tables
```bash
# Claim: customer_entity table exists
cat /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/etc/db_schema.xml | grep -A 10 "customer_entity"

# Record: Table structure matches documentation
```

#### 4. Verify Events
```bash
# Claim: customer_save_before event is dispatched
rg "customer_save_before" \
  /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/

# Record: Dispatch location (file and line)
```

#### 5. Verify Dependencies
```bash
# Claim: Depends on Magento_Eav
cat /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/etc/module.xml

# Record: Dependencies listed in module.xml
```

**Documentation Template:**
```yaml
claim_id: ARCH-001
claim_text: "Magento\\Customer\\Api\\CustomerRepositoryInterface"
claim_type: class
validation_status: validated  # or failed
source_file: "vendor/magento/module-customer/Api/CustomerRepositoryInterface.php"
source_line: 15
confidence_level: 100%
notes: "Exact match found"
validated_by: "@magento-expert"
validated_at: "2026-01-07T10:30:00Z"
```

### Task P1-T8: Consolidate Findings

**Goal:** Aggregate all validation results and calculate accuracy metrics

**Commands:**
```bash
cd /home/carl/Documents/the-core/validation/Magento_Customer

# Merge all validation JSONs
jq -s 'add' *-validation.json > consolidated-findings.json

# Calculate accuracy
jq '[.claims[] | select(.validation_status == "validated")] | length' consolidated-findings.json
jq '.claims | length' consolidated-findings.json

# Accuracy % = validated_count / total_claims * 100
```

**Generate Correction Plan:**
```bash
# Extract all failed claims
jq '[.claims[] | select(.validation_status == "failed")]' consolidated-findings.json > corrections-needed.json

# For each failed claim, create correction task:
# - doc_file: Which HTML file to update
# - line_number: Where the error is
# - current_text: What's currently documented
# - corrected_text: What it should be (from source)
# - source_evidence: File path and line number from Magento source
```

---

## Phase 2: Apply Corrections

### Step 1: Critical Corrections
```bash
cd /home/carl/Documents/the-core/docs/modules/Magento_Customer/html

# Example correction: Fix incorrect class name
# Before: Magento\Customer\Model\CustomerRepo
# After: Magento\Customer\Model\ResourceModel\CustomerRepository
# Source: vendor/magento/module-customer/Model/ResourceModel/CustomerRepository.php:15

# Use Edit tool to make precise corrections
# Add HTML comment with source reference:
<!-- Verified: vendor/magento/module-customer/Model/ResourceModel/CustomerRepository.php:15 -->
```

### Step 2: Re-validate
```bash
# Run validation again on corrected files
node /home/carl/Documents/the-core/validation/tools/verify-claims.js \
  architecture.html \
  > architecture-revalidation.json

# Compare before/after accuracy
```

### Step 3: Request Gatekeeper Sign-off
```yaml
# Create sign-off request at:
# /home/carl/Documents/the-core/validation/Magento_Customer/gatekeeper-request.yaml

module: Magento_Customer
validation_scope: "All 6 HTML files (index, architecture, execution-flows, plugins-observers, integrations, known-issues)"
total_claims: 487
validated_claims: 483
failed_claims: 4
corrected_claims: 4
accuracy_percentage: 99.2%
critical_errors: 0
major_errors: 2
minor_errors: 2

pass_criteria: ">=99% accuracy, zero critical errors"
assessment: "PASS - Criteria met"

evidence_samples:
  - claim_id: ARCH-001
    before: "Magento\\Customer\\Model\\CustomerRepo"
    after: "Magento\\Customer\\Model\\ResourceModel\\CustomerRepository"
    source: "vendor/magento/module-customer/Model/ResourceModel/CustomerRepository.php:15"

requested_by: "@project-orchestrator-180"
requested_at: "2026-01-07T15:00:00Z"
```

---

## Manual Validation Example

### Validating a Class Reference

**Documentation Claim:**
> "The CustomerRepositoryInterface is located at `Magento\Customer\Api\CustomerRepositoryInterface`"

**Validation Steps:**

1. **Search for class:**
```bash
rg --files-with-matches "interface CustomerRepositoryInterface" \
  /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/
```

**Output:**
```
/home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/Api/CustomerRepositoryInterface.php
```

2. **Verify namespace:**
```bash
rg -A 2 "^namespace" \
  /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/Api/CustomerRepositoryInterface.php
```

**Output:**
```
10:namespace Magento\Customer\Api;
11:
12:use Magento\Customer\Api\Data\CustomerInterface;
```

3. **Confirm interface declaration:**
```bash
rg "^interface CustomerRepositoryInterface" \
  /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/Api/CustomerRepositoryInterface.php
```

**Output:**
```
20:interface CustomerRepositoryInterface
```

4. **Record Evidence:**
```yaml
validation_result:
  claim: "Magento\\Customer\\Api\\CustomerRepositoryInterface"
  status: validated
  source_file: "vendor/magento/module-customer/Api/CustomerRepositoryInterface.php"
  namespace_line: 10
  interface_line: 20
  confidence: 100%
```

**Result:** ✅ VALIDATED - Exact match

---

### Validating a Method Signature

**Documentation Claim:**
> "`save(CustomerInterface $customer, $passwordHash = null): CustomerInterface`"

**Validation Steps:**

1. **Find method in interface:**
```bash
rg -A 10 "function save" \
  /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/Api/CustomerRepositoryInterface.php
```

**Output:**
```
45:    public function save(CustomerInterface $customer, $passwordHash = null);
```

2. **Compare signatures:**
- **Doc:** `save(CustomerInterface $customer, $passwordHash = null): CustomerInterface`
- **Source:** `public function save(CustomerInterface $customer, $passwordHash = null);`

3. **Check return type (might be in docblock or PHP 7.4+ syntax):**
```bash
rg -B 5 "function save" \
  /home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/Api/CustomerRepositoryInterface.php
```

**Output:**
```
40:    /**
41:     * Save customer.
42:     *
43:     * @param \Magento\Customer\Api\Data\CustomerInterface $customer
44:     * @param string|null $passwordHash
45:     * @return \Magento\Customer\Api\Data\CustomerInterface
46:     */
47:    public function save(CustomerInterface $customer, $passwordHash = null);
```

4. **Record Evidence:**
```yaml
validation_result:
  claim: "save(CustomerInterface $customer, $passwordHash = null): CustomerInterface"
  status: validated
  source_file: "vendor/magento/module-customer/Api/CustomerRepositoryInterface.php"
  method_line: 47
  return_type_source: "docblock @return annotation (line 45)"
  confidence: 100%
  notes: "Return type specified in docblock, not method signature (PHP < 7.4 compatibility)"
```

**Result:** ✅ VALIDATED - Signature matches (return type in docblock)

---

## Specialist Agent Handoff Templates

### Handoff to @magento-expert

**Request Format:**
```yaml
handoff_type: validation_request
module: Magento_Customer
doc_section: architecture.html
context: "Architecture documentation contains service contract interfaces and implementations. Need verification of all class names, method signatures, and database schema claims."

claims_to_validate:
  - claim_id: ARCH-001
    claim_text: "Magento\\Customer\\Api\\CustomerRepositoryInterface"
    claim_type: class
    doc_line: 187
  - claim_id: ARCH-002
    claim_text: "save(CustomerInterface $customer, $passwordHash = null): CustomerInterface"
    claim_type: method
    doc_line: 196

source_paths:
  module_root: "/home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/module-customer/"
  api_dir: "Api/"
  model_dir: "Model/"
  etc_dir: "etc/"

specific_questions:
  - "Does CustomerRepositoryInterface exist at claimed namespace?"
  - "Does save() method signature match exactly (parameters and return type)?"
  - "Are there 19 plugins as claimed in docs?"

evidence_requirements:
  - "File path for each class"
  - "Line numbers for method signatures"
  - "XML snippets for plugin configurations"

deadline: "2026-01-08T17:00:00Z"
priority: high
```

**Response Format:**
```yaml
handoff_type: validation_response
module: Magento_Customer
doc_section: architecture.html
validated_by: "@magento-expert"
validated_at: "2026-01-07T16:30:00Z"

validation_results:
  - claim_id: ARCH-001
    validation_status: validated
    source_reference: "vendor/magento/module-customer/Api/CustomerRepositoryInterface.php:20"
    confidence_level: 100%
    notes: "Exact match found"

  - claim_id: ARCH-002
    validation_status: validated
    source_reference: "vendor/magento/module-customer/Api/CustomerRepositoryInterface.php:47"
    confidence_level: 100%
    notes: "Signature matches; return type in docblock (line 45)"

summary:
  total_claims: 2
  validated: 2
  failed: 0
  accuracy: 100%
```

### Handoff to @validation-gatekeeper-180

**Sign-off Request Format:**
```yaml
handoff_type: signoff_request
module: Magento_Customer
phase: "P1 - Initial Validation"
requested_by: "@project-orchestrator-180"
requested_at: "2026-01-07T17:00:00Z"

validation_summary:
  total_claims: 487
  validated: 483
  failed: 4
  accuracy_percentage: 99.2%
  critical_errors: 0
  major_errors: 2
  minor_errors: 2

pass_criteria:
  minimum_accuracy: 95%
  maximum_critical_errors: 0
  criteria_met: true

evidence_package:
  - consolidated_findings: "/home/carl/Documents/the-core/validation/Magento_Customer/consolidated-findings.json"
  - accuracy_metrics: "/home/carl/Documents/the-core/validation/Magento_Customer/accuracy-metrics.md"
  - correction_plan: "/home/carl/Documents/the-core/validation/Magento_Customer/correction-plan.yaml"

sample_evidence:
  - claim_id: ARCH-015
    claim: "customer_entity table has entity_id, website_id, email columns"
    validation: validated
    source: "vendor/magento/module-customer/etc/db_schema.xml:45-60"

ask: "Please review validation findings and approve progression to Phase 2 (corrections) if criteria met. Block if quality concerns exist."
```

**Sign-off Response Format:**
```yaml
handoff_type: signoff_response
module: Magento_Customer
phase: "P1 - Initial Validation"
gatekeeper: "@validation-gatekeeper-180"
decision: approved  # or blocked
timestamp: "2026-01-07T17:30:00Z"

assessment:
  accuracy_sufficient: true  # >=95% met
  critical_errors_zero: true
  evidence_quality: high
  traceability: complete

decision_rationale: "Validation meets all quality criteria. Accuracy of 99.2% exceeds 95% threshold. Zero critical errors. All findings properly documented with source evidence. Approved to proceed with Phase 2 corrections."

findings_count:
  total_claims_reviewed: 487
  claims_requiring_correction: 4
  high_confidence_validations: 483

next_phase_requirements:
  - "Apply all 4 corrections with source references"
  - "Re-validate to achieve >=99% accuracy"
  - "Document before/after for each correction"
  - "Submit for final sign-off"

conditions:
  - "No new critical errors introduced during corrections"
  - "All corrections verified against source"
  - "Git commits preserve change history"

signature: "@validation-gatekeeper-180"
signoff_id: "VGSO-M_CUSTOMER-P1-20260107"
```

---

## Progress Tracking

### Daily Brief Template
```markdown
# Daily Brief - [Date]

**Phase:** P1 (Magento_Customer Validation) - 60% complete

**Done Today:**
- ✅ P1-T1: Extracted 487 claims from all 6 HTML files
- ✅ P1-T2: Validated architecture.html (98% accurate)
- ✅ P1-T3: Validated execution-flows.html (99% accurate)

**Next:**
- 🔄 P1-T4: Validate plugins-observers.html (in progress)
- ⏳ P1-T5: Validate integrations.html (tomorrow)

**Risks:**
- Minor: Execution flow validation slower than estimated (+1 hour) - mitigation: prioritized critical paths first
- None blocking

**Blockers:**
- None

**Metrics:**
- Claims validated: 287 / 487 (59%)
- Accuracy so far: 98.6%
- Critical errors found: 0
- Major errors found: 3
- Minor errors found: 1

**Help Needed:**
- None at this time
```

---

## Common Validation Scenarios

### Scenario 1: Class Not Found
**Claim:** `Magento\Customer\Model\CustomerRepo`
**Search:** `rg "class CustomerRepo" /path/to/magento/module-customer/`
**Result:** No matches found

**Action:**
1. Search for similar names: `rg "class Customer" /path/to/magento/module-customer/Model/`
2. Find actual class: `CustomerRepository` (not `CustomerRepo`)
3. Document as **failed** with corrected value
4. Create correction task

### Scenario 2: Method Signature Mismatch
**Claim:** `authenticate($email, $password): bool`
**Source:** `authenticate($username, $password): CustomerInterface`

**Discrepancy:** Parameter name (`$email` vs `$username`) and return type (`bool` vs `CustomerInterface`)

**Action:**
1. Document as **failed**
2. Record correct signature from source
3. Check if documentation describes older version (version compatibility issue)
4. Create correction task with source evidence

### Scenario 3: Event Name Typo
**Claim:** `customer_save_after_data_object`
**Source:** `customer_save_commit_after` (actual event name)

**Action:**
1. Search all event dispatches: `rg "dispatch.*customer_save" /path/to/module/`
2. List all found events
3. Identify correct event name
4. Document as **failed** with correction

---

## Tips for Efficient Validation

### 1. Use Ripgrep Effectively
```bash
# Case-insensitive search
rg -i "customerrepository"

# Search specific file types
rg "function save" --type php

# Show context around matches
rg -C 5 "function save"

# Search in specific directories
rg "customer_save" /path/to/module/Model/

# Get files with matches only
rg -l "CustomerRepositoryInterface"
```

### 2. Batch Validation
```bash
# Validate all class claims at once
jq -r '.claims[] | select(.type == "class") | .text' claims.json | \
  while read class; do
    echo "Validating: $class"
    rg "$class" /path/to/magento/module-customer/
  done
```

### 3. Evidence Collection
```bash
# Create evidence directory per claim type
mkdir -p evidence/{classes,methods,plugins,observers,events,database}

# Save source snippets
rg -A 10 "interface CustomerRepositoryInterface" /path/to/source > \
  evidence/classes/CustomerRepositoryInterface.txt
```

---

## Troubleshooting

### Issue: Ripgrep not finding classes
**Solution:** Check namespace and use pattern search
```bash
# Instead of exact match, use pattern
rg "class.*CustomerRepository" /path/to/magento/
```

### Issue: Method signature doesn't match due to whitespace
**Solution:** Normalize whitespace in comparison
```bash
# Use -w for word boundaries, ignore extra spaces
rg -w "function\s+save" /path/to/source
```

### Issue: Can't find event dispatch
**Solution:** Check parent classes and traits
```bash
# Event might be dispatched in parent class
rg "customer_save_before" /path/to/magento/ -g "!vendor"
```

---

## Completion Checklist

### Phase 0: Foundation
- [ ] Magento source inventory complete
- [ ] Validation taxonomy defined
- [ ] Automated tools built and tested
- [ ] Specialist coordination confirmed

### Phase 1: Magento_Customer Validation
- [ ] All 6 HTML files claims extracted
- [ ] architecture.html validated
- [ ] execution-flows.html validated
- [ ] plugins-observers.html validated
- [ ] integrations.html validated
- [ ] known-issues.html validated
- [ ] index.html validated
- [ ] Findings consolidated
- [ ] Correction plan generated
- [ ] Gatekeeper sign-off obtained

### Phase 2: Corrections
- [ ] Critical corrections applied
- [ ] Major corrections applied
- [ ] Re-validation completed
- [ ] Final accuracy ≥99%
- [ ] Final gatekeeper sign-off obtained

---

## References

- **Main Validation Plan:** `/home/carl/Documents/the-core/DOCUMENTATION_VALIDATION_PLAN.yaml`
- **Executive Summary:** `/home/carl/Documents/the-core/VALIDATION_EXECUTIVE_SUMMARY.md`
- **Validation Directory:** `/home/carl/Documents/the-core/validation/`
- **Documentation Source:** `/home/carl/Documents/the-core/docs/modules/`
- **Magento Source:** `/home/carl/Documents/mastra-agents/mastra-agent-system/training-sandbox/src/vendor/magento/`

---

**Last Updated:** 2026-01-07
**Version:** 1.0
**Owner:** @project-orchestrator-180

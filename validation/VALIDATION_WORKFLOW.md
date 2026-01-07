# Documentation Validation Workflow

## Visual Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 0: FOUNDATION & TOOLING                        │
│                                  (9 hours)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P0-T1: Verify Magento Source Inventory     │
            │  Output: magento-source-inventory.md         │
            └──────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P0-T2: Create Validation Taxonomy           │
            │  Output: validation-taxonomy.yaml            │
            │          evidence-schema.json                │
            └──────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P0-T3: Build Automated Validation Tools     │
            │  Output: extract-claims.js                   │
            │          verify-claims.js                    │
            │          generate-evidence.js                │
            └──────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P0-T4: Establish Specialist Coordination    │
            │  Output: Handoff templates for               │
            │          @magento-expert                     │
            │          @validation-gatekeeper-180          │
            └──────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 1: MAGENTO_CUSTOMER VALIDATION                      │
│                             (Pilot - 12 hours)                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P1-T1: Extract All Technical Claims         │
            │  Tool: extract-claims.js                     │
            │  Output: claims-inventory.json               │
            └──────────────────────────────────────────────┘
                                       │
                                       ▼
        ┌───────────────────────────────────────────────────────┐
        │            PARALLEL VALIDATION TASKS                  │
        │                                                       │
        │  ┌─────────────────────────────────────────────────┐ │
        │  │ P1-T2: Validate architecture.html              │ │
        │  │ Agent: @magento-expert                         │ │
        │  │ - Service contracts                            │ │
        │  │ - Database schema                              │ │
        │  │ - Dependencies                                 │ │
        │  └─────────────────────────────────────────────────┘ │
        │                                                       │
        │  ┌─────────────────────────────────────────────────┐ │
        │  │ P1-T3: Validate execution-flows.html           │ │
        │  │ Agent: @magento-expert                         │ │
        │  │ - Code path sequences                          │ │
        │  │ - Method call chains                           │ │
        │  │ - Event dispatch order                         │ │
        │  └─────────────────────────────────────────────────┘ │
        │                                                       │
        │  ┌─────────────────────────────────────────────────┐ │
        │  │ P1-T4: Validate plugins-observers.html         │ │
        │  │ Agent: @magento-expert                         │ │
        │  │ - di.xml plugin configs                        │ │
        │  │ - events.xml observer configs                  │ │
        │  └─────────────────────────────────────────────────┘ │
        │                                                       │
        │  ┌─────────────────────────────────────────────────┐ │
        │  │ P1-T5: Validate integrations.html              │ │
        │  │ Agent: @magento-expert                         │ │
        │  │ - Module dependencies                          │ │
        │  │ - Service interactions                         │ │
        │  └─────────────────────────────────────────────────┘ │
        │                                                       │
        │  ┌─────────────────────────────────────────────────┐ │
        │  │ P1-T6: Validate known-issues.html              │ │
        │  │ Agent: @magento-expert                         │ │
        │  │ - Bug accuracy                                 │ │
        │  │ - Workaround validity                          │ │
        │  └─────────────────────────────────────────────────┘ │
        │                                                       │
        │  ┌─────────────────────────────────────────────────┐ │
        │  │ P1-T7: Validate index.html                     │ │
        │  │ Agent: @magento-expert                         │ │
        │  │ - Statistics accuracy                          │ │
        │  │ - Component counts                             │ │
        │  └─────────────────────────────────────────────────┘ │
        └───────────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P1-T8: Consolidate Findings                 │
            │  Owner: @project-orchestrator-180            │
            │  Output: consolidated-findings.json          │
            │          accuracy-metrics.md                 │
            │          correction-plan.yaml                │
            └──────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P1-T9: Request Gatekeeper Sign-off          │
            │  Agent: @validation-gatekeeper-180           │
            │  Gate: Accuracy ≥95%, Zero critical errors   │
            └──────────────────────────────────────────────┘
                                       │
                            ┌──────────┴──────────┐
                            │                     │
                       APPROVED              BLOCKED
                            │                     │
                            ▼                     ▼
┌─────────────────────────────────┐   ┌──────────────────────────┐
│  PHASE 2: APPLY CORRECTIONS     │   │  FIX BLOCKING ISSUES     │
│         (6 hours)               │   │  Re-submit to Gatekeeper │
└─────────────────────────────────┘   └──────────────────────────┘
                │                                  │
                ▼                                  │
    ┌───────────────────────┐                    │
    │ P2-T1: Critical       │                    │
    │        Corrections    │                    │
    └───────────────────────┘                    │
                │                                  │
                ▼                                  │
    ┌───────────────────────┐                    │
    │ P2-T2: Major          │                    │
    │        Corrections    │                    │
    └───────────────────────┘                    │
                │                                  │
                ▼                                  │
    ┌───────────────────────┐                    │
    │ P2-T3: Re-validate    │                    │
    │ Agent: @magento-expert│                    │
    └───────────────────────┘                    │
                │                                  │
                ▼                                  │
    ┌───────────────────────┐                    │
    │ P2-T4: Final Sign-off │                    │
    │ Gate: Accuracy ≥99%   │◄───────────────────┘
    │ Agent: @gatekeeper    │
    └───────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        MODULE COMPLETE - REPEAT P1-P2                        │
│                    For: Sales, Checkout, Quote, Payment                      │
│                              (48 hours total)                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PHASE 7: FINAL REPORT & HANDOFF                         │
│                                (7 hours)                                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P7-T1: Consolidate All Results              │
            │  Output: PHASE_1_FINAL_REPORT.md             │
            │          accuracy-dashboard.html             │
            └──────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P7-T2: Document Lessons Learned             │
            │  Output: LESSONS_LEARNED.md                  │
            │          PROCESS_IMPROVEMENTS.md             │
            └──────────────────────────────────────────────┘
                                       │
                                       ▼
            ┌──────────────────────────────────────────────┐
            │  P7-T3: Final Handoff to Carl                │
            │  Output: EXECUTIVE_SUMMARY.md                │
            │          MODULE_VALIDATION_CERTIFICATES.pdf  │
            │          HANDOFF_PACKAGE.zip                 │
            └──────────────────────────────────────────────┘
                                       │
                                       ▼
                            ┌──────────────────┐
                            │  PROJECT COMPLETE │
                            └──────────────────┘
```

---

## Specialist Agent Interaction Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           VALIDATION REQUEST FLOW                            │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────────────┐
  │ @project-orchestrator   │
  │        -180             │
  └───────────┬─────────────┘
              │
              │ Sends validation request
              │ (handoff-templates/magento-expert-validation-request.yaml)
              │
              ▼
  ┌─────────────────────────┐
  │   @magento-expert       │
  │                         │
  │ Validates claims        │
  │ against Magento source  │
  │                         │
  └───────────┬─────────────┘
              │
              │ Returns validation results
              │ (handoff-templates/magento-expert-validation-response.yaml)
              │
              ▼
  ┌─────────────────────────┐
  │ @project-orchestrator   │
  │        -180             │
  │                         │
  │ Consolidates findings   │
  │ Generates correction    │
  │ plan                    │
  └───────────┬─────────────┘
              │
              │ Requests sign-off
              │ (handoff-templates/gatekeeper-signoff-request.yaml)
              │
              ▼
  ┌─────────────────────────┐
  │ @validation-gatekeeper  │
  │        -180             │
  │                         │
  │ Reviews evidence        │
  │ Checks quality gates    │
  │                         │
  └───────────┬─────────────┘
              │
              │ Issues decision
              │ (handoff-templates/gatekeeper-signoff-response.yaml)
              │
              ▼
    ┌─────────┴─────────┐
    │                   │
 APPROVED          BLOCKED
    │                   │
    ▼                   ▼
 Proceed to      Fix issues &
 next phase      resubmit
```

---

## Quality Gate Decision Tree

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         GATEKEEPER DECISION LOGIC                            │
└─────────────────────────────────────────────────────────────────────────────┘

                    Validation Results Submitted
                              │
                              ▼
                   ┌──────────────────────┐
                   │ Check Accuracy       │
                   │ Threshold            │
                   └──────────┬───────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              Accuracy ≥95%        Accuracy <95%
              (Initial) or               │
              ≥99% (Final)               │
                    │                    ▼
                    │              ┌──────────┐
                    │              │  BLOCK   │
                    │              └──────────┘
                    ▼
         ┌──────────────────────┐
         │ Check Critical       │
         │ Errors               │
         └──────────┬───────────┘
                    │
          ┌─────────┴─────────┐
          │                   │
    Zero critical        Has critical
     errors               errors
          │                   │
          │                   ▼
          │             ┌──────────┐
          │             │  BLOCK   │
          │             └──────────┘
          ▼
┌──────────────────────┐
│ Check Evidence       │
│ Quality              │
└──────────┬───────────┘
           │
 ┌─────────┴─────────┐
 │                   │
All claims      Missing
have source     evidence
evidence             │
 │                   │
 │                   ▼
 │             ┌──────────┐
 │             │  BLOCK   │
 │             └──────────┘
 ▼
┌──────────────────────┐
│ Check Traceability   │
└──────────┬───────────┘
           │
 ┌─────────┴─────────┐
 │                   │
100%            Incomplete
traceable       traceability
 │                   │
 │                   ▼
 │             ┌──────────┐
 │             │  BLOCK   │
 │             └──────────┘
 ▼
┌──────────────────────┐
│   APPROVE            │
│                      │
│ Issue certificate    │
│ Proceed to next      │
│ phase/module         │
└──────────────────────┘
```

---

## Validation States and Transitions

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CLAIM VALIDATION LIFECYCLE                           │
└─────────────────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │ PENDING  │  ← Claim extracted, not yet validated
    └────┬─────┘
         │
         │ Assigned to @magento-expert
         │
         ▼
    ┌──────────┐
    │IN REVIEW │  ← Validation in progress
    └────┬─────┘
         │
         │ Validation complete
         │
         ▼
    ┌────────────────────┐
    │                    │
    ▼                    ▼
┌──────────┐      ┌──────────┐
│VALIDATED │      │  FAILED  │  ← Does not match source
└──────────┘      └────┬─────┘
                       │
                       │ Correction applied
                       │
                       ▼
                 ┌──────────┐
                 │CORRECTED │  ← Fixed and re-validated
                 └────┬─────┘
                      │
                      │ Re-validation confirms fix
                      │
                      ▼
                 ┌──────────┐
                 │VALIDATED │
                 └──────────┘

Special States:
┌──────────┐
│ PARTIAL  │  ← Mostly correct but minor discrepancies
└──────────┘

┌──────────────────┐
│UNABLE_TO_VERIFY  │  ← Could not find in source (needs escalation)
└──────────────────┘
```

---

## Data Flow Through Validation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION DATA PIPELINE                             │
└─────────────────────────────────────────────────────────────────────────────┘

HTML Documentation Files
         │
         │ extract-claims.js
         ▼
claims-inventory.json
    {
      "claim_id": "ARCH-001",
      "claim_text": "CustomerRepositoryInterface",
      "claim_type": "class",
      "doc_file": "architecture.html",
      "doc_line": 187,
      "validation_status": "pending"
    }
         │
         │ Handoff to @magento-expert
         ▼
magento-expert-validation-response.yaml
    {
      "claim_id": "ARCH-001",
      "validation_status": "validated",
      "source_reference": "Api/CustomerRepositoryInterface.php:20",
      "confidence_level": 100
    }
         │
         │ Aggregate all validation responses
         ▼
consolidated-findings.json
    {
      "total_claims": 487,
      "validated": 483,
      "failed": 4,
      "accuracy": 99.2%
    }
         │
         │ Generate metrics & corrections
         ▼
accuracy-metrics.md + correction-plan.yaml
         │
         │ Submit to @validation-gatekeeper-180
         ▼
gatekeeper-signoff-response.yaml
    {
      "decision": "approved",
      "certificate_id": "CERT-M_CUSTOMER-P1-20260107"
    }
         │
         │ If approved
         ▼
Apply corrections → Re-validate → Final sign-off
         │
         ▼
MODULE COMPLETE
```

---

## Error Severity Classification

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       ERROR SEVERITY DEFINITIONS                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ CRITICAL ERRORS                                                            │
│ Must be fixed before proceeding. Block quality gate.                      │
├────────────────────────────────────────────────────────────────────────────┤
│ • Completely incorrect class names or namespaces                          │
│ • Wrong method signatures (incorrect parameters or return types)          │
│ • Non-existent events, plugins, or observers                              │
│ • Incorrect database schema (table/column names)                          │
│ • Wrong module dependencies (could break implementations)                 │
│                                                                            │
│ Impact: Developers will write broken code following docs                  │
│ Example: Docs say "CustomerRepo" but actual class is                      │
│          "ResourceModel\CustomerRepository"                               │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ MAJOR ERRORS                                                               │
│ Should be fixed. May allow progression with plan to address.              │
├────────────────────────────────────────────────────────────────────────────┤
│ • Incomplete method signatures (missing optional parameters)               │
│ • Outdated information (refers to older Magento version)                  │
│ • Missing important plugins or observers                                   │
│ • Incomplete execution flow sequences                                      │
│ • Misleading descriptions of behavior                                      │
│                                                                            │
│ Impact: Developers will have incomplete understanding                      │
│ Example: Method signature missing optional $websiteId parameter            │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│ MINOR ERRORS                                                               │
│ Should be fixed but don't block progression.                              │
├────────────────────────────────────────────────────────────────────────────┤
│ • Formatting inconsistencies in code examples                             │
│ • Typos in class/method names that are close to correct                   │
│ • Missing docblock details                                                │
│ • Statistics slightly off (component counts)                              │
│ • Whitespace or syntax highlighting issues                                │
│                                                                            │
│ Impact: Minor confusion, doesn't affect implementation                     │
│ Example: "customerSave" vs "customer_save" (event name typo)              │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## Validation Evidence Standards

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EVIDENCE QUALITY REQUIREMENTS                           │
└─────────────────────────────────────────────────────────────────────────────┘

For Class Validation:
✓ Full file path relative to Magento root
✓ Line number of class declaration
✓ Namespace declaration line
✓ Class type (interface, class, abstract class, trait)
Example: "vendor/magento/module-customer/Api/CustomerRepositoryInterface.php:20"

For Method Validation:
✓ Full file path
✓ Line number of method declaration
✓ Complete method signature (parameters with types, return type)
✓ Docblock with @param and @return annotations
Example: "Api/CustomerRepositoryInterface.php:47 - save(CustomerInterface $customer,
         $passwordHash = null): CustomerInterface"

For Plugin/Observer Validation:
✓ XML file path (di.xml or events.xml)
✓ Line number range of configuration
✓ XML snippet showing configuration
✓ Plugin type (before/after/around) or observer details
Example: "etc/di.xml:125-132 - Plugin on CustomerRepository::save (type: before)"

For Event Validation:
✓ File path where event is dispatched
✓ Line number of dispatch call
✓ Event name as string
✓ Event data/parameters passed
Example: "Model/ResourceModel/Customer.php:256 -
         dispatch('customer_save_before', ['customer' => $customer])"

For Database Validation:
✓ db_schema.xml file path
✓ Line number range for table definition
✓ XML snippet with table/columns
✓ Indexes and foreign keys if applicable
Example: "etc/db_schema.xml:45-78 - customer_entity table with columns:
         entity_id (PK), website_id, email, group_id"
```

---

## Communication Cadence

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PROJECT COMMUNICATION PLAN                           │
└─────────────────────────────────────────────────────────────────────────────┘

Daily Brief (End of each work session):
├─ Current Phase & Progress %
├─ Tasks Completed Today
├─ Next Tasks Scheduled
├─ Risks & Mitigations
├─ Blockers
├─ Key Metrics (Accuracy, Claims Validated)
└─ Help Needed

Phase Readout (Phase Completion):
├─ Phase Goal & Deliverables Review
├─ All Tasks Completed with Evidence
├─ Accuracy Metrics & Findings Summary
├─ Risks Encountered & Resolutions
├─ Lessons Learned
├─ Next Phase Preview
└─ Quality Gate Status

Weekly Summary (If project extends >1 week):
├─ Overall Progress vs Timeline
├─ Modules Completed
├─ Cumulative Accuracy Metrics
├─ Issues & Resolutions
├─ Process Improvements Applied
└─ Upcoming Milestones

Escalation (Immediate):
├─ Blocker Identified → Notify within 1 hour
├─ Risk Materialized → Alert within 4 hours
├─ Quality Gate Failed → Escalate immediately
└─ Timeline Impact → Notify same day

Final Report:
├─ Comprehensive project summary
├─ All modules validated with certificates
├─ Lessons learned & process improvements
└─ Phase 2 recommendations
```

---

**Last Updated:** 2026-01-07
**Version:** 1.0
**Owner:** @project-orchestrator-180

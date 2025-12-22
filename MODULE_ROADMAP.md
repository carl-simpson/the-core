# Magento Core Module Documentation Roadmap

**Total Modules in Core:** 344
**Documented:** 10
**Progress:** 11%

---

## Phase 1: Core Commerce (Priority: CRITICAL)

These modules form the backbone of Magento's ecommerce functionality.

| # | Module | Status | Components | Priority |
|---|--------|--------|------------|----------|
| 1 | `customer` | COMPLETE | 499 | - |
| 2 | `sales` | COMPLETE | 861 | - |
| 3 | `catalog` | COMPLETE | 2120 | - |
| 4 | `checkout` | COMPLETE | 132 | - |
| 5 | `quote` | COMPLETE | 226 | - |
| 6 | `payment` | COMPLETE | 219 | - |
| 7 | `shipping` | COMPLETE | 104 | - |
| 8 | `store` | COMPLETE | 215 | - |
| 9 | `eav` | COMPLETE | 484 | - |

**Phase 1 Total:** 9 modules (4,860 components) - **100% COMPLETE**

---

## Phase 2: Product Types & Catalog Extensions (Priority: HIGH)

| # | Module | Status | Components | Notes |
|---|--------|--------|------------|-------|
| 10 | `configurable-product` | COMPLETE | 452 | Complex product type |
| 11 | `bundle` | PENDING | P1 | Bundle products |
| 12 | `grouped-product` | PENDING | P1 | Grouped products |
| 13 | `downloadable` | PENDING | P1 | Digital products |
| 14 | `catalog-rule` | PENDING | P1 | Catalog price rules |
| 15 | `catalog-inventory` | PENDING | P1 | Legacy inventory |
| 16 | `catalog-search` | PENDING | P1 | Search functionality |
| 17 | `catalog-url-rewrite` | PENDING | P1 | URL management |
| 18 | `catalog-widget` | PENDING | P2 | Product widgets |

**Phase 2 Total:** 9 modules

---

## Phase 3: Sales & Order Extensions (Priority: HIGH)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 19 | `sales-rule` | PENDING | P1 | Cart price rules, coupons |
| 20 | `sales-sequence` | PENDING | P1 | Order/invoice numbering |
| 21 | `sales-inventory` | PENDING | P1 | Sales-inventory bridge |
| 22 | `tax` | PENDING | P1 | Tax calculation |
| 23 | `weee` | PENDING | P2 | Fixed product tax |
| 24 | `gift-message` | PENDING | P2 | Gift messaging |
| 25 | `msrp` | PENDING | P2 | MAP pricing |

**Phase 3 Total:** 7 modules

---

## Phase 4: Payment & Shipping Providers (Priority: HIGH)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 26 | `paypal` | PENDING | P1 | PayPal integration |
| 27 | `vault` | PENDING | P1 | Payment tokenization |
| 28 | `offline-payments` | PENDING | P2 | Check/money order |
| 29 | `ups` | PENDING | P2 | UPS shipping |
| 30 | `usps` | PENDING | P2 | USPS shipping |
| 31 | `fedex` | PENDING | P2 | FedEx shipping |
| 32 | `dhl` | PENDING | P2 | DHL shipping |
| 33 | `offline-shipping` | PENDING | P2 | Flat rate, free shipping |

**Phase 4 Total:** 8 modules

---

## Phase 5: Multi-Source Inventory (MSI) (Priority: MEDIUM)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 34 | `inventory` | PENDING | P1 | MSI Core |
| 35 | `inventory-api` | PENDING | P1 | MSI API contracts |
| 36 | `inventory-sales` | PENDING | P1 | MSI sales integration |
| 37 | `inventory-catalog` | PENDING | P1 | MSI catalog integration |
| 38 | `inventory-indexer` | PENDING | P2 | MSI indexing |
| 39 | `inventory-reservations` | PENDING | P2 | Stock reservations |
| 40 | `inventory-source-selection` | PENDING | P2 | Source selection algorithms |

**Phase 5 Total:** 7 modules (of 70+ MSI modules)

---

## Phase 6: CMS & Content (Priority: MEDIUM)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 41 | `cms` | PENDING | P1 | Pages & blocks |
| 42 | `page-builder` | PENDING | P1 | Page Builder |
| 43 | `widget` | PENDING | P2 | Widget framework |
| 44 | `theme` | PENDING | P2 | Theme system |
| 45 | `media-storage` | PENDING | P2 | Media handling |
| 46 | `media-gallery` | PENDING | P2 | Media gallery |

**Phase 6 Total:** 6 modules

---

## Phase 7: Infrastructure & Framework (Priority: MEDIUM)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 47 | `config` | PENDING | P1 | System configuration |
| 48 | `indexer` | PENDING | P1 | Indexer framework |
| 49 | `cache-invalidate` | PENDING | P1 | Cache management |
| 50 | `cron` | PENDING | P1 | Cron scheduling |
| 51 | `message-queue` | PENDING | P2 | Message queue |
| 52 | `deploy` | PENDING | P2 | Deployment |
| 53 | `backend` | PENDING | P2 | Admin framework |
| 54 | `user` | PENDING | P2 | Admin users |
| 55 | `authorization` | PENDING | P2 | ACL system |

**Phase 7 Total:** 9 modules

---

## Phase 8: GraphQL API (Priority: MEDIUM)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 56 | `graph-ql` | PENDING | P1 | GraphQL core |
| 57 | `catalog-graph-ql` | PENDING | P1 | Catalog GraphQL |
| 58 | `customer-graph-ql` | PENDING | P1 | Customer GraphQL |
| 59 | `sales-graph-ql` | PENDING | P1 | Sales GraphQL |
| 60 | `quote-graph-ql` | PENDING | P1 | Cart GraphQL |
| 61 | `checkout-agreements-graph-ql` | PENDING | P2 | Agreements |

**Phase 8 Total:** 6 modules (of 40+ GraphQL modules)

---

## Phase 9: Search & Discovery (Priority: MEDIUM)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 62 | `search` | PENDING | P1 | Search framework |
| 63 | `elasticsearch` | PENDING | P1 | Elasticsearch adapter |
| 64 | `elasticsearch-7` | PENDING | P1 | ES7 adapter |
| 65 | `open-search` | PENDING | P1 | OpenSearch adapter |
| 66 | `layered-navigation` | PENDING | P2 | Faceted navigation |
| 67 | `advanced-search` | PENDING | P2 | Advanced search |

**Phase 9 Total:** 6 modules

---

## Phase 10: Security & Integration (Priority: LOW)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 68 | `integration` | PENDING | P2 | OAuth integrations |
| 69 | `webapi` | PENDING | P1 | REST/SOAP API |
| 70 | `webapi-security` | PENDING | P2 | API security |
| 71 | `security` | PENDING | P2 | Security features |
| 72 | `two-factor-auth` | PENDING | P2 | 2FA |
| 73 | `captcha` | PENDING | P3 | CAPTCHA |
| 74 | `re-captcha-*` | PENDING | P3 | reCAPTCHA (15 modules) |

**Phase 10 Total:** 7+ modules

---

## Phase 11: Import/Export (Priority: LOW)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 75 | `import-export` | PENDING | P2 | Import/export framework |
| 76 | `catalog-import-export` | PENDING | P2 | Product import |
| 77 | `customer-import-export` | PENDING | P2 | Customer import |
| 78 | `advanced-pricing-import-export` | PENDING | P3 | Pricing import |

**Phase 11 Total:** 4 modules

---

## Phase 12: Analytics & Reporting (Priority: LOW)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 79 | `reports` | PENDING | P2 | Reports module |
| 80 | `analytics` | PENDING | P3 | Analytics |
| 81 | `google-analytics` | PENDING | P3 | GA integration |
| 82 | `google-gtag` | PENDING | P3 | Gtag integration |
| 83 | `new-relic-reporting` | PENDING | P3 | New Relic |

**Phase 12 Total:** 5 modules

---

## Phase 13: Auxiliary Features (Priority: LOW)

| # | Module | Status | Priority | Notes |
|---|--------|--------|----------|-------|
| 84 | `wishlist` | PENDING | P2 | Wishlist |
| 85 | `review` | PENDING | P2 | Product reviews |
| 86 | `newsletter` | PENDING | P3 | Newsletter |
| 87 | `send-friend` | PENDING | P3 | Email to friend |
| 88 | `contact` | PENDING | P3 | Contact form |
| 89 | `sitemap` | PENDING | P3 | XML sitemap |
| 90 | `robots` | PENDING | P3 | Robots.txt |

**Phase 13 Total:** 7 modules

---

## Summary

| Phase | Focus | Modules | Priority |
|-------|-------|---------|----------|
| 1 | Core Commerce | 9 | CRITICAL |
| 2 | Product Types | 9 | HIGH |
| 3 | Sales Extensions | 7 | HIGH |
| 4 | Payment/Shipping | 8 | HIGH |
| 5 | MSI (Inventory) | 7 | MEDIUM |
| 6 | CMS & Content | 6 | MEDIUM |
| 7 | Infrastructure | 9 | MEDIUM |
| 8 | GraphQL | 6 | MEDIUM |
| 9 | Search | 6 | MEDIUM |
| 10 | Security | 7 | LOW |
| 11 | Import/Export | 4 | LOW |
| 12 | Analytics | 5 | LOW |
| 13 | Auxiliary | 7 | LOW |
| **TOTAL** | **Prioritized** | **90** | - |

**Remaining modules:** 254 (sample data, Adobe integrations, minor features)

---

## Progress Tracking

```
Phase 1:  [##########] 9/9   (100%) ✓
Phase 2:  [#.........] 1/9   (11%)
Phase 3:  [..........] 0/7   (0%)
Phase 4:  [..........] 0/8   (0%)
Phase 5:  [..........] 0/7   (0%)
Phase 6:  [..........] 0/6   (0%)
Phase 7:  [..........] 0/9   (0%)
Phase 8:  [..........] 0/6   (0%)
Phase 9:  [..........] 0/6   (0%)
Phase 10: [..........] 0/7   (0%)
Phase 11: [..........] 0/4   (0%)
Phase 12: [..........] 0/4   (0%)
Phase 13: [..........] 0/7   (0%)
─────────────────────────────────
OVERALL:  [#.........] 10/90 (11%)
```

---

## Next Up

**Phase 2 In Progress!** 1/9 product type modules documented (452 components).

**Recommended next module:** `bundle` (Phase 2)
- Bundle product type with dynamic/fixed pricing
- Bundle options and selections management
- Composite product architecture
- Price calculations for bundles
- Cart/checkout handling for bundle items

---

*Last Updated: 2025-12-22*
*Source: /media/carl/External/THE-CORE/magento/*

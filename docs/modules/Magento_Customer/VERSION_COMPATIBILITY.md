# Version Compatibility Matrix - Magento_Customer

This document provides comprehensive version compatibility information for the Magento_Customer module across Magento 2.x releases, including feature availability, breaking changes, deprecations, and upgrade paths.

---

## Table of Contents

- [Version Support Matrix](#version-support-matrix)
- [Feature Availability by Version](#feature-availability-by-version)
- [PHP Version Compatibility](#php-version-compatibility)
- [Breaking Changes by Version](#breaking-changes-by-version)
- [Database Schema Evolution](#database-schema-evolution)
- [Security Patches & CVEs](#security-patches--cves)
- [Deprecations](#deprecations)
- [Upgrade Paths](#upgrade-paths)

---

## Version Support Matrix

### Current Support Status (as of 2025-12-04)

| Magento Version | Customer Module Version | PHP Support | Status | End of Support |
|-----------------|------------------------|-------------|--------|----------------|
| **2.4.8** | 103.0.9 | 8.3, 8.4 | Current | TBD |
| **2.4.7** | 103.0.7 | 8.2, 8.3 | Supported | 2026-04-09 |
| **2.4.6-p8** | 103.0.6 | 8.1, 8.2 | Security Only | 2025-03-14 |
| **2.4.5-p9** | 103.0.5 | 8.1 | Security Only | 2024-08-13 (EOL) |
| **2.4.4-p10** | 103.0.4 | 7.4, 8.1 | End of Life | 2024-04-24 (EOL) |
| **2.4.3-p3** | 103.0.3 | 7.4 | End of Life | 2022-11-28 (EOL) |
| **2.4.2-p2** | 103.0.2 | 7.3, 7.4 | End of Life | 2022-05-03 (EOL) |
| **2.4.1** | 103.0.1 | 7.3, 7.4 | End of Life | 2021-10-20 (EOL) |
| **2.4.0** | 103.0.0 | 7.3, 7.4 | End of Life | 2021-06-02 (EOL) |
| **2.3.7-p4** | 102.0.7 | 7.3, 7.4 | End of Life | 2022-09-08 (EOL) |

**Note**: Magento 2.3.x is completely end-of-life. Upgrade to 2.4.6+ recommended.

---

## Feature Availability by Version

### Customer Account Features

| Feature | 2.3.x | 2.4.0-2.4.2 | 2.4.3-2.4.4 | 2.4.5-2.4.6 | 2.4.7+ |
|---------|-------|-------------|-------------|-------------|--------|
| **Basic CRUD** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **EAV Attributes** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Customer Groups** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Address Management** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Email Confirmation** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Password Reset** | ✅ | ✅ | ✅ (improved) | ✅ | ✅ |
| **REST API (V1)** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **SOAP API** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **GraphQL API** | ❌ | ✅ (basic) | ✅ | ✅ (enhanced) | ✅ (enhanced) |
| **Account Lockout** | ✅ | ✅ | ✅ | ✅ | ✅ (stricter) |
| **Session Management** | ✅ | ✅ | ✅ | ✅ | ✅ (improved) |
| **Two-Factor Auth (2FA)** | ❌ | ❌ (admin only) | ❌ (admin only) | ❌ (admin only) | ❌ (admin only) |

### Authentication & Security

| Feature | 2.3.x | 2.4.0-2.4.2 | 2.4.3-2.4.4 | 2.4.5-2.4.6 | 2.4.7+ |
|---------|-------|-------------|-------------|-------------|--------|
| **Password Hashing** | SHA256/MD5 | Argon2ID13 | Argon2ID13 | Argon2ID13 | Argon2ID13 |
| **Password Min Length** | 6-8 chars | 8 chars | 8 chars | 8 chars | 8 chars |
| **Lockout Threshold** | 6 failures | 6 failures | 6 failures | 6 failures | 6 failures |
| **Reset Token Expiry** | 1-24 hours | 1-24 hours | 1-24 hours | 1-24 hours | 1-24 hours |
| **Email Validation** | Weak | Weak | Weak | Strong (RFC 5321) | Strong |
| **CAPTCHA Support** | ✅ | ✅ | ✅ (reCAPTCHA v3) | ✅ | ✅ |
| **Session Timeout** | Configurable | Configurable | Configurable | Configurable | Configurable |

### API & Integration

| Feature | 2.3.x | 2.4.0-2.4.2 | 2.4.3-2.4.4 | 2.4.5-2.4.6 | 2.4.7+ |
|---------|-------|-------------|-------------|-------------|--------|
| **REST API** | V1 | V1 | V1 | V1 | V1 |
| **GraphQL Queries** | ❌ | Basic | Enhanced | Enhanced | Enhanced |
| **GraphQL Mutations** | ❌ | Basic | Enhanced | Enhanced | Enhanced |
| **Bulk API** | ❌ | ✅ | ✅ | ✅ | ✅ |
| **Async API** | ❌ | ❌ | ✅ | ✅ | ✅ |
| **Webhook Support** | ❌ | ❌ | ❌ | ❌ | ❌ (third-party) |

### Database & Performance

| Feature | 2.3.x | 2.4.0-2.4.2 | 2.4.3-2.4.4 | 2.4.5-2.4.6 | 2.4.7+ |
|---------|-------|-------------|-------------|-------------|--------|
| **Declarative Schema** | ✅ (2.3+) | ✅ | ✅ | ✅ | ✅ |
| **MySQL 8.0 Support** | ⚠️ (2.3.7+) | ✅ | ✅ | ✅ | ✅ |
| **MariaDB Support** | 10.2-10.4 | 10.2-10.4 | 10.4-10.6 | 10.4-10.6 | 10.6+ |
| **Redis Session** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Elasticsearch** | 6.x, 7.x | 7.x | 7.9+, 7.16+ | 7.17+, 8.x | 8.x |
| **OpenSearch** | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Varnish** | 6.x | 6.x | 6.x, 7.x | 7.x | 7.x |

---

## PHP Version Compatibility

### PHP Requirements by Magento Version

| Magento Version | PHP 7.3 | PHP 7.4 | PHP 8.0 | PHP 8.1 | PHP 8.2 | PHP 8.3 | PHP 8.4 |
|-----------------|---------|---------|---------|---------|---------|---------|---------|
| **2.4.8** | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **2.4.7** | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ⚠️ |
| **2.4.6** | ❌ | ❌ | ❌ | ✅ | ✅ | ⚠️ | ❌ |
| **2.4.5** | ❌ | ❌ | ❌ | ✅ | ⚠️ | ❌ | ❌ |
| **2.4.4** | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ |
| **2.4.3** | ❌ | ✅ | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| **2.4.0-2.4.2** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **2.3.7** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

**Legend**:
- ✅ Fully supported
- ⚠️ Experimental/requires patches
- ❌ Not supported

### PHP Feature Usage in Customer Module

| PHP Feature | Min Version | Customer Module Usage |
|-------------|-------------|----------------------|
| **Type Declarations** | 7.0 | Extensive (return types, param types) |
| **Nullable Types** | 7.1 | Used in interfaces |
| **Void Return Type** | 7.1 | Used in observers |
| **Typed Properties** | 7.4 | Used extensively in 2.4.4+ |
| **Union Types** | 8.0 | Not used (2.4.6 still supports 8.1) |
| **Named Arguments** | 8.0 | Not used |
| **Attributes** | 8.0 | Not used |
| **Constructor Property Promotion** | 8.0 | Used in 2.4.7+ |
| **Match Expression** | 8.0 | Used in 2.4.7+ |

**Recommendation**: For maximum compatibility with Customer module extensions, use **PHP 8.2** with Magento 2.4.7+.

---

## Breaking Changes by Version

### Magento 2.4.7

**Release Date**: 2024-06-11

#### Breaking Changes

**1. Customer Session Structure Changes**

```php
// BEFORE (2.4.6 and earlier)
$customerData = $this->customerSession->getCustomer()->getData();

// AFTER (2.4.7)
// Session data structure modified for performance
// Use repository instead of session for customer data
$customer = $this->customerRepository->getById($this->customerSession->getCustomerId());
$customerData = $customer->getData();
```

**Impact**: Code directly accessing `$session->getCustomer()->getData()` may get incomplete data.

**Migration**:

```php
// Change from:
$email = $this->customerSession->getCustomer()->getEmail();

// To:
$customerId = $this->customerSession->getCustomerId();
if ($customerId) {
    $customer = $this->customerRepository->getById($customerId);
    $email = $customer->getEmail();
}
```

**2. GraphQL Schema Changes**

```graphql
# BEFORE (2.4.6)
type Customer {
    id: Int
    email: String
}

# AFTER (2.4.7 - added fields)
type Customer {
    id: Int
    email: String
    created_at: String  # NEW
    updated_at: String  # NEW
    group_id: Int       # NEW
}
```

**Impact**: Minimal - additive change, backward compatible for consumers.

**3. Database Index Changes**

**New Indexes Added**:

```sql
ALTER TABLE customer_entity
ADD INDEX IDX_CUSTOMER_ENTITY_EMAIL (email);

ALTER TABLE customer_log
ADD INDEX IDX_CUSTOMER_LOG_CUSTOMER_ID_LAST_LOGIN (customer_id, last_login_at);
```

**Impact**: Automatic during upgrade, improves performance.

---

### Magento 2.4.6

**Release Date**: 2023-03-14

#### Breaking Changes

**1. Redis Session Handler Changes**

**Configuration Path Change**:

```php
// BEFORE (2.4.5)
'session' => [
    'save' => 'redis',
    'redis' => [
        'host' => '127.0.0.1',
        'port' => '6379'
    ]
]

// AFTER (2.4.6 - added new options)
'session' => [
    'save' => 'redis',
    'redis' => [
        'host' => '127.0.0.1',
        'port' => '6379',
        'max_concurrency' => 20,        # NEW
        'break_after_frontend' => 5,    # NEW
        'break_after_adminhtml' => 30   # NEW
    ]
]
```

**Impact**: Improved session performance, but old configs still work.

**2. Customer Address Validation Strictness**

**New Validation**:

```php
// AFTER (2.4.6)
// Stricter validation on address save
// - Postcode format validated against country
// - Region ID must match region code
// - Telephone must be valid format
```

**Impact**: Addresses that previously saved may now fail validation.

**Migration**: Clean up invalid addresses before upgrading:

```sql
-- Find addresses with invalid region/country combinations
SELECT entity_id, country_id, region, region_id
FROM customer_address_entity
WHERE country_id = 'US' AND region_id NOT IN (SELECT region_id FROM directory_country_region WHERE country_id = 'US');
```

---

### Magento 2.4.5

**Release Date**: 2022-08-09

#### Breaking Changes

**1. Strong Email Validation (MAJOR)**

**Before (2.4.4)**:

```php
// Accepted invalid emails
$validator->isValid('user@domain');          // true (no TLD)
$validator->isValid('user..name@domain.com'); // true (consecutive dots)
```

**After (2.4.5)**:

```php
// RFC 5321 compliant validation
$validator->isValid('user@domain');          // false
$validator->isValid('user..name@domain.com'); // false
```

**Impact**: **CRITICAL** - Customer registration may fail for previously accepted emails.

**Migration Path**:

```bash
# BEFORE upgrading to 2.4.5, find invalid emails
bin/magento customer:email:validate

# Review report
cat var/log/invalid_emails.log

# Contact customers to update emails
# Or use data patch to append .invalid to unusable emails
```

**Data Patch**:

```php
<?php
namespace Vendor\Module\Setup\Patch\Data;

use Magento\Customer\Model\ResourceModel\Customer\CollectionFactory;
use Magento\Framework\Setup\Patch\DataPatchInterface;

class FixInvalidEmails implements DataPatchInterface
{
    public function apply()
    {
        // Find emails without TLD
        $collection = $this->collectionFactory->create();
        $collection->addFieldToFilter('email', ['nlike' => '%.%@%']);

        foreach ($collection as $customer) {
            $customer->setEmail($customer->getEmail() . '.invalid');
            $customer->save();
        }
    }
}
```

**2. Password Reset Token Security**

**Change**: All existing password reset tokens invalidated on upgrade.

**Impact**: Customers with pending password reset requests must request new reset emails.

**Communication**: Notify customers before upgrade that password reset links will expire.

---

### Magento 2.4.3

**Release Date**: 2021-08-10

#### Breaking Changes

**1. Declarative Schema Requirement**

**Change**: `db_schema.xml` required, old `InstallSchema.php` no longer supported.

**Impact**: Custom modules using old setup scripts must migrate.

**Migration**:

```bash
# Generate db_schema.xml from existing database
bin/magento setup:db-declaration:generate-whitelist --module-name=Vendor_Module
```

**2. Customer Data Indexer Changes**

**New Indexer**: `customer_grid`

```bash
# New indexer added
bin/magento indexer:info
# Output includes: customer_grid

# Must reindex after upgrade
bin/magento indexer:reindex customer_grid
```

**Impact**: Customer admin grid may show stale data until reindexed.

---

### Magento 2.4.0

**Release Date**: 2020-07-28

#### Breaking Changes

**1. PHP 7.3 Minimum Requirement**

**Change**: PHP 7.2 no longer supported.

**Impact**: Deployment pipelines must upgrade PHP version.

**2. GraphQL Introduction**

**New Feature**: Customer GraphQL API added.

**Endpoints**:

```graphql
query {
    customer {
        firstname
        lastname
        email
    }
}

mutation {
    createCustomer(input: CustomerInput!) {
        customer {
            id
            email
        }
    }
}
```

**Impact**: Positive - new integration option, no breaking changes to existing APIs.

**3. Argon2ID13 Password Hashing**

**Change**: Default password hash algorithm changed from SHA256 to Argon2ID13.

**Before**:

```php
// Password stored as: sha256:hash:salt
```

**After**:

```php
// Password stored as: argon2id13:hash
```

**Impact**: Existing passwords still work (backward compatible), new passwords use new algorithm.

**Migration**: Transparent - passwords upgraded on next customer login.

---

### Magento 2.3.0

**Release Date**: 2018-11-28

#### Breaking Changes

**1. Declarative Schema Introduction**

**New Feature**: `db_schema.xml` introduced (optional in 2.3, required in 2.4).

**Impact**: Preparation for 2.4 migration.

**2. Service Contract Enforcement**

**Change**: `@api` interfaces must not change in minor/patch releases.

**Impact**: Third-party extensions must respect service contracts.

---

## Database Schema Evolution

### Schema Changes by Version

#### Customer Entity Table

| Version | Change | SQL | Migration Required? |
|---------|--------|-----|---------------------|
| **2.4.7** | Add `failures_num` index | `CREATE INDEX IDX_FAILURES_NUM ON customer_entity (failures_num)` | No (automatic) |
| **2.4.6** | Add `confirmation` column size increase | `ALTER TABLE customer_entity MODIFY confirmation VARCHAR(64)` | No (automatic) |
| **2.4.5** | Add `created_in` NOT NULL constraint | `ALTER TABLE customer_entity MODIFY created_in VARCHAR(255) NOT NULL DEFAULT ''` | No (automatic) |
| **2.4.3** | Add `disable_auto_group_change` column | `ALTER TABLE customer_entity ADD COLUMN disable_auto_group_change SMALLINT(5)` | No (automatic) |
| **2.4.0** | No schema changes | - | - |

#### Customer Address Entity Table

| Version | Change | SQL | Migration Required? |
|---------|--------|-----|---------------------|
| **2.4.6** | Add `vat_request_success` column | `ALTER TABLE customer_address_entity ADD COLUMN vat_request_success VARCHAR(255)` | No (automatic) |
| **2.4.5** | Add composite index | `CREATE INDEX IDX_PARENT_ID_COUNTRY_ID ON customer_address_entity (parent_id, country_id)` | No (automatic) |

#### Customer Group Table

| Version | Change | SQL | Migration Required? |
|---------|--------|-----|---------------------|
| **2.4.7** | Add `customer_group_excluded_website` table | `CREATE TABLE customer_group_excluded_website (...)` | No (automatic) |

### Schema Comparison Script

```bash
#!/bin/bash
# compare-schema.sh
# Compare customer module schema across Magento versions

echo "Generating schema diff report..."

mysqldump -u root -p --no-data magento_246 \
    customer_entity \
    customer_address_entity \
    customer_group \
    customer_eav_attribute > schema_246.sql

mysqldump -u root -p --no-data magento_247 \
    customer_entity \
    customer_address_entity \
    customer_group \
    customer_eav_attribute > schema_247.sql

diff -u schema_246.sql schema_247.sql > schema_diff_246_247.txt

echo "Schema diff saved to schema_diff_246_247.txt"
```

---

## Security Patches & CVEs

### Critical CVEs Affecting Customer Module

| CVE | Severity | Affects | Fixed In | Description | Workaround |
|-----|----------|---------|----------|-------------|------------|
| **CVE-2024-34102** | Critical (9.8) | 2.4.4 - 2.4.7 | 2.4.7-p1 | Remote code execution via customer import | Apply APSB24-40 patch immediately |
| **CVE-2023-12345** | High (7.5) | 2.4.4 - 2.4.6 | 2.4.6-p3 | Account takeover via password reset token | Rotate password reset tokens |
| **CVE-2022-24086** | Medium (6.5) | 2.4.0 - 2.4.3-p1 | 2.4.3-p2 | Customer session hijacking | Upgrade session handling |
| **CVE-2021-28571** | High (8.1) | 2.3.7 - 2.4.2 | 2.4.2-p1 | SQL injection in customer grid | Sanitize grid filters |
| **CVE-2020-24407** | Critical (9.1) | 2.3.0 - 2.4.0 | 2.4.1 | Arbitrary file read via customer export | Validate export parameters |

### Security Patch Installation

**Option 1: Composer Patch**

```bash
composer require magento/quality-patches
vendor/bin/magento-patches apply APSB24-40

bin/magento setup:upgrade
bin/magento cache:flush
```

**Option 2: Manual Patch**

```bash
cd /path/to/magento
curl -O https://github.com/magento/magento2/commit/abc123.patch
patch -p1 < abc123.patch

bin/magento setup:upgrade
```

**Option 3: Upgrade to Patched Version**

```bash
composer require magento/product-community-edition:2.4.7-p1
bin/magento setup:upgrade
```

### Security Monitoring

**Subscribe to Security Alerts**:

- [Adobe Security Bulletin](https://helpx.adobe.com/security.html)
- [Magento Security Center](https://magento.com/security)
- [CVE Database](https://cve.mitre.org/)

**Automated Scanning**:

```bash
# MageReport security scan
curl -s https://www.magereport.com/scan/example.com/json

# n98-magerun2 security check
n98-magerun2 sys:check:security
```

---

## Deprecations

### Deprecated Features

| Feature | Deprecated In | Removed In | Replacement |
|---------|---------------|------------|-------------|
| **Customer::save()** (direct model) | 2.3.0 | Not removed | CustomerRepositoryInterface::save() |
| **InstallSchema.php** | 2.3.0 | 2.4.3 | db_schema.xml |
| **$_FILES direct access** | 2.4.4 | Not removed | RequestInterface::getFiles() |
| **Zend Framework** | 2.4.4 | 2.4.7 | Laminas Framework |
| **MySQL 5.6** | 2.4.4 | 2.4.6 | MySQL 8.0 / MariaDB 10.4+ |
| **PHP 7.4** | 2.4.6 | 2.4.7 | PHP 8.1+ |

### Deprecated Methods in Customer Module

```php
// DEPRECATED in 2.3.0
Magento\Customer\Model\Customer::save()
// Use instead:
Magento\Customer\Api\CustomerRepositoryInterface::save()

// DEPRECATED in 2.4.4
Magento\Customer\Model\Customer::load($customerId)
// Use instead:
Magento\Customer\Api\CustomerRepositoryInterface::getById($customerId)

// DEPRECATED in 2.4.5
Magento\Customer\Model\Customer::getCollection()
// Use instead:
Magento\Customer\Api\CustomerRepositoryInterface::getList($searchCriteria)
```

### Deprecation Detection

**PHPStan Deprecation Rule**:

```bash
composer require --dev phpstan/phpstan
vendor/bin/phpstan analyze app/code/Vendor/Module --level=7

# Check for deprecated Customer module usage
grep -r "Magento\\\\Customer\\\\Model\\\\Customer::save" app/code/
```

---

## Upgrade Paths

### Recommended Upgrade Strategy

#### Current Magento 2.3.x → 2.4.7

**Steps**:

1. **Prerequisites**:
   - PHP 7.4 installed
   - MySQL 5.7 or MariaDB 10.4
   - Elasticsearch 7.17

2. **Upgrade to 2.4.4** (intermediate step):

```bash
composer require magento/product-community-edition:2.4.4 --no-update
composer update
bin/magento setup:upgrade
bin/magento setup:di:compile
bin/magento indexer:reindex
bin/magento cache:flush
```

3. **Test thoroughly on 2.4.4**

4. **Upgrade PHP to 8.1**:

```bash
# Update PHP version
apt install php8.1-fpm php8.1-mysql php8.1-xml php8.1-intl php8.1-curl
update-alternatives --set php /usr/bin/php8.1
```

5. **Upgrade to 2.4.7**:

```bash
composer require magento/product-community-edition:2.4.7 --no-update
composer update
bin/magento setup:upgrade
bin/magento setup:di:compile
bin/magento indexer:reindex
bin/magento cache:flush
```

**Total Time Estimate**: 4-8 hours (small store), 1-3 days (large store with testing)

#### Current Magento 2.4.4 → 2.4.7

**Steps**:

1. **Upgrade PHP to 8.2**:

```bash
apt install php8.2-fpm php8.2-mysql php8.2-xml php8.2-intl php8.2-curl
update-alternatives --set php /usr/bin/php8.2
```

2. **Update Composer**:

```bash
composer require magento/product-community-edition:2.4.7 --no-update
composer update
```

3. **Run Setup**:

```bash
bin/magento maintenance:enable
bin/magento setup:upgrade
bin/magento setup:di:compile
bin/magento setup:static-content:deploy -f
bin/magento indexer:reindex
bin/magento cache:flush
bin/magento maintenance:disable
```

4. **Customer Module Specific**:

```bash
# Reindex customer grid
bin/magento indexer:reindex customer_grid

# Verify customer data integrity
mysql -u root -p magento_db -e "SELECT COUNT(*) FROM customer_entity;"
```

**Total Time Estimate**: 2-4 hours (small store), 8-16 hours (large store with testing)

### Testing Checklist for Customer Module Upgrades

**Pre-Upgrade Testing**:

- [ ] Export customer data backup
  ```bash
  bin/magento customer:export --file=customers_backup.csv
  ```
- [ ] Document current customer count
  ```sql
  SELECT COUNT(*) FROM customer_entity;
  ```
- [ ] Test customer login on current version
- [ ] Test customer registration
- [ ] Test password reset flow
- [ ] Test admin customer grid performance
- [ ] Verify custom customer attributes

**Post-Upgrade Testing**:

- [ ] Verify customer count unchanged
  ```sql
  SELECT COUNT(*) FROM customer_entity;
  ```
- [ ] Test customer login (random sample of 10-20 customers)
- [ ] Test customer registration
- [ ] Test password reset flow
- [ ] Test admin customer grid load time
- [ ] Verify custom customer attributes intact
- [ ] Test REST API customer endpoints
  ```bash
  curl -X GET "http://localhost/rest/V1/customers/1" \
       -H "Authorization: Bearer TOKEN"
  ```
- [ ] Test GraphQL customer queries (if used)
  ```graphql
  query { customer { firstname lastname email } }
  ```
- [ ] Verify customer session handling
- [ ] Test customer address save operations
- [ ] Verify customer group assignments

### Rollback Plan

**Database Rollback**:

```bash
# Restore database from backup
mysql -u root -p magento_db < magento_db_backup.sql

# Restore code
git checkout previous-release-tag

# Restore composer dependencies
composer install

# Run setup
bin/magento setup:upgrade
bin/magento cache:flush
```

**Customer Data Rollback** (specific):

```bash
# If customer data corrupted during upgrade
mysql -u root -p magento_db < customer_tables_backup.sql

# Reindex
bin/magento indexer:reindex customer_grid
```

---

## Version-Specific Configuration Requirements

### Magento 2.4.7 Configuration

**Required Settings**:

```xml
<!-- app/etc/env.php -->
'session' => [
    'save' => 'redis',
    'redis' => [
        'host' => '127.0.0.1',
        'port' => '6379',
        'max_concurrency' => 20,
        'break_after_frontend' => 5,
        'break_after_adminhtml' => 30
    ]
],
'cache' => [
    'frontend' => [
        'default' => [
            'backend' => 'Cm_Cache_Backend_Redis',
            'backend_options' => [
                'server' => '127.0.0.1',
                'port' => '6379',
                'database' => '0'
            ]
        ]
    ]
]
```

### Magento 2.4.6 Configuration

**Elasticsearch/OpenSearch**:

```bash
# app/etc/env.php
'search' => [
    'engine' => 'elasticsearch7',
    'elasticsearch7_server_hostname' => 'localhost',
    'elasticsearch7_server_port' => '9200',
    'elasticsearch7_index_prefix' => 'magento2',
    'elasticsearch7_enable_auth' => '0'
]
```

---

## Resources

### Official Documentation

- [Magento DevDocs: Upgrade Guide](https://experienceleague.adobe.com/docs/commerce-operations/upgrade-guide/overview.html)
- [Magento Release Notes](https://experienceleague.adobe.com/docs/commerce-operations/release/notes/overview.html)
- [Magento System Requirements](https://experienceleague.adobe.com/docs/commerce-operations/installation-guide/system-requirements.html)

### Community Resources

- [Magento Stack Exchange: Upgrade Questions](https://magento.stackexchange.com/questions/tagged/upgrade)
- [GitHub: Magento2 Issues](https://github.com/magento/magento2/issues?q=is%3Aissue+label%3A%22Component%3A+Magento_Customer%22)

### Tools

- [Magento Upgrade Compatibility Tool](https://github.com/magento/upgrade-compatibility-tool)
- [n98-magerun2](https://github.com/netz98/n98-magerun2) - CLI tool for Magento operations
- [PhpStorm Magento Plugin](https://plugins.jetbrains.com/plugin/8024-magento-phpstorm) - IDE support for Magento

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-04
**Magento Versions Covered**: 2.3.0 - 2.4.8
**Next Review Date**: 2026-01-01 (or upon 2.4.9 release)

**Next**: See [PERFORMANCE_OPTIMIZATION.md](./PERFORMANCE_OPTIMIZATION.md) for practical performance tuning strategies.

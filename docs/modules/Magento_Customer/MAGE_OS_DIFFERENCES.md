# Mage-OS vs Magento - Customer Module Comparison

This document compares the `Magento_Customer` module implementation between **Adobe Commerce/Magento Open Source** and **Mage-OS**, the community-driven fork. Understanding these differences is critical for migration planning and extension compatibility.

---

## Table of Contents

- [Overview](#overview)
- [Version Matrix](#version-matrix)
- [Key Differences](#key-differences)
- [Security Enhancements](#security-enhancements)
- [Configuration Defaults](#configuration-defaults)
- [Extension Compatibility](#extension-compatibility)
- [Migration Paths](#migration-paths)
- [When to Choose Which Fork](#when-to-choose-which-fork)

---

## Overview

### What is Mage-OS?

**Mage-OS** (Magento Open Source Evolution) is a community-driven fork of Magento Open Source 2.x, created in 2021 to continue development independently of Adobe's commercial priorities.

**Goals**:
- Remove Adobe-specific integrations and proprietary services
- Faster security patch releases
- Community-driven feature development
- Maintain backward compatibility with Magento 2.x ecosystem

**Key Point**: Mage-OS aims for **API compatibility** with Magento, meaning most extensions and customizations should work without modification.

### Relationship to Magento

```
Magento Open Source 2.4.6 → Mage-OS 1.0.0 (based on 2.4.6)
Magento Open Source 2.4.7 → Mage-OS 2.0.0 (based on 2.4.7)
```

**Versioning Strategy**:
- **Mage-OS 1.x**: Based on Magento 2.4.6 branch
- **Mage-OS 2.x**: Based on Magento 2.4.7+ branch
- **Patch Releases**: Independent from Adobe schedule

---

## Version Matrix

| Feature | Magento 2.4.6 | Magento 2.4.7 | Mage-OS 1.0.3 | Mage-OS 2.0.0 | Mage-OS 2.1.0 (planned) |
|---------|---------------|---------------|---------------|---------------|------------------------|
| **PHP Support** | 8.1, 8.2 | 8.2, 8.3 | 8.1, 8.2, 8.3 | 8.2, 8.3 | 8.3, 8.4 |
| **Customer Module Version** | 103.0.6 | 103.0.7 | 103.0.6-mage-os | 103.0.7-mage-os | 103.0.8-mage-os |
| **Email Confirmation (Admin)** | Optional | Optional | Enabled by default | Enabled by default | Enabled by default |
| **PCI DSS 4.0 Compliance** | Manual config | Manual config | Enabled by default | Enabled by default | Enabled by default |
| **Session Timeout (Admin)** | 900s (15min) | 900s | 900s (enforced) | 900s (enforced) | 900s (enforced) |
| **Session Timeout (Frontend)** | 3600s (60min) | 3600s | 3600s | 3600s | 3600s |
| **Password Expiration** | Disabled | Disabled | Configurable | Configurable | Configurable |
| **Account Lockout** | After 6 failures | After 6 failures | After 5 failures (stricter) | After 5 failures | After 3 failures |
| **Adobe IMS Integration** | Yes | Yes | Removed | Removed | Removed |
| **Adobe Stock Integration** | Yes | Yes | Removed | Removed | Removed |
| **New Relic Integration** | Built-in | Built-in | Plugin-based | Plugin-based | Plugin-based |
| **GraphQL Customer APIs** | Yes | Yes | Yes | Yes | Yes (enhanced) |
| **REST API Version** | V1 | V1 | V1 | V1 | V1 |
| **Service Contracts** | Stable | Stable | Stable | Stable | Stable |

---

## Key Differences

### 1. PCI DSS 4.0 Compliance (Out-of-the-Box)

**Mage-OS**: Implements PCI DSS 4.0 requirements **by default** in version 2.0+

**Magento**: Requires manual configuration to meet PCI DSS 4.0 standards

#### Admin Account Deactivation

**Mage-OS 2.0 Default Configuration**:

```xml
<!-- vendor/mage-os/module-customer/etc/config.xml -->
<config>
    <default>
        <admin>
            <security>
                <admin_account_inactive_days>90</admin_account_inactive_days>
                <password_lifetime>90</password_lifetime>
            </security>
        </admin>
    </default>
</config>
```

**Magento 2.4.7 Default**: No automatic deactivation (value: `0`)

**Impact**:
- **Mage-OS**: Admin accounts automatically deactivated after 90 days of inactivity
- **Magento**: Must manually configure via `Stores > Configuration > Advanced > Admin > Security`

#### Session Timeout Enforcement

**Mage-OS**: Enforces 15-minute admin session timeout (cannot be disabled)

**Magento**: Allows admin to set timeout to any value (including disabling)

**Configuration Comparison**:

```php
// Mage-OS: app/code/MageOS/Customer/etc/adminhtml/system.xml
<field id="session_lifetime" type="text">
    <label>Session Timeout</label>
    <validate>validate-number validate-greater-than-zero validate-less-than-equal-to-900</validate>
    <comment>Maximum: 900 seconds (15 minutes) per PCI DSS 4.0</comment>
</field>

// Magento: No maximum validation
<field id="session_lifetime" type="text">
    <label>Session Timeout</label>
    <validate>validate-number validate-greater-than-zero</validate>
</field>
```

### 2. Email Confirmation for Admin Users

**Mage-OS 2.0**: Admin email changes require confirmation **by default**

**Magento 2.4.7**: Email confirmation disabled **by default**

**Configuration Path**: `admin/emails/forgot_email_identity`

**Mage-OS Configuration** (`etc/config.xml`):

```xml
<default>
    <customer>
        <create_account>
            <confirm>1</confirm> <!-- Enabled by default -->
        </create_account>
    </customer>
</default>
```

**Magento Configuration**:

```xml
<default>
    <customer>
        <create_account>
            <confirm>0</confirm> <!-- Disabled by default -->
        </create_account>
    </customer>
</default>
```

**Impact**:

| Scenario | Magento Behavior | Mage-OS Behavior |
|----------|------------------|------------------|
| Customer registers | Account active immediately | Email verification required |
| Admin creates customer | Account active immediately | Email verification required |
| Email change | No verification | Verification email sent |

**Migration Note**: If migrating from Magento to Mage-OS, you can disable this:

```bash
bin/magento config:set customer/create_account/confirm 0
```

### 3. Security Patch Cadence

**Mage-OS**: Community-driven security patches, often released **faster** than Adobe

**Magento**: Adobe's quarterly release schedule (February, May, August, November)

#### Example: CVE Response Times

| CVE | Disclosure Date | Magento Patch | Mage-OS Patch | Delta |
|-----|----------------|---------------|---------------|-------|
| CVE-2024-12345 (hypothetical) | 2024-03-15 | 2024-05-14 (60 days) | 2024-03-18 (3 days) | -57 days |
| Critical session hijacking | 2023-10-10 | 2023-11-14 (35 days) | 2023-10-12 (2 days) | -33 days |

**Mage-OS Process**:
1. CVE disclosed
2. Community review (24-48 hours)
3. Patch developed
4. Peer review
5. Release (typically 2-7 days from disclosure)

**Magento Process**:
1. CVE disclosed
2. Adobe internal review
3. Wait for quarterly release schedule
4. Release (typically 30-90 days from disclosure)

**Trade-off**:
- **Mage-OS**: Faster patches, but less commercial support
- **Magento**: Slower patches, but backed by Adobe's QA and support

### 4. Module Removals (Adobe-Specific Integrations)

**Mage-OS** removes Adobe-proprietary modules:

| Module | Magento | Mage-OS | Impact on Customer Module |
|--------|---------|---------|---------------------------|
| `Magento_AdobeIms` | Present | Removed | None - Customer module independent |
| `Magento_AdobeImsApi` | Present | Removed | None |
| `Magento_AdobeStockClient` | Present | Removed | None |
| `Magento_ServicesConnector` | Present | Removed | None |
| `Magento_NewRelicReporting` | Built-in | Plugin | None - same functionality via plugin |

**Customer Module Dependencies**:

```xml
<!-- Magento_Customer module.xml - IDENTICAL in both forks -->
<module name="Magento_Customer">
    <sequence>
        <module name="Magento_Eav"/>
        <module name="Magento_Directory"/>
    </sequence>
</module>
```

**Conclusion**: Customer module has **zero dependencies** on removed Adobe modules.

### 5. GraphQL Enhancements

**Mage-OS 2.1**: Plans to extend GraphQL customer APIs with community-requested features

**Potential Enhancements** (under discussion):

```graphql
# Mage-OS 2.1 (proposed)
type Customer {
    id: Int
    email: String
    firstname: String
    lastname: String
    # New fields
    account_created_at: String
    account_last_login: String
    account_login_count: Int
    is_email_confirmed: Boolean
}

# New mutation
mutation {
    requestAccountDeletion(
        email: String!
    ) {
        success: Boolean
        message: String
    }
}
```

**Magento**: GraphQL additions follow Adobe roadmap

### 6. Password Policy Defaults

**Mage-OS 2.0**: Stricter default password requirements

| Requirement | Magento Default | Mage-OS Default |
|-------------|-----------------|-----------------|
| Minimum Length | 8 characters | 12 characters |
| Character Classes | 3 (upper, lower, number) | 4 (upper, lower, number, special) |
| Password Lockout | 6 failures | 5 failures |
| Lockout Duration | 10 minutes | 30 minutes |
| Password History | Disabled | Last 4 passwords |

**Configuration Paths**:

```bash
# Minimum password length
Magento:  customer/password/minimum_password_length = 8
Mage-OS:  customer/password/minimum_password_length = 12

# Required character classes
Magento:  customer/password/required_character_classes_number = 3
Mage-OS:  customer/password/required_character_classes_number = 4

# Lockout threshold
Magento:  customer/password/lockout_failures = 6
Mage-OS:  customer/password/lockout_failures = 5
```

**Override Mage-OS Defaults**:

```bash
# Match Magento behavior
bin/magento config:set customer/password/minimum_password_length 8
bin/magento config:set customer/password/required_character_classes_number 3
bin/magento config:set customer/password/lockout_failures 6
```

### 7. Cookie Lifetime and Security

**Mage-OS**: Sets stricter cookie security defaults

| Setting | Magento | Mage-OS |
|---------|---------|---------|
| `session.cookie_httponly` | true | true |
| `session.cookie_secure` | false (auto-detect) | true (forced in production) |
| `session.cookie_samesite` | Lax | Strict |
| `persistent_shopping_cart.lifetime` | 31536000 (1 year) | 2592000 (30 days) |

**Impact**: Tighter security, but may break certain cross-domain scenarios

**Configuration** (`app/etc/env.php`):

```php
// Mage-OS defaults
'session' => [
    'save' => 'redis',
    'redis' => [
        // ... redis config
    ],
    'cookie_secure' => true,  // Forced
    'cookie_httponly' => true,
    'cookie_samesite' => 'Strict' // Changed from 'Lax'
],
```

---

## Security Enhancements

### Mage-OS-Specific Security Improvements

#### 1. Account Enumeration Protection

**Mage-OS 2.0** adds protection against account enumeration via login and password reset:

**Magento Behavior**:

```
POST /customer/account/forgotpasswordpost
Email: nonexistent@example.com
Response: "If there is an account associated with..."

POST /customer/account/forgotpasswordpost
Email: exists@example.com
Response: "If there is an account associated with..." (same message)
```

**Timing Attack**: Response times differ (database lookup vs. no lookup)

**Mage-OS Enhancement**:

```php
// vendor/mage-os/module-customer/Model/AccountManagement.php
public function initiatePasswordReset($email, $template, $websiteId = null)
{
    $startTime = microtime(true);

    try {
        $customer = $this->customerRepository->get($email, $websiteId);
        // Send reset email
    } catch (NoSuchEntityException $e) {
        // Account doesn't exist - don't reveal this
    }

    // Constant-time response (always sleep to same total duration)
    $elapsedTime = microtime(true) - $startTime;
    $targetTime = 0.5; // 500ms target
    if ($elapsedTime < $targetTime) {
        usleep(($targetTime - $elapsedTime) * 1000000);
    }

    // Always return success message
    return true;
}
```

**Result**: Attacker cannot determine if account exists based on timing or response message

#### 2. Rate Limiting (Built-In)

**Mage-OS 2.1** (planned): Built-in rate limiting for customer actions

**Magento**: Requires third-party extension or Varnish/CloudFlare configuration

**Proposed Configuration**:

```xml
<!-- etc/config.xml -->
<default>
    <customer>
        <rate_limiting>
            <enabled>1</enabled>
            <login_attempts_per_minute>5</login_attempts_per_minute>
            <registration_attempts_per_hour>3</registration_attempts_per_hour>
            <password_reset_attempts_per_hour>3</password_reset_attempts_per_hour>
        </rate_limiting>
    </customer>
</default>
```

#### 3. Two-Factor Authentication (2FA) for Customers

**Magento**: 2FA only for admin users (TwoFactorAuth module)

**Mage-OS 2.1** (planned): Optional 2FA for customer accounts

**Proposed Implementation**:

```php
// New interface
interface TwoFactorAuthInterface
{
    public function enable(int $customerId, string $method): bool;
    public function verify(int $customerId, string $code): bool;
    public function disable(int $customerId): bool;
}

// Supported methods: TOTP, SMS, Email
```

**Extension Attribute**:

```xml
<extension_attributes for="Magento\Customer\Api\Data\CustomerInterface">
    <attribute code="two_factor_enabled" type="boolean"/>
    <attribute code="two_factor_method" type="string"/>
</extension_attributes>
```

---

## Configuration Defaults

### Complete Configuration Comparison

| Configuration Path | Magento Default | Mage-OS Default | Impact |
|-------------------|-----------------|-----------------|--------|
| `customer/create_account/confirm` | 0 (disabled) | 1 (enabled) | Email verification required |
| `customer/password/minimum_password_length` | 8 | 12 | Stronger passwords required |
| `customer/password/required_character_classes_number` | 3 | 4 | Must include special chars |
| `customer/password/lockout_failures` | 6 | 5 | Faster account lockout |
| `customer/password/lockout_threshold` | 600 (10min) | 1800 (30min) | Longer lockout period |
| `admin/security/admin_account_inactive_days` | 0 (disabled) | 90 | Auto-deactivate inactive admins |
| `admin/security/password_lifetime` | 0 (disabled) | 90 | Force password rotation |
| `admin/security/session_lifetime` | 900 (15min) | 900 (enforced) | Cannot extend beyond 15min |
| `web/cookie/cookie_samesite` | Lax | Strict | Tighter CSRF protection |
| `persistent/options/lifetime` | 31536000 (1yr) | 2592000 (30d) | Shorter persistent cart |

### Aligning Mage-OS with Magento Behavior

**Use Case**: You're migrating from Magento and want to preserve existing user experience

**Configuration Script**:

```bash
#!/bin/bash
# align-with-magento.sh
# Run after Mage-OS installation to match Magento defaults

# Disable email confirmation
bin/magento config:set customer/create_account/confirm 0

# Relax password requirements
bin/magento config:set customer/password/minimum_password_length 8
bin/magento config:set customer/password/required_character_classes_number 3

# Increase lockout threshold
bin/magento config:set customer/password/lockout_failures 6
bin/magento config:set customer/password/lockout_threshold 600

# Extend persistent cart lifetime
bin/magento config:set persistent/options/lifetime 31536000

# Relax cookie samesite (if needed)
# Note: This is in env.php, not config

echo "Mage-OS configuration aligned with Magento defaults"
echo "Review admin security settings manually: Stores > Configuration > Advanced > Admin"
```

### Aligning Magento with Mage-OS Security

**Use Case**: You're on Magento but want Mage-OS security posture

**Configuration Script**:

```bash
#!/bin/bash
# enhance-magento-security.sh
# Apply Mage-OS security defaults to Magento

# Enable email confirmation
bin/magento config:set customer/create_account/confirm 1

# Strengthen password requirements
bin/magento config:set customer/password/minimum_password_length 12
bin/magento config:set customer/password/required_character_classes_number 4

# Stricter lockout
bin/magento config:set customer/password/lockout_failures 5
bin/magento config:set customer/password/lockout_threshold 1800

# Admin account security
bin/magento config:set admin/security/admin_account_inactive_days 90
bin/magento config:set admin/security/password_lifetime 90

# Shorter persistent cart
bin/magento config:set persistent/options/lifetime 2592000

bin/magento cache:flush config

echo "Magento security enhanced to match Mage-OS defaults"
echo "Update app/etc/env.php manually for cookie_samesite: Strict"
```

---

## Extension Compatibility

### API/Interface Compatibility

**Goal**: Mage-OS maintains **100% API compatibility** with Magento 2.x

**Customer Module Service Contracts**:

```php
// IDENTICAL in both Magento and Mage-OS
namespace Magento\Customer\Api;

interface CustomerRepositoryInterface
{
    public function save(CustomerInterface $customer, $passwordHash = null);
    public function get($email, $websiteId = null);
    public function getById($customerId);
    public function getList(SearchCriteriaInterface $searchCriteria);
    public function delete(CustomerInterface $customer);
    public function deleteById($customerId);
}
```

**Compatibility Guarantee**:

| Layer | Magento | Mage-OS | Compatible? |
|-------|---------|---------|-------------|
| Service Contracts (`Api\*Interface`) | Stable | Identical | ✅ Yes |
| Data Objects (`Api\Data\*Interface`) | Stable | Identical | ✅ Yes |
| Plugins/Observers | Supported | Supported | ✅ Yes |
| Block/Controller (Frontend) | Present | Present | ✅ Yes |
| Admin UI Components | Present | Present | ✅ Yes |
| GraphQL Schema | Stable | Stable+ | ✅ Yes (Mage-OS superset) |
| REST API (`/V1/*`) | Stable | Identical | ✅ Yes |
| SOAP API | Stable | Identical | ✅ Yes |

### Known Incompatibilities

**Very few** - primarily around removed Adobe modules:

| Extension Type | Magento | Mage-OS | Notes |
|----------------|---------|---------|-------|
| Adobe IMS authentication | ✅ Works | ❌ Fails | Module removed in Mage-OS |
| Adobe Stock integration | ✅ Works | ❌ Fails | Module removed |
| New Relic (built-in) | ✅ Works | ⚠️ Plugin required | Use `mage-os/magento2-new-relic` |
| Standard customer extensions | ✅ Works | ✅ Works | 100% compatible |

### Testing Extension Compatibility

**Test Suite for Mage-OS Migration**:

```bash
#!/bin/bash
# test-extension-compatibility.sh

# 1. Check module dependencies
echo "Checking module dependencies..."
bin/magento module:status | grep -i adobe
# If any Adobe modules listed as dependencies, investigate alternatives

# 2. Run integration tests
bin/magento dev:tests:run integration --filter Customer

# 3. Check API contracts
bin/magento setup:di:compile
# Should complete without errors

# 4. Verify GraphQL schema
bin/magento graphql:schema:generate
curl -X POST http://localhost/graphql -H "Content-Type: application/json" -d '{"query":"{ customer { firstname } }"}'

# 5. Test REST endpoints
curl -X GET "http://localhost/rest/V1/customers/me" -H "Authorization: Bearer <token>"

echo "Compatibility test complete"
```

### Extension Recommendation: Use Service Contracts

**Bad Practice** (likely to break):

```php
// Directly instantiating models - may differ between forks
$customer = $this->customerFactory->create();
$customer->load($customerId);
$customer->setFirstname('John');
$customer->save();
```

**Good Practice** (guaranteed compatible):

```php
// Using repository interface - identical in both forks
$customer = $this->customerRepository->getById($customerId);
$customer->setFirstname('John');
$this->customerRepository->save($customer);
```

---

## Migration Paths

### Magento → Mage-OS Migration

**Prerequisites**:
- Magento 2.4.6 or 2.4.7
- All extensions compatible (test first)
- Full database backup
- Test environment identical to production

#### Step-by-Step Migration

**1. Pre-Migration Audit**

```bash
# Create backup
bin/magento setup:backup --code --media --db

# List all modules
bin/magento module:status > modules-before-migration.txt

# Check for Adobe-dependent modules
grep -r "Magento_Adobe" app/code/*/module.xml
grep -r "Magento_ServicesConnector" app/code/*/module.xml
```

**2. Update Composer**

```json
// composer.json - Remove Magento, add Mage-OS
{
    "require": {
        // Remove these
        // "magento/product-community-edition": "2.4.7",

        // Add these
        "mage-os/mageos-magento2": "2.0.0",
        "mage-os/mageos-composer-plugin": "^1.0"
    }
}
```

**3. Run Composer Update**

```bash
composer update mage-os/mageos-magento2 --with-dependencies

# May take 5-15 minutes
# Watch for dependency conflicts
```

**4. Run Setup Upgrade**

```bash
bin/magento setup:upgrade
bin/magento setup:di:compile
bin/magento setup:static-content:deploy -f
bin/magento indexer:reindex
bin/magento cache:flush
```

**5. Verify Customer Module**

```bash
# Check customer module version
bin/magento module:status Magento_Customer
# Should show: Module is enabled

# Test customer operations
bin/magento customer:create \
    --email="test@example.com" \
    --firstname="Test" \
    --lastname="User" \
    --password="Test123!@#"

# Verify customer was created
mysql -u root -p -D magento_db -e "SELECT email, firstname FROM customer_entity WHERE email='test@example.com';"
```

**6. Test Customer Workflows**

```bash
# Frontend
- Customer registration
- Customer login
- Password reset
- Address management
- Account editing

# Admin
- Customer grid load
- Customer edit form
- Create new customer
- Customer group assignment

# API
curl -X POST "http://localhost/rest/V1/integration/customer/token" \
    -H "Content-Type: application/json" \
    -d '{"username":"test@example.com","password":"Test123!@#"}'
```

**7. Configuration Adjustments**

```bash
# Restore Magento-like defaults if desired
./align-with-magento.sh

# Or keep Mage-OS security enhancements
# Review: Stores > Configuration > Customers > Customer Configuration
```

#### Rollback Plan

```bash
# If migration fails, restore from backup
bin/magento setup:rollback --code-backup=<backup-file>
bin/magento setup:rollback --db-backup=<db-backup-file>

# Or revert composer.json
git checkout composer.json composer.lock
composer install
bin/magento setup:upgrade
```

### Mage-OS → Magento Migration

**Use Case**: Moving to Adobe Commerce for enterprise support

**Complexity**: Similar to reverse migration, but adds Adobe modules

**Steps**:

1. **Update composer.json**

```json
{
    "require": {
        // Remove
        // "mage-os/mageos-magento2": "2.0.0",

        // Add
        "magento/product-community-edition": "2.4.7"
    }
}
```

2. **Composer Update**

```bash
composer update magento/product-community-edition --with-dependencies
```

3. **Setup Upgrade**

```bash
bin/magento setup:upgrade
bin/magento setup:di:compile
bin/magento cache:flush
```

4. **Configuration Sync**

```bash
# Mage-OS stricter defaults may cause issues
# Relax if needed
bin/magento config:set customer/create_account/confirm 0
```

5. **Test Thoroughly**

Same test suite as Magento → Mage-OS migration

### Version Upgrade Paths

**Mage-OS 1.x → 2.x**:

```bash
# Update composer
composer require mage-os/mageos-magento2:^2.0

# Upgrade
bin/magento setup:upgrade
bin/magento setup:di:compile
```

**Magento 2.4.6 → 2.4.7**:

```bash
# Update composer
composer require magento/product-community-edition:2.4.7

# Upgrade
bin/magento setup:upgrade
```

**Cross-Fork Version Jump** (Magento 2.4.6 → Mage-OS 2.0):

```bash
# Update composer (changes repository AND version)
composer require mage-os/mageos-magento2:^2.0 --update-with-dependencies

# Upgrade
bin/magento setup:upgrade
```

---

## When to Choose Which Fork

### Choose Magento/Adobe Commerce If...

✅ **Enterprise Support Required**
- Need Adobe's commercial support SLA
- Require B2B features (Adobe Commerce only)
- Need Adobe-specific integrations (Experience Cloud, Analytics, Target)

✅ **Compliance & Certification**
- Require PCI DSS certified platform (Adobe's certification)
- Need SOC 2 compliance documentation
- Require vendor security assessments

✅ **Ecosystem Maturity**
- Rely on Adobe-backed extensions (Page Builder, Live Search)
- Need Adobe's QA and release process
- Prefer quarterly predictable release schedule

✅ **Long-Term Roadmap**
- Want visibility into Adobe's product roadmap
- Need guaranteed long-term support (Adobe Commerce)

### Choose Mage-OS If...

✅ **Community-Driven Development**
- Want faster security patches
- Prefer open governance
- Contribute to open source direction

✅ **Independence from Adobe**
- Don't need Adobe-specific integrations
- Want to avoid vendor lock-in
- Prefer community support over commercial

✅ **Cost Optimization**
- No budget for Adobe Commerce licensing
- Want to avoid Adobe ecosystem costs
- Comfortable with community support

✅ **Modern PHP Support**
- Need latest PHP versions faster (8.3, 8.4)
- Want bleeding-edge performance improvements
- Early adopter mindset

### Hybrid Approach

**Not Recommended**: Running both simultaneously is not practical.

**Alternative**: Staged migration

1. **Test Environment**: Mage-OS (fast iteration, testing)
2. **Production**: Magento (stability, support)
3. **Gradual Migration**: Test on Mage-OS, promote to Magento

---

## Code Examples: Fork-Specific Implementations

### Password Policy (Mage-OS Stricter Validation)

**Magento 2.4.7**:

```php
// vendor/magento/module-customer/Model/AccountManagement.php
protected function checkPasswordStrength($password)
{
    $length = $this->stringHelper->strlen($password);
    $configMinLength = $this->scopeConfig->getValue(self::XML_PATH_MINIMUM_PASSWORD_LENGTH);

    if ($length < $configMinLength) {
        throw new InputException(__('Password must be at least %1 characters.', $configMinLength));
    }

    // Check character classes (3 required by default)
    $classes = 0;
    if (preg_match('/[a-z]/', $password)) $classes++;
    if (preg_match('/[A-Z]/', $password)) $classes++;
    if (preg_match('/[0-9]/', $password)) $classes++;

    if ($classes < 3) {
        throw new InputException(__('Password must include lowercase, uppercase, and numbers.'));
    }
}
```

**Mage-OS 2.0**:

```php
// vendor/mage-os/module-customer/Model/AccountManagement.php
protected function checkPasswordStrength($password)
{
    $length = $this->stringHelper->strlen($password);
    $configMinLength = $this->scopeConfig->getValue(self::XML_PATH_MINIMUM_PASSWORD_LENGTH);

    if ($length < $configMinLength) {
        throw new InputException(__('Password must be at least %1 characters.', $configMinLength));
    }

    // Check character classes (4 required by default)
    $classes = 0;
    if (preg_match('/[a-z]/', $password)) $classes++;
    if (preg_match('/[A-Z]/', $password)) $classes++;
    if (preg_match('/[0-9]/', $password)) $classes++;
    if (preg_match('/[^a-zA-Z0-9]/', $password)) $classes++; // Special characters

    $requiredClasses = $this->scopeConfig->getValue(self::XML_PATH_REQUIRED_CHARACTER_CLASSES);
    if ($classes < $requiredClasses) {
        throw new InputException(__('Password must include uppercase, lowercase, numbers, and special characters.'));
    }

    // Password history check
    if ($this->isPasswordInHistory($password)) {
        throw new InputException(__('You cannot reuse your last 4 passwords.'));
    }
}

// New method in Mage-OS
protected function isPasswordInHistory($password)
{
    $customerId = $this->session->getCustomerId();
    if (!$customerId) {
        return false;
    }

    $passwordHistory = $this->passwordHistoryRepository->getByCustomerId($customerId, 4);
    foreach ($passwordHistory as $historicalHash) {
        if ($this->encryptor->validateHash($password, $historicalHash)) {
            return true;
        }
    }
    return false;
}
```

### Email Confirmation (Mage-OS Enabled by Default)

**Magento**: Requires manual configuration

**Mage-OS**: Enabled by default, can be disabled

**Check if Email Confirmation Required**:

```php
// Works identically in both forks
$isConfirmationRequired = $this->scopeConfig->isSetFlag(
    'customer/create_account/confirm',
    \Magento\Store\Model\ScopeInterface::SCOPE_STORE
);

if ($isConfirmationRequired) {
    // Send confirmation email
    $this->emailNotification->newAccount($customer);
}
```

**Disable in Mage-OS to Match Magento**:

```bash
bin/magento config:set customer/create_account/confirm 0
```

---

## Resources and Documentation

### Official Documentation

**Magento**:
- [Magento DevDocs](https://developer.adobe.com/commerce/php/)
- [Adobe Commerce User Guide](https://experienceleague.adobe.com/docs/commerce-admin/user-guides/home.html)
- [GitHub Repository](https://github.com/magento/magento2)

**Mage-OS**:
- [Mage-OS Official Site](https://mage-os.org/)
- [Mage-OS GitHub](https://github.com/mage-os/mageos-magento2)
- [Mage-OS Discord](https://discord.gg/mage-os)
- [Mage-OS Documentation](https://docs.mage-os.org/)

### Community Support

**Magento**:
- [Magento Community Forums](https://community.magento.com/)
- [Magento Stack Exchange](https://magento.stackexchange.com/)
- [Magento Community Engineering Slack](https://magentocommeng.slack.com/)

**Mage-OS**:
- [Mage-OS Discord](https://discord.gg/mage-os) (primary support channel)
- [Mage-OS Community Forums](https://community.mage-os.org/)
- [GitHub Discussions](https://github.com/mage-os/mageos-magento2/discussions)

### Release Notes

**Magento**:
- [Release Notes Index](https://experienceleague.adobe.com/docs/commerce-operations/release/notes/overview.html)
- [Security Patches](https://experienceleague.adobe.com/docs/commerce-operations/release/notes/security-patches/overview.html)

**Mage-OS**:
- [Release Notes](https://github.com/mage-os/mageos-magento2/releases)
- [Security Advisories](https://github.com/mage-os/mageos-magento2/security/advisories)

---

## Conclusion

**Key Takeaways**:

1. **API Compatibility**: Mage-OS maintains 100% service contract compatibility with Magento
2. **Security Posture**: Mage-OS has stricter security defaults (PCI DSS 4.0 out-of-box)
3. **Patch Speed**: Mage-OS releases security patches faster via community process
4. **Customer Module**: Identical API surface, different configuration defaults
5. **Migration**: Relatively straightforward for Magento Open Source → Mage-OS

**Decision Framework**:

```
Need Adobe integrations? → Magento/Adobe Commerce
Need enterprise support SLA? → Adobe Commerce
Want faster security patches? → Mage-OS
Want community governance? → Mage-OS
Cost-sensitive? → Mage-OS
Risk-averse (established platform)? → Magento
```

**For Customer Module Specifically**:

The differences are **minimal** and primarily configuration-based. Extensions and customizations targeting `Magento\Customer\Api\*` interfaces will work identically on both platforms.

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-04
**Comparison Versions**: Magento 2.4.7 vs. Mage-OS 2.0.0
**Next Review**: 2026-01-01 (or upon Mage-OS 2.1 release)

**Next**: See [ANTI_PATTERNS.md](./ANTI_PATTERNS.md) for common mistakes when working with the Customer module.

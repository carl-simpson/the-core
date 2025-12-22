# Magento_Customer Plugins and Observers Reference

This document provides a comprehensive reference for all plugins and observers in the Magento_Customer module, including their purpose, execution context, and usage examples.

---

## Table of Contents

- [Plugins Overview](#plugins-overview)
- [Global Plugins](#global-plugins)
- [Frontend Plugins](#frontend-plugins)
- [Admin Plugins](#admin-plugins)
- [REST API Plugins](#rest-api-plugins)
- [SOAP API Plugins](#soap-api-plugins)
- [Observers Overview](#observers-overview)
- [Customer Lifecycle Observers](#customer-lifecycle-observers)
- [Address Observers](#address-observers)
- [Authentication Observers](#authentication-observers)
- [Visitor Tracking Observers](#visitor-tracking-observers)
- [Integration Observers](#integration-observers)

---

## Plugins Overview

The Magento_Customer module implements **19 plugins** across different areas to intercept and modify behavior at critical execution points.

### Plugin Naming Convention

**Pattern**: Plugins in this module use descriptive names, not the "Extend" suffix pattern.

**Why**: This is core Magento code predating the "Extend" naming standard. Third-party modules should follow the "Extend" suffix convention.

### Plugin Execution Priority

**sortOrder Values**:
- `-1`: TransactionWrapper (must run first to open transaction)
- `1`: Data validation plugins
- `10`: Standard business logic plugins (default)
- `100+`: Cosmetic or non-critical plugins

---

## Global Plugins

These plugins are registered in `etc/di.xml` and apply across all areas (frontend, admin, API).

### 1. TransactionWrapper

**Intercepts**: `Magento\Customer\Api\CustomerRepositoryInterface`
**Plugin Class**: `Magento\Customer\Model\Plugin\CustomerRepository\TransactionWrapper`
**Sort Order**: `-1` (highest priority - runs first)
**Methods Intercepted**: `save()`, `delete()`, `deleteById()`

#### Purpose
Wraps customer repository operations in database transactions to ensure atomicity.

#### Implementation

```xml
<type name="Magento\Customer\Api\CustomerRepositoryInterface">
    <plugin name="transactionWrapper"
            type="Magento\Customer\Model\Plugin\CustomerRepository\TransactionWrapper"
            sortOrder="-1"/>
</type>
```

#### Methods

```php
/**
 * Start transaction before save
 */
public function beforeSave(
    CustomerRepositoryInterface $subject,
    CustomerInterface $customer,
    $passwordHash = null
)

/**
 * Commit transaction after successful save
 * Rollback on exception
 */
public function afterSave(
    CustomerRepositoryInterface $subject,
    CustomerInterface $result,
    CustomerInterface $customer,
    $passwordHash = null
)
```

#### Behavior

1. **beforeSave**: Opens database transaction
2. **Original Method**: Customer save logic executes
3. **afterSave**: Commits transaction (or rolls back on exception)

**Result**: Customer + addresses + EAV attributes saved atomically

#### Use Cases

- Prevents partial customer saves if address save fails
- Ensures email synchronization observers run in same transaction
- Rollback on validation failures after database writes

#### Performance Impact

**Minimal**: Transaction overhead is negligible. Prevents data corruption.

---

### 2. CustomerNotification

**Intercepts**: `Magento\Framework\App\ActionInterface`
**Plugin Class**: `Magento\Customer\Model\Plugin\CustomerNotification`
**Sort Order**: `10` (default)
**Area**: global

#### Purpose
Displays admin-triggered customer notifications in the frontend.

#### Implementation

```xml
<type name="Magento\Framework\App\ActionInterface">
    <plugin name="customerNotification"
            type="Magento\Customer\Model\Plugin\CustomerNotification"/>
</type>
```

#### Methods

```php
/**
 * Add notification messages to customer session before action executes
 */
public function beforeExecute(
    ActionInterface $subject
)
```

#### Behavior

1. Check if customer is logged in
2. Retrieve pending notifications from storage
3. Add notifications to message manager
4. Clear notification storage

**Example Notification**: "Your account requires activation" (set by admin)

#### Use Cases

- Admin marks customer for password reset
- Admin sends message to customer
- Account status changes trigger notifications

---

### 3. CustomerFlushFormKey

**Intercepts**: `Magento\PageCache\Observer\FlushFormKey`
**Plugin Class**: `Magento\Customer\Model\Plugin\CustomerFlushFormKey`
**Sort Order**: `10` (default)
**Area**: global

#### Purpose
Ensures form_key is regenerated when customer logs in/out to prevent CSRF issues with cached pages.

#### Implementation

```xml
<type name="Magento\PageCache\Observer\FlushFormKey">
    <plugin name="customerFlushFormKey"
            type="Magento\Customer\Model\Plugin\CustomerFlushFormKey"/>
</type>
```

#### Behavior

Coordinates form_key invalidation with customer session changes.

**Security Note**: Critical for preventing CSRF attacks when using Full Page Cache.

---

### 4-7. Customer Group Excluded Website Plugins

These four plugins manage multi-website customer group exclusions (B2B feature).

#### 4. SaveCustomerGroupExcludedWebsite

**Intercepts**: `Magento\Customer\Api\GroupRepositoryInterface::save()`
**Plugin Class**: `Magento\Customer\Model\Plugin\SaveCustomerGroupExcludedWebsite`

**Purpose**: Save excluded website associations when customer group is saved.

```php
public function afterSave(
    GroupRepositoryInterface $subject,
    GroupInterface $result,
    GroupInterface $customerGroup
)
```

**Behavior**: Persists excluded_website extension attribute to `customer_group_excluded_website` table.

---

#### 5. DeleteCustomerGroupExcludedWebsite

**Intercepts**: `Magento\Customer\Api\GroupRepositoryInterface::delete()`, `deleteById()`
**Plugin Class**: `Magento\Customer\Model\Plugin\DeleteCustomerGroupExcludedWebsite`

**Purpose**: Cleanup excluded website records when customer group is deleted.

```php
public function afterDelete(
    GroupRepositoryInterface $subject,
    $result,
    GroupInterface $customerGroup
)
```

**Behavior**: DELETE FROM customer_group_excluded_website WHERE customer_group_id = ?

---

#### 6. GetByIdCustomerGroupExcludedWebsite

**Intercepts**: `Magento\Customer\Api\GroupRepositoryInterface::getById()`
**Plugin Class**: `Magento\Customer\Model\Plugin\GetByIdCustomerGroupExcludedWebsite`

**Purpose**: Populate excluded websites when loading customer group.

```php
public function afterGetById(
    GroupRepositoryInterface $subject,
    GroupInterface $result,
    $id
)
```

**Behavior**: Loads excluded website IDs from DB and sets as extension attribute.

---

#### 7. GetListCustomerGroupExcludedWebsite

**Intercepts**: `Magento\Customer\Api\GroupRepositoryInterface::getList()`
**Plugin Class**: `Magento\Customer\Model\Plugin\GetListCustomerGroupExcludedWebsite`

**Purpose**: Populate excluded websites for all groups in search results.

```php
public function afterGetList(
    GroupRepositoryInterface $subject,
    GroupSearchResultsInterface $searchResult,
    SearchCriteriaInterface $searchCriteria
)
```

**Behavior**: Batch loads excluded websites for all groups in result set.

---

### 8. SaveWishlistDataAndAddReferenceKeyToBackUrl

**Intercepts**: `Magento\Customer\Model\EmailNotificationInterface`
**Plugin Class**: `Magento\Wishlist\Plugin\SaveWishlistDataAndAddReferenceKeyToBackUrl`
**Module**: Magento_Wishlist (intercepts Customer module interface)

#### Purpose
Preserves wishlist data when customer receives email notifications.

**Note**: This is a cross-module plugin - Wishlist module intercepting Customer interface.

#### Implementation

```xml
<!-- In Magento_Wishlist module -->
<type name="Magento\Customer\Model\EmailNotificationInterface">
    <plugin name="saveWishlistDataAndAddReferenceKeyToBackUrl"
            type="Magento\Wishlist\Plugin\SaveWishlistDataAndAddReferenceKeyToBackUrl"/>
</type>
```

**Behavior**: Adds wishlist item count and reference to email templates.

---

## Frontend Plugins

These plugins are registered in `etc/frontend/di.xml` and only apply to storefront requests.

### 9. DepersonalizePlugin (customer-session-depersonalize)

**Intercepts**: `Magento\Framework\View\Layout`
**Plugin Class**: `Magento\Customer\Model\Layout\DepersonalizePlugin`
**Sort Order**: `10`
**Area**: frontend

#### Purpose
**Critical for Full Page Cache (FPC)**: Removes customer-specific data from cached pages.

#### Implementation

```xml
<type name="Magento\Framework\View\Layout">
    <plugin name="customer-session-depersonalize"
            type="Magento\Customer\Model\Layout\DepersonalizePlugin"
            sortOrder="10"/>
</type>
```

#### Methods

```php
/**
 * Remove personalized data from layout before caching
 */
public function afterGenerateElements(
    Layout $subject,
    $result
)
```

#### Behavior

1. Detect if page will be cached (check response headers)
2. Clear customer-specific session data (name, email, etc.)
3. Replace with generic "NOT LOGGED IN" state
4. Page cached without customer PII
5. Customer sections (AJAX) load personalized data after page load

#### What Gets Depersonalized

- Customer name
- Customer email
- Customer group
- Cart item count
- Wishlist item count
- Recently viewed products
- Any other customer session data

#### How Personalization is Restored

**Customer Sections** (private content):
```javascript
// Frontend loads customer data via AJAX
GET /customer/section/load/sections/cart,customer,wishlist
```

**Result**: Fast cached pages + personalized content via AJAX.

#### Performance Impact

**Positive**: Enables aggressive FPC caching for logged-in customers.
**Negative**: One additional AJAX request per page (minimal, cacheable in browser).

#### Varnish Integration

When using Varnish:
- Varnish caches depersonalized pages
- All customers (logged in or not) share same cache entry
- Personalization loaded client-side via customer-data.js

---

### 10. ContextPlugin

**Intercepts**: `Magento\Framework\App\ActionInterface`
**Plugin Class**: `Magento\Customer\Model\App\Action\ContextPlugin`
**Sort Order**: `10`
**Area**: frontend

#### Purpose
Injects customer context (logged in status, customer group) into HTTP context for page variations.

#### Implementation

```xml
<type name="Magento\Framework\App\ActionInterface">
    <plugin name="customer-app-action-executeController-context-plugin"
            type="Magento\Customer\Model\App\Action\ContextPlugin"
            sortOrder="10"/>
</type>
```

#### Methods

```php
/**
 * Set customer context before action executes
 */
public function beforeExecute(
    ActionInterface $subject
)
```

#### Behavior

1. Check customer session
2. Set HTTP context variables:
   - `customer_logged_in` (boolean)
   - `customer_group` (int)
3. These variables used by FPC for cache variations

**Example**: Different cache entry for "General" vs "Wholesale" customer group.

#### Cache Variation

FPC creates separate cache entries based on:
- Customer logged in (yes/no)
- Customer group ID
- Store ID
- Currency
- Theme

**Result**: Wholesale customers see wholesale prices from cache, without depersonalization.

---

### 11. Account Plugin

**Intercepts**: `Magento\Customer\Controller\AccountInterface`
**Plugin Class**: `Magento\Customer\Controller\Plugin\Account`
**Area**: frontend

#### Purpose
Validates customer has access to account pages.

#### Implementation

```xml
<type name="Magento\Customer\Controller\AccountInterface">
    <plugin name="customer_account"
            type="Magento\Customer\Controller\Plugin\Account" />
</type>
```

#### Behavior

Redirects to login if:
- Customer not logged in
- Account not active
- Account pending confirmation

---

### 12. ConfigPlugin (Cart Sidebar)

**Intercepts**: `Magento\Checkout\Block\Cart\Sidebar`
**Plugin Class**: `Magento\Customer\Model\Cart\ConfigPlugin`
**Area**: frontend

#### Purpose
Configures minicart behavior based on customer group and settings.

#### Implementation

```xml
<type name="Magento\Checkout\Block\Cart\Sidebar">
    <plugin name="customer_cart"
            type="Magento\Customer\Model\Cart\ConfigPlugin" />
</type>
```

**Behavior**: Adjusts minicart display based on customer preferences.

---

### 13. SessionChecker Plugin

**Intercepts**: `Magento\Framework\Session\SessionManagerInterface`
**Plugin Class**: `Magento\Customer\CustomerData\Plugin\SessionChecker`
**Area**: frontend

#### Purpose
Validates customer session is still valid before processing customer sections.

#### Behavior

Checks:
- Session not expired
- Session cutoff time not exceeded
- Customer still active

**Result**: Prevents serving stale customer data from expired sessions.

---

### 14. ClearSessionsAfterLogoutPlugin

**Intercepts**: `Magento\Customer\Model\Session`
**Plugin Class**: `Magento\Customer\Model\Plugin\ClearSessionsAfterLogoutPlugin`
**Area**: frontend

#### Purpose
Clears all active sessions for customer on logout (multi-session management).

#### Implementation

```xml
<type name="Magento\Customer\Model\Session">
    <plugin name="afterLogout"
            type="Magento\Customer\Model\Plugin\ClearSessionsAfterLogoutPlugin"/>
</type>
```

#### Methods

```php
/**
 * Clear all customer sessions after logout
 */
public function afterLogout(
    Session $subject,
    $result
)
```

#### Behavior

1. Get customer ID from session
2. Call `SessionCleanerInterface::clearFor($customerId)`
3. DELETE FROM session WHERE session_data LIKE '%customer_id%'

**Use Case**: Customer logs out on one device, all other devices logged out too.

**Configuration**: Can be disabled if customers should have independent sessions.

---

## Admin Plugins

These plugins are registered in `etc/adminhtml/di.xml` and only apply to admin area.

### 15. CustomerGridIndexAfterWebsiteDelete

**Intercepts**: `Magento\Store\Api\WebsiteRepositoryInterface::delete()`
**Plugin Class**: `Magento\Customer\Model\Plugin\CustomerGridIndexAfterWebsiteDelete`
**Area**: adminhtml

#### Purpose
Reindexes customer grid after website deletion to remove orphaned records.

#### Implementation

```xml
<type name="Magento\Store\Api\WebsiteRepositoryInterface">
    <plugin name="reindex_customer_grid_after_website_remove"
            type="Magento\Customer\Model\Plugin\CustomerGridIndexAfterWebsiteDelete" />
</type>
```

#### Behavior

After website deleted:
1. Trigger customer grid reindex
2. Remove customers associated with deleted website from grid
3. Update customer counts in admin dashboard

---

### 16. DeleteCustomerGroupExcludedWebsite (Admin)

**Intercepts**: `Magento\Store\Api\WebsiteRepositoryInterface::delete()`
**Plugin Class**: `Magento\Customer\Model\Plugin\Website\DeleteCustomerGroupExcludedWebsite`
**Area**: adminhtml

#### Purpose
Cleanup customer group excluded website records when website is deleted.

#### Implementation

```xml
<type name="Magento\Store\Api\WebsiteRepositoryInterface">
    <plugin name="deleteCustomerGroupExcludedWebsiteAfterWebsiteDelete"
            type="Magento\Customer\Model\Plugin\Website\DeleteCustomerGroupExcludedWebsite"/>
</type>
```

#### Behavior

After website deleted:
- DELETE FROM customer_group_excluded_website WHERE website_id = ?

---

## REST API Plugins

These plugins are registered in `etc/webapi_rest/di.xml` and only apply to REST API requests.

### 17. CustomerAuthorization (REST)

**Intercepts**: `Magento\Customer\Api\CustomerRepositoryInterface`
**Plugin Class**: `Magento\Customer\Model\Plugin\CustomerAuthorization`
**Area**: webapi_rest

#### Purpose
Validates customer token authorization for API requests.

#### Implementation

```xml
<type name="Magento\Customer\Api\CustomerRepositoryInterface">
    <plugin name="customerAuthorization"
            type="Magento\Customer\Model\Plugin\CustomerAuthorization" />
</type>
```

#### Behavior

Before any repository method:
1. Get customer ID from API token
2. Verify token customer matches requested customer ID
3. Throw AuthorizationException if mismatch

**Rule**: Customers can only access/modify their own data via API.

**Exception**: Admin tokens can access any customer data.

---

### 18. UpdateCustomer

**Intercepts**: `Magento\Customer\Api\CustomerRepositoryInterface::save()`
**Plugin Class**: `Magento\Customer\Model\Plugin\UpdateCustomer`
**Sort Order**: `10`
**Area**: webapi_rest

#### Purpose
Populates customer data from REST API request body.

#### Implementation

```xml
<type name="Magento\Customer\Api\CustomerRepositoryInterface">
    <plugin name="updateCustomerByIdFromRequest"
            type="Magento\Customer\Model\Plugin\UpdateCustomer" />
</type>
```

#### Methods

```php
/**
 * Merge request data into customer DTO before save
 */
public function beforeSave(
    CustomerRepositoryInterface $subject,
    CustomerInterface $customer,
    $passwordHash = null
)
```

#### Behavior

For REST API PUT /V1/customers/:id:
1. Extract customer data from HTTP request body
2. Merge with $customer parameter
3. Ensure ID from URL matches ID in body

**Why Needed**: REST APIs pass data in request body, not method parameters.

---

### 19. ValidateCustomerData

**Intercepts**: `Magento\Webapi\Controller\Rest`
**Plugin Class**: `Magento\Customer\Plugin\Webapi\Controller\Rest\ValidateCustomerData`
**Sort Order**: `1`
**Area**: webapi_rest

#### Purpose
Validates customer data format before processing REST API requests.

#### Implementation

```xml
<type name="Magento\Webapi\Controller\Rest">
    <plugin name="validateCustomerData"
            type="Magento\Customer\Plugin\Webapi\Controller\Rest\ValidateCustomerData"
            sortOrder="1" />
</type>
```

#### Behavior

Validates:
- Email format
- Required fields present
- Data types correct
- Enum values valid

**Throws**: `InputException` with detailed error messages.

---

## SOAP API Plugins

### 20. CustomerAuthorization (SOAP)

**Intercepts**: `Magento\Customer\Api\CustomerRepositoryInterface`
**Plugin Class**: `Magento\Customer\Model\Plugin\CustomerAuthorization`
**Area**: webapi_soap

Same purpose as REST version (#17), but for SOAP API requests.

---

## Observers Overview

The Magento_Customer module implements **16 observers** that react to events dispatched during customer operations.

### Observer Execution

**Synchronous**: Observers execute immediately when event is dispatched (blocking).

**Transaction Safety**: Observers run inside TransactionWrapper transaction, so exceptions rollback entire operation.

---

## Customer Lifecycle Observers

### 1. UpgradeOrderCustomerEmailObserver

**Event**: `customer_save_after_data_object`
**Class**: `Magento\Customer\Observer\UpgradeOrderCustomerEmailObserver`
**Area**: global

#### Purpose
**Critical Business Logic**: Synchronizes customer email changes to historical orders.

#### Implementation

```xml
<event name="customer_save_after_data_object">
    <observer name="upgrade_order_customer_email"
              instance="Magento\Customer\Observer\UpgradeOrderCustomerEmailObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $customer = $observer->getEvent()->getCustomerDataObject();
    $originalCustomer = $observer->getEvent()->getOrigCustomerDataObject();

    if (!$originalCustomer || $customer->getEmail() === $originalCustomer->getEmail()) {
        return; // No email change
    }

    // Find all orders with old email
    $searchCriteria = $this->searchCriteriaBuilder
        ->addFilter(OrderInterface::CUSTOMER_ID, $customer->getId())
        ->addFilter(OrderInterface::CUSTOMER_EMAIL, $originalCustomer->getEmail())
        ->create();

    $orders = $this->orderRepository->getList($searchCriteria);
    $orders->setDataToAll(OrderInterface::CUSTOMER_EMAIL, $customer->getEmail());
    $orders->save(); // Bulk UPDATE
}
```

#### Database Impact

```sql
UPDATE sales_order
SET customer_email = 'new@example.com'
WHERE customer_id = 123
  AND customer_email = 'old@example.com'
```

**Performance**: May update hundreds of orders for long-time customers.

#### Why This Exists

**Problem**: Order lookup in admin uses customer_email filter. If email changes, admin can't find customer's orders.

**Solution**: Keep order email in sync with current customer email.

---

### 2. UpgradeQuoteCustomerEmailObserver

**Event**: `customer_save_after_data_object`
**Class**: `Magento\Customer\Observer\UpgradeQuoteCustomerEmailObserver`
**Area**: global

#### Purpose
Synchronizes customer email changes to active shopping cart.

#### Implementation

```xml
<event name="customer_save_after_data_object">
    <observer name="upgrade_quote_customer_email"
              instance="Magento\Customer\Observer\UpgradeQuoteCustomerEmailObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $customer = $observer->getEvent()->getCustomerDataObject();
    $customerOrig = $observer->getEvent()->getOrigCustomerDataObject();

    if (!$customerOrig || $email == $emailOrig) {
        return;
    }

    try {
        $quote = $this->quoteRepository->getForCustomer($customer->getId());
        $quote->setCustomerEmail($customer->getEmail());
        $this->quoteRepository->save($quote);
    } catch (NoSuchEntityException $e) {
        // No active cart - OK
    }
}
```

#### Database Impact

```sql
UPDATE quote
SET customer_email = 'new@example.com'
WHERE customer_id = 123
  AND is_active = 1
```

#### Why This Exists

**Cart Recovery Emails**: Abandoned cart emails sent to quote.customer_email. Must be current.

---

### 3. UpgradeCustomerPasswordObserver

**Event**: `customer_customer_authenticated`
**Class**: `Magento\Customer\Observer\UpgradeCustomerPasswordObserver`
**Area**: global

#### Purpose
Automatically upgrades password hash to current algorithm when customer logs in with old hash.

#### Implementation

```xml
<event name="customer_customer_authenticated">
    <observer name="upgrade_customer_password"
              instance="Magento\Customer\Observer\UpgradeCustomerPasswordObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $password = $observer->getEvent()->getPassword();
    $customer = $observer->getEvent()->getModel();

    // Check if hash is outdated
    if ($this->encryptor->validateHashVersion($customer->getPasswordHash())) {
        return; // Current hash
    }

    // Rehash with current algorithm (Argon2ID13)
    $newHash = $this->encryptor->getHash($password, true);
    $customer->setPasswordHash($newHash);
    $this->customerRepository->save($customer);
}
```

#### Hash Migration Path

1. **Magento 1 (MD5)** → Magento 2 (SHA256) → Magento 2.3+ (Argon2ID13)
2. On first login after upgrade, old hash validated
3. If valid, rehashed with current algorithm
4. Next login uses new hash

**Transparent**: Customer never knows their password was upgraded.

---

## Address Observers

### 4. BeforeAddressSaveObserver

**Event**: `customer_address_save_before`
**Class**: `Magento\Customer\Observer\BeforeAddressSaveObserver`
**Area**: global

#### Purpose
Validates and processes VAT number before address is saved.

#### Implementation

```xml
<event name="customer_address_save_before">
    <observer name="customer_address_before_save_viv_observer"
              instance="Magento\Customer\Observer\BeforeAddressSaveObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $address = $observer->getEvent()->getCustomerAddress();

    if (!$address->getVatId()) {
        return; // No VAT to validate
    }

    // Call EU VAT validation service
    $vatValidationResult = $this->validateVat($address->getVatId(), $address->getCountryId());

    // Store validation result
    $address->setData('vat_is_valid', $vatValidationResult->isValid());
    $address->setData('vat_request_id', $vatValidationResult->getRequestId());
    $address->setData('vat_request_date', $vatValidationResult->getRequestDate());
    $address->setData('vat_request_success', $vatValidationResult->isRequestSuccess());
}
```

#### VAT Validation

**External API Call**: Calls VIES (VAT Information Exchange System) service in EU.

**Validation Result Stored**: Used by AfterAddressSaveObserver to change customer group.

**Performance**: External API call can be slow (1-3 seconds). Consider async validation for production.

---

### 5. AfterAddressSaveObserver

**Event**: `customer_address_save_after`
**Class**: `Magento\Customer\Observer\AfterAddressSaveObserver`
**Area**: global

#### Purpose
**Side Effect**: Changes customer group based on VAT validation result.

#### Implementation

```xml
<event name="customer_address_save_after">
    <observer name="customer_address_after_save_viv_observer"
              instance="Magento\Customer\Observer\AfterAddressSaveObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $address = $observer->getEvent()->getCustomerAddress();
    $customer = $address->getCustomer();

    $vatIsValid = $address->getData('vat_is_valid');
    $currentGroupId = $customer->getGroupId();

    // Business rules:
    // - Valid VAT → Intra-EU group (no VAT charge)
    // - Invalid VAT → Regular group (VAT charged)

    $newGroupId = $this->determineCustomerGroup($vatIsValid, $address->getCountryId());

    if ($newGroupId != $currentGroupId) {
        $customer->setGroupId($newGroupId);
        $this->customerRepository->save($customer);

        // Invalidate session/cache
        $this->_customerSession->setCustomerGroupId($newGroupId);
    }
}
```

#### Critical Side Effect

**Saving an address can change customer group!**

This affects:
- Product prices (group pricing)
- Catalog rules
- Shopping cart prices
- Tax calculations

**Transaction Safety**: Customer group change in same transaction as address save. Rollback if fails.

---

## Authentication Observers

### 6. LogLastLoginAtObserver

**Event**: `customer_login`
**Class**: `Magento\Customer\Observer\LogLastLoginAtObserver`
**Area**: frontend

#### Purpose
Records customer login timestamp for reporting and security.

#### Implementation

```xml
<event name="customer_login">
    <observer name="log_last_login_at"
              instance="Magento\Customer\Observer\LogLastLoginAtObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $customer = $observer->getEvent()->getCustomer();

    // INSERT or UPDATE customer_log
    $this->customerLog->upsert($customer->getId(), [
        'last_login_at' => $this->dateTime->formatDate(true)
    ]);
}
```

#### Database Impact

```sql
INSERT INTO customer_log (customer_id, last_login_at)
VALUES (123, '2025-12-03 10:30:00')
ON DUPLICATE KEY UPDATE last_login_at = '2025-12-03 10:30:00'
```

#### Use Cases

- Admin report: "Customer last login"
- Security: "Account not accessed in 90 days"
- Compliance: Activity tracking

---

### 7. LogLastLogoutAtObserver

**Event**: `customer_logout`
**Class**: `Magento\Customer\Observer\LogLastLogoutAtObserver`
**Area**: frontend

#### Purpose
Records customer logout timestamp.

#### Implementation

```xml
<event name="customer_logout">
    <observer name="log_last_logout_at"
              instance="Magento\Customer\Observer\LogLastLogoutAtObserver" />
</event>
```

#### Execution Logic

Similar to LogLastLoginAtObserver, updates `customer_log.last_logout_at`.

---

### 8. CustomerLoginSuccessObserver

**Event**: `customer_login`
**Class**: `Magento\Customer\Observer\CustomerLoginSuccessObserver`
**Area**: frontend

#### Purpose
**Placeholder**: Extensibility point for custom login logic.

#### Implementation

```xml
<event name="customer_login">
    <observer name="customer_login_success"
              instance="Magento\Customer\Observer\CustomerLoginSuccessObserver" />
</event>
```

**Current Behavior**: Empty observer in core. Used by third-party extensions.

---

### 9. CustomerGroupAuthenticate

**Event**: `customer_customer_authenticated`
**Class**: `Magento\Customer\Observer\CustomerGroupAuthenticate`
**Area**: global

#### Purpose
Validates customer group is active and not excluded from current website.

#### Implementation

```xml
<event name="customer_customer_authenticated">
    <observer name="customerGroupAuthenticate"
              instance="Magento\Customer\Observer\CustomerGroupAuthenticate" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $customer = $observer->getEvent()->getModel();
    $groupId = $customer->getGroupId();
    $websiteId = $customer->getWebsiteId();

    // Check if group is excluded from this website
    if ($this->isGroupExcludedFromWebsite($groupId, $websiteId)) {
        throw new AuthenticationException(__('Customer group is not allowed on this website.'));
    }
}
```

**Result**: Login blocked if customer group excluded from website (B2B feature).

---

## Visitor Tracking Observers

### 10. InitByRequestObserver

**Event**: `controller_action_predispatch`
**Class**: `Magento\Customer\Observer\Visitor\InitByRequestObserver`
**Area**: frontend

#### Purpose
Initialize visitor tracking on every page request.

#### Implementation

```xml
<event name="controller_action_predispatch">
    <observer name="customer_visitor"
              instance="Magento\Customer\Observer\Visitor\InitByRequestObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $visitor = $this->visitorFactory->create();
    $visitor->initByRequest($observer->getEvent()->getRequest());

    // Store in session for SaveByRequestObserver
    $this->session->setVisitorData($visitor->getData());
}
```

**Performance**: Runs on EVERY frontend request. Must be fast.

---

### 11. SaveByRequestObserver

**Event**: `controller_action_postdispatch`
**Class**: `Magento\Customer\Observer\Visitor\SaveByRequestObserver`
**Area**: frontend

#### Purpose
Update visitor last_visit_at timestamp after request completes.

#### Implementation

```xml
<event name="controller_action_postdispatch">
    <observer name="customer_visitor"
              instance="Magento\Customer\Observer\Visitor\SaveByRequestObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $visitor = $this->session->getVisitorData();
    $visitor->setLastVisitAt($this->dateTime->now());
    $visitor->save();
}
```

**Database**: UPDATE customer_visitor SET last_visit_at = NOW()

---

### 12. BindCustomerLoginObserver

**Event**: `customer_data_object_login`
**Class**: `Magento\Customer\Observer\Visitor\BindCustomerLoginObserver`
**Area**: frontend

#### Purpose
Link anonymous visitor session to customer account after login.

#### Implementation

```xml
<event name="customer_data_object_login">
    <observer name="customer_visitor"
              instance="Magento\Customer\Observer\Visitor\BindCustomerLoginObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $customer = $observer->getEvent()->getCustomer();
    $visitor = $this->visitorFactory->create()->loadBySession();

    if ($visitor->getId()) {
        $visitor->setCustomerId($customer->getId());
        $visitor->save();
    }
}
```

**Database**: UPDATE customer_visitor SET customer_id = 123 WHERE session_id = 'abc...'

**Result**: Visitor analytics now linked to customer account.

---

### 13. BindQuoteCreateObserver

**Event**: `sales_quote_save_after`
**Class**: `Magento\Customer\Observer\Visitor\BindQuoteCreateObserver`
**Area**: global

#### Purpose
Link quote (shopping cart) to visitor session for analytics.

#### Implementation

```xml
<event name="sales_quote_save_after">
    <observer name="customer_visitor"
              instance="Magento\Customer\Observer\Visitor\BindQuoteCreateObserver" />
</event>
```

#### Execution Logic

```php
public function execute(Observer $observer): void
{
    $quote = $observer->getEvent()->getQuote();
    $visitor = $this->visitorFactory->create()->loadBySession();

    if ($visitor->getId() && !$quote->getVisitorId()) {
        $quote->setVisitorId($visitor->getId());
        // No need to save - already in save process
    }
}
```

**Result**: Cart abandonment reports can track by visitor session.

---

## Integration Observers

### 14. AddCustomerGroupExcludedWebsite (Catalog Rule)

**Event**: `catalog_rule_collection_load_after`
**Class**: `Magento\Customer\Observer\CatalogRule\AddCustomerGroupExcludedWebsite`
**Area**: global

#### Purpose
Filters catalog rules to exclude customer groups not allowed on current website.

#### Implementation

```xml
<event name="catalog_rule_collection_load_after">
    <observer name="catalogRuleCustomerGroupExcludedWebsite"
              instance="Magento\Customer\Observer\CatalogRule\AddCustomerGroupExcludedWebsite" />
</event>
```

#### Behavior

When catalog rules are loaded:
1. Get current website ID
2. Load excluded customer groups for this website
3. Remove rules that apply to excluded groups

**B2B Feature**: Prevents wholesale pricing from appearing on retail website.

---

## Observer Best Practices

### 1. Keep Observers Lightweight

**Bad**: Complex business logic in observers
**Good**: Delegate to service classes

```php
// Good
public function execute(Observer $observer): void
{
    $customer = $observer->getEvent()->getCustomer();
    $this->customerService->processPostSave($customer);
}
```

### 2. Check for Data Changes

Don't perform expensive operations if data didn't change:

```php
public function execute(Observer $observer): void
{
    $customer = $observer->getEvent()->getCustomerDataObject();
    $original = $observer->getEvent()->getOrigCustomerDataObject();

    if ($customer->getEmail() === $original->getEmail()) {
        return; // No change
    }

    // Expensive operation
}
```

### 3. Handle Exceptions

Observers run in transactions. Unhandled exceptions rollback:

```php
public function execute(Observer $observer): void
{
    try {
        // Risky operation
    } catch (\Exception $e) {
        $this->logger->error($e->getMessage());
        // Don't rethrow if you want save to succeed
    }
}
```

### 4. Avoid Circular Dependencies

**Problem**: Observer saves customer → triggers event → same observer fires → infinite loop

**Solution**: Set flag in session or use different event:

```php
public function execute(Observer $observer): void
{
    if ($this->session->getData('processing_customer_save')) {
        return; // Prevent recursion
    }

    $this->session->setData('processing_customer_save', true);
    // ... do work
    $this->session->unsetData('processing_customer_save');
}
```

---

## Testing Plugins and Observers

### Unit Testing Plugins

```php
class TransactionWrapperTest extends \PHPUnit\Framework\TestCase
{
    public function testBeforeSaveOpensTransaction()
    {
        $plugin = new TransactionWrapper($this->resourceConnection);
        $subject = $this->createMock(CustomerRepositoryInterface::class);
        $customer = $this->createMock(CustomerInterface::class);

        $plugin->beforeSave($subject, $customer);

        // Assert transaction started
    }
}
```

### Integration Testing Observers

```php
class UpgradeOrderCustomerEmailObserverTest extends \Magento\TestFramework\TestCase\AbstractController
{
    /**
     * @magentoDataFixture Magento/Customer/_files/customer_with_orders.php
     */
    public function testEmailSynchronizesToOrders()
    {
        $customer = $this->customerRepository->get('customer@example.com');
        $customer->setEmail('newemail@example.com');
        $this->customerRepository->save($customer);

        // Load customer's orders
        $orders = $this->orderRepository->getList(
            $this->searchCriteriaBuilder
                ->addFilter('customer_id', $customer->getId())
                ->create()
        );

        foreach ($orders->getItems() as $order) {
            $this->assertEquals('newemail@example.com', $order->getCustomerEmail());
        }
    }
}
```

---

## Performance Monitoring

### Slow Observers to Watch

1. **UpgradeOrderCustomerEmailObserver**: May update hundreds of orders
2. **BeforeAddressSaveObserver**: External VAT API call (1-3 seconds)
3. **AfterAddressSaveObserver**: May trigger customer save (cascade)

### Profiling

Use Magento profiler to measure observer execution time:

```bash
bin/magento dev:profiler:enable html
```

Then check event dispatch times in profiler output.

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-03
**Magento Version**: 2.4.8

# Magento_Customer Execution Flows

This document traces the complete execution paths for key customer operations, showing the exact sequence of service contracts, plugins, events, observers, and database operations.

---

## Table of Contents

1. [Customer Registration Flow](#customer-registration-flow)
2. [Customer Login Flow](#customer-login-flow)
3. [Customer Save Flow](#customer-save-flow)
4. [Customer Email Change Flow](#customer-email-change-flow)
5. [Address Save Flow](#address-save-flow)
6. [Password Reset Flow](#password-reset-flow)
7. [Customer Logout Flow](#customer-logout-flow)
8. [Visitor Tracking Flow](#visitor-tracking-flow)

---

## Customer Registration Flow

### Entry Point
**Controller**: `Magento\Customer\Controller\Account\CreatePost::execute()`
**Route**: `POST /customer/account/createPost`
**Area**: frontend

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. HTTP POST Request to /customer/account/createPost           │
│    Form Data: firstname, lastname, email, password, addresses  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CreatePost Controller: Pre-checks                           │
│    - Check if already logged in (exit if true)                 │
│    - Check if registration is allowed                          │
│    - Validate form_key (CSRF protection)                       │
│    - Regenerate session ID (security)                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Extract Customer Data from Request                          │
│    - CustomerExtractor::extract('customer_account_create')     │
│    - Builds CustomerInterface DTO from POST data               │
│    - Extract address if 'create_address' checkbox checked      │
│    - Set newsletter subscription flag (extension attribute)    │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. AccountManagementInterface::createAccount()                 │
│    Implementation: Model\AccountManagement                     │
│    Parameters: $customer, $password, $redirectUrl              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. AccountManagement Internal Logic                            │
│    ├─ Validate password strength                               │
│    ├─ Check if email already exists (isEmailAvailable)         │
│    ├─ Hash password using Argon2ID13                           │
│    ├─ Set customer group (default or auto-assigned)            │
│    ├─ Set website_id from current store                        │
│    └─ Generate confirmation token if required                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. CustomerRepositoryInterface::save($customer, $passwordHash) │
│    Implementation: Model\ResourceModel\CustomerRepository      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. PLUGIN: TransactionWrapper::beforeSave() [sortOrder: -1]   │
│    - Opens database transaction                                │
│    - Ensures atomicity of customer + address save              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. CustomerRepository::save() - Main Logic                     │
│    ├─ Validate customer data (email format, required fields)   │
│    ├─ Check unique email constraint (email + website_id)       │
│    ├─ Convert DTO to Model (Customer\Model\Customer)           │
│    ├─ Set password_hash on model                               │
│    ├─ Call resourceModel->save() (database INSERT)             │
│    └─ Save addresses if provided                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Database Operations                                         │
│    ├─ INSERT into customer_entity (main table)                 │
│    ├─ INSERT into customer_entity_* (EAV attribute values)     │
│    └─ INSERT into customer_address_entity (if address provided)│
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. EVENT: customer_save_after_data_object                     │
│     Event Data: { customerDataObject, origCustomerDataObject } │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ├─ No observers fire (origCustomer is null for new)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. PLUGIN: TransactionWrapper::afterSave()                    │
│     - Commits database transaction                             │
│     - Rolls back on any exception                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. AccountManagement Post-Save Logic                          │
│     ├─ Process newsletter subscription (if opted in)           │
│     ├─ Send welcome email (or confirmation email if required)  │
│     └─ Return saved CustomerInterface DTO                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 13. Controller Post-Registration Logic                         │
│     ├─ Dispatch EVENT: customer_register_success               │
│     ├─ Check confirmation status                               │
│     ├─ If confirmed: Log customer in (setCustomerDataAsLoggedIn)│
│     ├─ If pending: Show "check email" message                  │
│     └─ Redirect to dashboard or requested URL                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 14. Session Creation (if auto-confirmed)                       │
│     ├─ Session::setCustomerDataAsLoggedIn($customer)           │
│     ├─ Dispatch EVENT: customer_login                          │
│     ├─ Dispatch EVENT: customer_data_object_login              │
│     └─ Delete mage-cache-sessid cookie (FPC invalidation)      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 15. HTTP Response: Redirect to customer dashboard              │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

**Transaction Safety**:
- The `TransactionWrapper` plugin (sortOrder -1) runs BEFORE all other plugins
- Ensures customer + addresses are saved atomically
- Rolls back on any validation or database error

**Email Confirmation**:
- If `customer/create_account/confirm` is enabled, confirmation required
- Customer receives email with confirmation link
- Account is inactive until confirmed

**Newsletter Subscription**:
- Stored as extension attribute during registration
- Processed by `AccountManagement` after customer save
- Separate subscription record created in newsletter tables

**Events Dispatched**:
1. `customer_register_success` - After AccountManagement completes
2. `customer_save_after_data_object` - After repository save
3. `customer_login` - If auto-login after registration (legacy)
4. `customer_data_object_login` - If auto-login (service contract)

---

## Customer Login Flow

### Entry Point
**Controller**: `Magento\Customer\Controller\Account\LoginPost::execute()`
**Route**: `POST /customer/account/loginPost`
**Area**: frontend

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. HTTP POST Request to /customer/account/loginPost            │
│    Form Data: login[username], login[password]                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. LoginPost Controller: Pre-checks                            │
│    - Validate form_key (CSRF protection)                       │
│    - Check if already logged in (exit if true)                 │
│    - Validate POST method                                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. AccountManagementInterface::authenticate($email, $password) │
│    Implementation: Model\AccountManagement                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. AccountManagement::authenticate() Internal Logic            │
│    ├─ Load customer by email + website_id                      │
│    ├─ Check if customer account is active                      │
│    ├─ Check if email confirmation is pending                   │
│    └─ Delegate to AuthenticationInterface                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. AuthenticationInterface::authenticate($customerId, $password)│
│    Implementation: Model\Authentication                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Authentication::authenticate() Password Validation          │
│    ├─ Load customer model by ID                                │
│    ├─ Retrieve password_hash from customer_entity              │
│    ├─ Verify password using Encryptor::validateHash()          │
│    ├─ Check if password hash algorithm is outdated             │
│    ├─ Process lock mechanism (failed login attempts)           │
│    └─ Throw exception if authentication fails                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. EVENT: customer_customer_authenticated                      │
│    Event Data: { model: $customer, password: $password }       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ├─ OBSERVER: CustomerGroupAuthenticate
                          │  - Validates customer group is active
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Password Hash Upgrade (if needed)                           │
│    - If hash uses old algorithm (SHA256, MD5)                  │
│    - Rehash with current algorithm (Argon2ID13)                │
│    - Update customer_entity.password_hash                      │
│    - Handled by UpgradeCustomerPasswordObserver                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. AccountManagement Returns CustomerInterface                 │
│    - Returns fully loaded customer DTO                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. Session::setCustomerDataAsLoggedIn($customer)              │
│     ├─ Store customer data in session storage                  │
│     ├─ Set customer_id, customer_group_id in session           │
│     ├─ Regenerate session ID (security - session fixation)     │
│     └─ Set session cookie                                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. EVENT: customer_login (Legacy)                             │
│     Event Data: { customer: $customerModel }                   │
│     Area: frontend                                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ├─ OBSERVER: LogLastLoginAtObserver
                          │  - UPDATE customer_log SET last_login_at = NOW()
                          │
                          ├─ OBSERVER: CustomerLoginSuccessObserver
                          │  - Business logic (custom implementations)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. EVENT: customer_data_object_login (Service Contract)       │
│     Event Data: { customer: $customerDataObject }              │
│     Area: frontend                                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ├─ OBSERVER: Visitor\BindCustomerLoginObserver
                          │  - Bind visitor session to logged-in customer
                          │  - UPDATE customer_visitor SET customer_id = ?
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 13. Controller Post-Login Logic                                │
│     ├─ Set success message                                     │
│     ├─ Dispatch custom event: customer_login_success           │
│     ├─ Clear cart persistent data if needed                    │
│     ├─ Determine redirect URL (dashboard or referer)           │
│     └─ Delete mage-cache-sessid cookie (FPC invalidation)      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 14. HTTP Response: Redirect to dashboard or requested page     │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

**Authentication vs. Authorization**:
- **Authentication**: Verify identity (password check)
- **Authorization**: Check customer group is active (observer)

**Session Security**:
- Session ID regenerated on login (prevents session fixation)
- Session validated on each request (cutoff validator)
- Customer group stored in session for performance

**Failed Login Attempts**:
- Tracked in `customer_entity.failures_num`, `first_failure`, `lock_expires`
- After X failures (configurable), account temporarily locked
- Lock duration configurable in admin

**Database Updates**:
1. `customer_log.last_login_at` - Timestamp of last login
2. `customer_visitor.customer_id` - Link visitor session to customer
3. `customer_entity.password_hash` - Upgrade if using old algorithm

**Events Dispatched**:
1. `customer_customer_authenticated` - During authentication (before session)
2. `customer_login` - After successful login (legacy model event)
3. `customer_data_object_login` - After successful login (service contract)

---

## Customer Save Flow

This is the **core flow** for any customer update operation (profile edit, admin save, API update).

### Entry Point
**Service Contract**: `CustomerRepositoryInterface::save(CustomerInterface $customer, $passwordHash = null)`
**Implementation**: `Model\ResourceModel\CustomerRepository`

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CustomerRepositoryInterface::save() called                  │
│    Parameters: $customer (DTO), $passwordHash (optional)       │
│    Origin: Controller, API, Command, Observer, etc.            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. PLUGIN: TransactionWrapper::beforeSave() [sortOrder: -1]   │
│    Class: Plugin\CustomerRepository\TransactionWrapper         │
│    ├─ Begin database transaction                               │
│    └─ Store original customer data for rollback if needed      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. PLUGIN: REST API Plugins (if webapi_rest area)              │
│    - Various data transformations for API responses            │
│    - sortOrder: 10+                                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. CustomerRepository::save() - Main Method                    │
│    Implementation begins                                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Load Original Customer (for updates)                        │
│    ├─ If $customer->getId() exists: Load existing              │
│    ├─ Store original for comparison                            │
│    └─ If new customer: Original is null                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Validation                                                  │
│    ├─ Validate email format                                    │
│    ├─ Validate required fields (firstname, lastname, etc.)     │
│    ├─ Check email uniqueness (email + website_id)              │
│    ├─ Validate custom attribute values                         │
│    └─ Throw InputException if validation fails                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. DTO to Model Conversion                                     │
│    ├─ Convert CustomerInterface DTO to Customer Model          │
│    ├─ Set password_hash if provided                            │
│    ├─ Set custom EAV attributes                                │
│    └─ Prepare for database persistence                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. EVENT: customer_save_before (Legacy)                        │
│    Event Data: { object: $customerModel }                      │
│    - Rarely used in modern code                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. Database Persistence                                        │
│    ├─ ResourceModel\Customer::save($customerModel)             │
│    ├─ UPDATE customer_entity (if existing)                     │
│    │  OR INSERT customer_entity (if new)                       │
│    ├─ UPDATE/INSERT customer_entity_varchar (EAV attributes)   │
│    ├─ UPDATE/INSERT customer_entity_int, _datetime, etc.       │
│    └─ Update updated_at timestamp                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. EVENT: customer_save_after (Legacy)                        │
│     Event Data: { object: $customerModel }                     │
│     - Legacy observers may use this                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. Convert Model Back to DTO                                  │
│     ├─ Load fresh data from database (to get auto-IDs, etc.)   │
│     ├─ Convert Customer Model to CustomerInterface DTO         │
│     └─ Prepare for return and event dispatch                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. EVENT: customer_save_after_data_object ★ CRITICAL ★        │
│     Event Data: {                                              │
│         customerDataObject: $customer (new state),             │
│         origCustomerDataObject: $originalCustomer (old state)  │
│     }                                                           │
│     Area: global                                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ├─ OBSERVER: UpgradeOrderCustomerEmailObserver
                          │  └─ If email changed:
                          │     - Find all orders for this customer with old email
                          │     - UPDATE sales_order SET customer_email = new email
                          │
                          ├─ OBSERVER: UpgradeQuoteCustomerEmailObserver
                          │  └─ If email changed:
                          │     - Find active quote for this customer
                          │     - UPDATE quote SET customer_email = new email
                          │
                          └─ OBSERVER: Custom observers (third-party)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 13. PLUGIN: TransactionWrapper::afterSave()                    │
│     ├─ Commit database transaction                             │
│     ├─ All changes persisted atomically                        │
│     └─ On exception: Rollback transaction and re-throw         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 14. Return CustomerInterface DTO to caller                     │
│     - Contains updated data including auto-generated IDs       │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

**Transaction Wrapper Pattern**:
- Critical plugin with sortOrder -1 (runs first)
- Wraps entire save operation in database transaction
- Ensures customer + addresses + EAV attributes saved atomically
- Rolls back on ANY exception

**Email Synchronization Side Effect**:
- When customer email changes, observers update related records
- **Orders**: All historical orders get new email (for customer lookup)
- **Quotes**: Active quote gets new email (for cart recovery emails)
- This is a **side effect** of customer save - not explicit business logic

**Original vs. New Customer Data**:
- `origCustomerDataObject` contains data BEFORE save
- `customerDataObject` contains data AFTER save
- Observers compare to detect changes (e.g., email change)

**Why Two Save Events?**:
1. `customer_save_after` - Legacy model-based event (deprecated pattern)
2. `customer_save_after_data_object` - Service contract event (modern, preferred)

**Database Tables Modified**:
- `customer_entity` - Main customer record
- `customer_entity_varchar`, `customer_entity_int`, etc. - EAV attributes
- `sales_order` - Email sync (via observer)
- `quote` - Email sync (via observer)

---

## Customer Email Change Flow

This is a **critical business flow** because email is the primary customer identifier.

### Entry Point
Any operation that calls `CustomerRepositoryInterface::save()` with a changed email

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Customer Email Updated via Repository Save                  │
│    - User updates email in profile or admin changes it         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. CustomerRepository::save() Process                          │
│    - See "Customer Save Flow" above for full details           │
│    - Database updated with new email                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. EVENT: customer_save_after_data_object                      │
│    Event Data:                                                 │
│      customerDataObject.email = "new@example.com"              │
│      origCustomerDataObject.email = "old@example.com"          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ├─────────────────────────┐
                          │                         │
                          ▼                         ▼
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│ OBSERVER:                       │   │ OBSERVER:                       │
│ UpgradeOrderCustomerEmailObserver   │ UpgradeQuoteCustomerEmailObserver
└─────────────────┬───────────────┘   └─────────────────┬───────────────┘
                  │                                     │
                  ▼                                     ▼
┌───────────────────────────────────────────────────────────────────────┐
│ 4a. Order Email Synchronization                                      │
│     Class: Observer\UpgradeOrderCustomerEmailObserver                │
│                                                                       │
│     Logic:                                                            │
│     ├─ Check if origCustomerDataObject exists (not new customer)     │
│     ├─ Compare old email vs. new email                               │
│     ├─ If changed:                                                    │
│     │  ├─ Build SearchCriteria:                                      │
│     │  │  - customer_id = $customerId                                │
│     │  │  - customer_email = $oldEmail                               │
│     │  ├─ OrderRepository::getList($searchCriteria)                  │
│     │  ├─ Iterate all matching orders                                │
│     │  ├─ Set new email: $order->setCustomerEmail($newEmail)         │
│     │  └─ Collection save: $orders->save()                           │
│     └─ Side Effect: Historical orders now searchable by new email    │
└───────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────┐
│ 4b. Quote Email Synchronization                                      │
│     Class: Observer\UpgradeQuoteCustomerEmailObserver                │
│                                                                       │
│     Logic:                                                            │
│     ├─ Check if origCustomerDataObject exists (not new customer)     │
│     ├─ Compare old email vs. new email                               │
│     ├─ If changed:                                                    │
│     │  ├─ Try to load active quote:                                  │
│     │  │  QuoteRepository::getForCustomer($customerId)               │
│     │  ├─ If quote exists:                                           │
│     │  │  ├─ $quote->setCustomerEmail($newEmail)                     │
│     │  │  └─ QuoteRepository::save($quote)                           │
│     │  └─ Catch NoSuchEntityException (no active cart)               │
│     └─ Side Effect: Cart recovery emails sent to new address         │
└───────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Database State After Email Change                           │
│    ├─ customer_entity.email = "new@example.com"                │
│    ├─ sales_order.customer_email = "new@example.com" (all)     │
│    └─ quote.customer_email = "new@example.com" (active cart)   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

**Why Synchronize Email?**

1. **Order Lookup**: Admin "View Orders" searches by customer_email
2. **Customer Reports**: Order reports grouped by customer_email
3. **Cart Recovery**: Abandoned cart emails sent to quote.customer_email
4. **Data Integrity**: Email is denormalized across tables for performance

**Performance Implications**:
- **Order Sync**: May update many rows (customer with 100s of orders)
- Uses collection save (efficient bulk UPDATE)
- Runs in same transaction as customer save (atomic)

**Why Collection Save Instead of Repository**:
```php
// Observer uses collection save for efficiency
$orders->setDataToAll(OrderInterface::CUSTOMER_EMAIL, $newEmail);
$orders->save(); // Single query: UPDATE sales_order SET customer_email = ? WHERE entity_id IN (...)
```

**What If Observer Fails?**:
- TransactionWrapper rolls back the entire operation
- Customer email NOT changed in database
- Orders and quote remain with old email
- User sees error message

**Email Uniqueness Constraint**:
- Email must be unique within website scope
- Validated BEFORE observers run
- Constraint: UNIQUE KEY (email, website_id)

---

## Address Save Flow

### Entry Point
**Service Contract**: `AddressRepositoryInterface::save(AddressInterface $address)`
**Implementation**: `Model\ResourceModel\AddressRepository`

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. AddressRepositoryInterface::save($address) called           │
│    Origin: Frontend form, admin, API, checkout                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. AddressRepository::save() - Validation                      │
│    ├─ Validate address has parent customer_id                  │
│    ├─ Validate region matches country                          │
│    ├─ Validate postal code format (if country requires)        │
│    ├─ Validate required fields (street, city, etc.)            │
│    └─ Throw InputException if validation fails                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Convert DTO to Model                                        │
│    ├─ AddressInterface → Model\Address                         │
│    ├─ Set custom EAV attributes                                │
│    └─ Preserve customer_id (parent_id in database)             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. EVENT: customer_address_save_before                         │
│    Event Data: { object: $addressModel }                       │
│    Area: global                                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ├─ OBSERVER: BeforeAddressSaveObserver
                          │  └─ Validates VAT number if provided
                          │     - Checks EU VAT validation service (if enabled)
                          │     - Sets vat_is_valid flag
                          │     - May adjust customer group based on VAT status
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Database Persistence                                        │
│    ├─ ResourceModel\Address::save($addressModel)               │
│    ├─ UPDATE customer_address_entity (if existing)             │
│    │  OR INSERT customer_address_entity (if new)               │
│    ├─ UPDATE/INSERT customer_address_entity_varchar (EAV)      │
│    ├─ UPDATE/INSERT customer_address_entity_int, _text, etc.   │
│    └─ Update updated_at timestamp                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Update Default Address Flags on Customer (if needed)        │
│    ├─ If address marked as default_billing:                    │
│    │  UPDATE customer_entity SET default_billing = $addressId  │
│    ├─ If address marked as default_shipping:                   │
│    │  UPDATE customer_entity SET default_shipping = $addressId │
│    └─ Ensures customer record points to default addresses      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. EVENT: customer_address_save_after                          │
│    Event Data: { object: $addressModel }                       │
│    Area: global                                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ├─ OBSERVER: AfterAddressSaveObserver
                          │  └─ Complex VAT handling logic:
                          │     - If VAT validation result changed
                          │     - May trigger customer group change
                          │     - Updates customer_entity.group_id
                          │     - Invalidates customer session/cache
                          │     - IMPORTANT: Can modify customer during address save!
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Convert Model Back to DTO and Return                        │
│    └─ Return AddressInterface with updated data                │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

**VAT Validation Side Effects**:
- `BeforeAddressSaveObserver` validates VAT number with EU service
- `AfterAddressSaveObserver` may change customer group based on VAT status
- **Critical**: Address save can trigger customer save (group change)
- This is B2B-specific functionality

**Default Address Handling**:
- Customer can have one default billing and one default shipping address
- Flags stored in `customer_address_entity.is_default_billing/shipping`
- Customer entity also stores FKs: `default_billing`, `default_shipping`
- Ensures fast lookup without querying all addresses

**Region Validation**:
- If country has predefined regions (states), region_id must be valid
- If region is free-form (e.g., UK), region text field is used
- Directory module provides region data

**Street Lines**:
- Street is stored as multiline (array)
- Default: 2 lines, configurable up to 4
- Stored as newline-separated string in database

**Database Tables Modified**:
- `customer_address_entity` - Main address record
- `customer_address_entity_varchar`, `_int`, etc. - EAV attributes
- `customer_entity` - Default address pointers (if address is default)

---

## Password Reset Flow

### Entry Point
**Controller**: `Magento\Customer\Controller\Account\ForgotPasswordPost::execute()`
**Route**: `POST /customer/account/forgotPasswordPost`

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Requests Password Reset                                │
│    Form Data: email                                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. AccountManagementInterface::initiatePasswordReset()         │
│    Parameters: $email, $template, $websiteId                   │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. AccountManagement::initiatePasswordReset() Logic            │
│    ├─ Load customer by email + website_id                      │
│    ├─ Generate random reset token (UUID)                       │
│    ├─ Set expiration timestamp (default: 1 hour)               │
│    ├─ Update customer:                                         │
│    │  - rp_token = $token                                      │
│    │  - rp_token_created_at = NOW()                            │
│    ├─ Save customer (via repository)                           │
│    └─ Send password reset email with token                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Database Update                                             │
│    UPDATE customer_entity SET                                  │
│      rp_token = ?,                                             │
│      rp_token_created_at = NOW()                               │
│    WHERE entity_id = ?                                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Email Sent with Reset Link                                  │
│    URL: /customer/account/createPassword?token=...&id=...      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. User Clicks Link in Email                                   │
│    Navigates to password reset form                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Controller: CreatePassword::execute()                       │
│    ├─ Validate token exists in request                         │
│    ├─ Call AccountManagement::validateResetPasswordLinkToken() │
│    ├─ If valid: Show password reset form                       │
│    └─ If invalid/expired: Show error                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. User Submits New Password                                   │
│    POST to /customer/account/resetPasswordPost                 │
│    Form Data: token, password, password_confirmation           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 9. AccountManagementInterface::resetPassword()                 │
│    Parameters: $email, $resetToken, $newPassword               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 10. AccountManagement::resetPassword() Logic                   │
│     ├─ Load customer by email                                  │
│     ├─ Validate token matches customer.rp_token                │
│     ├─ Validate token not expired (created_at + expiry)        │
│     ├─ Hash new password (Argon2ID13)                          │
│     ├─ Update customer:                                        │
│     │  - password_hash = $newHash                              │
│     │  - rp_token = NULL                                       │
│     │  - rp_token_created_at = NULL                            │
│     └─ Save customer (via repository)                          │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 11. Database Update                                            │
│     UPDATE customer_entity SET                                 │
│       password_hash = ?,                                       │
│       rp_token = NULL,                                         │
│       rp_token_created_at = NULL                               │
│     WHERE entity_id = ?                                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 12. Success Response                                           │
│     - Show success message                                     │
│     - Redirect to login page                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

**Token Security**:
- Token is random UUID (not predictable)
- Token stored in `customer_entity.rp_token`
- Token has expiration time (configurable, default 1 hour)
- Token invalidated (set to NULL) after successful use

**Token Validation**:
- Must match exactly
- Must not be expired
- Must belong to correct customer (token + email verified)

**One-Time Use**:
- After successful password reset, token is cleared
- Same token cannot be reused
- Old tokens automatically invalid when new reset requested

**Security Considerations**:
- Rate limiting on password reset requests (prevent email bombing)
- Token expiration prevents old emails being used
- No indication if email exists (security - prevent enumeration)

---

## Customer Logout Flow

### Entry Point
**Controller**: `Magento\Customer\Controller\Account\Logout::execute()`
**Route**: `GET /customer/account/logout`

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User Clicks Logout Link                                     │
│    GET /customer/account/logout                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. Logout Controller::execute()                                │
│    ├─ Get current customer from session                        │
│    └─ Store customer ID for event dispatch                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. Session::logout()                                           │
│    ├─ Clear customer data from session                         │
│    ├─ Set customer_id = null                                   │
│    ├─ Set customer_group_id = NOT_LOGGED_IN (0)                │
│    └─ Regenerate session ID (security)                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. EVENT: customer_logout                                      │
│    Event Data: { customer: $customerModel }                    │
│    Area: frontend                                              │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ├─ OBSERVER: LogLastLogoutAtObserver
                          │  └─ UPDATE customer_log SET last_logout_at = NOW()
                          │     WHERE customer_id = ?
                          │
                          ├─ OBSERVER: ClearSessionsAfterLogoutPlugin (via plugin)
                          │  └─ Clear other sessions for this customer
                          │     (if multi-session management enabled)
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Clear Customer-Specific Data                                │
│    ├─ Clear shopping cart items                                │
│    ├─ Clear compared products                                  │
│    ├─ Clear wishlist session data                              │
│    └─ Clear any custom session data                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. Invalidate Full Page Cache for Customer                     │
│    ├─ Delete mage-cache-sessid cookie                          │
│    └─ Customer will see public (non-personalized) pages        │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. HTTP Response: Redirect to homepage or logout success page  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

**Session Security**:
- Session ID regenerated on logout (prevents session fixation)
- Customer data completely removed from session
- Session itself may be destroyed (configurable)

**Customer Log**:
- `customer_log.last_logout_at` updated via observer
- Used for activity tracking, compliance, reporting

**Shopping Cart**:
- Guest cart is preserved (quote.customer_id = NULL)
- Items remain in database for cart recovery
- Cart persistence configurable in admin

**Multi-Tab Considerations**:
- Logout in one tab affects all tabs (shared session)
- Other tabs will see "not logged in" state on next request

---

## Visitor Tracking Flow

Magento tracks both anonymous and authenticated visitors for analytics and personalization.

### Entry Point
**Observer**: `Visitor\InitByRequestObserver` on `controller_action_predispatch` event

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Page Request (Any Frontend Page)                            │
│    - User navigates to any storefront URL                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. EVENT: controller_action_predispatch                        │
│    - Dispatched BEFORE every controller action                 │
│    - Area: frontend only                                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. OBSERVER: Visitor\InitByRequestObserver                     │
│    ├─ Check if visitor already tracked in session              │
│    ├─ If not: Create new visitor record                        │
│    ├─ Load or create Model\Visitor instance                    │
│    └─ Store visitor in session                                 │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. Visitor::initByRequest()                                    │
│    ├─ Generate session_id (or use existing)                    │
│    ├─ Check if session already in customer_visitor table       │
│    ├─ If new:                                                   │
│    │  INSERT INTO customer_visitor                             │
│    │    (session_id, last_visit_at)                            │
│    │  VALUES (?, NOW())                                        │
│    └─ If existing: Load visitor data                           │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Controller Action Executes (Main Page Logic)                │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 6. EVENT: controller_action_postdispatch                       │
│    - Dispatched AFTER controller action completes              │
│    - Area: frontend only                                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. OBSERVER: Visitor\SaveByRequestObserver                     │
│    ├─ Get visitor from session                                 │
│    ├─ Update last_visit_at to NOW()                            │
│    └─ UPDATE customer_visitor                                  │
│       SET last_visit_at = NOW()                                │
│       WHERE visitor_id = ?                                     │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 8. Response Sent to Browser                                    │
└─────────────────────────────────────────────────────────────────┘
```

### Visitor Login Flow

When a visitor logs in, their visitor record is linked to their customer account:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Customer Logs In (See Customer Login Flow)                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. EVENT: customer_data_object_login                           │
│    Event Data: { customer: $customerDataObject }               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. OBSERVER: Visitor\BindCustomerLoginObserver                 │
│    ├─ Get current visitor from session                         │
│    ├─ Bind visitor to customer:                                │
│    │  UPDATE customer_visitor                                  │
│    │  SET customer_id = ?                                      │
│    │  WHERE visitor_id = ?                                     │
│    └─ Now visitor tracking linked to customer account          │
└─────────────────────────────────────────────────────────────────┘
```

### Quote-Visitor Binding

When a visitor adds items to cart, the quote is linked to the visitor:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Quote Saved (Add to Cart, Update Cart)                      │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. EVENT: sales_quote_save_after                               │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. OBSERVER: Visitor\BindQuoteCreateObserver                   │
│    ├─ Get current visitor from session                         │
│    ├─ If visitor exists and quote doesn't have visitor_id:     │
│    │  UPDATE quote                                             │
│    │  SET visitor_id = ?                                       │
│    │  WHERE entity_id = ?                                      │
│    └─ Links cart to visitor for analytics                      │
└─────────────────────────────────────────────────────────────────┘
```

### Key Points

**Visitor Record Lifecycle**:
1. **Anonymous**: Visitor created on first page view, customer_id = NULL
2. **Logged In**: After login, customer_id set to link visitor to customer
3. **Logged Out**: Visitor record persists, new session_id on next visit

**Why Track Visitors?**:
- Analytics (page views, session duration)
- Cart abandonment tracking
- Recently viewed products
- Customer activity reports
- Online customers report in admin

**Performance**:
- Two database writes per request (init + save)
- Can be disabled if not needed
- Uses simple indexed queries (fast)

**Privacy Considerations**:
- Visitor data may be PII if linked to customer
- Subject to GDPR/privacy regulations
- Cleanup jobs should purge old visitor data

---

## Summary: Event and Observer Reference

### Events Dispatched by Customer Module

| Event | When | Data | Area |
|-------|------|------|------|
| `customer_register_success` | After successful registration | customer, account_controller | frontend |
| `customer_save_before` | Before customer model save | object: $customerModel | global |
| `customer_save_after` | After customer model save | object: $customerModel | global |
| `customer_save_after_data_object` | After customer DTO save | customerDataObject, origCustomerDataObject | global |
| `customer_login` | After successful login | customer: $customerModel | frontend |
| `customer_data_object_login` | After successful login (DTO) | customer: $customerDTO | frontend |
| `customer_logout` | After logout | customer: $customerModel | frontend |
| `customer_customer_authenticated` | During authentication | model, password | frontend |
| `customer_address_save_before` | Before address save | object: $addressModel | global |
| `customer_address_save_after` | After address save | object: $addressModel | global |

### Critical Observers in Customer Module

| Observer | Event | Purpose | Side Effects |
|----------|-------|---------|--------------|
| `UpgradeOrderCustomerEmailObserver` | customer_save_after_data_object | Sync email to orders | UPDATE sales_order |
| `UpgradeQuoteCustomerEmailObserver` | customer_save_after_data_object | Sync email to quote | UPDATE quote |
| `BeforeAddressSaveObserver` | customer_address_save_before | Validate VAT | May set VAT flags |
| `AfterAddressSaveObserver` | customer_address_save_after | Process VAT result | May change customer group! |
| `LogLastLoginAtObserver` | customer_login | Log login time | UPDATE customer_log |
| `LogLastLogoutAtObserver` | customer_logout | Log logout time | UPDATE customer_log |
| `Visitor\BindCustomerLoginObserver` | customer_data_object_login | Link visitor to customer | UPDATE customer_visitor |
| `Visitor\BindQuoteCreateObserver` | sales_quote_save_after | Link quote to visitor | UPDATE quote |
| `CustomerGroupAuthenticate` | customer_customer_authenticated | Validate group active | May block login |
| `UpgradeCustomerPasswordObserver` | customer_customer_authenticated | Upgrade password hash | UPDATE customer_entity |

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-03
**Magento Version**: 2.4.8

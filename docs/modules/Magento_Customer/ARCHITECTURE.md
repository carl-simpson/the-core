# Magento_Customer Module Architecture

## Quick Stats

- **Total Nodes**: 194 (91 classes, 38 interfaces, 19 plugins, 18 virtual types, 16 observers, 12 events)
- **Total Edges**: 123 (40 preferences, 29 injections, 20 intercepts, 18 virtual extensions, 16 observes)
- **Dependencies**: Magento_Eav, Magento_Directory
- **Module Version**: 100.0.2+
- **Magento Compatibility**: 2.4.x
- **Area Coverage**: global, frontend, adminhtml, webapi_rest, webapi_soap

---

## Module Overview

### What Magento_Customer Does

The **Magento_Customer** module is the foundational component for managing customer accounts, authentication, and customer data throughout the Magento ecosystem. It provides:

1. **Customer Account Management**: Registration, login, profile updates, password management
2. **Address Management**: Customer address CRUD operations with EAV attribute support
3. **Customer Groups**: Group-based pricing and catalog rule management
4. **Authentication & Authorization**: Login validation, password hashing, session management
5. **Metadata Management**: EAV attribute definitions for customers and addresses
6. **Email Notifications**: Account creation, password reset, email change notifications
7. **REST/SOAP APIs**: Complete service contract implementation for external integrations
8. **Visitor Tracking**: Anonymous and authenticated visitor session tracking

### Core Business Responsibilities

**Primary Domain**: Customer Identity and Account Management

**Key Operations**:
- Customer registration (guest to customer conversion)
- Customer authentication (login/logout)
- Profile and address CRUD operations
- Customer group assignment and management
- Email synchronization across orders and quotes
- Password reset workflows
- Customer session management
- EAV attribute management for extensibility

---

## Position in Magento Ecosystem

### Architectural Layer: **Foundation Module**

The Customer module sits at the **foundation layer** of Magento's architecture, providing essential services to nearly all customer-facing and admin modules.

```
┌─────────────────────────────────────────────────────────────────┐
│                      CUSTOMER-FACING MODULES                    │
│  Checkout, Sales, Quote, Wishlist, Review, Newsletter, etc.    │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ depends on
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     MAGENTO_CUSTOMER MODULE                     │
│  Customer Identity, Authentication, Groups, Addresses           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ depends on
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     FOUNDATION MODULES                          │
│         Magento_Eav, Magento_Directory, Magento_Store           │
└─────────────────────────────────────────────────────────────────┘
```

### Module Relationships

**Direct Dependencies** (defined in module.xml):
- **Magento_Eav**: Customer and address entities use EAV for extensible attributes
- **Magento_Directory**: Address regions, countries, and geographic data

**Key Dependent Modules** (modules that depend on Magento_Customer):
- **Magento_Sales**: Customer order association, email synchronization
- **Magento_Quote**: Customer quote association, email synchronization, guest checkout
- **Magento_Checkout**: Customer checkout flows, address selection
- **Magento_Wishlist**: Customer wishlist management (we found a plugin for this!)
- **Magento_Review**: Customer product reviews
- **Magento_Newsletter**: Customer newsletter subscriptions
- **Magento_Catalog**: Customer group pricing, catalog rules
- **Magento_Tax**: Customer tax class assignments
- **Magento_MultipleWishlist** (EE): Multiple wishlists per customer
- **Magento_CustomerBalance** (EE): Store credit balances
- **Magento_Reward** (EE): Reward points

---

## Service Contracts (API Layer)

The Customer module follows Magento's service contract pattern rigorously, exposing all functionality through well-defined interfaces.

### Core Repository Interfaces

#### 1. CustomerRepositoryInterface
**Purpose**: Main CRUD interface for customer entities

**Location**: `Magento\Customer\Api\CustomerRepositoryInterface`
**Implementation**: `Magento\Customer\Model\ResourceModel\CustomerRepository`

**Methods**:
```php
save(CustomerInterface $customer, $passwordHash = null): CustomerInterface
get($email, $websiteId = null): CustomerInterface
getById($customerId): CustomerInterface
getList(SearchCriteriaInterface $searchCriteria): CustomerSearchResultsInterface
delete(CustomerInterface $customer): bool
deleteById($customerId): bool
```

**Key Plugins**:
- `TransactionWrapper` (sortOrder: -1) - Database transaction management
- REST API plugins (webapi_rest area)

**Events Dispatched**:
- `customer_save_after_data_object` - Triggers email sync observers

---

#### 2. AddressRepositoryInterface
**Purpose**: CRUD operations for customer addresses

**Location**: `Magento\Customer\Api\AddressRepositoryInterface`
**Implementation**: `Magento\Customer\Model\ResourceModel\AddressRepository`

**Methods**:
```php
save(AddressInterface $address): AddressInterface
getById($addressId): AddressInterface
getList(SearchCriteriaInterface $searchCriteria): AddressSearchResultsInterface
delete(AddressInterface $address): bool
deleteById($addressId): bool
```

**Events Integration**:
- Observers validate addresses before save
- After save, indexers may be triggered

---

#### 3. AccountManagementInterface
**Purpose**: High-level account operations (authentication, password, activation)

**Location**: `Magento\Customer\Api\AccountManagementInterface`
**Implementation**: `Magento\Customer\Model\AccountManagement`

**Key Methods**:
```php
createAccount(CustomerInterface $customer, $password = null, $redirectUrl = ''): CustomerInterface
authenticate($username, $password): CustomerInterface
changePassword($email, $currentPassword, $newPassword): bool
initiatePasswordReset($email, $template, $websiteId = null): bool
resetPassword($email, $resetToken, $newPassword): bool
validateResetPasswordLinkToken($customerId, $resetPasswordLinkToken): bool
isEmailAvailable($customerEmail, $websiteId = null): bool
getDefaultBillingAddress($customerId): AddressInterface|null
getDefaultShippingAddress($customerId): AddressInterface|null
```

**Important Notes**:
- This interface is marked for `webapi_soap` area in preferences
- Handles complex authentication flows
- Dispatches multiple events for login/logout workflows

---

#### 4. GroupRepositoryInterface
**Purpose**: Customer group management

**Location**: `Magento\Customer\Api\GroupRepositoryInterface`
**Implementation**: `Magento\Customer\Model\ResourceModel\GroupRepository`

**Methods**:
```php
save(GroupInterface $group): GroupInterface
getById($id): GroupInterface
getList(SearchCriteriaInterface $searchCriteria): GroupSearchResultsInterface
delete(GroupInterface $group): bool
deleteById($id): bool
```

**Key Plugins**:
- `saveCustomerGroupExcludedWebsite` - Manages website exclusions for groups
- `deleteCustomerGroupExcludedWebsite` - Cleanup on group deletion
- `getByIdCustomerGroupExcludedWebsite` - Populates excluded website data
- `getListCustomerGroupExcludedWebsite` - Adds excluded websites to search results

---

### Metadata Management Interfaces

#### 5. CustomerMetadataInterface
**Purpose**: Retrieve customer attribute metadata (form rendering, validation rules)

**Location**: `Magento\Customer\Api\CustomerMetadataInterface`
**Implementation**: `Magento\Customer\Model\Metadata\CustomerCachedMetadata`

**Why Cached**: Metadata is expensive to compute (EAV attributes), cached version wraps the base metadata provider

**Methods**:
```php
getAttributes($formCode): AttributeMetadataInterface[]
getAttributeMetadata($attributeCode): AttributeMetadataInterface
getAllAttributesMetadata(): AttributeMetadataInterface[]
getCustomAttributesMetadata($dataObjectClassName = null): AttributeMetadataInterface[]
```

---

#### 6. AddressMetadataInterface
**Purpose**: Retrieve address attribute metadata

**Location**: `Magento\Customer\Api\AddressMetadataInterface`
**Implementation**: `Magento\Customer\Model\Metadata\AddressCachedMetadata`

**Similar caching strategy as CustomerMetadataInterface**

---

### Management Interfaces

#### 7. GroupManagementInterface
**Purpose**: Customer group business logic (default group retrieval, NOT_LOGGED_IN group)

**Location**: `Magento\Customer\Api\GroupManagementInterface`
**Implementation**: `Magento\Customer\Model\GroupManagement`

**Methods**:
```php
getDefaultGroup($storeId = null): GroupInterface
getNotLoggedInGroup(): GroupInterface
isReadonly($id): bool
getLoggedInGroups(): GroupInterface[]
getAllCustomersGroup(): GroupInterface
```

---

#### 8. CustomerManagementInterface
**Purpose**: Customer count operations (used for licensing, statistics)

**Location**: `Magento\Customer\Api\CustomerManagementInterface`
**Implementation**: `Magento\Customer\Model\CustomerManagement`

**Methods**:
```php
getCount(): int
```

---

### Additional Service Contracts

| Interface | Implementation | Purpose |
|-----------|----------------|---------|
| `CustomerGroupConfigInterface` | `CustomerGroupConfig` | Group configuration access |
| `CustomerMetadataManagementInterface` | `CustomerMetadataManagement` | Attribute management operations |
| `AddressMetadataManagementInterface` | `AddressMetadataManagement` | Address attribute management |
| `AuthenticationInterface` | `Authentication` | Password validation and hashing |
| `EmailNotificationInterface` | `EmailNotification` | Transactional email sending |
| `CustomerNameGenerationInterface` | `Helper\View` | Customer name formatting (Mr. John Doe, etc.) |
| `SessionCleanerInterface` | `Session\SessionCleaner` | Session cleanup for logged-out customers |
| `GroupExcludedWebsiteRepositoryInterface` | `ResourceModel\GroupExcludedWebsiteRepository` | Multi-website group exclusions |

---

## Data Objects (API\Data)

All data transfer objects implement interfaces in `Magento\Customer\Api\Data` namespace:

| Interface | Implementation | Description |
|-----------|----------------|-------------|
| `CustomerInterface` | `Model\Data\Customer` | Customer entity data |
| `AddressInterface` | `Model\Data\Address` | Customer address data |
| `RegionInterface` | `Model\Data\Region` | Address region (state/province) |
| `GroupInterface` | `Model\Data\Group` | Customer group data |
| `AttributeMetadataInterface` | `Model\Data\AttributeMetadata` | EAV attribute metadata |
| `OptionInterface` | `Model\Data\Option` | Attribute option values |
| `ValidationRuleInterface` | `Model\Data\ValidationRule` | Attribute validation rules |
| `ValidationResultsInterface` | `Model\Data\ValidationResults` | Validation results container |
| `GroupExcludedWebsiteInterface` | `Model\Data\GroupExcludedWebsite` | Group website exclusions |
| `CustomerSearchResultsInterface` | `Model\CustomerSearchResults` | Customer search results |
| `AddressSearchResultsInterface` | `Model\AddressSearchResults` | Address search results |
| `GroupSearchResultsInterface` | `Model\GroupSearchResults` | Group search results |

**Extension Attributes**: All data interfaces support extension attributes for third-party extensibility.

---

## Database Schema

### Primary Tables

#### customer_entity
**Purpose**: Main customer data (EAV entity)

**Key Columns**:
- `entity_id` (PK) - Customer ID
- `website_id` - Multi-website support
- `email` - Unique per website
- `group_id` - FK to customer_group
- `store_id` - Preferred store
- `created_at`, `updated_at` - Timestamps
- `is_active` - Account activation status
- `disable_auto_group_change` - Prevent automatic group changes
- `created_in` - Store view where created
- `prefix`, `firstname`, `middlename`, `lastname`, `suffix` - Name fields
- `dob` - Date of birth
- `taxvat` - Tax/VAT number
- `gender` - Gender attribute
- `default_billing`, `default_shipping` - FK to customer_address_entity

**Indexes**:
- `CUSTOMER_ENTITY_EMAIL_WEBSITE_ID` (email, website_id) - Unique constraint
- `CUSTOMER_ENTITY_WEBSITE_ID` - Website filtering
- `CUSTOMER_ENTITY_FIRSTNAME`, `CUSTOMER_ENTITY_LASTNAME` - Name searches

---

#### customer_address_entity
**Purpose**: Customer addresses (EAV entity)

**Key Columns**:
- `entity_id` (PK) - Address ID
- `parent_id` - FK to customer_entity (customer_id)
- `created_at`, `updated_at` - Timestamps
- `is_active` - Active address flag
- `city`, `company`, `country_id`, `fax`, `firstname`, `lastname` - Address fields
- `middlename`, `postcode`, `prefix`, `region`, `region_id`, `street` - More address fields
- `suffix`, `telephone`, `vat_id` - Additional fields

**Indexes**:
- `CUSTOMER_ADDRESS_ENTITY_PARENT_ID` - Customer's addresses lookup

---

#### customer_group
**Purpose**: Customer groups (for pricing, catalog rules)

**Key Columns**:
- `customer_group_id` (PK) - Group ID
- `customer_group_code` - Group code (NOT LOGGED IN, General, Wholesale, etc.)
- `tax_class_id` - FK to tax_class

**System Groups**:
- `0` - NOT LOGGED IN
- `1` - General (default)
- `2` - Wholesale (default)
- `3` - Retail (default)

---

#### customer_group_excluded_website
**Purpose**: Multi-website group exclusions (B2B feature)

**Key Columns**:
- `entity_id` (PK)
- `customer_group_id` - FK to customer_group
- `website_id` - FK to store_website

**Use Case**: Prevent certain customer groups from being used on specific websites

---

#### customer_visitor
**Purpose**: Track website visitors (anonymous and logged-in)

**Key Columns**:
- `visitor_id` (PK)
- `customer_id` - FK to customer_entity (null for guests)
- `session_id` - Session identifier
- `last_visit_at` - Last activity timestamp

---

#### customer_log
**Purpose**: Track customer login/logout timestamps

**Key Columns**:
- `log_id` (PK)
- `customer_id` - FK to customer_entity (unique)
- `last_login_at` - Last successful login
- `last_logout_at` - Last logout timestamp

**Usage**: Powered by observers that listen to login/logout events

---

### EAV Tables

Customer and Address entities use standard EAV structure:

**Customer EAV Tables**:
- `customer_entity_datetime`
- `customer_entity_decimal`
- `customer_entity_int`
- `customer_entity_text`
- `customer_entity_varchar`
- `customer_eav_attribute` - Customer-specific attribute metadata
- `customer_form_attribute` - Form-to-attribute associations

**Address EAV Tables**:
- `customer_address_entity_datetime`
- `customer_address_entity_decimal`
- `customer_address_entity_int`
- `customer_address_entity_text`
- `customer_address_entity_varchar`

**Attribute Metadata Tables**:
- `eav_attribute` (shared with catalog)
- `eav_entity_type` (customer = type_id 1, customer_address = type_id 2)

---

## Extension Points

### Plugin Intercept Points

The module provides **19 plugins** for customization:

**Critical Intercept Points**:
1. `CustomerRepositoryInterface::save` - Customer save operations
2. `AccountManagementInterface::authenticate` - Login flows
3. `GroupRepositoryInterface` - Group operations
4. `Framework\View\Layout` - Frontend depersonalization for caching
5. `Framework\App\ActionInterface` - Customer notification injection

**See PLUGINS_AND_OBSERVERS.md for complete plugin reference**

---

### Event-Based Extension Points

The module dispatches **12 core events**:

**Customer Lifecycle Events**:
- `customer_save_before` - Before customer save (legacy)
- `customer_save_after` - After customer save (legacy)
- `customer_save_after_data_object` - After customer save (service contract) **← Most important**
- `customer_delete_before` - Before customer deletion
- `customer_delete_after` - After customer deletion

**Authentication Events**:
- `customer_login` - After successful login
- `customer_logout` - After logout
- `customer_data_object_login` - After login (service contract version)
- `customer_customer_authenticated` - During authentication process

**Address Events**:
- `customer_address_save_before` - Before address save
- `customer_address_save_after` - After address save

**Quote/Checkout Events** (observed by Customer module):
- `sales_quote_save_after` - Visitor binding to quote
- `checkout_quote_destroy` - Cleanup on quote destruction

**See EXECUTION_FLOWS.md for event sequences in specific operations**

---

## Areas and Scopes

### Area Coverage

The module operates across all Magento areas:

| Area | Purpose | Key Components |
|------|---------|----------------|
| **global** | Core business logic, repositories, plugins | Most service contracts, observers |
| **frontend** | Customer-facing UI, authentication, account | Controllers, blocks, layouts, depersonalization |
| **adminhtml** | Admin customer management, grids, forms | Admin controllers, UI components, ACL |
| **webapi_rest** | REST API endpoints | REST-specific plugins, data formatters |
| **webapi_soap** | SOAP API endpoints | SOAP-specific configurations |

### Configuration Scopes

Customer module configurations respect Magento's scope hierarchy:

| Configuration | Scope | Path |
|---------------|-------|------|
| Customer account sharing | Global/Website | `customer/account_share/scope` |
| Default customer group | Website | `customer/create_account/default_group` |
| Email templates | Store View | `customer/create_account/*` |
| Address validation | Website | `customer/address/*` |
| Password requirements | Website | `customer/password/*` |

---

## Virtual Types

The module defines **18 virtual types** for specialized configurations:

**Key Virtual Types**:

```xml
<virtualType name="SessionValidator" type="Magento\Framework\Session\CompositeValidator">
    <!-- Composite validator for customer session validation -->
</virtualType>

<virtualType name="CustomerAddressSnapshot" type="Magento\Framework\Model\ResourceModel\Db\VersionControl\Snapshot">
    <!-- Snapshot for address version control -->
</virtualType>

<virtualType name="CustomerAddressRelationsComposite" type="Magento\Framework\Model\ResourceModel\Db\VersionControl\RelationComposite">
    <!-- Address entity relations -->
</virtualType>
```

**Why Virtual Types?**
- Avoid creating physical classes for simple DI configurations
- Reuse base types with different constructor arguments
- Common pattern for validators, collections, and composite objects

---

## Dependencies Deep Dive

### Module.xml Dependencies

```xml
<sequence>
    <module name="Magento_Eav"/>
    <module name="Magento_Directory"/>
</sequence>
```

**Why Magento_Eav?**
- Customer and Address are EAV entities
- Attribute metadata management
- Custom attribute extensibility
- Form rendering based on attributes

**Why Magento_Directory?**
- Country/region associations for addresses
- Geographic data validation
- Address formatting based on locale

### Implicit Dependencies (via DI)

While not in module.xml, the Customer module integrates with:

- **Magento_Store**: Website/store associations, scope management
- **Magento_Framework**: Session, encryption, validation, email
- **Magento_Backend**: Admin UI components, ACL, admin session
- **Magento_Ui**: Admin grids, forms (customer listing, edit forms)
- **Magento_Quote**: Quote customer association (via observers and plugins)
- **Magento_Sales**: Order customer association (via observers)
- **Magento_PageCache**: Depersonalization plugin for FPC/Varnish
- **Magento_Wishlist**: Wishlist plugin for email notifications

---

## Performance Considerations

### Caching Strategy

1. **Metadata Caching**:
   - `CustomerCachedMetadata` and `AddressCachedMetadata` wrap metadata providers
   - Prevents repeated EAV attribute queries
   - Cache tags: `EAV_ENTITY_TYPES`, `CUSTOMER_ATTRIBUTE_METADATA`

2. **Full Page Cache (FPC)**:
   - `DepersonalizePlugin` on `Framework\View\Layout` (frontend area)
   - Removes customer-specific data from cached pages
   - Uses private content (customer sections) for personalization

3. **Session Storage**:
   - Customer session stored in configured session storage (Redis, database, files)
   - Session validation includes cutoff time checks

### Database Performance

**Indexes**:
- Email + website_id unique index for fast customer lookups
- Parent_id index on addresses for customer's addresses
- Customer_id index on visitor log

**EAV Performance Implications**:
- Customer and Address use EAV - expect multiple table joins
- Flat tables not available for customers (unlike catalog products)
- SearchCriteria with filters may not use indexes efficiently

**Optimization Tips**:
- Use `getById()` instead of `get($email)` when possible (primary key lookup)
- Batch operations with collections instead of repository in loops
- Consider custom indexers for complex customer searches

---

## Security & Authorization

### Password Management

**Hashing**:
- Uses `Magento\Framework\Encryption\EncryptorInterface`
- Default: Argon2ID13 (Magento 2.4+)
- Supports upgrade path from older hash algorithms (SHA256, MD5)

**Password Reset**:
- Token-based reset (random token with expiration)
- Tokens stored in `customer_entity.rp_token`, `rp_token_created_at`
- Default expiration: Configured in admin (typically 1-24 hours)

### Admin Access Control (ACL)

**Resources** (defined in `etc/acl.xml`):
- `Magento_Customer::manage` - Main customer management permission
- `Magento_Customer::customer` - Customer operations
- `Magento_Customer::group` - Customer group management
- `Magento_Customer::online` - View online customers

### API Security

**REST/SOAP**:
- All operations require token authentication
- Customer token vs. Admin token for different permissions
- Rate limiting applies (configured globally)

**CSRF Protection**:
- Frontend forms use form_key validation
- API uses token-based auth (no CSRF needed)

---

## Testing Strategy

### Unit Tests
**Coverage**: High coverage for business logic
**Location**: `Test/Unit/`
**Focus**:
- Repository method logic
- Observers (email sync, validation)
- Plugins (transaction wrapper, depersonalization)
- Helpers and utilities

### Integration Tests
**Coverage**: Database operations, service contracts
**Location**: `Test/Integration/`
**Focus**:
- Customer CRUD via repository
- Address operations
- Group management
- EAV attribute operations
- Email notifications

### API Functional Tests (MFTF)
**Coverage**: End-to-end customer workflows
**Location**: `Test/Mftf/`
**Focus**:
- Customer registration flows
- Login/logout
- Password reset
- Address management
- Admin customer creation

---

## Backward Compatibility Notes

### API Stability

**@api Interfaces**:
- All interfaces in `Api\` namespace are marked `@api`
- Breaking changes forbidden in minor/patch releases
- Extension attributes used for adding new data points

### Database Schema

**Declarative Schema**: Uses `etc/db_schema.xml`
- Schema changes via declarative schema (Magento 2.3+)
- Old upgrade scripts still present for historical context
- Whitelist in `db_schema_whitelist.json`

### Configuration Paths

**Stable Paths**:
- `customer/account_share/scope`
- `customer/create_account/default_group`
- `customer/password/*`

**Deprecated Paths**: Check upgrade notes for moved configurations

---

## Migration and Upgrade Considerations

### Common Upgrade Issues

1. **Password Hash Migration**:
   - Old Magento 1 MD5 hashes automatically upgraded on first login
   - Observer: `UpgradeCustomerPasswordObserver`

2. **Email Synchronization**:
   - When customer email changes, orders and quotes must be updated
   - Handled automatically by observers (side effects during save)

3. **EAV Attribute Changes**:
   - Adding attributes: Use data patches in `Setup/Patch/Data/`
   - Removing attributes: Must handle existing data gracefully

4. **Session Changes**:
   - Session validator changes may log out customers
   - Cutoff validator prevents stale sessions

---

## Module Configuration Files

### Key Configuration Files

| File | Purpose |
|------|---------|
| `etc/module.xml` | Module declaration, dependencies, version |
| `etc/di.xml` | Global DI configuration, preferences, plugins (40+ preferences) |
| `etc/frontend/di.xml` | Frontend-specific plugins (depersonalization) |
| `etc/adminhtml/di.xml` | Admin-specific configurations |
| `etc/webapi_rest/di.xml` | REST API-specific plugins |
| `etc/events.xml` | Global event-observer mappings |
| `etc/frontend/events.xml` | Frontend-specific observers |
| `etc/db_schema.xml` | Declarative database schema |
| `etc/acl.xml` | Admin resource permissions |
| `etc/webapi.xml` | REST/SOAP API route definitions |
| `etc/extension_attributes.xml` | Extension attribute definitions |
| `etc/config.xml` | Default configuration values |
| `etc/adminhtml/system.xml` | Admin configuration options |

---

## Common Patterns Used

### 1. Repository Pattern
All CRUD operations go through repository interfaces, never direct model operations in API layer.

### 2. Service Contracts
Every business operation exposed via interface in `Api\` namespace.

### 3. Data Transfer Objects (DTO)
Data entities implement `Api\Data\*Interface`, separated from business logic models.

### 4. EAV Entity Pattern
Customer and Address extend `Magento\Eav\Model\Entity\AbstractEntity` for extensibility.

### 5. Observer Pattern
Lifecycle events dispatched at save/delete/login/logout for extensibility.

### 6. Plugin Pattern
Critical operations intercepted via plugins (transaction wrapper, depersonalization, notification).

### 7. Proxy Pattern
Heavy dependencies injected as proxies to avoid circular dependencies and improve performance:
- `CustomerRepositoryInterface\Proxy`
- `Customer\Model\Config\Share\Proxy`
- `Customer\Model\Url\Proxy`

### 8. Factory Pattern
Factories used for creating new customer/address instances in repositories.

### 9. Composite Validator Pattern
Session validators, address validators use composite pattern for extensibility.

---

## Healthcare Platform Considerations

### PII and HIPAA Compliance

**Customer Data as PII**:
- Customer entity contains PII: name, email, DOB, addresses
- Must be encrypted at rest (application-level encryption for sensitive fields)
- Audit logging for customer data access and modifications

**Recommendations for Healthcare**:
1. Add custom observer to log customer data access
2. Encrypt sensitive custom attributes (medical history, prescriptions)
3. Implement data retention policies (GDPR/HIPAA)
4. Use Magento's encryption service for sensitive customer attributes
5. Consider separate customer groups for patients vs. caregivers

### Multi-Brand Support

**Website-Level Separation**:
- Customer accounts can be shared across websites or isolated
- Configuration: `customer/account_share/scope` (Global = 0, Website = 1)

**Healthcare Multi-Brand (UKMeds, UKPets, MinuteMeds, EUMeds)**:
- Use **website-scoped** customer accounts (scope = 1)
- Separate customer groups per brand if pricing differs
- Use customer attributes to track brand preferences
- Plugin on `CustomerRepositoryInterface::save` to enforce brand-specific validation

### Age Verification and BMI Restrictions

**Implementation Strategy**:
- Store DOB in customer entity (standard attribute)
- Add custom EAV attributes: `weight`, `height`, `bmi`
- Create plugin on product add-to-cart to check customer age/BMI against product restrictions
- Observer on customer save to calculate and store BMI

**Example Plugin**:
```php
// Plugin: Magento\Checkout\Model\Cart::addProduct
// Check customer DOB and BMI against product custom attributes
```

### Prescription Workflows

**Customer Extension Attributes**:
- Add `prescription_on_file` boolean flag
- Add `prescriber_id` reference to prescriber entity (custom module)
- Add `last_prescription_date` timestamp

**Integration Points**:
- Observer on `customer_save_after_data_object` to validate prescription status
- Plugin on checkout to block prescription products without valid prescription
- Custom customer group: "Prescription Patients" vs. "OTC Customers"

---

## Next Steps

For detailed information on specific aspects of the Customer module:

1. **Execution Flows**: See [EXECUTION_FLOWS.md](./EXECUTION_FLOWS.md) for step-by-step customer registration, login, save, and address management flows
2. **Plugins & Observers**: See [PLUGINS_AND_OBSERVERS.md](./PLUGINS_AND_OBSERVERS.md) for complete reference of all 19 plugins and 16 observers
3. **Module Integrations**: See [INTEGRATIONS.md](./INTEGRATIONS.md) for how Customer integrates with Sales, Quote, Checkout, Wishlist, etc.
4. **Annotated Code**: See [annotated/](./annotated/) directory for heavily commented versions of key classes

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-03
**Magento Version**: 2.4.8
**PHP Version**: 8.4

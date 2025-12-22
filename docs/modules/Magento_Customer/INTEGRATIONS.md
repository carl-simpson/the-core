# Magento_Customer Module Integrations

This document maps how the Magento_Customer module integrates with other core modules in the Magento ecosystem.

---

## Integration Overview

The Customer module is a **foundation module** that provides customer identity services to nearly all customer-facing and admin modules in Magento.

###Integration Categories

1. **Direct Dependencies** - Modules Customer depends on
2. **Dependent Modules** - Modules that depend on Customer
3. **Cross-Module Plugins** - Customer intercepts other modules
4. **External Integrations** - Customer provides interfaces for others
5. **Event-Based Integration** - Loose coupling via events

---

## Direct Dependencies

These modules are required by Customer (defined in module.xml).

### Magento_Eav

**Why**: Customer and Address entities use EAV (Entity-Attribute-Value) pattern

**Integration Points**:
- Customer extends `Magento\Eav\Model\Entity\AbstractEntity`
- Custom attributes defined via EAV
- Attribute metadata management
- Form rendering from EAV attributes

**Database Tables**:
- `eav_entity_type` - Customer (type_id=1), CustomerAddress (type_id=2)
- `eav_attribute` - Shared attribute definitions
- `customer_eav_attribute` - Customer-specific attribute metadata
- `customer_form_attribute` - Form-to-attribute mapping

**Key Services Used**:
- `Magento\Eav\Model\Config` - EAV configuration
- `Magento\Eav\Api\AttributeRepositoryInterface` - Attribute CRUD
- `Magento\Eav\Model\Entity\Attribute\Source\*` - Attribute source models

---

### Magento_Directory

**Why**: Address management requires country/region data

**Integration Points**:
- Address validation (country exists, region belongs to country)
- Region dropdown population
- Postal code format validation
- Address formatting by locale

**Database Tables**:
- `directory_country` - Country codes
- `directory_country_region` - States/provinces
- `directory_currency_rate` - Currency conversion (for display prices)

**Key Services Used**:
- `Magento\Directory\Model\Country` - Country data
- `Magento\Directory\Model\Region` - Region data
- `Magento\Directory\Helper\Data` - Directory helpers

**Example Usage**:
```php
// Validate region belongs to country
$address = $customer->getDefaultBillingAddress();
if ($address->getCountryId() === 'US') {
    $regionModel = $this->regionFactory->create()->loadByCode($address->getRegion(), 'US');
    if (!$regionModel->getId()) {
        throw new InputException(__('Invalid region for United States'));
    }
}
```

---

## Dependent Modules

These modules depend on Customer and use its services.

### Magento_Sales

**Why**: Orders associate with customers

**Integration Type**: Database foreign keys, observers, service contracts

#### Database Integration

```sql
-- sales_order table
customer_id INT REFERENCES customer_entity(entity_id)
customer_email VARCHAR(255)
customer_firstname VARCHAR(255)
customer_lastname VARCHAR(255)
customer_group_id INT REFERENCES customer_group(customer_group_id)
```

**Denormalization**: Customer data copied to order for performance (avoid JOINs).

#### Email Synchronization

**Observer**: `Magento\Customer\Observer\UpgradeOrderCustomerEmailObserver`
**Event**: `customer_save_after_data_object`

**Behavior**: When customer email changes, all their orders are updated:

```php
// Triggered automatically on customer email change
UPDATE sales_order
SET customer_email = 'newemail@example.com'
WHERE customer_id = 123
  AND customer_email = 'oldemail@example.com'
```

**Why**: Admin "View Orders" searches by customer_email. Must stay in sync.

#### Order History

**Service**: `Magento\Sales\Api\OrderRepositoryInterface::getList()`

```php
// Get customer's orders
$searchCriteria = $this->searchCriteriaBuilder
    ->addFilter('customer_id', $customerId)
    ->addSortOrder('created_at', 'DESC')
    ->create();

$orders = $this->orderRepository->getList($searchCriteria);
```

#### Customer Group Pricing

**Integration**: Order pricing uses customer group for discounts

```php
$order->getCustomerGroupId(); // Used for price calculation
```

---

### Magento_Quote

**Why**: Shopping carts associate with customers (guest and logged-in)

**Integration Type**: Database foreign keys, observers, guest-to-customer conversion

#### Database Integration

```sql
-- quote table
customer_id INT REFERENCES customer_entity(entity_id) -- NULL for guest
customer_email VARCHAR(255)
customer_firstname VARCHAR(255)
customer_lastname VARCHAR(255)
customer_group_id INT
visitor_id INT REFERENCES customer_visitor(visitor_id)
```

#### Guest vs. Customer Quotes

**Guest Quote**:
- `customer_id = NULL`
- `customer_is_guest = 1`
- Tracked by `session_id` or `visitor_id`

**Customer Quote**:
- `customer_id = 123`
- `customer_is_guest = 0`
- Persistent across sessions

#### Quote-Customer Binding

**Event**: `customer_data_object_login`
**Observer**: `Magento\Quote\Observer\BindCustomerToQuoteObserver` (in Quote module)

**Behavior**: When customer logs in, active guest quote is assigned to customer:

```php
// Triggered on login
$quote = $this->quoteRepository->getActiveForCustomer($customerId);
if (!$quote->getId()) {
    // Get guest quote from session
    $guestQuote = $this->checkoutSession->getQuote();
    $guestQuote->setCustomer($customer);
    $guestQuote->setCustomerId($customer->getId());
    $guestQuote->setCustomerEmail($customer->getEmail());
    $guestQuote->setCustomerIsGuest(0);
    $this->quoteRepository->save($guestQuote);
}
```

**Result**: Guest cart becomes customer cart on login (preserves items).

#### Email Synchronization

**Observer**: `Magento\Customer\Observer\UpgradeQuoteCustomerEmailObserver`
**Event**: `customer_save_after_data_object`

**Behavior**: When customer email changes, active quote updated:

```php
UPDATE quote
SET customer_email = 'newemail@example.com'
WHERE customer_id = 123
  AND is_active = 1
```

**Why**: Cart abandonment emails sent to quote.customer_email.

#### Visitor Binding

**Observer**: `Magento\Customer\Observer\Visitor\BindQuoteCreateObserver`
**Event**: `sales_quote_save_after`

**Behavior**: Links quote to visitor session for analytics:

```php
UPDATE quote SET visitor_id = 456 WHERE entity_id = 789
```

---

### Magento_Checkout

**Why**: Checkout process requires customer authentication or guest email

**Integration Type**: Session management, address population, customer creation

#### Guest Checkout

**Flow**:
1. Guest adds items to cart
2. Checkout: Provide email (no account creation)
3. Quote remains guest (`customer_is_guest = 1`)
4. Order created with guest data

**Optional**: "Create account" checkbox converts guest to customer after order placement.

#### Customer Checkout

**Flow**:
1. Customer logs in
2. Checkout: Address book populated from customer addresses
3. Customer can select saved addresses or add new
4. Order created with customer_id reference

#### Address Population

**Service**: `Magento\Customer\Api\AddressRepositoryInterface`

```php
// Populate checkout address dropdown
$searchCriteria = $this->searchCriteriaBuilder
    ->addFilter('parent_id', $customerId)
    ->create();

$addresses = $this->addressRepository->getList($searchCriteria)->getItems();
```

#### Default Address Selection

```php
$customer = $this->customerRepository->getById($customerId);
$defaultBillingId = $customer->getDefaultBilling();
$defaultShippingId = $customer->getDefaultShipping();

if ($defaultBillingId) {
    $billingAddress = $this->addressRepository->getById($defaultBillingId);
    $quote->getBillingAddress()->importCustomerAddressData($billingAddress);
}
```

---

### Magento_Wishlist

**Why**: Wishlists are per-customer

**Integration Type**: Database foreign key, plugin

#### Database Integration

```sql
-- wishlist table
customer_id INT REFERENCES customer_entity(entity_id)
```

**Constraint**: One wishlist per customer (or multiple in Enterprise).

#### Cross-Module Plugin

**Plugin**: `Magento\Wishlist\Plugin\SaveWishlistDataAndAddReferenceKeyToBackUrl`
**Intercepts**: `Magento\Customer\Model\EmailNotificationInterface`

**Purpose**: Adds wishlist data to customer email notifications.

```xml
<!-- In Magento_Wishlist module -->
<type name="Magento\Customer\Model\EmailNotificationInterface">
    <plugin name="saveWishlistDataAndAddReferenceKeyToBackUrl"
            type="Magento\Wishlist\Plugin\SaveWishlistDataAndAddReferenceKeyToBackUrl"/>
</type>
```

**Example**: Welcome email includes "You have 3 items in your wishlist" link.

---

### Magento_Review

**Why**: Product reviews can be tied to customers

**Integration Type**: Database foreign key, display logic

#### Database Integration

```sql
-- review_detail table
customer_id INT REFERENCES customer_entity(entity_id) -- NULL for guest reviews
```

#### Customer Review Display

```php
// Get customer's reviews
$reviews = $this->reviewCollection
    ->addCustomerFilter($customerId)
    ->addStoreFilter($storeId);
```

**Benefit**: Customer sees "Your reviews" in account dashboard.

---

### Magento_Newsletter

**Why**: Newsletter subscriptions per customer

**Integration Type**: Database foreign key, registration integration

#### Database Integration

```sql
-- newsletter_subscriber table
customer_id INT REFERENCES customer_entity(entity_id) -- NULL for non-customer subscribers
subscriber_email VARCHAR(255)
```

#### Registration Integration

**Flow**:
1. Customer registers with "Subscribe to newsletter" checkbox
2. Extension attribute set: `$customer->getExtensionAttributes()->setIsSubscribed(true)`
3. `AccountManagement::createAccount()` processes subscription
4. Newsletter subscriber record created

```php
// In AccountManagement after customer save
if ($customer->getExtensionAttributes()->getIsSubscribed()) {
    $subscriber = $this->subscriberFactory->create()->loadByEmail($customer->getEmail());
    if (!$subscriber->getId()) {
        $subscriber->setCustomerId($customer->getId());
        $subscriber->setEmail($customer->getEmail());
        $subscriber->setStatus(Subscriber::STATUS_SUBSCRIBED);
        $subscriber->save();
    }
}
```

#### Email Synchronization

When customer email changes, newsletter subscription must be updated:

```php
// Custom observer (not in core, but recommended)
$subscriber = $this->subscriberFactory->create()->loadByCustomerId($customerId);
if ($subscriber->getId()) {
    $subscriber->setEmail($newEmail);
    $subscriber->save();
}
```

---

### Magento_Catalog

**Why**: Customer groups affect product pricing and catalog rules

**Integration Type**: Customer group pricing, catalog rule conditions

#### Customer Group Pricing

**Database**: `catalog_product_entity_tier_price`

```sql
-- Tier pricing per customer group
product_id INT
customer_group_id INT REFERENCES customer_group(customer_group_id)
qty DECIMAL
value DECIMAL
```

**Example**: Wholesale customers (group_id=2) get 10% off when buying 100+ units.

#### Catalog Price Rules

**Integration**: Catalog rules can target specific customer groups

**Database**: `catalogrule_customer_group`

```sql
rule_id INT
customer_group_id INT
```

**Example Rule**: "20% off for VIP customers (group_id=5) on weekends"

**Observer**: `Magento\Customer\Observer\CatalogRule\AddCustomerGroupExcludedWebsite`
**Event**: `catalog_rule_collection_load_after`

**Behavior**: Filters catalog rules to exclude customer groups not allowed on current website (B2B).

---

### Magento_Tax

**Why**: Customer tax class determines tax rate

**Integration Type**: Database foreign key, tax calculation

#### Database Integration

```sql
-- customer_group table
tax_class_id INT REFERENCES tax_class(class_id)
```

**Example Tax Classes**:
- Retail customers: "Retail Customer" tax class (full sales tax)
- Wholesale customers: "Wholesale Customer" tax class (resale certificate, no tax)
- EU B2B: "Intra-EU" tax class (reverse charge, no VAT)

#### Tax Calculation

```php
$customerGroupId = $customer->getGroupId();
$group = $this->groupRepository->getById($customerGroupId);
$taxClassId = $group->getTaxClassId();

// Tax calculation uses tax class
$taxDetails = $this->taxCalculation->calculateTax($price, $taxClassId, $storeId);
```

#### VAT Validation

**Observer**: `Magento\Customer\Observer\BeforeAddressSaveObserver`

**Behavior**: Validates VAT number with EU VIES service, then changes customer group based on validity.

**Flow**:
1. Customer adds address with VAT number
2. Observer calls EU VAT validation API
3. If valid: Assign to "Intra-EU" group (no VAT)
4. If invalid: Keep in "Retail" group (VAT charged)

---

### Magento_Store

**Why**: Customers are scoped to websites

**Integration Type**: Website association, customer account sharing

#### Database Integration

```sql
-- customer_entity table
website_id INT REFERENCES store_website(website_id)
store_id INT REFERENCES store(store_id) -- Preferred store
```

#### Account Sharing Modes

**Global** (`customer/account_share/scope = 0`):
- One customer account across all websites
- Email must be globally unique
- Customer can log in to any website

**Per Website** (`customer/account_share/scope = 1`):
- Separate accounts per website
- Same email can exist on multiple websites
- Customer logs in to specific website only

#### Configuration

```php
$scope = $this->scopeConfig->getValue(
    \Magento\Customer\Model\Config\Share::XML_PATH_CUSTOMER_ACCOUNT_SHARE
);

if ($scope == \Magento\Customer\Model\Config\Share::SHARE_GLOBAL) {
    // Global - email unique across all websites
} else {
    // Per website - email unique per website
}
```

---

### Magento_PageCache (FPC/Varnish)

**Why**: Customer personalization with full page cache requires special handling

**Integration Type**: Depersonalization plugin, customer sections (private content)

#### Depersonalization Plugin

**Plugin**: `Magento\Customer\Model\Layout\DepersonalizePlugin`
**Intercepts**: `Magento\Framework\View\Layout::generateElements()`
**Area**: frontend

**Purpose**: Remove customer-specific data from cached pages

**Behavior**:
1. Page renders with customer session data
2. Before caching, plugin clears customer data
3. Cached page has no customer PII
4. All users (logged in or not) get same cached page
5. Customer-specific content loaded via AJAX (customer sections)

**Example**:
```html
<!-- Cached HTML (depersonalized) -->
<div class="customer-name" data-bind="text: customer().firstname"></div>

<!-- JavaScript loads customer data via AJAX -->
<script>
require(['Magento_Customer/js/customer-data'], function (customerData) {
    var customer = customerData.get('customer');
    // Populates customer name after page load
});
</script>
```

#### Customer Sections

**Endpoint**: `GET /customer/section/load/sections/cart,customer,wishlist`

**Response**:
```json
{
  "customer": {
    "firstname": "John",
    "lastname": "Doe",
    "email": "john@example.com"
  },
  "cart": {
    "summary_count": 3,
    "subtotal": "$99.99"
  },
  "wishlist": {
    "counter": 5
  }
}
```

**Caching**: Sections cached in browser localStorage, TTL configurable.

---

### Magento_Backend (Admin)

**Why**: Admin manages customers

**Integration Type**: Admin controllers, UI components, ACL

#### Admin Controllers

**Routes**:
- `admin/customer/index` - Customer grid
- `admin/customer/edit` - Edit customer
- `admin/customer/save` - Save customer
- `admin/customer/delete` - Delete customer
- `admin/customer_group/index` - Customer groups

#### UI Components

**Customer Grid**: `view/adminhtml/ui_component/customer_listing.xml`

**Features**:
- Filterable columns
- Mass actions (delete, assign group, subscribe to newsletter)
- Inline editing
- Export to CSV/XML

**Data Provider**: `Magento\Customer\Model\ResourceModel\Grid\Collection`

#### ACL Resources

```xml
<resource id="Magento_Customer::manage" title="Customers">
    <resource id="Magento_Customer::customer" title="All Customers">
        <resource id="Magento_Customer::create" title="Create Customer"/>
        <resource id="Magento_Customer::view" title="View Customer"/>
        <resource id="Magento_Customer::edit" title="Edit Customer"/>
        <resource id="Magento_Customer::delete" title="Delete Customer"/>
    </resource>
    <resource id="Magento_Customer::group" title="Customer Groups"/>
    <resource id="Magento_Customer::online" title="Online Customers"/>
</resource>
```

**Usage**:
```php
if (!$this->_authorization->isAllowed('Magento_Customer::delete')) {
    throw new AuthorizationException(__('You are not authorized.'));
}
```

---

## REST/GraphQL API Integration

### REST API

**Endpoints**: Auto-generated from service contracts

**Customer Endpoints**:
- `GET /V1/customers/:customerId` - Get customer
- `POST /V1/customers` - Create customer
- `PUT /V1/customers/:customerId` - Update customer
- `DELETE /V1/customers/:customerId` - Delete customer
- `GET /V1/customers/search?searchCriteria[...]` - Search customers

**Authentication**:
- Customer token: `POST /V1/integration/customer/token`
- Admin token: `POST /V1/integration/admin/token`

**Authorization Plugin**: `Magento\Customer\Model\Plugin\CustomerAuthorization`

**Behavior**: Customers can only access their own data. Admins can access any customer.

### GraphQL

**Queries**:
```graphql
query {
  customer {
    firstname
    lastname
    email
    addresses {
      firstname
      street
      city
      region { region }
      postcode
      country_code
    }
  }
}
```

**Mutations**:
```graphql
mutation {
  updateCustomer(input: {
    firstname: "Jane"
    lastname: "Doe"
  }) {
    customer {
      firstname
      lastname
    }
  }
}
```

---

## Healthcare Platform Specific Integrations

### Prescription Management (Custom Module)

**Integration Point**: Extension attributes

```php
// Add prescription data to customer
$extensionAttributes = $customer->getExtensionAttributes();
$extensionAttributes->setPrescriptionOnFile(true);
$extensionAttributes->setPrescriberId(123);
$extensionAttributes->setLastPrescriptionDate('2025-01-15');
$customer->setExtensionAttributes($extensionAttributes);
```

**Extension Attribute Definition**: `etc/extension_attributes.xml`

```xml
<extension_attributes for="Magento\Customer\Api\Data\CustomerInterface">
    <attribute code="prescription_on_file" type="boolean"/>
    <attribute code="prescriber_id" type="int"/>
    <attribute code="last_prescription_date" type="string"/>
</extension_attributes>
```

### Age Verification

**Custom Observer**:

```php
// Observer on customer_save_after_data_object
class ValidateAgeRestrictionObserver implements ObserverInterface
{
    public function execute(Observer $observer): void
    {
        $customer = $observer->getEvent()->getCustomerDataObject();
        $dob = new \DateTime($customer->getDob());
        $age = $dob->diff(new \DateTime())->y;

        // Store age as custom attribute for quick filtering
        $customer->setCustomAttribute('age', $age);

        // Check age restrictions for certain products
        if ($age < 18) {
            $customer->setCustomAttribute('age_restricted', true);
        }
    }
}
```

### Multi-Brand Support (UKMeds, UKPets, MinuteMeds, EUMeds)

**Website-Scoped Customers**:

```php
// Configuration: Per-website customer accounts
// customer/account_share/scope = 1

// UKMeds (website_id=1)
$ukmeds_customer = $this->customerRepository->get('patient@example.com', 1);

// UKPets (website_id=2) - Same email, different customer
$ukpets_customer = $this->customerRepository->get('patient@example.com', 2);

// These are DIFFERENT customers with different IDs
```

**Brand-Specific Customer Groups**:
- UKMeds Patients (group_id=10)
- UKPets Pet Owners (group_id=11)
- MinuteMeds Quick Buyers (group_id=12)
- EUMeds EU Customers (group_id=13)

---

## Summary: Integration Patterns

| Module | Integration Type | Key Mechanism |
|--------|-----------------|---------------|
| Magento_Eav | Direct Dependency | EAV entity inheritance |
| Magento_Directory | Direct Dependency | Address validation |
| Magento_Sales | Email Sync | Observer on customer save |
| Magento_Quote | Guest Conversion | Observer on customer login |
| Magento_Checkout | Address Population | Service contract calls |
| Magento_Wishlist | Cross-Module Plugin | Plugin on EmailNotification |
| Magento_Catalog | Group Pricing | Database foreign keys |
| Magento_Tax | Tax Class | Customer group tax class |
| Magento_PageCache | Depersonalization | Plugin on Layout |
| Magento_Backend | Admin UI | UI components, ACL |

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-03
**Magento Version**: 2.4.8

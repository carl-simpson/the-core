# Magento_Sales Module Integrations

This document maps how the Magento_Sales module integrates with other core modules and external systems in the Magento ecosystem.

---

## Integration Overview

The Sales module is a **core business module** that orchestrates order management, invoicing, shipping, and refunds. It acts as a central hub connecting customer data, catalog products, payment processing, and fulfillment.

### Integration Categories

1. **Direct Dependencies** - Modules Sales depends on
2. **Dependent Modules** - Modules that depend on Sales
3. **Cross-Module Plugins** - Sales intercepts other modules
4. **Event-Based Integration** - Loose coupling via events
5. **External Integrations** - Third-party systems and APIs

---

## Direct Dependencies

These modules are required by Sales (defined in module.xml).

### Magento_Customer

**Why**: Orders associate with customers (registered or guest)

**Integration Type**: Database foreign keys, observers, service contracts

#### Database Integration

```sql
-- sales_order table
customer_id INT REFERENCES customer_entity(entity_id)
customer_email VARCHAR(255)
customer_firstname VARCHAR(255)
customer_lastname VARCHAR(255)
customer_middlename VARCHAR(255)
customer_prefix VARCHAR(40)
customer_suffix VARCHAR(40)
customer_dob DATE
customer_taxvat VARCHAR(255)
customer_group_id INT REFERENCES customer_group(customer_group_id)
customer_is_guest TINYINT(1)
customer_note_notify TINYINT(1)
```

**Denormalization Strategy**: Customer data is **copied** to order table at time of placement to:
- Improve query performance (avoid JOINs)
- Preserve historical data (customer name at time of order)
- Enable guest checkouts (customer_id = NULL)

#### Customer Data Synchronization

**Observer**: `Magento\Sales\Observer\AssignOrderToCustomerObserver`
**Event**: `customer_save_after_data_object`

**Behavior**: When guest registers account, link their guest orders:

```php
public function execute(Observer $observer): void
{
    $customer = $observer->getEvent()->getCustomerDataObject();

    // Only for new customers
    if ($observer->getEvent()->getOrigCustomerDataObject()->getId()) {
        return;
    }

    // Find all guest orders with matching email
    $searchCriteria = $this->searchCriteriaBuilder
        ->addFilter('customer_id', null, 'null')
        ->addFilter('customer_email', $customer->getEmail())
        ->create();

    $orders = $this->orderRepository->getList($searchCriteria);

    foreach ($orders->getItems() as $order) {
        $order->setCustomerId($customer->getId());
        $order->setCustomerIsGuest(0);
        $order->setCustomerGroupId($customer->getGroupId());
        $this->orderRepository->save($order);
    }
}
```

**Database Impact**:

```sql
UPDATE sales_order
SET customer_id = 123,
    customer_is_guest = 0,
    customer_group_id = 1
WHERE customer_email = 'john@example.com'
  AND customer_id IS NULL
```

**Result**: Customer can now see all historical orders in "My Account".

#### Customer Group Integration

**Use Case**: Wholesale pricing, tax exemptions, custom discounts

```php
// Order uses customer group for pricing context
$order = $this->orderRepository->get($orderId);
$customerGroupId = $order->getCustomerGroupId();

// Get group details
$customerGroup = $this->groupRepository->getById($customerGroupId);
$groupName = $customerGroup->getCode(); // "General", "Wholesale", "VIP"
```

**Pricing Impact**: Customer group determines:
- Catalog price tier
- Tax class
- Shipping rates (B2B discounts)
- Payment methods available

---

### Magento_Quote

**Why**: **Critical Dependency** - Orders are created from quotes (shopping carts)

**Integration Type**: Quote → Order conversion, service orchestration

#### Quote to Order Conversion

**Service**: `Magento\Quote\Model\QuoteManagement::submit()`

**Flow**:

1. Validate quote totals
2. Reserve order increment ID
3. Create order from quote data
4. Copy quote items to order items
5. Copy addresses from quote to order
6. Process payment
7. Deduct inventory
8. Send confirmation email
9. Delete quote (or mark inactive)

#### Code Example

```php
// In QuoteManagement::submit()
public function submit(QuoteEntity $quote, $orderData = [])
{
    // 1. Prepare quote
    $quote->collectTotals();

    // 2. Convert to order
    $order = $this->orderFactory->create();
    $this->quoteConverter->toOrder($quote, $order);

    // 3. Copy items
    foreach ($quote->getAllVisibleItems() as $quoteItem) {
        $orderItem = $this->quoteConverter->itemToOrderItem($quoteItem);
        $order->addItem($orderItem);
    }

    // 4. Copy addresses
    $order->setBillingAddress(
        $this->quoteConverter->addressToOrderAddress($quote->getBillingAddress())
    );
    $order->setShippingAddress(
        $this->quoteConverter->addressToOrderAddress($quote->getShippingAddress())
    );

    // 5. Copy payment
    $order->setPayment(
        $this->quoteConverter->paymentToOrderPayment($quote->getPayment())
    );

    // 6. Save order
    $order = $this->orderRepository->save($order);

    // 7. Dispatch event
    $this->eventManager->dispatch('sales_order_place_after', ['order' => $order]);

    // 8. Deactivate quote
    $quote->setIsActive(false);
    $this->quoteRepository->save($quote);

    return $order;
}
```

#### Data Mapping: Quote → Order

| Quote Field | Order Field | Notes |
|-------------|-------------|-------|
| `quote.entity_id` | `order.quote_id` | Reference to source quote |
| `quote.grand_total` | `order.grand_total` | Final amount |
| `quote.customer_id` | `order.customer_id` | NULL for guest |
| `quote.customer_email` | `order.customer_email` | Required |
| `quote.billing_address_id` | `order.billing_address` | Converted to OrderAddressInterface |
| `quote.shipping_address_id` | `order.shipping_address` | Converted to OrderAddressInterface |
| `quote.items` | `order.items` | Converted to OrderItemInterface[] |

#### Quote Item → Order Item Conversion

```php
// QuoteItemToOrderItem converter
public function convert(QuoteItem $quoteItem): OrderItem
{
    $orderItem = $this->orderItemFactory->create();

    // Copy product data
    $orderItem->setProductId($quoteItem->getProductId());
    $orderItem->setName($quoteItem->getName());
    $orderItem->setSku($quoteItem->getSku());
    $orderItem->setProductType($quoteItem->getProductType());

    // Copy quantities
    $orderItem->setQtyOrdered($quoteItem->getQty());
    $orderItem->setQtyBackordered(0);
    $orderItem->setQtyInvoiced(0);
    $orderItem->setQtyShipped(0);
    $orderItem->setQtyRefunded(0);
    $orderItem->setQtyCanceled(0);

    // Copy pricing
    $orderItem->setPrice($quoteItem->getPrice());
    $orderItem->setBasePrice($quoteItem->getBasePrice());
    $orderItem->setRowTotal($quoteItem->getRowTotal());
    $orderItem->setBaseRowTotal($quoteItem->getBaseRowTotal());
    $orderItem->setTaxAmount($quoteItem->getTaxAmount());
    $orderItem->setBaseTaxAmount($quoteItem->getBaseTaxAmount());
    $orderItem->setDiscountAmount($quoteItem->getDiscountAmount());
    $orderItem->setBaseDiscountAmount($quoteItem->getBaseDiscountAmount());

    // Copy options (configurable/bundle)
    $orderItem->setProductOptions($quoteItem->getProductOptions());

    return $orderItem;
}
```

#### Address Conversion

```php
// QuoteAddressToOrderAddress converter
public function convert(QuoteAddress $quoteAddress): OrderAddress
{
    $orderAddress = $this->orderAddressFactory->create();

    $orderAddress->setFirstname($quoteAddress->getFirstname());
    $orderAddress->setLastname($quoteAddress->getLastname());
    $orderAddress->setCompany($quoteAddress->getCompany());
    $orderAddress->setStreet($quoteAddress->getStreet());
    $orderAddress->setCity($quoteAddress->getCity());
    $orderAddress->setRegion($quoteAddress->getRegion());
    $orderAddress->setRegionId($quoteAddress->getRegionId());
    $orderAddress->setPostcode($quoteAddress->getPostcode());
    $orderAddress->setCountryId($quoteAddress->getCountryId());
    $orderAddress->setTelephone($quoteAddress->getTelephone());
    $orderAddress->setVatId($quoteAddress->getVatId());

    return $orderAddress;
}
```

---

### Magento_Catalog

**Why**: Order items reference catalog products

**Integration Type**: Database foreign keys, product type handlers

#### Database Integration

```sql
-- sales_order_item table
product_id INT REFERENCES catalog_product_entity(entity_id)
product_type VARCHAR(255) -- simple, configurable, bundle, etc.
name VARCHAR(255) -- Product name at time of order
sku VARCHAR(64) -- Product SKU at time of order
weight DECIMAL(12,4)
```

**Denormalization**: Product name, SKU, and weight **copied** to order item to preserve historical data.

#### Product Type Handlers

Each product type has a custom order item handler:

**Simple Product**:

```php
class Simple extends \Magento\Catalog\Model\Product\Type\AbstractType
{
    public function prepareForCartAdvanced(
        \Magento\Framework\DataObject $buyRequest,
        $product,
        $processMode = null
    ) {
        // Validate product is saleable
        if (!$product->isSaleable()) {
            throw new LocalizedException(__('Product is not available'));
        }

        // Create order item
        $item = $this->_prepareProduct($buyRequest, $product);
        return [$item];
    }
}
```

**Configurable Product**:

```php
class Configurable extends \Magento\Catalog\Model\Product\Type\AbstractType
{
    public function prepareForCartAdvanced($buyRequest, $product, $processMode = null)
    {
        // Get selected options (color, size, etc.)
        $attributes = $buyRequest->getSuperAttribute();

        // Find matching simple product
        $subProduct = $this->getProductByAttributes($attributes, $product);

        // Create parent item (configurable)
        $parentItem = $this->_prepareProduct($buyRequest, $product);
        $parentItem->setProductType(Configurable::TYPE_CODE);

        // Create child item (simple)
        $childItem = $this->_prepareProduct($buyRequest, $subProduct);
        $childItem->setParentItem($parentItem);

        return [$parentItem, $childItem];
    }
}
```

#### Inventory Deduction

**Observer**: `Magento\CatalogInventory\Observer\SubtractQuoteInventoryObserver`
**Event**: `sales_order_place_after`

**Behavior**: Deduct inventory when order is placed

```php
public function execute(Observer $observer): void
{
    $order = $observer->getEvent()->getOrder();

    foreach ($order->getAllItems() as $item) {
        if ($item->getParentItem()) {
            continue; // Skip child items of configurable/bundle
        }

        $stockItem = $this->stockRegistry->getStockItem(
            $item->getProductId(),
            $item->getStore()->getWebsiteId()
        );

        // Deduct quantity
        $stockItem->setQty($stockItem->getQty() - $item->getQtyOrdered());
        $this->stockRegistry->updateStockItemBySku($item->getSku(), $stockItem);
    }
}
```

**Database Impact**:

```sql
UPDATE cataloginventory_stock_item
SET qty = qty - 2,
    is_in_stock = CASE WHEN (qty - 2) > 0 THEN 1 ELSE 0 END
WHERE product_id = 123
```

#### Product Reindex After Order

**Event**: `sales_order_item_save_after`
**Observer**: `Magento\Catalog\Observer\InvalidatePriceIndexer`

**Why**: Order quantities affect bestseller calculations and stock status.

---

### Magento_Store

**Why**: Orders are scoped to store views (multi-store support)

**Integration Type**: Store context, currency, locale

#### Database Integration

```sql
-- sales_order table
store_id SMALLINT(5) REFERENCES store(store_id)
store_name VARCHAR(255)
store_currency_code VARCHAR(3)
base_currency_code VARCHAR(3)
order_currency_code VARCHAR(3)
```

#### Currency Handling

**Base Currency**: Store's configured base currency (usually USD, EUR)
**Order Currency**: Customer's selected currency (may differ)

```php
$order = $this->orderRepository->get($orderId);

// Base amounts (for reporting)
$order->getBaseGrandTotal(); // $100.00 USD
$order->getBaseCurrencyCode(); // "USD"

// Order amounts (customer-facing)
$order->getGrandTotal(); // £85.00 GBP
$order->getOrderCurrencyCode(); // "GBP"

// Conversion rate
$order->getBaseToOrderRate(); // 0.85
```

**Why Both?**: Base amounts allow accurate reporting across all stores in same currency.

#### Store Context in Emails

**Email Template Variables**:

```html
<!-- Order confirmation email -->
Dear {{var order.getCustomerName()}},

Your order from {{var order.getStoreName()}} has been confirmed.

Order Number: {{var order.getIncrementId()}}
Total: {{var order.formatPriceTxt(order.getGrandTotal())}}

<!-- formatPriceTxt uses order currency -->
```

---

### Magento_Directory

**Why**: Address validation, country/region data

**Integration Type**: Address validation, postal code formats

#### Address Validation

```php
// In OrderAddressRepository
public function save(OrderAddressInterface $address): OrderAddressInterface
{
    // Validate country exists
    $country = $this->countryFactory->create()->loadByCode($address->getCountryId());
    if (!$country->getId()) {
        throw new InputException(__('Invalid country code: %1', $address->getCountryId()));
    }

    // Validate region (if country has regions)
    if ($country->getRegionCollection()->getSize() > 0) {
        $region = $this->regionFactory->create()->loadByCode(
            $address->getRegion(),
            $address->getCountryId()
        );

        if (!$region->getId()) {
            throw new InputException(__('Invalid region for country %1', $address->getCountryId()));
        }

        $address->setRegionId($region->getId());
    }

    return $this->resource->save($address);
}
```

#### Postal Code Validation

```php
// Directory module provides postal code patterns
$validator = $this->postcodeFactory->create();
$validator->setCountryId('US');

if (!$validator->validate('12345')) {
    throw new InputException(__('Invalid postal code'));
}
```

---

### Magento_Eav

**Why**: Sales entities can have custom attributes (EAV pattern)

**Integration Type**: Extension attributes, custom order fields

#### EAV Entity Types

```sql
SELECT entity_type_id, entity_type_code
FROM eav_entity_type
WHERE entity_type_code IN ('order', 'invoice', 'shipment', 'creditmemo');

-- order: type_id = 5
-- invoice: type_id = 6
-- shipment: type_id = 7
-- creditmemo: type_id = 8
```

#### Custom Order Attributes

```php
// Add custom EAV attribute to orders
$eavSetup->addAttribute('order', 'gift_message', [
    'type' => 'text',
    'label' => 'Gift Message',
    'input' => 'textarea',
    'required' => false,
    'visible' => true,
    'user_defined' => true,
    'position' => 100,
    'system' => 0,
]);

// Load custom attribute
$order = $this->orderRepository->get($orderId);
$giftMessage = $order->getData('gift_message');
```

**Performance Note**: EAV attributes require additional JOINs. Use extension attributes for better performance.

---

## Dependent Modules

These modules depend on Sales and extend its functionality.

### Magento_Payment

**Why**: Orders require payment processing

**Integration Type**: Payment method handlers, authorization, capture, refund

#### Payment Method Integration

**Payment Flow**:

1. Customer selects payment method during checkout
2. Quote payment object created with method code
3. Order placed → payment authorized
4. Invoice created → payment captured
5. Credit memo created → payment refunded

#### Payment Authorization

```php
// In Order::place()
$payment = $this->getPayment();
$payment->authorize($this, $this->getBaseGrandTotal());

// Calls payment method's authorize() method
class Stripe extends AbstractMethod
{
    public function authorize(InfoInterface $payment, $amount)
    {
        $order = $payment->getOrder();

        // Create Stripe PaymentIntent
        $intent = \Stripe\PaymentIntent::create([
            'amount' => $amount * 100, // Cents
            'currency' => strtolower($order->getOrderCurrencyCode()),
            'payment_method' => $payment->getAdditionalInformation('stripe_pm_id'),
            'capture_method' => 'manual', // Auth only
        ]);

        $payment->setTransactionId($intent->id);
        $payment->setIsTransactionClosed(false);
        $payment->setAdditionalInformation('stripe_intent_id', $intent->id);

        return $this;
    }
}
```

#### Payment Capture

```php
// When invoice is created
$invoice = $this->invoiceService->prepareInvoice($order);
$invoice->setRequestedCaptureCase(Invoice::CAPTURE_ONLINE);
$invoice->register();

// Calls payment method's capture() method
class Stripe extends AbstractMethod
{
    public function capture(InfoInterface $payment, $amount)
    {
        $intentId = $payment->getAdditionalInformation('stripe_intent_id');

        // Capture the authorized payment
        $intent = \Stripe\PaymentIntent::retrieve($intentId);
        $intent->capture();

        $payment->setTransactionId($intent->id . '-capture');
        $payment->setIsTransactionClosed(true);

        return $this;
    }
}
```

#### Payment Refund

```php
// When credit memo is created
$creditmemo = $this->creditmemoService->refund($creditmemo, true); // true = online refund

// Calls payment method's refund() method
class Stripe extends AbstractMethod
{
    public function refund(InfoInterface $payment, $amount)
    {
        $transactionId = $payment->getParentTransactionId();

        // Create Stripe Refund
        $refund = \Stripe\Refund::create([
            'payment_intent' => $transactionId,
            'amount' => $amount * 100,
        ]);

        $payment->setTransactionId($refund->id);
        $payment->setIsTransactionClosed(true);

        return $this;
    }
}
```

#### Database Integration

```sql
-- sales_order_payment table
method VARCHAR(128) -- 'stripe', 'paypal_express', 'authorizenet', etc.
cc_type VARCHAR(32) -- 'VI', 'MC', 'AE', 'DI'
cc_last4 VARCHAR(4) -- Last 4 digits
cc_exp_month VARCHAR(12)
cc_exp_year VARCHAR(4)
additional_information TEXT -- JSON data for gateway tokens

-- sales_payment_transaction table (audit trail)
transaction_id VARCHAR(255) -- Gateway transaction ID
txn_type VARCHAR(15) -- 'authorization', 'capture', 'refund', 'void'
is_closed TINYINT(1)
additional_information BLOB -- Gateway response
```

---

### Magento_Shipping

**Why**: Orders require shipping method selection and tracking

**Integration Type**: Shipping method carriers, rate calculation, label generation

#### Shipping Method Selection

```php
// During checkout
$quote->getShippingAddress()->setShippingMethod('flatrate_flatrate');
$quote->collectTotals();

// Shipping method stored in quote
$shippingAddress = $quote->getShippingAddress();
$shippingMethod = $shippingAddress->getShippingMethod(); // "flatrate_flatrate"
$shippingAmount = $shippingAddress->getShippingAmount(); // 5.00
```

#### Order → Shipment Creation

```php
// Create shipment
$shipment = $this->shipmentFactory->create($order);

// Add tracking
$track = $this->trackFactory->create();
$track->setNumber('1Z999AA10123456784'); // UPS tracking number
$track->setCarrierCode('ups');
$track->setTitle('United Parcel Service');
$shipment->addTrack($track);

// Generate shipping label (if carrier supports it)
if ($this->shipmentService->isLabelAvailable($shipment)) {
    $labelContent = $this->labelGenerator->create($shipment);
    $shipment->setShippingLabel($labelContent); // Binary PDF
}

$shipment = $this->shipmentRepository->save($shipment);
```

#### Shipping Label API Integration

```php
// UPS label generation
class Ups extends AbstractCarrier
{
    public function requestToShipment($request)
    {
        // Build UPS API request
        $upsRequest = [
            'Shipment' => [
                'ShipFrom' => $this->getShipperAddress($request),
                'ShipTo' => $this->getRecipientAddress($request),
                'Package' => [
                    'PackagingType' => ['Code' => '02'],
                    'Dimensions' => $this->getPackageDimensions($request),
                    'PackageWeight' => $this->getPackageWeight($request),
                ],
                'Service' => ['Code' => $request->getShippingMethod()],
            ],
        ];

        // Call UPS API
        $response = $this->upsClient->processShipment($upsRequest);

        // Parse response
        $trackingNumber = $response['ShipmentResults']['PackageResults']['TrackingNumber'];
        $labelImage = base64_decode($response['ShipmentResults']['PackageResults']['ShippingLabel']['GraphicImage']);

        return [
            'tracking_number' => $trackingNumber,
            'label_content' => $labelImage,
        ];
    }
}
```

#### Database Integration

```sql
-- sales_order table
shipping_method VARCHAR(120) -- 'flatrate_flatrate', 'ups_03', etc.
shipping_description VARCHAR(255) -- 'Flat Rate - Fixed'
shipping_amount DECIMAL(20,4)
base_shipping_amount DECIMAL(20,4)
shipping_tax_amount DECIMAL(20,4)

-- sales_shipment table
total_weight DECIMAL(12,4)
total_qty DECIMAL(12,4)

-- sales_shipment_track table
track_number VARCHAR(255)
carrier_code VARCHAR(32) -- 'ups', 'usps', 'fedex'
title VARCHAR(255) -- 'United Parcel Service'
```

---

### Magento_Tax

**Why**: Orders must calculate taxes based on customer location and product tax class

**Integration Type**: Tax calculation, tax rules, tax rates

#### Tax Calculation

**Tax Sequence**:

1. Determine customer tax class (from customer group)
2. Determine product tax class (from product attribute)
3. Find matching tax rule (customer class + product class + destination address)
4. Calculate tax rate
5. Apply to order totals

#### Tax Rule Matching

```php
// In TaxCalculation::getAppliedRates()
public function getAppliedRates($request)
{
    $customerTaxClass = $request->getCustomerClassId(); // From customer group
    $productTaxClass = $request->getProductClassId(); // From product
    $countryId = $request->getCountryId(); // Shipping address
    $regionId = $request->getRegionId();
    $postcode = $request->getPostcode();

    // Find matching tax rules
    $rules = $this->ruleRepository->getList(
        $this->searchCriteriaBuilder
            ->addFilter('customer_tax_class_ids', $customerTaxClass, 'finset')
            ->addFilter('product_tax_class_ids', $productTaxClass, 'finset')
            ->create()
    );

    $rates = [];
    foreach ($rules->getItems() as $rule) {
        // Check if rule applies to this location
        if ($this->isRateApplicable($rule, $countryId, $regionId, $postcode)) {
            $rates[] = $this->getRateModel($rule->getId());
        }
    }

    return $rates;
}
```

#### Tax Amount Storage

```php
// Order item tax breakdown
$orderItem->setTaxAmount(8.25); // Total tax for this item
$orderItem->setBaseTaxAmount(8.25);
$orderItem->setTaxPercent(8.25); // Tax percentage applied

// Detailed tax information
$orderItem->setAppliedTaxes([
    [
        'title' => 'US-CA-*-Rate 1',
        'percent' => 8.25,
        'amount' => 8.25,
        'rates' => [
            ['code' => 'US-CA-*-Rate 1', 'title' => 'California State Tax', 'percent' => 8.25],
        ],
    ],
]);
```

#### Database Integration

```sql
-- sales_order table
tax_amount DECIMAL(20,4)
base_tax_amount DECIMAL(20,4)
shipping_tax_amount DECIMAL(20,4)
discount_tax_compensation_amount DECIMAL(20,4)

-- sales_order_tax table (detailed breakdown)
code VARCHAR(255) -- 'US-CA-*-Rate 1'
title VARCHAR(255) -- 'California State Tax'
percent DECIMAL(12,4) -- 8.2500
amount DECIMAL(20,4) -- 8.25
base_amount DECIMAL(20,4)

-- sales_order_tax_item table (per-item tax)
tax_id INT REFERENCES sales_order_tax(tax_id)
item_id INT REFERENCES sales_order_item(item_id)
tax_percent DECIMAL(12,4)
amount DECIMAL(20,4)
```

---

### Magento_Inventory (MSI - Multi-Source Inventory)

**Why**: **Magento 2.3+** - Advanced inventory management with multiple warehouses

**Integration Type**: Source selection, inventory deduction, stock management

#### Source Selection Algorithm

**Problem**: Order placed, which warehouse should fulfill it?

**SSA (Source Selection Algorithm)**:

```php
// Get source selection for order
$request = $this->requestFactory->create([
    'stockId' => 1,
    'items' => $this->getOrderItemsForSourceSelection($order),
]);

$result = $this->sourceSelectionService->execute($request);

foreach ($result->getSourceSelectionItems() as $selectionItem) {
    echo "SKU: {$selectionItem->getSku()}\n";
    echo "Source: {$selectionItem->getSourceCode()}\n"; // 'warehouse_1'
    echo "Qty: {$selectionItem->getQtyToDeduct()}\n"; // 2
}
```

**Source Selection Criteria**:
- Distance to shipping address (closest warehouse)
- Available quantity per source
- Source priority
- Shipping cost

#### Inventory Deduction

**Event**: `sales_order_place_after`
**Observer**: `Magento\InventorySales\Observer\PlaceReservationsForSalesEventObserver`

**Behavior**: Create inventory reservations instead of direct deduction

```php
public function execute(Observer $observer): void
{
    $order = $observer->getEvent()->getOrder();

    foreach ($order->getItems() as $item) {
        // Create reservation (soft allocation)
        $this->reservationRepository->append([
            [
                ReservationInterface::SKU => $item->getSku(),
                ReservationInterface::QUANTITY => -$item->getQtyOrdered(), // Negative = deduction
                ReservationInterface::STOCK_ID => $this->getStockIdForWebsite($order->getStore()->getWebsiteId()),
                ReservationInterface::METADATA => json_encode([
                    'event_type' => 'order_placed',
                    'object_type' => 'order',
                    'object_id' => $order->getEntityId(),
                ]),
            ],
        ]);
    }
}
```

**Database Impact**:

```sql
-- inventory_reservation table
INSERT INTO inventory_reservation (sku, stock_id, quantity, metadata)
VALUES ('SKU123', 1, -2, '{"event_type":"order_placed","object_id":"123"}');

-- Calculate salable quantity
SELECT SUM(qty.quantity) + COALESCE(SUM(res.quantity), 0) AS salable_qty
FROM inventory_source_item qty
LEFT JOIN inventory_reservation res ON res.sku = qty.sku
WHERE qty.sku = 'SKU123'
  AND qty.status = 1
GROUP BY qty.sku;
```

#### Shipment → Inventory Deduction

When shipment is created, reservation is compensated:

```php
// Event: sales_order_shipment_save_after
public function execute(Observer $observer): void
{
    $shipment = $observer->getEvent()->getShipment();

    foreach ($shipment->getItems() as $item) {
        // Deduct actual inventory
        $this->sourceDeductionService->execute(
            $item->getSku(),
            $item->getQty(),
            $this->getSourceCode($shipment)
        );

        // Compensate reservation (add back)
        $this->reservationRepository->append([
            [
                ReservationInterface::SKU => $item->getSku(),
                ReservationInterface::QUANTITY => +$item->getQty(), // Positive = compensation
                ReservationInterface::STOCK_ID => 1,
                ReservationInterface::METADATA => json_encode([
                    'event_type' => 'shipment_created',
                    'object_id' => $shipment->getEntityId(),
                ]),
            ],
        ]);
    }
}
```

**Result**: Inventory moves from "reserved" to "shipped" (actually deducted from source).

---

## Cross-Module Plugins

Sales module plugins that intercept other modules.

### 1. OrderGridExportFilterColumnPlugin

**Intercepts**: `Magento\Ui\Model\Export\MetadataProvider`
**Purpose**: Filter sensitive data from order grid exports

See PLUGINS_AND_OBSERVERS.md for full details.

---

### 2. ConvertBlobToString Plugin

**Intercepts**: `Magento\Sales\Api\ShipmentRepositoryInterface`
**Purpose**: Convert shipping label BLOB to base64 for API responses

See PLUGINS_AND_OBSERVERS.md for full details.

---

## Event-Based Integration

Sales module dispatches events that other modules observe.

### Critical Events

#### 1. sales_order_place_after

**Dispatched**: After order is successfully placed

**Observers**:
- `Magento\CatalogInventory\Observer\SubtractQuoteInventoryObserver` - Deduct inventory
- `Magento\InventorySales\Observer\PlaceReservationsForSalesEventObserver` - Create MSI reservations
- `Magento\Sales\Observer\VatRequestParamsOrderCommentObserver` - Add VAT validation comment
- `Magento\SalesRule\Observer\AssignCouponDataAfterOrderCustomerAssignObserver` - Track coupon usage

**Use Case**: Multiple modules react to order placement without tight coupling.

---

#### 2. sales_order_invoice_pay

**Dispatched**: After invoice is paid (payment captured)

**Observers**:
- `Magento\Sales\Observer\GridSyncInsertObserver` - Update invoice grid
- `Magento\Downloadable\Observer\SetLinkStatusInvoicedObserver` - Activate downloadable links
- `Magento\GiftCard\Observer\ToggleGiftCardObserver` - Activate gift cards

**Use Case**: Payment capture triggers fulfillment actions.

---

#### 3. sales_order_shipment_save_after

**Dispatched**: After shipment is saved

**Observers**:
- `Magento\InventoryShipping\Observer\SourceDeductionProcessor` - Deduct MSI inventory
- `Magento\Shipping\Observer\TrackingNumberObserver` - Send tracking email
- `Magento\Sales\Observer\GridSyncInsertObserver` - Update shipment grid

**Use Case**: Shipment creation triggers inventory deduction and customer notification.

---

#### 4. sales_order_creditmemo_refund

**Dispatched**: After credit memo is refunded

**Observers**:
- `Magento\CatalogInventory\Observer\RefundOrderInventoryObserver` - Return inventory
- `Magento\InventorySales\Observer\RefundOrderInventoryObserver` - Compensate MSI reservations
- `Magento\SalesRule\Observer\RestoreCouponUsageObserver` - Restore coupon usage count

**Use Case**: Refund triggers inventory return and coupon restoration.

---

## External Integrations

Sales module provides integration points for third-party systems.

### Payment Gateways

**Integration Pattern**: Payment method adapters implementing `Magento\Payment\Model\MethodInterface`

**Popular Gateways**:
- **Stripe**: `Magento\StripeIntegration\Model\Method\Stripe`
- **PayPal**: `Magento\Paypal\Model\Express`
- **Braintree**: `Magento\Braintree\Model\Adapter\BraintreeAdapter`
- **Authorize.Net**: `Magento\AuthorizeNet\Model\Directpost`

**Example Integration**:

```php
// Custom payment gateway
class CustomGateway extends \Magento\Payment\Model\Method\AbstractMethod
{
    protected $_code = 'custom_gateway';
    protected $_isGateway = true;
    protected $_canAuthorize = true;
    protected $_canCapture = true;
    protected $_canRefund = true;

    public function authorize(InfoInterface $payment, $amount)
    {
        $order = $payment->getOrder();

        $response = $this->apiClient->authorize([
            'amount' => $amount,
            'currency' => $order->getOrderCurrencyCode(),
            'customer_email' => $order->getCustomerEmail(),
            'return_url' => $this->urlBuilder->getUrl('sales/order/success'),
        ]);

        $payment->setTransactionId($response['transaction_id']);
        $payment->setIsTransactionClosed(false);

        return $this;
    }
}
```

---

### Shipping Carriers

**Integration Pattern**: Shipping method adapters implementing `Magento\Shipping\Model\Carrier\CarrierInterface`

**Popular Carriers**:
- **UPS**: `Magento\Ups\Model\Carrier`
- **FedEx**: `Magento\Fedex\Model\Carrier`
- **USPS**: `Magento\Usps\Model\Carrier`
- **DHL**: `Magento\Dhl\Model\Carrier`

**Example Integration**:

```php
// Custom shipping carrier
class CustomCarrier extends \Magento\Shipping\Model\Carrier\AbstractCarrier implements
    \Magento\Shipping\Model\Carrier\CarrierInterface
{
    protected $_code = 'custom_carrier';

    public function collectRates(RateRequest $request)
    {
        $result = $this->rateResultFactory->create();

        // Call carrier API for rates
        $response = $this->apiClient->getRates([
            'origin' => $this->getOriginAddress(),
            'destination' => [
                'country' => $request->getDestCountryId(),
                'region' => $request->getDestRegionCode(),
                'postcode' => $request->getDestPostcode(),
            ],
            'weight' => $request->getPackageWeight(),
        ]);

        foreach ($response['rates'] as $rate) {
            $method = $this->rateMethodFactory->create();
            $method->setCarrier($this->_code);
            $method->setCarrierTitle('Custom Carrier');
            $method->setMethod($rate['service_code']);
            $method->setMethodTitle($rate['service_name']);
            $method->setPrice($rate['price']);
            $method->setCost($rate['cost']);

            $result->append($method);
        }

        return $result;
    }
}
```

---

### ERP Systems (SAP, Oracle, NetSuite)

**Integration Pattern**: Order export via REST API or message queue

**Common Use Cases**:
- Export orders to ERP for fulfillment
- Import order status updates from ERP
- Sync inventory between ERP and Magento

**Example: Order Export**:

```php
// Observer: Export order to ERP after placement
class ExportOrderToErpObserver implements ObserverInterface
{
    public function execute(Observer $observer): void
    {
        $order = $observer->getEvent()->getOrder();

        // Build ERP payload
        $erpPayload = [
            'order_number' => $order->getIncrementId(),
            'customer' => [
                'id' => $order->getCustomerId(),
                'email' => $order->getCustomerEmail(),
                'name' => $order->getCustomerName(),
            ],
            'billing_address' => $this->formatAddress($order->getBillingAddress()),
            'shipping_address' => $this->formatAddress($order->getShippingAddress()),
            'items' => $this->formatItems($order->getAllVisibleItems()),
            'totals' => [
                'subtotal' => $order->getSubtotal(),
                'shipping' => $order->getShippingAmount(),
                'tax' => $order->getTaxAmount(),
                'grand_total' => $order->getGrandTotal(),
            ],
            'payment' => [
                'method' => $order->getPayment()->getMethod(),
                'transaction_id' => $order->getPayment()->getLastTransId(),
            ],
        ];

        // Send to ERP via API
        $this->erpClient->post('/orders', $erpPayload);

        // Or publish to message queue for async processing
        $this->publisher->publish('erp.order.export', json_encode($erpPayload));
    }
}
```

---

### Tax Services (Avalara, TaxJar)

**Integration Pattern**: Real-time tax calculation via API

**Example: Avalara Integration**:

```php
// Tax calculation plugin
class AvalaraTaxCalculationPlugin
{
    public function aroundCollect(
        \Magento\Tax\Model\Sales\Total\Quote\Tax $subject,
        \Closure $proceed,
        \Magento\Quote\Model\Quote $quote,
        \Magento\Quote\Api\Data\ShippingAssignmentInterface $shippingAssignment,
        \Magento\Quote\Model\Quote\Address\Total $total
    ) {
        $address = $shippingAssignment->getShipping()->getAddress();

        // Call Avalara API
        $request = [
            'addresses' => [
                'shipFrom' => $this->getOriginAddress(),
                'shipTo' => [
                    'line1' => $address->getStreetLine(1),
                    'city' => $address->getCity(),
                    'region' => $address->getRegionCode(),
                    'country' => $address->getCountryId(),
                    'postalCode' => $address->getPostcode(),
                ],
            ],
            'lines' => $this->getLineItems($quote),
        ];

        $response = $this->avalaraClient->createTransaction($request);

        // Apply Avalara tax amounts
        $total->setTaxAmount($response['totalTax']);
        $total->setBaseTaxAmount($response['totalTax']);

        return $total;
    }
}
```

---

## Integration Best Practices

### 1. Use Service Contracts for Loose Coupling

**Bad**: Direct model dependencies

```php
// BAD
$order = $this->orderFactory->create()->load($orderId);
```

**Good**: Repository pattern with service contracts

```php
// GOOD
$order = $this->orderRepository->get($orderId);
```

**Why**: Service contracts provide API stability and allow plugin interception.

---

### 2. Use Events for Cross-Module Communication

**Bad**: Direct method calls to other modules

```php
// BAD - tight coupling
$this->inventoryService->deductInventory($order);
```

**Good**: Dispatch event, let observer handle it

```php
// GOOD - loose coupling
$this->eventManager->dispatch('sales_order_place_after', ['order' => $order]);
```

**Why**: Other modules can react to events without Sales module knowing about them.

---

### 3. Use Message Queues for External Integrations

**Bad**: Synchronous API calls during order placement

```php
// BAD - blocks order save
$this->erpClient->exportOrder($order); // 3 second timeout!
```

**Good**: Publish message to queue for async processing

```php
// GOOD - non-blocking
$this->publisher->publish('erp.order.export', $order->getId());
```

**Why**: External APIs can fail or be slow. Don't block critical order flow.

---

### 4. Preserve Historical Data (Denormalization)

**Why Denormalize**: Product name/price/SKU can change after order is placed.

**Correct Approach**: Copy product data to order at time of placement:

```php
$orderItem->setName($product->getName()); // Name at time of order
$orderItem->setSku($product->getSku());   // SKU at time of order
$orderItem->setPrice($product->getFinalPrice()); // Price at time of order
```

**Result**: Order displays product as it was when purchased, not current version.

---

## Troubleshooting Integration Issues

### Order Placement Fails with "Product Not Available"

**Cause**: Product inventory not synchronized with catalog

**Debug**:

```bash
# Check product stock
bin/magento inventory:stock:list

# Reindex inventory
bin/magento indexer:reindex inventory
```

---

### Shipping Rates Not Appearing

**Cause**: Shipping carrier API credentials invalid or carrier disabled

**Debug**:

```bash
# Check carrier configuration
bin/magento config:show carriers/ups/active
bin/magento config:show carriers/ups/username

# Test carrier API
bin/magento shipping:test:rates
```

---

### Tax Calculation Incorrect

**Cause**: Tax rules misconfigured or customer/product tax class wrong

**Debug**:

```sql
-- Check tax rules
SELECT * FROM tax_calculation_rule WHERE tax_calculation_rule_id = 1;

-- Check product tax class
SELECT entity_id, sku, tax_class_id
FROM catalog_product_entity_int
WHERE attribute_id = (SELECT attribute_id FROM eav_attribute WHERE attribute_code = 'tax_class_id');

-- Check customer tax class (from customer group)
SELECT customer_group_id, tax_class_id FROM customer_group;
```

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-04
**Magento Version**: 2.4.8

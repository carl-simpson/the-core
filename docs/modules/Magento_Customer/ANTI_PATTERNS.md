# Anti-Patterns - Magento_Customer Module

This document catalogs common mistakes developers make when working with the Magento_Customer module, explains why they're problematic, and provides correct implementations following Magento best practices.

---

## Table of Contents

- [Data Access Anti-Patterns](#data-access-anti-patterns)
- [Cache Anti-Patterns](#cache-anti-patterns)
- [Observer Anti-Patterns](#observer-anti-patterns)
- [Performance Anti-Patterns](#performance-anti-patterns)
- [Configuration Anti-Patterns](#configuration-anti-patterns)
- [Plugin Anti-Patterns](#plugin-anti-patterns)
- [Security Anti-Patterns](#security-anti-patterns)
- [Testing Anti-Patterns](#testing-anti-patterns)

---

## Data Access Anti-Patterns

### ❌ Anti-Pattern 1: Direct Model Usage Instead of Repository

#### Bad Code

```php
<?php
namespace Vendor\Module\Model;

use Magento\Customer\Model\CustomerFactory;

class CustomerService
{
    private CustomerFactory $customerFactory;

    public function __construct(CustomerFactory $customerFactory)
    {
        $this->customerFactory = $customerFactory;
    }

    public function updateCustomerName(int $customerId, string $firstname, string $lastname): void
    {
        // WRONG: Direct model manipulation
        $customer = $this->customerFactory->create();
        $customer->load($customerId);
        $customer->setFirstname($firstname);
        $customer->setLastname($lastname);
        $customer->save();
    }
}
```

#### Why It's Bad

1. **Bypasses Service Contracts**: Extensions depending on service contract interfaces won't intercept this operation
2. **Skips Plugins**: Plugins registered on `CustomerRepositoryInterface` won't execute
3. **Skips Transaction Wrapper**: TransactionWrapper plugin doesn't wrap this save (risk of partial data writes)
4. **No Event Dispatch**: `customer_save_after_data_object` event not fired (breaks email sync, audit logging)
5. **Breaks API Compatibility**: Third-party code expecting repository pattern won't work
6. **No Data Validation**: Repository validation logic bypassed

**Real Impact**:

```php
// Observer expecting customer_save_after_data_object NEVER FIRES
// Result: Order emails don't sync when customer email changes
// Result: Audit logs missing customer modifications
// Result: Custom business logic doesn't execute
```

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Model;

use Magento\Customer\Api\CustomerRepositoryInterface;
use Magento\Customer\Api\Data\CustomerInterface;

class CustomerService
{
    private CustomerRepositoryInterface $customerRepository;

    public function __construct(CustomerRepositoryInterface $customerRepository)
    {
        $this->customerRepository = $customerRepository;
    }

    public function updateCustomerName(int $customerId, string $firstname, string $lastname): void
    {
        // CORRECT: Use repository service contract
        $customer = $this->customerRepository->getById($customerId);
        $customer->setFirstname($firstname);
        $customer->setLastname($lastname);
        $this->customerRepository->save($customer);
    }
}
```

#### Why It's Better

1. **Service Contract Compliance**: Follows Magento's service contract pattern
2. **Plugin Support**: All plugins on `CustomerRepositoryInterface::save()` execute
3. **Transaction Safety**: TransactionWrapper plugin ensures atomic save
4. **Event Dispatch**: Proper event chain fires (before/after save, email sync observers)
5. **Extensibility**: Third-party modules can extend without modifying code
6. **API Compatibility**: Works identically via REST/SOAP/GraphQL

**Execution Flow**:

```
1. customerRepository->save() called
2. TransactionWrapper::beforeSave() - Opens DB transaction
3. [Original save method executes]
4. customer_save_after_data_object event dispatched
5. Observer: UpdateCustomerEmail (syncs email to orders/quotes)
6. Observer: AuditLog (logs customer modification)
7. TransactionWrapper::afterSave() - Commits transaction
8. Return saved customer
```

---

### ❌ Anti-Pattern 2: Loading Full Customer When Only ID Needed

#### Bad Code

```php
<?php
namespace Vendor\Module\Helper;

use Magento\Customer\Api\CustomerRepositoryInterface;

class OrderHelper
{
    private CustomerRepositoryInterface $customerRepository;

    public function getCustomerGroupForOrder(int $customerId): int
    {
        // WRONG: Loads entire customer entity (EAV attributes, addresses, etc.)
        $customer = $this->customerRepository->getById($customerId);
        return $customer->getGroupId();

        // This executes 10+ SQL queries (customer entity + EAV joins)
        // We only need group_id from customer_entity table
    }
}
```

#### Why It's Bad

1. **Performance Waste**: Loads all EAV attributes (10+ SQL queries) when only 1 field needed
2. **Memory Overhead**: Loads entire customer object into memory
3. **Database Load**: Unnecessary JOIN operations across EAV tables
4. **Slow Response**: 100-500ms customer load vs. 5-10ms direct query

**SQL Generated** (bad approach):

```sql
-- Query 1: Main entity
SELECT * FROM customer_entity WHERE entity_id = 12345;

-- Query 2-10: EAV attribute tables
SELECT * FROM customer_entity_varchar WHERE entity_id = 12345;
SELECT * FROM customer_entity_int WHERE entity_id = 12345;
SELECT * FROM customer_entity_datetime WHERE entity_id = 12345;
-- ... more EAV tables

-- Total: 10+ queries, 100-500ms
```

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Helper;

use Magento\Customer\Model\ResourceModel\Customer as CustomerResource;
use Magento\Framework\App\ResourceConnection;

class OrderHelper
{
    private ResourceConnection $resourceConnection;

    public function __construct(ResourceConnection $resourceConnection)
    {
        $this->resourceConnection = $resourceConnection;
    }

    public function getCustomerGroupForOrder(int $customerId): int
    {
        // CORRECT: Direct query for single field
        $connection = $this->resourceConnection->getConnection();
        $customerTable = $this->resourceConnection->getTableName('customer_entity');

        $select = $connection->select()
            ->from($customerTable, ['group_id'])
            ->where('entity_id = ?', $customerId);

        return (int)$connection->fetchOne($select);
    }
}
```

#### Why It's Better

1. **Single Query**: One SELECT statement, no JOINs
2. **Minimal Memory**: Only loads one integer value
3. **Fast**: 5-10ms vs. 100-500ms
4. **Scalable**: Handles high request volume efficiently

**SQL Generated** (good approach):

```sql
-- Single query, single field
SELECT group_id FROM customer_entity WHERE entity_id = 12345;
-- Total: 1 query, 5-10ms
```

**Performance Gain**: 10-50x faster

---

### ❌ Anti-Pattern 3: Excessive Custom EAV Attributes

#### Bad Code

```php
<?php
// Setup/Patch/Data/AddCustomerAttributes.php
namespace Vendor\Module\Setup\Patch\Data;

use Magento\Customer\Setup\CustomerSetupFactory;
use Magento\Framework\Setup\Patch\DataPatchInterface;

class AddCustomerAttributes implements DataPatchInterface
{
    private CustomerSetupFactory $customerSetupFactory;

    public function apply()
    {
        $customerSetup = $this->customerSetupFactory->create();

        // WRONG: Adding 50+ EAV attributes
        for ($i = 1; $i <= 50; $i++) {
            $customerSetup->addAttribute('customer', "custom_field_{$i}", [
                'type' => 'varchar',
                'label' => "Custom Field {$i}",
                'input' => 'text',
                'required' => false,
                'visible' => true,
                'user_defined' => true,
                'system' => false,
            ]);
        }

        // Result: Every customer load now has 50+ additional JOINs
    }
}
```

#### Why It's Bad

1. **Query Complexity**: Each EAV attribute = 1 LEFT JOIN (50 attributes = 50 JOINs)
2. **Slow Customer Load**: 2000ms+ customer load time with 50+ custom attributes
3. **Database Stress**: Complex execution plans, potential table locks
4. **Memory Usage**: Large result sets consume memory
5. **Index Bloat**: EAV attribute tables grow exponentially

**Generated SQL** (bad approach):

```sql
SELECT
    ce.entity_id,
    ce.email,
    cev1.value AS custom_field_1,
    cev2.value AS custom_field_2,
    -- ... 48 more JOINs
    cev50.value AS custom_field_50
FROM customer_entity ce
LEFT JOIN customer_entity_varchar cev1 ON ce.entity_id = cev1.entity_id AND cev1.attribute_id = 201
LEFT JOIN customer_entity_varchar cev2 ON ce.entity_id = cev2.entity_id AND cev2.attribute_id = 202
-- ... 48 more JOINs
WHERE ce.entity_id = 12345;

-- Execution time: 2000ms+ with 50 attributes
```

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Setup\Patch\Schema;

use Magento\Framework\DB\Ddl\Table;
use Magento\Framework\Setup\Patch\SchemaPatchInterface;
use Magento\Framework\Setup\SchemaSetupInterface;

class AddCustomerExtendedDataTable implements SchemaPatchInterface
{
    private SchemaSetupInterface $schemaSetup;

    public function __construct(SchemaSetupInterface $schemaSetup)
    {
        $this->schemaSetup = $schemaSetup;
    }

    public function apply()
    {
        $this->schemaSetup->startSetup();

        // CORRECT: Create dedicated table for extended attributes
        $table = $this->schemaSetup->getConnection()->newTable(
            $this->schemaSetup->getTable('customer_extended_data')
        )->addColumn(
            'entity_id',
            Table::TYPE_INTEGER,
            null,
            ['unsigned' => true, 'nullable' => false, 'primary' => true],
            'Customer ID'
        )->addColumn(
            'custom_field_1',
            Table::TYPE_TEXT,
            255,
            ['nullable' => true],
            'Custom Field 1'
        )->addColumn(
            'custom_field_2',
            Table::TYPE_TEXT,
            255,
            ['nullable' => true],
            'Custom Field 2'
        )
        // Add all 50 fields as columns
        ->addForeignKey(
            $this->schemaSetup->getFkName('customer_extended_data', 'entity_id', 'customer_entity', 'entity_id'),
            'entity_id',
            $this->schemaSetup->getTable('customer_entity'),
            'entity_id',
            Table::ACTION_CASCADE
        )->setComment('Customer Extended Data');

        $this->schemaSetup->getConnection()->createTable($table);
        $this->schemaSetup->endSetup();
    }
}
```

**Use Extension Attributes to Load Data**:

```php
<?php
// etc/extension_attributes.xml
<config>
    <extension_attributes for="Magento\Customer\Api\Data\CustomerInterface">
        <attribute code="extended_data" type="Vendor\Module\Api\Data\ExtendedDataInterface"/>
    </extension_attributes>
</config>
```

```php
<?php
// Plugin to load extended data
namespace Vendor\Module\Plugin;

use Magento\Customer\Api\CustomerRepositoryInterface;
use Magento\Customer\Api\Data\CustomerInterface;
use Vendor\Module\Model\ExtendedDataRepository;

class LoadExtendedDataExtend
{
    private ExtendedDataRepository $extendedDataRepository;

    public function afterGetById(
        CustomerRepositoryInterface $subject,
        CustomerInterface $result
    ): CustomerInterface {
        // Lazy load extended data only when accessed
        $extendedData = $this->extendedDataRepository->getByCustomerId($result->getId());

        $extensionAttributes = $result->getExtensionAttributes();
        $extensionAttributes->setExtendedData($extendedData);
        $result->setExtensionAttributes($extensionAttributes);

        return $result;
    }
}
```

#### Why It's Better

1. **Single JOIN**: Only 1 JOIN to extended data table (vs. 50 JOINs for EAV)
2. **Fast Queries**: Simple SELECT with single JOIN, 20-50ms vs. 2000ms
3. **Better Indexing**: Standard table indexes (vs. EAV attribute indexes)
4. **Lazy Loading**: Extended data only loaded when needed via extension attributes
5. **Scalable**: Handles hundreds of custom fields efficiently

**Generated SQL** (good approach):

```sql
-- Single query with one JOIN
SELECT
    ce.entity_id,
    ce.email,
    ced.custom_field_1,
    ced.custom_field_2,
    -- ... all 50 fields as columns
    ced.custom_field_50
FROM customer_entity ce
LEFT JOIN customer_extended_data ced ON ce.entity_id = ced.entity_id
WHERE ce.entity_id = 12345;

-- Execution time: 20-50ms (40x faster)
```

**Performance Gain**: 10-100x faster, especially with many attributes

---

## Cache Anti-Patterns

### ❌ Anti-Pattern 4: Ignoring Customer Group Cache After Group Change

#### Bad Code

```php
<?php
namespace Vendor\Module\Controller\Adminhtml\Customer;

use Magento\Customer\Api\CustomerRepositoryInterface;
use Magento\Backend\App\Action;

class ChangeGroup extends Action
{
    private CustomerRepositoryInterface $customerRepository;

    public function execute()
    {
        $customerId = $this->getRequest()->getParam('customer_id');
        $newGroupId = $this->getRequest()->getParam('group_id');

        // WRONG: Change group without cache invalidation
        $customer = $this->customerRepository->getById($customerId);
        $customer->setGroupId($newGroupId);
        $this->customerRepository->save($customer);

        $this->messageManager->addSuccessMessage('Customer group updated.');
        return $this->_redirect('customer/index');

        // Problem: FPC still serves pages with OLD group pricing
        // Customer sees incorrect prices until cache expires
    }
}
```

#### Why It's Bad

1. **Stale Prices**: Full Page Cache serves old pricing based on previous customer group
2. **Wrong Promotions**: Catalog rules and group-based promotions don't apply immediately
3. **Customer Confusion**: "I changed my group, why are prices still the same?"
4. **Business Logic Errors**: Group-specific content shows old version
5. **Revenue Impact**: Potential overcharging or undercharging

**Cache Issue**:

```
Cache Key = page_url + X-Magento-Vary
X-Magento-Vary = sha1(serialize(['customer_group' => 1, 'currency' => 'USD']))

After group change: customer_group = 2
But cached page still served with group = 1 pricing
```

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Controller\Adminhtml\Customer;

use Magento\Backend\App\Action;
use Magento\Customer\Api\CustomerRepositoryInterface;
use Magento\Framework\App\CacheInterface;
use Magento\PageCache\Model\Cache\Type as FullPageCache;

class ChangeGroup extends Action
{
    private CustomerRepositoryInterface $customerRepository;
    private CacheInterface $cache;

    public function __construct(
        Action\Context $context,
        CustomerRepositoryInterface $customerRepository,
        CacheInterface $cache
    ) {
        parent::__construct($context);
        $this->customerRepository = $customerRepository;
        $this->cache = $cache;
    }

    public function execute()
    {
        $customerId = $this->getRequest()->getParam('customer_id');
        $newGroupId = $this->getRequest()->getParam('group_id');

        // Load customer
        $customer = $this->customerRepository->getById($customerId);
        $oldGroupId = $customer->getGroupId();

        // Check if group actually changed
        if ($oldGroupId == $newGroupId) {
            $this->messageManager->addNoticeMessage('Customer group unchanged.');
            return $this->_redirect('customer/index');
        }

        // Save customer
        $customer->setGroupId($newGroupId);
        $this->customerRepository->save($customer);

        // CORRECT: Invalidate FPC to prevent stale pricing
        $this->cache->clean([FullPageCache::CACHE_TAG]);

        // Optional: More granular invalidation
        // $this->cache->clean(['customer_' . $customerId]);

        $this->messageManager->addSuccessMessage(
            "Customer group updated from {$oldGroupId} to {$newGroupId}. Cache cleared."
        );

        return $this->_redirect('customer/index');
    }
}
```

#### Why It's Better

1. **Fresh Pricing**: FPC cleared, next page load shows correct prices
2. **Correct Business Logic**: Group-based rules apply immediately
3. **Customer Satisfaction**: No confusion about pricing discrepancies
4. **Data Integrity**: Cache state matches database state

**Cache Invalidation Flow**:

```
1. Customer group changed: group_id = 1 → 2
2. cache->clean([FullPageCache::CACHE_TAG])
3. FPC completely cleared
4. Next customer page request:
   - Cache MISS
   - Generate new page with group_id = 2 pricing
   - Store in cache with new X-Magento-Vary value
5. Customer sees correct prices
```

**Trade-off**: Invalidating entire FPC is aggressive. For high-traffic sites, consider more granular invalidation or customer-specific cache tags.

---

### ❌ Anti-Pattern 5: Not Using Virtual Types for DI Configuration

#### Bad Code

```php
<?php
// Creating physical class for simple DI configuration
namespace Vendor\Module\Model;

use Magento\Framework\Session\Validator;
use Magento\Framework\Session\ValidatorInterface;

class CustomerSessionValidator extends Validator
{
    public function __construct(
        \Magento\Framework\App\Request\Http $request,
        \Magento\Framework\Session\SidResolverInterface $sidResolver,
        \Magento\Framework\Session\ValidatorInterface $remoteAddressValidator,
        \Magento\Framework\Session\ValidatorInterface $httpUserAgentValidator
    ) {
        parent::__construct($request, $sidResolver, [
            $remoteAddressValidator,
            $httpUserAgentValidator
        ]);
    }
}
```

**Then in di.xml**:

```xml
<preference for="Magento\Framework\Session\ValidatorInterface" type="Vendor\Module\Model\CustomerSessionValidator"/>
```

#### Why It's Bad

1. **Code Bloat**: Creates unnecessary physical class file
2. **Maintenance Overhead**: Changes require editing PHP file, not just configuration
3. **Less Flexible**: Harder to override or extend via DI configuration
4. **Anti-Pattern**: Magento provides virtual types specifically for this use case

#### Good Code

**No PHP class needed** - use virtual type in `etc/di.xml`:

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework:ObjectManager/etc/config.xsd">

    <!-- Define virtual type for customer session validator -->
    <virtualType name="Vendor\Module\Model\CustomerSessionValidator" type="Magento\Framework\Session\Validator">
        <arguments>
            <argument name="validators" xsi:type="array">
                <item name="remote_addr" xsi:type="object">Magento\Framework\Session\Validator\RemoteAddr</item>
                <item name="http_user_agent" xsi:type="object">Magento\Framework\Session\Validator\HttpUserAgent</item>
            </argument>
        </arguments>
    </virtualType>

    <!-- Use virtual type -->
    <type name="Magento\Customer\Model\Session">
        <arguments>
            <argument name="validator" xsi:type="object">Vendor\Module\Model\CustomerSessionValidator</argument>
        </arguments>
    </type>
</config>
```

#### Why It's Better

1. **No Code Files**: Pure configuration-based solution
2. **Easy Overrides**: Other modules can override via DI without touching code
3. **Standard Pattern**: Follows Magento's recommended DI pattern
4. **Cleaner Codebase**: Less files to maintain

**Real Example from Magento Core**:

```xml
<!-- vendor/magento/module-customer/etc/di.xml -->
<virtualType name="CustomerAddressSnapshot" type="Magento\Framework\Model\ResourceModel\Db\VersionControl\Snapshot">
    <arguments>
        <argument name="connectionName" xsi:type="string">default</argument>
    </arguments>
</virtualType>

<!-- No CustomerAddressSnapshot.php file needed! -->
```

---

## Observer Anti-Patterns

### ❌ Anti-Pattern 6: Synchronous External API Calls in Observers

#### Bad Code

```php
<?php
namespace Vendor\Module\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Vendor\Module\Service\ExternalApiClient;

class SyncCustomerToExternalSystem implements ObserverInterface
{
    private ExternalApiClient $apiClient;

    public function execute(Observer $observer): void
    {
        $customer = $observer->getEvent()->getCustomer();

        // WRONG: Synchronous HTTP request during customer save
        try {
            $response = $this->apiClient->syncCustomer([
                'email' => $customer->getEmail(),
                'firstname' => $customer->getFirstname(),
                'lastname' => $customer->getLastname(),
            ]);

            // This HTTP request takes 200-1000ms
            // Blocks customer save operation
            // If external API is down, customer save FAILS

        } catch (\Exception $e) {
            // Customer save fails if external API fails
            throw new \RuntimeException('Failed to sync customer to CRM: ' . $e->getMessage());
        }
    }
}
```

**Registration**:

```xml
<event name="customer_save_after_data_object">
    <observer name="vendor_sync_external" instance="Vendor\Module\Observer\SyncCustomerToExternalSystem"/>
</event>
```

#### Why It's Bad

1. **Slow Saves**: Customer save operations take 200-1000ms longer (HTTP latency)
2. **Failure Coupling**: External API failure causes customer save to fail
3. **Poor UX**: Admin users wait for external API during customer edits
4. **Scalability**: High customer save volume overwhelms external API
5. **Timeout Risk**: Long API calls may exceed PHP max_execution_time

**Performance Impact**:

```
Without external API: Customer save = 50ms
With synchronous API call: Customer save = 250-1050ms (5-20x slower)

High-traffic scenario:
- 100 customer saves/minute
- Each waits 500ms for external API
- Total wait time: 50 seconds/minute of blocked PHP-FPM workers
```

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Observer;

use Magento\Framework\Event\Observer;
use Magento\Framework\Event\ObserverInterface;
use Magento\Framework\MessageQueue\PublisherInterface;

class QueueCustomerSyncObserver implements ObserverInterface
{
    private PublisherInterface $publisher;

    public function __construct(PublisherInterface $publisher)
    {
        $this->publisher = $publisher;
    }

    public function execute(Observer $observer): void
    {
        $customer = $observer->getEvent()->getCustomer();

        // CORRECT: Queue message for async processing
        $this->publisher->publish('customer.external.sync', json_encode([
            'customer_id' => $customer->getId(),
            'email' => $customer->getEmail(),
            'firstname' => $customer->getFirstname(),
            'lastname' => $customer->getLastname(),
        ]));

        // Observer completes immediately (~1ms)
        // Actual sync happens in background via consumer
    }
}
```

**Consumer** (`etc/queue_consumer.xml`):

```xml
<?xml version="1.0"?>
<config xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:noNamespaceSchemaLocation="urn:magento:framework-message-queue:etc/consumer.xsd">
    <consumer name="customer.external.sync"
              queue="customer.external.sync"
              connection="amqp"
              maxMessages="100"
              consumerInstance="Vendor\Module\Model\Consumer\CustomerSync"
              handler="Vendor\Module\Model\Consumer\CustomerSync::process"/>
</config>
```

**Consumer Implementation**:

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Model\Consumer;

use Vendor\Module\Service\ExternalApiClient;
use Psr\Log\LoggerInterface;

class CustomerSync
{
    private ExternalApiClient $apiClient;
    private LoggerInterface $logger;

    public function process(string $message): void
    {
        $data = json_decode($message, true);

        try {
            // External API call runs in background worker
            $this->apiClient->syncCustomer($data);

            $this->logger->info('Customer synced to external system', [
                'customer_id' => $data['customer_id']
            ]);

        } catch (\Exception $e) {
            // Log error, but don't fail customer save
            $this->logger->error('Failed to sync customer to external system', [
                'customer_id' => $data['customer_id'],
                'error' => $e->getMessage()
            ]);

            // Message will be retried based on queue configuration
        }
    }
}
```

#### Why It's Better

1. **Fast Saves**: Customer save completes in 50ms, queue publish adds ~1ms
2. **Failure Isolation**: External API failure doesn't affect customer save
3. **Better UX**: Admin users don't wait for external systems
4. **Scalability**: Queue consumer processes messages at sustainable rate
5. **Retry Logic**: Failed messages automatically retry

**Performance Comparison**:

```
Synchronous Observer:  customer_save = 500ms (blocked)
Async Queue Observer:  customer_save = 51ms (1ms queue publish overhead)

Performance Gain: 10x faster customer saves
```

**Queue Consumer** (run via supervisor/systemd):

```bash
bin/magento queue:consumers:start customer.external.sync --max-messages=100
```

---

### ❌ Anti-Pattern 7: Bulk Operations Not Disabling Observers

#### Bad Code

```php
<?php
namespace Vendor\Module\Console\Command;

use Magento\Customer\Api\CustomerRepositoryInterface;
use Magento\Customer\Model\ResourceModel\Customer\CollectionFactory;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class BulkUpdateCustomers extends Command
{
    private CollectionFactory $customerCollectionFactory;
    private CustomerRepositoryInterface $customerRepository;

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $collection = $this->customerCollectionFactory->create();

        // WRONG: Updating 10,000 customers via repository
        // Triggers observers for EACH save
        foreach ($collection as $customer) {
            $customer->setCustomAttribute('bulk_updated', true);
            $this->customerRepository->save($customer);

            // Each save triggers:
            // - customer_save_after_data_object event
            // - Email sync observer (queries orders/quotes)
            // - Audit log observer (writes to log table)
            // - External API sync observer (if registered)
            //
            // Result: 10,000 customers x 5 observers x 50ms = 2,500 seconds (41 minutes)
        }

        $output->writeln('Updated ' . $collection->getSize() . ' customers.');
    }
}
```

#### Why It's Bad

1. **Extremely Slow**: Observers execute for each save (10,000 saves x 50ms = 500 seconds)
2. **Unnecessary Work**: Email sync, audit logs, external API calls not needed for bulk operations
3. **Database Load**: Thousands of unnecessary queries from observers
4. **Timeout Risk**: Script may hit max_execution_time
5. **Resource Exhaustion**: Memory leaks from repeated object instantiation

**Performance Example**:

```
10,000 customers
Each customer save triggers 5 observers
Each observer takes ~10ms average
Total observer overhead: 10,000 x 5 x 10ms = 500 seconds (8+ minutes)

Without observers: 10,000 x 2ms = 20 seconds
Observer overhead: 25x slower
```

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Console\Command;

use Magento\Customer\Model\ResourceModel\Customer\CollectionFactory;
use Magento\Framework\Event\ManagerInterface;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class BulkUpdateCustomers extends Command
{
    private CollectionFactory $customerCollectionFactory;
    private ManagerInterface $eventManager;

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $collection = $this->customerCollectionFactory->create();

        // CORRECT: Disable event dispatch for bulk operation
        $this->eventManager->dispatch('bulk_customer_update_before', [
            'size' => $collection->getSize()
        ]);

        // Temporarily disable observers
        $originalEventDispatchValue = \Magento\Framework\Event\ManagerInterface::$disableDispatch ?? false;
        \Magento\Framework\Event\ManagerInterface::$disableDispatch = true;

        $updated = 0;
        foreach ($collection as $customer) {
            $customer->setCustomAttribute('bulk_updated', true);
            $customer->save(); // Model save, NOT repository (intentional for bulk)

            $updated++;
            if ($updated % 100 === 0) {
                $output->writeln("Updated {$updated} customers...");
            }
        }

        // Re-enable observers
        \Magento\Framework\Event\ManagerInterface::$disableDispatch = $originalEventDispatchValue;

        $this->eventManager->dispatch('bulk_customer_update_after', [
            'count' => $updated
        ]);

        $output->writeln("Updated {$updated} customers.");
    }
}
```

**Even Better: Direct SQL for Bulk Updates**:

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Console\Command;

use Magento\Framework\App\ResourceConnection;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

class BulkUpdateCustomers extends Command
{
    private ResourceConnection $resourceConnection;

    protected function execute(InputInterface $input, OutputInterface $output)
    {
        $connection = $this->resourceConnection->getConnection();
        $tableName = $this->resourceConnection->getTableName('customer_entity');

        // BEST: Single SQL UPDATE for bulk operation
        $connection->update(
            $tableName,
            ['group_id' => 2], // Update all customers to group 2
            ['group_id = ?' => 1] // Where currently in group 1
        );

        $affectedRows = $connection->rowCount();
        $output->writeln("Updated {$affectedRows} customers.");

        // Single query, completes in < 1 second for 10,000 customers
    }
}
```

#### Why It's Better

1. **Fast Execution**: 10,000 customers updated in < 1 second (vs. 8+ minutes)
2. **No Observer Overhead**: Observers don't fire for each save
3. **Minimal Database Load**: Single UPDATE query vs. 50,000+ queries with observers
4. **No Timeout Risk**: Completes quickly even for large datasets
5. **Efficient Memory**: Single query vs. loading 10,000 customer objects

**Performance Comparison**:

```
Bad (repository with observers):  10,000 customers = 500 seconds (8 minutes)
Good (direct SQL):                 10,000 customers = 0.5 seconds

Performance Gain: 1000x faster
```

**Caveat**: Direct SQL bypasses validation, events, indexing triggers. Use only for internal bulk operations, not user-facing features.

---

## Performance Anti-Patterns

### ❌ Anti-Pattern 8: Loading Customer Collection in Loop

#### Bad Code

```php
<?php
namespace Vendor\Module\Model;

use Magento\Customer\Model\ResourceModel\Customer\CollectionFactory;
use Magento\Sales\Model\ResourceModel\Order\CollectionFactory as OrderCollectionFactory;

class OrderCustomerProcessor
{
    private CollectionFactory $customerCollectionFactory;
    private OrderCollectionFactory $orderCollectionFactory;

    public function processOrders(): array
    {
        $orders = $this->orderCollectionFactory->create();

        $result = [];
        foreach ($orders as $order) {
            // WRONG: Loading customer collection inside loop (N+1 query problem)
            $customerCollection = $this->customerCollectionFactory->create();
            $customerCollection->addFieldToFilter('entity_id', $order->getCustomerId());
            $customer = $customerCollection->getFirstItem();

            $result[] = [
                'order_id' => $order->getId(),
                'customer_name' => $customer->getFirstname() . ' ' . $customer->getLastname(),
            ];

            // For 1000 orders, this executes 1000 customer queries
        }

        return $result;
    }
}
```

#### Why It's Bad

1. **N+1 Query Problem**: 1000 orders = 1000 separate customer queries
2. **Slow Execution**: Each query takes 5-20ms, total 5-20 seconds
3. **Database Overload**: Excessive query count
4. **Memory Inefficient**: Creating new collection object per iteration

**SQL Generated**:

```sql
-- Query 1: Load orders
SELECT * FROM sales_order LIMIT 1000;

-- Query 2-1001: Load each customer individually
SELECT * FROM customer_entity WHERE entity_id = 1;
SELECT * FROM customer_entity WHERE entity_id = 2;
-- ... 998 more queries
SELECT * FROM customer_entity WHERE entity_id = 1000;

-- Total: 1001 queries, 5-20 seconds
```

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Model;

use Magento\Customer\Model\ResourceModel\Customer\CollectionFactory;
use Magento\Sales\Model\ResourceModel\Order\CollectionFactory as OrderCollectionFactory;

class OrderCustomerProcessor
{
    private CollectionFactory $customerCollectionFactory;
    private OrderCollectionFactory $orderCollectionFactory;

    public function processOrders(): array
    {
        // Load orders
        $orders = $this->orderCollectionFactory->create();

        // CORRECT: Collect all customer IDs first
        $customerIds = [];
        foreach ($orders as $order) {
            $customerIds[] = $order->getCustomerId();
        }
        $customerIds = array_unique($customerIds);

        // Load all customers in single query
        $customerCollection = $this->customerCollectionFactory->create();
        $customerCollection->addFieldToFilter('entity_id', ['in' => $customerIds]);

        // Index customers by ID for fast lookup
        $customersById = [];
        foreach ($customerCollection as $customer) {
            $customersById[$customer->getId()] = $customer;
        }

        // Build result using pre-loaded data
        $result = [];
        foreach ($orders as $order) {
            $customer = $customersById[$order->getCustomerId()] ?? null;

            $result[] = [
                'order_id' => $order->getId(),
                'customer_name' => $customer
                    ? $customer->getFirstname() . ' ' . $customer->getLastname()
                    : 'Guest',
            ];
        }

        return $result;
    }
}
```

#### Why It's Better

1. **Two Queries Total**: 1 for orders, 1 for all customers
2. **Fast Execution**: 100ms vs. 5-20 seconds (50-200x faster)
3. **Efficient Memory**: Single customer collection vs. 1000 collection objects
4. **Scalable**: Performance consistent regardless of order count

**SQL Generated** (good approach):

```sql
-- Query 1: Load orders
SELECT * FROM sales_order LIMIT 1000;

-- Query 2: Load all customers in one query
SELECT * FROM customer_entity WHERE entity_id IN (1, 2, 3, ..., 1000);

-- Total: 2 queries, 100ms
```

**Performance Gain**: 50-200x faster

---

## Security Anti-Patterns

### ❌ Anti-Pattern 9: Hardcoding Customer Group IDs

#### Bad Code

```php
<?php
namespace Vendor\Module\Model;

use Magento\Customer\Api\CustomerRepositoryInterface;

class PromotionAssigner
{
    private CustomerRepositoryInterface $customerRepository;

    public function assignWholesaleGroup(int $customerId): void
    {
        // WRONG: Hardcoded group ID
        $customer = $this->customerRepository->getById($customerId);
        $customer->setGroupId(2); // Assumes "Wholesale" = ID 2
        $this->customerRepository->save($customer);

        // Problem: Group ID 2 might not exist in all environments
        // Development: Wholesale = ID 2
        // Staging: Wholesale = ID 5
        // Production: Wholesale = ID 3
        // Result: Customer assigned to wrong group or save fails
    }
}
```

#### Why It's Bad

1. **Environment Portability**: Group IDs differ across environments (dev/staging/prod)
2. **Data Integrity**: Assigning non-existent group ID causes errors
3. **Deployment Failures**: Code works in dev, fails in production
4. **Maintenance Burden**: Must manually sync group IDs across environments

**Real-World Scenario**:

```
Development DB:
  customer_group_id | customer_group_code
  0                 | NOT LOGGED IN
  1                 | General
  2                 | Wholesale

Production DB (after cleanup):
  customer_group_id | customer_group_code
  0                 | NOT LOGGED IN
  1                 | General
  3                 | Wholesale (ID changed!)

Result: Code assigns group_id = 2, which doesn't exist in production
```

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Model;

use Magento\Customer\Api\CustomerRepositoryInterface;
use Magento\Customer\Api\GroupRepositoryInterface;
use Magento\Framework\Api\SearchCriteriaBuilder;

class PromotionAssigner
{
    private CustomerRepositoryInterface $customerRepository;
    private GroupRepositoryInterface $groupRepository;
    private SearchCriteriaBuilder $searchCriteriaBuilder;

    public function __construct(
        CustomerRepositoryInterface $customerRepository,
        GroupRepositoryInterface $groupRepository,
        SearchCriteriaBuilder $searchCriteriaBuilder
    ) {
        $this->customerRepository = $customerRepository;
        $this->groupRepository = $groupRepository;
        $this->searchCriteriaBuilder = $searchCriteriaBuilder;
    }

    public function assignWholesaleGroup(int $customerId): void
    {
        // CORRECT: Look up group by code, not hardcoded ID
        $groupCode = 'Wholesale';

        $searchCriteria = $this->searchCriteriaBuilder
            ->addFilter('customer_group_code', $groupCode, 'eq')
            ->create();

        $groups = $this->groupRepository->getList($searchCriteria);

        if ($groups->getTotalCount() === 0) {
            throw new \RuntimeException("Customer group '{$groupCode}' not found.");
        }

        $wholesaleGroup = $groups->getItems()[0];

        // Assign customer to group using looked-up ID
        $customer = $this->customerRepository->getById($customerId);
        $customer->setGroupId($wholesaleGroup->getId());
        $this->customerRepository->save($customer);
    }
}
```

**Even Better: Configuration-Based Group Code**:

```xml
<!-- etc/config.xml -->
<config>
    <default>
        <vendor_module>
            <promotion>
                <wholesale_group_code>Wholesale</wholesale_group_code>
            </promotion>
        </vendor_module>
    </default>
</config>
```

```php
<?php
// Retrieve from configuration
$groupCode = $this->scopeConfig->getValue('vendor_module/promotion/wholesale_group_code');
```

#### Why It's Better

1. **Environment Portable**: Works regardless of group ID values
2. **Fail-Safe**: Throws clear error if group doesn't exist
3. **Maintainable**: Group code consistent across environments
4. **Configurable**: Admin can change group code without code changes

**Best Practice**: Always use **customer group codes**, never IDs.

---

### ❌ Anti-Pattern 10: Not Implementing Around Plugins Correctly

#### Bad Code

```php
<?php
namespace Vendor\Module\Plugin;

use Magento\Customer\Api\CustomerRepositoryInterface;
use Magento\Customer\Api\Data\CustomerInterface;
use Psr\Log\LoggerInterface;

class LogCustomerSaveExtend
{
    private LoggerInterface $logger;

    public function aroundSave(
        CustomerRepositoryInterface $subject,
        callable $proceed,
        CustomerInterface $customer,
        $passwordHash = null
    ): CustomerInterface {
        $this->logger->info('Before customer save', ['email' => $customer->getEmail()]);

        // WRONG: Not passing all arguments to proceed()
        $result = $proceed($customer); // Missing $passwordHash argument!

        $this->logger->info('After customer save', ['id' => $result->getId()]);

        return $result;
    }
}
```

#### Why It's Bad

1. **Lost Arguments**: `$passwordHash` not passed to original method
2. **Silent Failure**: Password hash not set, customer can't log in
3. **Breaks Functionality**: Original method signature not respected
4. **Hard to Debug**: No error thrown, just incorrect behavior

**Result**:

```php
// Customer created with email, but no password
// Password reset required for every new customer
```

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Plugin;

use Magento\Customer\Api\CustomerRepositoryInterface;
use Magento\Customer\Api\Data\CustomerInterface;
use Psr\Log\LoggerInterface;

class LogCustomerSaveExtend
{
    private LoggerInterface $logger;

    public function __construct(LoggerInterface $logger)
    {
        $this->logger = $logger;
    }

    public function aroundSave(
        CustomerRepositoryInterface $subject,
        callable $proceed,
        CustomerInterface $customer,
        $passwordHash = null
    ): CustomerInterface {
        $this->logger->info('Before customer save', ['email' => $customer->getEmail()]);

        // CORRECT: Pass ALL arguments to proceed()
        $result = $proceed($customer, $passwordHash);

        $this->logger->info('After customer save', ['id' => $result->getId()]);

        return $result;
    }
}
```

**Even Better: Use Spread Operator for Variable Arguments**:

```php
<?php
public function aroundSave(
    CustomerRepositoryInterface $subject,
    callable $proceed,
    ...$args // Capture all arguments
): CustomerInterface {
    $this->logger->info('Before customer save');

    // Pass all arguments regardless of count
    $result = $proceed(...$args);

    $this->logger->info('After customer save');

    return $result;
}
```

#### Why It's Better

1. **Argument Safety**: All arguments passed correctly
2. **Future-Proof**: Works even if method signature changes
3. **Correct Behavior**: Original method executes as intended
4. **No Silent Failures**: Functionality preserved

---

## Testing Anti-Patterns

### ❌ Anti-Pattern 11: Not Testing Service Contracts, Only Models

#### Bad Code

```php
<?php
namespace Vendor\Module\Test\Unit\Model;

use PHPUnit\Framework\TestCase;
use Magento\Customer\Model\Customer;

class CustomerTest extends TestCase
{
    public function testCustomerSave()
    {
        // WRONG: Testing internal model, not service contract
        $customer = $this->createMock(Customer::class);
        $customer->expects($this->once())
            ->method('save')
            ->willReturnSelf();

        $customer->setEmail('test@example.com');
        $customer->save();

        // Problem: No one uses Customer model directly (should use repository)
        // This test doesn't validate real usage patterns
    }
}
```

#### Why It's Bad

1. **Wrong Abstraction**: Tests internal implementation, not public API
2. **False Security**: Test passes but real code (using repository) might fail
3. **Brittle Tests**: Model refactoring breaks tests even if API stable
4. **Missing Coverage**: Doesn't test plugins, observers, events

#### Good Code

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Test\Integration;

use Magento\Customer\Api\CustomerRepositoryInterface;
use Magento\Customer\Api\Data\CustomerInterfaceFactory;
use Magento\TestFramework\Helper\Bootstrap;
use PHPUnit\Framework\TestCase;

class CustomerRepositoryTest extends TestCase
{
    private CustomerRepositoryInterface $customerRepository;
    private CustomerInterfaceFactory $customerFactory;

    protected function setUp(): void
    {
        $objectManager = Bootstrap::getObjectManager();
        $this->customerRepository = $objectManager->get(CustomerRepositoryInterface::class);
        $this->customerFactory = $objectManager->get(CustomerInterfaceFactory::class);
    }

    public function testCustomerSaveViaRepository()
    {
        // CORRECT: Test service contract (repository interface)
        $customer = $this->customerFactory->create();
        $customer->setEmail('test@example.com');
        $customer->setFirstname('John');
        $customer->setLastname('Doe');
        $customer->setWebsiteId(1);

        $savedCustomer = $this->customerRepository->save($customer);

        // Verify save
        $this->assertNotNull($savedCustomer->getId());
        $this->assertEquals('test@example.com', $savedCustomer->getEmail());

        // Verify can retrieve via repository
        $retrievedCustomer = $this->customerRepository->getById($savedCustomer->getId());
        $this->assertEquals('John', $retrievedCustomer->getFirstname());

        // Cleanup
        $this->customerRepository->delete($savedCustomer);
    }

    public function testCustomerSaveTriggersPlugins()
    {
        // Test that plugins execute during save
        // This validates real execution flow
    }
}
```

#### Why It's Better

1. **Tests Real API**: Uses service contract, not internal models
2. **Validates Plugins**: Plugins execute during integration test
3. **Validates Events**: Observers fire and can be tested
4. **Realistic**: Tests actual usage patterns
5. **Stable**: API changes detected, internal refactoring doesn't break tests

---

## Summary: Anti-Pattern Quick Reference

| Anti-Pattern | Impact | Correct Approach |
|-------------|--------|------------------|
| Direct model usage | Bypasses plugins, events | Use repository interface |
| Loading full customer for one field | 10-50x slower | Direct SQL query for field |
| Excessive EAV attributes | 2000ms+ load time | Extension attributes + custom table |
| Ignoring cache after group change | Stale pricing | Invalidate FPC after group change |
| Physical class for DI | Code bloat | Virtual types in di.xml |
| Sync external API in observer | 10-100x slower saves | Async queue pattern |
| Bulk ops with observers | 25x slower | Disable observers or direct SQL |
| N+1 queries in loop | Database overload | Batch load with IN clause |
| Hardcoded group IDs | Environment portability | Look up by group code |
| Incorrect around plugins | Lost arguments | Pass all args with spread operator |
| Testing models not APIs | False coverage | Test service contracts |

---

**Document Version**: 1.0.0
**Last Updated**: 2025-12-04
**Magento Versions**: 2.4.x
**PHP Versions**: 8.1, 8.2, 8.3, 8.4

**Next**: See [VERSION_COMPATIBILITY.md](./VERSION_COMPATIBILITY.md) for version-specific features and breaking changes.

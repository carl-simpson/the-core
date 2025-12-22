<?php
/**
 * MAGENTO CORE LEARNING: Customer Repository Interface
 *
 * =============================================================================
 * ARCHITECTURAL POSITION
 * =============================================================================
 *
 * This is the PRIMARY service contract for customer data persistence in Magento.
 * It sits at the SERVICE LAYER of the Magento architecture, providing a clean
 * API boundary between business logic and data access.
 *
 * Layer Hierarchy:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  CONTROLLERS / API ENDPOINTS / COMMANDS                         │ ← Call this
 * └────────────────────────────┬────────────────────────────────────┘
 *                              │
 * ┌────────────────────────────▼────────────────────────────────────┐
 * │  CUSTOMERREPOSITORYINTERFACE (Service Contract - You are here!) │
 * └────────────────────────────┬────────────────────────────────────┘
 *                              │
 * ┌────────────────────────────▼────────────────────────────────────┐
 * │  Model\ResourceModel\CustomerRepository (Implementation)        │ ← DI Preference
 * └────────────────────────────┬────────────────────────────────────┘
 *                              │
 * ┌────────────────────────────▼────────────────────────────────────┐
 * │  DATABASE (customer_entity + EAV tables)                        │
 * └─────────────────────────────────────────────────────────────────┘
 *
 * =============================================================================
 * WHY SERVICE CONTRACTS?
 * =============================================================================
 *
 * 1. **Backward Compatibility**: @api interfaces cannot change signatures
 * 2. **Decoupling**: Controllers don't depend on implementation details
 * 3. **Plugin Intercept Points**: Plugins can only intercept interfaces
 * 4. **API Exposure**: REST/SOAP APIs auto-generate from service contracts
 * 5. **Testability**: Easy to mock in unit tests
 *
 * =============================================================================
 * PLUGINS INTERCEPTING THIS INTERFACE
 * =============================================================================
 *
 * 1. TransactionWrapper (sortOrder: -1) - CRITICAL
 *    - Opens database transaction BEFORE save/delete
 *    - Commits AFTER successful operation
 *    - Rolls back on ANY exception
 *    - Ensures customer + addresses + EAV saved atomically
 *
 * 2. UpdateCustomer (sortOrder: 10, webapi_rest area)
 *    - REST API specific: Merges request body into customer DTO
 *
 * 3. CustomerAuthorization (webapi_rest, webapi_soap areas)
 *    - Validates API token customer matches requested customer ID
 *    - Prevents customer A from accessing customer B's data
 *
 * 4. Custom third-party plugins (many!)
 *    - Data enrichment
 *    - Validation
 *    - Logging/audit
 *    - Integration with external systems
 *
 * =============================================================================
 * IMPLEMENTATION MAPPING (DI Preference)
 * =============================================================================
 *
 * In etc/di.xml:
 * <preference for="Magento\Customer\Api\CustomerRepositoryInterface"
 *             type="Magento\Customer\Model\ResourceModel\CustomerRepository" />
 *
 * This means when you inject CustomerRepositoryInterface, you get
 * CustomerRepository implementation. Allows swapping implementations without
 * changing consumers.
 *
 * =============================================================================
 * TYPICAL USAGE PATTERNS
 * =============================================================================
 *
 * // 1. CREATE NEW CUSTOMER
 * $customer = $this->customerFactory->create();
 * $customer->setFirstname('John');
 * $customer->setLastname('Doe');
 * $customer->setEmail('john@example.com');
 * $customer->setWebsiteId($websiteId);
 * $savedCustomer = $this->customerRepository->save($customer, $passwordHash);
 *
 * // 2. UPDATE EXISTING CUSTOMER
 * $customer = $this->customerRepository->getById($customerId);
 * $customer->setFirstname('Jane');
 * $this->customerRepository->save($customer); // No password hash = don't change password
 *
 * // 3. SEARCH CUSTOMERS
 * $searchCriteria = $this->searchCriteriaBuilder
 *     ->addFilter('email', 'john@example.com', 'like')
 *     ->addFilter('website_id', 1)
 *     ->create();
 * $results = $this->customerRepository->getList($searchCriteria);
 *
 * // 4. DELETE CUSTOMER
 * $customer = $this->customerRepository->getById($customerId);
 * $this->customerRepository->delete($customer);
 *
 * =============================================================================
 * COMMON PITFALLS
 * =============================================================================
 *
 * 1. NEVER bypass repository - don't use Model\Customer::save() directly
 *    - Bypasses plugins
 *    - Bypasses transaction wrapper
 *    - No events dispatched
 *
 * 2. Always catch exceptions
 *    - NoSuchEntityException when customer doesn't exist
 *    - InputException for validation failures
 *    - LocalizedException for business logic errors
 *
 * 3. Don't save in loops
 *    - Use collection operations or bulk save patterns
 *    - Each save opens a transaction (expensive)
 *
 * 4. Password hash is OPTIONAL
 *    - Only provide when creating or changing password
 *    - Empty string != null (empty string will fail)
 *
 * =============================================================================
 * Copyright © Magento, Inc. All rights reserved.
 * See COPYING.txt for license details.
 */

namespace Magento\Customer\Api;

/**
 * Customer CRUD interface.
 *
 * @api
 * @since 100.0.2
 *
 * STABILITY: This interface is marked @api, meaning:
 * - Method signatures cannot change in minor/patch releases
 * - New methods can be added (with default implementations in traits)
 * - This is a PUBLIC API contract
 */
interface CustomerRepositoryInterface
{
    /**
     * Create or update a customer.
     *
     * =================================================================
     * EXECUTION FLOW (see EXECUTION_FLOWS.md for complete details)
     * =================================================================
     *
     * 1. TransactionWrapper::beforeSave() - Opens database transaction
     * 2. Validation:
     *    - Email format
     *    - Required fields (firstname, lastname, email)
     *    - Email uniqueness (email + website_id must be unique)
     *    - Custom attribute validation
     * 3. Convert DTO to Model (CustomerInterface → Customer)
     * 4. Set password_hash if provided
     * 5. Database persistence:
     *    - INSERT or UPDATE customer_entity
     *    - INSERT or UPDATE customer_entity_varchar (EAV attributes)
     *    - INSERT or UPDATE customer_entity_int, _datetime, _decimal, _text
     * 6. Save addresses if included in customer DTO
     * 7. EVENT: customer_save_after_data_object
     *    - Triggers UpgradeOrderCustomerEmailObserver (sync email to orders)
     *    - Triggers UpgradeQuoteCustomerEmailObserver (sync email to quote)
     * 8. TransactionWrapper::afterSave() - Commits transaction
     * 9. Return saved CustomerInterface DTO
     *
     * =================================================================
     * TRANSACTION SAFETY
     * =================================================================
     *
     * The TransactionWrapper plugin ensures:
     * - Customer + addresses saved atomically
     * - Email sync observers run in same transaction
     * - Validation failures rollback everything
     * - Database errors rollback everything
     *
     * Example rollback scenario:
     * 1. Customer entity saved successfully
     * 2. Address save fails (invalid country code)
     * 3. TransactionWrapper::afterSave() catches exception
     * 4. Entire transaction rolled back
     * 5. Customer entity NOT in database
     * 6. Exception re-thrown to caller
     *
     * =================================================================
     * PASSWORD HANDLING
     * =================================================================
     *
     * $passwordHash parameter usage:
     *
     * CREATE with password:
     *   $hash = $encryptor->getHash($plainPassword, true);
     *   $repository->save($customer, $hash);
     *
     * CREATE without password (requires confirmation email):
     *   $repository->save($customer); // No hash = no password
     *
     * UPDATE without changing password:
     *   $repository->save($customer); // Don't pass hash
     *
     * UPDATE and change password:
     *   $hash = $encryptor->getHash($newPassword, true);
     *   $repository->save($customer, $hash);
     *
     * NEVER pass plain password:
     *   $repository->save($customer, $plainPassword); // WRONG! Security issue!
     *
     * =================================================================
     * EMAIL SYNCHRONIZATION SIDE EFFECT
     * =================================================================
     *
     * When customer email changes during save, observers automatically
     * update related records:
     *
     * 1. All historical orders get new email (for customer lookup)
     * 2. Active quote gets new email (for cart recovery emails)
     *
     * This happens AUTOMATICALLY in the background. You don't need to
     * do anything special.
     *
     * Database impact:
     *   UPDATE sales_order SET customer_email = ? WHERE customer_id = ?
     *   UPDATE quote SET customer_email = ? WHERE customer_id = ? AND is_active = 1
     *
     * Performance: May update hundreds of orders for long-time customers.
     * This is why transaction wrapper is critical - rollback if email
     * sync fails.
     *
     * =================================================================
     * ERROR HANDLING
     * =================================================================
     *
     * try {
     *     $customer = $this->customerRepository->save($customer, $passwordHash);
     * } catch (\Magento\Framework\Exception\InputException $e) {
     *     // Validation error (invalid email, missing required fields, etc.)
     *     // $e->getErrors() has detailed validation messages
     *     foreach ($e->getErrors() as $error) {
     *         $this->messageManager->addErrorMessage($error->getMessage());
     *     }
     * } catch (\Magento\Framework\Exception\State\InputMismatchException $e) {
     *     // Email already exists (unique constraint violation)
     *     $this->messageManager->addErrorMessage($e->getMessage());
     * } catch (\Magento\Framework\Exception\LocalizedException $e) {
     *     // Business logic error (account disabled, group invalid, etc.)
     *     $this->messageManager->addErrorMessage($e->getMessage());
     * } catch (\Exception $e) {
     *     // Unexpected error (database down, etc.)
     *     $this->logger->critical($e);
     *     $this->messageManager->addErrorMessage(__('Unable to save customer.'));
     * }
     *
     * @param \Magento\Customer\Api\Data\CustomerInterface $customer Customer data object
     * @param string|null $passwordHash Hashed password (optional, only for create or password change)
     *
     * @return \Magento\Customer\Api\Data\CustomerInterface Saved customer with generated ID and timestamps
     *
     * @throws \Magento\Framework\Exception\InputException If bad input is provided
     * @throws \Magento\Framework\Exception\State\InputMismatchException If the provided email is already used
     * @throws \Magento\Framework\Exception\LocalizedException For business logic errors
     */
    public function save(\Magento\Customer\Api\Data\CustomerInterface $customer, $passwordHash = null);

    /**
     * Retrieve customer by email and website.
     *
     * =================================================================
     * WHY WEBSITE_ID?
     * =================================================================
     *
     * Magento supports two customer account sharing modes:
     *
     * 1. **Global** (scope = 0): One customer account across all websites
     *    - Customer can log in to any website with same credentials
     *    - Email must be unique globally
     *    - get($email, null) works
     *
     * 2. **Per Website** (scope = 1): Separate accounts per website
     *    - john@example.com can exist on multiple websites
     *    - Different passwords, different customer IDs
     *    - MUST provide $websiteId parameter
     *
     * Configuration: Stores > Configuration > Customers > Customer Configuration
     * > Account Sharing Options > Share Customer Accounts
     *
     * =================================================================
     * USAGE PATTERNS
     * =================================================================
     *
     * // GLOBAL SCOPE (scope = 0)
     * $customer = $this->customerRepository->get('john@example.com');
     * // Works because email is globally unique
     *
     * // PER-WEBSITE SCOPE (scope = 1)
     * $websiteId = $this->storeManager->getStore()->getWebsiteId();
     * $customer = $this->customerRepository->get('john@example.com', $websiteId);
     * // REQUIRED: Must provide website ID
     *
     * // WRONG - Will throw exception if scope = 1 and email exists on multiple websites
     * $customer = $this->customerRepository->get('john@example.com'); // Missing website ID!
     *
     * =================================================================
     * UNIQUE CONSTRAINT
     * =================================================================
     *
     * Database constraint:
     *   UNIQUE KEY (email, website_id)
     *
     * This means:
     * - (john@example.com, website_id=1) ✓ Allowed
     * - (john@example.com, website_id=2) ✓ Allowed (different website)
     * - (john@example.com, website_id=1) ✗ DUPLICATE (same email + website)
     *
     * =================================================================
     * PERFORMANCE
     * =================================================================
     *
     * Database query:
     *   SELECT * FROM customer_entity
     *   WHERE email = ? AND website_id = ?
     *
     * Index: CUSTOMER_ENTITY_EMAIL_WEBSITE_ID (email, website_id)
     * Performance: O(log n) - indexed lookup
     *
     * Note: This is SLOWER than getById() which uses primary key.
     * If you have customer ID, always prefer getById().
     *
     * @param string $email Customer email address
     * @param int|null $websiteId Website ID (required if account sharing is per-website)
     *
     * @return \Magento\Customer\Api\Data\CustomerInterface Customer data object
     *
     * @throws \Magento\Framework\Exception\NoSuchEntityException If customer with the specified email does not exist
     * @throws \Magento\Framework\Exception\LocalizedException For other errors
     */
    public function get($email, $websiteId = null);

    /**
     * Get customer by Customer ID.
     *
     * =================================================================
     * PREFERRED LOOKUP METHOD
     * =================================================================
     *
     * This is the FASTEST way to load a customer because it uses the
     * primary key (entity_id).
     *
     * Database query:
     *   SELECT * FROM customer_entity WHERE entity_id = ?
     *
     * Performance: O(1) - direct primary key lookup
     *
     * Always prefer this over get($email) when you have the customer ID.
     *
     * =================================================================
     * WHERE TO GET CUSTOMER ID
     * =================================================================
     *
     * Common sources:
     * 1. Customer session: $this->session->getCustomerId()
     * 2. Order: $order->getCustomerId()
     * 3. Quote: $quote->getCustomerId()
     * 4. URL parameter: $this->getRequest()->getParam('customer_id')
     * 5. Previous repository operation: $savedCustomer->getId()
     *
     * =================================================================
     * EAV LOADING
     * =================================================================
     *
     * This method loads:
     * - customer_entity row (main table)
     * - All EAV attributes (joins to customer_entity_varchar, _int, etc.)
     * - Custom attributes (if defined)
     * - Extension attributes (if defined)
     *
     * Does NOT load:
     * - Addresses (must call AddressRepositoryInterface separately)
     * - Orders (use OrderRepositoryInterface)
     * - Quotes (use CartRepositoryInterface)
     *
     * To load with addresses:
     *   $customer = $this->customerRepository->getById($customerId);
     *   $addresses = $customer->getAddresses(); // Empty array
     *
     *   // Must load addresses separately:
     *   $searchCriteria = $this->searchCriteriaBuilder
     *       ->addFilter('parent_id', $customerId)
     *       ->create();
     *   $addresses = $this->addressRepository->getList($searchCriteria)->getItems();
     *
     * =================================================================
     * CACHING
     * =================================================================
     *
     * CustomerRepository implementation uses identity map pattern:
     * - First load: Query database
     * - Subsequent loads (same request): Return cached instance
     * - Different requests: Fresh database query
     *
     * Identity map prevents:
     * - Multiple queries for same customer in one request
     * - Inconsistent object instances
     *
     * =================================================================
     * ERROR HANDLING
     * =================================================================
     *
     * try {
     *     $customer = $this->customerRepository->getById($customerId);
     * } catch (\Magento\Framework\Exception\NoSuchEntityException $e) {
     *     // Customer ID does not exist
     *     // DO NOT expose this to users (security - customer ID enumeration)
     *     $this->logger->info("Customer not found: $customerId");
     *     throw new \Magento\Framework\Exception\LocalizedException(
     *         __('The customer account does not exist.')
     *     );
     * }
     *
     * @param int $customerId Customer ID (entity_id)
     *
     * @return \Magento\Customer\Api\Data\CustomerInterface Customer data object
     *
     * @throws \Magento\Framework\Exception\NoSuchEntityException If customer with the specified ID does not exist
     * @throws \Magento\Framework\Exception\LocalizedException For other errors
     */
    public function getById($customerId);

    /**
     * Retrieve customers which match a specified criteria.
     *
     * =================================================================
     * SEARCH CRITERIA PATTERN
     * =================================================================
     *
     * Magento's standard search pattern for repositories. Supports:
     * - Filtering
     * - Sorting
     * - Pagination
     *
     * Example usage:
     *
     * $searchCriteria = $this->searchCriteriaBuilder
     *     ->addFilter('email', '%@example.com', 'like')
     *     ->addFilter('group_id', [1, 2], 'in')
     *     ->addFilter('website_id', $websiteId)
     *     ->setPageSize(50)
     *     ->setCurrentPage(1)
     *     ->addSortOrder($this->sortOrderBuilder->setField('created_at')->setDirection('DESC')->create())
     *     ->create();
     *
     * $results = $this->customerRepository->getList($searchCriteria);
     *
     * echo "Total customers: " . $results->getTotalCount();
     * foreach ($results->getItems() as $customer) {
     *     echo $customer->getEmail() . "\n";
     * }
     *
     * =================================================================
     * AVAILABLE FILTERS
     * =================================================================
     *
     * You can filter on any customer attribute:
     *
     * **Standard Fields** (customer_entity table):
     * - entity_id, email, website_id, store_id, group_id
     * - firstname, lastname, middlename, prefix, suffix
     * - dob, taxvat, gender, created_at, updated_at
     * - default_billing, default_shipping, is_active
     *
     * **EAV Attributes** (custom attributes):
     * - Any custom customer attribute defined in admin
     *
     * **Filter Conditions**:
     * - 'eq' (equals) - Default
     * - 'neq' (not equals)
     * - 'like' (SQL LIKE with %)
     * - 'nlike' (NOT LIKE)
     * - 'in' (IN array)
     * - 'nin' (NOT IN array)
     * - 'gt' (greater than)
     * - 'lt' (less than)
     * - 'gteq' (greater than or equal)
     * - 'lteq' (less than or equal)
     * - 'null' (IS NULL)
     * - 'notnull' (IS NOT NULL)
     *
     * =================================================================
     * PERFORMANCE CONSIDERATIONS
     * =================================================================
     *
     * **Indexes**: Filters use these indexes if available:
     * - email (indexed)
     * - website_id (indexed)
     * - firstname, lastname (indexed)
     * - created_at (not indexed - full table scan!)
     *
     * **EAV Joins**: Each EAV attribute filter adds a LEFT JOIN
     * - More filters = more joins = slower query
     * - Consider flat tables for heavy searching
     *
     * **Pagination**: ALWAYS use pagination for large result sets
     * - setPageSize(50) - Limit results
     * - setCurrentPage(1) - Page number
     * - Without pagination, you get ALL matching customers (OOM risk!)
     *
     * **Example - Efficient Search**:
     * $searchCriteria = $this->searchCriteriaBuilder
     *     ->addFilter('email', 'john@example.com') // Uses index
     *     ->addFilter('website_id', 1)             // Uses index
     *     ->setPageSize(1)                         // Limit 1 (we expect one result)
     *     ->create();
     *
     * **Example - Inefficient Search**:
     * $searchCriteria = $this->searchCriteriaBuilder
     *     ->addFilter('custom_attribute_1', 'value1') // EAV join
     *     ->addFilter('custom_attribute_2', 'value2') // Another EAV join
     *     ->addFilter('custom_attribute_3', 'value3') // Another EAV join
     *     ->create(); // No page size = load ALL customers matching (OOM!)
     *
     * =================================================================
     * RETURN VALUE
     * =================================================================
     *
     * Returns CustomerSearchResultsInterface with:
     * - getItems(): CustomerInterface[] array
     * - getTotalCount(): int (total matching records, ignoring pagination)
     * - getSearchCriteria(): SearchCriteriaInterface (echo back)
     *
     * =================================================================
     * HEALTHCARE PLATFORM USE CASE
     * =================================================================
     *
     * Example: Find all customers over 65 for senior discount notification
     *
     * $today = new \DateTime();
     * $senior_birthdate = $today->modify('-65 years')->format('Y-m-d');
     *
     * $searchCriteria = $this->searchCriteriaBuilder
     *     ->addFilter('dob', $senior_birthdate, 'lteq') // DOB <= 65 years ago
     *     ->addFilter('is_active', 1)
     *     ->addFilter('group_id', [1, 2], 'in') // General or Retail customers
     *     ->setPageSize(100)
     *     ->create();
     *
     * $results = $this->customerRepository->getList($searchCriteria);
     *
     * foreach ($results->getItems() as $customer) {
     *     $this->emailSender->sendSeniorDiscountEmail($customer);
     * }
     *
     * This call returns an array of objects, but detailed information about each object's
     * attributes might not be included. See
     * https://devdocs.magento.com/codelinks/attributes.html#CustomerRepositoryInterface
     * to determine which call to use to get detailed information about all attributes
     * for an object.
     *
     * @param \Magento\Framework\Api\SearchCriteriaInterface $searchCriteria Search criteria
     *
     * @return \Magento\Customer\Api\Data\CustomerSearchResultsInterface Search results
     *
     * @throws \Magento\Framework\Exception\LocalizedException For query errors
     */
    public function getList(\Magento\Framework\Api\SearchCriteriaInterface $searchCriteria);

    /**
     * Delete customer by data object.
     *
     * =================================================================
     * EXECUTION FLOW
     * =================================================================
     *
     * 1. TransactionWrapper::beforeDelete() - Opens transaction
     * 2. Validation: Check customer exists
     * 3. EVENT: customer_delete_before
     * 4. Delete customer addresses (CASCADE)
     * 5. Delete customer EAV attributes (CASCADE)
     * 6. Delete customer entity row
     * 7. EVENT: customer_delete_after
     * 8. TransactionWrapper::afterDelete() - Commits transaction
     *
     * =================================================================
     * CASCADING DELETES
     * =================================================================
     *
     * When customer is deleted, these are also deleted:
     * - Customer addresses (customer_address_entity)
     * - Customer EAV attributes (customer_entity_varchar, _int, etc.)
     * - Customer log (customer_log)
     * - Customer visitor sessions (customer_visitor)
     *
     * These are NOT deleted (by design):
     * - Orders (sales_order) - Historical records preserved
     * - Quotes (quote) - May be needed for analytics
     * - Reviews (review) - Preserved for product ratings
     *
     * Orders/quotes/reviews will have customer_id pointing to deleted customer.
     * They keep customer_email, customer_firstname, customer_lastname for display.
     *
     * =================================================================
     * GDPR / DATA PRIVACY
     * =================================================================
     *
     * For GDPR "right to be forgotten":
     * 1. Use this method to delete customer
     * 2. Separately anonymize orders/quotes:
     *    - Set customer_email to "deleted@privacy.invalid"
     *    - Set customer_firstname to "Deleted"
     *    - Set customer_lastname to "Customer"
     * 3. Clear customer_id reference:
     *    - UPDATE sales_order SET customer_id = NULL WHERE customer_id = ?
     *
     * Magento Enterprise has built-in GDPR tools for this.
     *
     * =================================================================
     * HEALTHCARE PLATFORM CONSIDERATIONS
     * =================================================================
     *
     * **HIPAA Compliance**: Customer deletion may not be sufficient.
     * - Medical records may need to be retained (legal requirement)
     * - Consider "soft delete" instead (is_active = 0)
     * - Anonymize PII but keep medical data with patient ID
     *
     * Example soft delete:
     *   $customer->setIsActive(0);
     *   $customer->setEmail('anonymized_' . $customer->getId() . '@privacy.invalid');
     *   $this->customerRepository->save($customer);
     *
     * =================================================================
     * AUTHORIZATION
     * =================================================================
     *
     * Always check permissions before deleting:
     * - Admin users: Check ACL (Magento_Customer::delete)
     * - Customers: Customers cannot delete themselves via storefront
     * - API: Check token authorization
     *
     * Example authorization check:
     *   if (!$this->authorization->isAllowed('Magento_Customer::delete')) {
     *       throw new AuthorizationException(__('You are not authorized to delete customers.'));
     *   }
     *
     * @param \Magento\Customer\Api\Data\CustomerInterface $customer Customer to delete
     *
     * @return bool true on success
     *
     * @throws \Magento\Framework\Exception\LocalizedException For errors (customer has orders, etc.)
     * @throws \Exception For unexpected errors
     */
    public function delete(\Magento\Customer\Api\Data\CustomerInterface $customer);

    /**
     * Delete customer by Customer ID.
     *
     * Convenience method that loads customer then calls delete().
     *
     * Internally does:
     *   $customer = $this->getById($customerId);
     *   return $this->delete($customer);
     *
     * Use this when you only have customer ID and don't need customer data.
     * Use delete($customer) when you already have customer object.
     *
     * @see delete() for complete documentation
     *
     * @param int $customerId Customer ID to delete
     *
     * @return bool true on success
     *
     * @throws \Magento\Framework\Exception\NoSuchEntityException If customer doesn't exist
     * @throws \Magento\Framework\Exception\LocalizedException For other errors
     */
    public function deleteById($customerId);
}

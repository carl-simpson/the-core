# Magento_Customer Documentation Corrections Required

**Analysis Date:** 2025-01-07
**Affected Files:** 2 HTML documentation files
**Total Corrections:** 3 confirmed + ~10 recommended reviews

---

## CONFIRMED ERRORS - Must Fix

### 1. Remove Event: customer_delete_after

**File:** `/home/carl/Documents/the-core/docs/modules/Magento_Customer/html/architecture.html`

**Location:** Search for "customer_delete_after" in events section

**Current Content (Incorrect):**
```html
<!-- Example - exact HTML may vary -->
<li><code>customer_delete_after</code> - Dispatched after customer deletion</li>
```

**Corrected Content:**
```html
<!-- REMOVE THIS ENTRY -->
<!-- Event does not exist in Magento 2.4.x -->
```

**Alternative (if context is educational):**
```html
<div class="note warning">
  <strong>Note:</strong> Magento does not dispatch <code>customer_delete_after</code>
  or <code>customer_delete_before</code> events natively. Customer deletion uses
  <code>Magento\Eav\Model\Entity\AbstractEntity::delete()</code> which only dispatches
  generic EAV events. To observe customer deletions, create a plugin on
  <code>Magento\Customer\Model\ResourceModel\CustomerRepository::delete()</code>
  or <code>deleteById()</code>.
</div>
```

**Verification:**
```bash
# Should return NO results:
grep -r "customer_delete_after" \
  /home/carl/Documents/_ParkedProjects/magento/src/vendor/mage-os/module-customer/
```

---

### 2. Remove Event: customer_delete_before

**File:** `/home/carl/Documents/the-core/docs/modules/Magento_Customer/html/architecture.html`

**Same issue as #1 above**

**Action:** Remove or add same warning note as customer_delete_after

---

### 3. Remove Event: customer_save_before

**File:** `/home/carl/Documents/the-core/docs/modules/Magento_Customer/html/architecture.html`

**Current Content (Incorrect):**
```html
<li><code>customer_save_before</code> - Dispatched before customer save operation</li>
```

**Corrected Content:**
```html
<!-- REMOVE - Only customer_save_after and customer_save_after_data_object exist -->
```

**Or Replace With:**
```html
<div class="note info">
  <strong>Available Customer Save Events:</strong>
  <ul>
    <li><code>customer_save_after</code> - Legacy event, receives Model object</li>
    <li><code>customer_save_after_data_object</code> - Modern event, receives Data Interface</li>
  </ul>
  <p><em>Note: No before-save events exist for customers. Use plugins on repository
  <code>save()</code> method for pre-save logic.</em></p>
</div>
```

**Verification:**
```bash
# Check what actually exists:
grep "customer_save" \
  /home/carl/Documents/_ParkedProjects/magento/src/vendor/mage-os/module-customer/etc/events.xml

# Results should show:
# - customer_save_after
# - customer_save_after_data_object
# NO customer_save_before
```

---

## RECOMMENDED REVIEWS - Verify Context

These claims appear in validation results but need source HTML context verification to determine if they're actual errors or parsing artifacts:

### Methods Category - architecture.html

Review the following in source HTML to confirm they're genuine API documentation claims (not prose text):

**Likely Parsing Errors (Low Priority to Review):**
1. `ache` - probably from "C**ache**" or "Cach**e**"
2. `colors` - probably from prose about UI/design
3. `entity_id` - valid database column, not a method
4. `parent_id` - valid database column, not a method
5. `groups` - needs context (could be valid method or prose)
6. `highlightAll` - possibly frontend JS, not backend PHP
7. `operations` - needs context
8. `possible` - likely prose word
9. `storage` - needs context

**Recommendation:**
- If these are in `<code>` tags or method lists, investigate further
- If in paragraph text, remove from validation claims
- Most appear to be HTML parser extracting random words from prose

---

### Methods Category - execution-flows.html

Similar parsing issues. Review in context:

**Definitely Invalid (Parsing Errors):**
1. `algorithm` - prose word
2. `constraint` - prose word
3. `customerDataObject` - likely variable name in example, not method
4. `details` - prose word
5. `earchCriteria` - fragment of "SearchCriteria"
6. `etc` - abbreviation "etc."
7. `expired` - prose word
8. `failures` - prose word
9. `form_key` - valid concept but not a method name
10. `invalidated` - prose word
11. `lugin` - fragment of "Plugin"
12. `mechanism` - prose word
13. `oSuchEntityException` - fragment of "NoSuchEntityException" (class, not method)
14. `odel` - fragment of "Model"
15. `origCustomerDataObject` - likely variable name
16. `pgrade` - fragment of "Upgrade"
17. `rapper` - fragment of "Wrapper"
18. `reation` - fragment of "Creation"
19. `requests` - prose word
20. `rows` - prose word
21. `sales_order` - table name, not method
22. `uniqueness` - prose word

**Action:** These should be filtered out by improving the HTML parser, not fixed in documentation.

---

### Methods Category - plugins-observers.html

**Likely Parsing Errors:**
1. `colors` - prose word
2. `dispatched` - prose word (verb describing events)
3. `epersonalizePlugin` - fragment of "DepersonalizePlugin" (class name)
4. `groups` - context needed
5. `highlightAll` - likely JS or prose
6. `pages` - prose word
7. `plugins` - prose word (describing the topic, not a method)
8. `ransactionWrapper` - fragment of "TransactionWrapper" (class name)
9. `sections` - prose word or config term

**Action:** Parser improvement needed, not doc fixes

---

### Methods Category - integrations.yaml

**Parsing Errors:**
1. `colors` - prose word
2. `highlightAll` - prose/JS
3. `ustomer` - fragment of "Customer"

**Action:** Parser improvement

---

### Methods Category - known-issues.yaml

**Parsing Errors:**
1. `checkout` - prose word or module name
2. `colors` - prose word
3. `confusion` - prose word
4. `ebsite` - fragment of "Website"
5. `endpoints` - prose word
6. `highlightAll` - prose/JS
7. `idn_to_ascii` - PHP function name (valid but not Magento method)
8. `lobal` - fragment of "Global"
9. `operations` - prose word
10. `seconds` - prose word (time unit)
11. `session_start` - PHP function, not Magento method

**Action:** Parser improvement

---

## HTML Structure Recommendations

To prevent future parsing errors, recommend structuring documentation like:

### Good Structure (Parser-Friendly)

```html
<section class="api-reference">
  <h3>Public Methods</h3>
  <ul class="method-list">
    <li>
      <code class="method">createAccount()</code>
      <span class="description">Creates a new customer account</span>
    </li>
    <li>
      <code class="method">authenticate()</code>
      <span class="description">Validates customer credentials</span>
    </li>
  </ul>
</section>

<section class="events">
  <h3>Dispatched Events</h3>
  <table class="event-reference">
    <tr>
      <td><code class="event-name">customer_login</code></td>
      <td>After successful login</td>
    </tr>
  </table>
</section>
```

### Avoid (Current Issues)

```html
<!-- Parser extracts random words from this -->
<p>
  The system uses Service Contracts to provide API access.
  Methods like createAccount and authenticate are available.
  Colors and highlighting help developers...
</p>
```

**Better Approach:**

```html
<p>
  The system uses Service Contracts to provide API access.
  Methods like <code>createAccount()</code> and <code>authenticate()</code>
  are available through <code>AccountManagementInterface</code>.
</p>

<div class="api-listing">
  <h4>Available Methods:</h4>
  <ul>
    <li><code>createAccount(CustomerInterface $customer, string $password): CustomerInterface</code></li>
    <li><code>authenticate(string $username, string $password): CustomerInterface</code></li>
  </ul>
</div>
```

---

## Validation Script Improvements Needed

Document the validation tool issues found (for DevTools team):

### Issue 1: Interface Path Resolution
**Problem:** All interface lookups fail
**Example:** `Magento\Customer\Api\CustomerRepositoryInterface` not found at correct path
**Fix:** Debug path construction in validator script

### Issue 2: Database Schema Parsing
**Problem:** EAV tables in db_schema.xml not detected
**Example:** `customer_entity_datetime` exists but marked "not found"
**Fix:** Add XML schema parser to complement code search

### Issue 3: HTML Claim Extraction
**Problem:** Parser extracts prose words as method names
**Example:** "Service Contracts" → extracts "ontracts" as method
**Fix:** Only extract from semantic code contexts (`<code>`, `<pre>`, specific classes)

### Issue 4: Claim Categorization
**Problem:** Same items marked as both events and tables
**Example:** `customer_login` searched as both event (correct) and table (incorrect)
**Fix:** Use naming patterns to categorize before validation

---

## Testing Checklist for Documentation Updates

After making corrections:

- [ ] Search for "customer_delete" - should return 0 results or only warning notes
- [ ] Search for "customer_save_before" - should return 0 results
- [ ] Verify "customer_save_after" and "customer_save_after_data_object" are documented
- [ ] Check all code examples use actual existing events
- [ ] Validate event names against `/etc/events.xml` files
- [ ] Cross-reference method names with actual interface files
- [ ] Review HTML structure for proper semantic markup
- [ ] Re-run validation tool (after tool fixes) to confirm >90% accuracy

---

## Summary of Changes Required

### Must Fix (3 items)
1. Remove `customer_delete_after` event reference
2. Remove `customer_delete_before` event reference
3. Remove `customer_save_before` event reference

### Optional Improvements
4. Add warning notes explaining why delete events don't exist
5. Document correct save events with examples
6. Improve HTML structure for better parser compatibility
7. Add semantic classes to code references

### Validation Tool Issues (not doc changes)
- Fix interface path resolution
- Add db_schema.xml parsing
- Improve HTML claim extraction
- Fix categorization logic

---

## Contact Information

**Documentation Owner:** [TBD]
**Technical Reviewer:** [TBD]
**Validation Tool Owner:** [TBD]

---

**Report Generated:** 2025-01-07 by Claude Opus 4.5
**Status:** Ready for implementation
**Estimated Effort:** 30-60 minutes for confirmed fixes

# Magento Documentation Validation Tools

## Overview

This directory contains Python tools for validating Magento 2 documentation against actual core source code.

## Tools

### 1. extract_claims.py

Parses HTML documentation files and extracts technical claims into structured YAML format.

**Usage:**
```bash
python3 extract_claims.py <html_file> [output_yaml]
```

**Example:**
```bash
python3 extract_claims.py /path/to/architecture.html architecture_claims.yaml
```

**Extracts:**
- PHP class names (e.g., `Magento\Customer\Model\Customer`)
- Interface names (e.g., `Magento\Customer\Api\CustomerRepositoryInterface`)
- Method names (e.g., `save`, `getById`, `delete`)
- Event names (e.g., `customer_save_after`, `customer_login`)
- Database table names (e.g., `customer_entity`, `customer_address_entity`)
- ACL resource identifiers (e.g., `Magento_Customer::manage`)
- Configuration paths (e.g., `customer/account/password_reset`)
- File paths (e.g., `etc/di.xml`, `Model/Customer.php`)

**Output Format:**
```yaml
source_document: /path/to/file.html
extracted_at: '2025-01-07'
claims:
  php_classes: [...]
  php_interfaces: [...]
  methods: [...]
  events: [...]
  database_tables: [...]
  acl_resources: [...]
  config_paths: [...]
  file_paths: [...]
validation_status:
  validated: false
  validation_date: null
  validator: null
```

### 2. validate_claims.py

Validates extracted claims against Magento 2 core source code.

**Usage:**
```bash
python3 validate_claims.py <claims_yaml> <magento_root> [output_yaml]
```

**Example:**
```bash
python3 validate_claims.py architecture_claims.yaml /path/to/magento-core architecture_validation.yaml
```

**Validation Methods:**

- **PHP Classes/Interfaces**: Checks if file exists at expected path and contains class definition
- **Methods**: Searches for method definitions across core files
- **Events**: Searches for event references in XML config files and PHP dispatches
- **Database Tables**: Searches for table references in schema and code files
- **ACL Resources**: Searches for ACL definitions in XML files

**Output Format:**
```yaml
source_document: /path/to/original/file.html
validation_date: '2025-01-07'
magento_root: /path/to/magento-core
summary:
  total_claims: 80
  validated: 80
  found: 45
  not_found: 35
  confidence_distribution:
    high: 30
    medium: 50
    low: 0
results_by_type:
  events:
    total: 3
    found: 3
    not_found: 0
    results:
      - claim: customer_save_after
        found: true
        confidence: high
        evidence:
          - /path/to/file.xml:123
          - /path/to/file.php:456
        notes: Found 2 references
```

**Confidence Levels:**
- **High**: Direct file path validation or definitive pattern match
- **Medium**: Pattern search with potential false positives
- **Low**: Ambiguous or uncertain validation

## Requirements

- Python 3.7+
- PyYAML library (`pip install pyyaml`)
- grep or ripgrep available in PATH
- Access to Magento 2 core source code

## Installation

```bash
# Install dependencies
pip install pyyaml

# Make scripts executable
chmod +x extract_claims.py validate_claims.py
```

## Workflow

### Complete Validation Workflow

```bash
# 1. Extract claims from documentation
python3 extract_claims.py docs/architecture.html claims/architecture_claims.yaml

# 2. Validate against Magento core
python3 validate_claims.py claims/architecture_claims.yaml /path/to/magento-core claims/architecture_validation.yaml

# 3. Review validation results
cat claims/architecture_validation.yaml
```

### Batch Processing

```bash
# Extract claims from all HTML files
for file in docs/**/*.html; do
    output="claims/$(basename ${file%.html}_claims.yaml)"
    python3 extract_claims.py "$file" "$output"
done

# Validate all claims files
for file in claims/*_claims.yaml; do
    output="${file%_claims.yaml}_validation.yaml"
    python3 validate_claims.py "$file" /path/to/magento-core "$output"
done
```

## Example Output

### Extraction Example
```
Extracting claims from architecture.html...

Extraction complete!
Output: architecture_claims.yaml

Claims Summary:
  Classes: 3
  Interfaces: 5
  Methods: 30
  Events: 19
  Tables: 19
  ACL Resources: 4
  Config Paths: 1
  File Paths: 1
```

### Validation Example
```
Validating claims from architecture_claims.yaml...
Magento root: /home/carl/Documents/magento-core

Validation complete!
Output: architecture_validation.yaml

Summary:
  Total claims validated: 80
  Found: 45 (56.3%)
  Not found: 35 (43.7%)

Confidence Distribution:
  High: 30
  Medium: 50
  Low: 0

Results by Type:
  php_classes: 3/3 (100.0%)
  php_interfaces: 5/5 (100.0%)
  methods: 25/30 (83.3%)
  events: 19/19 (100.0%)
  database_tables: 15/19 (78.9%)
  acl_resources: 4/4 (100.0%)
```

## Limitations

### Current Limitations

1. **Pattern Matching**: May produce false positives for common method names
2. **Incomplete Magento Core**: Validation accuracy depends on having complete Magento source
3. **Version Matching**: Tools don't currently check version compatibility
4. **Context-Free Extraction**: Extracts claims without understanding context (may include unrelated matches)

### Known Issues

- Method extraction may capture JavaScript method names from HTML
- Event names may include database table names if they follow similar naming patterns
- File paths must use standard Magento module structure

## Future Enhancements

- [ ] Add version-specific validation
- [ ] Improve extraction accuracy with HTML structure awareness
- [ ] Add configuration option filtering
- [ ] Support for GraphQL schema validation
- [ ] Integration with CI/CD pipelines
- [ ] HTML report generation
- [ ] Diff mode for comparing documentation versions

## Support

For issues or questions, refer to the main validation project documentation:
- `/home/carl/Documents/the-core/validation/README.md`
- `/home/carl/Documents/the-core/validation/VALIDATION_WORKFLOW.md`

#!/usr/bin/env python3
r"""
Documentation Claims Extractor
Parses HTML documentation files and extracts technical claims for validation.

Extracts:
- PHP class names (Magento\Module\Class\Name)
- Interface names (ends with Interface)
- Repository implementations
- Method signatures
- Event names (snake_case event dispatches)
- Database table names
- Configuration paths
- ACL resource identifiers
"""

import re
import sys
import yaml
from pathlib import Path
from html.parser import HTMLParser
from typing import List, Dict, Set, Any


class ClaimExtractor(HTMLParser):
    """HTML parser that extracts Magento technical claims"""

    def __init__(self):
        super().__init__()
        self.claims = {
            'classes': set(),
            'interfaces': set(),
            'methods': set(),
            'events': set(),
            'tables': set(),
            'acl_resources': set(),
            'config_paths': set(),
            'file_paths': set(),
        }
        self.current_data = ""
        self.in_code = False

    def handle_starttag(self, tag, attrs):
        if tag == 'code' or tag == 'pre':
            self.in_code = True

    def handle_endtag(self, tag):
        if tag == 'code' or tag == 'pre':
            self.in_code = False
            self._extract_from_buffer()
            self.current_data = ""

    def handle_data(self, data):
        if self.in_code or 'Magento\\' in data:
            self.current_data += data
        else:
            self._extract_from_buffer()
            self.current_data = data
            self._extract_from_buffer()
            self.current_data = ""

    def _extract_from_buffer(self):
        """Extract claims from current data buffer"""
        if not self.current_data:
            return

        text = self.current_data

        # Extract PHP class/interface names (Magento\Module\Path\ClassName)
        class_pattern = r'Magento\\[A-Za-z0-9\\]+[A-Za-z0-9]+'
        for match in re.finditer(class_pattern, text):
            classname = match.group(0)
            if 'Interface' in classname:
                self.claims['interfaces'].add(classname)
            else:
                self.claims['classes'].add(classname)

        # Extract method signatures (methodName(...): ReturnType or methodName(...))
        method_pattern = r'([a-z][a-zA-Z0-9_]*)\s*\([^)]*\)(?:\s*:\s*[A-Za-z\\]+)?'
        for match in re.finditer(method_pattern, text):
            method = match.group(1)
            if len(method) > 2 and method not in ['function', 'public', 'private', 'protected']:
                self.claims['methods'].add(method)

        # Extract event names (lowercase_with_underscores)
        event_pattern = r'\b([a-z]+_[a-z_]+)\b'
        for match in re.finditer(event_pattern, text):
            event = match.group(1)
            # Filter common words that match pattern
            if (event.count('_') >= 1 and
                event not in ['the_core', 'full_page', 'per_website', 'primary_key'] and
                any(keyword in event for keyword in ['save', 'delete', 'load', 'login', 'logout', 'customer', 'before', 'after'])):
                self.claims['events'].add(event)

        # Extract database table names
        table_pattern = r'\b(customer_[a-z_]+|eav_[a-z_]+|sales_[a-z_]+|quote_[a-z_]+)\b'
        for match in re.finditer(table_pattern, text):
            self.claims['tables'].add(match.group(1))

        # Extract ACL resource identifiers (Magento_Module::resource)
        acl_pattern = r'Magento_[A-Za-z]+::[a-z_]+'
        for match in re.finditer(acl_pattern, text):
            self.claims['acl_resources'].add(match.group(0))

        # Extract config paths (section/group/field)
        config_pattern = r'\b([a-z]+/[a-z_]+(?:/[a-z_]+)?)\b'
        for match in re.finditer(config_pattern, text):
            path = match.group(1)
            if path.count('/') >= 1 and not path.startswith('http'):
                self.claims['config_paths'].add(path)

        # Extract file paths (etc/di.xml, etc/events.xml, Model/Customer.php)
        file_pattern = r'(?:etc|Model|Block|Controller|Helper|Observer|Plugin)/[A-Za-z0-9_/]+\.(?:xml|php)'
        for match in re.finditer(file_pattern, text):
            self.claims['file_paths'].add(match.group(0))


def extract_claims_from_html(html_path: Path) -> Dict[str, Set[str]]:
    """Extract all technical claims from an HTML documentation file"""

    with open(html_path, 'r', encoding='utf-8') as f:
        content = f.read()

    parser = ClaimExtractor()
    parser.feed(content)

    return parser.claims


def format_claims_for_validation(claims: Dict[str, Set[str]], source_file: Path) -> Dict[str, Any]:
    """Format extracted claims into validation-ready structure"""

    return {
        'source_document': str(source_file),
        'extracted_at': '2025-01-07',
        'claims': {
            'php_classes': sorted(list(claims['classes'])),
            'php_interfaces': sorted(list(claims['interfaces'])),
            'methods': sorted(list(claims['methods'])),
            'events': sorted(list(claims['events'])),
            'database_tables': sorted(list(claims['tables'])),
            'acl_resources': sorted(list(claims['acl_resources'])),
            'config_paths': sorted(list(claims['config_paths'])),
            'file_paths': sorted(list(claims['file_paths'])),
        },
        'validation_status': {
            'validated': False,
            'validation_date': None,
            'validator': None,
        }
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: extract_claims.py <html_file> [output_yaml]")
        print("Example: extract_claims.py architecture.html architecture_claims.yaml")
        sys.exit(1)

    html_file = Path(sys.argv[1])

    if not html_file.exists():
        print(f"Error: File not found: {html_file}")
        sys.exit(1)

    # Extract claims
    print(f"Extracting claims from {html_file}...")
    claims = extract_claims_from_html(html_file)

    # Format for output
    validation_data = format_claims_for_validation(claims, html_file)

    # Determine output file
    if len(sys.argv) >= 3:
        output_file = Path(sys.argv[2])
    else:
        output_file = html_file.parent / f"{html_file.stem}_claims.yaml"

    # Write YAML
    with open(output_file, 'w', encoding='utf-8') as f:
        yaml.dump(validation_data, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    # Print summary
    print(f"\nExtraction complete!")
    print(f"Output: {output_file}")
    print(f"\nClaims Summary:")
    print(f"  Classes: {len(validation_data['claims']['php_classes'])}")
    print(f"  Interfaces: {len(validation_data['claims']['php_interfaces'])}")
    print(f"  Methods: {len(validation_data['claims']['methods'])}")
    print(f"  Events: {len(validation_data['claims']['events'])}")
    print(f"  Tables: {len(validation_data['claims']['database_tables'])}")
    print(f"  ACL Resources: {len(validation_data['claims']['acl_resources'])}")
    print(f"  Config Paths: {len(validation_data['claims']['config_paths'])}")
    print(f"  File Paths: {len(validation_data['claims']['file_paths'])}")


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""
Magento Core Validation Checker
Validates documentation claims against actual Magento 2 core source code.

Searches the Magento core installation to verify:
- PHP classes and interfaces exist
- Methods are defined in expected classes
- Events are dispatched
- Database tables are referenced
- Configuration paths are defined
"""

import os
import sys
import yaml
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass, field


@dataclass
class ValidationResult:
    """Result of validating a single claim"""
    claim: str
    claim_type: str
    found: bool
    confidence: str  # high, medium, low
    evidence: List[str] = field(default_factory=list)
    notes: str = ""


class MagentoValidator:
    """Validates claims against Magento core source"""

    def __init__(self, magento_root: Path):
        self.magento_root = magento_root

        # Support both Magento and Mage-OS vendor paths
        possible_paths = [
            magento_root / "vendor" / "magento",
            magento_root / "vendor" / "mage-os",
            magento_root,  # Direct path to vendor dir
        ]

        self.vendor_path = None
        for path in possible_paths:
            if path.exists() and (path / "module-customer").exists():
                self.vendor_path = path
                break

        if not self.vendor_path:
            raise FileNotFoundError(f"Magento/Mage-OS vendor path not found. Tried: {possible_paths}")

    def _search_in_files(self, pattern: str, module_dir: Path = None, file_pattern: str = "*.php") -> List[Tuple[Path, int]]:
        """Search for pattern in files using ripgrep or grep"""

        search_path = module_dir if module_dir else self.vendor_path

        try:
            # Try ripgrep first (faster)
            result = subprocess.run(
                ['rg', '-n', '--type', 'php' if file_pattern == '*.php' else 'xml', pattern, str(search_path)],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                return self._parse_search_output(result.stdout)
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        # Fallback to grep
        try:
            cmd = ['grep', '-rn', pattern, str(search_path), '--include', file_pattern]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return self._parse_search_output(result.stdout)
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass

        return []

    def _parse_search_output(self, output: str) -> List[Tuple[Path, int]]:
        """Parse grep/rg output into (file_path, line_number) tuples"""
        results = []
        for line in output.strip().split('\n'):
            if not line:
                continue
            parts = line.split(':', 2)
            if len(parts) >= 2:
                try:
                    results.append((Path(parts[0]), int(parts[1])))
                except (ValueError, IndexError):
                    continue
        return results

    def validate_class(self, class_name: str) -> ValidationResult:
        """Validate a PHP class exists"""

        # Convert Magento\Customer\Model\Customer to module-customer/Model/Customer.php
        parts = class_name.replace('Magento\\', '').split('\\')

        if len(parts) < 2:
            return ValidationResult(
                claim=class_name,
                claim_type='class',
                found=False,
                confidence='low',
                notes='Invalid class name format'
            )

        module_name = 'module-' + parts[0].lower()
        file_path = '/'.join(parts[1:]) + '.php'

        # Check if file exists
        expected_path = self.vendor_path / module_name / file_path

        if expected_path.exists():
            # Verify class definition in file
            with open(expected_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
                class_def_pattern = f"class {parts[-1]}"
                if class_def_pattern in content:
                    return ValidationResult(
                        claim=class_name,
                        claim_type='class',
                        found=True,
                        confidence='high',
                        evidence=[f"{expected_path}:1"],
                        notes='Class file exists and contains class definition'
                    )

        # Fallback: search for class definition
        search_results = self._search_in_files(f"class {parts[-1]}")

        if search_results:
            return ValidationResult(
                claim=class_name,
                claim_type='class',
                found=True,
                confidence='medium',
                evidence=[f"{r[0]}:{r[1]}" for r in search_results[:3]],
                notes='Found via pattern search'
            )

        return ValidationResult(
            claim=class_name,
            claim_type='class',
            found=False,
            confidence='high',
            notes=f'Expected path {expected_path} does not exist'
        )

    def validate_interface(self, interface_name: str) -> ValidationResult:
        """Validate a PHP interface exists"""
        return self.validate_class(interface_name)  # Same logic for now

    def validate_method(self, method_name: str) -> ValidationResult:
        """Validate a method exists in Magento core"""

        # Search for method definitions
        search_results = self._search_in_files(f"function {method_name}")

        if search_results:
            return ValidationResult(
                claim=method_name,
                claim_type='method',
                found=True,
                confidence='medium',
                evidence=[f"{r[0]}:{r[1]}" for r in search_results[:5]],
                notes=f'Found {len(search_results)} occurrences'
            )

        return ValidationResult(
            claim=method_name,
            claim_type='method',
            found=False,
            confidence='medium',
            notes='Method not found in core'
        )

    def validate_event(self, event_name: str) -> ValidationResult:
        """Validate an event is dispatched in Magento core"""

        # Search for event dispatch calls (search in both PHP and XML)
        search_results = self._search_in_files(event_name, file_pattern="*.xml")

        if not search_results:
            # Also search in PHP files for dispatches
            search_results = self._search_in_files(event_name, file_pattern="*.php")

        if search_results:
            return ValidationResult(
                claim=event_name,
                claim_type='event',
                found=True,
                confidence='high',
                evidence=[f"{r[0]}:{r[1]}" for r in search_results[:5]],
                notes=f'Found {len(search_results)} references'
            )

        return ValidationResult(
            claim=event_name,
            claim_type='event',
            found=False,
            confidence='high',
            notes='Event not found in core'
        )

    def validate_table(self, table_name: str) -> ValidationResult:
        """Validate a database table is referenced in Magento core"""

        # Search in XML files (db_schema.xml) and PHP files
        search_results = self._search_in_files(table_name)

        if search_results:
            return ValidationResult(
                claim=table_name,
                claim_type='table',
                found=True,
                confidence='high',
                evidence=[f"{r[0]}:{r[1]}" for r in search_results[:3]],
                notes=f'Found {len(search_results)} references'
            )

        return ValidationResult(
            claim=table_name,
            claim_type='table',
            found=False,
            confidence='medium',
            notes='Table not found in core'
        )

    def validate_acl_resource(self, resource_id: str) -> ValidationResult:
        """Validate ACL resource is defined"""

        search_results = self._search_in_files(resource_id, file_pattern="*.xml")

        if search_results:
            return ValidationResult(
                claim=resource_id,
                claim_type='acl_resource',
                found=True,
                confidence='high',
                evidence=[f"{r[0]}:{r[1]}" for r in search_results[:3]],
                notes=f'Found {len(search_results)} references'
            )

        return ValidationResult(
            claim=resource_id,
            claim_type='acl_resource',
            found=False,
            confidence='medium',
            notes='ACL resource not found'
        )


def validate_claims_file(claims_yaml: Path, magento_root: Path) -> Dict[str, Any]:
    """Validate all claims from a YAML file"""

    with open(claims_yaml, 'r', encoding='utf-8') as f:
        claims_data = yaml.safe_load(f)

    validator = MagentoValidator(magento_root)
    results = {
        'source_document': claims_data['source_document'],
        'validation_date': '2025-01-07',
        'magento_root': str(magento_root),
        'summary': {
            'total_claims': 0,
            'validated': 0,
            'found': 0,
            'not_found': 0,
            'confidence_distribution': {'high': 0, 'medium': 0, 'low': 0}
        },
        'results_by_type': {},
        'detailed_results': []
    }

    claims = claims_data.get('claims', {})

    # Validate each claim type
    for claim_type, claim_list in claims.items():
        if not claim_list:
            continue

        type_results = []

        for claim in claim_list:
            if claim_type == 'php_classes':
                result = validator.validate_class(claim)
            elif claim_type == 'php_interfaces':
                result = validator.validate_interface(claim)
            elif claim_type == 'methods':
                result = validator.validate_method(claim)
            elif claim_type == 'events':
                result = validator.validate_event(claim)
            elif claim_type == 'database_tables':
                result = validator.validate_table(claim)
            elif claim_type == 'acl_resources':
                result = validator.validate_acl_resource(claim)
            else:
                # Skip config_paths and file_paths for now
                continue

            type_results.append({
                'claim': result.claim,
                'found': result.found,
                'confidence': result.confidence,
                'evidence': result.evidence,
                'notes': result.notes
            })

            results['summary']['total_claims'] += 1
            results['summary']['validated'] += 1

            if result.found:
                results['summary']['found'] += 1
            else:
                results['summary']['not_found'] += 1

            results['summary']['confidence_distribution'][result.confidence] += 1

        results['results_by_type'][claim_type] = {
            'total': len(type_results),
            'found': sum(1 for r in type_results if r['found']),
            'not_found': sum(1 for r in type_results if not r['found']),
            'results': type_results
        }

    return results


def main():
    if len(sys.argv) < 3:
        print("Usage: validate_claims.py <claims_yaml> <magento_root> [output_yaml]")
        print("Example: validate_claims.py architecture_claims.yaml /path/to/magento validation_results.yaml")
        sys.exit(1)

    claims_file = Path(sys.argv[1])
    magento_root = Path(sys.argv[2])

    if not claims_file.exists():
        print(f"Error: Claims file not found: {claims_file}")
        sys.exit(1)

    if not magento_root.exists():
        print(f"Error: Magento root not found: {magento_root}")
        sys.exit(1)

    print(f"Validating claims from {claims_file}...")
    print(f"Magento root: {magento_root}")
    print()

    try:
        results = validate_claims_file(claims_file, magento_root)
    except Exception as e:
        print(f"Error during validation: {e}")
        sys.exit(1)

    # Determine output file
    if len(sys.argv) >= 4:
        output_file = Path(sys.argv[3])
    else:
        output_file = claims_file.parent / f"{claims_file.stem}_validation.yaml"

    # Write results
    with open(output_file, 'w', encoding='utf-8') as f:
        yaml.dump(results, f, default_flow_style=False, sort_keys=False, allow_unicode=True)

    # Print summary
    print(f"Validation complete!")
    print(f"Output: {output_file}")
    print()
    print("Summary:")
    print(f"  Total claims validated: {results['summary']['total_claims']}")
    print(f"  Found: {results['summary']['found']} ({results['summary']['found']/max(results['summary']['total_claims'], 1)*100:.1f}%)")
    print(f"  Not found: {results['summary']['not_found']} ({results['summary']['not_found']/max(results['summary']['total_claims'], 1)*100:.1f}%)")
    print()
    print("Confidence Distribution:")
    print(f"  High: {results['summary']['confidence_distribution']['high']}")
    print(f"  Medium: {results['summary']['confidence_distribution']['medium']}")
    print(f"  Low: {results['summary']['confidence_distribution']['low']}")
    print()
    print("Results by Type:")
    for claim_type, type_data in results['results_by_type'].items():
        found_pct = type_data['found'] / max(type_data['total'], 1) * 100
        print(f"  {claim_type}: {type_data['found']}/{type_data['total']} ({found_pct:.1f}%)")


if __name__ == '__main__':
    main()

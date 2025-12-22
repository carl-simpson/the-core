#!/usr/bin/env python3
"""
Fix Bauhaus styling across Magento documentation HTML files.
Removes rounded corners, hexagon patterns, and fixes header styling.
"""

import re
import sys
from pathlib import Path

FILES_TO_FIX = [
    "docs/modules/Magento_Customer/html/annotated-code.html",
    "docs/modules/Magento_Customer/html/anti-patterns.html",
    "docs/modules/Magento_Customer/html/performance-optimization.html",
    "docs/modules/Magento_Sales/html/execution-flows.html",
    "docs/modules/Magento_Sales/html/known-issues.html",
    "docs/modules/Magento_Sales/html/plugins-observers.html",
]

def fix_file(filepath: Path):
    """Fix Bauhaus styling issues in a single HTML file."""
    print(f"Fixing {filepath.name}...")

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Backup original
    backup_path = filepath.with_suffix('.html.backup')
    with open(backup_path, 'w', encoding='utf-8') as f:
        f.write(content)

    # Fix 1: Remove all border-radius from CSS
    content = re.sub(r'border-radius:\s*[^;]+;', '', content)

    # Fix 2: Remove rx attributes from SVG
    content = re.sub(r'\s*rx="[^"]*"', '', content)

    # Fix 2a: Remove orphaned -lg, -md, -sm artifacts from rounded class removal
    content = re.sub(r'\s+-(?:xs|sm|md|lg|xl|2xl|3xl|full)\b', '', content)

    # Fix 3: Remove hexagon SVG pattern (multi-line)
    content = re.sub(
        r'<svg class="hero-pattern".*?</svg>',
        '',
        content,
        flags=re.DOTALL
    )

    # Fix 4: Remove repeating-linear-gradient patterns
    content = re.sub(
        r'background-image:\s*repeating-linear-gradient[^;]+;',
        '',
        content
    )

    # Fix 5: Replace hero header class
    # Old: class="hero"  with gradient and patterns
    # New: bg-gradient-to-br from-magento-charcoal via-magento-charcoal to-gray-800 border-b-8 border-magento-orange

    # Fix hero section background (CSS)
    content = re.sub(
        r'\.hero\s*\{[^}]*background:[^;]*;[^}]*\}',
        '',
        content,
        flags=re.DOTALL
    )

    # Fix 6: Replace .hero::before patterns
    content = re.sub(
        r'\.hero::before\s*\{[^}]*\}',
        '',
        content,
        flags=re.DOTALL
    )

    # Fix 7: Replace Font (Google Fonts to Inter Tight)
    content = re.sub(
        r'family=Inter:[^&"]+',
        'family=Inter+Tight:wght@400;500;600;700',
        content
    )

    # Fix 8: Update Tailwind font config
    content = re.sub(
        r"sans:\s*\['Inter'",
        "sans: ['Inter Tight'",
        content
    )

    # Fix 9: Fix magento-offwhite naming consistency
    content = re.sub(
        r"'magento-off-white':\s*'#FAFAFA'",
        "'magento-offwhite': '#FAFAFA'",
        content
    )

    # Fix 9a: Add Tailwind config for files using Tailwind CDN without config
    if 'tailwindcss.com' in content and 'tailwind.config' not in content:
        tailwind_config = '''  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            'magento-orange': '#F26423',
            'magento-yellow': '#F1BC1B',
            'magento-charcoal': '#2C2C2C',
            'magento-offwhite': '#FAFAFA',
          },
          fontFamily: {
            sans: ['Inter Tight', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
            mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
          },
        }
      }
    }
  </script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap');

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }
  </style>'''

        # Insert after Tailwind CDN script
        content = re.sub(
            r'(<script src="https://cdn\.tailwindcss\.com"></script>)',
            r'\1\n' + tailwind_config,
            content
        )

    # Fix 10: For files using inline CSS with .hero class
    # We need to remove the .hero CSS and change HTML to use Tailwind classes

    # Remove .hero CSS definition
    content = re.sub(
        r'\.hero\s*\{[^}]*\}',
        '',
        content,
        flags=re.DOTALL
    )

    # Fix header/section tags - change class="hero" to Tailwind classes
    bauhaus_header_class = 'bg-gradient-to-br from-magento-charcoal via-magento-charcoal to-gray-800 border-b-8 border-magento-orange'

    content = re.sub(
        r'<header\s+class="hero">',
        f'<header class="{bauhaus_header_class}">',
        content
    )

    content = re.sub(
        r'<section\s+class="hero">',
        f'<header class="{bauhaus_header_class}">',
        content
    )

    # Fix closing tags
    content = re.sub(
        r'</section>\s*\n\s*<!-- Breadcrumb',
        '</header>\n\n  <!-- Breadcrumb',
        content
    )

    # Save fixed content
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

    print(f"  ✓ Fixed {filepath.name} (backup: {backup_path.name})")


def main():
    root = Path(__file__).parent.parent

    for file_path in FILES_TO_FIX:
        full_path = root / file_path
        if full_path.exists():
            fix_file(full_path)
        else:
            print(f"  ✗ File not found: {full_path}")

    print("\n✓ All files processed!")


if __name__ == "__main__":
    main()

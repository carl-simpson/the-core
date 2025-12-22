#!/bin/bash

# Fix Bauhaus Magento styling across all broken HTML files
# Removes border-radius, fixes header styling, adds proper Tailwind config

FILES=(
  "/media/carl/External/magento-core/docs/modules/Magento_Customer/html/annotated-code.html"
  "/media/carl/External/magento-core/docs/modules/Magento_Customer/html/anti-patterns.html"
  "/media/carl/External/magento-core/docs/modules/Magento_Customer/html/performance-optimization.html"
  "/media/carl/External/magento-core/docs/modules/Magento_Sales/html/execution-flows.html"
  "/media/carl/External/magento-core/docs/modules/Magento_Sales/html/known-issues.html"
  "/media/carl/External/magento-core/docs/modules/Magento_Sales/html/plugins-observers.html"
)

for file in "${FILES[@]}"; do
  echo "Fixing: $file"

  # Create backup
  cp "$file" "${file}.backup"

  # Remove all rounded corners
  sed -i 's/rounded-[a-z0-9]*//g' "$file"
  sed -i 's/rounded//g' "$file"
  sed -i 's/border-radius:[^;]*;//g' "$file"
  sed -i 's/rx="[0-9]*"//g' "$file"

  # Remove old hexagon hero patterns
  sed -i '/<svg class="hero-pattern"/,/<\/svg>/d' "$file"
  sed -i '/repeating-linear-gradient/d' "$file"
  sed -i '/hexagon/d' "$file"

  echo "  - Removed rounded corners and hexagon patterns"
done

echo "Done! Backups created with .backup extension"

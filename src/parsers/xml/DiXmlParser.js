import { XMLParser } from 'fast-xml-parser';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Parse Magento di.xml files to extract DI configuration
 *
 * Extracts:
 * - Preferences (interface -> implementation mappings)
 * - Plugins (before/after/around interceptors)
 * - Virtual Types (configuration-based class variants)
 * - Type configurations (constructor arguments)
 */
export class DiXmlParser {
  constructor(options = {}) {
    this.options = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      ...options
    };

    this.parser = new XMLParser(this.options);
    this.results = {
      preferences: [],
      plugins: [],
      virtualTypes: [],
      typeConfigs: []
    };
  }

  /**
   * Parse a single di.xml file
   */
  parseFile(filePath) {
    if (!existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return null;
    }

    try {
      const xmlContent = readFileSync(filePath, 'utf-8');
      const parsed = this.parser.parse(xmlContent);

      if (!parsed.config) {
        console.warn(`⚠️  No config node in: ${filePath}`);
        return null;
      }

      return this.extractDiConfig(parsed.config, filePath);
    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Parse all di.xml files for a module (global + area-specific)
   */
  parseModule(modulePath) {
    const etcPath = join(modulePath, 'etc');

    if (!existsSync(etcPath)) {
      throw new Error(`Module etc/ directory not found: ${etcPath}`);
    }

    // Parse global di.xml
    const globalDiXml = join(etcPath, 'di.xml');
    if (existsSync(globalDiXml)) {
      console.log(`📄 Parsing global di.xml...`);
      this.parseFile(globalDiXml);
    }

    // Parse area-specific di.xml (frontend, adminhtml, webapi_rest, graphql)
    const areas = ['frontend', 'adminhtml', 'webapi_rest', 'webapi_soap', 'graphql', 'crontab'];

    for (const area of areas) {
      const areaDiXml = join(etcPath, area, 'di.xml');
      if (existsSync(areaDiXml)) {
        console.log(`📄 Parsing ${area}/di.xml...`);
        const areaResults = this.parseFile(areaDiXml);
        if (areaResults) {
          // Tag area-specific config
          this.tagArea(areaResults, area);
        }
      }
    }

    return this.results;
  }

  /**
   * Extract DI configuration from parsed XML
   */
  extractDiConfig(config, filePath) {
    const results = {
      preferences: [],
      plugins: [],
      virtualTypes: [],
      typeConfigs: []
    };

    // Extract preferences
    if (config.preference) {
      const preferences = Array.isArray(config.preference)
        ? config.preference
        : [config.preference];

      for (const pref of preferences) {
        if (pref['@_for'] && pref['@_type']) {
          results.preferences.push({
            interface: pref['@_for'],
            implementation: pref['@_type'],
            source: filePath
          });
        }
      }
    }

    // Extract types (for plugins and constructor args)
    if (config.type) {
      const types = Array.isArray(config.type)
        ? config.type
        : [config.type];

      for (const type of types) {
        const typeName = type['@_name'];

        // Extract plugins
        if (type.plugin) {
          const plugins = Array.isArray(type.plugin)
            ? type.plugin
            : [type.plugin];

          for (const plugin of plugins) {
            results.plugins.push({
              targetClass: typeName,
              pluginName: plugin['@_name'],
              pluginType: plugin['@_type'],
              method: plugin['@_method'] || null,
              sortOrder: parseInt(plugin['@_sortOrder'] || '10'),
              disabled: plugin['@_disabled'] === 'true',
              source: filePath
            });
          }
        }

        // Extract type configuration (constructor arguments)
        if (type.arguments) {
          results.typeConfigs.push({
            className: typeName,
            arguments: this.extractArguments(type.arguments),
            source: filePath
          });
        }
      }
    }

    // Extract virtual types
    if (config.virtualType) {
      const virtualTypes = Array.isArray(config.virtualType)
        ? config.virtualType
        : [config.virtualType];

      for (const vt of virtualTypes) {
        results.virtualTypes.push({
          name: vt['@_name'],
          type: vt['@_type'],
          arguments: vt.arguments ? this.extractArguments(vt.arguments) : {},
          source: filePath
        });
      }
    }

    // Merge into main results
    this.results.preferences.push(...results.preferences);
    this.results.plugins.push(...results.plugins);
    this.results.virtualTypes.push(...results.virtualTypes);
    this.results.typeConfigs.push(...results.typeConfigs);

    return results;
  }

  /**
   * Extract constructor arguments from <arguments> node
   */
  extractArguments(argsNode) {
    if (!argsNode.argument) return {};

    const args = Array.isArray(argsNode.argument)
      ? argsNode.argument
      : [argsNode.argument];

    const extracted = {};

    for (const arg of args) {
      const name = arg['@_name'];
      const xsiType = arg['@_xsi:type'];

      if (xsiType === 'object') {
        extracted[name] = {
          type: 'object',
          value: arg['#text'] || arg
        };
      } else if (xsiType === 'array') {
        extracted[name] = {
          type: 'array',
          value: this.extractArrayItems(arg)
        };
      } else {
        extracted[name] = {
          type: xsiType || 'string',
          value: arg['#text'] || arg
        };
      }
    }

    return extracted;
  }

  /**
   * Extract array items from argument
   */
  extractArrayItems(arrayArg) {
    if (!arrayArg.item) return [];

    const items = Array.isArray(arrayArg.item)
      ? arrayArg.item
      : [arrayArg.item];

    return items.map(item => ({
      name: item['@_name'],
      value: item['#text'] || item,
      type: item['@_xsi:type']
    }));
  }

  /**
   * Tag results with area
   */
  tagArea(results, area) {
    for (const pref of results.preferences) {
      pref.area = area;
    }
    for (const plugin of results.plugins) {
      plugin.area = area;
    }
    for (const vt of results.virtualTypes) {
      vt.area = area;
    }
    for (const tc of results.typeConfigs) {
      tc.area = area;
    }
  }

  /**
   * Get parsed results
   */
  getResults() {
    return this.results;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      preferences: this.results.preferences.length,
      plugins: this.results.plugins.length,
      virtualTypes: this.results.virtualTypes.length,
      typeConfigs: this.results.typeConfigs.length,
      total: this.results.preferences.length +
             this.results.plugins.length +
             this.results.virtualTypes.length +
             this.results.typeConfigs.length
    };
  }

  /**
   * Get plugins for a specific class/interface
   */
  getPluginsFor(className) {
    return this.results.plugins
      .filter(p => p.targetClass === className && !p.disabled)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  /**
   * Get preference for an interface
   */
  getPreferenceFor(interfaceName) {
    return this.results.preferences.find(p => p.interface === interfaceName);
  }
}

export default DiXmlParser;

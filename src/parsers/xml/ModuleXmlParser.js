import { XMLParser } from 'fast-xml-parser';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Parse Magento module.xml files to extract module metadata and dependencies
 *
 * Extracts:
 * - Module name
 * - Module version (setup_version)
 * - Module dependencies (sequence)
 */
export class ModuleXmlParser {
  constructor(options = {}) {
    this.options = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      ...options
    };

    this.parser = new XMLParser(this.options);
    this.results = {
      modules: []
    };
  }

  /**
   * Parse a single module.xml file
   */
  parseFile(filePath) {
    if (!existsSync(filePath)) {
      console.warn(`⚠️  File not found: ${filePath}`);
      return null;
    }

    try {
      const xmlContent = readFileSync(filePath, 'utf-8');
      const parsed = this.parser.parse(xmlContent);

      if (!parsed.config || !parsed.config.module) {
        console.warn(`⚠️  No config/module node in: ${filePath}`);
        return null;
      }

      return this.extractModuleConfig(parsed.config.module, filePath);
    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Parse module.xml for a module
   */
  parseModule(modulePath) {
    const moduleXmlPath = join(modulePath, 'etc', 'module.xml');

    if (!existsSync(moduleXmlPath)) {
      throw new Error(`module.xml not found: ${moduleXmlPath}`);
    }

    console.log(`📄 Parsing module.xml...`);
    return this.parseFile(moduleXmlPath);
  }

  /**
   * Extract module configuration from parsed XML
   */
  extractModuleConfig(moduleNode, filePath) {
    const result = {
      name: moduleNode['@_name'],
      version: moduleNode['@_setup_version'] || null,
      dependencies: [],
      source: filePath
    };

    // Extract sequence dependencies
    if (moduleNode.sequence && moduleNode.sequence.module) {
      const sequenceModules = Array.isArray(moduleNode.sequence.module)
        ? moduleNode.sequence.module
        : [moduleNode.sequence.module];

      for (const dep of sequenceModules) {
        result.dependencies.push({
          name: dep['@_name'],
          type: 'sequence' // soft dependency (load order)
        });
      }
    }

    this.results.modules.push(result);

    return result;
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
      modules: this.results.modules.length,
      totalDependencies: this.results.modules.reduce(
        (sum, m) => sum + m.dependencies.length,
        0
      )
    };
  }

  /**
   * Get dependencies for a module
   */
  getDependenciesFor(moduleName) {
    const module = this.results.modules.find(m => m.name === moduleName);
    return module ? module.dependencies : [];
  }

  /**
   * Get all module names
   */
  getModuleNames() {
    return this.results.modules.map(m => m.name);
  }
}

export default ModuleXmlParser;

import { XMLParser } from 'fast-xml-parser';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Parse Magento events.xml files to extract event/observer configuration
 *
 * Extracts:
 * - Events (dispatched events)
 * - Observers (classes listening to events)
 */
export class EventsXmlParser {
  constructor(options = {}) {
    this.options = {
      ignoreAttributes: false,
      attributeNamePrefix: '@_',
      textNodeName: '#text',
      ...options
    };

    this.parser = new XMLParser(this.options);
    this.results = {
      events: [],
      observers: []
    };
  }

  /**
   * Parse a single events.xml file
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

      return this.extractEventsConfig(parsed.config, filePath);
    } catch (error) {
      console.error(`❌ Error parsing ${filePath}:`, error.message);
      return null;
    }
  }

  /**
   * Parse all events.xml files for a module (global + area-specific)
   */
  parseModule(modulePath) {
    const etcPath = join(modulePath, 'etc');

    if (!existsSync(etcPath)) {
      throw new Error(`Module etc/ directory not found: ${etcPath}`);
    }

    // Parse global events.xml
    const globalEventsXml = join(etcPath, 'events.xml');
    if (existsSync(globalEventsXml)) {
      console.log(`📄 Parsing global events.xml...`);
      this.parseFile(globalEventsXml);
    }

    // Parse area-specific events.xml
    const areas = ['frontend', 'adminhtml', 'webapi_rest', 'webapi_soap', 'graphql', 'crontab'];

    for (const area of areas) {
      const areaEventsXml = join(etcPath, area, 'events.xml');
      if (existsSync(areaEventsXml)) {
        console.log(`📄 Parsing ${area}/events.xml...`);
        const areaResults = this.parseFile(areaEventsXml);
        if (areaResults) {
          this.tagArea(areaResults, area);
        }
      }
    }

    return this.results;
  }

  /**
   * Extract events configuration from parsed XML
   */
  extractEventsConfig(config, filePath) {
    const results = {
      events: [],
      observers: []
    };

    if (!config.event) {
      return results;
    }

    const events = Array.isArray(config.event)
      ? config.event
      : [config.event];

    for (const event of events) {
      const eventName = event['@_name'];

      if (!eventName) {
        continue;
      }

      // Add event
      results.events.push({
        name: eventName,
        source: filePath
      });

      // Extract observers
      if (event.observer) {
        const observers = Array.isArray(event.observer)
          ? event.observer
          : [event.observer];

        for (const observer of observers) {
          results.observers.push({
            eventName: eventName,
            observerName: observer['@_name'],
            observerClass: observer['@_instance'],
            method: observer['@_method'] || 'execute',
            disabled: observer['@_disabled'] === 'true',
            shared: observer['@_shared'] !== 'false', // default true
            source: filePath
          });
        }
      }
    }

    // Merge into main results
    this.results.events.push(...results.events);
    this.results.observers.push(...results.observers);

    return results;
  }

  /**
   * Tag results with area
   */
  tagArea(results, area) {
    for (const event of results.events) {
      event.area = area;
    }
    for (const observer of results.observers) {
      observer.area = area;
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
      events: this.results.events.length,
      observers: this.results.observers.length,
      total: this.results.events.length + this.results.observers.length
    };
  }

  /**
   * Get observers for a specific event
   */
  getObserversFor(eventName) {
    return this.results.observers
      .filter(o => o.eventName === eventName && !o.disabled);
  }

  /**
   * Get all unique event names
   */
  getEventNames() {
    return [...new Set(this.results.events.map(e => e.name))];
  }
}

export default EventsXmlParser;

import { Graph } from './Graph.js';

/**
 * Build a graph from parsed Magento configuration
 *
 * Combines DI, events, and module configuration into a unified graph
 */
export class GraphBuilder {
  constructor() {
    this.graph = new Graph();
  }

  /**
   * Build graph from parsed data
   *
   * @param {object} diResults - DiXmlParser results
   * @param {object} eventsResults - EventsXmlParser results
   * @param {object} moduleResults - ModuleXmlParser results
   */
  build(diResults, eventsResults, moduleResults) {
    // Add DI nodes and relationships
    this.addDiConfiguration(diResults);

    // Add event/observer nodes and relationships
    this.addEventsConfiguration(eventsResults);

    // Add module nodes and dependencies
    this.addModuleConfiguration(moduleResults);

    return this.graph;
  }

  /**
   * Add DI configuration to graph
   */
  addDiConfiguration(diResults) {
    if (!diResults) return;

    // Add preferences (interface -> implementation mappings)
    for (const pref of diResults.preferences || []) {
      // Add interface node
      this.graph.addNode('Interface', pref.interface, {
        name: pref.interface,
        area: pref.area || 'global'
      });

      // Add implementation class node
      this.graph.addNode('Class', pref.implementation, {
        name: pref.implementation,
        area: pref.area || 'global'
      });

      // Add PREFERS relationship
      this.graph.addEdge(
        pref.interface,
        pref.implementation,
        'PREFERS',
        {
          area: pref.area || 'global',
          source: pref.source
        }
      );
    }

    // Add plugins
    for (const plugin of diResults.plugins || []) {
      // Add target class/interface node
      this.graph.addNode('Class', plugin.targetClass, {
        name: plugin.targetClass
      });

      // Add plugin node
      const pluginId = `${plugin.targetClass}::${plugin.pluginName}`;
      this.graph.addNode('Plugin', pluginId, {
        name: plugin.pluginName,
        class: plugin.pluginType,
        method: plugin.method,
        sortOrder: plugin.sortOrder,
        disabled: plugin.disabled,
        area: plugin.area || 'global'
      });

      // Add INTERCEPTS relationship
      if (!plugin.disabled) {
        this.graph.addEdge(
          pluginId,
          plugin.targetClass,
          'INTERCEPTS',
          {
            sortOrder: plugin.sortOrder,
            method: plugin.method,
            area: plugin.area || 'global',
            source: plugin.source
          }
        );
      }
    }

    // Add virtual types
    for (const vt of diResults.virtualTypes || []) {
      this.graph.addNode('VirtualType', vt.name, {
        name: vt.name,
        baseType: vt.type,
        arguments: vt.arguments,
        area: vt.area || 'global'
      });

      // Link to base type
      this.graph.addEdge(
        vt.name,
        vt.type,
        'EXTENDS_VIRTUAL',
        {
          area: vt.area || 'global'
        }
      );
    }

    // Add type configurations (constructor injection)
    for (const tc of diResults.typeConfigs || []) {
      // Ensure class node exists
      this.graph.addNode('Class', tc.className, {
        name: tc.className
      });

      // Add INJECTS edges for each constructor argument
      for (const [argName, argData] of Object.entries(tc.arguments)) {
        if (argData.type === 'object' && argData.value) {
          // This is a dependency injection
          this.graph.addEdge(
            tc.className,
            argData.value,
            'INJECTS',
            {
              argumentName: argName,
              area: tc.area || 'global'
            }
          );
        }
      }
    }
  }

  /**
   * Add events configuration to graph
   */
  addEventsConfiguration(eventsResults) {
    if (!eventsResults) return;

    // Add event nodes
    for (const event of eventsResults.events || []) {
      this.graph.addNode('Event', event.name, {
        name: event.name,
        area: event.area || 'global'
      });
    }

    // Add observers
    for (const observer of eventsResults.observers || []) {
      // Add observer node
      const observerId = `${observer.eventName}::${observer.observerName}`;
      this.graph.addNode('Observer', observerId, {
        name: observer.observerName,
        class: observer.observerClass,
        method: observer.method,
        disabled: observer.disabled,
        area: observer.area || 'global'
      });

      // Add OBSERVES relationship
      if (!observer.disabled) {
        this.graph.addEdge(
          observerId,
          observer.eventName,
          'OBSERVES',
          {
            method: observer.method,
            area: observer.area || 'global',
            source: observer.source
          }
        );
      }
    }
  }

  /**
   * Add module configuration to graph
   */
  addModuleConfiguration(moduleResults) {
    if (!moduleResults) return;

    // Add module nodes
    for (const module of moduleResults.modules || []) {
      this.graph.addNode('Module', module.name, {
        name: module.name,
        version: module.version
      });

      // Add DEPENDS_ON relationships
      for (const dep of module.dependencies) {
        // Ensure dependency module node exists
        this.graph.addNode('Module', dep.name, {
          name: dep.name
        });

        this.graph.addEdge(
          module.name,
          dep.name,
          'DEPENDS_ON',
          {
            type: dep.type // 'sequence' or 'composer'
          }
        );
      }
    }
  }

  /**
   * Get the built graph
   */
  getGraph() {
    return this.graph;
  }
}

export default GraphBuilder;

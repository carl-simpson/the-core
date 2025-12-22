/**
 * In-memory graph data structure for Magento architecture
 *
 * Stores nodes (classes, interfaces, plugins, events, modules)
 * and relationships between them.
 */
export class Graph {
  constructor() {
    this.nodes = new Map();
    this.edges = [];
    this.metadata = {
      created: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Add a node to the graph
   *
   * @param {string} type - Node type (Interface, Class, Plugin, Observer, Event, Module)
   * @param {string} id - Unique identifier
   * @param {object} properties - Node properties
   */
  addNode(type, id, properties = {}) {
    if (this.nodes.has(id)) {
      // Merge properties if node exists
      const existing = this.nodes.get(id);
      this.nodes.set(id, {
        ...existing,
        properties: {
          ...existing.properties,
          ...properties
        }
      });
    } else {
      this.nodes.set(id, {
        type,
        id,
        properties
      });
    }

    return this;
  }

  /**
   * Add an edge (relationship) to the graph
   *
   * @param {string} from - Source node ID
   * @param {string} to - Target node ID
   * @param {string} type - Relationship type (PREFERS, PLUGINS, OBSERVES, etc.)
   * @param {object} properties - Edge properties
   */
  addEdge(from, to, type, properties = {}) {
    this.edges.push({
      from,
      to,
      type,
      properties
    });

    return this;
  }

  /**
   * Get a node by ID
   */
  getNode(id) {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes of a specific type
   */
  getNodesByType(type) {
    return Array.from(this.nodes.values())
      .filter(node => node.type === type);
  }

  /**
   * Get all edges from a node
   */
  getEdgesFrom(nodeId) {
    return this.edges.filter(edge => edge.from === nodeId);
  }

  /**
   * Get all edges to a node
   */
  getEdgesTo(nodeId) {
    return this.edges.filter(edge => edge.to === nodeId);
  }

  /**
   * Get all edges of a specific type
   */
  getEdgesByType(type) {
    return this.edges.filter(edge => edge.type === type);
  }

  /**
   * Find nodes by property
   */
  findNodes(predicate) {
    return Array.from(this.nodes.values()).filter(predicate);
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      metadata: this.metadata,
      nodes: Array.from(this.nodes.entries()).map(([id, node]) => ({
        id,
        ...node
      })),
      edges: this.edges
    };
  }

  /**
   * Load from JSON
   */
  static fromJSON(json) {
    const graph = new Graph();
    graph.metadata = json.metadata || graph.metadata;

    for (const node of json.nodes || []) {
      graph.addNode(node.type, node.id, node.properties);
    }

    for (const edge of json.edges || []) {
      graph.addEdge(edge.from, edge.to, edge.type, edge.properties);
    }

    return graph;
  }

  /**
   * Get statistics
   */
  getStats() {
    const nodeTypes = {};
    const edgeTypes = {};

    for (const node of this.nodes.values()) {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    }

    for (const edge of this.edges) {
      edgeTypes[edge.type] = (edgeTypes[edge.type] || 0) + 1;
    }

    return {
      totalNodes: this.nodes.size,
      totalEdges: this.edges.length,
      nodeTypes,
      edgeTypes
    };
  }

  /**
   * Clear all data
   */
  clear() {
    this.nodes.clear();
    this.edges = [];
  }
}

export default Graph;

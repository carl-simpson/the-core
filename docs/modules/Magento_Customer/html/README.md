# Magento_Customer Module - HTML Documentation

## Overview

This directory contains professional HTML documentation for the Magento_Customer module, converted from the comprehensive markdown documentation created by the magento-expert agent.

## Files

### 1. **index.html** - Homepage (430 lines, 23KB)
Master index page with:
- Module statistics (194 nodes, 123 edges, 19 plugins, 16 observers)
- Documentation overview and structure
- Getting started guide with recommended learning path
- Quick navigation to all documentation sections
- Responsive design with TailwindCSS

### 2. **architecture.html** - Module Architecture (325 lines, 18KB)
Complete architectural overview including:
- Module position in Magento ecosystem
- All 38 service contract interfaces
- Database schema with EAV structure
- Extension points (plugins, events, observers)
- Performance and security considerations
- Mermaid diagrams for visual representation

### 3. **execution-flows.html** - Execution Flows (301 lines, 16KB)
Step-by-step execution traces with:
- **Tabbed interface** for 4 critical flows:
  - Customer Registration Flow
  - Customer Login Flow
  - Customer Save Flow
  - Customer Email Change Flow
- **Mermaid sequence diagrams** for visual flow representation
- Plugin execution order and sortOrder visualization
- Event dispatch points and observer triggers
- Database operations with SQL examples

### 4. **plugins-observers.html** - Plugins & Observers Reference (290 lines, 18KB)
Interactive reference table with:
- **Sortable/filterable tables** using Alpine.js
- All 19 plugins documented with sortOrder, area, and purpose
- All 16 observers with event mappings
- **Search functionality** - filter by name or purpose
- **Area filter** - global, frontend, admin, REST API
- Critical plugins and observers highlighted
- Color-coded badges for different areas

### 5. **integrations.html** - Module Integrations (247 lines, 14KB)
Integration patterns showing:
- Direct dependencies (Magento_Eav, Magento_Directory)
- Key module integrations (Sales, Quote, Checkout, PageCache, Catalog, Tax)
- Database foreign keys and observers
- Email synchronization patterns
- FPC depersonalization strategy
- Customer group pricing and catalog rules
- Summary table of all integration types

### 6. **annotated-code.html** - Annotated Code Tutorial (438 lines, 21KB)
Comprehensive code tutorial with:
- **CustomerRepositoryInterface** fully annotated
- Architectural position visualization
- Plugin intercept points explanation
- Method-by-method documentation (save, getById, getList, delete)
- **Prism.js syntax highlighting** for PHP code
- **Copy-to-clipboard buttons** for code blocks
- Usage examples and error handling patterns
- Performance tips and best practices

## Features

### Technical Implementation

- **TailwindCSS** via CDN (latest v3.x) for styling
- **Alpine.js** via CDN (latest v3.x) for interactivity
- **Mermaid.js** for diagrams (sequence diagrams, flowcharts)
- **Prism.js** for syntax highlighting (PHP language support)
- **No build process** - pure HTML/CSS/JS works immediately

### Interactive Features

1. **Search functionality** (plugins-observers.html)
   - Real-time filtering by name or purpose
   - Area-based filtering (global, frontend, admin, API)

2. **Tabbed interfaces** (execution-flows.html)
   - Switch between different execution flows
   - Clean presentation of complex information

3. **Sortable tables** (plugins-observers.html)
   - Sort by name, sortOrder, area
   - Visual indicators for critical components

4. **Copy-to-clipboard** (annotated-code.html)
   - One-click code copying for all examples
   - Syntax-highlighted code blocks

5. **Back to top buttons**
   - Fixed position scroll-to-top on all pages

### Accessibility Features

- Semantic HTML5 elements
- Skip-to-content links on all pages
- ARIA labels for navigation
- Keyboard-accessible interactive elements
- Focus indicators visible and styled
- Alt text for all diagrams (via Mermaid)
- Proper heading hierarchy

### Responsive Design

- Mobile-first responsive layout
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px)
- Collapsible navigation on mobile
- Responsive tables with horizontal scroll
- Touch-friendly interactive elements

## Color Scheme

- **Primary (Magento)**: Purple/Indigo (#9333ea, #7e22ce)
- **Success**: Green (for completed flows, best practices)
- **Warning**: Yellow/Orange (for performance notes)
- **Danger**: Red (for critical security notes, anti-patterns)
- **Info**: Blue/Cyan (for tips, additional context)
- **Code blocks**: Dark theme (Prism Tomorrow)

### Page-Specific Colors

- **Architecture**: Cyan/Blue
- **Execution Flows**: Purple/Indigo
- **Plugins & Observers**: Indigo/Purple
- **Integrations**: Green/Teal
- **Annotated Code**: Orange/Red

## Navigation

Each page includes:
- **Consistent header** with full navigation menu
- **Active page highlighting** in navigation
- **Breadcrumb support** (visual hierarchy)
- **Footer** with quick links and metadata
- **Cross-page links** for related content

## Statistics

- **Total HTML files**: 6 pages
- **Total lines of code**: 2,031 lines
- **Total size**: ~110KB (uncompressed)
- **Components documented**: 194 nodes, 123 edges
- **Plugins documented**: 19 (with sortOrder and area)
- **Observers documented**: 16 (with event mappings)
- **Code examples**: 20+ fully annotated examples

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Usage

Simply open `index.html` in any modern browser. All pages are self-contained and work offline (with CDN caching).

### Recommended Viewing Order

1. **index.html** - Start here for overview
2. **architecture.html** - Understand module structure
3. **execution-flows.html** - See how operations work
4. **plugins-observers.html** - Reference for extension points
5. **annotated-code.html** - Deep dive into code
6. **integrations.html** - Understand cross-module patterns

## Deployment

These HTML files can be deployed to:
- **Static site hosting** (GitHub Pages, Netlify, Vercel)
- **Magento Hyvä documentation** platform
- **Internal documentation servers**
- **Local file system** for offline reference

No server-side processing required. All functionality runs client-side.

## Source Documentation

Original markdown documentation created by magento-expert agent:
- `/Volumes/External/magento-core/docs/modules/Magento_Customer/README.md`
- `/Volumes/External/magento-core/docs/modules/Magento_Customer/ARCHITECTURE.md`
- `/Volumes/External/magento-core/docs/modules/Magento_Customer/EXECUTION_FLOWS.md`
- `/Volumes/External/magento-core/docs/modules/Magento_Customer/PLUGINS_AND_OBSERVERS.md`
- `/Volumes/External/magento-core/docs/modules/Magento_Customer/INTEGRATIONS.md`
- `/Volumes/External/magento-core/docs/modules/Magento_Customer/annotated/CustomerRepositoryInterface.php`

## Version

- **Document Version**: 1.0.0
- **Last Updated**: 2025-12-03
- **Magento Version**: 2.4.8
- **PHP Version**: 8.4
- **Generated by**: Documentation Team

## License

Same license as Magento core documentation.

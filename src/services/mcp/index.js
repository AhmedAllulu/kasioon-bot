/**
 * MCP (Model Context Protocol) Module
 *
 * This module provides direct PostgreSQL database access for the Qasioun Marketplace bot.
 * It replaces the legacy API-based search with direct database queries powered by Claude AI.
 *
 * Components:
 * - client.js: High-level database client with search methods
 * - queryBuilder.js: SQL query builder for marketplace searches
 * - config.json: MCP server configuration
 *
 * The main MCP Agent is located at: ../ai/mcpAgent.js
 */

const client = require('./client');
const queryBuilder = require('./queryBuilder');

module.exports = {
  client,
  queryBuilder,

  // Convenience methods
  searchListings: (filters) => client.searchListings(filters),
  getLeafCategories: (parentSlug) => client.getLeafCategories(parentSlug),
  findCategory: (keywords) => client.findCategory(keywords),
  getListingDetails: (id) => client.getListingDetails(id),
  searchCities: (term) => client.searchCities(term),
  healthCheck: () => client.healthCheck()
};

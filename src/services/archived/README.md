# Archived Services

This folder contains archived services that were used in the legacy API-based architecture.
These files are kept for backward compatibility and fallback purposes.

## Files

### marketplaceSearch.js
- **Purpose**: API-based search for the Kasioon Marketplace
- **Status**: Replaced by MCP Agent (`../ai/mcpAgent.js`)
- **Usage**: Only used when `USE_MCP_AGENT=false`

### dynamicDataManager.js
- **Purpose**: Fetches categories, filters, and structure from Kasioon API
- **Status**: Replaced by direct database access via MCP
- **Usage**: Only used when `USE_MCP_AGENT=false`

## Migration Notes

The new MCP (Model Context Protocol) architecture provides:
- Direct PostgreSQL database access
- Real-time data (no caching delays)
- Claude AI-powered natural language understanding
- LEAF category enforcement built into system prompt
- Better accuracy for search results

To switch between modes, set the `USE_MCP_AGENT` environment variable:
- `USE_MCP_AGENT=true` - New MCP Agent mode (recommended)
- `USE_MCP_AGENT=false` - Legacy API mode (fallback)

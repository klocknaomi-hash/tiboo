/**
 * Composio & MCP (Model Context Protocol) Type Definitions
 *
 * Interfaces and types for:
 * 1. Composio connected accounts & authentication
 * 2. Model Context Protocol (MCP) JSON-RPC requests & tool representations
 * 3. Structured domain data models for Gmail, Google Calendar, Notion & 100+ tools
 */

export type ComposioApp =
  | 'gmail'
  | 'googlecalendar'
  | 'notion'
  | 'slack'
  | 'github'
  | 'googledocs'
  | 'reddit'
  | string;

export interface ConnectedAccount {
  id: string;
  app: ComposioApp;
  name: string;
  status: 'ACTIVE' | 'INITIATED' | 'FAILED' | 'EXPIRED';
  userEmail?: string;
  connectedAt?: string;
  authConfig?: Record<string, unknown>;
}

export interface ComposioConfig {
  apiKey?: string;
  userId: string;
  baseUrl?: string;
}

/**
 * Standard Model Context Protocol (MCP) Tool schema
 */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

/**
 * MCP JSON-RPC 2.0 Request
 */
export interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number;
  method: 'initialize' | 'tools/list' | 'tools/call';
  params?: Record<string, unknown>;
}

/**
 * MCP JSON-RPC 2.0 Response
 */
export interface McpJsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: string | number;
  result?: T;
  error?: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export interface McpCallToolResult {
  content: Array<{
    type: 'text' | 'image' | 'resource';
    text?: string;
    data?: unknown;
  }>;
  isError?: boolean;
}

// ------------------------------------------------------------------------------
// Domain-Specific Data Structures (Gmail, Calendar, Notion)
// ------------------------------------------------------------------------------

export interface GmailEmailSummary {
  id: string;
  threadId?: string;
  sender: string;
  subject: string;
  snippet: string;
  date: string;
  isUnread: boolean;
}

export interface CalendarEventSummary {
  id: string;
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: string[];
  hangoutLink?: string;
}

export interface NotionPageSummary {
  id: string;
  title: string;
  url: string;
  lastEditedTime: string;
  type: 'page' | 'database' | 'document';
  excerpt?: string;
}

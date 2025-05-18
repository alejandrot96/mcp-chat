# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Machine Conversation Protocol) playground/chat application built with Next.js and the Vercel AI SDK. It allows users to interact with AI models through a chat interface, with Git-based chat history storage. The application provides tools for model selection, chat history management, and MCP server configuration.

## Development Commands

```bash
# Install dependencies
pnpm install

# Start the development server with Turbopack
pnpm dev

# Build the project for production
pnpm build

# Start the production server
pnpm start

# Run linting
pnpm lint
```

## Architecture

### Core Components

1. **Chat Interface (`app/page.tsx`)**: The main chat UI that manages messages, tracks tokens, and handles user interactions.

2. **API Routes**:
   - `app/api/chat/route.ts`: Handles chat completions using AI models
   - `app/api/tools/route.ts`: Manages tool integrations

3. **Git-based Chat History**:
   - `services/gitchat/client.ts`: Manages the chat history as commits in a graph structure
   - `services/gitchat/atoms.ts`: State management for chat history using Jotai

4. **MCP Integration**:
   - `lib/tools.ts`: Initializes MCP clients and tools
   - `services/mcp/`: Contains clients and state management for MCP servers

5. **UI Components**:
   - ShadCN UI library for components
   - Custom components in `/components` directory for chat-specific functionality

### Key Technologies

- **Frontend**: Next.js, React 19, Tailwind CSS
- **State Management**: Jotai for atomic state
- **AI Integration**: Vercel AI SDK with support for different models (Anthropic, OpenAI, Google)
- **Styling**: TailwindCSS with ShadCN UI components

## Key Features

1. **Git-based Chat History**: Chat conversations are stored as a graph of commits, enabling branching conversations and undo/redo functionality.

2. **MCP Server Support**: Can connect to MCP servers defined in `mcptools.json` to provide additional agent capabilities.

3. **Token Tracking**: Tracks and displays token usage for each interaction, including cost estimation.

4. **Keyboard Shortcuts**: Supports numerous keyboard shortcuts for efficient navigation:
   - `Tab` or `i` to focus the input
   - `Ctrl/Cmd + K` to open the command palette
   - `n` to clear the chat
   - `m` to configure MCP
   - `e` to export chat
   - `u` to go to the last user commit
   - `r` to retry the last user message
   - `p` to go to the previous message
   - Number keys to navigate to different branches

5. **Export Functionality**: Allows exporting chat history in various formats.

## File Structure

- `/app`: Next.js app directory containing pages and API routes
- `/components`: React components for the UI
- `/services`: Core services (gitchat, mcp, commands)
- `/lib`: Utility functions and tools
- `/public`: Static assets
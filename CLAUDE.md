# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Commands

### Development
- `npm run dev` - Start frontend development server (Vite)
- `npm run tauri dev` - Start Tauri development server with backend
- `npm run build` - Build frontend for production
- `npm run tauri build` - Build complete Tauri application
- `npm run preview` - Preview production build

### Node Version
- Use Node.js v18+ (switch with `nvm use 22` if version issues occur)

## Architecture Overview

**Soham Tracker** is a cross-platform desktop activity tracking application built with:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Rust + Tauri 2.0 + SQLite
- **Real-time**: Event-driven architecture with Tauri events

### Key Components

#### Frontend (`src/`)
- **Entry Point**: `main.tsx` → `App.tsx` with theme provider and routing
- **Main Layout**: `layouts/MainLayout.tsx` with sidebar navigation
- **Pages**: Dashboard, Analytics, Timeline, Screenshots, Settings
- **Components**: Modular dashboard components in `components/dashboard/`
- **Hooks**: Custom hooks for data fetching and state management
- **UI**: shadcn/ui components in `components/ui/`

#### Backend (`src-tauri/src/`)
- **Entry Point**: `main.rs` → `lib.rs` with Tauri command handlers
- **Core Modules**:
  - `db.rs` - SQLite database operations and schema
  - `screenshot.rs` - Screenshot capture service
  - `event_listener.rs` (macOS) / `activity_poller.rs` (other platforms) - Activity tracking
  - `icon_extractor.rs` - App icon extraction
  - `system_stats.rs` - System statistics
  - `state.rs` - Application state management

### Data Flow
1. **Activity Tracking**: OS events → Rust backend → SQLite database
2. **Real-time Updates**: Tauri events → React hooks → UI updates
3. **Screenshots**: Periodic capture → File system → Database metadata
4. **Dashboard**: Database queries → Tauri commands → React components

### Database Schema
- `window_activities` - Window focus/blur events
- `time_logs` - Session duration tracking  
- `screenshots` - Screenshot metadata and file paths
- `audit_events` - System events and errors

## Development Notes

### TypeScript Configuration
- Path alias `@/*` maps to `./src/*`
- Strict mode enabled with comprehensive linting rules

### Styling
- Tailwind CSS with custom color variables using HSL values
- Dark/light theme support with `next-themes`
- shadcn/ui component library (assume components are already installed)

### Platform Differences
- macOS: Uses native event listeners for activity tracking
- Other platforms: Uses polling mechanism with warning message

### Real-time Features
- Dashboard updates every 5 seconds via Tauri events
- Live activity feed with WebSocket-like experience
- Session-based tracking with automatic session creation

## Testing and Quality
- No explicit test commands found - verify with user if needed
- TypeScript strict mode for type safety
- Rust's built-in safety features for backend reliability
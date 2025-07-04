# Hooks Directory

This directory contains custom React hooks that provide reusable logic for the Soham desktop application.

## Architecture Overview

The hooks are designed following these principles:

- **Separation of Concerns**: Each hook has a single responsibility
- **Composability**: Hooks can be combined to build complex functionality
- **Consistency**: All hooks follow the same return pattern `{ data, isLoading, error, refresh }`
- **Real-time Updates**: Hooks integrate with Tauri's event system for live data

## Available Hooks

### Data Fetching Hooks

#### `useAppLifecycleFlow`

**Purpose**: Manages app lifecycle flow data with real-time updates
**Usage**:

```typescript
const { flows, stats, isLoading, error, refresh } = useAppLifecycleFlow(date, {
  enableRealtime: true,
  autoRefresh: true,
});
```

#### `useDashboardData`

**Purpose**: Fetches dashboard statistics and heatmap data
**Usage**:

```typescript
const { data, isLoading, error, refresh } = useDashboardData(range, {
  enableRealtime: true,
});
```

#### `useHeatmapData`

**Purpose**: Fetches activity heatmap data for different time ranges
**Usage**:

```typescript
const { data, isLoading, error, refresh } = useHeatmapData(range, rangeType);
```

#### `useScreenshots`

**Purpose**: Manages screenshot data fetching and caching
**Usage**:

```typescript
const { screenshots, isLoading, error, refresh } = useScreenshots(limit);
```

### Visualization Hooks

#### `useFlowVisualization`

**Purpose**: Converts lifecycle flow data into React Flow nodes and edges
**Usage**:

```typescript
const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
  useFlowVisualization(flows, {
    nodeSpacing: 300,
    maxNodesPerRow: 4,
    animated: true,
  });
```

### Asset Management Hooks

#### `useAppIcon`

**Purpose**: Fetches and caches app icons
**Usage**:

```typescript
const iconSrc = useAppIcon(appName);
```

#### `useSystemStats`

**Purpose**: Fetches system performance statistics
**Usage**:

```typescript
const { stats, isLoading, error, refresh } = useSystemStats();
```

## Design Patterns

### 1. Consistent Return Interface

All data-fetching hooks return an object with:

- `data`: The fetched data
- `isLoading`: Loading state boolean
- `error`: Error message string or null
- `refresh`: Function to manually refresh data

### 2. Options Pattern

Hooks accept an options object for configuration:

```typescript
const { data, isLoading, error } = useHook(params, {
  enableRealtime: true,
  autoRefresh: true,
});
```

### 3. Real-time Integration

Hooks that need real-time updates use Tauri's event system:

```typescript
useEffect(() => {
  const unlisten = listen("event-name", (event) => {
    // Handle real-time updates
  });
  return () => unlisten.then((fn) => fn());
}, []);
```

## Best Practices

1. **Single Responsibility**: Each hook should have one clear purpose
2. **Memoization**: Use `useCallback` and `useMemo` to prevent unnecessary re-renders
3. **Error Handling**: Always handle errors gracefully and provide user-friendly messages
4. **Loading States**: Provide clear loading indicators for better UX
5. **Cleanup**: Always clean up event listeners and subscriptions

## Contributing

When adding new hooks:

1. Follow the existing naming convention (`use[PascalCase]`)
2. Include TypeScript types for all parameters and return values
3. Add JSDoc comments for documentation
4. Include error handling and loading states
5. Write tests for complex logic
6. Update this README with the new hook information

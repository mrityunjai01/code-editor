# Build Optimization & Console Log Management

## Overview
This project uses Vite with advanced build optimization to automatically handle console logs based on the environment.

## Console Log Management

### Development (npm run dev)
- **All logs visible**: DEBUG, INFO, WARN, ERROR
- **Enhanced formatting**: Timestamps and module prefixes
- **Full debugging**: Source maps enabled

### Production (npm run build:prod)
- **Console logs removed**: All console.* statements stripped from bundle
- **Silent logger**: Logger set to SILENT mode
- **Optimized bundle**: Minified with Terser
- **No source maps**: For smaller bundle size

## Build Configuration

### Environment-Specific Settings
```typescript
// vite.config.ts
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'
  
  return {
    plugins: [
      react(),
      // Remove console logs in production
      isProduction && removeConsole({
        includes: ['log', 'warn', 'error', 'info', 'debug'],
      }),
    ],
    
    build: {
      minify: isProduction ? 'terser' : false,
      terserOptions: isProduction ? {
        compress: {
          drop_console: true,    // Remove console statements
          drop_debugger: true,   // Remove debugger statements
          dead_code: true,       // Remove unused code
        },
      } : undefined,
    },
  }
})
```

### Logger Configuration
```typescript
// src/utils/logger.ts
const LOG_LEVEL = 
  process.env.NODE_ENV === "production" 
    ? "SILENT"  // Completely silent in production
    : process.env.NODE_ENV === "test"
    ? "ERROR"   // Only errors in tests
    : "DEBUG";  // Full logging in development
```

## Available Scripts

### Standard Build Commands
- `npm run dev` - Development server with full logging
- `npm run build` - Standard production build
- `npm run build:prod` - Explicit production build with optimizations
- `npm run build:check` - TypeScript type checking only
- `npm run preview` - Preview production build locally

### Testing
- `npm test` - Run tests with ERROR-level logging only
- `npm run test:watch` - Watch mode testing

## Build Optimizations

### Enabled Features
1. **Console Removal**: All console statements stripped in production
2. **Code Minification**: Terser minification with aggressive compression
3. **Dead Code Elimination**: Unused code automatically removed
4. **Chunk Splitting**: Vendor and Monaco Editor separated for caching
5. **Tree Shaking**: Unused imports eliminated

### Bundle Analysis
- **Vendor chunk**: React + React-DOM (~139KB gzipped)
- **Monaco chunk**: Monaco Editor (~14KB gzipped) 
- **Main bundle**: Application code (~478KB gzipped)
- **Total size**: ~631KB gzipped (excellent for a Monaco-based editor)

## Verification

### Check Console Removal
```bash
# Search for console statements in built files
grep -r "console\." dist/assets/ || echo "No console statements found!"

# Verify logger is set to SILENT
grep -o "SILENT" dist/assets/index-*.js
```

### Performance Monitoring
The build includes performance monitoring capabilities:
- Build-time constants: `__BUILD_TIME__`, `__IS_PRODUCTION__`
- Environment detection
- Automatic optimization based on NODE_ENV

## Best Practices

### For Development
- Use the structured logger: `logger.websocket.debug(...)`
- Prefer specific log levels: debug, info, warn, error
- Include context in log messages

### For Production
- Console logs are automatically removed
- Logger set to SILENT mode
- No manual intervention needed
- Source maps disabled for security

## Troubleshooting

### If console logs appear in production:
1. Verify NODE_ENV=production is set
2. Check vite.config.ts configuration
3. Ensure using `npm run build:prod`
4. Clear dist/ folder and rebuild

### Development debugging:
1. Use `logger.*` instead of `console.*`
2. Check logger level with `logger.getLevel()`
3. Set custom log level: `setLogLevel('DEBUG')`
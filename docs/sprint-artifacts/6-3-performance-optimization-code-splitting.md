# Story 6.3: Performance Optimization - Code Splitting

## Story

**As a** Developer
**I want** the application to load quickly with optimized bundle sizes
**So that** I can start working immediately without waiting for large JavaScript bundles

## Status

| Field | Value |
|-------|-------|
| Epic | 6 - Production Hardening & Intelligence |
| Priority | P1 |
| Effort | 2 days |
| Status | ready-for-dev |

## Acceptance Criteria

### AC1: Bundle Optimization
- [ ] Three.js and 3D-related code in separate chunk (lazy loaded)
- [ ] ReactFlow in separate chunk
- [ ] Initial bundle <500KB (excluding vendor chunks)
- [ ] Vite build with proper chunk splitting configuration

### AC2: Lazy Loading Implementation
- [ ] Views not requiring 3D don't load TheConstruct/Three.js chunks
- [ ] Only required chunks load for current view
- [ ] React.lazy() and Suspense with loading indicators
- [ ] Loading skeletons match Cyberpunk aesthetic

### AC3: 3D Construct On-Demand Loading
- [ ] Three.js chunk loads only when 3D Construct view requested
- [ ] Loading skeleton displayed during chunk loading
- [ ] Chunk loads within 2 seconds on typical connection
- [ ] Error boundaries catch and display chunk loading failures

### AC4: Core Web Vitals
- [ ] LCP (Largest Contentful Paint) <2.5 seconds
- [ ] TTI (Time to Interactive) <3.5 seconds
- [ ] FID (First Input Delay) <100ms
- [ ] No layout shifts during lazy loading

## Tasks

### Task 1: Analyze Current Bundle
**File:** `vite.config.ts` (MODIFY)

#### Subtasks:
- [ ] 1.1 Run `npm run build` and analyze current bundle sizes
- [ ] 1.2 Identify large dependencies (Three.js, ReactFlow, etc.)
- [ ] 1.3 Document current LCP/TTI/FID metrics using Lighthouse
- [ ] 1.4 Create baseline performance report

### Task 2: Configure Vite Chunk Splitting
**File:** `vite.config.ts` (MODIFY)

#### Subtasks:
- [ ] 2.1 Configure manualChunks for Three.js/drei dependencies
  ```typescript
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'three-vendor': ['three', '@react-three/fiber', '@react-three/drei'],
          'reactflow-vendor': ['reactflow', '@reactflow/core'],
          'ui-vendor': ['framer-motion', 'tailwindcss'],
        }
      }
    }
  }
  ```
- [ ] 2.2 Set chunk size warnings/limits
- [ ] 2.3 Enable tree-shaking optimizations
- [ ] 2.4 Configure asset inlining thresholds

### Task 3: Implement Lazy Component Loading
**File:** `src/App.tsx` (MODIFY)

#### Subtasks:
- [ ] 3.1 Create lazy imports for heavy components
  ```typescript
  const TheConstruct = lazy(() => import('./components/TheConstruct'));
  const NeuralGraph = lazy(() => import('./components/NeuralGraph'));
  ```
- [ ] 3.2 Wrap lazy components with Suspense boundaries
- [ ] 3.3 Create ViewMode-based conditional rendering
- [ ] 3.4 Ensure non-3D views never trigger 3D chunk loading

### Task 4: Create Loading Skeletons
**File:** `src/components/LoadingSkeleton.tsx` (NEW)

#### Subtasks:
- [ ] 4.1 Create base skeleton component with Cyberpunk styling
- [ ] 4.2 Create ConstructLoadingSkeleton (3D view placeholder)
- [ ] 4.3 Create GraphLoadingSkeleton (ReactFlow placeholder)
- [ ] 4.4 Add pulse/glow animations matching theme
- [ ] 4.5 Ensure no layout shift when real content loads

### Task 5: Add Error Boundaries
**File:** `src/components/ChunkErrorBoundary.tsx` (NEW)

#### Subtasks:
- [ ] 5.1 Create error boundary for chunk loading failures
- [ ] 5.2 Design error UI with retry button
- [ ] 5.3 Log chunk loading errors for debugging
- [ ] 5.4 Wrap all lazy-loaded components with error boundaries

### Task 6: Optimize Asset Loading
**Files:** Various

#### Subtasks:
- [ ] 6.1 Implement font preloading for critical fonts
- [ ] 6.2 Add resource hints (preconnect, prefetch) in index.html
- [ ] 6.3 Optimize image loading (lazy load non-critical images)
- [ ] 6.4 Configure service worker for caching (optional)

### Task 7: Measure and Validate
**File:** Performance testing

#### Subtasks:
- [ ] 7.1 Run Lighthouse audit post-implementation
- [ ] 7.2 Verify all Core Web Vitals meet thresholds
- [ ] 7.3 Test on simulated slow 3G connection
- [ ] 7.4 Document final bundle sizes vs baseline
- [ ] 7.5 Create performance regression test

## Dev Notes

### Architecture Compliance
- Use Vite's built-in code splitting capabilities
- Follow existing component patterns in `src/components/`
- Maintain TypeScript strict mode compliance

### Bundle Analysis
```bash
# Analyze bundle
npm run build -- --sourcemap
npx source-map-explorer dist/assets/*.js
```

### Critical Chunks
| Chunk | Max Size | Contents |
|-------|----------|----------|
| main | 200KB | Core React, routing, contexts |
| three-vendor | 400KB | Three.js, R3F, drei |
| reactflow-vendor | 150KB | ReactFlow, dagre |
| ui-vendor | 100KB | Framer Motion, utilities |

### Testing Requirements
- Lighthouse CI in GitHub Actions
- Bundle size budget tests
- Manual testing of lazy loading flows
- Network throttling tests (slow 3G)

### Performance Monitoring
- Consider adding Web Vitals reporting
- Log chunk load times for analytics
- Monitor TTI in production

## References

- **Epic Source:** `docs/epics.md` - Epic 6, Story 6.3
- **Vite Docs:** https://vitejs.dev/guide/build.html#chunking-strategy
- **React Lazy:** https://react.dev/reference/react/lazy
- **Current Config:** `vite.config.ts`

---

**Created:** 2026-01-01
**Workflow:** BMAD Create-Story v4.0

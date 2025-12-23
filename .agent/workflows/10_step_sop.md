---
description: Execute the strict 10-step Antigravity SOP loop for a new task (Feature/Fix)
---

# 10-Step Antigravity SOP Loop (v2.1)

This workflow enforces the "Behavior-Locked, Small Diffs, Always Verified" protocol with **mandatory coverage verification**.

## Step 1: Branch & Context (MANDATORY)
1. Ask the user for the `ticket-slug` or `feature-name`.
2. **ALWAYS create a feature branch** (mandatory unless user explicitly opts out):
   ```bash
   git status
   git switch -c feat/<feature-name>
   ```
3. Verify branch created successfully.

## Step 2: Baseline Verify (MANDATORY)
**Critical**: usage of `npm run verify` is mandatory.
1. Run the verification suite to ensure a clean slate.
   ```bash
   npm run verify
   ```
2. **Run baseline coverage check**:
   ```bash
   npm run test:coverage
   ```
3. Record baseline coverage percentage (especially for files you'll modify).
4. If verification fails, **STOP**. The baseline is broken. Fix it before proceeding.

## Step 3: Planning (Agent A)
1. Creates `implementation_plan.md` (or updates it).
2. **Must Define**:
   - **Invariants**: 5-10 bullets of what must NOT change.
   - **Allowed Files**: Explicit list of files to edit.
   - **Test Strategy**: Choose Characterization OR TDD (see Step 4).
   - **Coverage Target**: Minimum coverage % for new/modified files (default: 50% overall, 70% for critical files).
   - **Rollback Plan**.
3. Ask User for approval of the plan.

## Step 4: Test Strategy (Context-Dependent)

**Choose the appropriate testing approach:**

### Option A: Characterization Tests (Refactoring/Preserving Behavior)
- Use when: Refactoring, bug fixes where behavior should stay same, legacy code
- Write tests that lock down CURRENT behavior before changes
- Run `npm run verify` to confirm they pass

### Option B: TDD (New Features/Fixing Wrong Behavior)
- Use when: New features, bugs where current behavior is WRONG, greenfield
- Write FAILING tests defining DESIRED behavior (RED)
- Implement to make tests pass (GREEN)
- Refactor while keeping tests green (REFACTOR)

### Decision Matrix:
| Scenario | Approach |
|----------|----------|
| Refactoring existing code | Characterization |
| New feature (no existing behavior) | TDD |
| Bug fix (behavior should stay same) | Characterization |
| Bug fix (current behavior is wrong) | TDD |
| Legacy code without tests | Characterization first |
| Greenfield development | TDD |

**Agent should ask**: "Is this refactoring existing behavior or adding new behavior?"

## Step 4.5: Test Pyramid Requirements (NEW - MANDATORY)

**CRITICAL**: All features MUST have tests at multiple levels to prevent integration bugs.

### Required Test Distribution:
- **60% Unit Tests**: Test individual functions in isolation
  - Mock external dependencies (APIs, databases, 3rd party services)
  - Fast execution, many of these
  - Example: `authService.login()` with mocked fetch

- **30% Integration Tests**: Test YOUR services working together
  - ❌ **DO NOT mock your own code**
  - ✅ Only mock external APIs (Gemini, market data, etc.)
  - ✅ **MUST verify actual API calls and headers**
  - Example: Test `authService` + `database` correctly send `x-user-id` header

- **10% E2E Tests**: Test complete user flows
  - No mocking except external APIs
  - Start backend server, make real calls
  - Example: Login → Create institution → Verify it appears

### Anti-Patterns to AVOID:
❌ Mocking your own services in integration tests  
❌ Tests that don't verify actual API behavior  
❌ Over-mocking that hides integration bugs  
❌ Tests that pass but don't test real scenarios  

### Verification Checklist:
Before proceeding to Step 5, ensure:
- [ ] At least 1 integration test exists
- [ ] Integration tests don't mock internal services
- [ ] API contracts are tested
- [ ] Headers/request formats are verified

## Step 5: Implementation (Agent B)
1. Edit **ONLY** the files listed in the Allowed Files list.
2. Make the smallest possible diff.
3. **Do not** refactor unrelated code.

## Step 6: Test New Behavior (Agent C)

### 6.1 Add/Update Tests
1. Add new tests or update existing ones for the new feature.
2. Follow Test Pyramid from Step 4.5 (60% unit, 30% integration, 10% E2E)

### 6.2 Coverage Requirements
- Run `npm run test:coverage`
- Verify >= 50% overall project coverage (MANDATORY)
- Verify >= 70% coverage for critical files (App.tsx, services, utils)
- New code should have >= 80% coverage

### 6.3 Integration Test Checklist (NEW - MANDATORY)

**CRITICAL**: Answer YES to all questions before proceeding:

- [ ] Is there at least ONE integration test that doesn't mock our services?
- [ ] Do we test actual API calls with real headers?
- [ ] Do we verify request/response formats match backend expectations?
- [ ] If feature involves auth, do we test the auth flow end-to-end?
- [ ] If feature involves database, do we verify actual queries?
- [ ] Do integration tests verify data isolation (multiuser scenarios)?

**If ANY answer is NO, add the missing integration tests before proceeding.**

### 6.4 Contract Testing (NEW - For API Features)

For features with frontend-backend integration:

- [ ] Document the API contract (headers, body format, data types)
- [ ] Test that frontend sends correct format (e.g., email vs UUID)
- [ ] Test that backend expects correct format
- [ ] Verify both sides agree on data types and field names
- [ ] Add contract test that fails if format changes

**Example Contract:**
```yaml
API: GET /api/portfolio
Headers:
  x-user-id: string (email format)
  Example: "user@example.com"
  NOT: UUID or numeric ID
```

### 6.5 Run Verification
3. Run `npm run verify` - all tests must pass.

## Step 7: Coverage Verification (MANDATORY)
**Critical**: This step cannot be skipped.

1. Run coverage report:
   ```bash
   npm run test:coverage
   ```

2. **Verify coverage thresholds**:
   - ✅ Overall coverage >= 50%
   - ✅ Modified files coverage >= baseline (no regression)
   - ✅ New files coverage >= 70%
   - ✅ Critical files (services, utils) >= 70%

3. **If coverage drops below threshold**:
   - Add targeted unit/integration tests
   - Focus on untested code paths
   - Repeat until thresholds met

4. **Document coverage in walkthrough**:
   - Before: X%
   - After: Y%
   - Delta: +Z%

## Step 8: Regression & Performance Audit (Agent D)
1. Review the changes made.
2. Check for unintended side effects.
3. Verify that Invariants from Step 3 are preserved.
4. Check performance impact:
   - Any new O(n²) operations?
   - Unnecessary re-renders?
   - Memory leaks?

### 8.5 Manual Smoke Testing (NEW - MANDATORY)

**CRITICAL**: Automated tests are not enough. Manually verify critical flows.

#### For Authentication Features:
- [ ] Can you log in with a test email?
- [ ] Does the dashboard show your data?
- [ ] Can you log out successfully?
- [ ] Can you log in as a different user?
- [ ] Does each user see ONLY their own data?

#### For Data Isolation Features:
- [ ] Create data as User A
- [ ] Log out and log in as User B
- [ ] Verify User B CANNOT see User A's data
- [ ] Log back in as User A  
- [ ] Verify User A's data is still there

#### For API Integration:
- [ ] Open browser DevTools → Network tab
- [ ] Make an API call (login, load data, etc.)
- [ ] **Verify request headers are correct** (e.g., x-user-id = email)
- [ ] Verify response contains expected data
- [ ] Check browser console for errors
- [ ] Verify no race conditions or timing issues

#### For UI Changes:
- [ ] Test in different screen sizes (mobile, tablet, desktop)
- [ ] Verify no visual regressions
- [ ] Check loading states work correctly
- [ ] Verify error messages are user-friendly

**Document manual test results in walkthrough.md**

## Step 9: Stabilize
1. If `npm run verify` failed in Step 6, fix the code (preferred) or tests (if behavior change was planned).
2. Repeat until Green.
3. **Ensure all coverage thresholds are met**.

## Step 10: Commit
1. Stage and commit the changes with descriptive messages.
   ```bash
   git add .
   git commit -m "feat: <description>"
   ```
2. Make atomic commits (one logical change per commit).

## Step 11: Proof Artifact
1. Update `walkthrough.md` or create a new verification artifact.
2. Embed the output of `npm run verify`.
3. **Embed coverage report summary** (before/after comparison).
4. List explicit "What Changed" and "What Didn't Change" (Invariants).
5. **For UI changes**: Include screenshots or recordings.
6. **For API changes**: Include example requests/responses.
7. **For performance changes**: Include before/after metrics.
8. **For coverage changes**: Include coverage % improvement.

## Step 12: Push & Cleanup
1. Push the requested changes to GitHub:
   ```bash
   git push origin feat/<feature-name>
   ```
2. Request final approval from the user.
3. If approved, delete the local feature branch:
   ```bash
   git switch main
   git branch -D feat/<feature-name>
   ```

---

## Coverage Quality Gates

**MANDATORY thresholds** (feature cannot proceed without meeting these):

| Metric | Threshold | Action if Below |
|--------|-----------|-----------------|
| Overall Coverage | >= 50% | Block merge, add tests |
| Critical Files | >= 70% | Block merge, add tests |
| New Code | >= 80% | Block merge, add tests |
| Coverage Delta | >= 0% | No regression allowed |

**Critical Files Include:**
- `App.tsx`
- `services/**/*.ts`
- `utils/**/*.ts`
- `components/**/*.tsx` (business logic)

---

**Done**. Feature is ready for review/merge with verified coverage.

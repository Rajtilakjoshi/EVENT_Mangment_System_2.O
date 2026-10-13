# 🚀 Phase 1: Bug Remediation & Security Hardening — Starting Report

> **Divine Energy Hub — Event Management System (2026 Edition)**  
> **Phase:** Phase 1 — Correcting Bugs  
> **Stage:** Starting Report (Kickoff & Scope)  
> **Input Reference:** [Phase -1: Initial Codebase Audit (26 Identified Bugs)](file:///c:/Users/Admin/Downloads/final_Event_Mangement-app-main/phases%20of%20dev/phase_-1.md)

---

## 🎯 Phase 1 Objectives & Scope

The purpose of **Phase 1** is to systematically remediate all 26 security vulnerabilities, functional defects, quality anomalies, and edge cases discovered during the Phase -1 codebase audit, transforming the fragile 2025 prototype into a hardened, production-grade 2026 system.

### Scope of Work:
1. **Critical Security Remediation:**
   - Eliminate plaintext password storage in Firestore by implementing `bcryptjs` hashing.
   - Enforce server-side API authorization middleware on all backend endpoints (`require_api_key`).
   - Remove hardcoded secrets from `firebase.js` and enforce environment variable injection.
   - Purge exposed binaries and committed credentials from Git history tracking.

2. **High-Priority Functional Defect Resolution:**
   - Resolve single-token race conditions where concurrent scanners could cause double-check-ins.
   - Fix `TokenFinder.jsx` crash bugs by introducing optional chaining on nested `userData` properties.
   - Correct broken photo URL construction logic in `TokenFinder.jsx`.
   - Fix camera stream memory leaks in `PhotoUploader.jsx` with strict stream track cleanup closures.
   - Fix out-of-order variable declarations and state hoisting in `NewEntryForm.jsx`.
   - Resolve `datetime.utcnow()` deprecation across all Python backend files for Python 3.12+ compatibility.

3. **Medium & Low Quality Fixes:**
   - Eliminate triple duplicate `startOnlineFlush` polling loops causing network spam.
   - Fix IndexedDB `withStore` promise resolution bug in `guestCache.js`.
   - Remove empty `background-image: url("")` in `src/index.css` triggering wasteful HTTP requests.
   - Synchronize database naming to `divine_event_2026`.
   - Add top-level `AppErrorBoundary` and 404 catch-all route to prevent blank white screens.
   - Correct `prasadType` formatting from lowercase `prasad1` to capitalized `Prasad 1`.

---

## 📋 Remediation Strategy

| Severity Category | Total Bugs | Primary Target Files |
|---|---|---|
| **🚨 Critical Security** | 4 | `api/loginFirestore.js`, `api/registerFirestore.js`, `backend/app.py`, `src/firebase.js` |
| **🔴 High Functional** | 8 | `src/components/TokenFinder.jsx`, `src/components/PhotoUploader.jsx`, `backend/mongo_utils.py`, `NewEntryForm.jsx` |
| **🟡 Medium Quality** | 8 | `src/App.jsx`, `src/components/EntryGate.jsx`, `src/components/QrScanner.jsx`, `src/index.css`, `src/utils/guestCache.js` |
| **🟢 Low / Polish** | 6 | `src/pages/Register.jsx`, `src/components/Homepage/Homepage.jsx`, `backend/sheets_utils.py` |

---

## 🏁 Exit Criteria for Phase 1
- Zero plaintext passwords in authentication endpoints.
- All 26 categorized bugs verified as resolved in code.
- Automated test suite validating concurrency, duplicate prevention, and prerequisite gating passes with 100% success.
- Formal Ending Report generated in `phases of dev/phase_1_correcting_bugs_ending.md`.

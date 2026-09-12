# AI Ledger

## Farmer Component
**Model:** Gemini 3.5 Pro High  
**Asked for:** Build and fix the farmer insurance flow, including multiple policies, Hindi explanations, policy purchase, wallet integration, and offline functionality.  
**Changed:** Implemented dynamic insurance data, multiple policies, Hindi explanations, policy IDs, offline wallet behavior, and farmer-side QR transaction flow.

## Insurer Component
**Model:** Gemini 3.5 Pro High  
**Asked for:** Build a zero-code insurer dashboard where insurance products can be created and published dynamically.  
**Changed:** Implemented product creation/publishing, declarative policy configuration, dynamic product handling, oracle evaluation visibility, and insurer audit information.

## Weather / Oracle Component
**Model:** Gemini 3.5 Pro High  
**Asked for:** Implement real weather detection with validation, aggregation, stale-data handling, and oracle failure scenarios.  
**Changed:** Added Tomorrow.io integration, normalized weather readings, validation/freshness checks, aggregation, HOLD conditions, and demo oracle scenarios.

## Policy Engine
**Model:** Gemini 3.5 Pro High  
**Asked for:** Implement a generic declarative policy engine without hardcoded insurance rules.  
**Changed:** Connected published product configurations to generic trigger evaluation with configurable metrics, operators, thresholds, periods, and payouts.

## Offline Wallet
**Model:** Gemini 3.5 Pro High  
**Asked for:** Implement an offline-first wallet capable of spending, maintaining balance, sequencing transactions, and synchronizing later.  
**Changed:** Added IndexedDB persistence, integer-paise accounting, transaction sequencing, balance hashing, offline transactions, persistent queues, and reconciliation.

## QR Transaction
**Model:** Gemini 3.5 Pro High  
**Asked for:** Implement secure offline QR transactions between Farmer and Merchant/Seed Seller.  
**Changed:** Added dynamic QR generation, canonical transaction payloads, SHA-256 hashing, Web Crypto ECDSA signatures, QR verification, duplicate protection, offline queues, and sync reconciliation.

## Audit / Replay
**Model:** Gemini 3.5 Pro High  
**Asked for:** Make insurance decisions auditable and deterministically replayable.  
**Changed:** Added oracle evidence, product versions, aggregation, policy rules, decisions, and payout records; replay uses recorded evidence.

## Simulated Payout
**Model:** Gemini 3.5 Pro High  
**Asked for:** Implement automatic insurance payouts without using real payment systems.  
**Changed:** Added simulated payout processing that credits the Insure-X wallet only after TRIGGER, with payout IDs, ledger records, and duplicate-payout protection.

## Mobile / LAN Compatibility
**Model:** Gemini 3.5 Pro High  
**Asked for:** Fix route flickering and make the Next.js application work correctly when opened from another phone over LAN.  
**Changed:** Fixed routing/state issues, removed localhost-dependent browser API calls, stabilized navigation/hydration behavior, and improved LAN compatibility.

## Overall Integration
**Model:** Gemini 3.5 Pro High  
**Asked for:** Integrate the complete Finova parametric insurance architecture while preserving offline-first behavior.  
**Changed:** Connected Farmer, Insurer, Merchant, Weather Oracle, Policy Engine, Offline Wallet, QR, Sync, Audit, and Simulated Payout into one end-to-end workflow.

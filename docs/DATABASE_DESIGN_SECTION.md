# 4.6 Database Design

*(Copy this section into your paper or capstone document. Renumber the table to match your chapter.)*

---

The proposed **SolarKapitBahay** application utilized **SQLite** for local development and **Supabase (PostgreSQL)** for the deployed cloud demo, managed through a **FastAPI** backend, for storing barangay community records, household energy profiles, simulation outputs, device telemetry, and system-generated monitoring information. The backend automatically selects the database based on the `DATABASE_URL` environment variable: SQLite when unset (local), Supabase PostgreSQL when configured (Render + Vercel production).

The database design was structured to support **centralized record management**, **relational data integrity**, and **real-time accessibility** associated with the proposed web-based operator dashboard and household member application. Integration with **MQTT-based ESP32 sensor nodes** enables live solar generation, load consumption, relay status, and community battery state to be persisted as time-series telemetry records. Cloud PostgreSQL integration through Supabase improved scalability, persistent storage across redeployments, and synchronization capability necessary for supporting community solar monitoring and peer-to-peer energy sharing procedures in rural barangay environments.

The major database entities integrated within the proposed system include **Barangay Records**, **User Records**, **Household Records**, **Hourly Energy Records**, **Device Telemetry Records**, **Cluster Analysis Records**, **Simulation Run Records**, **Energy Transfer Records**, and **Alert Records**.

**Table XX — Database Entities of the Proposed SolarKapitBahay System**

| Entity | Description |
|--------|-------------|
| Barangay Records | Stores barangay-level configuration including community name, operator contact, MQTT broker settings, battery low-threshold limits, and geographic location of the solar sharing pilot site |
| User Records | Stores operator and household member account information including email, role, display name, and linked household assignment |
| Household Records | Stores registered household information including household head name, purok address, solar and battery ownership status, income tier, and active or pending membership status |
| Household Registration Records | Stores pending household membership applications submitted through the registration interface prior to operator approval |
| Dataset Records | Stores metadata for imported rural energy datasets including dataset identifier, source file reference, household count, and import timestamp |
| Hourly Energy Records | Stores per-household hourly energy profiles including load, solar generation, net load, battery state of charge, grid import and export, and time-of-use tariff period |
| Community Battery Records | Stores shared community battery configuration including total capacity, efficiency, minimum and maximum state of charge limits, and charge or discharge power constraints |
| Device Records | Stores ESP32 hardware registry information including device identifier, MAC address, assigned household, MQTT client ID, and online or offline status |
| Device Telemetry Records | Stores real-time sensor readings published via MQTT including solar power, load power, battery percentage, and relay switch state |
| Cluster Analysis Records | Stores K-means clustering outputs indicating whether each household battery should charge, discharge, or remain balanced based on net load and state of charge |
| Simulation Run Records | Stores greedy algorithm simulation activities including input parameters, execution duration, savings results, grid reduction, fairness score, and household comparison outputs |
| Energy Transfer Records | Stores peer-to-peer energy sharing transactions between households including source, destination, transferred power, transfer mode, and completion status |
| Alert Records | Stores system-generated notifications including critical supply warnings, excess capacity alerts, device offline events, and simulation completion notices |

---

## Supplementary notes (for your group / adviser)

**Implemented in Phase 1 (working in `backend/solarkapitbahay.db` today):**
Barangay Records, Household Records, Dataset Records, Hourly Energy Records, Community Battery Records, Simulation Run Records

**Designed and shown on ERD — planned for next development phases:**
User Records, Household Registration Records, Device Records, Device Telemetry Records, Cluster Analysis Records, Energy Transfer Records, Alert Records

**Figure reference:** Entity-Relationship Diagram — see `docs/solarkapitbahay-erd.png`

**Data sources feeding the database:**
- Static profiles: `data/csvmerged2 (1).txt` (Rural Davao, 15 households, 24 hourly rows)
- Live hardware: ESP32 nodes publishing to `solarkapitbahay/{device_id}/telemetry`
- Planning tool: Greedy simulation via `POST /api/simulation/run`

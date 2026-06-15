# CHAPTER 5 — SYSTEM DEVELOPMENT AND EMERGING TECHNOLOGY INTEGRATION

This chapter presents the system development procedures, emerging technology integration activities, and implementation workflows associated with the proposed SolarKapitBahay application. The discussion covers the development environment, Phase 1 algorithm implementation in Google Colab, backend and frontend development, database integration, K-means clustering for battery-action recommendations, IoT firmware and MQTT integration, cloud deployment, implemented system functionalities, and the challenges encountered during development. The implementation procedures described in this chapter were aligned with the Hybrid Agile-Scrum development framework and two-phase research methodology established in Chapters 3 and 4.

---

## 5.1 Development Environment

The proposed SolarKapitBahay application was developed through an integrated engineering environment combining web application development, cloud-hosted simulation, and embedded IoT technologies. The study utilized a full-stack software architecture in which the frontend, backend, database, and hardware demonstration components were developed concurrently across iterative sprints. This approach supported continuous refinement of algorithm behavior, dashboard usability, and hardware reliability throughout the implementation lifecycle.

The frontend development environment utilized React as the primary user interface framework, Vite as the build and development server, and Tailwind CSS for responsive layout and styling. The backend development environment utilized Python with the FastAPI framework and Uvicorn as the application server. Local data persistence was implemented through SQLite, while cloud deployment utilized PostgreSQL through Supabase when the database connection URL was configured in the deployment environment. Optional authentication was supported through Supabase Auth, with a demonstration login mode available for local testing and classroom presentations.

Phase 1 algorithm comparison was conducted in Google Colab using PuLP for linear programming optimization, together with NumPy, Pandas, and Matplotlib for numerical computation and visualization. Phase 2 firmware development for the two-household hardware demonstration utilized the ESP32 microcontroller programmed through the Arduino framework, with PubSubClient for MQTT communication and an I2C liquid crystal display for local sensor readout.

The major technological components integrated within the proposed system are summarized in Table 5.

**Table 5. Technological Components of SolarKapitBahay**

| Component | Purpose | Technology Utilized |
|-----------|---------|---------------------|
| Algorithm Comparison (Phase 1) | Compare Greedy, LP, and Hybrid; select winner via TOPSIS | Google Colab, PuLP, NumPy, Pandas |
| Community Simulation (Phase 2) | Planning tool for savings, fairness, and grid reduction | Python Greedy engine, FastAPI |
| Backend API | REST endpoints, MQTT bridge, clustering, simulation | FastAPI, Uvicorn, paho-mqtt |
| Frontend Dashboard | Operator and household user interfaces | React, Vite, Tailwind CSS |
| Database | Household profiles, hourly energy, simulation history | SQLite, Supabase PostgreSQL |
| Clustering Analytics | Battery-action recommendations for operators | Custom K-means (Python) |
| IoT Demonstration | Real-time solar sensing and peer energy sharing | ESP32, ACS712, MQTT, Mosquitto |
| Cloud Deployment | Persistent hosted demo | Vercel, Render, Supabase |

During local development, the React application was served on port 5173 and the FastAPI backend on port 8000. The development server proxied API requests so that the frontend and backend could be tested as a unified application. On backend startup, the system initialized the database, seeded household records from the rural Davao merged dataset when no records were present, and started the MQTT bridge for live ESP32 telemetry. Source code was maintained in a GitHub repository with separate directories for backend services, frontend pages, firmware sketches, simulation notebooks, datasets, and documentation, enabling parallel development across algorithm, API, dashboard, and hardware tasks throughout the Agile sprints described in Chapter 3.

---

## 5.2 Phase 1 Algorithm Implementation and Dataset Preparation

The study implemented and compared three energy allocation algorithms—Greedy, Linear Programming, and Hybrid—within Google Colab before embedding the selected algorithm in the Phase 2 application. This procedure ensured that algorithm selection was evidence-based and separated from dashboard development, consistent with the two-phase methodology of the study.

The simulation environment utilized Philippine-local inputs aligned with the rural Davao context. Solar generation was modeled from hourly irradiance statistics obtained through the Photovoltaic Geographical Information System for Davao City. Each simulation day sampled from hourly percentile bands to represent realistic day-to-day variability. Household demand was represented through synthetic rural load profiles with income-tier multipliers and random hourly variation, as granular meter-level consumption data for rural barangays is not publicly available. Time-of-use electricity rates were estimated from Davao Light monthly residential announcements using documented peak, mid-peak, and off-peak multipliers. A modeled 100 kilowatt-hour LiFePO₄ community battery with 92 percent round-trip efficiency and state-of-charge limits of 20 to 95 percent was used across all algorithm runs.

The Greedy algorithm matched surplus households to needy households by prioritizing the largest unmet need first and required no forecasting. The Linear Programming formulation maximized community sharing benefit subject to donor and receiver constraints and a fairness parameter requiring each needy household to receive at least 30 percent of its need from sharing when feasible. The Hybrid approach applied Linear Programming allocation each hour and then executed Greedy matching on any remaining surplus and unmet need. After peer-to-peer matching, a shared battery dispatch routine handled charging and discharging with time-of-use-aware rules.

Each algorithm was evaluated across multiple simulation runs and household scales ranging from small groups to one hundred households. Performance was measured using cost savings in Philippine pesos, grid reduction percentage, Gini coefficient for fairness, execution time, and hardware cost proxy for payback estimation. TOPSIS multi-criteria analysis ranked the three algorithms, and Greedy was selected as the overall winner for Phase 2 embedding. Colab outputs were exported as CSV and chart files for documentation in Chapter 6.

---

## 5.3 Backend API Development

The proposed SolarKapitBahay backend was implemented as a FastAPI application responsible for simulation execution, clustering analytics, live telemetry aggregation, household and dataset management, and optional user authentication. The backend served as the central integration layer between the React dashboards, the Colab-derived Greedy simulation engine, and the ESP32 MQTT data stream.

The Greedy simulation module was implemented to maintain parity with the Phase 1 Colab notebooks. When a barangay operator submitted a simulation request, the backend generated load and solar profiles, executed hourly peer-to-peer Greedy matching, applied shared battery dispatch, and computed cumulative savings, grid reduction, Gini coefficient, energy shared, payback estimate, and execution time. Results were returned to the Simulation page and stored in the simulation runs table for history and reproducibility. Only the Greedy algorithm was exposed through the web API in Phase 2; Linear Programming and Hybrid remained in Colab for the Phase 1 comparison.

The clustering module implemented an unsupervised K-means pipeline that grouped households by energy behavior and assigned Charge, Discharge, or Balanced battery-action indicators. The live telemetry module subscribed to MQTT topics from House A and House B, maintained the latest sensor readings in memory, detected online status, and recorded transfer events when a house entered a sending state. Dataset expansion from the rural Davao merged file and database access were handled through dedicated loader and persistence modules supporting both SQLite and PostgreSQL backends.

The backend exposed health and status endpoints, live telemetry, simulation execution and run history, clustering overview and per-household lookup, household listing, dataset metadata, and authentication routes when Supabase credentials were configured. Cross-origin access was restricted to approved development and deployment domains. This API architecture enabled the operator and household dashboards to consume a single consistent data source for planning, monitoring, and analytics.

---

## 5.4 Frontend Web Application Development

The proposed SolarKapitBahay user interface was developed as a responsive web application rather than a native mobile application, prioritizing accessibility for barangay operators and household members through standard browsers on laptops, tablets, and smartphones. The interface was organized into two role-based experiences: a full operator dashboard and a reduced household member portal.

The operator dashboard integrated six functional pages. The Dashboard page presented community metric tiles, a community battery visualization, a K-means scatter plot of all fifteen seeded households, and a clustering metrics panel reporting Silhouette score, inertia, and action counts. When ESP32 devices were online, House A and House B appeared as live overlay points on the same chart. The Simulation page allowed the operator to configure household count and battery capacity and run the Greedy planner, displaying savings, grid reduction, Gini coefficient, payback, execution time, and household comparison results. The Energy Transfer page presented live MQTT readings, device status, surplus sources, and transfer history. The Households page listed registered households with clustering-based battery-action indicators. Alerts and Settings pages supported operator monitoring and configuration.

The household member portal provided a personal dashboard with individual metric tiles, a battery-action indicator derived from clustering, a battery visualization, and savings charts. Members mapped to the live hardware demonstration through household identifiers HH-01 and HH-02 could view real-time solar wattage from the corresponding ESP32 circuit.

The frontend retrieved data through periodic API polling every two seconds for live telemetry and clustering updates. Shared interface components included scatter plots, metric panels, stat tiles, range sliders, cards, and transfer animation overlays. The interface emphasized clarity and usability for barangay stakeholders who may not have specialized technical training, consistent with the usability requirements defined in Chapter 3.

---

## 5.5 Database Integration and Cloud Synchronization

The proposed SolarKapitBahay application utilized relational database technologies to support barangay records, household profiles, hourly energy data, community battery metadata, simulation history, and user profiles. In local development, data was stored in an SQLite database file deployed alongside the backend. In cloud deployment, the same schema was applied to PostgreSQL on Supabase through an environment-configured connection string.

When the database contained no household records, an automated seeding procedure imported the rural Davao merged dataset. The source file contained twenty-four hourly rows with PVGIS-based solar power and Department of Energy-style load minimum and maximum bands. The seeding process expanded this template into fifteen household profiles with randomized load variation per hour and simulated hour-by-hour battery state of charge using a 1.5 kilowatt-hour household battery model. The result was three hundred sixty hourly energy records together with barangay, household, dataset, and community battery metadata.

Simulation runs were persisted on demand with full parameter and result records. Live MQTT readings were held in memory by the API bridge in the current implementation; persistent device telemetry, energy transfer logs, and alert records were documented in the target entity-relationship diagram as planned extensions. A manual re-seeding script was available to wipe and re-import Phase 1 tables when the source dataset was updated.

Cloud synchronization for the web application was achieved through Supabase PostgreSQL and optional Supabase Auth. The frontend on Vercel communicated with the backend on Render through a configured API base URL. This deployment model enabled demonstration data and simulation history to persist across sessions, supporting reproducible presentations and stakeholder review outside the laboratory environment.

---

## 5.6 K-Means Clustering and Battery Action Recommendation Integration

The proposed system integrated a battery-action recommendation workflow based on unsupervised K-means clustering. This component provided operator and household guidance separate from the Greedy peer-to-peer allocation algorithm used in simulation and hardware demonstration.

The clustering workflow began by loading hourly energy records from the database or merged dataset fallback. Records were aggregated per household into daily averages of net load, battery state of charge, and grid import. A three-dimensional feature vector was min-max normalized and clustered using K-means with three clusters and a fixed random seed for reproducibility. Cluster centroids were ranked by net load to assign Charge, Balanced, and Discharge actions consistent with domain logic for community battery coordination.

The operator dashboard displayed all households on a scatter plot with net load on the horizontal axis and battery state of charge on the vertical axis, together with clustering quality metrics. Household members received a single recommended action card on their dashboard. When ESP32 devices were online, live overlay points for House A and House B used rule-based actions from SURPLUS or DEFICIT status because K-means requires a larger sample than two live circuits.

The recommendation integration strengthened the practical applicability of the dashboard by translating raw energy profiles into actionable guidance for barangay operators and household members. The clustering module did not directly control ESP32 relays; it functioned as an analytics and decision-support layer aligned with the recommendation workflow described in Chapter 4.

---

## 5.7 IoT Firmware and MQTT Integration

The study integrated Internet of Things technologies through a two-household hardware demonstration validating low-cost ESP32 deployment for solar sensing and peer-to-peer energy sharing. Each household node measured solar voltage and current, classified local surplus or deficit, coordinated transfer with its neighbor over MQTT, and activated relay-controlled energy paths.

Each ESP32 performed ACS712 zero-point calibration at startup, then entered a continuous sensing loop. Voltage was read through a resistive divider; current was converted from the ACS712 output; wattage was computed as the product of voltage and current. Houses were classified as SURPLUS or DEFICIT based on panel voltage thresholds. Relay modules controlled the local load path and the transfer path when surplus and neighbor-deficit conditions were simultaneously satisfied. Peer status was exchanged through MQTT subscription to the neighbor’s status and transfer topics.

Telemetry was published approximately every second to topics under the solar/A and solar/B prefixes for voltage, current, wattage, status, and transfer state. A 16×2 I2C display on each node showed live readings for laboratory verification. The laptop hosted the Mosquitto MQTT broker and the FastAPI bridge, which subscribed to all solar topics and exposed aggregated readings to the web dashboard.

Greedy-style transfer logic was executed on the ESP32 rather than on the central server, validating hardware-aware algorithm deployment described in Chapter 3. The backend provided monitoring and visualization only and did not publish relay commands in the current build. Measured battery state of charge and true household load were identified as planned enhancements requiring additional sensors.

---

## 5.8 Cloud Deployment and Emerging Technology Integration

The proposed system was deployed to a cloud environment to support persistent demonstrations beyond the laboratory laptop. Vercel hosted the production React build. Render hosted the FastAPI backend using an automated blueprint configuration. Supabase provided managed PostgreSQL for durable storage of seeded household data and simulation run history.

Emerging technologies integrated within SolarKapitBahay included peer-to-peer energy allocation algorithms, unsupervised machine learning for household clustering, IoT edge sensing with MQTT messaging, cloud-backed relational storage, and responsive web dashboards for community energy management. These technologies collectively supported the study objective of demonstrating feasible community solar-battery sharing in a rural Philippine barangay context using affordable hardware and accessible software tools.

The health endpoint reported database connectivity, household count, MQTT bridge status, and deployment mode. First cloud startup automatically seeded the fifteen-household dataset. Render free-tier hosting introduced cold-start latency on the first request after idle periods, which was documented for demonstration presenters. An alternative single-domain deployment through Vercel Services was supported when available on the developer account.

---

## 5.9 System Features and Functionalities

The completed Phase 2 application delivered community energy planning, live monitoring, household analytics, and role-based access within a single web platform.

The simulation planner enabled barangay operators to configure community size and battery capacity and execute the Greedy algorithm against Philippine-local load and solar models. Results included monetary savings, grid dependence reduction, fairness as measured by the Gini coefficient, estimated payback based on ESP32 hardware cost, and execution time, with runs saved for later review.

Real-time IoT tracking covered House A and House B through MQTT ingestion and two-second dashboard polling. Operators could observe surplus and deficit status, device online state, and transfer history when hardware sharing occurred between the two demonstration circuits.

Household energy tracking covered fifteen barangay profiles from the seeded merged dataset. Operators viewed all households on a clustering scatter plot with Charge, Discharge, and Balanced coloring. Household members viewed personal battery-action recommendations. The Households page supported registration approval at the interface level.

Authentication supported Supabase when configured, with separate operator and household portals. A demonstration login remained available for local and classroom use without cloud credentials.

Future enhancements identified during development included persistent MQTT telemetry storage, Sankey energy-flow visualizations, remote manual relay control from the dashboard, measured load and battery sensors on ESP32 nodes, and fully database-backed household registration.

---

## 5.10 Challenges Encountered During Development

Several challenges arose during implementation and shaped the final scope and documentation of the proposed system.

The first challenge involved data availability. Granular hourly household consumption data for rural Davao barangays is not publicly accessible at the level required for direct meter-based simulation. The researchers addressed this by constructing synthetic profiles from documented load bands and PVGIS solar statistics and by stating this limitation in the scope of the study.

A second challenge involved electricity tariff structure. Davao Light publishes monthly blended residential rates but not official hourly time-of-use schedules. Estimated peak, mid-peak, and off-peak rates were derived from the monthly average and wholesale market patterns, requiring careful documentation so results would not be misrepresented as official utility tariffs.

On the hardware side, ESP32 analog pin behavior and ACS712 zero drift produced unreliable early readings. An analog pin identification procedure and startup calibration routine were added to the firmware. MQTT connectivity failed whenever the laptop network address changed, requiring broker IP updates in both House sketches during laboratory sessions.

Architecturally, the researchers maintained a clear separation between Greedy allocation for simulation and hardware sharing and K-means clustering for operator and household indicators. Initial manuscript drafts conflated these roles and described central-server relay control that was not implemented; Chapter 4 and the IoT architecture figure were revised to match the implemented edge-Greedy and monitoring-only backend design.

Backend scope was deliberately limited to Greedy in the web API to preserve speed and ESP32-class deployability. Linear Programming and Hybrid remained in Colab, consistent with the two-phase methodology. Live dashboard metrics mixed real MQTT sensor values with placeholder community totals until cumulative accounting and battery sensing are completed.

These challenges were documented to preserve transparency and to support reproducible interpretation of the results presented in Chapter 6.

---

## Suggested figures for Chapter 5

Figure 5.1 may present the development technology stack from Google Colab through FastAPI and React to ESP32. Figure 5.2 may present the backend module relationships and primary API workflow. Figure 5.3 may present MQTT data flow from ESP32 through Mosquitto to the dashboard. Figure 5.4 may present screenshots of the Simulation page, operator Dashboard, Energy Transfer page, and household member dashboard. Figure 5.5 may present the cloud deployment architecture with Vercel, Render, and Supabase.

---

*Reference basis: ADET M1 Manuscript Guide (DurTect sample), Mapúa Malayan Colleges Mindanao. Adjust figure and table numbers to match the thesis document.*

# ADET M1 Manuscript Reference (Internal)

**Source:** [ADET M1 Manuscript Guide.pdf](https://drive.google.com/file/d/1MgX8bJ4qMfDzWDtk2e73tlriusPQJx23/view?usp=sharing)  
**Sample project in guide:** *DurTect* — YOLOv5 / Roboflow / Firebase / Android  
**Our project:** *SolarKapitBahay* — Greedy/LP/Hybrid + React/FastAPI/ESP32/MQTT

Use this guide for **tone, structure, and section depth** — not for copying DurTect’s technologies.

---

## Writing style (from DurTect sample)

- Open each chapter with a summary paragraph listing what the chapter covers.
- Prefer **“The proposed [system] utilized…”** / **“The study implemented…”** over dev README tone.
- Minimize file paths and code identifiers in thesis prose; name **technologies and components**.
- Include **tables** for technological components, use cases, database entities where appropriate.
- Reference figures: *“As presented in Figure X…”* / *“Figure X presents…”*
- Tie implementation back to **Agile framework** (Ch. 3) and **IPO/architecture** (Ch. 4).
- End Ch. 5 with **Challenges Encountered During Development**.
- Frame work under **Applications Development and Emerging Technologies (ADET)**.

---

## Chapter structure comparison

| DurTect (guide) | SolarKapitBahay (ours) |
|-----------------|------------------------|
| Ch. 5.2 Roboflow annotation | 5.2 Phase 1 Colab + algorithms |
| Ch. 5.4 YOLOv5 | 5.3 Backend API + Greedy |
| Ch. 5.5 PyTorch | (merged into 5.2 / 5.3) |
| Ch. 5.6 Firebase | 5.5 Database + Supabase |
| Ch. 5.7 Android mobile | 5.4 React **web** dashboard |
| Ch. 5.8 Recommendation | 5.6 K-means battery actions |
| — | 5.7 IoT + MQTT |
| — | 5.8 Cloud deployment |

**Note:** DurTect Ch. 5 body in the PDF is **outline only** (“This section is for Module 2”). Our Ch. 4 + Ch. 5 prose should follow the **completed Ch. 4 DurTect style**.

---

## Ch. 6 mapping (replace YOLO metrics)

| DurTect Ch. 6 | SolarKapitBahay Ch. 6 |
|---------------|------------------------|
| 6.1 Precision, Recall, mAP | 6.1 Phase 1 algorithm comparison + TOPSIS |
| 6.2 Object detection results | 6.2 Greedy simulation results (web app) |
| 6.3 Recommendation results | 6.3 K-means clustering evaluation |
| 6.4 UAT | 6.4 IoT demo + optional UAT |
| 6.5 ISO quality | 6.5 ISO quality (same six criteria) |

---

## Key files for thesis alignment

- Chapter 5 draft: `docs/CHAPTER_5.md`
- Clustering: `docs/CLUSTERING.md`
- Database ERD: `docs/solarkapitbahay-erd.png`
- Deploy: `docs/DEPLOY_DEMO.md`
- Live demo: `firmware/esp32/DEMO_LIVE_UI.md`

---

*Last synced: June 2026*

"""Seed the database from data/csvmerged2 (1).txt.

Usage:
    python seed_db.py          # seed only if empty
    python seed_db.py --force    # wipe and re-seed Phase 1 tables
"""

import argparse
import json
import sys

from database import db_status, get_active_dataset, household_count, init_db, list_households, seed_database
from db_backend import DB_PATH, DATABASE_URL


def main() -> int:
    parser = argparse.ArgumentParser(description="Seed SolarKapitBahay database from Davao dataset")
    parser.add_argument("--force", action="store_true", help="Delete existing Phase 1 data and re-seed")
    args = parser.parse_args()

    init_db()
    result = seed_database(force=args.force)

    status = db_status()
    target = DATABASE_URL.split("@")[-1] if DATABASE_URL else str(DB_PATH)
    print(f"Database ({status['database']}): {target}")
    print(json.dumps(result, indent=2))

    if result.get("seeded") or household_count() > 0:
        dataset = get_active_dataset()
        households = list_households()
        print(f"\nActive dataset: {dataset['dataset_id'] if dataset else 'none'}")
        print(f"Households ({len(households)}):")
        for hh in households[:5]:
            print(f"  {hh['id']} — {hh['head_name']} ({hh['purok']})")
        if len(households) > 5:
            print(f"  ... and {len(households) - 5} more")

    return 0


if __name__ == "__main__":
    sys.exit(main())

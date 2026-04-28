"""
Paper-style demo evaluation:
- Generates 200 synthetic user profiles
- Runs Tier-1/Tier-2 recommendation logic checks
- Reports aggregate metrics for demo/research appendix
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass
from pathlib import Path


@dataclass
class Profile:
    dietary_preference: str
    goal: str
    bmi_category: str
    remaining_calories: int
    remaining_protein: int
    conditions: list[str]


MEALS = [
    {"name": "Moong Dal Chilla", "calories": 220, "protein": 14, "tags": ["low-gi", "high-fibre"], "diet": ["vegetarian", "vegan", "eggetarian"]},
    {"name": "Paneer Bhurji", "calories": 280, "protein": 18, "tags": ["high-protein"], "diet": ["vegetarian", "eggetarian"]},
    {"name": "Sprouts Salad", "calories": 170, "protein": 11, "tags": ["low-gi", "high-fibre"], "diet": ["vegetarian", "vegan", "eggetarian"]},
    {"name": "Chicken Salad", "calories": 210, "protein": 25, "tags": ["light", "high-protein"], "diet": ["non-vegetarian"]},
]


def recommend(p: Profile):
    tier1 = []
    for meal in MEALS:
        if p.dietary_preference not in meal["diet"]:
            continue
        if "diabetes" in p.conditions and "low-gi" not in meal["tags"]:
            continue
        if "obesity" in p.conditions and meal["calories"] > 320:
            continue
        if meal["calories"] > p.remaining_calories + 120:
            continue
        tier1.append(meal)

    ranked = sorted(
        tier1,
        key=lambda m: (
            -abs(p.remaining_calories - m["calories"]),
            m["protein"],
        ),
    )
    return ranked[:3]


def synth_profile() -> Profile:
    return Profile(
        dietary_preference=random.choice(["vegetarian", "vegan", "eggetarian", "non-vegetarian"]),
        goal=random.choice(["lose", "maintain", "gain"]),
        bmi_category=random.choice(["Underweight", "Normal", "Overweight", "Obese"]),
        remaining_calories=random.randint(180, 700),
        remaining_protein=random.randint(10, 80),
        conditions=random.sample(["diabetes", "hypertension", "obesity"], k=random.randint(0, 2)),
    )


def main():
    random.seed(42)
    profiles = [synth_profile() for _ in range(200)]
    total = len(profiles)
    got_any = 0
    compliant = 0
    avg_candidates = 0

    for p in profiles:
        recs = recommend(p)
        if recs:
            got_any += 1
        avg_candidates += len(recs)
        violation = any("diabetes" in p.conditions and "low-gi" not in r["tags"] for r in recs)
        if not violation:
            compliant += 1

    summary = {
        "profiles_evaluated": total,
        "coverage_percent": round(got_any * 100 / total, 2),
        "constraint_compliance_percent": round(compliant * 100 / total, 2),
        "avg_recommendations_per_profile": round(avg_candidates / total, 2),
        "note": "Demo evaluation pipeline; replace with full experiment outputs for final paper submission.",
    }

    out = Path("evaluation_summary.json")
    out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    print(f"saved {out.resolve()}")


if __name__ == "__main__":
    main()


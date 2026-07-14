from typing import List
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)

@dataclass
class Recommendation:
    id: str
    priority: str
    action: str
    component: str
    eta: str
    description: str

class RecommendationEngine:
    def generate(self, prediction: dict) -> List[Recommendation]:
        recs = []
        bearing_wear = prediction.get("bearing_wear", 0)
        overheat_risk = prediction.get("overheat_risk", 0)
        failure_risk = prediction.get("failure_risk", 0)
        rul_hours = prediction.get("rul_hours", 0)

        if bearing_wear > 70:
            recs.append(Recommendation("rec-bearing", "high", "Replace bearings", "Bearing Assembly", f"{max(1, round(rul_hours * 0.01))} days", "Bearing wear exceeds 70%. Schedule replacement to prevent failure."))
        elif bearing_wear > 40:
            recs.append(Recommendation("rec-bearing-monitor", "medium", "Monitor bearings", "Bearing Assembly", f"{round(rul_hours * 0.02)} days", "Bearing wear moderate. Increase monitoring frequency."))

        if overheat_risk > 70:
            recs.append(Recommendation("rec-cooling", "high", "Inspect cooling system", "Cooling System", "7 days", "Overheat risk high. Check coolant levels and fan operation."))

        if failure_risk > 60:
            recs.append(Recommendation("rec-inspect", "high", "Full inspection", "All Systems", "3 days", "Failure risk critical. Schedule comprehensive maintenance inspection."))

        if not recs:
            recs.append(Recommendation("rec-routine", "low", "Routine check", "General", "30 days", "All parameters normal. Continue regular maintenance schedule."))

        return recs

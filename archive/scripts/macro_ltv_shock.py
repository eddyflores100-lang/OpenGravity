import math

class PredictiveEngineV2:
    WEIGHT_LTVCAC = 0.70
    WEIGHT_GROWTH = 2.5
    WEIGHT_RUNWAY = 0.50
    WEIGHT_INTERACTION = 3.0
    WEIGHT_BURN = 1.5
    BIAS = 1.8

    @classmethod
    def evaluate(cls, name, ltv, growth, runway, zirp, sector="B2B SaaS"):
        # Adjust for Macro
        cal = {"bias_adj": 0.0, "ltv_weight_adj": 1.0, "growth_weight_adj": 1.0, "runway_weight_adj": 1.0}
        
        weight_ltv = cls.WEIGHT_LTVCAC
        weight_growth = cls.WEIGHT_GROWTH
        weight_runway = cls.WEIGHT_RUNWAY
        
        macro_factor = max(1.0, zirp / 2.0)
        current_bias = cls.BIAS
        
        if zirp > 3.0:
            weight_runway *= (1.5 * macro_factor)
            weight_growth *= (0.5 / macro_factor)
            current_bias += (zirp * 0.2)

        # Normalize metrics
        ltv_norm = max(0, min(20, ltv))
        growth_norm = math.log1p(max(-0.5, min(2.0, growth / 100.0)))
        runway_norm = max(1, runway)
        
        prior_logit = -1.386
        interaction = ltv_norm * growth_norm
        runway_signal = math.log(runway_norm / 12.0)
        burn_penalty = cls.WEIGHT_BURN if (growth_norm > 0.40 and ltv_norm < 1.5) else 0.0

        logit = (
            prior_logit
            + (ltv_norm * weight_ltv)
            + (growth_norm * weight_growth)
            + (runway_signal * weight_runway)
            + (interaction * cls.WEIGHT_INTERACTION)
            - burn_penalty
            - current_bias
        )
        
        prob = 1.0 / (1.0 + math.exp(-logit))
        
        status = "REVIEW"
        if prob > 0.60: status = "WINNER"
        elif prob < 0.25: status = "DROP"
        
        return {
            "month": name,
            "prob": round(prob, 4),
            "status": status,
            "metrics": {"ltv": ltv, "growth": growth, "runway": runway, "zirp": zirp}
        }

# --- SIMULATION: HyperGrowth Corp Sequential Audit ---
print("PHASE 2: MACRO SHOCK & LTV DROP SIMULATION\n")
print("| Mes | LTV/CAC | Growth | Runway | ZIRP | Prob | Status |")
print("| --- | --- | --- | --- | --- | --- | --- |")

# Month 0: 2021 Paradise
m0 = PredictiveEngineV2.evaluate("Mes 0 (ZIRP)", 5.0, 100, 6, 1.0)
print(f"| 0 | {m0['metrics']['ltv']} | {m0['metrics']['growth']}% | {m0['metrics']['runway']} | {m0['metrics']['zirp']} | {m0['prob']*100}% | {m0['status']} |")

# Month 1: 2023 Shock Start (Rates jump to 5.25%, LTV drops 20%)
m1 = PredictiveEngineV2.evaluate("Mes 1 (Shock)", 4.0, 80, 5, 5.25)
print(f"| 1 | {m1['metrics']['ltv']} | {m1['metrics']['growth']}% | {m1['metrics']['runway']} | {m1['metrics']['zirp']} | {m1['prob']*100}% | {m1['status']} |")

# Month 2: Continued Bleed (LTV drops another 20%, Runway thinning)
m2 = PredictiveEngineV2.evaluate("Mes 2 (Bleed)", 3.2, 50, 4, 5.25)
print(f"| 2 | {m2['metrics']['ltv']} | {m2['metrics']['growth']}% | {m2['metrics']['runway']} | {m2['metrics']['zirp']} | {m2['prob']*100}% | {m2['status']} |")

# Month 3: Critical Point
m3 = PredictiveEngineV2.evaluate("Mes 3 (Terminal)", 2.5, 20, 3, 5.25)
print(f"| 3 | {m3['metrics']['ltv']} | {m3['metrics']['growth']}% | {m3['metrics']['runway']} | {m3['metrics']['zirp']} | {m3['prob']*100}% | {m3['status']} |")

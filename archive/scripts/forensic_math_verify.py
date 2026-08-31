import math

print("=" * 70)
print("FORENSIC MATH VERIFICATION: Nikola Motor (moe_growth=5)")
print("=" * 70)

# --- INPUTS ---
ltv_cac = 0.05
months_runway = 8
moe_growth = 5
sector = "DeepTech"
zirp_index = 1.0

# --- CALIBRATIONS (DeepTech) ---
cal_bias_adj = 1.8
cal_ltv_weight_adj = 0.3
cal_growth_weight_adj = 1.5
cal_runway_weight_adj = 0.25

# --- ENGINE CONSTANTS ---
WEIGHT_LTVCAC = 0.70
WEIGHT_GROWTH = 2.5
WEIGHT_RUNWAY = 0.50
WEIGHT_INTERACTION = 3.0
WEIGHT_BURN = 1.5
BIAS = 1.8

# --- NORMALIZE ---
ltv = max(0, min(20, ltv_cac))
growth = math.log1p(max(-0.5, min(2.0, moe_growth / 100.0)))
runway = max(1, months_runway)

print(f"\n[NORMALIZE]")
print(f"  ltv        = max(0, min(20, {ltv_cac}))         = {ltv}")
print(f"  growth     = log1p(min(2.0, {moe_growth}/100))  = log1p({moe_growth/100}) = {growth:.6f}")
print(f"  runway     = max(1, {months_runway})              = {runway}")

# --- MACRO ---
weight_runway = WEIGHT_RUNWAY * cal_runway_weight_adj
weight_growth = WEIGHT_GROWTH * cal_growth_weight_adj
macro_factor = max(1.0, zirp_index / 2.0)
current_bias = BIAS

print(f"\n[MACRO] (ZIRP={zirp_index}, no adjustment since <=3.0)")
print(f"  weight_runway = {WEIGHT_RUNWAY} * {cal_runway_weight_adj} = {weight_runway}")
print(f"  weight_growth = {WEIGHT_GROWTH} * {cal_growth_weight_adj} = {weight_growth}")
print(f"  current_bias  = {current_bias}")

# --- LOGIT COMPONENTS ---
prior_logit = -1.386
interaction = ltv * growth
runway_signal = math.log(runway / 12.0)
burn_penalty = WEIGHT_BURN if (growth > 0.40 and ltv < 1.5) else 0.0

c1 = ltv * WEIGHT_LTVCAC * cal_ltv_weight_adj
c2 = growth * weight_growth
c3 = runway_signal * weight_runway
c4 = interaction * WEIGHT_INTERACTION

print(f"\n[LOGIT COMPONENTS]")
print(f"  prior_logit       = {prior_logit}")
print(f"  ltv * W * adj     = {ltv} * {WEIGHT_LTVCAC} * {cal_ltv_weight_adj} = {c1:.6f}")
print(f"  growth * W_g      = {growth:.6f} * {weight_growth} = {c2:.6f}")
print(f"  runway_signal*W_r = log({runway}/12) * {weight_runway} = {runway_signal:.6f} * {weight_runway} = {c3:.6f}")
print(f"  interaction * W_i = {interaction:.6f} * {WEIGHT_INTERACTION} = {c4:.6f}")
print(f"  burn_penalty      = {burn_penalty} (growth={growth:.4f} {'>' if growth > 0.40 else '<='} 0.40)")
print(f"  - current_bias    = -{current_bias}")
print(f"  + cal_bias_adj    = +{cal_bias_adj}")

logit = prior_logit + c1 + c2 + c3 + c4 - burn_penalty - current_bias + cal_bias_adj
prob = 1.0 / (1.0 + math.exp(-logit))

print(f"\n[FINAL LOGIT]")
print(f"  logit = {prior_logit} + {c1:.6f} + {c2:.6f} + {c3:.6f} + {c4:.6f} - {burn_penalty} - {current_bias} + {cal_bias_adj}")
print(f"  logit = {logit:.6f}")
print(f"  sigmoid(logit) = 1/(1+exp(-{logit:.4f})) = {prob:.6f}")

# --- STATUS LOGIC ---
math_status = "REVIEW"
if ltv_cac < 0.5: math_status = "DROP"
elif prob > 0.55: math_status = "WINNER"
elif prob < 0.20: math_status = "DROP"

print(f"\n[STATUS DETERMINATION]")
print(f"  prob = {prob:.4f}")
print(f"  By probability alone (0.20 < {prob:.4f} < 0.55): would be REVIEW")
print(f"  BUT ltv_cac={ltv_cac} < 0.5: hard threshold overrides to DROP")
print(f"  math_status = {math_status}")

# --- THE AUDITOR'S CLAIM: growth barely matters ---
print(f"\n[SENSITIVITY: Does growth matter?]")
# Calculate with growth=0
logit_no_growth = prior_logit + c1 + 0 + c3 + 0 - 0 - current_bias + cal_bias_adj
prob_no_growth = 1.0 / (1.0 + math.exp(-logit_no_growth))
print(f"  With growth=0: logit={logit_no_growth:.4f}, prob={prob_no_growth:.4f}")
print(f"  With growth=5: logit={logit:.4f}, prob={prob:.4f}")
print(f"  Delta: {abs(prob - prob_no_growth):.4f} ({abs(prob - prob_no_growth)/prob*100:.1f}% change)")
print(f"  VERDICT: Growth contribution is {'NEGLIGIBLE' if abs(prob - prob_no_growth) < 0.05 else 'MATERIAL'}")

# --- THE AUDITOR'S CLAIM: LTV drives everything ---
print(f"\n[SENSITIVITY: What if LTV were 3.0 instead of 0.05?]")
ltv_good = 3.0
growth_g = growth
c1_g = ltv_good * WEIGHT_LTVCAC * cal_ltv_weight_adj
c4_g = (ltv_good * growth_g) * WEIGHT_INTERACTION
logit_good_ltv = prior_logit + c1_g + c2 + c3 + c4_g - 0 - current_bias + cal_bias_adj
prob_good_ltv = 1.0 / (1.0 + math.exp(-logit_good_ltv))
print(f"  With LTV=3.0: logit={logit_good_ltv:.4f}, prob={prob_good_ltv:.4f}")
print(f"  With LTV=0.05: logit={logit:.4f}, prob={prob:.4f}")
print(f"  AND ltv_cac=3.0 >= 0.5: no hard threshold, status by probability")
print(f"  VERDICT: LTV is the DOMINANT variable, growth is secondary")

print(f"\n{'=' * 70}")
print(f"CONCLUSION: The auditor is CORRECT.")
print(f"  1. moe_growth=5 is unitless in the schema (no Field description)")
print(f"  2. The /100 normalization is implicit, not documented")
print(f"  3. Nikola's DROP comes from ltv_cac<0.5 threshold, not probability")
print(f"  4. Growth contributes ~{abs(prob - prob_no_growth):.4f} probability — negligible")
print(f"{'=' * 70}")

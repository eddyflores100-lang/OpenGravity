import json, statistics

with open('ground_truth_v1.json') as f:
    data = json.load(f)

# Separate by outcome
o1 = [e for e in data if e['outcome'] == 1]
o0 = [e for e in data if e['outcome'] == 0]

print(f"Total records: {len(data)}")
print(f"Outcome=1: {len(o1)} ({len(o1)/len(data)*100:.1f}%)")
print(f"Outcome=0: {len(o0)} ({len(o0)/len(data)*100:.1f}%)")

# LTV/CAC distribution by outcome
ltv_1 = [e['inputs']['ltv_cac'] for e in o1]
ltv_0 = [e['inputs']['ltv_cac'] for e in o0]

print(f"\n=== LTV/CAC by Outcome ===")
print(f"Outcome=1: mean={statistics.mean(ltv_1):.2f}, median={statistics.median(ltv_1):.2f}, min={min(ltv_1):.2f}, max={max(ltv_1):.2f}")
print(f"Outcome=0: mean={statistics.mean(ltv_0):.2f}, median={statistics.median(ltv_0):.2f}, min={min(ltv_0):.2f}, max={max(ltv_0):.2f}")

# Capital distribution
cap_1 = [e['inputs']['initialCapital'] for e in o1]
cap_0 = [e['inputs']['initialCapital'] for e in o0]

print(f"\n=== Initial Capital by Outcome ===")
print(f"Outcome=1: mean={statistics.mean(cap_1):,.0f}, median={statistics.median(cap_1):,.0f}")
print(f"Outcome=0: mean={statistics.mean(cap_0):,.0f}, median={statistics.median(cap_0):,.0f}")

# Revenue distribution
rev_1 = [e['inputs']['monthlyRevenue'] for e in o1]
rev_0 = [e['inputs']['monthlyRevenue'] for e in o0]

print(f"\n=== Monthly Revenue by Outcome ===")
print(f"Outcome=1: mean={statistics.mean(rev_1):,.0f}, median={statistics.median(rev_1):,.0f}")
print(f"Outcome=0: mean={statistics.mean(rev_0):,.0f}, median={statistics.median(rev_0):,.0f}")

# OpEx distribution
opex_1 = [e['inputs']['fixedOpEx'] for e in o1]
opex_0 = [e['inputs']['fixedOpEx'] for e in o0]

print(f"\n=== Fixed OpEx by Outcome ===")
print(f"Outcome=1: mean={statistics.mean(opex_1):,.0f}, median={statistics.median(opex_1):,.0f}")
print(f"Outcome=0: mean={statistics.mean(opex_0):,.0f}, median={statistics.median(opex_0):,.0f}")

# Derived: burn rate & runway
print(f"\n=== Derived Metrics ===")
for label, subset in [('Outcome=1', o1), ('Outcome=0', o0)]:
    runways = []
    for e in subset:
        burn = e['inputs']['fixedOpEx'] - e['inputs']['monthlyRevenue']
        if burn > 0:
            runways.append(e['inputs']['initialCapital'] / burn)
        else:
            runways.append(36)
    print(f"{label}: mean_runway={statistics.mean(runways):.1f}mo, median={statistics.median(runways):.1f}mo")

# The smoking gun: LTV buckets vs outcome
print(f"\n=== SMOKING GUN: LTV Buckets vs Outcome ===")
print(f"{'LTV Range':>15} | {'Count':>5} | {'Outcome=1':>9} | {'Outcome=0':>9} | {'Survival%':>9}")
print(f"{'-'*15}-+-{'-'*5}-+-{'-'*9}-+-{'-'*9}-+-{'-'*9}")
for lo, hi in [(0,1),(1,2),(2,3),(3,4),(4,5),(5,7),(7,10),(10,100)]:
    bucket = [e for e in data if lo <= e['inputs']['ltv_cac'] < hi]
    if bucket:
        surv = sum(1 for e in bucket if e['outcome']==1)
        fail = sum(1 for e in bucket if e['outcome']==0)
        print(f"{lo}-{hi}:".rjust(15) + f" | {len(bucket):>5} | {surv:>9} | {fail:>9} | {surv/len(bucket)*100:>8.1f}%")

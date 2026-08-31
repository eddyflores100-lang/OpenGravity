import json

def pool_adjacent_violators(y_actual, y_pred):
    """Pure Python implementation of Isotonic Regression (PAVA algorithm)"""
    # Sort by predicted probability
    data = sorted(zip(y_pred, y_actual), key=lambda x: x[0])
    x = [d[0] for d in data]
    y = [d[1] for d in data]
    
    n = len(y)
    weights = [1] * n
    values = list(y)
    blocks = [[i] for i in range(n)]
    
    while True:
        violator_found = False
        for i in range(len(values) - 1):
            if values[i] > values[i+1]:
                # Merge the two blocks
                weight1 = weights[i]
                weight2 = weights[i+1]
                new_weight = weight1 + weight2
                new_value = (values[i] * weight1 + values[i+1] * weight2) / new_weight
                
                values[i] = new_value
                weights[i] = new_weight
                blocks[i].extend(blocks[i+1])
                
                del values[i+1]
                del weights[i+1]
                del blocks[i+1]
                
                violator_found = True
                break
        if not violator_found:
            break
            
    # Unpack back to original length
    y_isotonic = [0] * n
    for val, blk in zip(values, blocks):
        for idx in blk:
            y_isotonic[idx] = val
            
    # Compress to unique points for interpolation mapping
    unique_points = {}
    for xi, yi in zip(x, y_isotonic):
        unique_points[xi] = yi
        
    sorted_unique_x = sorted(unique_points.keys())
    mapping = [[float(xi), float(unique_points[xi])] for xi in sorted_unique_x]
    
    # Ensure 0 and 1 boundaries exist
    if mapping[0][0] > 0.0:
        mapping.insert(0, [0.0, mapping[0][1]])
    if mapping[-1][0] < 1.0:
        mapping.append([1.0, mapping[-1][1]])
        
    return mapping

if __name__ == "__main__":
    print("Training Isotonic Calibrator...")
    
    # We need to compute raw probabilities BEFORE isotonic, BUT AFTER prior shift!
    # Let's import the engine to get true uncalibrated probs
    from v10_orchestrator import BayesianEngine, ScoreRequest
    
    with open('ground_truth_v1.json') as f:
        data = json.load(f)
        
    raw_probs = []
    actuals = []
    
    for entry in data:
        inp = entry["inputs"]
        ltv_cac = inp["ltv_cac"]
        fixed_opex = inp.get("fixedOpEx", 10000)
        monthly_revenue = inp.get("monthlyRevenue", 0)
        initial_capital = inp.get("initialCapital", 50000)
        
        net_burn = fixed_opex - monthly_revenue
        months_runway = initial_capital / net_burn if net_burn > 0 else 36
        moe_growth = max(0, (monthly_revenue / max(1, fixed_opex)) * 100)
        
        req = ScoreRequest(
            startup_name="GT",
            ltv_cac=ltv_cac,
            months_runway=months_runway,
            moe_growth=moe_growth,
            sector="B2B SaaS",
            zirp_index=1.0
        )
        
        bayesian = BayesianEngine.compute(req)
        raw_probs.append(bayesian["probability_raw"])
        actuals.append(entry["outcome"])
        
    mapping = pool_adjacent_violators(actuals, raw_probs)
    
    with open("isotonic_map.json", "w") as f:
        json.dump(mapping, f, indent=2)
        
    print(f"Isotonic mapping created with {len(mapping)} anchor points.")

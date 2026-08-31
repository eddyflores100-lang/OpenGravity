import { computePosterior, applyDecisionPolicy } from './open-gravity-ui/src/lib/prediction_synthesizer.ts';

const a5 = { id: 'A5', inputs: { ltv_cac: 6.5, runway: 14, growth_rate: (80 / 100) * 0.2 } };
const post = computePosterior(0.1, a5);
const dec = applyDecisionPolicy(post, a5);

console.log("=== TRACE CASE A5 ===");
console.log("Inputs:", a5.inputs);
console.log("Posterior:", post);
console.log("Verdict:", dec);

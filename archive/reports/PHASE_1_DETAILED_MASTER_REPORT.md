# 🌌 OpenGravity V10.2: Institutional Stress Test Full Report

> **Timestamp**: 2026-04-13T19:55:36.508Z
> **Cohort Size**: 200 companies

## 📐 Mathematical Framework (Bayesian Logit Model V10.2)
The engine evaluates startups using a multi-calibrated logit function:

```math
logit = β₀ + (LTV/CAC * w₁) + (ln(Growth) * w₂) + (ln(Runway/12) * w₃) + (Interaction * w₄) - Bias + Adj
```
- **Baseline Prior (β₀)**: -1.386 (Approx 20% natural success rate)
- **Interaction**: `LTV/CAC * ln(Growth)` — Detects efficiency at scale.
- **Bias**: 1.8 (Hardening factor for institutional grade filtering).

### ⚡ Sector Calibrations
| Sector | Bias Adj | LTV Weight | Growth Weight | Runway Weight |
| :--- | :---: | :---: | :---: | :---: |
| B2B SaaS | 0.0 | 1.0x | 1.0x | 1.0x |
| DeepTech | +1.2 | 0.4x | 1.0x | 0.3x |
| Cockroach| +0.8 | 1.0x | 0.2x | 1.0x |

## 📊 Full Cohort Results
| ID | Name | Sector | P(Success) | Status |
| :--- | :--- | :--- | :---: | :--- |
| 1 | SpaceX (2008) | DeepTech | **13.68%** | DROP |
| 2 | Anduril (2018) | DeepTech | **69.49%** | WINNER |
| 3 | Rivian (early) | Hardware | **95.11%** | WINNER |
| 4 | Mailchimp (2010) | Cockroach | **99.96%** | WINNER |
| 5 | Zapier (2012) | Cockroach | **100.00%** | WINNER |
| 6 | Theranos (2014) | HealthTech | **1.00%** | DROP (Red Team Override) |
| 7 | FTX (2021) | Crypto | **1.00%** | DROP (Red Team Override) |
| 8 | Startup_CJS_0 | DeepTech | **100.00%** | WINNER |
| 9 | Startup_CJS_1 | Cockroach | **99.98%** | WINNER |
| 10 | Startup_CJS_2 | B2B SaaS | **100.00%** | WINNER |
| 11 | Startup_CJS_3 | B2B SaaS | **100.00%** | WINNER |
| 12 | Startup_CJS_4 | DeepTech | **83.25%** | WINNER |
| 13 | Startup_CJS_5 | Cockroach | **99.78%** | WINNER |
| 14 | Startup_CJS_6 | B2B SaaS | **99.99%** | WINNER |
| 15 | Startup_CJS_7 | B2B SaaS | **100.00%** | WINNER |
| 16 | Startup_CJS_8 | DeepTech | **100.00%** | WINNER |
| 17 | Startup_CJS_9 | Cockroach | **99.97%** | WINNER |
| 18 | Startup_CJS_10 | B2B SaaS | **99.00%** | WINNER |
| 19 | Startup_CJS_11 | B2B SaaS | **100.00%** | WINNER |
| 20 | Startup_CJS_12 | DeepTech | **99.77%** | WINNER |
| 21 | Startup_CJS_13 | Cockroach | **99.99%** | WINNER |
| 22 | Startup_CJS_14 | B2B SaaS | **99.98%** | WINNER |
| 23 | Startup_CJS_15 | B2B SaaS | **98.09%** | WINNER |
| 24 | Startup_CJS_16 | DeepTech | **100.00%** | WINNER |
| 25 | Startup_CJS_17 | Cockroach | **100.00%** | WINNER |
| 26 | Startup_CJS_18 | B2B SaaS | **94.43%** | WINNER |
| 27 | Startup_CJS_19 | B2B SaaS | **98.62%** | WINNER |
| 28 | Startup_CJS_20 | DeepTech | **100.00%** | WINNER |
| 29 | Startup_CJS_21 | Cockroach | **99.99%** | WINNER |
| 30 | Startup_CJS_22 | B2B SaaS | **99.97%** | WINNER |
| 31 | Startup_CJS_23 | B2B SaaS | **80.86%** | WINNER |
| 32 | Startup_CJS_24 | DeepTech | **100.00%** | WINNER |
| 33 | Startup_CJS_25 | Cockroach | **100.00%** | WINNER |
| 34 | Startup_CJS_26 | B2B SaaS | **100.00%** | WINNER |
| 35 | Startup_CJS_27 | B2B SaaS | **99.90%** | WINNER |
| 36 | Startup_CJS_28 | DeepTech | **100.00%** | WINNER |
| 37 | Startup_CJS_29 | Cockroach | **98.42%** | WINNER |
| 38 | Startup_CJS_30 | B2B SaaS | **99.93%** | WINNER |
| 39 | Startup_CJS_31 | B2B SaaS | **90.52%** | WINNER |
| 40 | Startup_CJS_32 | DeepTech | **92.64%** | WINNER |
| 41 | Startup_CJS_33 | Cockroach | **99.78%** | WINNER |
| 42 | Startup_CJS_34 | B2B SaaS | **98.95%** | WINNER |
| 43 | Startup_CJS_35 | B2B SaaS | **78.58%** | WINNER |
| 44 | Startup_CJS_36 | DeepTech | **100.00%** | WINNER |
| 45 | Startup_CJS_37 | Cockroach | **84.34%** | WINNER |
| 46 | Startup_CJS_38 | B2B SaaS | **6.31%** | DROP |
| 47 | Startup_CJS_39 | B2B SaaS | **99.99%** | WINNER |
| 48 | Startup_CJS_40 | DeepTech | **100.00%** | WINNER |
| 49 | Startup_CJS_41 | Cockroach | **99.97%** | WINNER |
| 50 | Startup_CJS_42 | B2B SaaS | **52.21%** | REVIEW |
| 51 | Startup_CJS_43 | B2B SaaS | **99.95%** | WINNER |
| 52 | Startup_CJS_44 | DeepTech | **33.75%** | REVIEW |
| 53 | Startup_CJS_45 | Cockroach | **100.00%** | WINNER |
| 54 | Startup_CJS_46 | B2B SaaS | **96.74%** | WINNER |
| 55 | Startup_CJS_47 | B2B SaaS | **99.83%** | WINNER |
| 56 | Startup_CJS_48 | DeepTech | **90.10%** | WINNER |
| 57 | Startup_CJS_49 | Cockroach | **91.37%** | WINNER |
| 58 | Startup_CJS_50 | B2B SaaS | **99.56%** | WINNER |
| 59 | Startup_CJS_51 | B2B SaaS | **99.97%** | WINNER |
| 60 | Startup_CJS_52 | DeepTech | **99.98%** | WINNER |
| 61 | Startup_CJS_53 | Cockroach | **99.92%** | WINNER |
| 62 | Startup_CJS_54 | B2B SaaS | **96.69%** | WINNER |
| 63 | Startup_CJS_55 | B2B SaaS | **97.60%** | WINNER |
| 64 | Startup_CJS_56 | DeepTech | **99.95%** | WINNER |
| 65 | Startup_CJS_57 | Cockroach | **99.78%** | WINNER |
| 66 | Startup_CJS_58 | B2B SaaS | **93.22%** | WINNER |
| 67 | Startup_CJS_59 | B2B SaaS | **100.00%** | WINNER |
| 68 | Startup_CJS_60 | DeepTech | **98.51%** | WINNER |
| 69 | Startup_CJS_61 | Cockroach | **100.00%** | WINNER |
| 70 | Startup_CJS_62 | B2B SaaS | **98.73%** | WINNER |
| 71 | Startup_CJS_63 | B2B SaaS | **99.94%** | WINNER |
| 72 | Startup_CJS_64 | DeepTech | **100.00%** | WINNER |
| 73 | Startup_CJS_65 | Cockroach | **84.24%** | WINNER |
| 74 | Startup_CJS_66 | B2B SaaS | **99.58%** | WINNER |
| 75 | Startup_CJS_67 | B2B SaaS | **100.00%** | WINNER |
| 76 | Startup_CJS_68 | DeepTech | **79.24%** | WINNER |
| 77 | Startup_CJS_69 | Cockroach | **99.70%** | WINNER |
| 78 | Startup_CJS_70 | B2B SaaS | **99.72%** | WINNER |
| 79 | Startup_CJS_71 | B2B SaaS | **100.00%** | WINNER |
| 80 | Startup_CJS_72 | DeepTech | **95.62%** | WINNER |
| 81 | Startup_CJS_73 | Cockroach | **92.39%** | WINNER |
| 82 | Startup_CJS_74 | B2B SaaS | **90.40%** | WINNER |
| 83 | Startup_CJS_75 | B2B SaaS | **76.17%** | WINNER |
| 84 | Startup_CJS_76 | DeepTech | **79.75%** | WINNER |
| 85 | Startup_CJS_77 | Cockroach | **100.00%** | WINNER |
| 86 | Startup_CJS_78 | B2B SaaS | **100.00%** | WINNER |
| 87 | Startup_CJS_79 | B2B SaaS | **34.89%** | REVIEW |
| 88 | Startup_CJS_80 | DeepTech | **90.63%** | WINNER |
| 89 | Startup_CJS_81 | Cockroach | **99.13%** | WINNER |
| 90 | Startup_CJS_82 | B2B SaaS | **96.50%** | WINNER |
| 91 | Startup_CJS_83 | B2B SaaS | **99.99%** | WINNER |
| 92 | Startup_CJS_84 | DeepTech | **97.99%** | WINNER |
| 93 | Startup_CJS_85 | Cockroach | **94.01%** | WINNER |
| 94 | Startup_CJS_86 | B2B SaaS | **99.96%** | WINNER |
| 95 | Startup_CJS_87 | B2B SaaS | **99.99%** | WINNER |
| 96 | Startup_CJS_88 | DeepTech | **100.00%** | WINNER |
| 97 | Startup_CJS_89 | Cockroach | **91.86%** | WINNER |
| 98 | Startup_CJS_90 | B2B SaaS | **46.59%** | REVIEW |
| 99 | Startup_CJS_91 | B2B SaaS | **63.28%** | WINNER |
| 100 | Startup_CJS_92 | DeepTech | **59.92%** | WINNER |
| 101 | Startup_CJS_93 | Cockroach | **99.26%** | WINNER |
| 102 | Startup_CJS_94 | B2B SaaS | **99.99%** | WINNER |
| 103 | Startup_CJS_95 | B2B SaaS | **39.00%** | REVIEW |
| 104 | Startup_CJS_96 | DeepTech | **77.68%** | WINNER |
| 105 | Startup_CJS_97 | Cockroach | **100.00%** | WINNER |
| 106 | Startup_CJS_98 | B2B SaaS | **100.00%** | WINNER |
| 107 | Startup_CJS_99 | B2B SaaS | **86.83%** | WINNER |
| 108 | Startup_CJS_100 | DeepTech | **100.00%** | WINNER |
| 109 | Startup_CJS_101 | Cockroach | **94.37%** | WINNER |
| 110 | Startup_CJS_102 | B2B SaaS | **100.00%** | WINNER |
| 111 | Startup_CJS_103 | B2B SaaS | **32.39%** | REVIEW |
| 112 | Startup_CJS_104 | DeepTech | **94.33%** | WINNER |
| 113 | Startup_CJS_105 | Cockroach | **99.86%** | WINNER |
| 114 | Startup_CJS_106 | B2B SaaS | **92.83%** | WINNER |
| 115 | Startup_CJS_107 | B2B SaaS | **100.00%** | WINNER |
| 116 | Startup_CJS_108 | DeepTech | **99.99%** | WINNER |
| 117 | Startup_CJS_109 | Cockroach | **99.98%** | WINNER |
| 118 | Startup_CJS_110 | B2B SaaS | **99.85%** | WINNER |
| 119 | Startup_CJS_111 | B2B SaaS | **96.52%** | WINNER |
| 120 | Startup_CJS_112 | DeepTech | **29.81%** | REVIEW |
| 121 | Startup_CJS_113 | Cockroach | **99.43%** | WINNER |
| 122 | Startup_CJS_114 | B2B SaaS | **99.43%** | WINNER |
| 123 | Startup_CJS_115 | B2B SaaS | **99.73%** | WINNER |
| 124 | Startup_CJS_116 | DeepTech | **99.38%** | WINNER |
| 125 | Startup_CJS_117 | Cockroach | **100.00%** | WINNER |
| 126 | Startup_CJS_118 | B2B SaaS | **99.91%** | WINNER |
| 127 | Startup_CJS_119 | B2B SaaS | **95.64%** | WINNER |
| 128 | Startup_CJS_120 | DeepTech | **100.00%** | WINNER |
| 129 | Startup_CJS_121 | Cockroach | **99.72%** | WINNER |
| 130 | Startup_CJS_122 | B2B SaaS | **96.07%** | WINNER |
| 131 | Startup_CJS_123 | B2B SaaS | **99.82%** | WINNER |
| 132 | Startup_CJS_124 | DeepTech | **28.03%** | REVIEW |
| 133 | Startup_CJS_125 | Cockroach | **93.90%** | WINNER |
| 134 | Startup_CJS_126 | B2B SaaS | **99.99%** | WINNER |
| 135 | Startup_CJS_127 | B2B SaaS | **100.00%** | WINNER |
| 136 | Startup_CJS_128 | DeepTech | **100.00%** | WINNER |
| 137 | Startup_CJS_129 | Cockroach | **94.92%** | WINNER |
| 138 | Startup_CJS_130 | B2B SaaS | **73.44%** | WINNER |
| 139 | Startup_CJS_131 | B2B SaaS | **74.98%** | WINNER |
| 140 | Startup_CJS_132 | DeepTech | **54.38%** | REVIEW |
| 141 | Startup_CJS_133 | Cockroach | **59.80%** | WINNER |
| 142 | Startup_CJS_134 | B2B SaaS | **99.54%** | WINNER |
| 143 | Startup_CJS_135 | B2B SaaS | **100.00%** | WINNER |
| 144 | Startup_CJS_136 | DeepTech | **97.89%** | WINNER |
| 145 | Startup_CJS_137 | Cockroach | **99.93%** | WINNER |
| 146 | Startup_CJS_138 | B2B SaaS | **99.97%** | WINNER |
| 147 | Startup_CJS_139 | B2B SaaS | **99.99%** | WINNER |
| 148 | Startup_CJS_140 | DeepTech | **100.00%** | WINNER |
| 149 | Startup_CJS_141 | Cockroach | **85.12%** | WINNER |
| 150 | Startup_CJS_142 | B2B SaaS | **100.00%** | WINNER |
| 151 | Startup_CJS_143 | B2B SaaS | **96.51%** | WINNER |
| 152 | Startup_CJS_144 | DeepTech | **100.00%** | WINNER |
| 153 | Startup_CJS_145 | Cockroach | **100.00%** | WINNER |
| 154 | Startup_CJS_146 | B2B SaaS | **100.00%** | WINNER |
| 155 | Startup_CJS_147 | B2B SaaS | **98.89%** | WINNER |
| 156 | Startup_CJS_148 | DeepTech | **97.48%** | WINNER |
| 157 | Startup_CJS_149 | Cockroach | **99.70%** | WINNER |
| 158 | Startup_CJS_150 | B2B SaaS | **99.34%** | WINNER |
| 159 | Startup_CJS_151 | B2B SaaS | **98.61%** | WINNER |
| 160 | Startup_CJS_152 | DeepTech | **79.81%** | WINNER |
| 161 | Startup_CJS_153 | Cockroach | **99.92%** | WINNER |
| 162 | Startup_CJS_154 | B2B SaaS | **89.90%** | WINNER |
| 163 | Startup_CJS_155 | B2B SaaS | **100.00%** | WINNER |
| 164 | Startup_CJS_156 | DeepTech | **88.04%** | WINNER |
| 165 | Startup_CJS_157 | Cockroach | **100.00%** | WINNER |
| 166 | Startup_CJS_158 | B2B SaaS | **99.96%** | WINNER |
| 167 | Startup_CJS_159 | B2B SaaS | **30.61%** | REVIEW |
| 168 | Startup_CJS_160 | DeepTech | **99.98%** | WINNER |
| 169 | Startup_CJS_161 | Cockroach | **99.98%** | WINNER |
| 170 | Startup_CJS_162 | B2B SaaS | **94.98%** | WINNER |
| 171 | Startup_CJS_163 | B2B SaaS | **100.00%** | WINNER |
| 172 | Startup_CJS_164 | DeepTech | **99.91%** | WINNER |
| 173 | Startup_CJS_165 | Cockroach | **99.96%** | WINNER |
| 174 | Startup_CJS_166 | B2B SaaS | **100.00%** | WINNER |
| 175 | Startup_CJS_167 | B2B SaaS | **92.91%** | WINNER |
| 176 | Startup_CJS_168 | DeepTech | **100.00%** | WINNER |
| 177 | Startup_CJS_169 | Cockroach | **97.03%** | WINNER |
| 178 | Startup_CJS_170 | B2B SaaS | **25.63%** | REVIEW |
| 179 | Startup_CJS_171 | B2B SaaS | **85.95%** | WINNER |
| 180 | Startup_CJS_172 | DeepTech | **83.30%** | WINNER |
| 181 | Startup_CJS_173 | Cockroach | **100.00%** | WINNER |
| 182 | Startup_CJS_174 | B2B SaaS | **99.45%** | WINNER |
| 183 | Startup_CJS_175 | B2B SaaS | **99.57%** | WINNER |
| 184 | Startup_CJS_176 | DeepTech | **99.07%** | WINNER |
| 185 | Startup_CJS_177 | Cockroach | **99.99%** | WINNER |
| 186 | Startup_CJS_178 | B2B SaaS | **98.27%** | WINNER |
| 187 | Startup_CJS_179 | B2B SaaS | **84.96%** | WINNER |
| 188 | Startup_CJS_180 | DeepTech | **100.00%** | WINNER |
| 189 | Startup_CJS_181 | Cockroach | **56.69%** | WINNER |
| 190 | Startup_CJS_182 | B2B SaaS | **99.63%** | WINNER |
| 191 | Startup_CJS_183 | B2B SaaS | **85.03%** | WINNER |
| 192 | Startup_CJS_184 | DeepTech | **99.65%** | WINNER |
| 193 | Startup_CJS_185 | Cockroach | **97.28%** | WINNER |
| 194 | Startup_CJS_186 | B2B SaaS | **100.00%** | WINNER |
| 195 | Startup_CJS_187 | B2B SaaS | **93.95%** | WINNER |
| 196 | Startup_CJS_188 | DeepTech | **80.33%** | WINNER |
| 197 | Startup_CJS_189 | Cockroach | **100.00%** | WINNER |
| 198 | Startup_CJS_190 | B2B SaaS | **99.95%** | WINNER |
| 199 | Startup_CJS_191 | B2B SaaS | **99.99%** | WINNER |
| 200 | Startup_CJS_192 | DeepTech | **100.00%** | WINNER |

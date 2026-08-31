"""
Regression tests for the OpenGravity Bayesian scoring engine.

These tests lock the V10.5 calibration behaviour: status thresholds,
confidence intervals, stable sigmoid under extreme agent bias, and
the CRITICAL flag. Any recalibration that changes these outcomes
must update this file consciously (see CONTRIBUTING.md).
"""

import pytest
from models import AssetMetrics, AgentReport, AgentSignal, ScoreRequest, SignalPolarity
from scoring import OpenGravityEngine, stable_sigmoid


def make_request(ltv_cac=3.0, months_runway=12, moe_growth=10.0, is_audited=False):
    return ScoreRequest(
        startup_name="TestCorp",
        metrics=AssetMetrics(
            ltv_cac=ltv_cac,
            months_runway=months_runway,
            moe_growth=moe_growth,
            is_audited=is_audited,
        ),
    )


def make_report(impacts=(-5.0, -5.0, -5.0)):
    return AgentReport(
        task_id="t-1",
        signals=[
            AgentSignal(
                finding=f"signal {i}",
                impact_magnitude=v,
                polarity=SignalPolarity.NEGATIVE if v < 0 else SignalPolarity.POSITIVE,
            )
            for i, v in enumerate(impacts)
        ],
        summary="test report",
        estimated_survival_prob_24m=0.4,
    )


# ---------- stable sigmoid ----------

def test_stable_sigmoid_extremes_never_overflow():
    # Values that would raise OverflowError with the naive formula
    assert stable_sigmoid(-1000.0) == pytest.approx(0.0, abs=1e-12)
    assert stable_sigmoid(1000.0) == pytest.approx(1.0, abs=1e-12)
    assert 0.0 <= stable_sigmoid(-745.0) <= 1.0
    assert 0.0 <= stable_sigmoid(745.0) <= 1.0


def test_stable_sigmoid_midpoint():
    assert stable_sigmoid(0.0) == pytest.approx(0.5)


# ---------- evaluate(): status thresholds ----------

def test_low_ltv_is_hard_drop():
    result = OpenGravityEngine.evaluate(make_request(ltv_cac=0.5, moe_growth=100))
    assert result.status == "DROP"


def test_strong_metrics_are_winner():
    result = OpenGravityEngine.evaluate(make_request(ltv_cac=8.0, months_runway=24, moe_growth=90))
    assert result.status == "WINNER"
    assert result.probability_hit > 0.8


def test_weak_metrics_drop_below_threshold():
    result = OpenGravityEngine.evaluate(make_request(ltv_cac=1.2, months_runway=2, moe_growth=1))
    assert result.status == "DROP"
    assert result.probability_hit < 0.25


def test_mid_metrics_land_in_review_or_invest():
    result = OpenGravityEngine.evaluate(make_request(ltv_cac=2.0, months_runway=10, moe_growth=15))
    assert result.status in ("REVIEW", "INVEST")


# ---------- probability & CI sanity ----------

def test_probability_always_bounded_even_with_heavy_negative_bias():
    result = OpenGravityEngine.evaluate(make_request(), agent_report=make_report())
    assert 0.0 <= result.probability_hit <= 1.0


def test_confidence_interval_audited_tighter_than_inferred():
    audited = OpenGravityEngine.evaluate(make_request(is_audited=True))
    inferred = OpenGravityEngine.evaluate(make_request(is_audited=False))
    width_audited = audited.confidence_interval[1] - audited.confidence_interval[0]
    width_inferred = inferred.confidence_interval[1] - inferred.confidence_interval[0]
    assert width_audited < width_inferred
    assert 0.0 <= audited.confidence_interval[0] <= audited.confidence_interval[1] <= 1.0


def test_confidence_interval_stays_within_unit_range_for_wild_scores():
    result = OpenGravityEngine.evaluate(make_request(ltv_cac=20, moe_growth=200), agent_report=make_report(impacts=(5.0, 5.0)))
    assert result.confidence_interval[0] >= 0.0
    assert result.confidence_interval[1] <= 1.0


# ---------- agentic bias ----------

def test_critical_flag_with_heavy_negative_bias():
    result = OpenGravityEngine.evaluate(make_request(), agent_report=make_report(impacts=(-3.0,)))
    assert result.status.startswith("CRITICAL")
    assert result.agent_bias_applied == pytest.approx(-3.0)


def test_positive_bias_increases_probability():
    base = OpenGravityEngine.evaluate(make_request())
    boosted = OpenGravityEngine.evaluate(make_request(), agent_report=make_report(impacts=(2.0,)))
    assert boosted.probability_hit > base.probability_hit


def test_survival_from_agent_report_feeds_down_round_risk():
    result = OpenGravityEngine.evaluate(make_request(), agent_report=make_report(impacts=(0.1,)))
    assert result.down_round_risk_24m == pytest.approx(round(1.0 - 0.4, 4))

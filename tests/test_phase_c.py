"""Tests for the Phase C Victorian statutory interpretation engine."""

from __future__ import annotations

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from legal_interpretation.models import AmbiguityFinding, ProvisionApplication, StatutoryProvision
from legal_interpretation.phase_c import PhaseCInterpreter


def _sample_provision() -> StatutoryProvision:
    provision = StatutoryProvision(
        statute="Road Safety Act 1986 (Vic)",
        section="s 55D",
        text="Section 55D(1) requires a prescribed breath test to be conducted in accordance with any directions given by the testing officer.",
        purpose="ensuring roadside breath analysis is reliable and fair",
        mischief="preventing inaccurate or coercive roadside testing",
        context_terms=["prescribed device", "directions", "compliance"],
        enumerated_items=["breath analysis", "blood sample", "oral fluid test"],
        general_phrase="any further steps",
        specific_provisions=["Road Safety Act 1986 (Vic) ss 55D-55E"],
    )

    provision.ambiguous_phrases.append(
        AmbiguityFinding(
            phrase="as soon as practicable",
            literal_meaning="immediately without delay",
            contextual_meaning="within the time needed to prepare the prescribed device and officer",
            purposive_meaning="allowing necessary procedural steps so results remain reliable",
            ambiguity_reason="phrase lacks fixed timeframe",
            case_citations=["DPP v Leys [2012] VSC 519"],
        )
    )

    provision.applications["Doc A"] = ProvisionApplication(
        document_name="Doc A",
        facts="Officer Smith recorded that directions under s 55D(2) were read aloud before commencing the test.",
        requirements_satisfied=True,
        deficiency=None,
        legal_consequence=None,
        preferred_argument="purposive",
        statutory_support=True,
    )

    provision.applications["Doc B"] = ProvisionApplication(
        document_name="Doc B",
        facts="Report omits any reference to directions or compliance with manufacturer instructions.",
        requirements_satisfied=False,
        deficiency="No evidence of directions being communicated to the driver.",
        legal_consequence="Breath test result vulnerable to exclusion under s 55D.",
        preferred_argument="literal",
        statutory_support=False,
    )

    return provision


def test_phase_c_produces_required_sections():
    interpreter = PhaseCInterpreter()
    provision = _sample_provision()

    output = interpreter.run([provision])

    analysis = output.interpretation_act[provision.identifier]
    assert "s 35(a)" in analysis.purposive_result.purpose_preference
    assert analysis.extrinsic_recommendation.is_ambiguous is True

    common_law = output.common_law[provision.identifier]
    assert {entry.maxim for entry in common_law} == {
        "Noscitur a sociis",
        "Expressio unius est exclusio alterius",
        "Generalia specialibus non derogant",
        "Ejusdem generis",
    }

    ambiguity = output.ambiguities[provision.identifier][0]
    assert ambiguity.recommended_interpretation == "purposive"
    assert "DPP v Leys" in ", ".join(ambiguity.case_citations)

    harmonisation = output.harmonisation[0]
    assert harmonisation.status == "Resolved"
    assert harmonisation.prevailing_document == "Doc A"

    report_entry = output.report[0]
    assert report_entry.recommended_argument == "purposive"
    assert len(report_entry.applications) == 2


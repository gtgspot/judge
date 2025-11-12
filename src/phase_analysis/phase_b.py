"""Phase B statutory compliance analysis orchestration."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, Dict, Iterable, List, Sequence

from .models import (
    CheckStatus,
    ComplianceStatus,
    CrossReferenceRow,
    Defect,
    DefectReport,
    DisclosurePackage,
    DocumentProfile,
    EvidenceProfile,
    OmissionsReport,
    PhaseBReport,
    PreliminaryTestRecord,
    Severity,
)


@dataclass(frozen=True)
class StatutoryProvision:
    """Internal helper tying a statutory provision to its evaluation function."""

    key: str
    label: str
    checker: Callable[[DocumentProfile], CheckStatus]


def _disclosure_items(document: DocumentProfile) -> CheckStatus:
    disclosure: DisclosurePackage = document.disclosure
    missing = disclosure.missing_mandatory_items()
    if missing:
        return CheckStatus(
            ComplianceStatus.NON_COMPLIANT,
            "Mandatory disclosure items missing",
            missing,
        )
    return CheckStatus(ComplianceStatus.COMPLIANT, "Mandatory disclosure complete")


def _statement_execution(document: DocumentProfile) -> CheckStatus:
    disclosure = document.disclosure
    unsigned = disclosure.unsigned_or_undated_statements()
    if unsigned:
        return CheckStatus(
            ComplianceStatus.NON_COMPLIANT,
            "Witness statements require signatures/dates",
            unsigned,
        )
    if not disclosure.witness_statements:
        return CheckStatus(
            ComplianceStatus.UNCLEAR,
            "No witness statements supplied",
        )
    return CheckStatus(ComplianceStatus.COMPLIANT, "All witness statements executed")


def _disclosure_timing(document: DocumentProfile) -> CheckStatus:
    timing = document.disclosure.disclosure_timing_compliant
    if timing is True:
        return CheckStatus(ComplianceStatus.COMPLIANT, "Disclosure served within s.186 timeframe")
    if timing is False:
        note = document.disclosure.timing_notes or "timing non-compliant"
        return CheckStatus(ComplianceStatus.NON_COMPLIANT, note)
    return CheckStatus(ComplianceStatus.UNCLEAR, "Disclosure timing not recorded")


def _exhibit_identification(document: DocumentProfile) -> CheckStatus:
    disclosure = document.disclosure
    if disclosure.exhibits_identified:
        if disclosure.exhibit_descriptions_complete:
            return CheckStatus(ComplianceStatus.COMPLIANT, "Exhibits identified and described")
        return CheckStatus(
            ComplianceStatus.UNCLEAR,
            "Exhibits identified but descriptions incomplete",
        )
    if disclosure.physical_exhibit_list_provided:
        return CheckStatus(
            ComplianceStatus.NON_COMPLIANT,
            "Exhibit list provided without identifiers",
        )
    return CheckStatus(ComplianceStatus.UNCLEAR, "No exhibits disclosed")


def _statutory_authority(document: DocumentProfile) -> CheckStatus:
    preliminary: PreliminaryTestRecord = document.preliminary_test
    if preliminary.has_statutory_authority() and not preliminary.authority_is_ambiguous:
        return CheckStatus(ComplianceStatus.COMPLIANT, "Statutory authority recorded")
    if preliminary.authority_is_ambiguous and preliminary.has_statutory_authority():
        return CheckStatus(
            ComplianceStatus.UNCLEAR,
            "Authority cited but basis described as ambiguous",
        )
    return CheckStatus(
        ComplianceStatus.NON_COMPLIANT,
        "Statutory authority for the preliminary test absent",
    )


def _reason_to_believe(document: DocumentProfile) -> CheckStatus:
    preliminary = document.preliminary_test
    if preliminary.has_reason_to_believe():
        return CheckStatus(ComplianceStatus.COMPLIANT, "Reason to believe articulated")
    return CheckStatus(
        ComplianceStatus.NON_COMPLIANT,
        "No s.49(1) reasonable belief particulars provided",
    )


def _directions_language(document: DocumentProfile) -> CheckStatus:
    preliminary = document.preliminary_test
    missing: List[str] = []
    if not preliminary.directions_compliance_language:
        missing.append('"in accordance with directions" language')
    if not preliminary.directions_documented:
        missing.append("record of directions given")
    if not missing:
        return CheckStatus(ComplianceStatus.COMPLIANT, "Directions documented per s.55D(1)")
    return CheckStatus(
        ComplianceStatus.NON_COMPLIANT,
        "Directions compliance not established",
        missing,
    )


def _oral_directions(document: DocumentProfile) -> CheckStatus:
    preliminary = document.preliminary_test
    if not preliminary.subject_literate:
        # Oral directions are not required for illiterate persons under s.55D(2).
        if preliminary.oral_directions_documented:
            return CheckStatus(ComplianceStatus.COMPLIANT, "Oral directions provided out of caution")
        return CheckStatus(ComplianceStatus.COMPLIANT, "Oral directions not mandated")
    if preliminary.oral_directions_documented:
        return CheckStatus(ComplianceStatus.COMPLIANT, "Oral directions documented for literate subject")
    return CheckStatus(
        ComplianceStatus.NON_COMPLIANT,
        "No record of oral directions for literate subject",
    )


def _proper_performance(document: DocumentProfile) -> CheckStatus:
    preliminary = document.preliminary_test
    missing: List[str] = []
    if not preliminary.has_proper_performance_indicators():
        missing.append("performance indicators")
    if not preliminary.device_approval_number:
        missing.append("device approval number")
    if not preliminary.calibration_complete():
        missing.append("calibration/maintenance records")
    if not missing:
        return CheckStatus(ComplianceStatus.COMPLIANT, "Proper performance established under s.55E")
    return CheckStatus(
        ComplianceStatus.NON_COMPLIANT,
        "Proper performance information incomplete",
        missing,
    )


def _evidentiary_test(document: DocumentProfile) -> CheckStatus:
    compliant = document.preliminary_test.evidentiary_test_compliant
    if compliant is True:
        return CheckStatus(ComplianceStatus.COMPLIANT, "Evidentiary test requirements met")
    if compliant is False:
        return CheckStatus(
            ComplianceStatus.NON_COMPLIANT,
            "Evidentiary test departed from statutory requirements",
        )
    return CheckStatus(ComplianceStatus.UNCLEAR, "No evidentiary test information recorded")


def _hearsay_flagged(document: DocumentProfile) -> CheckStatus:
    evidence: EvidenceProfile = document.evidence
    if evidence.hearsay_items or evidence.hearsay_review_documented:
        return CheckStatus(ComplianceStatus.COMPLIANT, "Hearsay issues identified under s.59")
    return CheckStatus(
        ComplianceStatus.UNCLEAR,
        "No hearsay review documented",
    )


def _hearsay_exceptions(document: DocumentProfile) -> CheckStatus:
    evidence = document.evidence
    unsupported = evidence.hearsay_without_exception()
    if unsupported:
        return CheckStatus(
            ComplianceStatus.NON_COMPLIANT,
            "Hearsay exception not demonstrated",
            unsupported,
        )
    if evidence.hearsay_items:
        return CheckStatus(ComplianceStatus.COMPLIANT, "Hearsay exceptions articulated")
    return CheckStatus(ComplianceStatus.COMPLIANT, "No hearsay evidence tendered")


def _business_records(document: DocumentProfile) -> CheckStatus:
    evidence = document.evidence
    unsupported = evidence.business_records_without_foundation()
    if unsupported:
        return CheckStatus(
            ComplianceStatus.NON_COMPLIANT,
            "Business records exception unsupported",
            unsupported,
        )
    if evidence.business_records:
        return CheckStatus(ComplianceStatus.COMPLIANT, "Business records foundation established")
    return CheckStatus(ComplianceStatus.UNCLEAR, "No business records disclosed")


def _section_137(document: DocumentProfile) -> CheckStatus:
    evidence = document.evidence
    if evidence.s137_prejudice_factors:
        if evidence.s137_analysis_documented:
            return CheckStatus(ComplianceStatus.COMPLIANT, "s.137 balancing undertaken")
        return CheckStatus(
            ComplianceStatus.UNCLEAR,
            "s.137 discretion triggered without documented balancing",
            evidence.s137_prejudice_factors,
        )
    return CheckStatus(ComplianceStatus.COMPLIANT, "No s.137 prejudice concerns raised")


def _section_138(document: DocumentProfile) -> CheckStatus:
    evidence = document.evidence
    if evidence.has_unlawful_obtainment_risk():
        return CheckStatus(
            ComplianceStatus.NON_COMPLIANT,
            "Potentially improperly obtained evidence with no mitigation",
            evidence.s138_exclusion_factors,
        )
    if evidence.s138_exclusion_factors:
        return CheckStatus(
            ComplianceStatus.UNCLEAR,
            "Improper obtainment issues noted with mitigation",
            evidence.s138_exclusion_factors,
        )
    return CheckStatus(ComplianceStatus.COMPLIANT, "No s.138 issues identified")


PROVISIONS: Sequence[StatutoryProvision] = (
    StatutoryProvision("CPA_DISCLOSURE", "CPA 2009 Part 3.3 – Disclosure package", _disclosure_items),
    StatutoryProvision("CPA_STATEMENTS", "CPA 2009 Part 3.3 – Witness statements executed", _statement_execution),
    StatutoryProvision("CPA_TIMING", "CPA 2009 s.186 – Disclosure timing", _disclosure_timing),
    StatutoryProvision("CPA_EXHIBITS", "CPA 2009 Part 3.3 – Exhibit identification", _exhibit_identification),
    StatutoryProvision("RSA_AUTHORITY", "RSA 1986 s.49(1) – Statutory authority recorded", _statutory_authority),
    StatutoryProvision("RSA_REASON", "RSA 1986 s.49(1) – Reasonable belief articulated", _reason_to_believe),
    StatutoryProvision("RSA_55D1", "RSA 1986 s.55D(1) – Directions compliance", _directions_language),
    StatutoryProvision("RSA_55D2", "RSA 1986 s.55D(2) – Oral directions for literate subject", _oral_directions),
    StatutoryProvision("RSA_55E", "RSA 1986 s.55E – Proper performance", _proper_performance),
    StatutoryProvision("RSA_55_1", "RSA 1986 s.55(1) – Evidentiary test compliance", _evidentiary_test),
    StatutoryProvision("EA_59", "Evidence Act 2008 s.59 – Hearsay flagged", _hearsay_flagged),
    StatutoryProvision("EA_60_69", "Evidence Act 2008 ss.60-69 – Hearsay exceptions", _hearsay_exceptions),
    StatutoryProvision("EA_69", "Evidence Act 2008 s.69 – Business records foundation", _business_records),
    StatutoryProvision("EA_137", "Evidence Act 2008 s.137 – Probative vs prejudicial", _section_137),
    StatutoryProvision("EA_138", "Evidence Act 2008 s.138 – Improperly obtained evidence", _section_138),
)


def _evaluate_document(document: DocumentProfile) -> Dict[str, CheckStatus]:
    return {provision.key: provision.checker(document) for provision in PROVISIONS}


def _summarise_discrepancies(doc_a: CheckStatus, doc_b: CheckStatus) -> str:
    parts: List[str] = []
    if doc_a.status != doc_b.status:
        parts.append(f"Status differs (Doc A: {doc_a.status.colour}, Doc B: {doc_b.status.colour})")
    missing_a = set(doc_a.missing_items)
    missing_b = set(doc_b.missing_items)
    missing_diff = missing_a ^ missing_b
    if missing_diff:
        parts.append("Missing elements differ: " + ", ".join(sorted(missing_diff)))
    return "; ".join(parts) if parts else "None"


def _action_required(label: str, status: CheckStatus) -> str:
    if status.status is ComplianceStatus.COMPLIANT:
        return ""
    if status.missing_items:
        requirement = ", ".join(status.missing_items)
        verb = "obtain" if status.status is ComplianceStatus.NON_COMPLIANT else "clarify"
        return f"{label}: {verb} {requirement}"
    verb = "rectify" if status.status is ComplianceStatus.NON_COMPLIANT else "clarify"
    return f"{label}: {verb} {status.message.lower()}"


def _build_cross_reference(doc_a: DocumentProfile, doc_b: DocumentProfile) -> List[CrossReferenceRow]:
    results_a = _evaluate_document(doc_a)
    results_b = _evaluate_document(doc_b)
    rows: List[CrossReferenceRow] = []
    for provision in PROVISIONS:
        status_a = results_a[provision.key]
        status_b = results_b[provision.key]
        discrepancies = _summarise_discrepancies(status_a, status_b)
        actions = [
            _action_required("Doc A", status_a),
            _action_required("Doc B", status_b),
        ]
        actions = [action for action in actions if action]
        rows.append(
            CrossReferenceRow(
                statutory_provision=provision.label,
                doc_a=status_a,
                doc_b=status_b,
                discrepancies=discrepancies,
                action_required=" | ".join(actions) if actions else "None",
            )
        )
    return rows


def _detect_vague_temporal_references(preliminary: PreliminaryTestRecord) -> bool:
    candidates: Iterable[str] = filter(None, [preliminary.test_time, preliminary.driving_time])
    for entry in candidates:
        lowered = entry.lower()
        if any(token in lowered for token in ("approx", "about", "circa", "unknown", "around")):
            return True
    return bool(preliminary.time_reference_notes)


def _identify_doc_defects(document: DocumentProfile) -> Iterable[Defect]:
    defects: List[Defect] = []
    name = document.name
    prelim = document.preliminary_test
    disclosure = document.disclosure
    evidence = document.evidence

    if not prelim.has_statutory_authority():
        defects.append(
            Defect(name, "Missing statutory authority for preliminary test", Severity.HIGH, "RSA 1986 s.49(1)"),
        )
    if not prelim.has_reason_to_believe():
        defects.append(
            Defect(name, "Absent reason to believe justification", Severity.HIGH, "RSA 1986 s.49(1)"),
        )
    if not prelim.directions_documented:
        defects.append(
            Defect(name, "No evidence of directions given", Severity.HIGH, "RSA 1986 s.55D"),
        )
    if not prelim.has_proper_performance_indicators():
        defects.append(
            Defect(name, "Missing proper performance indicators", Severity.HIGH, "RSA 1986 s.55E"),
        )
    unsigned = disclosure.unsigned_or_undated_statements()
    if unsigned:
        defects.append(
            Defect(name, f"Unsigned/undated witness statements: {', '.join(unsigned)}", Severity.HIGH, "CPA 2009 Part 3.3"),
        )
    mandatory_missing = disclosure.missing_mandatory_items()
    if mandatory_missing:
        defects.append(
            Defect(name, f"Missing mandatory disclosure items: {', '.join(mandatory_missing)}", Severity.HIGH, "CPA 2009 Part 3.3"),
        )
    hearsay_without_exception = evidence.hearsay_without_exception()
    if hearsay_without_exception:
        defects.append(
            Defect(name, f"Hearsay without exception: {', '.join(hearsay_without_exception)}", Severity.HIGH, "Evidence Act 2008"),
        )
    if evidence.has_unlawful_obtainment_risk():
        defects.append(
            Defect(name, "Indicators of unlawfully obtained evidence", Severity.HIGH, "Evidence Act 2008 s.138"),
        )

    if _detect_vague_temporal_references(prelim):
        defects.append(
            Defect(name, "Vague temporal references in test chronology", Severity.MEDIUM, "RSA 1986"),
        )
    if prelim.authority_is_ambiguous:
        defects.append(
            Defect(name, "Ambiguous authority claims", Severity.MEDIUM, "RSA 1986 s.49"),
        )
    normalised_steps = set(document.normalised_procedures())
    core_steps = {
        "vehicle stop",
        "directions provided",
        "test administered",
        "results recorded",
    }
    missing_steps = sorted(step for step in core_steps if step not in normalised_steps)
    if missing_steps:
        defects.append(
            Defect(name, f"Incomplete procedural description (missing: {', '.join(missing_steps)})", Severity.MEDIUM),
        )
    if disclosure.physical_exhibit_list_provided and not disclosure.exhibit_descriptions_complete:
        defects.append(
            Defect(name, "Missing exhibit descriptions", Severity.MEDIUM, "CPA 2009 Part 3.3"),
        )

    if document.typographical_issues:
        defects.append(
            Defect(name, f"Typographical ambiguities: {', '.join(document.typographical_issues)}", Severity.LOW),
        )
    if document.terminology_issues:
        defects.append(
            Defect(name, f"Unclear terminology: {', '.join(document.terminology_issues)}", Severity.LOW),
        )
    if document.contextual_gaps:
        defects.append(
            Defect(name, f"Incomplete contextual details: {', '.join(document.contextual_gaps)}", Severity.LOW),
        )

    return defects


def _identify_defects(doc_a: DocumentProfile, doc_b: DocumentProfile) -> DefectReport:
    report = DefectReport()
    for defect in _identify_doc_defects(doc_a):
        report.add(defect)
    for defect in _identify_doc_defects(doc_b):
        report.add(defect)

    shared_dates = set(doc_a.key_dates) & set(doc_b.key_dates)
    for key in sorted(shared_dates):
        date_a = doc_a.key_dates[key]
        date_b = doc_b.key_dates[key]
        if date_a and date_b and date_a != date_b:
            report.add(
                Defect(
                    "Doc A & Doc B",
                    f"Inconsistent {key} date: Doc A {date_a} vs Doc B {date_b}",
                    Severity.MEDIUM,
                )
            )
    return report


def _targeted_omission(flag: bool) -> bool:
    return bool(flag)


def _omissions(doc_a: DocumentProfile, doc_b: DocumentProfile) -> OmissionsReport:
    elements_a = set(doc_a.material_elements())
    elements_b = set(doc_b.material_elements())
    statutory_a = set(doc_a.normalised_statutory_refs())
    statutory_b = set(doc_b.normalised_statutory_refs())
    facts_a = set(doc_a.normalised_facts())
    facts_b = set(doc_b.normalised_facts())
    steps_a = set(doc_a.normalised_procedures())
    steps_b = set(doc_b.normalised_procedures())

    targeted = {
        "s55d_in_accordance_language": _targeted_omission(
            doc_a.preliminary_test.directions_compliance_language and not doc_b.preliminary_test.directions_compliance_language
        ),
        "s49_reason_to_believe": _targeted_omission(
            doc_a.preliminary_test.has_reason_to_believe() and not doc_b.preliminary_test.has_reason_to_believe()
        ),
        "s55e_device_approval_number": _targeted_omission(
            bool(doc_a.preliminary_test.device_approval_number) and not bool(doc_b.preliminary_test.device_approval_number)
        ),
        "s55e_calibration_records": _targeted_omission(
            doc_a.preliminary_test.calibration_complete() and not doc_b.preliminary_test.calibration_complete()
        ),
        "test_vs_drive_time_alignment": _targeted_omission(
            bool(doc_a.preliminary_test.test_time and doc_a.preliminary_test.driving_time)
            and not bool(doc_b.preliminary_test.test_time and doc_b.preliminary_test.driving_time)
        ),
    }

    return OmissionsReport(
        elements_only_in_a=sorted(elements_a - elements_b),
        statutory_refs_only_in_a=sorted(statutory_a - statutory_b),
        facts_only_in_a=sorted(facts_a - facts_b),
        procedures_only_in_a=sorted(steps_a - steps_b),
        targeted_omissions=targeted,
    )


def build_phase_b_report(doc_a: DocumentProfile, doc_b: DocumentProfile) -> PhaseBReport:
    """Run the full Phase B pipeline returning a structured report."""

    matrix = _build_cross_reference(doc_a, doc_b)
    defects = _identify_defects(doc_a, doc_b)
    omissions = _omissions(doc_a, doc_b)
    return PhaseBReport(matrix, defects, omissions)


__all__ = ["PhaseBReport", "build_phase_b_report"]

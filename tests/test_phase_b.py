"""Unit tests for the Phase B analysis pipeline."""

from phase_analysis import (
    ComplianceStatus,
    DisclosurePackage,
    DocumentProfile,
    EvidenceProfile,
    HearsayEntry,
    PreliminaryTestRecord,
    WitnessStatement,
    BusinessRecordEntry,
)
from phase_analysis.phase_b import PROVISIONS, build_phase_b_report


def _build_documents():
    doc_a = DocumentProfile(
        name="Doc A",
        disclosure=DisclosurePackage(
            informant_statement_provided=True,
            witness_statements=[
                WitnessStatement("Constable Lee", True, True, "2024-05-01"),
                WitnessStatement("Witness Patel", True, True, "2024-05-02"),
            ],
            prior_convictions_disclosed=True,
            physical_exhibit_list_provided=True,
            exhibits_identified=True,
            exhibit_descriptions_complete=True,
            disclosure_timing_compliant=True,
            timing_notes="Served within statutory timeframe",
        ),
        preliminary_test=PreliminaryTestRecord(
            statutory_authority="RSA 1986 s.55(1)",
            reason_to_believe_detail="Smelt alcohol and observed lane weaving",
            directions_compliance_language=True,
            directions_documented=True,
            oral_directions_documented=True,
            subject_literate=True,
            proper_performance_indicators=["Mouthpiece replaced", "Device warmed"],
            evidentiary_test_compliant=True,
            device_approval_number="AS12345",
            calibration_records=["Calibration certificate 2024-04-01"],
            maintenance_records=["Maintenance log 2024-03-20"],
            test_time="2024-05-10 22:15",
            driving_time="2024-05-10 21:55",
        ),
        evidence=EvidenceProfile(
            hearsay_items=[
                HearsayEntry(
                    "Bystander statement",
                    exception_claimed="s.65",
                    exception_supported=True,
                )
            ],
            business_records=[
                BusinessRecordEntry(
                    "Breathalyser maintenance log",
                    exception_established=True,
                    foundation_details="Certified by custodian",
                )
            ],
            hearsay_review_documented=True,
            s137_analysis_documented=True,
            s137_prejudice_factors=["Minimal prejudice"],
            s138_exclusion_factors=[],
            s138_mitigation_steps=[],
        ),
        statutory_references=[
            "CPA 2009 s.186",
            "RSA 1986 s.55D",
            "Evidence Act 2008 s.69",
        ],
        facts=[
            "Driver admitted consuming alcohol",
            "Officer observed weaving",
        ],
        procedural_steps=[
            "Vehicle stop",
            "Directions provided",
            "Test administered",
            "Results recorded",
        ],
        key_dates={"offence": "2024-05-10", "test": "2024-05-10"},
    )

    doc_b = DocumentProfile(
        name="Doc B",
        disclosure=DisclosurePackage(
            informant_statement_provided=False,
            witness_statements=[
                WitnessStatement("Constable Lee", False, True, None),
            ],
            prior_convictions_disclosed=False,
            physical_exhibit_list_provided=True,
            exhibits_identified=False,
            exhibit_descriptions_complete=False,
            disclosure_timing_compliant=False,
            timing_notes="Served five days late",
        ),
        preliminary_test=PreliminaryTestRecord(
            statutory_authority=None,
            authority_is_ambiguous=True,
            reason_to_believe_detail="",
            directions_compliance_language=False,
            directions_documented=False,
            oral_directions_documented=False,
            subject_literate=True,
            proper_performance_indicators=[],
            evidentiary_test_compliant=None,
            device_approval_number=None,
            calibration_records=[],
            maintenance_records=[],
            test_time="Approx 22:00",
            driving_time=None,
            time_reference_notes=["Officer unsure of driving time"],
        ),
        evidence=EvidenceProfile(
            hearsay_items=[
                HearsayEntry("Neighbour recount", exception_claimed=None, exception_supported=False)
            ],
            business_records=[
                BusinessRecordEntry("Maintenance log", exception_established=False)
            ],
            hearsay_review_documented=False,
            s137_analysis_documented=False,
            s137_prejudice_factors=["Highly prejudicial character evidence"],
            s138_exclusion_factors=["Failure to caution"],
            s138_mitigation_steps=[],
        ),
        statutory_references=["CPA 2009"],
        facts=["Driver admitted consuming alcohol"],
        procedural_steps=["Vehicle stop"],
        key_dates={"offence": "2024-05-11"},
        terminology_issues=["Reference to 'sample' undefined"],
        typographical_issues=["Date recorded as 2024-05-0"],
        contextual_gaps=["No chain of custody narrative"],
    )

    return doc_a, doc_b


def test_phase_b_cross_reference_and_reports():
    doc_a, doc_b = _build_documents()
    report = build_phase_b_report(doc_a, doc_b)

    assert len(report.cross_reference_matrix) == len(PROVISIONS)

    disclosure_row = next(
        row for row in report.cross_reference_matrix if row.statutory_provision.startswith("CPA 2009 Part 3.3 – Disclosure")
    )
    assert disclosure_row.doc_a.status is ComplianceStatus.COMPLIANT
    assert disclosure_row.doc_b.status is ComplianceStatus.NON_COMPLIANT
    assert disclosure_row.action_required != "None"

    business_records_row = next(
        row for row in report.cross_reference_matrix if row.statutory_provision.startswith("Evidence Act 2008 s.69")
    )
    assert business_records_row.doc_b.status is ComplianceStatus.NON_COMPLIANT

    high_descriptions = {defect.description for defect in report.defects.high}
    assert "Missing statutory authority for preliminary test" in high_descriptions
    assert "Hearsay without exception: Neighbour recount" in high_descriptions

    medium_descriptions = {defect.description for defect in report.defects.medium}
    assert any("Inconsistent offence date" in desc for desc in medium_descriptions)
    assert any("Missing exhibit descriptions" in desc for desc in medium_descriptions)

    omissions = report.omissions
    assert "mandatory disclosure complete" in omissions.elements_only_in_a
    assert omissions.targeted_omissions["s55d_in_accordance_language"] is True
    assert omissions.targeted_omissions["s49_reason_to_believe"] is True

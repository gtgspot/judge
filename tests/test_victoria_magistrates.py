from victoria_magistrates.court_knowledge import (
    COURT_DEFECT_CATEGORIES,
    MagistratesCourtProcedureChecker,
    OutcomeTracker,
    RoadSafetyActChecklist,
    SubmissionBuilder,
    evaluate_disclosure_section,
)


def test_defect_categories_cover_all_instructions():
    categories = {category.code: category for category in COURT_DEFECT_CATEGORIES}
    assert set(categories) == {"A", "B", "C", "D"}

    assert {item.key for item in categories["A"].items} == {
        "missing_statutory_authority",
        "offence_outside_summary_jurisdiction",
        "missing_territorial_jurisdiction",
        "expired_limitation_period",
    }
    assert {item.key for item in categories["B"].items} == {
        "disclosure_non_compliance",
        "missing_preliminary_test_prerequisites",
        "absent_55d_55e_compliance",
        "unsigned_or_undated_documents",
        "missing_service_evidence",
    }
    assert {item.key for item in categories["C"].items} == {
        "hearsay_without_exception",
        "opinion_without_expertise",
        "improperly_obtained",
        "unfairly_prejudicial",
        "missing_authentication",
        "insufficient_proper_performance",
    }
    assert {item.key for item in categories["D"].items} == {
        "timeline_contradictions",
        "conflicting_statements",
        "impossible_sequences",
        "missing_critical_facts",
        "unexplained_gaps",
    }


def test_procedure_checker_reports_missing_items():
    checker = MagistratesCourtProcedureChecker()
    report = checker.build_report(
        {
            "contest_mention": {
                "charge_sheet_filed": True,
                "disclosure_provided_in_time": False,
            },
            "summary_case_conference": {
                "issues_identified": True,
                "admissions_made": False,
                "disclosure_complete": False,
            },
            "summary_hearing": {
                "prosecution_case_outline": True,
                "witness_availability_confirmed": True,
                "voir_dire_foreshadowed": False,
            },
        }
    )

    assert {
        item.key for item in report["contest_mention"]
    } == {"disclosure_provided_in_time", "defence_plea_indicated", "defence_notice_of_defences"}
    assert {item.key for item in report["summary_case_conference"]} == {
        "admissions_made",
        "disclosure_complete",
    }
    assert {item.key for item in report["summary_hearing"]} == {"voir_dire_foreshadowed"}



def test_road_safety_act_checklist_detects_gaps():
    checklist = RoadSafetyActChecklist()
    preliminary_data = {item.key: True for item in checklist.preliminary_items}
    evidentiary_data = {item.key: True for item in checklist.evidentiary_items}

    assert checklist.evaluate_preliminary(preliminary_data) == []
    assert checklist.evaluate_evidentiary(evidentiary_data) == []

    preliminary_data.pop("prelim_directions_given")
    evidentiary_data["evidentiary_certificate_completed"] = False

    assert {item.key for item in checklist.evaluate_preliminary(preliminary_data)} == {
        "prelim_directions_given",
    }
    assert {item.key for item in checklist.evaluate_evidentiary(evidentiary_data)} == {
        "evidentiary_certificate_completed",
    }


def test_disclosure_matrix_flags_missing_items():
    prosecution_missing = evaluate_disclosure_section(
        "prosecution", {"informant_statement": True, "witness_statements": False}
    )
    assert {item.key for item in prosecution_missing} >= {"witness_statements", "exhibit_list"}

    defence_missing = evaluate_disclosure_section(
        "defence", {"alibi_notice": True, "defence_witnesses": True, "defence_timing": True}
    )
    assert {item.key for item in defence_missing} == {"expert_evidence_notice"}



def test_submission_builder_creates_expected_sections():
    builder = SubmissionBuilder()
    submission = builder.build_submission(
        "preliminary test admissibility",
        applicable_law=[
            "Road Safety Act 1986 s.55D(1) requires preliminary tests to follow device directions.",
            "Section 55E limits the presumption of proper performance to maintained devices.",
        ],
        facts=[
            "Document A: 'I directed subject to blow into device' (no detail on directions).",
            "Document B: Certificate asserts compliance without particulars.",
        ],
        analysis=[
            "No evidence any oral or written directions were given as required by s.55D(2).",
            "Absent proof of directions, the presumption in s.55E cannot apply.",
        ],
        defect_description=(
            "Evidence does not establish what directions applied, whether they were given or followed."
        ),
        legal_consequence=(
            "Without compliance evidence the preliminary test is inadmissible and cannot ground further testing."
        ),
        relief_sought="Exclude the preliminary test result from evidence.",
        authorities=[
            "DPP v Kaba (2014) 44 VR 526 emphasises strict compliance with statutory testing directions.",
        ],
    )

    assert "SUBMISSION ON PRELIMINARY TEST ADMISSIBILITY" in submission
    assert "Applicable Law:" in submission
    assert "Facts:" in submission
    assert "Analysis:" in submission
    assert "Defect Identified:" in submission
    assert "Legal Consequence:" in submission
    assert "Relief Sought:" in submission
    assert "Authorities:" in submission



def test_outcome_tracker_records_and_summarises(tmp_path):
    store = tmp_path / "outcomes.json"
    tracker = OutcomeTracker(store)
    tracker.record_outcome(
        "Category B - Procedural Defects",
        result="exclusion_granted",
        arguments_accepted=["s.55D non-compliance"],
        judicial_response="Court accepted absence of evidence on directions.",
        remediation_strategy="Prosecution to tender training logs in future.",
    )
    tracker.record_outcome(
        "Category B - Procedural Defects",
        result="exclusion_refused",
        arguments_rejected=["device maintenance unproven"],
        judicial_response="Court satisfied maintenance was implied.",
    )

    outcomes = tracker.get_outcomes_for_defect("Category B - Procedural Defects")
    assert len(outcomes) == 2
    summary = tracker.summarise_results()
    assert summary["Category B - Procedural Defects"]["exclusion_granted"] == 1
    assert summary["Category B - Procedural Defects"]["exclusion_refused"] == 1

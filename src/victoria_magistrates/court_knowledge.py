"""Victorian Magistrates' Court criminal procedure knowledge base.

This module organises defect categories, procedure checklists, statutory
requirements and utilities that support rapid case preparation within the
Magistrates' Court of Victoria.  It also provides helpers for generating
submission skeletons and recording outcome data so the knowledge base can
continuously improve with real court feedback.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
import json
from pathlib import Path
from typing import Dict, List, Mapping, MutableMapping, Optional, Sequence


@dataclass(frozen=True)
class ChecklistItem:
    """Single checklist requirement."""

    key: str
    description: str
    statute: Optional[str] = None
    notes: Optional[str] = None


@dataclass(frozen=True)
class DefectCategory:
    """Represents a defect category relevant to Magistrates' Court practice."""

    code: str
    title: str
    summary: str
    items: Sequence[ChecklistItem]


@dataclass(frozen=True)
class ProcedureStage:
    """Checklist representing a stage of the Magistrates' Court procedure."""

    name: str
    items: Sequence[ChecklistItem]


COURT_DEFECT_CATEGORIES: Sequence[DefectCategory] = (
    DefectCategory(
        code="A",
        title="Jurisdictional Defects",
        summary="Court lacks authority",
        items=(
            ChecklistItem(
                key="missing_statutory_authority",
                description="Missing statutory authority for action taken",
            ),
            ChecklistItem(
                key="offence_outside_summary_jurisdiction",
                description="Offence not within summary jurisdiction",
            ),
            ChecklistItem(
                key="missing_territorial_jurisdiction",
                description="Missing territorial jurisdiction statement",
            ),
            ChecklistItem(
                key="expired_limitation_period",
                description="Expired time limits for prosecution",
            ),
        ),
    ),
    DefectCategory(
        code="B",
        title="Procedural Defects",
        summary="Process not followed",
        items=(
            ChecklistItem(
                key="disclosure_non_compliance",
                description="Disclosure non-compliance",
                statute="Criminal Procedure Act 2009 (Vic) Part 3.3",
            ),
            ChecklistItem(
                key="missing_preliminary_test_prerequisites",
                description="Missing s.49 preliminary test prerequisites",
                statute="Road Safety Act 1986 (Vic) s.49",
            ),
            ChecklistItem(
                key="absent_55d_55e_compliance",
                description="Absent s.55D/55E compliance elements",
                statute="Road Safety Act 1986 (Vic) ss.55D-55E",
            ),
            ChecklistItem(
                key="unsigned_or_undated_documents",
                description="Unsigned/undated court documents",
            ),
            ChecklistItem(
                key="missing_service_evidence",
                description="Missing service evidence",
            ),
        ),
    ),
    DefectCategory(
        code="C",
        title="Evidentiary Defects",
        summary="Evidence inadmissible or weak",
        items=(
            ChecklistItem(
                key="hearsay_without_exception",
                description="Hearsay without exception",
                statute="Evidence Act 2008 (Vic) s.59",
            ),
            ChecklistItem(
                key="opinion_without_expertise",
                description="Opinion evidence without expertise",
                statute="Evidence Act 2008 (Vic) ss.76-79",
            ),
            ChecklistItem(
                key="improperly_obtained",
                description="Improperly obtained evidence",
                statute="Evidence Act 2008 (Vic) s.138",
            ),
            ChecklistItem(
                key="unfairly_prejudicial",
                description="Unfairly prejudicial evidence",
                statute="Evidence Act 2008 (Vic) s.137",
            ),
            ChecklistItem(
                key="missing_authentication",
                description="Missing authentication",
                statute="Evidence Act 2008 (Vic) s.48",
            ),
            ChecklistItem(
                key="insufficient_proper_performance",
                description="Insufficient proper performance evidence",
                statute="Road Safety Act 1986 (Vic) s.55E",
            ),
        ),
    ),
    DefectCategory(
        code="D",
        title="Factual Defects",
        summary="Factual inconsistencies",
        items=(
            ChecklistItem(
                key="timeline_contradictions",
                description="Timeline contradictions",
            ),
            ChecklistItem(
                key="conflicting_statements",
                description="Conflicting statements",
            ),
            ChecklistItem(
                key="impossible_sequences",
                description="Impossible sequences",
            ),
            ChecklistItem(
                key="missing_critical_facts",
                description="Missing critical facts",
            ),
            ChecklistItem(
                key="unexplained_gaps",
                description="Unexplained gaps",
            ),
        ),
    ),
)


CONTEST_MENTION_STAGE = ProcedureStage(
    name="contest_mention",
    items=(
        ChecklistItem(
            key="charge_sheet_filed",
            description="Prosecution filed charge sheet",
            statute="Criminal Procedure Act 2009 (Vic) s.6",
        ),
        ChecklistItem(
            key="disclosure_provided_in_time",
            description="Disclosure provided within timeframes",
            statute="Criminal Procedure Act 2009 (Vic) s.186",
        ),
        ChecklistItem(
            key="defence_plea_indicated",
            description="Defence indicated plea",
        ),
        ChecklistItem(
            key="defence_notice_of_defences",
            description="Defence provided notice of defences",
            statute="Criminal Procedure Act 2009 (Vic) s.185",
        ),
    ),
)

SUMMARY_CASE_CONFERENCE = ProcedureStage(
    name="summary_case_conference",
    items=(
        ChecklistItem(
            key="issues_identified",
            description="Issues identified and narrowed",
        ),
        ChecklistItem(
            key="admissions_made",
            description="Admissions made",
        ),
        ChecklistItem(
            key="disclosure_complete",
            description="Disclosure complete",
        ),
    ),
)

SUMMARY_HEARING_STAGE = ProcedureStage(
    name="summary_hearing",
    items=(
        ChecklistItem(
            key="prosecution_case_outline",
            description="Prosecution case outline filed",
        ),
        ChecklistItem(
            key="witness_availability_confirmed",
            description="Witness availability confirmed",
        ),
        ChecklistItem(
            key="voir_dire_foreshadowed",
            description="Voir dire applications foreshadowed",
        ),
    ),
)


class MagistratesCourtProcedureChecker:
    """Utility for checking Magistrates' Court summary procedure compliance."""

    def __init__(self) -> None:
        self.stages: Dict[str, ProcedureStage] = {
            stage.name: stage
            for stage in (
                CONTEST_MENTION_STAGE,
                SUMMARY_CASE_CONFERENCE,
                SUMMARY_HEARING_STAGE,
            )
        }

    def evaluate_stage(self, stage_name: str, provided: Mapping[str, bool]) -> List[ChecklistItem]:
        """Return missing checklist items for a specific stage."""

        if stage_name not in self.stages:
            raise KeyError(f"Unknown procedure stage: {stage_name}")
        stage = self.stages[stage_name]
        missing: List[ChecklistItem] = [
            item for item in stage.items if not bool(provided.get(item.key))
        ]
        return missing

    def build_report(
        self, case_data: Mapping[str, Mapping[str, bool]]
    ) -> Dict[str, List[ChecklistItem]]:
        """Evaluate all stages and return a mapping of missing items."""

        report: Dict[str, List[ChecklistItem]] = {}
        for name, stage in self.stages.items():
            provided_stage_data = case_data.get(name, {})
            missing = [
                item for item in stage.items if not bool(provided_stage_data.get(item.key))
            ]
            report[name] = missing
        return report


class RoadSafetyActChecklist:
    """Checklist evaluator for Road Safety Act 1986 drink/drug driving matters."""

    def __init__(self) -> None:
        self.preliminary_items: Sequence[ChecklistItem] = (
            ChecklistItem(
                key="prelim_reasonable_belief",
                description='Officer had "reason to believe"',
                statute="Road Safety Act 1986 (Vic) s.49",
                notes="Document the observable indicators supporting belief.",
            ),
            ChecklistItem(
                key="prelim_belief_indicators",
                description="Belief based on specified indicators",
                statute="Road Safety Act 1986 (Vic) s.49(1)(a)-(h)",
            ),
            ChecklistItem(
                key="prelim_authorised_device",
                description="Preliminary test authorised device",
                statute="Road Safety Act 1986 (Vic) s.49",
            ),
            ChecklistItem(
                key="prelim_directions_followed",
                description='Test "in accordance with directions"',
                statute="Road Safety Act 1986 (Vic) s.55D(1)",
            ),
            ChecklistItem(
                key="prelim_directions_given",
                description="Directions given (oral if literate, written if not)",
                statute="Road Safety Act 1986 (Vic) s.55D(2)",
            ),
            ChecklistItem(
                key="prelim_proper_performance_device_approved",
                description="Device approved for use",
                statute="Road Safety Act 1986 (Vic) s.55E",
            ),
            ChecklistItem(
                key="prelim_proper_performance_used_as_designed",
                description="Device used as designed",
                statute="Road Safety Act 1986 (Vic) s.55E",
            ),
            ChecklistItem(
                key="prelim_device_working_order",
                description="Device in working order",
                statute="Road Safety Act 1986 (Vic) s.55E",
            ),
            ChecklistItem(
                key="prelim_device_maintained",
                description="Device properly maintained",
                statute="Road Safety Act 1986 (Vic) s.55E",
            ),
            ChecklistItem(
                key="prelim_result_positive",
                description="Result indicated presence of alcohol/drug",
                statute="Road Safety Act 1986 (Vic) s.49",
            ),
        )
        self.evidentiary_items: Sequence[ChecklistItem] = (
            ChecklistItem(
                key="evidentiary_location_approved",
                description="Conducted at approved location",
                statute="Road Safety Act 1986 (Vic) s.55",
            ),
            ChecklistItem(
                key="evidentiary_device_approved",
                description="Approved device used",
                statute="Road Safety Act 1986 (Vic) s.55",
            ),
            ChecklistItem(
                key="evidentiary_proper_performance",
                description="Proper performance established",
                statute="Road Safety Act 1986 (Vic) s.55E",
            ),
            ChecklistItem(
                key="evidentiary_certificate_completed",
                description="Certificate completed",
                statute="Road Safety Act 1986 (Vic) s.48",
            ),
        )

    def evaluate_preliminary(self, data: Mapping[str, bool]) -> List[ChecklistItem]:
        """Return missing preliminary test items."""

        return [item for item in self.preliminary_items if not bool(data.get(item.key))]

    def evaluate_evidentiary(self, data: Mapping[str, bool]) -> List[ChecklistItem]:
        """Return missing evidentiary test items."""

        return [item for item in self.evidentiary_items if not bool(data.get(item.key))]


DISCLOSURE_COMPLIANCE_MATRIX: Dict[str, Sequence[ChecklistItem]] = {
    "prosecution": (
        ChecklistItem(
            key="informant_statement",
            description="Copy of informant's statement",
            statute="Criminal Procedure Act 2009 (Vic) s.187",
        ),
        ChecklistItem(
            key="witness_statements",
            description="Copies of all witness statements",
            statute="Criminal Procedure Act 2009 (Vic) s.187",
        ),
        ChecklistItem(
            key="exhibit_list",
            description="List of exhibits",
            statute="Criminal Procedure Act 2009 (Vic) s.187",
        ),
        ChecklistItem(
            key="accused_priors",
            description="Accused's prior convictions",
            statute="Criminal Procedure Act 2009 (Vic) s.187",
        ),
        ChecklistItem(
            key="exculpatory_material",
            description="Any exculpatory material",
            statute="Criminal Procedure Act 2009 (Vic) s.187",
        ),
        ChecklistItem(
            key="prosecution_timing",
            description="Timing compliance",
            statute="Criminal Procedure Act 2009 (Vic) s.186",
        ),
    ),
    "defence": (
        ChecklistItem(
            key="alibi_notice",
            description="Alibi notice (if applicable)",
            statute="Criminal Procedure Act 2009 (Vic) s.185",
        ),
        ChecklistItem(
            key="expert_evidence_notice",
            description="Expert evidence notice",
            statute="Criminal Procedure Act 2009 (Vic) s.185",
        ),
        ChecklistItem(
            key="defence_witnesses",
            description="Witnesses to be called",
            statute="Criminal Procedure Act 2009 (Vic) s.185",
        ),
        ChecklistItem(
            key="defence_timing",
            description="Timing compliance",
            statute="Criminal Procedure Act 2009 (Vic) s.185",
        ),
    ),
}


def evaluate_disclosure_section(
    section: str, provided: Mapping[str, bool]
) -> List[ChecklistItem]:
    """Check the disclosure compliance matrix for a given section."""

    if section not in DISCLOSURE_COMPLIANCE_MATRIX:
        raise KeyError(f"Unknown disclosure section: {section}")
    return [
        item
        for item in DISCLOSURE_COMPLIANCE_MATRIX[section]
        if not bool(provided.get(item.key))
    ]


class SubmissionBuilder:
    """Generates Magistrates' Court submission skeletons for identified defects."""

    def build_submission(
        self,
        defect_type: str,
        *,
        applicable_law: Sequence[str],
        facts: Sequence[str],
        analysis: Sequence[str],
        defect_description: str,
        legal_consequence: str,
        relief_sought: str,
        authorities: Sequence[str],
    ) -> str:
        """Create a formatted submission skeleton."""

        law_section = "\n".join(applicable_law) if applicable_law else "[Insert law]"
        facts_section = "\n".join(facts) if facts else "[Insert facts]"
        analysis_section = "\n".join(analysis) if analysis else "[Insert analysis]"
        authorities_section = "\n".join(authorities) if authorities else "[Cite authorities]"

        submission = (
            f"SUBMISSION ON {defect_type.upper()}\n\n"
            f"Applicable Law:\n{law_section}\n\n"
            f"Facts:\n{facts_section}\n\n"
            f"Analysis:\n{analysis_section}\n\n"
            f"Defect Identified:\n{defect_description}\n\n"
            f"Legal Consequence:\n{legal_consequence}\n\n"
            f"Relief Sought:\n{relief_sought}\n\n"
            f"Authorities:\n{authorities_section}"
        )
        return submission


class OutcomeTracker:
    """Stores outcome data so the knowledge base can learn from court results."""

    def __init__(self, storage_path: Path | str) -> None:
        self.storage_path = Path(storage_path)
        self.storage_path.parent.mkdir(parents=True, exist_ok=True)
        if not self.storage_path.exists():
            self._write_outcomes([])

    def _read_outcomes(self) -> List[MutableMapping[str, object]]:
        data = json.loads(self.storage_path.read_text())
        return list(data.get("outcomes", []))

    def _write_outcomes(self, outcomes: Sequence[MutableMapping[str, object]]) -> None:
        payload = {"outcomes": list(outcomes)}
        self.storage_path.write_text(json.dumps(payload, indent=2, sort_keys=True))

    def record_outcome(
        self,
        defect_type: str,
        *,
        result: str,
        arguments_accepted: Optional[Sequence[str]] = None,
        arguments_rejected: Optional[Sequence[str]] = None,
        judicial_response: Optional[str] = None,
        remediation_strategy: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> MutableMapping[str, object]:
        """Append a new outcome entry and persist it to storage."""

        outcomes = self._read_outcomes()
        timestamp = datetime.now(timezone.utc).isoformat()
        entry: MutableMapping[str, object] = {
            "defect_type": defect_type,
            "result": result,
            "timestamp": timestamp,
            "arguments_accepted": list(arguments_accepted or []),
            "arguments_rejected": list(arguments_rejected or []),
            "judicial_response": judicial_response,
            "remediation_strategy": remediation_strategy,
            "notes": notes,
        }
        outcomes.append(entry)
        self._write_outcomes(outcomes)
        return entry

    def get_outcomes_for_defect(
        self, defect_type: str
    ) -> List[MutableMapping[str, object]]:
        """Return all stored outcomes for the given defect type."""

        return [
            outcome
            for outcome in self._read_outcomes()
            if outcome.get("defect_type") == defect_type
        ]

    def summarise_results(self) -> Dict[str, Dict[str, int]]:
        """Produce basic statistics for each defect type."""

        summary: Dict[str, Dict[str, int]] = {}
        for outcome in self._read_outcomes():
            defect = str(outcome.get("defect_type"))
            result = str(outcome.get("result"))
            summary.setdefault(defect, {})
            summary[defect].setdefault(result, 0)
            summary[defect][result] += 1
        return summary


__all__ = [
    "ChecklistItem",
    "DefectCategory",
    "ProcedureStage",
    "COURT_DEFECT_CATEGORIES",
    "CONTEST_MENTION_STAGE",
    "SUMMARY_CASE_CONFERENCE",
    "SUMMARY_HEARING_STAGE",
    "MagistratesCourtProcedureChecker",
    "RoadSafetyActChecklist",
    "DISCLOSURE_COMPLIANCE_MATRIX",
    "evaluate_disclosure_section",
    "SubmissionBuilder",
    "OutcomeTracker",
]

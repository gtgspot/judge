"""Data models used for the Phase B statutory compliance analysis."""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Iterable, List, Optional


class ComplianceStatus(Enum):
    """High level tri-state used to express compliance outcomes."""

    COMPLIANT = "GREEN"
    UNCLEAR = "YELLOW"
    NON_COMPLIANT = "RED"

    @property
    def colour(self) -> str:
        """Return the presentation colour defined by the specification."""

        return self.value

    def __str__(self) -> str:  # pragma: no cover - trivial
        return self.name.replace("_", " ")


class Severity(Enum):
    """Defect severity levels required by the Phase B specification."""

    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"


@dataclass(frozen=True)
class WitnessStatement:
    """Represents an individual witness statement disclosed by the prosecution."""

    name: str
    signed: bool
    dated: bool
    date: Optional[str] = None


@dataclass
class DisclosurePackage:
    """Information relating to CPA 2009 disclosure obligations."""

    informant_statement_provided: bool
    witness_statements: List[WitnessStatement] = field(default_factory=list)
    prior_convictions_disclosed: bool = False
    physical_exhibit_list_provided: bool = False
    exhibits_identified: bool = False
    exhibit_descriptions_complete: bool = False
    disclosure_timing_compliant: Optional[bool] = None
    timing_notes: Optional[str] = None

    def missing_mandatory_items(self) -> List[str]:
        """Return the list of mandatory disclosure items that are absent."""

        missing: List[str] = []
        if not self.informant_statement_provided:
            missing.append("informant statement")
        if not self.witness_statements:
            missing.append("witness statements")
        if not self.prior_convictions_disclosed:
            missing.append("prior convictions history")
        if not self.physical_exhibit_list_provided:
            missing.append("physical evidence list")
        return missing

    def unsigned_or_undated_statements(self) -> List[str]:
        """Return witness names for statements missing signatures or dates."""

        return [
            statement.name
            for statement in self.witness_statements
            if not statement.signed or not statement.dated
        ]


@dataclass
class PreliminaryTestRecord:
    """Information about Road Safety Act preliminary or evidentiary tests."""

    statutory_authority: Optional[str] = None
    authority_is_ambiguous: bool = False
    reason_to_believe_detail: Optional[str] = None
    directions_compliance_language: bool = False
    directions_documented: bool = False
    oral_directions_documented: bool = False
    subject_literate: bool = True
    proper_performance_indicators: List[str] = field(default_factory=list)
    evidentiary_test_compliant: Optional[bool] = None
    device_approval_number: Optional[str] = None
    calibration_records: List[str] = field(default_factory=list)
    maintenance_records: List[str] = field(default_factory=list)
    test_time: Optional[str] = None
    driving_time: Optional[str] = None
    time_reference_notes: List[str] = field(default_factory=list)

    def has_reason_to_believe(self) -> bool:
        return bool(self.reason_to_believe_detail and self.reason_to_believe_detail.strip())

    def has_statutory_authority(self) -> bool:
        return bool(self.statutory_authority and self.statutory_authority.strip())

    def has_proper_performance_indicators(self) -> bool:
        return bool(self.proper_performance_indicators)

    def calibration_complete(self) -> bool:
        return bool(self.calibration_records or self.maintenance_records)


@dataclass(frozen=True)
class HearsayEntry:
    """Represents a potential hearsay item mentioned within a document."""

    description: str
    exception_claimed: Optional[str] = None
    exception_supported: bool = False
    business_record: bool = False


@dataclass(frozen=True)
class BusinessRecordEntry:
    """Represents material tendered under the Evidence Act business records exception."""

    description: str
    exception_established: bool
    foundation_details: Optional[str] = None


@dataclass
class EvidenceProfile:
    """Evidence Act compliance profile for a document."""

    hearsay_items: List[HearsayEntry] = field(default_factory=list)
    business_records: List[BusinessRecordEntry] = field(default_factory=list)
    hearsay_review_documented: bool = False
    s137_analysis_documented: bool = False
    s137_prejudice_factors: List[str] = field(default_factory=list)
    s138_exclusion_factors: List[str] = field(default_factory=list)
    s138_mitigation_steps: List[str] = field(default_factory=list)

    def hearsay_without_exception(self) -> List[str]:
        return [
            item.description
            for item in self.hearsay_items
            if item.exception_claimed is None or not item.exception_supported
        ]

    def business_records_without_foundation(self) -> List[str]:
        return [
            record.description
            for record in self.business_records
            if not record.exception_established
        ]

    def has_unlawful_obtainment_risk(self) -> bool:
        return bool(self.s138_exclusion_factors and not self.s138_mitigation_steps)


@dataclass
class DocumentProfile:
    """Aggregate representation of all compliance-relevant attributes for a document."""

    name: str
    disclosure: DisclosurePackage
    preliminary_test: PreliminaryTestRecord
    evidence: EvidenceProfile
    statutory_references: List[str] = field(default_factory=list)
    facts: List[str] = field(default_factory=list)
    procedural_steps: List[str] = field(default_factory=list)
    key_dates: Dict[str, str] = field(default_factory=dict)
    terminology_issues: List[str] = field(default_factory=list)
    typographical_issues: List[str] = field(default_factory=list)
    contextual_gaps: List[str] = field(default_factory=list)

    def normalised_statutory_refs(self) -> Iterable[str]:
        return {ref.strip().lower() for ref in self.statutory_references if ref.strip()}

    def normalised_facts(self) -> Iterable[str]:
        return {fact.strip().lower() for fact in self.facts if fact.strip()}

    def normalised_procedures(self) -> Iterable[str]:
        return {step.strip().lower() for step in self.procedural_steps if step.strip()}

    def material_elements(self) -> Iterable[str]:
        """Key compliance elements derived from the profile."""

        elements = []
        if self.preliminary_test.has_statutory_authority():
            elements.append("statutory authority recorded")
        if self.preliminary_test.has_reason_to_believe():
            elements.append("reason to believe documented")
        if self.preliminary_test.directions_compliance_language:
            elements.append("55D directions language")
        if self.preliminary_test.directions_documented:
            elements.append("directions recorded")
        if self.preliminary_test.oral_directions_documented:
            elements.append("oral directions given")
        if self.preliminary_test.has_proper_performance_indicators():
            elements.append("proper performance indicators")
        if self.preliminary_test.device_approval_number:
            elements.append("device approval number")
        if self.preliminary_test.calibration_complete():
            elements.append("calibration records")
        if self.preliminary_test.test_time:
            elements.append("test time recorded")
        if self.preliminary_test.driving_time:
            elements.append("driving time recorded")
        if not self.disclosure.missing_mandatory_items():
            elements.append("mandatory disclosure complete")
        if not self.disclosure.unsigned_or_undated_statements():
            elements.append("statements signed and dated")
        if self.disclosure.exhibits_identified:
            elements.append("exhibits identified")
        if self.disclosure.exhibit_descriptions_complete:
            elements.append("exhibit descriptions complete")
        if not self.evidence.hearsay_without_exception():
            elements.append("hearsay exceptions satisfied")
        return set(elements)


@dataclass(frozen=True)
class CheckStatus:
    """Represents the result of a single statutory compliance check."""

    status: ComplianceStatus
    message: str
    missing_items: List[str] = field(default_factory=list)

    def summary(self) -> str:
        """Condensed summary for table presentation."""

        if self.missing_items:
            return f"{self.message} (missing: {', '.join(self.missing_items)})"
        return self.message


@dataclass(frozen=True)
class CrossReferenceRow:
    """Row used in the cross-reference matrix comparing Doc A and Doc B."""

    statutory_provision: str
    doc_a: CheckStatus
    doc_b: CheckStatus
    discrepancies: str
    action_required: str


@dataclass
class Defect:
    """Represents an identified defect, grouped by severity."""

    document: str
    description: str
    severity: Severity
    statutory_reference: Optional[str] = None


@dataclass
class DefectReport:
    """Collection of defects separated by severity for ease of rendering."""

    high: List[Defect] = field(default_factory=list)
    medium: List[Defect] = field(default_factory=list)
    low: List[Defect] = field(default_factory=list)

    def add(self, defect: Defect) -> None:
        if defect.severity is Severity.HIGH:
            self.high.append(defect)
        elif defect.severity is Severity.MEDIUM:
            self.medium.append(defect)
        else:
            self.low.append(defect)


@dataclass(frozen=True)
class OmissionsReport:
    """Structured omissions analysis between Doc A and Doc B."""

    elements_only_in_a: List[str]
    statutory_refs_only_in_a: List[str]
    facts_only_in_a: List[str]
    procedures_only_in_a: List[str]
    targeted_omissions: Dict[str, bool]


@dataclass
class PhaseBReport:
    """Aggregate output of the Phase B analysis pipeline."""

    cross_reference_matrix: List[CrossReferenceRow]
    defects: DefectReport
    omissions: OmissionsReport


__all__ = [
    "ComplianceStatus",
    "Severity",
    "WitnessStatement",
    "DisclosurePackage",
    "PreliminaryTestRecord",
    "HearsayEntry",
    "BusinessRecordEntry",
    "EvidenceProfile",
    "DocumentProfile",
    "CheckStatus",
    "CrossReferenceRow",
    "Defect",
    "DefectReport",
    "OmissionsReport",
    "PhaseBReport",
]

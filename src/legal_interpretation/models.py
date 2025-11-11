"""Data models for the Victorian statutory interpretation engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class AmbiguityFinding:
    """Represents an ambiguous phrase that requires interpretation."""

    phrase: str
    literal_meaning: str
    contextual_meaning: str
    purposive_meaning: str
    ambiguity_reason: str
    case_citations: List[str] = field(default_factory=list)
    recommended_interpretation: Optional[str] = None


@dataclass
class ProvisionApplication:
    """How a statutory provision is applied within a document."""

    document_name: str
    facts: str
    requirements_satisfied: bool
    deficiency: Optional[str]
    legal_consequence: Optional[str]
    preferred_argument: str
    statutory_support: bool


@dataclass
class StatutoryProvision:
    """Core representation of a statutory provision and its context."""

    statute: str
    section: str
    text: str
    purpose: Optional[str]
    mischief: Optional[str]
    context_terms: List[str] = field(default_factory=list)
    enumerated_items: List[str] = field(default_factory=list)
    general_phrase: Optional[str] = None
    specific_provisions: List[str] = field(default_factory=list)
    ambiguous_phrases: List[AmbiguityFinding] = field(default_factory=list)
    applications: Dict[str, ProvisionApplication] = field(default_factory=dict)

    @property
    def identifier(self) -> str:
        return f"{self.statute} {self.section}".strip()


@dataclass
class PurposiveConstructionResult:
    """Result of applying s 35(a) purposive construction."""

    provision_id: str
    parliamentary_intention: str
    mischief_addressed: str
    purpose_preference: str


@dataclass
class ExtrinsicMaterialRecommendation:
    """Guidance on the use of extrinsic materials under s 36."""

    provision_id: str
    is_ambiguous: bool
    recommended_sources: List[str]


@dataclass
class InterpretationActAnalysis:
    """Combined Interpretation Act analysis for a provision."""

    purposive_result: PurposiveConstructionResult
    extrinsic_recommendation: ExtrinsicMaterialRecommendation


@dataclass
class CommonLawMaximApplication:
    """Represents how a common law maxim informs interpretation."""

    maxim: str
    application: str
    conclusion: str


@dataclass
class AmbiguityResolution:
    """Stores the recommended resolution of an ambiguity."""

    phrase: str
    literal_interpretation: str
    contextual_interpretation: str
    purposive_interpretation: str
    recommended_interpretation: str
    case_citations: List[str]


@dataclass
class HarmonizationResult:
    """Outcome of comparing how two documents treat the same provision."""

    provision_id: str
    status: str
    analysis: str
    statutory_supporting_document: Optional[str]
    prevailing_document: Optional[str]


@dataclass
class InterpretationReportEntry:
    """Entry summarising how a provision operates across the documents."""

    provision_id: str
    text: str
    applications: List[ProvisionApplication]
    recommended_argument: str


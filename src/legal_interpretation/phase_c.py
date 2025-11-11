"""Phase C - Victorian statutory interpretation workflow."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Sequence

from .models import (
    AmbiguityResolution,
    CommonLawMaximApplication,
    HarmonizationResult,
    InterpretationActAnalysis,
    InterpretationReportEntry,
    ProvisionApplication,
    StatutoryProvision,
)
from .victorian_principles import AmbiguityResolver, CommonLawMaxims, InterpretationActRules


@dataclass
class PhaseCOutput:
    """Aggregate output of the Phase C analysis."""

    interpretation_act: Dict[str, InterpretationActAnalysis]
    common_law: Dict[str, List[CommonLawMaximApplication]]
    ambiguities: Dict[str, List[AmbiguityResolution]]
    harmonisation: List[HarmonizationResult]
    report: List[InterpretationReportEntry]


class PhaseCInterpreter:
    """Coordinator for the Victorian statutory interpretation phase."""

    def __init__(self) -> None:
        self._interpretation_rules = InterpretationActRules()
        self._common_law = CommonLawMaxims()
        self._ambiguity_resolver = AmbiguityResolver()

    def run(self, provisions: Sequence[StatutoryProvision]) -> PhaseCOutput:
        interpretation_act: Dict[str, InterpretationActAnalysis] = {}
        common_law: Dict[str, List[CommonLawMaximApplication]] = {}
        ambiguities: Dict[str, List[AmbiguityResolution]] = {}

        for provision in provisions:
            interpretation_act[provision.identifier] = self._interpretation_rules.analyse_provision(provision)
            common_law[provision.identifier] = self._common_law.analyse(provision)
            ambiguities[provision.identifier] = self._ambiguity_resolver.resolve(provision)

        harmonisation = self._harmonise_documents(provisions)
        report = self._build_report(provisions, ambiguities)

        return PhaseCOutput(
            interpretation_act=interpretation_act,
            common_law=common_law,
            ambiguities=ambiguities,
            harmonisation=harmonisation,
            report=report,
        )

    def _harmonise_documents(self, provisions: Sequence[StatutoryProvision]) -> List[HarmonizationResult]:
        results: List[HarmonizationResult] = []
        for provision in provisions:
            doc_applications = list(provision.applications.values())
            if len(doc_applications) < 2:
                continue

            doc_pairs = self._pairwise(doc_applications)
            for first, second in doc_pairs:
                results.append(self._compare_applications(provision.identifier, first, second))
        return results

    def _compare_applications(
        self,
        provision_id: str,
        first: ProvisionApplication,
        second: ProvisionApplication,
    ) -> HarmonizationResult:
        if first.requirements_satisfied == second.requirements_satisfied:
            status = "Aligned"
            analysis = (
                f"Both {first.document_name} and {second.document_name} treat {provision_id} consistently."
            )
            return HarmonizationResult(
                provision_id=provision_id,
                status=status,
                analysis=analysis,
                statutory_supporting_document=None,
                prevailing_document=None,
            )

        supporting_doc = None
        prevailing_doc = None
        rationale_parts: List[str] = [
            "Conflict identified: applying purposive construction and the generalia specialibus principle."
        ]

        if first.statutory_support != second.statutory_support:
            supporting_doc = first.document_name if first.statutory_support else second.document_name
            prevailing_doc = supporting_doc
            rationale_parts.append(
                f"{supporting_doc} cites statutory directions that align with the specific Victorian requirements."
            )
        else:
            prevailing_doc = first.document_name if first.requirements_satisfied else second.document_name
            rationale_parts.append(
                f"Neither document demonstrates clear statutory backing; prefer {prevailing_doc} because it better advances the legislative purpose under s 35(a)."
            )

        status = "Resolved" if supporting_doc else "Uncertain"
        return HarmonizationResult(
            provision_id=provision_id,
            status=status,
            analysis=" ".join(rationale_parts),
            statutory_supporting_document=supporting_doc,
            prevailing_document=prevailing_doc,
        )

    def _build_report(
        self,
        provisions: Sequence[StatutoryProvision],
        ambiguities: Dict[str, List[AmbiguityResolution]],
    ) -> List[InterpretationReportEntry]:
        report_entries: List[InterpretationReportEntry] = []
        for provision in provisions:
            provision_ambiguities = ambiguities.get(provision.identifier, [])
            recommended_argument = self._select_argument_strategy(provision_ambiguities, provision)
            applications = list(provision.applications.values())
            report_entries.append(
                InterpretationReportEntry(
                    provision_id=provision.identifier,
                    text=provision.text,
                    applications=applications,
                    recommended_argument=recommended_argument,
                )
            )
        return report_entries

    def _select_argument_strategy(
        self,
        ambiguity_resolutions: Iterable[AmbiguityResolution],
        provision: StatutoryProvision,
    ) -> str:
        for resolution in ambiguity_resolutions:
            if resolution.recommended_interpretation == "purposive":
                return "purposive"
        if provision.purpose or provision.mischief:
            return "purposive"
        return "literal"

    def _pairwise(self, applications: Sequence[ProvisionApplication]):
        for i in range(len(applications)):
            for j in range(i + 1, len(applications)):
                yield applications[i], applications[j]


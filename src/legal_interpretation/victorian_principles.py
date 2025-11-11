"""Victorian statutory interpretation principles."""

from __future__ import annotations

from typing import Iterable, List

from .models import (
    AmbiguityFinding,
    AmbiguityResolution,
    CommonLawMaximApplication,
    InterpretationActAnalysis,
    PurposiveConstructionResult,
    ExtrinsicMaterialRecommendation,
    StatutoryProvision,
)


class InterpretationActRules:
    """Hard-coded Interpretation of Legislation Act 1984 (Vic) principles."""

    def analyse_provision(self, provision: StatutoryProvision) -> InterpretationActAnalysis:
        """Apply s 35(a) and s 36 to the provision."""

        intention = self._parliamentary_intention(provision)
        mischief = self._mischief(provision)
        purpose_preference = self._purpose_preference(provision)
        purposive_result = PurposiveConstructionResult(
            provision_id=provision.identifier,
            parliamentary_intention=intention,
            mischief_addressed=mischief,
            purpose_preference=purpose_preference,
        )

        extrinsic = ExtrinsicMaterialRecommendation(
            provision_id=provision.identifier,
            is_ambiguous=bool(provision.ambiguous_phrases),
            recommended_sources=self._extrinsic_sources(provision),
        )

        return InterpretationActAnalysis(
            purposive_result=purposive_result,
            extrinsic_recommendation=extrinsic,
        )

    def _parliamentary_intention(self, provision: StatutoryProvision) -> str:
        if provision.purpose:
            return (
                f"Parliament intended {provision.purpose}. "
                "Section 35(a) requires construing the text to advance this objective."
            )
        return (
            "Parliamentary intention inferred from the statutory context. "
            "Section 35(a) directs the court to adopt a construction that best gives effect to that intention."
        )

    def _mischief(self, provision: StatutoryProvision) -> str:
        if provision.mischief:
            return f"The provision targets the mischief of {provision.mischief}."
        return (
            "The mischief is derived from the legislative history; purposive construction requires resolving the identified problem."
        )

    def _purpose_preference(self, provision: StatutoryProvision) -> str:
        return (
            "Prefer the interpretation that advances the legislative purpose, consistent with s 35(a) of the Interpretation of Legislation Act 1984 (Vic)."
        )

    def _extrinsic_sources(self, provision: StatutoryProvision) -> List[str]:
        sources: List[str] = []
        if provision.ambiguous_phrases:
            sources.append(
                f"Second reading speech for {provision.statute} when introducing {provision.section}."
            )
            sources.append(
                f"Explanatory memorandum for {provision.statute}."
            )
        else:
            sources.append(
                "Extrinsic materials may confirm the ordinary meaning: consider second reading speech and explanatory memorandum if clarification is needed."
            )
        return sources


class CommonLawMaxims:
    """Apply common law maxims of statutory interpretation."""

    def analyse(self, provision: StatutoryProvision) -> List[CommonLawMaximApplication]:
        analyses: List[CommonLawMaximApplication] = []
        analyses.append(self._noscitur(provision))
        analyses.append(self._expressio(provision))
        analyses.append(self._generalia(provision))
        analyses.append(self._ejusdem(provision))
        return analyses

    def _noscitur(self, provision: StatutoryProvision) -> CommonLawMaximApplication:
        context = ", ".join(provision.context_terms) or "the surrounding wording of the section"
        application = (
            f"Noscitur a sociis: interpret the key words in light of {context}. "
            "For example, 'reason to believe' in s 49 is read with the other preconditions in s 49."
        )
        conclusion = (
            "The contested words should align with the neighbouring requirements to maintain coherence within the provision."
        )
        return CommonLawMaximApplication(
            maxim="Noscitur a sociis",
            application=application,
            conclusion=conclusion,
        )

    def _expressio(self, provision: StatutoryProvision) -> CommonLawMaximApplication:
        if provision.enumerated_items:
            listed = ", ".join(provision.enumerated_items)
        else:
            listed = "the specific matters enumerated in the section"
        application = (
            "Expressio unius est exclusio alterius: the statute's express list implies exclusion of unlisted items. "
            f"Here, the legislature identified {listed}, signalling that alternatives are not authorised."
        )
        conclusion = (
            "Unspecified tests or procedures fall outside the statutory power unless another provision expressly confers it."
        )
        return CommonLawMaximApplication(
            maxim="Expressio unius est exclusio alterius",
            application=application,
            conclusion=conclusion,
        )

    def _generalia(self, provision: StatutoryProvision) -> CommonLawMaximApplication:
        specific = ", ".join(provision.specific_provisions) or provision.identifier
        application = (
            "Generalia specialibus non derogant: a specific direction overrides a general rule. "
            f"The detailed requirements in {specific} prevail over broader testing provisions."
        )
        conclusion = (
            "Where conflict arises, courts will prioritise the specific Victorian requirements over general powers."
        )
        return CommonLawMaximApplication(
            maxim="Generalia specialibus non derogant",
            application=application,
            conclusion=conclusion,
        )

    def _ejusdem(self, provision: StatutoryProvision) -> CommonLawMaximApplication:
        if provision.enumerated_items:
            base = ", ".join(provision.enumerated_items)
        else:
            base = "the specific items listed"
        general = provision.general_phrase or "the following general words"
        application = (
            "Ejusdem generis: general words following specific words are confined to the same genus. "
            f"Accordingly, {general} should be limited to things akin to {base}."
        )
        conclusion = (
            "Catch-all language will be read down to prevent expansion beyond the class identified by the specific examples."
        )
        return CommonLawMaximApplication(
            maxim="Ejusdem generis",
            application=application,
            conclusion=conclusion,
        )


class AmbiguityResolver:
    """Resolve ambiguities by comparing literal, contextual and purposive readings."""

    DEFAULT_CASES: Iterable[str] = (
        "DPP v Leys [2012] VSC 519",
        "Director of Housing v Sudi [2011] VSCA 266",
    )

    def resolve(self, provision: StatutoryProvision) -> List[AmbiguityResolution]:
        resolutions: List[AmbiguityResolution] = []
        for finding in provision.ambiguous_phrases:
            recommended = finding.recommended_interpretation or self._preferred(finding)
            case_citations = finding.case_citations or list(self.DEFAULT_CASES)
            resolutions.append(
                AmbiguityResolution(
                    phrase=finding.phrase,
                    literal_interpretation=finding.literal_meaning,
                    contextual_interpretation=finding.contextual_meaning,
                    purposive_interpretation=finding.purposive_meaning,
                    recommended_interpretation=recommended,
                    case_citations=case_citations,
                )
            )
        return resolutions

    def _preferred(self, finding: AmbiguityFinding) -> str:
        literal = finding.literal_meaning.strip().lower()
        contextual = finding.contextual_meaning.strip().lower()
        purposive = finding.purposive_meaning.strip().lower()

        if purposive and purposive != literal:
            return "purposive"
        if contextual and contextual != literal:
            return "contextual"
        return "literal"


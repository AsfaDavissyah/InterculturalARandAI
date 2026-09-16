# Batch 4: Evidence-aware assessment

## Policy version 1

The initial technical threshold is five confirmed learner turns containing at least three words each, and thirty confirmed words in total. These thresholds require expert approval and calibration; they are not a validated psychometric standard. Turn count is an assessment-evidence threshold, not a forced conversation limit.

Only detailed evaluations labelled `openai` contribute rubric scores. Fast chat placeholders, local rule-based scores, duplicate turn numbers, missing values, and out-of-range values do not count. Each rubric needs at least five qualifying evaluated turns. This identifies the existing evaluator pathway, not a cryptographic guarantee of source authenticity.

- `insufficient_evidence`: not enough confirmed speech. Overall and rubric scores are unavailable.
- `evaluation_pending`: sufficient speech, but detailed rubric evidence is incomplete or failed. Unavailable criteria remain blank.
- `partial`: enough scored evidence, but required objective coverage is incomplete or unknown. Evidenced rubric scores may be displayed; overall score is withheld.
- `assessed`: evidence and objective coverage meet the policy. Overall is the mean of the six rubric averages.

Objective coverage is reported separately. Missing objectives do not mechanically reduce grammar or vocabulary scores. Ending manually is not itself a score penalty; it remains a session status independent of assessment status. A manual session may be assessed if all evidence and objectives qualify.

## Application behavior

Confirmed accepted learner messages receive an explicit confirmation flag. Result creation waits up to twelve seconds for outstanding background evaluations, then preserves an unscored/pending status if evaluation remains unavailable. This does not create a background retry service after the session is closed.

Backend history writes recompute assessment rather than trusting a submitted overall score. History/detail/list responses use the same policy; mobile computes the same rules for local reports and history. Missing overall scores serialize as null, not zero. Cohort averages exclude unassessed sessions; CSV scores are blank when unavailable.

Existing records without confirmation markers are conservatively treated as insufficient evidence. Their original database records are not bulk rewritten. Do not treat these records as learner failures or silently infer that their speech was confirmed. Old APKs do not send confirmation markers and need updating before newly recorded practice can qualify.

## Research limitations

This is a transcript-based AI assessment. It does not validate acoustic fluency, pronunciation, accent, or speech timing. Human expert calibration, agreement checks, and real-device acceptance are still required. Neither a completed session nor a score of 5 proves intercultural competence outside the observed practice.

## Release

Deploy backend and dashboard with the new mobile APK together. No production deployment, database migration, APK build, or commit is performed as part of this batch. Validate MongoDB-backed history save/read and export in staging before production; database integration tests are unavailable without a configured test MongoDB.

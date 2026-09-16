# Batch 3: Conversation continuity

## Scope

- Strengthen chat instructions to answer the latest request first, interpret short replies in context, respect corrections and restrictions, and treat objectives as background coverage rather than ordered stages.
- Explicit repetition requests may repeat the previous AI message; unsolicited repeated dialogue is filtered.
- Compare cleaned dialogue before filtering, and avoid rejecting a substantive answer merely because it contains an earlier short acknowledgement.
- Clarification fallback refers to the current exchange instead of resetting the scenario. Unknown explanations still require a focused clarification; local fallback is not equivalent to a language model.
- Dietary restrictions take precedence over menu suggestions. A food mention no longer defaults to pizza.
- Academic consultation fallback stays with the student's work and varies immediate follow-ups.
- Empty model output and filtered output are labelled as fallback, not successful AI dialogue.

## Validation boundaries

Tests cover deterministic fallbacks, objective-order independence, the HTTP response contract, and model-output filtering with a stubbed generation boundary. No paid model call is made, and no production database is changed.

The full backend test suite also includes dashboard CRUD tests requiring MongoDB. In this environment these fail with missing MONGODB_URI/buffering timeouts; do not report the whole backend suite as passing.

Before release, verify a real consultation, changing food preferences, clarification, explicit repetition, and short replies such as "both" against the configured live model. Prompt changes guide model behavior but do not guarantee semantic correctness on every turn. Scoring validity remains a separate batch. No commit or VPS deployment is included here.

Prompt design reference: [OpenAI prompt engineering](https://developers.openai.com/api/docs/guides/prompt-engineering).

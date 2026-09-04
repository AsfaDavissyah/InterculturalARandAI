# Engora Scenario Content Review

Date: 2026-09-04
Scope: 16 canonical scenarios in MongoDB

## Review Standard

Each scenario was checked for a clear title, concise briefing, actionable student task, explicit student role, context-appropriate AI partner, role-play prompt, scenario-specific constraints, and the six Engora assessment criteria. Runtime scenario data was regenerated after the review so the dashboard, mobile API, and AI conversation use the same content.

## Scenario-by-Scenario Result

| Scenario ID | Title | Placement | AI Partner | Review Result |
|---|---|---|---|---|
| ACADEMIC-AFTER-CLASS | After-Class Academic Discussion | Guided Topics | Dr Emma Collins | Passed; prompt and stages now reflect a brief post-class consultation. |
| ACADEMIC-LECTURER-OFFICE | Lecturer's Office Consultation | Guided Topics | Dr Emma Collins | Passed; guidance boundaries and academic safeguards added. |
| G-ICC-008 | Meeting an International Student on Campus | Scenario Library, inactive | David | Passed; retained as an inactive duplicate and given a safe campus-orientation prompt. |
| G-ICC-009 | Asking for a Deadline Extension | Scenario Library, inactive | Dr Daniel Moore | Passed; retained as an inactive duplicate and aligned with the male-only library rule. |
| L-ICC-001 | Direct and Indirect Communication in Group Work | Scenario Library | Raka Pratama | Passed; direct disagreement is separated from rudeness and resolved through negotiation. |
| L-ICC-002 | Different Regional Greeting Norms | Scenario Library | Raka Pratama | Passed; first-meeting privacy and anti-generalization boundaries added. |
| L-ICC-003 | Food, Religion, and Cultural Sensitivity | Scenario Library | Raka Pratama | Passed; dietary needs are handled without assumptions about religion or identity. |
| L-ICC-004 | Urban and Rural Communication Styles | Scenario Library | Raka Pratama | Passed; quietness is not treated as low ability and regional stereotypes are prohibited. |
| L-ICC-006 | Different Ways of Showing Respect to Seniors | Scenario Library | Raka Pratama | Passed; respectful hierarchy is practiced without demanding obedience. |
| L-ICC-007 | Humor and Misunderstanding Across Regions | Scenario Library | Raka Pratama | Passed; interaction focuses on apology and repair without repeating harmful content. |
| M-ICC-010 | Mixed Local and Global Group Project | Scenario Library | David | Passed; leadership, responsibilities, and deadlines are negotiated without national stereotypes. |
| N-ICC-005 | Talking About Culture on Campus | Scenario Library | David | Passed; cultural comparisons are framed as personal observations rather than universal facts. |
| PROFESSIONAL-CAREER-FAIR | International Career Fair | Guided Topics | Michael Harris | Passed; recruiter interaction is concise and does not promise employment. |
| PROFESSIONAL-INTERVIEW-ROOM | Formal Interview Room | Guided Topics | Michael Harris | Passed; structured interview questions and fair-hiring boundaries added. |
| SOCIAL-LONDON-RESTAURANT | Restaurant in London | Guided Topics | Sarah Bennett | Passed; ordering, dietary clarification, payment, and closing now form a natural service flow. |
| SOCIAL-MELBOURNE-CAFE | Cafe in Melbourne | Guided Topics | Olivia Reed | Passed; natural Australian cafe language is used without excessive slang. |

## Shared Improvements Applied

- All 16 core titles, briefings, tasks, student roles, locations, and levels passed completeness checks.
- Every scenario now has a concise custom role-play prompt that forbids scoring or coaching inside the AI response.
- Every scenario has four usable stages: opening, main task, clarification, and closing.
- Every scenario has setting, role, safety, and context-specific constraints.
- Every scenario uses the same six assessment dimensions: grammar, vocabulary, fluency, politeness, pragmatic appropriateness, and intercultural awareness.
- All Scenario Library partners now use a male voice/profile. Guided Topics retain their previously approved characters.
- Raka Pratama and Dr Daniel Moore were added to the approved partner catalog for future dashboard editing.
- Scenario versions were incremented and embedded runtime data was regenerated.
- G-ICC-008 and G-ICC-009 remain inactive and are not returned as active mobile library choices.

## Verification and Rollback

- Post-update audit: 16 passed, 0 pending.
- Pre-update backup: `backend/backups/pre_topics_migration_2026-09-04T00-45-04-229Z`
- Reusable audit/apply script: `backend/scripts/review_scenario_content.js`

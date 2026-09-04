# Product Requirements Document

## Engora Dashboard Admin and Lecturer Simplification

| Field | Value |
| --- | --- |
| Product | Engora - Intercultural Speaking Practice |
| Document status | Approved for implementation |
| Version | 1.0 |
| Date | 2 September 2026 |
| Scope | Dashboard Admin, Dashboard Lecturer, supporting backend contracts, and related mobile visibility |
| Primary repository | `D:\Projects\intercultural-ai-backend` |

## 1. Executive Summary

The current Engora dashboard exposes the structure of the original research spreadsheet directly to Admin and Lecturer users. As a result, users must understand technical terms such as Topic ID, Icon Key, Guided Setting, AI Character Prompt, Detection Cues, Role Boundaries, Completion Conditions, and Assessment Rubric before they can publish a speaking practice scenario.

The product must preserve the research and AI capabilities behind those fields without making users operate them manually.

This redesign introduces one canonical Scenario concept for both Guided Topics and Scenario Library. A scenario uses one editor, one detail view, one lifecycle, and one permission model. Guided Topics and Scenario Library become placements in which the same scenario can appear. A scenario may appear in one or both placements without duplication.

The user-facing Setting concept is removed. Existing Guided Settings are migrated into canonical scenarios. Topics are renamed Categories in the dashboard and are used only to group scenarios.

Modules and QR are temporarily disabled in the dashboard and mobile application through feature flags. Their source code and stored data remain available for a later finishing phase.

The redesigned dashboard must be quiet, operational, easy to scan, and suitable for repeated use by non-technical Admin and Lecturer users.

## 2. Background

### 2.1 Current product structure

The current system contains three overlapping content structures:

1. `Scenario` documents used by Scenario Library.
2. `Topic` documents used to group Guided Topics.
3. `Setting` documents used as individual Guided Topic practices.

The current database includes:

- 10 active Scenario Library scenarios.
- 3 Topics.
- 6 Guided Settings.
- Existing PracticeSession records that reference either legacy scenarios or guided settings.
- Learning Module and QR data introduced in earlier phases.

### 2.2 Why the current experience is difficult

The original Scenario structure closely follows a detailed research spreadsheet. That structure is valuable for AI prompting, research validation, evaluation, and auditability. It is not appropriate as the default authoring interface.

Current problems include:

- Scenario Library and Guided Topics have different CRUD workflows.
- Creating a Scenario Library item requires a four-step builder.
- Creating a Guided Setting requires a separate technical form.
- Topic creation requires manually entered IDs, icon keys, display order, and objective lists.
- Users must understand internal AI configuration before completing basic content work.
- Detail pages present large technical blocks without a clear information hierarchy.
- Topic, Setting, Scenario, Module, Unit, and Page are competing mental models.
- Status is represented inconsistently by active flags, draft behavior, and delete actions.
- Hard delete actions can conflict with research data retention.
- Admin and Lecturer workflows are not clearly separated.
- Modules and QR add navigation and terminology before their primary use case is ready.
- The dashboard does not provide one clear starting point for common tasks.

## 3. Product Vision

An Admin or Lecturer should be able to create a useful speaking practice scenario by describing the situation, roles, task, and destination. Engora should generate or apply the technical AI configuration automatically.

The product model must be understandable in one sentence:

> A Category groups practices, and a Scenario is the practice a student completes.

## 4. Locked Product Decisions

The following decisions are final for this PRD:

1. The dashboard interface remains in English.
2. Labels and help text use plain language rather than research or developer terminology.
3. One canonical Scenario may appear in Guided Topics, Scenario Library, or both.
4. Admin controls final publication.
5. Lecturer may create, edit, and duplicate scenarios owned by that Lecturer as Draft.
6. Lecturer cannot publish, archive, or edit Admin-owned master scenarios.
7. Topic is presented as Category in the dashboard.
8. Admin may create, edit, reorder, activate, and archive Categories.
9. Lecturer may select Categories but may not manage them.
10. Setting is no longer a user-facing entity.
11. Existing Settings are migrated into canonical Scenarios.
12. Modules and QR are disabled with feature flags and not deleted.
13. Hard delete is not available for Scenario, Category, Lecturer, or Practice Result.
14. Lifecycle is `Draft -> In Review -> Published -> Inactive -> Archived`; an Admin may return `In Review` to `Draft` with required review notes.
15. Scenario ID is generated by the system.
16. Admin can see all research data.
17. Lecturer can see only students and sessions connected to the Lecturer's Research Code.
18. Students do not receive a web dashboard.
19. The Engora visual identity is used without copying the spacious mobile layout into an operational dashboard.
20. Technical AI configuration is generated from simple fields and remains available under Advanced Settings for Admin.

## 5. Goals

### 5.1 Primary goals

- Unify Scenario Library and Guided Topics authoring.
- Reduce the number of required fields needed to create a scenario.
- Make Scenario, Category, status, ownership, and placement immediately understandable.
- Give Admin and Lecturer role-specific navigation and actions.
- Preserve all existing AI behavior, voice selection, Tone Engine behavior, scoring, and historical sessions.
- Preserve research data and provide archive/restore behavior.
- Provide predictable loading, empty, success, validation, and error states.
- Make the dashboard responsive and usable on common laptop and tablet widths.
- Establish contracts that can be tested automatically.

### 5.2 Measurable outcomes

- A first-time user can create a valid Draft Scenario in no more than 3 minutes.
- The default Scenario form contains no more than 10 required user decisions.
- A user never needs to type an ID, slug, icon key, JSON value, or comma/newline encoded list.
- Existing 10 Scenario Library scenarios and 6 Guided Settings remain launchable after migration.
- Existing PracticeSession history remains readable without data loss.
- All primary actions are reachable within three navigation actions from login.
- Search, filter, and pagination remain usable with at least 500 scenarios and 10,000 sessions.
- Automated tests cover all role and lifecycle transitions.

## 6. Non-Goals

The following are outside this implementation:

- Re-enabling Modules and QR.
- Redesigning the student mobile experience beyond hiding disabled QR entry points and consuming the unified Scenario response.
- Adding facial expressions or facial animation.
- Completing final 2D sticker artwork.
- Replacing MongoDB Atlas.
- Migrating hosting providers.
- Replacing the existing Tone Engine.
- Replacing the AI model or TTS provider.
- Providing a web dashboard for students.
- Building a full learning management system.
- Allowing users to create arbitrary AI Partner character assets from the Scenario form.

## 7. Personas

### 7.1 System Admin

Responsibilities:

- Maintain master scenarios and Categories.
- Review and publish Lecturer Drafts.
- Manage Lecturer accounts and Research Codes.
- View all student practice results.
- Configure approved AI Partners and system defaults.
- Archive and restore records safely.

Technical expectation:

- Comfortable with ordinary web forms.
- Not expected to understand prompting, JSON, database keys, or evaluation schemas.

### 7.2 Lecturer

Responsibilities:

- Browse published scenarios.
- Create and edit personal Draft Scenarios.
- Duplicate a published scenario as a new Draft.
- Submit a Draft for Admin review.
- View connected students and their practice results.
- Export permitted research data.

Technical expectation:

- Understands teaching objectives and classroom context.
- Is not expected to understand AI prompt engineering or backend identifiers.

### 7.3 Student

Responsibilities:

- Uses the mobile application to select and complete practice.
- Does not use this dashboard.

## 8. Terminology

| Internal or legacy term | User-facing term | Definition |
| --- | --- | --- |
| Topic | Category | A group such as Academic Communication |
| Setting | Scenario | A speaking practice available to a student |
| Scenario Library record | Scenario | The same canonical practice object |
| Guided Setting | Scenario placed in Guided Topics | No separate user-facing entity |
| Scenario Type | Category or optional tag | Not a required free-text technical field |
| AI Role | AI Partner | The character speaking with the student |
| Student Task Instruction | Your Student Task | What the student must accomplish |
| AR Scene | Practice Location | Where the conversation takes place |
| isActive | Status | Draft, Published, Inactive, or Archived |
| Detection Cue | Advanced AI cue | Hidden by default |
| Role Boundary | Advanced AI rule | Hidden by default |
| Rubric JSON | Assessment Criteria | Presented as readable rows under Advanced Settings |

The labels `Setting`, `Topic ID`, `Icon Key`, `Detection Cue`, and `Role Boundary` must not appear in the standard Dashboard workflow.

## 9. Information Architecture

### 9.1 Admin navigation

1. Overview
2. Scenarios
3. Categories
4. Lecturers
5. Practice Results
6. System Settings

Modules and QR are not shown.

### 9.2 Lecturer navigation

1. Overview
2. Scenarios
3. Students
4. Practice Results
5. Profile

Modules and QR are not shown.

### 9.3 Navigation behavior

- The active page is visually distinct and announced to assistive technology.
- Sidebar state may collapse, but labels remain available as tooltips.
- Mobile-width dashboard navigation uses a drawer.
- The account menu contains profile, role, API environment indicator in development only, and logout.
- API configuration is not exposed to ordinary production users.
- Breadcrumbs are shown only on nested pages such as Scenario Detail and Scenario Editor.

## 10. Role and Permission Matrix

| Capability | Admin | Lecturer |
| --- | --- | --- |
| View published scenarios | Yes | Yes |
| View all drafts | Yes | No |
| View own drafts | Yes | Yes |
| Create scenario | Yes | Yes, Draft only |
| Edit Admin-owned published scenario | Yes | No |
| Duplicate published scenario | Yes | Yes, creates owned Draft |
| Submit Draft for review | Not required | Yes |
| Publish scenario | Yes | No |
| Mark scenario inactive | Yes | No |
| Archive/restore scenario | Yes | No |
| Manage Categories | Yes | No |
| Manage approved AI Partners | Yes | No |
| Manage Lecturers | Yes | No |
| View all students and results | Yes | No |
| View linked students and results | Yes | Yes |
| Export all research data | Yes | No |
| Export linked research data | Yes | Yes |
| Edit Advanced AI Settings | Yes | No |
| View Advanced AI Settings | Yes | Read-only summary when needed |

All permission checks must be enforced by the backend. Hiding a button is not an authorization control.

## 11. Feature Requirements

### 11.1 Authentication

- Only Admin and Lecturer roles may log in to the web dashboard.
- Student login attempts return a clear access message.
- Authentication tokens remain in memory according to the established security baseline.
- Expired sessions return the user to login with `Your session has expired. Please sign in again.`
- Logout clears all in-memory session data.
- The login page displays the Engora brand and does not show developer-facing copy.
- API server configuration is available only in development builds.

### 11.2 Admin Overview

The page answers `What needs attention?` rather than acting as a marketing page.

Required summary values:

- Published Scenarios.
- Drafts Awaiting Review.
- Active Categories.
- Active Lecturers.
- Registered Students.
- Practices Completed in the selected period.

Required sections:

- Drafts awaiting review.
- Recent practice activity.
- Scenarios with no recent use.
- Recent Lecturer accounts.
- Quick actions: New Scenario, New Category, Add Lecturer.

The page must not display Modules or QR metrics while those features are disabled.

### 11.3 Lecturer Overview

Required summary values:

- Connected Students.
- Practices This Week.
- Average Overall Score.
- Own Draft Scenarios.

Required sections:

- Recent student sessions.
- Students needing attention, based on incomplete practices or low recent score.
- Own Drafts.
- Quick action: New Scenario.

### 11.4 Scenario List

The Scenario List is the single management page for Guided Topics and Scenario Library.

Required controls:

- Search by title, ID, task, Category, owner, and AI Partner.
- Placement filter: All, Guided Topics, Scenario Library.
- Category filter.
- Status filter.
- Ownership filter: All, Engora Master, My Scenarios.
- Clear filters command.
- Create Scenario command.

Required row information:

- Title.
- Category.
- Placement indicators.
- AI Partner.
- Owner.
- Status.
- Updated date.
- Context menu.

Required row actions, permission dependent:

- View.
- Edit.
- Duplicate.
- Submit for Review.
- Publish.
- Mark Inactive.
- Archive.
- Restore.

Default behavior:

- Archived records are excluded unless the Archived filter is selected.
- Admin sees records from all owners.
- Lecturer sees published master records and records owned by that Lecturer.
- Pagination is server-driven.
- Changing a filter resets to page 1.
- Search is debounced.

### 11.5 Scenario Detail

The default detail view contains readable content, not raw technical configuration.

Header:

- Scenario title.
- Status.
- Owner.
- Last updated.
- Edit or Duplicate action.

Summary sections:

1. Where It Appears.
2. Practice Briefing.
3. Student Role.
4. AI Partner.
5. Student Task.
6. Practice Location and Visual.
7. Session Length.

Admin-only expandable section:

- Advanced AI Settings.
- Version and migration information.
- Audit history.

The detail view must not use three narrow text-heavy columns. It must use a single readable content column with a compact metadata side area on wide screens.

### 11.6 Scenario Editor

The Scenario Editor is one page. It is not a four-step wizard.

#### Required fields

1. Title.
2. Placement, at least one of Guided Topics or Scenario Library.
3. Category when Guided Topics is selected.
4. Practice Briefing.
5. Student Role.
6. AI Partner.
7. Student Task.
8. Practice Location.

#### Optional standard fields

- Language level.
- Sticker or setting visual.
- Target duration.
- Target student response count.

#### Validation rules

| Field | Rule |
| --- | --- |
| Title | Required, 3-100 characters |
| Placement | At least one selection |
| Category | Required when Guided Topics placement is selected |
| Briefing | Required, 20-500 characters |
| Student Role | Required, 5-240 characters |
| AI Partner | Required approved profile |
| Student Task | Required, 20-500 characters |
| Practice Location | Required, 2-120 characters |
| Target duration | Optional, 1-15 minutes |
| Target responses | Optional, 3-20 responses |

#### Form behavior

- Scenario ID is generated on first save and displayed as read-only metadata afterward.
- Save Draft requires only a valid Title. All release-required fields are validated when submitting for review or publishing.
- Unsaved changes trigger a confirmation before leaving.
- Field errors appear next to the affected field and in an accessible summary.
- The primary action remains stable at the bottom of the form.
- Admin sees Save Draft and Publish actions.
- Lecturer sees Save Draft and Submit for Review actions.
- A failed save preserves all entered values.
- No user enters arrays using newline or comma conventions.

#### Advanced Settings

Advanced Settings are collapsed by default.

Admin-editable fields:

- Learning Goal.
- Completion Conditions.
- Conversation Stages.
- Constraints.
- Role Boundaries.
- Location Boundaries.
- Detection Cues.
- Assessment Criteria.
- Minimum, target, and maximum student responses.
- AI prompt override.

Default values are generated deterministically by the backend from the standard fields and system templates. Creating a scenario must not require an additional AI request.

If an Admin edits an advanced value, the field is marked as an override and is not replaced when standard fields change without explicit confirmation.

### 11.7 Scenario Lifecycle

#### Draft

- Not visible in the mobile application.
- Editable by owner and Admin.
- Lecturer may submit it for review.

#### In Review

- Not visible in the mobile application.
- Read-only for the Lecturer while Admin reviews it.
- Admin may Publish it or return it to Draft with a required 3-500 character review note.
- Submission time, submitting user, review decision, reviewer, and review note are retained.

#### Published

- Visible according to placement and Category.
- Only Admin may publish.
- Editing a published scenario increments its version.
- Historical sessions retain their scenario snapshot.

#### Inactive

- Not available for new mobile practices.
- Existing Practice Results remain visible.
- Can be returned to Published by Admin.

#### Archived

- Hidden from normal lists and mobile responses.
- Read-only until restored.
- Never physically deleted through the dashboard.

### 11.8 Duplicate Scenario

- Duplicate creates a new Draft with a new generated Scenario ID.
- The title is initialized as `Copy of {original title}` and receives focus.
- Ownership is assigned to the user performing the action.
- Historical references are not copied.
- Advanced overrides may be copied but are clearly marked.

### 11.9 Categories

Categories replace the technical Topic management interface.

Category List information:

- Icon.
- Name.
- Description.
- Number of Published Scenarios.
- Status.
- Display order.

Category Editor fields:

1. Name.
2. Description.
3. Icon selected from an icon picker.
4. Status.

System-managed fields:

- Category ID/slug.
- Icon key.
- Display order, controlled through drag-and-drop or Move Up/Move Down controls.
- Created and updated timestamps.

Category behavior:

- Category ID is generated from the name and made unique.
- Renaming a Category does not change its ID.
- A Category cannot be archived while any non-archived Guided Topics Scenario references it. The Admin must move those Scenarios to another active Category or remove their Guided Topics placement first. Guided Topics Scenarios are never left uncategorized.
- Language Objectives and ICC Objectives are removed from the default Category form.
- Legacy objective values are preserved as migration metadata and may be shown under Advanced Information.

### 11.10 Lecturer Management

Admin capabilities:

- Search by name, email, and Research Code.
- Filter by Active, Inactive, and Archived.
- Create Lecturer.
- Edit name and email.
- Generate or regenerate a unique Research Code.
- Reset password through a secure flow.
- Mark inactive.
- Archive and restore.
- View number of connected students and recent practices.

Lecturer List columns:

- Name.
- Email.
- Research Code.
- Connected Students.
- Last activity.
- Status.
- Actions.

Passwords must never be displayed after creation. The backend must not log password values.

### 11.11 Students

Lecturer capabilities:

- View only students whose `studentLecturerCode` matches the Lecturer's `lecturerCode`.
- Search by student name, Student ID/NIM, and email.
- View practice count, last practice, and average score.
- Open a student summary.

Admin capabilities:

- View all students from Practice Results and global reporting.
- Filter by Lecturer Research Code.

No student deletion is provided. Incorrect account handling remains an Admin support operation outside this PRD unless a privacy request requires a controlled process.

### 11.12 Practice Results

This page combines the useful parts of Practice History and research reporting.

Filters:

- Date range.
- Student.
- Lecturer.
- Scenario.
- Category.
- Placement.
- Completion status.
- Score range.

List information:

- Student.
- Scenario.
- Lecturer.
- Completed date.
- Duration.
- Response count.
- Overall score.
- Status.

Detail information:

- Scenario snapshot used in the session.
- Overall score.
- Grammar, Vocabulary, Fluency, Politeness, Pragmatic Appropriateness, and Intercultural Awareness.
- Performance summary.
- What Was Done Well.
- Suggestions.
- Transcript.
- Turn-level feedback.
- End reason.
- Latency summary when available.

Permissions:

- Admin sees all sessions.
- Lecturer sees sessions only for connected students.
- Transcript and feedback are read-only.
- Sessions may be archived from ordinary student mobile history according to existing mobile behavior, but research records are not hard deleted from the dashboard.

Export:

- CSV export follows active filters.
- Lecturer export includes only permitted students.
- Export actions record an audit event.
- Sensitive fields not needed for research are excluded by default.

### 11.13 System Settings

Admin-only sections:

- Approved AI Partners.
- Default session limits.
- Default assessment criteria.
- Tone Engine defaults.
- Research consent document references.
- Feature flags.

The page must use domain labels and short explanations. Environment secrets, API keys, JWT secrets, and database credentials are never shown in this dashboard.

### 11.14 Profile

Lecturer may:

- View and edit display name.
- View email.
- View Research Code with a copy command.
- Change password through the authenticated flow.
- View role and account status.

## 12. Modules and QR Feature Disablement

### 12.1 Required feature flags

- `FEATURE_MODULES_ENABLED=false`
- `FEATURE_QR_ENABLED=false`

### 12.2 Dashboard behavior

- Learning Modules is absent from Admin and Lecturer navigation.
- Module creation and QR generation controls are absent.
- Direct navigation to a disabled route shows `This feature is currently unavailable.`
- Existing module and launch-token data remain unchanged.

### 12.3 Mobile behavior

- QR icon is removed from the Home header.
- QR scanner is not reachable through ordinary navigation.
- A legacy QR deep link shows a clear unavailable message and returns to Home.
- Guided Topics and Scenario Library remain available without QR.

### 12.4 Backend behavior

- Module management endpoints remain implemented but are protected by the feature flag.
- QR token generation is disabled.
- QR resolution returns a stable `FEATURE_DISABLED` response when QR is disabled.
- Existing tokens are not deleted.

## 13. Unified Scenario Data Contract

The existing `Scenario` Mongoose model is evolved in place as the canonical, versioned schema. No second Scenario collection is introduced. Legacy fields remain compatibility data while the API representation uses the following contract.

```json
{
  "scenario_id": "SCN-2026-0001",
  "title": "Lecturer's Office Consultation",
  "briefing": "You are attending a scheduled consultation with your lecturer.",
  "placements": ["guided_topics", "scenario_library"],
  "category_ids": ["academic-communication"],
  "status": "published",
  "owner": {
    "type": "admin",
    "user_id": "...",
    "display_name": "System Admin"
  },
  "student_role": "Student attending a scheduled consultation",
  "ai_partner": {
    "profile_id": "emma-lecturer",
    "display_name": "Dr Emma Collins",
    "role": "Foreign Lecturer",
    "culture": "United Kingdom",
    "avatar_key": "female_lecturer_v1",
    "voice_profile": "female"
  },
  "student_task": "Explain your concern, ask for guidance, and close politely.",
  "practice_location": "Lecturer's Office",
  "level": "B1",
  "visual": {
    "sticker_asset_key": "sticker_lecturer_office"
  },
  "session_rules": {
    "target_duration_minutes": 5,
    "minimum_student_responses": 5,
    "target_student_responses_min": 6,
    "target_student_responses_max": 8,
    "maximum_student_responses": 10
  },
  "advanced": {
    "learning_goal": "...",
    "completion_conditions": [],
    "conversation_stages": [],
    "constraints": [],
    "boundaries": {},
    "detection_cues": [],
    "assessment_criteria": [],
    "ai_prompt_override": null
  },
  "version": 1,
  "legacy_refs": {
    "experience_type": "guided_topic",
    "topic_id": "academic-communication",
    "setting_id": "ACADEMIC-LECTURER-OFFICE"
  },
  "created_at": "...",
  "updated_at": "...",
  "archived_at": null
}
```

### 13.1 Contract rules

- `placements` contains one or both allowed values.
- A Guided Topics placement requires at least one Category.
- Scenario Library placement does not require a Category.
- `status` is one of `draft`, `in_review`, `published`, `inactive`, or `archived` and replaces ordinary use of `isActive`.
- `owner` is immutable except during controlled account migration.
- `legacy_refs` preserve backward compatibility and are not editable in the dashboard.
- PracticeSession continues storing a scenario snapshot so historical reports do not change when a Scenario is edited.
- Voice profile selection must preserve the corrected male/female mappings.
- Tone Engine inputs continue to be derived by the existing backend service.

## 14. API Requirements

### 14.1 Dashboard endpoints

Required endpoints under the authenticated `/api/dashboard` namespace:

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/dashboard/overview` | Role-scoped dashboard summary |
| GET | `/api/dashboard/scenarios` | Paginated role-scoped Scenario list |
| POST | `/api/dashboard/scenarios` | Create Draft Scenario |
| GET | `/api/dashboard/scenarios/:scenario_id` | Scenario detail |
| PUT | `/api/dashboard/scenarios/:scenario_id` | Edit allowed Scenario |
| POST | `/api/dashboard/scenarios/:scenario_id/duplicate` | Duplicate as Draft |
| POST | `/api/dashboard/scenarios/:scenario_id/submit` | Lecturer submits for review |
| POST | `/api/dashboard/scenarios/:scenario_id/request-changes` | Admin returns In Review Scenario to Draft with notes |
| POST | `/api/dashboard/scenarios/:scenario_id/publish` | Admin publishes |
| POST | `/api/dashboard/scenarios/:scenario_id/deactivate` | Admin marks inactive |
| POST | `/api/dashboard/scenarios/:scenario_id/archive` | Admin archives |
| POST | `/api/dashboard/scenarios/:scenario_id/restore` | Admin restores |
| GET | `/api/dashboard/categories` | List Categories |
| POST | `/api/dashboard/categories` | Admin creates Category |
| PUT | `/api/dashboard/categories/:category_id` | Admin edits Category |
| POST | `/api/dashboard/categories/reorder` | Admin changes display order |
| POST | `/api/dashboard/categories/:category_id/archive` | Admin archives Category |
| GET | `/api/dashboard/practice-results` | Paginated role-scoped sessions |
| GET | `/api/dashboard/practice-results/:session_id` | Role-scoped session detail |
| GET | `/api/dashboard/practice-results/export.csv` | Filtered role-scoped export |
| GET/POST/PUT | `/api/dashboard/lecturers` | Admin lists, creates, and updates Lecturer accounts |
| PATCH | `/api/dashboard/lecturers/:lecturer_id/status` | Admin activates or deactivates a Lecturer account |
| POST | `/api/dashboard/lecturers/:lecturer_id/reset-password` | Admin resets a Lecturer password |
| POST | `/api/dashboard/lecturers/:lecturer_id/regenerate-code` | Admin replaces a Research Code |
| GET | `/api/dashboard/students` | Role-scoped Student list |
| GET/PUT | `/api/dashboard/profile` | Read or update the signed-in profile |
| GET | `/api/dashboard/system-settings` | Approved AI Partners, defaults, and feature flags |
| GET | `/api/dashboard/audit-events` | Paginated Admin-only audit history |

Existing Admin and Lecturer endpoints may remain as compatibility adapters during rollout.

### 14.2 Mobile endpoints

The mobile application continues using stable public endpoints during migration:

- `/api/scenarios`
- `/api/scenarios/:scenario_id`
- `/api/topics`
- `/api/topics/:topic_id/settings`
- `/api/settings/:setting_id`

These endpoints become read adapters over the canonical Scenario collection. Mobile changes can later consume a new unified endpoint without blocking the dashboard release.

### 14.3 API response behavior

- Pagination responses include `items`, `page`, `page_size`, `total_items`, and `total_pages`.
- Validation failures use HTTP 400 with field-level error codes.
- Authentication failures use HTTP 401.
- Authorization failures use HTTP 403.
- Missing records use HTTP 404.
- Version conflicts use HTTP 409.
- Disabled Module and QR access always uses HTTP 403 with code `FEATURE_DISABLED`. HTTP 410 is reserved for an enabled QR feature whose token has expired.
- Internal errors do not expose stack traces or secrets.
- Every response includes the existing request ID behavior.

## 15. Migration Requirements

### 15.1 Safety requirements

- Create and verify a database backup before migration.
- Produce a migration manifest with counts and checksums where practical.
- Migration is idempotent.
- Migration supports dry-run mode.
- No legacy Scenario, Topic, Setting, PracticeSession, Module, or LaunchToken is physically deleted.
- Rollback instructions are documented and tested against a non-production database.

### 15.2 Content migration

1. Convert each existing Scenario document into a canonical Scenario with `scenario_library` placement.
2. Convert each existing Setting into a canonical Scenario with `guided_topics` placement and its existing Topic as Category.
3. Convert Topic documents into Categories while preserving IDs and display order.
4. Preserve existing active/inactive state as the corresponding lifecycle status.
5. Mark the approved duplicate Library records `G-ICC-008` and `G-ICC-009` as Inactive while retaining their documents and historical references.
6. Flag semantic duplicates using normalized title, task, student role, AI Partner, and location comparison.
7. Do not automatically merge records with historical sessions.
8. Where one canonical scenario should appear in both placements, add both placement values and retain all legacy references.
9. Preserve Setting IDs and Scenario IDs as legacy aliases so existing mobile links and PracticeSession references resolve.

### 15.3 Historical session compatibility

- Existing `experienceType`, `topicId`, `settingId`, and scenario snapshot fields remain readable.
- New sessions store the canonical Scenario ID and retain compatible legacy metadata during transition.
- Reports normalize both legacy and new sessions into one detail presentation.
- Score breakdown and transcript values are not recalculated during migration.

## 16. UX and Visual Requirements

### 16.1 Brand

- Product name is Engora.
- Use the approved Engora mark and wordmark.
- Use the Engora green as the primary operational action color.
- Orange/coral is reserved for emphasis, warning, or a restrained brand accent.
- Error actions use a distinct red.
- Status colors must not be the only status indicator.

### 16.2 Typography

- Fredoka is used for readable interface text when technically appropriate.
- Otomanopee One is reserved for brand or limited display headings.
- Compact panels and tables use smaller, tighter headings.
- Font size does not scale directly with viewport width.
- Letter spacing remains zero.

### 16.3 Layout

- Desktop target: 1280px and wider.
- Laptop target: 1024px.
- Tablet minimum: 768px.
- No horizontal page scrolling at supported widths.
- Tables may switch to structured rows on narrow screens.
- Page sections are not rendered as nested decorative cards.
- Cards use a maximum radius of 8px unless an established component requires otherwise.
- Primary commands use text with a relevant icon.
- Familiar icon-only commands include tooltips and accessible labels.

### 16.4 Content style

- Use direct labels: `New Scenario`, `Save Draft`, `Submit for Review`, `Publish`.
- Avoid copy that explains the interface itself.
- Help text explains domain meaning only where needed.
- Destructive or lifecycle-changing confirmations state the consequence.
- Dates use one consistent locale-aware format.
- Scores are shown consistently out of 5.

## 17. Standard UI States

Every data page must implement:

### Loading

- Show stable skeleton dimensions.
- Do not replace the full page with a spinner.
- Prevent duplicate submissions.

### Empty

- Explain what is empty.
- Offer one appropriate next action.
- Example: `No scenarios yet. Create the first practice for your students.`

### No search results

- Preserve filters.
- Offer Clear Filters.
- Do not show the creation empty state.

### Error

- State what failed in plain language.
- Provide Retry when safe.
- Preserve entered form data.
- Include request ID in expandable support details, not as primary copy.

### Success

- Use a brief toast for routine saves.
- Use an in-page status update for publication or archive transitions.
- Do not require users to dismiss repetitive success modals.

### Offline or backend unavailable

- Show `Engora cannot reach the server right now.`
- Keep read-only data already loaded where possible.
- Disable actions that require the server.

## 18. Accessibility Requirements

- Meet WCAG 2.1 AA for core workflows.
- All actions are keyboard accessible.
- Focus is moved to the modal heading when a modal opens and returned to the trigger when it closes.
- Escape closes non-destructive dialogs.
- Form labels are programmatically associated with controls.
- Validation messages are announced.
- Color contrast meets AA.
- Status is communicated through text and color.
- Icon-only buttons have accessible names.
- Tables have headers and meaningful row actions.
- Drag-and-drop Category ordering includes keyboard Move Up and Move Down alternatives.
- Reduced-motion preferences are respected.

## 19. Security and Privacy Requirements

- Backend authorization is mandatory for every dashboard endpoint.
- Lecturer data scope is enforced using the authenticated Lecturer's code, never a client-supplied code alone.
- Passwords, JWT secrets, MongoDB credentials, OpenAI keys, and raw authorization headers are never logged or returned.
- Admin actions affecting publication, accounts, export, or archive are audited.
- CSV export prevents spreadsheet formula injection.
- User-generated strings are escaped and never injected as raw HTML.
- Rate limits apply to login, export, and AI-affecting mutation endpoints.
- Archived research records follow the agreed retention policy.
- Consent state remains linked to student records and is not editable by Lecturer.
- Production CORS remains restricted to approved origins.
- Development preview bypass must not be included in production builds.

## 20. Performance Requirements

- Dashboard initial authenticated shell should become usable within 2 seconds on a typical broadband connection, excluding a cold backend start.
- List API p95 target is under 500ms when database connectivity is healthy.
- Search and filters are server-side for large datasets.
- Dashboard lists request only fields required for rows.
- Scenario Advanced Settings are loaded on demand.
- Transcript detail is loaded only after opening a result.
- Long transcripts use incremental rendering or pagination.
- Requests are cancellable when filters change.
- Duplicate network requests caused by React lifecycle behavior are avoided.

## 21. Analytics and Audit Events

Operational audit events:

- `scenario_created`
- `scenario_updated`
- `scenario_submitted`
- `scenario_changes_requested`
- `scenario_published`
- `scenario_deactivated`
- `scenario_archived`
- `scenario_restored`
- `scenario_duplicated`
- `category_created`
- `category_updated`
- `category_reordered`
- `lecturer_created`
- `lecturer_status_changed`
- `research_export_created`

Each event includes actor ID, role, record ID, timestamp, request ID, and relevant before/after lifecycle values. Passwords, transcripts, and secrets are excluded from audit payloads.

Audit events are persisted in the `AuditEvent` collection and exposed only to Admin through the paginated `/api/dashboard/audit-events` endpoint.

## 22. Testing Requirements

### 22.1 Backend

- Scenario validation tests.
- Placement and Category rule tests.
- Lifecycle transition tests.
- Admin and Lecturer permission tests.
- Lecturer ownership tests.
- Student and session scoping tests.
- Archive/restore tests.
- Duplicate tests.
- Feature flag tests for Modules and QR.
- Legacy mobile adapter tests.
- Migration idempotency and rollback tests.
- Export security tests.

### 22.2 Dashboard

- Role-specific navigation tests.
- Scenario List filter and pagination tests.
- Scenario Editor validation tests.
- Unsaved changes tests.
- Publish and archive confirmation tests.
- Category management tests.
- Lecturer account tests.
- Results permission and filtering tests.
- Loading, empty, no-result, error, and retry tests.
- Keyboard navigation tests for primary workflows.

### 22.3 Mobile regression

- Guided Topics still list and launch migrated scenarios.
- Scenario Library still lists and launches migrated scenarios.
- QR entry points are hidden.
- Legacy QR deep links show disabled behavior.
- Voice mappings remain correct.
- Tone Engine behavior remains active.
- Practice results and history continue to render.

### 22.4 Visual QA

Verify screenshots at:

- 1440x900.
- 1280x720.
- 1024x768.
- 768x1024.

No text overlap, clipped controls, inaccessible menus, or incoherent nested cards are accepted.

### 22.5 Frontend architecture and browser coverage

- URL hash routes are canonical for every primary dashboard view and Scenario create/detail/edit subview.
- Refresh, direct links, browser Back, and browser Forward restore the same permitted view.
- Admin-only and Lecturer-only routes redirect unauthorized roles to Overview.
- A dashboard Error Boundary isolates render failures and offers a safe reload action.
- API calls live in `src/lib/api-client.js`; authentication persistence lives in `src/lib/auth-session.js`; page behavior lives under `src/views/`; reusable UI lives under `src/components/`.
- Unit and integration tests use Vitest and Testing Library. Browser workflow tests cover login, direct routing, Draft save, review, publish, Category archive protection, and API failure presentation.
- Supported browsers are the latest two stable releases of Chrome, Edge, Firefox, and Safari. The operational baseline is 1280x720; tablet support begins at 768px width.

## 23. Implementation Sequence

### Stage 1: Contracts and safety

- Freeze this PRD.
- Create database backup and manifest.
- Add feature flags for Modules and QR.
- Add unified Scenario contract and migration tests.

### Stage 2: Backend canonical model

- Implement canonical Scenario representation.
- Implement Category adapters.
- Implement lifecycle and ownership rules.
- Implement role-scoped dashboard endpoints.
- Preserve legacy mobile endpoints.

### Stage 3: Admin dashboard foundation

- Replace navigation.
- Add Admin Overview.
- Build unified Scenario List, Detail, and Editor.
- Build Categories.
- Update Lecturer management.

### Stage 4: Lecturer dashboard

- Build Lecturer Overview.
- Add Scenario Catalog and owned Draft behavior.
- Update Students and Practice Results.
- Add Lecturer Profile.

### Stage 5: Migration and mobile alignment

- Dry-run migration.
- Review duplicate report.
- Run production migration with rollback checkpoint.
- Hide QR in mobile.
- Validate all legacy scenario launches.

### Stage 6: QA and rollout

- Run automated suites.
- Run responsive and accessibility QA.
- Run Admin and Lecturer acceptance scripts.
- Deploy behind controlled release configuration.
- Monitor error rate, API latency, and failed scenario launches.

## 24. Acceptance Criteria

The dashboard redesign is complete only when all statements are true.

### Scenario management

- Admin can create and publish a Scenario from one page.
- Lecturer can create a Draft and submit it for review.
- Admin can request changes with review notes, and the Lecturer can edit and resubmit the returned Draft.
- One Scenario can appear in Guided Topics, Scenario Library, or both.
- No default form asks for an ID, slug, icon key, JSON, cue, or boundary.
- Admin can access Advanced Settings without making them mandatory.
- Published, Inactive, Archived, and restored behavior matches this PRD.
- Duplicate creates a new owned Draft without changing the original.

### Categories

- Admin manages Categories with name, description, icon picker, and status.
- Category ID and order are system-managed.
- Lecturer cannot change Categories.
- Existing three Topics appear as Categories with their scenarios intact.

### Roles

- Admin sees all permitted records and global results.
- Lecturer sees published master scenarios, own drafts, connected students, and connected student results only.
- Unauthorized API calls return 403 even when called outside the UI.

### Modules and QR

- No Module or QR navigation is visible in the dashboard.
- No QR command is visible in mobile Home.
- Existing Module and QR data remain stored.
- Disabled direct access returns a clear feature-disabled response.

### Data compatibility

- All existing active scenarios remain launchable.
- All existing Guided Settings remain launchable as canonical scenarios.
- Historical scores and transcripts remain unchanged.
- Legacy mobile endpoints pass regression tests.
- Migration can be run repeatedly without creating duplicate records.

### Quality

- Backend, dashboard, and mobile automated tests pass.
- Core workflows are keyboard accessible.
- Supported viewport screenshots contain no overlap or clipping.
- Production build contains no Admin preview bypass.
- No secret or password appears in logs, responses, or client bundles.

## 25. Release Readiness Checklist

- [ ] PRD approved.
- [ ] Database backup verified.
- [ ] Migration dry run reviewed.
- [ ] Duplicate report reviewed.
- [ ] Modules feature flag off.
- [ ] QR feature flag off.
- [ ] Admin acceptance completed.
- [ ] Lecturer acceptance completed.
- [ ] Mobile regression completed.
- [ ] Security tests completed.
- [ ] Accessibility checks completed.
- [ ] Responsive screenshots approved.
- [ ] Rollback procedure tested.
- [ ] Production environment variables verified.
- [ ] Post-deployment monitoring active.

## 26. Final Product Statement

The completed Engora dashboard must let Admin and Lecturer users work in educational language rather than implementation language. Scenario authoring becomes one consistent workflow, Categories provide organization, and advanced research configuration remains available without blocking routine work. Existing data, AI behavior, voice behavior, Tone Engine behavior, and research history remain protected throughout the transition.

const express = require("express");
const mongoose = require("mongoose");
const User = require("../models/User");
const PracticeSession = require("../models/PracticeSession");
const Scenario = require("../models/Scenario");
const Topic = require("../models/Topic");
const Setting = require("../models/Setting");
const AuditEvent = require("../models/AuditEvent");
const {
  APPROVED_AI_PARTNERS,
  getApprovedAiPartner,
  generateDeterministicAdvancedSettings,
  buildRuntimeScenarioData,
  serializeCanonicalScenario,
} = require("../services/canonical_scenario_service");
const { topicsData, settingsData } = require("../scripts/seed_topics_and_settings");
const { migrateLecturerCode } = require("../services/lecturer_code_service");

function createDashboardRouter({ authenticateJWT, requireRole, logAuditEvent }) {
  const router = express.Router();

  // Protect all dashboard endpoints with JWT and Admin/Lecturer roles
  router.use(authenticateJWT);
  router.use(requireRole(["admin", "lecturer"]));

  function sanitizeCsvField(val) {
    if (val === null || val === undefined) return "";
    let str = String(val);
    if (/^[=+\-@\t\r]/.test(str)) {
      str = "'" + str;
    }
    return `"${str.replace(/"/g, '""')}"`;
  }

  async function generateCanonicalScenarioId() {
    const year = new Date().getFullYear();
    if (mongoose.connection.readyState !== 1) {
      return `SCN-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    let count = await Scenario.countDocuments();
    let id = `SCN-${year}-${String(count + 1).padStart(4, "0")}`;
    let exists = await Scenario.exists({ scenarioId: id });
    while (exists) {
      count++;
      id = `SCN-${year}-${String(count + 1).padStart(4, "0")}`;
      exists = await Scenario.exists({ scenarioId: id });
    }
    return id;
  }

  function generateUniqueCategorySlug(title) {
    const base = String(title || "category")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return base || `category-${Date.now().toString(36)}`;
  }

  function generateLecturerCode(name) {
    const cleanName = String(name || "DR").replace(/[^a-zA-Z]/g, "").substring(0, 3).toUpperCase();
    const randomStr = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `DR-${cleanName}-${randomStr}`;
  }

  function validateScenarioForRelease(scenario) {
    const title = String(scenario.title || "").trim();
    const placements = Array.from(scenario.placements || []);
    const categories = Array.from(scenario.categoryIds || []);
    const briefing = String(scenario.briefing || "").trim();
    const studentRole = String(scenario.studentRole || "").trim();
    const studentTask = String(scenario.studentTask || "").trim();
    const location = String(scenario.practiceLocation || "").trim();
    const errors = [];

    if (title.length < 3 || title.length > 100) errors.push("Title must be 3-100 characters.");
    if (placements.length === 0 || placements.some((p) => !["guided_topics", "scenario_library"].includes(p))) {
      errors.push("Select Guided Topics, Scenario Library, or both.");
    }
    if (placements.includes("guided_topics") && categories.length === 0) {
      errors.push("Select an active Category for Guided Topics.");
    }
    if (briefing.length < 20 || briefing.length > 500) errors.push("Practice Briefing must be 20-500 characters.");
    if (studentRole.length < 5 || studentRole.length > 240) errors.push("Student Role must be 5-240 characters.");
    if (studentTask.length < 20 || studentTask.length > 500) errors.push("Student Task must be 20-500 characters.");
    if (location.length < 2 || location.length > 120) errors.push("Practice Location must be 2-120 characters.");
    if (!scenario.aiPartner?.display_name || !scenario.aiPartner?.role) errors.push("Select an approved AI Partner.");
    return errors;
  }

  async function ensureGuidedCategoriesAreActive(scenario) {
    if (!Array.from(scenario.placements || []).includes("guided_topics")) return [];
    const categoryIds = Array.from(scenario.categoryIds || []);
    const activeCount = await Topic.countDocuments({
      topicId: { $in: categoryIds },
      status: "active",
      isActive: true,
    });
    return activeCount === categoryIds.length ? [] : ["Every Guided Topics category must be active."];
  }

  async function validateReleaseOrRespond(scenario, res) {
    const errors = [
      ...validateScenarioForRelease(scenario),
      ...(await ensureGuidedCategoriesAreActive(scenario)),
    ];
    if (errors.length === 0) return true;
    res.status(422).json({
      error: "SCENARIO_INCOMPLETE",
      message: "Complete the required scenario details before review or publishing.",
      fields: errors,
    });
    return false;
  }

  // ─── 1. OVERVIEW ───
  router.get("/overview", async (req, res) => {
    try {
      const isAdmin = req.user.role === "admin";
      const isDb = mongoose.connection.readyState === 1;

      if (isAdmin) {
        let publishedCount = 0;
        let draftsCount = 0;
        let categoriesCount = 0;
        let lecturersCount = 0;
        let studentsCount = 0;
        let completedPractices = 0;
        let draftsAwaitingReview = [];
        let recentSessions = [];
        let recentLecturers = [];

        if (isDb) {
          [
            publishedCount,
            draftsCount,
            categoriesCount,
            lecturersCount,
            studentsCount,
            completedPractices,
            draftsAwaitingReview,
            recentSessions,
            recentLecturers,
          ] = await Promise.all([
            Scenario.countDocuments({ status: "published" }),
            Scenario.countDocuments({ status: "in_review" }),
            Topic.countDocuments({ status: { $ne: "archived" }, isActive: true }),
            User.countDocuments({ role: "lecturer" }),
            User.countDocuments({ role: "student" }),
            PracticeSession.countDocuments({ status: "completed" }),
            Scenario.find({ status: "in_review" }).sort({ "review.submittedAt": -1, updatedAt: -1 }).limit(5).lean(),
            PracticeSession.find().sort({ completedAt: -1 }).limit(6).populate("userId", "name email studentId").lean(),
            User.find({ role: "lecturer" }).sort({ createdAt: -1 }).limit(5).select("name email lecturerCode createdAt").lean(),
          ]);
        } else {
          publishedCount = 16;
          categoriesCount = topicsData.length;
        }

        return res.json({
          role: "admin",
          summary: {
            published_scenarios: publishedCount,
            drafts_awaiting_review: draftsCount,
            active_categories: categoriesCount,
            active_lecturers: lecturersCount,
            registered_students: studentsCount,
            completed_practices: completedPractices,
          },
          drafts_awaiting_review: draftsAwaitingReview.map(serializeCanonicalScenario),
          recent_sessions: recentSessions.map((s) => ({
            session_id: s.sessionId,
            student_name: s.userId?.name || s.student?.display_name || "Student",
            scenario_title: s.scenario?.title || s.settingTitle || "Speaking Practice",
            overall_score: s.overallScore || 0,
            status: s.status,
            completed_at: s.completedAt || s.createdAt,
          })),
          recent_lecturers: recentLecturers,
        });
      } else {
        // Lecturer Overview
        const lecturer = (isDb && mongoose.Types.ObjectId.isValid(req.user.userId))
          ? await User.findById(req.user.userId).lean()
          : null;
        const lecturerCode = lecturer?.lecturerCode || req.user.lecturerCode || "";

        let connectedStudentsCount = 0;
        let studentIds = [];
        let sessions = [];

        if (isDb) {
          const students = await User.find({ role: "student", studentLecturerCode: lecturerCode }).lean();
          connectedStudentsCount = students.length;
          studentIds = students.map((s) => s._id);

          sessions = await PracticeSession.find({ userId: { $in: studentIds } })
            .sort({ completedAt: -1 })
            .limit(20)
            .lean();
        }

        const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const practicesThisWeek = sessions.filter((s) => new Date(s.completedAt || s.createdAt) >= oneWeekAgo).length;
        const completedSessions = sessions.filter((s) => s.status === "completed");
        const avgScore = completedSessions.length
          ? Number((completedSessions.reduce((sum, s) => sum + (s.overallScore || 0), 0) / completedSessions.length).toFixed(2))
          : 0;

        const studentsNeedingAttention = [];
        const studentLatestMap = new Map();
        sessions.forEach((s) => {
          const uid = String(s.userId);
          if (!studentLatestMap.has(uid)) {
            studentLatestMap.set(uid, s);
          }
        });

        studentLatestMap.forEach((s) => {
          if (s.overallScore < 3.5 || s.status !== "completed") {
            studentsNeedingAttention.push({
              session_id: s.sessionId,
              student_name: s.student?.display_name || "Student",
              scenario_title: s.scenario?.title || "Practice",
              overall_score: s.overallScore || 0,
              status: s.status,
              completed_at: s.completedAt || s.createdAt,
            });
          }
        });

        return res.json({
          role: "lecturer",
          summary: {
            connected_students: connectedStudentsCount,
            practices_this_week: practicesThisWeek,
            average_overall_score: avgScore,
            total_practices: sessions.length,
          },
          recent_sessions: sessions.slice(0, 6).map((s) => ({
            session_id: s.sessionId,
            student_name: s.student?.display_name || "Student",
            scenario_title: s.scenario?.title || "Practice",
            overall_score: s.overallScore || 0,
            status: s.status,
            completed_at: s.completedAt || s.createdAt,
          })),
          students_needing_attention: studentsNeedingAttention.slice(0, 5),
        });
      }
    } catch (err) {
      console.error("[Dashboard Overview Error]:", err);
      return res.status(500).json({ error: "Failed to load overview data." });
    }
  });

  // ─── 2. SCENARIO CATALOG & CRUD ───

  router.get("/scenarios", async (req, res) => {
    try {
      const isAdmin = req.user.role === "admin";
      const {
        q,
        placement,
        category,
        status,
        owner: requestedOwner,
        ownership,
        page = 1,
        page_size = 10,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limit = Math.min(50, Math.max(1, parseInt(page_size, 10) || 10));

      const filter = { placements: "scenario_library" };
      const owner = requestedOwner || ownership;

      // Role scoping:
      if (!isAdmin) filter.status = "published";

      // Status filter:
      if (isAdmin && status && status !== "all") {
        filter.status = status;
      } else if (!status || status === "all") {
        // By default exclude archived unless specifically requested
        if (!filter.status) {
          filter.status = { $ne: "archived" };
        }
      }

      // Placement filter:
      // Guided settings are managed separately and never appear in Scenarios.
      if (placement && placement !== "all" && placement !== "scenario_library") {
        return res.json({ items: [], page: pageNum, page_size: limit, total_items: 0, total_pages: 1 });
      }

      // Category filter:
      if (category && category !== "all") {
        filter.categoryIds = String(category).toLowerCase();
      }

      // Ownership filter:
      if (owner === "master" || owner === "system") {
        filter["owner.type"] = "admin";
      } else if (owner === "mine") {
        filter["owner.user_id"] = req.user.userId;
      }

      // Search query filter:
      if (q && String(q).trim()) {
        const queryRegex = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$and = filter.$and || [];
        filter.$and.push({
          $or: [
            { title: queryRegex },
            { scenarioId: queryRegex },
            { studentTask: queryRegex },
            { briefing: queryRegex },
            { practiceLocation: queryRegex },
            { "aiPartner.display_name": queryRegex },
            { "owner.display_name": queryRegex },
          ],
        });
      }

      let totalItems = 0;
      let scenarios = [];

      if (mongoose.connection.readyState === 1) {
        totalItems = await Scenario.countDocuments(filter);
        scenarios = await Scenario.find(filter)
          .sort({ updatedAt: -1, createdAt: -1 })
          .skip((pageNum - 1) * limit)
          .limit(limit)
          .lean();
      }

      const totalPages = Math.max(1, Math.ceil(totalItems / limit));

      return res.json({
        items: scenarios.map(serializeCanonicalScenario),
        page: pageNum,
        page_size: limit,
        total_items: totalItems,
        total_pages: totalPages,
      });
    } catch (err) {
      console.error("[Dashboard Scenarios List Error]:", err);
      return res.status(500).json({ error: "Failed to load scenarios list." });
    }
  });

  router.post("/scenarios", requireRole(["admin"]), async (req, res) => {
    try {
      const {
        title,
        placements,
        category_ids,
        briefing,
        student_role,
        ai_partner,
        student_task,
        practice_location,
        level = "B1",
        visual,
        session_rules,
        advanced,
      } = req.body;

      // A Draft intentionally needs only a title. Full validation happens on
      // submit/publish so users can save unfinished work safely.
      if (!title || title.trim().length < 3 || title.trim().length > 100) {
        return res.status(400).json({ error: "Title is required (3-100 characters)." });
      }
      const normalizedPlacements = ["scenario_library"];

      const partnerProfile = ai_partner?.profile_id
        ? getApprovedAiPartner(ai_partner.profile_id) || ai_partner
        : APPROVED_AI_PARTNERS[0];

      const scenarioId = await generateCanonicalScenarioId();
      const user = mongoose.Types.ObjectId.isValid(req.user.userId)
        ? await User.findById(req.user.userId).lean()
        : null;

      const owner = {
        type: req.user.role,
        user_id: req.user.userId,
        display_name: user?.name || (req.user.role === "admin" ? "System Admin" : "Lecturer"),
      };

      const generatedAdvancedSettings = generateDeterministicAdvancedSettings({
        title,
        briefing,
        student_role,
        ai_partner: partnerProfile,
        student_task,
        practice_location,
        level,
      });
      const advancedSettings = { ...generatedAdvancedSettings, ...(advanced || {}) };

      const sessionRulesData = {
        target_duration_minutes: Number(session_rules?.target_duration_minutes || 5),
        minimum_student_responses: Number(session_rules?.minimum_student_responses || 5),
        target_student_responses_min: Number(session_rules?.target_student_responses_min || 6),
        target_student_responses_max: Number(session_rules?.target_student_responses_max || 8),
        maximum_student_responses: Number(session_rules?.maximum_student_responses || 10),
      };

      const runtimeData = buildRuntimeScenarioData({
        scenario_id: scenarioId,
        title: title.trim(),
        briefing: String(briefing || "").trim(),
        category_ids: category_ids || [],
        student_role: String(student_role || "Student").trim(),
        ai_partner: partnerProfile,
        student_task: String(student_task || "").trim(),
        practice_location: String(practice_location || "Campus").trim(),
        level,
        session_rules: sessionRulesData,
        advanced: advancedSettings,
        version: 1,
      });

      const newScenario = new Scenario({
        scenarioId,
        title: title.trim(),
        briefing: String(briefing || "").trim(),
        placements: normalizedPlacements,
        categoryIds: category_ids ? category_ids.map((c) => String(c).toLowerCase()) : [],
        status: "draft",
        owner,
        studentRole: String(student_role || "Student").trim(),
        aiPartner: partnerProfile,
        studentTask: String(student_task || "").trim(),
        practiceLocation: String(practice_location || "Campus").trim(),
        level,
        visual: visual || { sticker_asset_key: "" },
        sessionRules: sessionRulesData,
        advanced: advancedSettings,
        version: 1,
        isActive: false,
        legacyRefs: {
          experience_type: "legacy_scenario",
          topic_id: null,
          scenario_id: scenarioId,
        },
        data: runtimeData,
      });

      await newScenario.save();

      logAuditEvent({
        event: "scenario_created",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: scenarioId,
        details: { title, placements: normalizedPlacements, status: "draft" },
        requestId: req.requestId,
      });

      return res.status(201).json(serializeCanonicalScenario(newScenario));
    } catch (err) {
      console.error("[Create Scenario Error]:", err);
      return res.status(500).json({ error: err.message || "Failed to create scenario." });
    }
  });

  router.get("/scenarios/:scenario_id", async (req, res) => {
    try {
      const scenarioId = req.params.scenario_id.toUpperCase();
      const scenario = await Scenario.findOne({ scenarioId }).lean();
      if (!scenario) {
        return res.status(404).json({ error: "Scenario not found." });
      }

      // Check role access
      if (req.user.role !== "admin") {
        const isOwner = String(scenario.owner?.user_id) === String(req.user.userId);
        if (["draft", "in_review"].includes(scenario.status) && !isOwner) {
          return res.status(403).json({ error: "Access denied to draft scenario." });
        }
      }

      return res.json(serializeCanonicalScenario(scenario));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.put("/scenarios/:scenario_id", requireRole(["admin"]), async (req, res) => {
    try {
      const scenarioId = req.params.scenario_id.toUpperCase();
      const scenario = await Scenario.findOne({ scenarioId });
      if (!scenario) {
        return res.status(404).json({ error: "Scenario not found." });
      }

      const isAdmin = req.user.role === "admin";
      const isOwner = String(scenario.owner?.user_id) === String(req.user.userId);

      // Lecturer can only edit their own draft
      if (!isAdmin) {
        if (!isOwner || scenario.status !== "draft") {
          return res.status(403).json({ error: "Lecturers can only edit their own draft scenarios." });
        }
      }

      const {
        title,
        placements,
        category_ids,
        briefing,
        student_role,
        ai_partner,
        student_task,
        practice_location,
        level,
        visual,
        session_rules,
        advanced,
      } = req.body;

      if (title !== undefined) scenario.title = title.trim();
      if (placements !== undefined) scenario.placements = placements;
      if (category_ids !== undefined) scenario.categoryIds = category_ids.map((c) => String(c).toLowerCase());
      if (briefing !== undefined) scenario.briefing = briefing.trim();
      if (student_role !== undefined) scenario.studentRole = student_role.trim();
      if (ai_partner !== undefined) {
        const partnerProfile = ai_partner?.profile_id
          ? getApprovedAiPartner(ai_partner.profile_id) || ai_partner
          : scenario.aiPartner;
        scenario.aiPartner = partnerProfile;
      }
      if (student_task !== undefined) scenario.studentTask = student_task.trim();
      if (practice_location !== undefined) scenario.practiceLocation = practice_location.trim();
      if (level !== undefined) scenario.level = level;
      if (visual !== undefined) scenario.visual = visual;
      if (session_rules !== undefined) scenario.sessionRules = session_rules;
      if (advanced !== undefined) scenario.advanced = { ...(scenario.advanced || {}), ...advanced };

      // If published and edited by Admin, increment version
      if (scenario.status === "published" && isAdmin) {
        scenario.version = (scenario.version || 1) + 1;
      }

      // Rebuild runtime data
      scenario.data = buildRuntimeScenarioData({
        scenario_id: scenario.scenarioId,
        title: scenario.title,
        briefing: scenario.briefing,
        category_ids: scenario.categoryIds,
        student_role: scenario.studentRole,
        ai_partner: scenario.aiPartner,
        student_task: scenario.studentTask,
        practice_location: scenario.practiceLocation,
        level: scenario.level,
        session_rules: scenario.sessionRules,
        advanced: scenario.advanced,
        version: scenario.version,
      });

      await scenario.save();

      logAuditEvent({
        event: "scenario_updated",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: scenarioId,
        details: { version: scenario.version, status: scenario.status },
        requestId: req.requestId,
      });

      return res.json(serializeCanonicalScenario(scenario));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/scenarios/:scenario_id/duplicate", requireRole(["admin"]), async (req, res) => {
    try {
      const originalId = req.params.scenario_id.toUpperCase();
      const original = await Scenario.findOne({ scenarioId: originalId }).lean();
      if (!original) {
        return res.status(404).json({ error: "Original scenario not found." });
      }

      const user = mongoose.Types.ObjectId.isValid(req.user.userId)
        ? await User.findById(req.user.userId).lean()
        : null;
      const newScenarioId = await generateCanonicalScenarioId();

      const duplicated = new Scenario({
        ...original,
        _id: new mongoose.Types.ObjectId(),
        scenarioId: newScenarioId,
        title: `Copy of ${original.title}`,
        status: "draft",
        isActive: false,
        version: 1,
        owner: {
          type: req.user.role,
          user_id: req.user.userId,
          display_name: user?.name || (req.user.role === "admin" ? "System Admin" : "Lecturer"),
        },
        archivedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      duplicated.data = buildRuntimeScenarioData({
        scenario_id: newScenarioId,
        title: duplicated.title,
        briefing: duplicated.briefing,
        category_ids: duplicated.categoryIds,
        student_role: duplicated.studentRole,
        ai_partner: duplicated.aiPartner,
        student_task: duplicated.studentTask,
        practice_location: duplicated.practiceLocation,
        level: duplicated.level,
        session_rules: duplicated.sessionRules,
        advanced: duplicated.advanced,
        version: 1,
      });

      await duplicated.save();

      logAuditEvent({
        event: "scenario_duplicated",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: newScenarioId,
        details: { original_id: originalId },
        requestId: req.requestId,
      });

      return res.status(201).json(serializeCanonicalScenario(duplicated));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/scenarios/:scenario_id/submit", requireRole(["admin"]), async (req, res) => {
    try {
      const scenarioId = req.params.scenario_id.toUpperCase();
      const scenario = await Scenario.findOne({ scenarioId });
      if (!scenario) return res.status(404).json({ error: "Scenario not found." });

      const isOwner = String(scenario.owner?.user_id) === String(req.user.userId);
      if (req.user.role !== "admin" && !isOwner) {
        return res.status(403).json({ error: "Only the owner can submit this draft for review." });
      }

      if (scenario.status !== "draft") {
        return res.status(409).json({ error: "Only a Draft can be submitted for review." });
      }
      if (!(await validateReleaseOrRespond(scenario, res))) return;

      scenario.status = "in_review";
      scenario.review = {
        submittedAt: new Date(),
        submittedBy: req.user.userId,
        reviewedAt: null,
        reviewedBy: null,
        decision: "pending",
        comment: "",
      };
      await scenario.save();

      logAuditEvent({
        event: "scenario_submitted",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: scenarioId,
        requestId: req.requestId,
      });

      return res.json({ success: true, message: "Scenario submitted for review.", scenario: serializeCanonicalScenario(scenario) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/scenarios/:scenario_id/publish", requireRole(["admin"]), async (req, res) => {
    try {
      const scenarioId = req.params.scenario_id.toUpperCase();
      const scenario = await Scenario.findOne({ scenarioId });
      if (!scenario) return res.status(404).json({ error: "Scenario not found." });
      if (!(await validateReleaseOrRespond(scenario, res))) return;

      scenario.status = "published";
      scenario.isActive = true;
      scenario.archivedAt = null;
      scenario.review = {
        ...(scenario.review?.toObject ? scenario.review.toObject() : scenario.review || {}),
        reviewedAt: new Date(),
        reviewedBy: req.user.userId,
        decision: "approved",
        comment: String(req.body?.comment || "").trim(),
      };
      await scenario.save();

      logAuditEvent({
        event: "scenario_published",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: scenarioId,
        requestId: req.requestId,
      });

      return res.json({ success: true, message: "Scenario published successfully.", scenario: serializeCanonicalScenario(scenario) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/scenarios/:scenario_id/request-changes", requireRole(["admin"]), async (req, res) => {
    try {
      const scenarioId = req.params.scenario_id.toUpperCase();
      const scenario = await Scenario.findOne({ scenarioId });
      if (!scenario) return res.status(404).json({ error: "Scenario not found." });
      if (scenario.status !== "in_review") {
        return res.status(409).json({ error: "Only a scenario In Review can be returned for changes." });
      }
      const comment = String(req.body?.comment || "").trim();
      if (comment.length < 3 || comment.length > 500) {
        return res.status(400).json({ error: "A review comment of 3-500 characters is required." });
      }
      scenario.status = "draft";
      scenario.isActive = false;
      scenario.review = {
        ...(scenario.review?.toObject ? scenario.review.toObject() : scenario.review || {}),
        reviewedAt: new Date(),
        reviewedBy: req.user.userId,
        decision: "changes_requested",
        comment,
      };
      await scenario.save();
      logAuditEvent({
        event: "scenario_changes_requested",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: scenarioId,
        details: { comment },
        requestId: req.requestId,
      });
      return res.json({ success: true, message: "Scenario returned to Draft with review notes.", scenario: serializeCanonicalScenario(scenario) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/scenarios/:scenario_id/deactivate", requireRole(["admin"]), async (req, res) => {
    try {
      const scenarioId = req.params.scenario_id.toUpperCase();
      const scenario = await Scenario.findOne({ scenarioId });
      if (!scenario) return res.status(404).json({ error: "Scenario not found." });

      scenario.status = "inactive";
      scenario.isActive = false;
      await scenario.save();

      logAuditEvent({
        event: "scenario_deactivated",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: scenarioId,
        requestId: req.requestId,
      });

      return res.json({ success: true, message: "Scenario marked inactive.", scenario: serializeCanonicalScenario(scenario) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/scenarios/:scenario_id/archive", requireRole(["admin"]), async (req, res) => {
    try {
      const scenarioId = req.params.scenario_id.toUpperCase();
      const scenario = await Scenario.findOne({ scenarioId });
      if (!scenario) return res.status(404).json({ error: "Scenario not found." });

      scenario.status = "archived";
      scenario.isActive = false;
      scenario.archivedAt = new Date();
      await scenario.save();

      logAuditEvent({
        event: "scenario_archived",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: scenarioId,
        requestId: req.requestId,
      });

      return res.json({ success: true, message: "Scenario archived successfully.", scenario: serializeCanonicalScenario(scenario) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/scenarios/:scenario_id/restore", requireRole(["admin"]), async (req, res) => {
    try {
      const scenarioId = req.params.scenario_id.toUpperCase();
      const scenario = await Scenario.findOne({ scenarioId });
      if (!scenario) return res.status(404).json({ error: "Scenario not found." });

      scenario.status = "draft";
      scenario.isActive = false;
      scenario.archivedAt = null;
      await scenario.save();

      logAuditEvent({
        event: "scenario_restored",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: scenarioId,
        requestId: req.requestId,
      });

      return res.json({ success: true, message: "Scenario restored to draft.", scenario: serializeCanonicalScenario(scenario) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 3. CATEGORIES ───

  router.get("/categories", async (req, res) => {
    try {
      const isDb = mongoose.connection.readyState === 1;
      const includeArchived = req.query.include_archived === "true" && req.user.role === "admin";
      const topics = isDb
        ? await Topic.find(includeArchived ? {} : { status: { $ne: "archived" } }).sort({ displayOrder: 1, title: 1 }).lean()
        : topicsData;

      const results = await Promise.all(
        topics.map(async (topic) => {
          const publishedCount = isDb
            ? await Scenario.countDocuments({
                categoryIds: topic.topicId,
                status: "published",
              })
            : 0;
          return {
            category_id: topic.topicId,
            name: topic.title,
            description: topic.description || "",
            icon_key: topic.iconKey || "book",
            display_order: Number(topic.displayOrder || 0),
            status: topic.status || (topic.isActive !== false ? "active" : "archived"),
            is_active: topic.isActive !== false,
            published_scenario_count: publishedCount,
            created_at: topic.createdAt,
            updated_at: topic.updatedAt,
          };
        })
      );

      return res.json(results);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/categories", requireRole(["admin"]), async (req, res) => {
    try {
      const { name, description, icon_key, status = "active" } = req.body;
      if (!name || !name.trim()) {
        return res.status(400).json({ error: "Category name is required." });
      }

      let slug = generateUniqueCategorySlug(name);
      let exists = await Topic.exists({ topicId: slug });
      let counter = 1;
      while (exists) {
        slug = `${generateUniqueCategorySlug(name)}-${counter++}`;
        exists = await Topic.exists({ topicId: slug });
      }

      const count = await Topic.countDocuments();
      const topic = new Topic({
        topicId: slug,
        title: name.trim(),
        description: description ? description.trim() : "",
        iconKey: icon_key || "book",
        displayOrder: count + 1,
        status: status === "active" ? "active" : "archived",
        isActive: status === "active",
      });

      await topic.save();

      logAuditEvent({
        event: "category_created",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: slug,
        details: { name },
        requestId: req.requestId,
      });

      return res.status(201).json({
        category_id: topic.topicId,
        name: topic.title,
        description: topic.description,
        icon_key: topic.iconKey,
        display_order: topic.displayOrder,
        status: topic.status,
        published_scenario_count: 0,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.put("/categories/:category_id", requireRole(["admin"]), async (req, res) => {
    try {
      const slug = req.params.category_id.toLowerCase().trim();
      const topic = await Topic.findOne({ topicId: slug });
      if (!topic) return res.status(404).json({ error: "Category not found." });

      const { name, description, icon_key, status } = req.body;
      if (name !== undefined) topic.title = name.trim();
      if (description !== undefined) topic.description = description.trim();
      if (icon_key !== undefined) topic.iconKey = icon_key.trim();
      if (status !== undefined) {
        if (status !== "active") {
          const linkedGuidedCount = await Scenario.countDocuments({
            categoryIds: slug,
            placements: "guided_topics",
            status: { $ne: "archived" },
          });
          if (linkedGuidedCount > 0) {
            return res.status(409).json({
              error: "CATEGORY_IN_USE",
              message: `Move or remove Guided Topics placement from ${linkedGuidedCount} linked scenario(s) before archiving this Category.`,
              linked_scenario_count: linkedGuidedCount,
            });
          }
        }
        topic.status = status === "active" ? "active" : "archived";
        topic.isActive = status === "active";
      }

      await topic.save();

      logAuditEvent({
        event: "category_updated",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: slug,
        details: { name: topic.title },
        requestId: req.requestId,
      });

      const publishedCount = await Scenario.countDocuments({
        categoryIds: topic.topicId,
        status: "published",
      });

      return res.json({
        category_id: topic.topicId,
        name: topic.title,
        description: topic.description,
        icon_key: topic.iconKey,
        display_order: topic.displayOrder,
        status: topic.status,
        published_scenario_count: publishedCount,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/categories/reorder", requireRole(["admin"]), async (req, res) => {
    try {
      const { ordered_ids } = req.body;
      if (!Array.isArray(ordered_ids)) {
        return res.status(400).json({ error: "ordered_ids must be an array of category IDs." });
      }

      for (let i = 0; i < ordered_ids.length; i++) {
        await Topic.updateOne(
          { topicId: String(ordered_ids[i]).toLowerCase().trim() },
          { $set: { displayOrder: i + 1, updatedAt: new Date() } }
        );
      }

      logAuditEvent({
        event: "category_reordered",
        actorId: req.user.userId,
        role: req.user.role,
        details: { count: ordered_ids.length },
        requestId: req.requestId,
      });

      return res.json({ success: true, message: "Categories reordered successfully." });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/categories/:category_id/archive", requireRole(["admin"]), async (req, res) => {
    try {
      const slug = req.params.category_id.toLowerCase().trim();
      const topic = await Topic.findOne({ topicId: slug });
      if (!topic) return res.status(404).json({ error: "Category not found." });

      const linkedGuidedCount = await Scenario.countDocuments({
        categoryIds: slug,
        placements: "guided_topics",
        status: { $ne: "archived" },
      });
      if (linkedGuidedCount > 0) {
        return res.status(409).json({
          error: "CATEGORY_IN_USE",
          message: `Move or remove Guided Topics placement from ${linkedGuidedCount} linked scenario(s) before archiving this Category.`,
          linked_scenario_count: linkedGuidedCount,
        });
      }

      topic.status = "archived";
      topic.isActive = false;
      topic.archivedAt = new Date();
      await topic.save();

      logAuditEvent({
        event: "category_archived",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: slug,
        requestId: req.requestId,
      });

      return res.json({ success: true, message: "Category archived successfully." });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/categories/:category_id/restore", requireRole(["admin"]), async (req, res) => {
    try {
      const slug = req.params.category_id.toLowerCase().trim();
      const topic = await Topic.findOne({ topicId: slug });
      if (!topic) return res.status(404).json({ error: "Category not found." });
      topic.status = "active";
      topic.isActive = true;
      topic.archivedAt = null;
      await topic.save();
      logAuditEvent({
        event: "category_restored",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: slug,
        requestId: req.requestId,
      });
      return res.json({ success: true, message: "Category restored successfully." });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 4. LECTURERS (ADMIN ONLY) ───

  router.get("/lecturers", requireRole(["admin"]), async (req, res) => {
    try {
      const { q, status } = req.query;
      const filter = { role: "lecturer" };

      if (status && ["active", "inactive"].includes(String(status).toLowerCase())) {
        filter.accountStatus = String(status).toLowerCase();
      }

      if (q && String(q).trim()) {
        const queryRegex = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ name: queryRegex }, { email: queryRegex }, { lecturerCode: queryRegex }];
      }

      const lecturers = await User.find(filter).sort({ createdAt: -1 }).lean();

      const items = await Promise.all(
        lecturers.map(async (u) => {
          const studentCount = await User.countDocuments({
            role: "student",
            studentLecturerCode: u.lecturerCode,
          });
          const lastSession = await PracticeSession.findOne({
            "student.student_id": { $in: await User.find({ studentLecturerCode: u.lecturerCode }).distinct("studentId") },
          })
            .sort({ completedAt: -1 })
            .select("completedAt")
            .lean();

          return {
            id: u._id,
            name: u.name,
            email: u.email,
            lecturer_code: u.lecturerCode,
            connected_students_count: studentCount,
            last_activity: lastSession?.completedAt || u.createdAt,
            status: u.accountStatus || "active",
            created_at: u.createdAt,
          };
        })
      );

      return res.json(items);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/lecturers", requireRole(["admin"]), async (req, res) => {
    try {
      const { name, email, password, gender = "male" } = req.body;
      if (!name || !email || !password) {
        return res.status(400).json({ error: "Name, email, and password are required." });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters." });
      }

      const existing = await User.findOne({ email: email.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ error: "Email is already registered." });
      }

      let code;
      let codeUnique = false;
      let attempts = 0;
      while (!codeUnique && attempts < 10) {
        code = generateLecturerCode(name);
        const isExist = await User.findOne({ lecturerCode: code });
        if (!isExist) codeUnique = true;
        attempts++;
      }

      const lecturer = new User({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        gender,
        role: "lecturer",
        lecturerCode: code,
        accountStatus: "active",
      });

      await lecturer.save();

      logAuditEvent({
        event: "lecturer_created",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: String(lecturer._id),
        details: { name: lecturer.name, email: lecturer.email, lecturer_code: code },
        requestId: req.requestId,
      });

      return res.status(201).json({
        id: lecturer._id,
        name: lecturer.name,
        email: lecturer.email,
        lecturer_code: lecturer.lecturerCode,
        connected_students_count: 0,
        status: "active",
        created_at: lecturer.createdAt,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.put("/lecturers/:lecturer_id", requireRole(["admin"]), async (req, res) => {
    try {
      const lecturer = await User.findOne({ _id: req.params.lecturer_id, role: "lecturer" });
      if (!lecturer) return res.status(404).json({ error: "Lecturer not found." });

      const { name, email, gender } = req.body;
      if (name !== undefined) lecturer.name = name.trim();
      if (email !== undefined) lecturer.email = email.toLowerCase().trim();
      if (gender !== undefined) lecturer.gender = gender;

      await lecturer.save();

      logAuditEvent({
        event: "lecturer_updated",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: String(lecturer._id),
        details: { name: lecturer.name, email: lecturer.email },
        requestId: req.requestId,
      });

      return res.json({
        id: lecturer._id,
        name: lecturer.name,
        email: lecturer.email,
        lecturer_code: lecturer.lecturerCode,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/lecturers/:lecturer_id/regenerate-code", requireRole(["admin"]), async (req, res) => {
    try {
      const lecturer = await User.findOne({ _id: req.params.lecturer_id, role: "lecturer" });
      if (!lecturer) return res.status(404).json({ error: "Lecturer not found." });

      let code;
      let codeUnique = false;
      let attempts = 0;
      while (!codeUnique && attempts < 10) {
        code = generateLecturerCode(lecturer.name);
        const isExist = await User.findOne({ lecturerCode: code });
        if (!isExist) codeUnique = true;
        attempts++;
      }

      const migration = await migrateLecturerCode({
        UserModel: User,
        lecturer,
        nextCode: code,
      });

      logAuditEvent({
        event: "lecturer_code_regenerated",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: String(lecturer._id),
        details: {
          previous_code: migration.previousCode,
          new_code: code,
          migrated_students: migration.migratedStudents,
        },
        requestId: req.requestId,
      });

      return res.json({
        success: true,
        lecturer_code: code,
        migrated_students: migration.migratedStudents,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.post("/lecturers/:lecturer_id/reset-password", requireRole(["admin"]), async (req, res) => {
    try {
      const { new_password } = req.body;
      if (!new_password || new_password.length < 6) {
        return res.status(400).json({ error: "New password must be at least 6 characters." });
      }

      const lecturer = await User.findOne({ _id: req.params.lecturer_id, role: "lecturer" });
      if (!lecturer) return res.status(404).json({ error: "Lecturer not found." });

      lecturer.password = new_password;
      await lecturer.save();

      logAuditEvent({
        event: "lecturer_password_reset",
        actorId: req.user.userId,
        role: req.user.role,
        recordId: String(lecturer._id),
        requestId: req.requestId,
      });

      return res.json({ success: true, message: "Password reset successfully." });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.patch("/lecturers/:lecturer_id/status", requireRole(["admin"]), async (req, res) => {
    try {
      const status = String(req.body?.status || "").toLowerCase();
      if (!["active", "inactive"].includes(status)) {
        return res.status(400).json({ error: "Status must be active or inactive." });
      }
      const lecturer = await User.findOne({ _id: req.params.lecturer_id, role: "lecturer" });
      if (!lecturer) return res.status(404).json({ error: "Lecturer not found." });
      lecturer.accountStatus = status;
      await lecturer.save();
      logAuditEvent({
        event: `lecturer_${status}`,
        actorId: req.user.userId,
        role: req.user.role,
        recordId: String(lecturer._id),
        requestId: req.requestId,
      });
      return res.json({ success: true, status });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 5. STUDENTS ───

  router.get("/students", async (req, res) => {
    try {
      const isAdmin = req.user.role === "admin";
      const { q, lecturer_code } = req.query;

      const filter = { role: "student" };

      if (!isAdmin) {
        const lecturer = await User.findById(req.user.userId).lean();
        const myCode = lecturer?.lecturerCode || req.user.lecturerCode || "";
        filter.studentLecturerCode = myCode;
      } else if (lecturer_code) {
        filter.studentLecturerCode = String(lecturer_code).trim().toUpperCase();
      }

      if (q && String(q).trim()) {
        const queryRegex = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [{ name: queryRegex }, { email: queryRegex }, { studentId: queryRegex }];
      }

      const students = await User.find(filter).sort({ name: 1 }).lean();

      const items = await Promise.all(
        students.map(async (s) => {
          const sessions = await PracticeSession.find({ userId: s._id }).lean();
          const completed = sessions.filter((sess) => sess.status === "completed");
          const avgScore = completed.length
            ? Number((completed.reduce((sum, sess) => sum + (sess.overallScore || 0), 0) / completed.length).toFixed(2))
            : 0;
          const lastSession = sessions.sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))[0];

          return {
            id: s._id,
            name: s.name,
            email: s.email,
            student_id: s.studentId || "-",
            student_lecturer_code: s.studentLecturerCode,
            practice_count: sessions.length,
            completed_count: completed.length,
            average_score: avgScore,
            last_practice: lastSession ? lastSession.completedAt || lastSession.createdAt : null,
            created_at: s.createdAt,
          };
        })
      );

      return res.json(items);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 6. PRACTICE RESULTS & EXPORT ───

  router.get("/practice-results", async (req, res) => {
    try {
      const isAdmin = req.user.role === "admin";
      const {
        q,
        student_id,
        lecturer_code,
        scenario_id,
        category_id,
        status,
        min_score,
        max_score,
        start_date,
        end_date,
        page = 1,
        page_size = 15,
      } = req.query;

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(page_size, 10) || 15));

      const filter = {};

      if (!isAdmin) {
        const lecturer = mongoose.Types.ObjectId.isValid(req.user.userId)
          ? await User.findById(req.user.userId).lean()
          : null;
        const myCode = lecturer?.lecturerCode || req.user.lecturerCode || "";
        const myStudents = await User.find({ role: "student", studentLecturerCode: myCode }).distinct("_id");
        filter.userId = { $in: myStudents };
      } else if (lecturer_code) {
        const matchingStudents = await User.find({
          role: "student",
          studentLecturerCode: String(lecturer_code).trim().toUpperCase(),
        }).distinct("_id");
        filter.userId = { $in: matchingStudents };
      }

      if (student_id) {
        filter.userId = student_id;
      }

      if (scenario_id) {
        filter["scenario.scenario_id"] = String(scenario_id).toUpperCase().trim();
      }

      if (category_id) {
        filter.topicId = String(category_id).toLowerCase().trim();
      }

      if (status && status !== "all") {
        filter.status = status;
      }

      if (min_score || max_score) {
        filter.overallScore = {};
        if (min_score) filter.overallScore.$gte = Number(min_score);
        if (max_score) filter.overallScore.$lte = Number(max_score);
      }

      if (start_date || end_date) {
        filter.completedAt = {};
        if (start_date) filter.completedAt.$gte = new Date(start_date);
        if (end_date) filter.completedAt.$lte = new Date(end_date);
      }

      if (q && String(q).trim()) {
        const queryRegex = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
        filter.$or = [
          { "student.display_name": queryRegex },
          { "student.student_id": queryRegex },
          { "scenario.title": queryRegex },
          { sessionId: queryRegex },
        ];
      }

      const totalItems = await PracticeSession.countDocuments(filter);
      const sessions = await PracticeSession.find(filter)
        .populate("userId", "name email studentId studentLecturerCode")
        .sort({ completedAt: -1, createdAt: -1 })
        .skip((pageNum - 1) * limit)
        .limit(limit)
        .lean();

      const items = sessions.map((s) => ({
        session_id: s.sessionId,
        student_id: s.userId?.studentId || s.student?.student_id || "-",
        student_name: s.userId?.name || s.student?.display_name || "Student",
        student_email: s.userId?.email || "-",
        lecturer_code: s.userId?.studentLecturerCode || "-",
        scenario_id: s.scenario?.scenario_id || s.settingId || "-",
        scenario_title: s.scenario?.title || s.settingTitle || "Speaking Practice",
        category_id: s.topicId || "-",
        duration_seconds: s.durationSeconds || 0,
        student_response_count: s.studentResponseCount || 0,
        overall_score: s.overallScore || 0,
        status: s.status,
        end_reason: s.endReason || null,
        completed_at: s.completedAt || s.createdAt,
      }));

      return res.json({
        items,
        page: pageNum,
        page_size: limit,
        total_items: totalItems,
        total_pages: Math.max(1, Math.ceil(totalItems / limit)),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.delete("/practice-results/:session_id", async (req, res) => {
    try {
      const session = await PracticeSession.findOne({ sessionId: req.params.session_id });
      if (!session) {
        return res.status(404).json({ error: "Practice result not found." });
      }

      if (req.user.role === "lecturer") {
        const [lecturer, student] = await Promise.all([
          mongoose.Types.ObjectId.isValid(req.user.userId)
            ? User.findById(req.user.userId).select("lecturerCode").lean()
            : null,
          session.userId ? User.findById(session.userId).select("studentLecturerCode").lean() : null,
        ]);
        const lecturerCode = lecturer?.lecturerCode || req.user.lecturerCode || "";
        if (!lecturerCode || student?.studentLecturerCode !== lecturerCode) {
          return res.status(403).json({ error: "You can only delete results from your own cohort." });
        }
      }

      await PracticeSession.deleteOne({ _id: session._id });
      logAuditEvent({
        event: "practice_result_deleted",
        actorId: req.user.userId,
        role: req.user.role,
        details: { session_id: session.sessionId },
        requestId: req.requestId,
      });
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.get("/practice-results/export.csv", async (req, res) => {
    try {
      const isAdmin = req.user.role === "admin";
      const { student_id, lecturer_code, scenario_id, category_id, status, start_date, end_date } = req.query;

      const filter = {};

      if (!isAdmin) {
        const lecturer = mongoose.Types.ObjectId.isValid(req.user.userId)
          ? await User.findById(req.user.userId).lean()
          : null;
        const myCode = lecturer?.lecturerCode || req.user.lecturerCode || "";
        const myStudents = await User.find({ role: "student", studentLecturerCode: myCode }).distinct("_id");
        filter.userId = { $in: myStudents };
      } else if (lecturer_code) {
        const matchingStudents = await User.find({
          role: "student",
          studentLecturerCode: String(lecturer_code).trim().toUpperCase(),
        }).distinct("_id");
        filter.userId = { $in: matchingStudents };
      }

      if (student_id) filter.userId = student_id;
      if (scenario_id) filter["scenario.scenario_id"] = String(scenario_id).toUpperCase().trim();
      if (category_id) filter.topicId = String(category_id).toLowerCase().trim();
      if (status && status !== "all") filter.status = status;

      if (start_date || end_date) {
        filter.completedAt = {};
        if (start_date) filter.completedAt.$gte = new Date(start_date);
        if (end_date) filter.completedAt.$lte = new Date(end_date);
      }

      const sessions = await PracticeSession.find(filter)
        .populate("userId", "name email studentId studentLecturerCode")
        .sort({ completedAt: -1 })
        .lean();

      logAuditEvent({
        event: "research_export_created",
        actorId: req.user.userId,
        role: req.user.role,
        details: { count: sessions.length },
        requestId: req.requestId,
      });

      const headers = [
        "Session ID",
        "Student NIM/ID",
        "Student Name",
        "Lecturer Code",
        "Scenario ID",
        "Scenario Title",
        "Category ID",
        "Overall Score",
        "Grammar",
        "Vocabulary",
        "Fluency",
        "Politeness",
        "Pragmatic",
        "ICC Awareness",
        "Duration (Seconds)",
        "Response Count",
        "Status",
        "End Reason",
        "Completed At",
      ];

      const rows = [headers.map(sanitizeCsvField).join(",")];

      sessions.forEach((s) => {
        const scores = s.averageScores || {};
        rows.push(
          [
            sanitizeCsvField(s.sessionId),
            sanitizeCsvField(s.userId?.studentId || s.student?.student_id || ""),
            sanitizeCsvField(s.userId?.name || s.student?.display_name || ""),
            sanitizeCsvField(s.userId?.studentLecturerCode || ""),
            sanitizeCsvField(s.scenario?.scenario_id || s.settingId || ""),
            sanitizeCsvField(s.scenario?.title || s.settingTitle || ""),
            sanitizeCsvField(s.topicId || ""),
            s.overallScore || 0,
            scores.grammar || 0,
            scores.vocabulary || 0,
            scores.fluency || 0,
            scores.politeness || 0,
            scores.pragmatic_appropriateness || 0,
            scores.intercultural_awareness || 0,
            s.durationSeconds || 0,
            s.studentResponseCount || 0,
            sanitizeCsvField(s.status || ""),
            sanitizeCsvField(s.endReason || ""),
            sanitizeCsvField(s.completedAt ? new Date(s.completedAt).toISOString() : ""),
          ].join(",")
        );
      });

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="engora_practice_results.csv"');
      return res.send(rows.join("\n"));
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.get("/practice-results/:session_id", async (req, res) => {
    try {
      const sessionId = req.params.session_id;
      const session = await PracticeSession.findOne({ sessionId })
        .populate("userId", "name email studentId studentLecturerCode")
        .lean();

      if (!session) {
        return res.status(404).json({ error: "Session record not found." });
      }

      // Check role access
      if (req.user.role !== "admin") {
        const lecturer = await User.findById(req.user.userId).lean();
        const myCode = lecturer?.lecturerCode || req.user.lecturerCode || "";
        if (session.userId?.studentLecturerCode !== myCode) {
          return res.status(403).json({ error: "Access denied to session of unlinked student." });
        }
      }

      const scores = session.averageScores || {};

      return res.json({
        session_id: session.sessionId,
        student: {
          id: session.userId?._id,
          name: session.userId?.name || session.student?.display_name || "Student",
          email: session.userId?.email || "-",
          student_id: session.userId?.studentId || session.student?.student_id || "-",
          lecturer_code: session.userId?.studentLecturerCode || "-",
        },
        scenario: session.scenario || {},
        overall_score: session.overallScore || 0,
        score_breakdown: {
          grammar: scores.grammar || 0,
          vocabulary: scores.vocabulary || 0,
          fluency: scores.fluency || 0,
          politeness: scores.politeness || 0,
          pragmatic_appropriateness: scores.pragmatic_appropriateness || 0,
          intercultural_awareness: scores.intercultural_awareness || 0,
        },
        duration_seconds: session.durationSeconds || 0,
        student_response_count: session.studentResponseCount || 0,
        status: session.status,
        end_reason: session.endReason || null,
        completed_at: session.completedAt || session.createdAt,
        transcript: session.transcript || [],
        evaluations: session.evaluations || [],
        coaching_events: session.coachingEvents || [],
        latency_summary: session.latencySummary || {},
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 7. SYSTEM SETTINGS (ADMIN ONLY) ───

  router.get("/system-settings", requireRole(["admin"]), async (req, res) => {
    return res.json({
      approved_ai_partners: APPROVED_AI_PARTNERS,
      default_session_rules: {
        minimum_student_responses: 5,
        target_student_responses_min: 6,
        target_student_responses_max: 8,
        maximum_student_responses: 10,
        target_duration_minutes: 5,
      },
      default_criteria: [
        { criterion: "grammar", label: "Grammar & Accuracy", weight: 5 },
        { criterion: "vocabulary", label: "Vocabulary & Range", weight: 5 },
        { criterion: "fluency", label: "Fluency & Delivery", weight: 5 },
        { criterion: "politeness", label: "Politeness & Register", weight: 5 },
        { criterion: "pragmatic_appropriateness", label: "Pragmatic Appropriateness", weight: 5 },
        { criterion: "intercultural_awareness", label: "Intercultural Awareness", weight: 5 },
      ],
      tone_engine_defaults: {
        model: "gpt-4o-mini",
        expressive_tts: true,
      },
      feature_flags: {
        modules: process.env.FEATURE_MODULES_ENABLED === "true",
        qr: process.env.FEATURE_QR_ENABLED === "true",
      },
    });
  });

  router.get("/audit-events", requireRole(["admin"]), async (req, res) => {
    try {
      const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
      const pageSize = Math.min(100, Math.max(1, Number.parseInt(req.query.page_size, 10) || 25));
      const filter = {};
      if (req.query.event) filter.event = String(req.query.event).trim();
      if (req.query.record_id) filter.recordId = String(req.query.record_id).trim();
      const [items, totalItems] = await Promise.all([
        AuditEvent.find(filter).sort({ createdAt: -1 }).skip((page - 1) * pageSize).limit(pageSize).lean(),
        AuditEvent.countDocuments(filter),
      ]);
      return res.json({
        items: items.map((item) => ({
          id: item._id,
          event: item.event,
          actor_id: item.actorId,
          role: item.role,
          record_id: item.recordId,
          request_id: item.requestId,
          details: item.details || {},
          created_at: item.createdAt,
        })),
        page,
        page_size: pageSize,
        total_items: totalItems,
        total_pages: Math.max(1, Math.ceil(totalItems / pageSize)),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  // ─── 8. PROFILE ───

  router.get("/profile", async (req, res) => {
    try {
      const user = mongoose.Types.ObjectId.isValid(req.user.userId)
        ? await User.findById(req.user.userId).lean()
        : null;

      return res.json({
        id: user?._id || req.user.userId,
        name: user?.name || "User",
        email: user?.email || req.user.email,
        role: user?.role || req.user.role,
        gender: user?.gender || "male",
        account_status: user?.accountStatus || "active",
        student_id: user?.studentId || null,
        student_lecturer_code: user?.studentLecturerCode || null,
        lecturer_code: user?.lecturerCode || req.user.lecturerCode || null,
        created_at: user?.createdAt || new Date(),
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  router.put("/profile", async (req, res) => {
    try {
      const { name, email, gender, current_password, new_password } = req.body;
      const user = mongoose.Types.ObjectId.isValid(req.user.userId)
        ? await User.findById(req.user.userId)
        : null;

      if (!user) {
        return res.json({
          success: true,
          message: "Profile updated.",
          user: {
            id: req.user.userId,
            name: name || "User",
            email: req.user.email,
            role: req.user.role,
            lecturer_code: req.user.lecturerCode || null,
          },
        });
      }

      if (name && name.trim()) {
        user.name = name.trim();
      }

      if (email && email.trim().toLowerCase() !== user.email) {
        const normalizedEmail = email.trim().toLowerCase();
        if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
          return res.status(400).json({ error: "Enter a valid email address." });
        }
        const existingEmail = await User.findOne({ email: normalizedEmail, _id: { $ne: user._id } });
        if (existingEmail) {
          return res.status(400).json({ error: "Email is already registered." });
        }
        user.email = normalizedEmail;
      }

      if (gender !== undefined) {
        if (!["male", "female"].includes(gender)) {
          return res.status(400).json({ error: "Gender must be male or female." });
        }
        user.gender = gender;
      }

      if (new_password) {
        if (!current_password) {
          return res.status(400).json({ error: "Current password is required to change password." });
        }
        const isMatch = await user.comparePassword(current_password);
        if (!isMatch) {
          return res.status(400).json({ error: "Current password does not match." });
        }
        if (new_password.length < 6) {
          return res.status(400).json({ error: "New password must be at least 6 characters." });
        }
        user.password = new_password;
      }

      await user.save();

      return res.json({
        success: true,
        message: "Profile updated successfully.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          gender: user.gender,
          account_status: user.accountStatus,
          student_id: user.studentId || null,
          student_lecturer_code: user.studentLecturerCode || null,
          lecturer_code: user.lecturerCode || null,
        },
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = {
  createDashboardRouter,
};

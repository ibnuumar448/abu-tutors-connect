"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestMatch = void 0;
const generative_ai_1 = require("@google/generative-ai");
const User_1 = __importDefault(require("../models/User"));
const logger_1 = __importDefault(require("../utils/logger"));
const getTutorsForMatch = async (course, prompt, budget) => {
    // Extract key words from the prompt (words > 4 chars, max 3 words)
    const keywords = prompt.split(/\s+/).filter(w => w.length > 4).slice(0, 3);
    const keywordRegex = keywords.length > 0 ? new RegExp(keywords.join('|'), 'i') : /.*/;
    // Build query object
    const query = {
        role: { $in: ['tutor', 'verified_tutor'] },
        $or: [
            { courses: { $regex: course, $options: 'i' } },
            { department: { $regex: course, $options: 'i' } },
            { areaOfStrength: { $regex: course, $options: 'i' } },
            { matchingBio: { $regex: course, $options: 'i' } },
            // Also look for conceptual keywords from the student's problem description
            { areaOfStrength: { $regex: keywordRegex } },
            { matchingBio: { $regex: keywordRegex } }
        ]
    };
    // If a budget is provided, filter by hourly rate (allowing strictly lower or equal to budget)
    if (budget) {
        query.hourlyRate = { $lte: budget };
    }
    // Standard backend search to find candidates, sorted by rating and experience metrics
    let candidates = await User_1.default.find(query)
        .sort({ averageRating: -1, sessionsCompleted: -1 })
        .limit(15)
        .select('name faculty level courses matchingBio averageRating sessionsCompleted hourlyRate areaOfStrength _id');
    // FALLBACK: If specific concept search yields 0, just pull the absolute best tutors on the platform
    // and let the AI decide if any of them possess cross-applicable skills.
    if (candidates.length === 0) {
        const fallbackQuery = { role: { $in: ['tutor', 'verified_tutor'] } };
        if (budget)
            fallbackQuery.hourlyRate = { $lte: budget };
        candidates = await User_1.default.find(fallbackQuery)
            .sort({ averageRating: -1, sessionsCompleted: -1 })
            .limit(15)
            .select('name faculty level courses matchingBio averageRating sessionsCompleted hourlyRate areaOfStrength _id');
    }
    return candidates;
};
const requestMatch = async (req, res) => {
    try {
        const { course, prompt, budget } = req.body;
        if (!course || !prompt) {
            res.status(400).json({ message: "Missing course code or problem description." });
            return;
        }
        logger_1.default.info(`[HYBRID AI] Matching request received for course: ${course}, Budget: ${budget || 'flexible'}`);
        // 1. Pre-fetch candidates (Database Search - Fast & Free)
        const candidates = await getTutorsForMatch(course, prompt, Number(budget) || undefined);
        if (candidates.length === 0) {
            logger_1.default.info(`[HYBRID AI] No candidates found in database for ${course} within budget.`);
            res.status(200).json({
                message: "We couldn't find tutors specifically matching this course and budget right now, but our platform is growing!",
                recommendations: []
            });
            return;
        }
        // 2. Single-Pass AI Decision (Agentic & Analytical)
        if (!process.env.GEMINI_API_KEY) {
            logger_1.default.warn(`[HYBRID AI] GEMINI_API_KEY is missing from environment.`);
            res.status(200).json({
                message: "AI service is currently offline, but here are some highly-rated tutors we found!",
                recommendations: candidates.slice(0, 3).map(c => ({
                    tutor: c,
                    matchScore: 75,
                    reasoning: "Highly rated match from our platform database."
                }))
            });
            return;
        }
        const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Using gemini-1.5-flash for speed and cost efficiency
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const promptTemplate = `
        You are the ABUTutorsConnect AI Matchmaker and Research Analyst.
        Evaluate the following tutors to find the top 3 best matches for this student based on their difficulty description, budget, and the tutor's metrics.
        
        STUDENT NEEDS:
        - Topic/Course: ${course}
        - Problem Description: ${prompt}
        - Budget: ${budget ? '₦' + budget : 'Flexible'}

        CANDIDATES:
        ${candidates.map((t, i) => `${i + 1}. [ID: ${t._id?.toString()}]
             Name: ${t.name}
             Academics: ${t.faculty} | Level: ${t.level}
             Courses Taught: ${t.courses?.join(', ') || 'N/A'}
             Metrics: Rate: ₦${t.hourlyRate || 0}/hr | Rating: ${t.averageRating || 0}/5 | Sessions Completed: ${t.sessionsCompleted || 0}
             Strength: "${t.areaOfStrength || 'N/A'}"
             Bio: "${t.matchingBio || 'N/A'}"`).join('\n\n')}

        RULES:
        1. Act as an analytical human advisor. Compute a mental Match Score (0-100) weighing:
           - Subject/topic relevance (highest weight)
           - Tutor rating & sessions completed (reliability)
           - Cost efficiency against the student's budget
        2. **CRITICAL RULE**: Prioritize the student's "Problem Description" over strict course code matching! Even if the tutor teaches a different course code, if their "Strength" or "Bio" proves they understand the concepts the student is struggling with, score them highly!
        3. Select the top 1 to 3 tutors that BEST fit the student's problem. If absolutely NONE of the tutors are even remotely capable of helping with the topic, you may return an empty recommendations array.
        4. Write a dynamic, highly analytical, human-like "reasoning" paragraph for EACH recommendation explaining EXACTLY why they are a great fit based on their metrics and the student's prompt. Do NOT be generic (e.g., instead of "Good fit", say "With a perfect 5.0 rating and a rate well within your budget, their specific focus on calculus makes them an ideal match for your derivatives problem.")
        5. Return ONLY a valid JSON object matching the format below. No other text.

        OUTPUT FORMAT:
        {
           "message": "A warm, analytical opening message from the AI explaining the search results comprehensively.",
           "recommendations": [
             {
               "tutor_id": "The _id of the tutor",
               "matchScore": 0-100,
               "reasoning": "Detailed, analytical reasoning (2-3 sentences) on why their metrics and skills fit."
             }
           ]
        }
        `;
        const result = await model.generateContent(promptTemplate);
        const rawResponse = result.response.text();
        // Robust JSON extraction
        let aiDecision;
        try {
            const jsonPart = rawResponse.substring(rawResponse.indexOf('{'), rawResponse.lastIndexOf('}') + 1);
            aiDecision = JSON.parse(jsonPart);
            logger_1.default.info(`[HYBRID AI] Match decision generated successfully for ${course}`);
        }
        catch (parseErr) {
            logger_1.default.error(`[HYBRID AI] Failed to parse AI JSON: ${rawResponse}`);
            throw new Error("AI output was malformed");
        }
        // Map the full tutor objects based on the recommendations
        const topRecommendations = (aiDecision?.recommendations || []).map((rec) => {
            const aiId = String(rec.tutor_id).trim();
            const t = candidates.find(cand => cand._id?.toString().trim() === aiId);
            if (!t)
                return null;
            return {
                tutor: t,
                matchScore: rec.matchScore || 80,
                reasoning: rec.reasoning || "Tutor expertise matches your request."
            };
        }).filter((r) => r !== null);
        res.status(200).json({
            message: aiDecision?.message || "I've analyzed the profiles and found some highly qualified tutors for you!",
            recommendations: topRecommendations.length > 0 ? topRecommendations : [{
                    tutor: candidates[0],
                    matchScore: 85,
                    reasoning: "Matched based on our top database records and overall tutor performance metrics."
                }]
        });
    }
    catch (err) {
        logger_1.default.error(`[HYBRID AI] Critical Failure: ${err.message}`);
        // Panic Fallback: Return database matches so service doesn't "break" for user
        try {
            const candidates = await getTutorsForMatch(req.body.course || "", req.body.prompt || "", Number(req.body.budget) || undefined);
            res.status(200).json({
                message: "I found some highly qualified tutors who can help you with your course!",
                recommendations: candidates.slice(0, 3).map(c => ({
                    tutor: c,
                    reasoning: "Matched based on robust database records and tutor performance metrics.",
                    matchScore: 70
                })),
                error: true // Hint to frontend if needed
            });
        }
        catch (fallbackErr) {
            res.status(500).json({ message: "Engine failure. Please try again later." });
        }
    }
};
exports.requestMatch = requestMatch;
//# sourceMappingURL=matchController.js.map
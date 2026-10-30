const ChatSession = require('../models/ChatSession');
const ChatMessage = require('../models/ChatMessage');
const Document = require('../models/Document');
const ragService = require('../services/ragService');
const { AppError } = require('../utils/errorHandler');
const { successResponse, errorCodes } = require('../utils/responseHelper');

/**
 * POST /api/v1/chat/sessions
 * Create a new chat session
 */
const createSession = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;
    const { title } = req.body;

    const session = await ChatSession.create({
      companyId,
      userId: req.user.id || req.user._id,
      title: title && title.trim() ? title.trim() : 'New Chat',
      messageCount: 0,
      status: 'active',
    });

    return successResponse(res, session, 'Chat session created successfully', 201);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/chat/sessions
 * List active chat sessions for authenticated user
 */
const listSessions = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;
    const userId = req.user.id || req.user._id;

    const sessions = await ChatSession.find({
      companyId,
      userId,
      status: 'active',
    })
      .sort({ updatedAt: -1 })
      .lean();

    return successResponse(res, sessions, 'Chat sessions retrieved successfully', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * GET /api/v1/chat/sessions/:id
 * Retrieve session details and message history
 */
const getSession = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;
    const userId = req.user.id || req.user._id;

    const session = await ChatSession.findOne({
      _id: req.params.id,
      companyId,
      userId,
    }).lean();

    if (!session) {
      throw new AppError(404, 'Chat session not found', true, errorCodes.NOT_FOUND);
    }

    const messages = await ChatMessage.find({
      sessionId: session._id,
      companyId,
    })
      .sort({ timestamp: 1 })
      .lean();

    return successResponse(res, { session, messages }, 'Chat session messages retrieved', 200);
  } catch (error) {
    return next(error);
  }
};

/**
 * POST /api/v1/chat/sessions/:id/messages
 * Send message in session, execute grounded RAG search, persist assistant response
 */
const sendMessage = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;
    const userId = req.user.id || req.user._id;
    const { content, top_k } = req.body;

    if (!content || !content.trim()) {
      throw new AppError(400, 'Message content is required', true, errorCodes.INVALID_INPUT);
    }

    const session = await ChatSession.findOne({
      _id: req.params.id,
      companyId,
      userId,
    });

    if (!session) {
      throw new AppError(404, 'Chat session not found', true, errorCodes.NOT_FOUND);
    }

    // 1. Save user message
    const userMsg = await ChatMessage.create({
      sessionId: session._id,
      companyId,
      userId,
      role: 'user',
      content: content.trim(),
    });

    // 2. Query RAG engine
    let ragResult;
    try {
      ragResult = await ragService.executeRagQuery({
        query: content.trim(),
        top_k: top_k || 5,
        user: req.user,
        scope,
      });
    } catch (ragErr) {
      ragResult = {
        answer: 'I encountered an issue connecting to the knowledge base. Please try again.',
        sources: [],
        grounded: false,
      };
    }

    // Map source citations to ChatMessage schema format
    const formattedSources = [];
    if (Array.isArray(ragResult.sources)) {
      for (const s of ragResult.sources) {
        if (s.documentId) {
          formattedSources.push({
            documentId: s.documentId,
            snippet: s.snippet || '',
            relevanceScore: typeof s.similarity === 'number' ? s.similarity : undefined,
          });
        }
      }
    }

    // 3. Save assistant message
    const assistantMsg = await ChatMessage.create({
      sessionId: session._id,
      companyId,
      userId,
      role: 'assistant',
      content: ragResult.answer,
      sources: formattedSources,
    });

    // 4. Update session metadata & message count
    session.messageCount = (session.messageCount || 0) + 2;
    if (session.title === 'New Chat' || !session.title) {
      session.title = content.trim().slice(0, 40);
    }
    await session.save();

    return successResponse(
      res,
      {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        grounded: ragResult.grounded !== false,
        durationMs: ragResult.durationMs,
        sources: ragResult.sources,
      },
      'Message sent and answer generated successfully',
      200
    );
  } catch (error) {
    return next(error);
  }
};

/**
 * DELETE /api/v1/chat/sessions/:id
 * Delete session and clean up messages
 */
const deleteSession = async (req, res, next) => {
  try {
    const scope = req.tenantScope || {};
    const companyId = scope.companyId || req.user.companyId;
    const userId = req.user.id || req.user._id;

    const session = await ChatSession.findOneAndDelete({
      _id: req.params.id,
      companyId,
      userId,
    });

    if (!session) {
      throw new AppError(404, 'Chat session not found', true, errorCodes.NOT_FOUND);
    }

    await ChatMessage.deleteMany({ sessionId: session._id });

    return successResponse(res, { id: session._id }, 'Chat session deleted successfully', 200);
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  createSession,
  listSessions,
  getSession,
  sendMessage,
  deleteSession,
};

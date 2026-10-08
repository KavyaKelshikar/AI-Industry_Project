const ragService = require('../../src/services/ragService');
const aiServiceClient = require('../../src/services/aiServiceClient');
const AppError = require('../../src/utils/AppError');

describe('RAGService Unit Tests', () => {
  const adminUser = {
    id: '507f1f77bcf86cd799439011',
    companyId: '507f1f77bcf86cd799439012',
    role: 'Company Admin',
    permissions: ['chat:use'],
    email: 'admin@acme.com',
  };

  const employeeUser = {
    id: '507f1f77bcf86cd799439013',
    companyId: '507f1f77bcf86cd799439012',
    departmentId: '507f1f77bcf86cd799439014',
    role: 'Employee',
    permissions: ['chat:use'],
    email: 'emp@acme.com',
  };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('processQuery', () => {
    it('should derive admin scope with confidential access and execute query', async () => {
      const mockResult = {
        query: 'What is the turbine shutdown procedure?',
        answer: 'Press emergency stop button.',
        sources: [
          {
            documentId: 'doc-1',
            source: 'turbine_manual.pdf',
            snippet: 'Press emergency stop button on panel 1.',
            similarity: 0.92,
            page: 4,
            classification: 'confidential',
          },
        ],
        grounded: true,
        retrieved_count: 1,
        duration_ms: 150.2,
        llm_provider: 'google-gemini',
      };

      const querySpy = jest.spyOn(aiServiceClient, 'queryRAG').mockResolvedValueOnce(mockResult);

      const response = await ragService.processQuery({
        user: adminUser,
        query: 'What is the turbine shutdown procedure?',
        top_k: 5,
      });

      expect(querySpy).toHaveBeenCalledWith({
        query: 'What is the turbine shutdown procedure?',
        company_id: '507f1f77bcf86cd799439012',
        department_id: null,
        classification: ['public', 'internal', 'confidential'],
        category: undefined,
        top_k: 5,
        score_threshold: undefined,
      });

      expect(response.answer).toBe('Press emergency stop button.');
      expect(response.grounded).toBe(true);
      expect(response.companyId).toBe('507f1f77bcf86cd799439012');
      expect(response.sources).toHaveLength(1);
    });

    it('should derive employee scope restricted to department and public/internal classifications', async () => {
      const mockResult = {
        query: 'Safety rules',
        answer: 'Wear helmet.',
        sources: [],
        grounded: true,
        retrieved_count: 1,
        duration_ms: 80,
      };

      const querySpy = jest.spyOn(aiServiceClient, 'queryRAG').mockResolvedValueOnce(mockResult);

      const response = await ragService.processQuery({
        user: employeeUser,
        query: 'Safety rules',
        top_k: 3,
      });

      expect(querySpy).toHaveBeenCalledWith({
        query: 'Safety rules',
        company_id: '507f1f77bcf86cd799439012',
        department_id: '507f1f77bcf86cd799439014',
        classification: ['public', 'internal'],
        category: undefined,
        top_k: 3,
        score_threshold: undefined,
      });

      expect(response.grounded).toBe(true);
    });

    it('should throw 401 AppError if user has no companyId', async () => {
      await expect(
        ragService.processQuery({
          user: { id: 'no-company-user' },
          query: 'Test',
        })
      ).rejects.toThrow(AppError);
    });

    it('should bound top_k to a maximum of 20 and minimum of 1', async () => {
      const mockResult = {
        query: 'Query',
        answer: 'Answer',
        sources: [],
        grounded: false,
      };

      const querySpy = jest.spyOn(aiServiceClient, 'queryRAG').mockResolvedValue(mockResult);

      await ragService.processQuery({
        user: adminUser,
        query: 'Query',
        top_k: 50, // exceeds 20
      });

      expect(querySpy).toHaveBeenCalledWith(expect.objectContaining({ top_k: 20 }));
    });
  });

  describe('processChat', () => {
    it('should format chat history turns and pass to aiServiceClient.chatRAG', async () => {
      const mockChatResult = {
        query: 'And what about step 2?',
        answer: 'Step 2 requires checking the oil valve.',
        sources: [],
        grounded: true,
        retrieved_count: 1,
        duration_ms: 120,
      };

      const chatSpy = jest.spyOn(aiServiceClient, 'chatRAG').mockResolvedValueOnce(mockChatResult);

      const history = [
        { role: 'user', content: 'What is step 1?' },
        { role: 'assistant', content: 'Step 1 is inspection.' },
      ];

      const response = await ragService.processChat({
        user: adminUser,
        query: 'And what about step 2?',
        chat_history: history,
        top_k: 4,
      });

      expect(chatSpy).toHaveBeenCalledWith({
        query: 'And what about step 2?',
        company_id: '507f1f77bcf86cd799439012',
        chat_history: [
          { role: 'user', content: 'What is step 1?' },
          { role: 'assistant', content: 'Step 1 is inspection.' },
        ],
        department_id: null,
        classification: ['public', 'internal', 'confidential'],
        category: undefined,
        top_k: 4,
        score_threshold: undefined,
      });

      expect(response.answer).toBe('Step 2 requires checking the oil valve.');
      expect(response.grounded).toBe(true);
    });
  });
});

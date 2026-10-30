import { useState, useEffect, useCallback } from 'react';
import * as api from './services/api';
import './index.css';

export default function App() {
  // ── Navigation Section ──
  const [currentSection, setCurrentSection] = useState('overview'); // 'overview' | 'employees' | 'knowledge-sources'

  // ── Health State ──
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  // ── Auth & Session State ──
  const [userSession, setUserSession] = useState(null);
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState(null);

  // Form states
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    companySlug: '',
  });

  const [registerForm, setRegisterForm] = useState({
    companyName: 'Acme Industrial Corp',
    companySlug: 'acme-corp',
    companyCode: 'ACME',
    adminName: 'Alice Johnson',
    adminEmail: 'admin@acme.com',
    password: 'Password123!',
  });

  // Diagnostic Payload Inspector
  const [latestPayload, setLatestPayload] = useState(null);

  // ── Module 8: Employee State ──
  const [employees, setEmployees] = useState([]);
  const [employeePagination, setEmployeePagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [employeeStats, setEmployeeStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [employeeFilter, setEmployeeFilter] = useState({ search: '', status: '', page: 1 });
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [employeeForm, setEmployeeForm] = useState({
    name: '',
    email: '',
    password: '',
    employeeId: '',
    roleId: '',
    departmentId: '',
    status: 'active',
  });

  // ── Module 9: Knowledge Source State ──
  const [knowledgeSources, setKnowledgeSources] = useState([]);
  const [ksPagination, setKsPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [ksStats, setKsStats] = useState({ total: 0, active: 0, syncing: 0, failed: 0, totalDocuments: 0 });
  const [ksLoading, setKsLoading] = useState(false);
  const [ksFilter, setKsFilter] = useState({ search: '', type: '', status: '', page: 1 });
  const [ksModalOpen, setKsModalOpen] = useState(false);
  const [editingSource, setEditingSource] = useState(null);
  const [ksForm, setKsForm] = useState({ name: '', type: 'local_folder', folderPath: '', description: '' });
  const [ksSyncing, setKsSyncing] = useState({});

  // ── Module 10: Document Ingestion State ──
  const [documents, setDocuments] = useState([]);
  const [docPagination, setDocPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [docStats, setDocStats] = useState({ total: 0, pending: 0, processing: 0, indexed: 0, error: 0, totalChunks: 0, totalVectors: 0 });
  const [docLoading, setDocLoading] = useState(false);
  const [docFilter, setDocFilter] = useState({ search: '', indexingStatus: '', knowledgeSourceId: '', page: 1 });
  const [processingDocIds, setProcessingDocIds] = useState({});
  const [batchProcessing, setBatchProcessing] = useState(false);

  // ── Module 11: RAG & Conversational Assistant State ──
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatTopK, setChatTopK] = useState(5);
  const [lastFailedQuery, setLastFailedQuery] = useState(null);

  // ── File Upload State ──
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]);
  const [uploadClassification, setUploadClassification] = useState('internal');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);

  // ── Persistent Chat Sessions State ──
  const [chatSessions, setChatSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  // ── Organization (Departments, Roles, Audit Logs) State ──
  const [orgTab, setOrgTab] = useState('departments'); // 'departments' | 'roles' | 'audit'
  const [departmentsList, setDepartmentsList] = useState([]);
  const [rolesList, setRolesList] = useState([]);
  const [permissionsList, setPermissionsList] = useState([]);
  const [auditLogsList, setAuditLogsList] = useState([]);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [deptModalOpen, setDeptModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleForm, setRoleForm] = useState({ name: '', description: '', permissionIds: [] });

  // ── Drag-and-Drop Upload State ──
  const [isDragOver, setIsDragOver] = useState(false);


  // ── 1. Fetch Platform Health ──
  const fetchHealth = useCallback(async () => {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await api.getHealth();
      if (res.ok && res.data) {
        setHealthData(res.data);
      } else {
        setHealthError(res.error?.message || 'Unable to retrieve service health');
      }
      setLatestPayload({ endpoint: 'GET /api/v1/health', timestamp: new Date().toLocaleTimeString(), response: res });
    } catch (err) {
      setHealthError(err.message);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  // ── 2. Check Active Session (/me) via Silent Cookie Refresh ──
  const checkSession = useCallback(async () => {
    try {
      const res = await api.getMe();
      const user = res.data?.user || (res.data?.id ? res.data : null);
      if (res.ok && user) {
        setUserSession(user);
        setLatestPayload({ endpoint: 'GET /api/v1/auth/me', timestamp: new Date().toLocaleTimeString(), response: res });
      } else {
        setUserSession(null);
      }
    } catch {
      setUserSession(null);
    }
  }, []);

  // ── 3. Fetch Employees & Metrics ──
  const fetchEmployeesList = useCallback(async () => {
    if (!userSession) return;
    setEmployeeLoading(true);
    try {
      const [empRes, statsRes] = await Promise.all([
        api.getEmployees({
          page: employeeFilter.page,
          limit: 10,
          search: employeeFilter.search,
          status: employeeFilter.status || undefined,
        }),
        api.getEmployeeStats(),
      ]);

      if (empRes.ok && empRes.data) {
        setEmployees(empRes.data.items || []);
        if (empRes.data.pagination) {
          setEmployeePagination(empRes.data.pagination);
        }
      }
      if (statsRes.ok && statsRes.data) {
        setEmployeeStats(statsRes.data);
      }
      setLatestPayload({ endpoint: 'GET /api/v1/employees', timestamp: new Date().toLocaleTimeString(), response: empRes });
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setEmployeeLoading(false);
    }
  }, [userSession, employeeFilter]);

  useEffect(() => {
    fetchHealth();
    checkSession();
    const interval = setInterval(fetchHealth, 8000);
    return () => clearInterval(interval);
  }, [fetchHealth, checkSession]);

  // ── 4. Fetch Knowledge Sources & Metrics ──
  const fetchKnowledgeSources = useCallback(async () => {
    if (!userSession) return;
    setKsLoading(true);
    try {
      const [srcRes, statsRes] = await Promise.all([
        api.getKnowledgeSources({
          page: ksFilter.page,
          limit: 10,
          search: ksFilter.search,
          type: ksFilter.type || undefined,
          status: ksFilter.status || undefined,
        }),
        api.getKnowledgeSourceStats(),
      ]);
      if (srcRes.ok && srcRes.data) {
        setKnowledgeSources(srcRes.data.items || []);
        if (srcRes.data.pagination) setKsPagination(srcRes.data.pagination);
      }
      if (statsRes.ok && statsRes.data) setKsStats(statsRes.data);
      setLatestPayload({ endpoint: 'GET /api/v1/knowledge-sources', timestamp: new Date().toLocaleTimeString(), response: srcRes });
    } catch (err) {
      console.error('Failed to fetch knowledge sources:', err);
    } finally {
      setKsLoading(false);
    }
  }, [userSession, ksFilter]);

  // ── 5. Fetch Documents & Processing Telemetry (Module 10) ──
  const fetchDocumentsList = useCallback(async () => {
    if (!userSession) return;
    setDocLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        api.getDocuments({
          page: docFilter.page,
          limit: 10,
          search: docFilter.search,
          indexingStatus: docFilter.indexingStatus || undefined,
          knowledgeSourceId: docFilter.knowledgeSourceId || undefined,
        }),
        api.getDocumentStats(),
      ]);
      if (docsRes.ok && docsRes.data) {
        setDocuments(docsRes.data.items || []);
        if (docsRes.data.pagination) setDocPagination(docsRes.data.pagination);
      }
      if (statsRes.ok && statsRes.data) setDocStats(statsRes.data);
      setLatestPayload({ endpoint: 'GET /api/v1/documents', timestamp: new Date().toLocaleTimeString(), response: docsRes });
    } catch (err) {
      console.error('Failed to fetch documents:', err);
    } finally {
      setDocLoading(false);
    }
  }, [userSession, docFilter]);

  useEffect(() => {
    if (userSession && currentSection === 'employees') {
      fetchEmployeesList();
    }
  }, [userSession, currentSection, fetchEmployeesList]);

  useEffect(() => {
    if (userSession && currentSection === 'knowledge-sources') {
      fetchKnowledgeSources();
    }
  }, [userSession, currentSection, fetchKnowledgeSources]);

  useEffect(() => {
    if (userSession && currentSection === 'documents') {
      fetchDocumentsList();
    }
  }, [userSession, currentSection, fetchDocumentsList]);

  // Cleanly reset conversation state when user session changes or on logout
  const currentUserId = userSession?.id || userSession?._id;
  useEffect(() => {
    setChatMessages([]);
    setChatError(null);
    setLastFailedQuery(null);
  }, [currentUserId]);

  // ── Fetch Chat Sessions ──
  const fetchChatSessionsList = useCallback(async () => {
    if (!userSession) return;
    setSessionsLoading(true);
    try {
      const res = await api.getChatSessions();
      if (res.ok && res.data) {
        setChatSessions(res.data);
      }
    } catch (err) {
      console.error('Failed to load chat sessions:', err);
    } finally {
      setSessionsLoading(false);
    }
  }, [userSession]);

  // ── Fetch Departments, Roles, Permissions ──
  const fetchOrgData = useCallback(async () => {
    if (!userSession) return;
    try {
      const [deptRes, rolesRes, permRes] = await Promise.all([
        api.getDepartments(),
        api.getRoles(),
        api.getPermissions(),
      ]);
      if (deptRes.ok && deptRes.data) setDepartmentsList(deptRes.data);
      if (rolesRes.ok && rolesRes.data) setRolesList(rolesRes.data);
      if (permRes.ok && permRes.data) setPermissionsList(permRes.data);
    } catch (err) {
      console.error('Failed to load organization data:', err);
    }
  }, [userSession]);

  // ── Fetch Audit Logs ──
  const fetchAuditLogsList = useCallback(async (page = 1) => {
    if (!userSession) return;
    try {
      const res = await api.getAuditLogs({ page, limit: 10 });
      if (res.ok && res.data) {
        setAuditLogsList(res.data.items || []);
        if (res.data.pagination) setAuditPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    }
  }, [userSession]);

  useEffect(() => {
    if (userSession && currentSection === 'rag-assistant') {
      fetchChatSessionsList();
    }
  }, [userSession, currentSection, fetchChatSessionsList]);

  useEffect(() => {
    if (userSession && currentSection === 'organization') {
      fetchOrgData();
      if (orgTab === 'audit') fetchAuditLogsList();
    }
  }, [userSession, currentSection, orgTab, fetchOrgData, fetchAuditLogsList]);

  // ── File Upload Handler with Validation ──
  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedUploadFiles || selectedUploadFiles.length === 0) {
      alert('Please select at least one file to upload.');
      return;
    }

    if (selectedUploadFiles.length > 10) {
      alert('Batch upload limit exceeded: Maximum 10 files allowed at once.');
      return;
    }

    const MAX_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
    for (const f of selectedUploadFiles) {
      if (f.size > MAX_SIZE_BYTES) {
        alert(`File "${f.name}" exceeds the 50MB size limit (${(f.size / (1024 * 1024)).toFixed(1)}MB).`);
        return;
      }
    }

    setUploadLoading(true);
    setUploadFeedback(null);
    try {
      const formData = new FormData();
      Array.from(selectedUploadFiles).forEach((file) => {
        formData.append('files', file);
      });
      formData.append('classification', uploadClassification);
      formData.append('category', uploadCategory);

      const res = await api.uploadDocuments(formData);
      setLatestPayload({ endpoint: 'POST /api/v1/documents/upload', timestamp: new Date().toLocaleTimeString(), response: res });

      if (res.ok) {
        setUploadFeedback({ type: 'success', message: `Successfully uploaded ${selectedUploadFiles.length} file(s)! Queued for vector ingestion.` });
        setSelectedUploadFiles([]);
        fetchDocumentsList();
      } else {
        setUploadFeedback({ type: 'error', message: res.error?.message || 'File upload failed' });
      }
    } catch (err) {
      setUploadFeedback({ type: 'error', message: err.message });
    } finally {
      setUploadLoading(false);
    }
  };

  // ── Session Switch & History Loader ──
  const handleSelectSession = async (sessionId) => {
    setActiveSessionId(sessionId);
    setChatLoading(true);
    setChatError(null);
    try {
      const res = await api.getChatSession(sessionId);
      if (res.ok && res.data) {
        const loadedMessages = (res.data.messages || []).map((m) => ({
          id: m._id || m.id,
          role: m.role,
          content: m.content,
          sources: m.sources || [],
          grounded: true,
          timestamp: new Date(m.timestamp).toLocaleTimeString(),
        }));
        setChatMessages(loadedMessages);
      }
    } catch (err) {
      setChatError('Failed to load session messages');
    } finally {
      setChatLoading(false);
    }
  };

  const handleStartNewSession = async () => {
    try {
      const res = await api.createChatSession('New Chat');
      if (res.ok && res.data) {
        setActiveSessionId(res.data._id || res.data.id);
        setChatMessages([]);
        fetchChatSessionsList();
      }
    } catch (err) {
      console.error('Failed to create chat session:', err);
    }
  };

  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this conversation session?')) return;
    try {
      const res = await api.deleteChatSession(sessionId);
      if (res.ok) {
        if (activeSessionId === sessionId) {
          setActiveSessionId(null);
          setChatMessages([]);
        }
        fetchChatSessionsList();
      }
    } catch (err) {
      alert('Failed to delete session');
    }
  };



  // ── Auth Handlers ──
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthFeedback(null);
    try {
      const payload = {
        email: loginForm.email.trim(),
        password: loginForm.password,
      };
      if (loginForm.companySlug.trim()) {
        payload.companySlug = loginForm.companySlug.trim();
      }

      const res = await api.login(payload);
      setLatestPayload({ endpoint: 'POST /api/v1/auth/login', timestamp: new Date().toLocaleTimeString(), response: res });

      if (res.ok && res.data?.user) {
        setUserSession(res.data.user);
        setAuthFeedback({ type: 'success', message: `Welcome back, ${res.data.user.name}!` });
      } else {
        setAuthFeedback({ type: 'error', message: res.error?.message || res.message || 'Login failed' });
      }
    } catch (err) {
      setAuthFeedback({ type: 'error', message: err.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthFeedback(null);
    try {
      const payload = {
        companyName: registerForm.companyName.trim(),
        companySlug: registerForm.companySlug.trim(),
        companyCode: registerForm.companyCode.trim().toUpperCase(),
        name: registerForm.adminName.trim(),
        email: registerForm.adminEmail.trim(),
        password: registerForm.password,
      };
      const res = await api.register(payload);
      setLatestPayload({ endpoint: 'POST /api/v1/auth/register', timestamp: new Date().toLocaleTimeString(), response: res });

      if (res.ok && res.data?.user) {
        setUserSession(res.data.user);
        setAuthFeedback({ type: 'success', message: `Registered successfully! Company: ${res.data.company?.name}` });
      } else {
        setAuthFeedback({ type: 'error', message: res.error?.message || res.message || 'Registration failed' });
      }
    } catch (err) {
      setAuthFeedback({ type: 'error', message: err.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRefreshToken = async () => {
    setAuthLoading(true);
    setAuthFeedback(null);
    try {
      const res = await api.refreshToken();
      setLatestPayload({ endpoint: 'POST /api/v1/auth/refresh-token', timestamp: new Date().toLocaleTimeString(), response: res });

      if (res.ok) {
        setAuthFeedback({ type: 'success', message: 'Token rotated successfully via HttpOnly cookie!' });
        await checkSession();
      } else {
        setAuthFeedback({ type: 'error', message: res.error?.message || 'Token refresh rejected' });
        setUserSession(null);
      }
    } catch (err) {
      setAuthFeedback({ type: 'error', message: err.message });
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    try {
      const res = await api.logout();
      setLatestPayload({ endpoint: 'POST /api/v1/auth/logout', timestamp: new Date().toLocaleTimeString(), response: res });
      setUserSession(null);
      setEmployees([]);
      setChatMessages([]);
      setChatError(null);
      setAuthFeedback({ type: 'info', message: 'Session logged out and HttpOnly cookies cleared.' });
    } finally {
      setAuthLoading(false);
    }
  };

  // ── Employee Actions Handlers ──
  const openCreateEmployeeModal = () => {
    setEditingEmployee(null);
    setEmployeeForm({
      name: '',
      email: '',
      password: 'Password123!',
      employeeId: `EMP-${Math.floor(100 + Math.random() * 900)}`,
      roleId: userSession?.roleId || '',
      departmentId: '',
      status: 'active',
    });
    setEmployeeModalOpen(true);
  };

  const openEditEmployeeModal = (emp) => {
    setEditingEmployee(emp);
    setEmployeeForm({
      name: emp.name || '',
      email: emp.email || '',
      employeeId: emp.employeeId || '',
      roleId: emp.role?.id || userSession?.roleId || '',
      departmentId: emp.department?.id || '',
      status: emp.status || 'active',
    });
    setEmployeeModalOpen(true);
  };

  const handleSaveEmployee = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingEmployee) {
        const payload = {
          name: employeeForm.name.trim(),
          email: employeeForm.email.trim(),
          employeeId: employeeForm.employeeId.trim(),
          status: employeeForm.status,
        };
        if (employeeForm.departmentId) payload.departmentId = employeeForm.departmentId;
        if (employeeForm.roleId) payload.roleId = employeeForm.roleId;

        res = await api.updateEmployee(editingEmployee.id, payload);
        setLatestPayload({ endpoint: `PATCH /api/v1/employees/${editingEmployee.id}`, timestamp: new Date().toLocaleTimeString(), response: res });
      } else {
        const payload = {
          name: employeeForm.name.trim(),
          email: employeeForm.email.trim(),
          password: employeeForm.password || 'Password123!',
          employeeId: employeeForm.employeeId.trim(),
          roleId: employeeForm.roleId || userSession?.roleId,
          status: employeeForm.status,
        };
        if (employeeForm.departmentId) payload.departmentId = employeeForm.departmentId;

        res = await api.createEmployee(payload);
        setLatestPayload({ endpoint: 'POST /api/v1/employees', timestamp: new Date().toLocaleTimeString(), response: res });
      }

      if (res.ok) {
        setEmployeeModalOpen(false);
        fetchEmployeesList();
      } else {
        alert(res.error?.message || 'Employee operation failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleToggleEmployeeStatus = async (emp) => {
    try {
      let res;
      if (emp.status === 'active') {
        res = await api.deactivateEmployee(emp.id);
        setLatestPayload({ endpoint: `PATCH /api/v1/employees/${emp.id}/deactivate`, timestamp: new Date().toLocaleTimeString(), response: res });
      } else {
        res = await api.activateEmployee(emp.id);
        setLatestPayload({ endpoint: `PATCH /api/v1/employees/${emp.id}/activate`, timestamp: new Date().toLocaleTimeString(), response: res });
      }
      if (res.ok) {
        fetchEmployeesList();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`Are you sure you want to permanently delete ${emp.name}?`)) return;
    try {
      const res = await api.deleteEmployee(emp.id);
      setLatestPayload({ endpoint: `DELETE /api/v1/employees/${emp.id}`, timestamp: new Date().toLocaleTimeString(), response: res });
      if (res.ok) {
        fetchEmployeesList();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Knowledge Source Handlers ──
  const openCreateKsModal = () => {
    setEditingSource(null);
    setKsForm({ name: '', type: 'local_folder', folderPath: '', description: '' });
    setKsModalOpen(true);
  };

  const openEditKsModal = (src) => {
    setEditingSource(src);
    setKsForm({ name: src.name || '', type: src.type || 'local_folder', folderPath: '', description: src.description || '' });
    setKsModalOpen(true);
  };

  const handleSaveKs = async (e) => {
    e.preventDefault();
    try {
      let res;
      if (editingSource) {
        const payload = { name: ksForm.name.trim(), description: ksForm.description.trim() };
        if (ksForm.folderPath.trim()) payload.folderPath = ksForm.folderPath.trim();
        res = await api.updateKnowledgeSource(editingSource.id, payload);
      } else {
        const payload = { name: ksForm.name.trim(), type: ksForm.type, description: ksForm.description.trim() };
        if (ksForm.type === 'local_folder') payload.folderPath = ksForm.folderPath.trim();
        res = await api.createKnowledgeSource(payload);
      }
      setLatestPayload({ endpoint: editingSource ? `PATCH /api/v1/knowledge-sources/${editingSource.id}` : 'POST /api/v1/knowledge-sources', timestamp: new Date().toLocaleTimeString(), response: res });
      if (res.ok) { setKsModalOpen(false); fetchKnowledgeSources(); }
      else alert(res.error?.message || 'Operation failed');
    } catch (err) { alert(err.message); }
  };

  const handleSyncKs = async (src) => {
    setKsSyncing((prev) => ({ ...prev, [src.id]: true }));
    try {
      const res = await api.syncKnowledgeSource(src.id);
      setLatestPayload({ endpoint: `POST /api/v1/knowledge-sources/${src.id}/sync`, timestamp: new Date().toLocaleTimeString(), response: res });
      fetchKnowledgeSources();
    } catch (err) { alert(err.message); }
    finally { setKsSyncing((prev) => ({ ...prev, [src.id]: false })); }
  };

  const handleToggleKsStatus = async (src) => {
    try {
      const res = src.status === 'active' || src.status === 'error'
        ? await api.deactivateKnowledgeSource(src.id)
        : await api.activateKnowledgeSource(src.id);
      setLatestPayload({ endpoint: `PATCH /api/v1/knowledge-sources/${src.id}/${src.status === 'active' || src.status === 'error' ? 'deactivate' : 'activate'}`, timestamp: new Date().toLocaleTimeString(), response: res });
      if (res.ok) fetchKnowledgeSources();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteKs = async (src) => {
    if (!window.confirm(`Are you sure you want to delete knowledge source "${src.name}"?`)) return;
    try {
      const res = await api.deleteKnowledgeSource(src.id);
      setLatestPayload({ endpoint: `DELETE /api/v1/knowledge-sources/${src.id}`, timestamp: new Date().toLocaleTimeString(), response: res });
      if (res.ok) fetchKnowledgeSources();
    } catch (err) { alert(err.message); }
  };

  const getKsStatusClass = (status) => {
    if (status === 'active') return 'ks-status-active';
    if (status === 'syncing') return 'ks-status-syncing';
    if (status === 'error') return 'ks-status-error';
    return 'ks-status-inactive';
  };

  const getKsTypeLabel = (type) => {
    const labels = { uploaded_file: '📄 Uploaded File', local_folder: '📁 Local Folder', google_drive: '☁️ Google Drive', onedrive: '☁️ OneDrive', sharepoint: '☁️ SharePoint', dropbox: '☁️ Dropbox', s3: '☁️ AWS S3', azure_blob: '☁️ Azure Blob', smb: '🌐 SMB/Network', custom: '🔌 Custom' };
    return labels[type] || type;
  };

  // ── Module 10: Document Processing Handlers ──
  const handleProcessDoc = async (doc) => {
    setProcessingDocIds((prev) => ({ ...prev, [doc.id]: true }));
    try {
      const res = await api.processDocument(doc.id);
      setLatestPayload({ endpoint: `POST /api/v1/documents/${doc.id}/process`, timestamp: new Date().toLocaleTimeString(), response: res });
      if (res.ok) {
        fetchDocumentsList();
      } else {
        alert(res.error?.message || 'Document processing failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessingDocIds((prev) => ({ ...prev, [doc.id]: false }));
    }
  };

  const handleBatchProcessDocs = async (ksId) => {
    setBatchProcessing(true);
    try {
      const res = await api.batchProcessDocuments(ksId);
      setLatestPayload({ endpoint: 'POST /api/v1/documents/batch-process', timestamp: new Date().toLocaleTimeString(), response: res });
      if (res.ok) {
        fetchDocumentsList();
        fetchKnowledgeSources();
      } else {
        alert(res.error?.message || 'Batch processing failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleDeleteDoc = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.originalFilename}" and its ChromaDB vectors?`)) return;
    try {
      const res = await api.deleteDocument(doc.id);
      setLatestPayload({ endpoint: `DELETE /api/v1/documents/${doc.id}`, timestamp: new Date().toLocaleTimeString(), response: res });
      if (res.ok) {
        fetchDocumentsList();
        fetchKnowledgeSources();
      } else {
        alert(res.error?.message || 'Failed to delete document');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // ── Module 11: RAG Chat Handlers & Citation Helpers ──
  const getSafeCitationFilename = (source) => {
    if (!source || typeof source !== 'string') return 'Document';
    const basename = source.split(/[/\\]/).pop();
    return basename || 'Document';
  };

  const getClassificationBadgeClass = (classification) => {
    const clean = String(classification || 'internal').toLowerCase();
    if (clean === 'confidential') return 'rag-classification-confidential';
    if (clean === 'public') return 'rag-classification-public';
    return 'rag-classification-internal';
  };

  const handleSendChatMessage = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const messageText = (textOverride || chatInput).trim();
    if (!messageText || chatLoading) return;

    if (!userSession) {
      alert('Please sign in first to use the AI Knowledge Assistant.');
      return;
    }

    const userMessageId = `user-${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString(),
    };

    // Optimistically append user message
    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    try {
      // Send the last 10 turns as history (excluding the current latest user message and filtering out previous error bubbles)
      const historyPayload = updatedMessages
        .slice(0, -1)
        .filter((m) => !m.isError)
        .slice(-10)
        .map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content.slice(0, 2000),
        }));

      const res = await api.chatRAG({
        query: messageText,
        chat_history: historyPayload,
        top_k: Number(chatTopK) || 5,
      });

      setLatestPayload({
        endpoint: 'POST /api/v1/rag/chat',
        timestamp: new Date().toLocaleTimeString(),
        response: res,
      });

      if (res.ok && res.data) {
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: res.data.answer || 'No answer generated.',
          sources: res.data.sources || [],
          grounded: Boolean(res.data.grounded),
          retrievedCount: res.data.retrievedCount || 0,
          durationMs: res.data.durationMs || 0,
          llmProvider: res.data.llmProvider || 'ai-service',
          timestamp: new Date().toLocaleTimeString(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
        setLastFailedQuery(null);
      } else {
        const errMsg = res.error?.message || res.message || 'RAG Assistant request failed';
        setChatError(errMsg);
        setLastFailedQuery(messageText);
        const errorAssistantMsg = {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Could not complete request: ${errMsg}`,
          failedQuery: messageText,
          sources: [],
          grounded: false,
          isError: true,
          timestamp: new Date().toLocaleTimeString(),
        };
        setChatMessages((prev) => [...prev, errorAssistantMsg]);
      }
    } catch (err) {
      const errMsg = err.message || 'An unexpected error occurred during request';
      setChatError(errMsg);
      setLastFailedQuery(messageText);
      const errorAssistantMsg = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ Could not complete request: ${errMsg}`,
        failedQuery: messageText,
        sources: [],
        grounded: false,
        isError: true,
        timestamp: new Date().toLocaleTimeString(),
      };
      setChatMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
    setChatError(null);
    setLastFailedQuery(null);
  };

  // ── Drag-and-Drop Handlers ──
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 10) {
      alert('Maximum 10 files allowed per batch upload.');
      return;
    }
    const MAX_SIZE_BYTES = 50 * 1024 * 1024;
    for (const f of droppedFiles) {
      if (f.size > MAX_SIZE_BYTES) {
        alert(`File "${f.name}" exceeds the 50MB size limit (${(f.size / (1024 * 1024)).toFixed(1)}MB).`);
        return;
      }
    }
    setSelectedUploadFiles(droppedFiles);
  };

  // ── Department CRUD Handlers ──
  const openCreateDeptModal = () => {
    setEditingDept(null);
    setDeptForm({ name: '', description: '' });
    setDeptModalOpen(true);
  };

  const openEditDeptModal = (dept) => {
    setEditingDept(dept);
    setDeptForm({ name: dept.name || '', description: dept.description || '' });
    setDeptModalOpen(true);
  };

  const handleSaveDept = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        const res = await api.updateDepartment(editingDept.id || editingDept._id, deptForm);
        if (!res.ok) {
          alert(res.error?.message || 'Failed to update department');
          return;
        }
      } else {
        const res = await api.createDepartment(deptForm);
        if (!res.ok) {
          alert(res.error?.message || 'Failed to create department');
          return;
        }
      }
      setDeptModalOpen(false);
      setEditingDept(null);
      setDeptForm({ name: '', description: '' });
      fetchOrgData();
    } catch (err) {
      alert('Error saving department: ' + err.message);
    }
  };

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? This action cannot be undone.`)) return;
    try {
      const res = await api.deleteDepartment(dept.id || dept._id);
      if (res.ok) {
        fetchOrgData();
      } else {
        alert(res.error?.message || 'Failed to delete department');
      }
    } catch (err) {
      alert('Error deleting department: ' + err.message);
    }
  };

  // ── Role & Permission Handlers ──
  const toggleRolePermission = (permId) => {
    setRoleForm((prev) => ({
      ...prev,
      permissionIds: prev.permissionIds.includes(permId)
        ? prev.permissionIds.filter((id) => id !== permId)
        : [...prev.permissionIds, permId],
    }));
  };

  const handleSaveRole = async (e) => {
    e.preventDefault();
    try {
      const res = await api.createRole({
        name: roleForm.name,
        description: roleForm.description,
        permissionIds: roleForm.permissionIds,
      });
      if (res.ok) {
        setRoleModalOpen(false);
        setRoleForm({ name: '', description: '', permissionIds: [] });
        fetchOrgData();
      } else {
        alert(res.error?.message || 'Failed to create role');
      }
    } catch (err) {
      alert('Error creating role: ' + err.message);
    }
  };


  const getDocIndexingStatusClass = (status) => {
    if (status === 'indexed') return 'doc-status-indexed';
    if (status === 'processing') return 'doc-status-processing';
    if (status === 'error') return 'doc-status-error';
    return 'doc-status-pending';
  };

  const getServiceBadgeClass = (status) => {
    if (status === 'up' || status === 'connected') return 'badge-online';
    if (status === 'degraded') return 'badge-degraded';
    return 'badge-offline';
  };

  return (
    <div className="dashboard-container">
      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="brand-group">
          <div className="brand-logo">⚡</div>
          <div>
            <h1 className="brand-title">Stitch AI Platform</h1>
            <p className="brand-subtitle">Integrated Multi-Tenant Knowledge Intelligence Engine</p>
          </div>
        </div>
        <div className="header-status">
          <span className={`status-pill ${healthData?.status === 'healthy' ? 'pill-healthy' : 'pill-degraded'}`}>
            <span className="pulse-dot"></span>
            {healthData ? (healthData.status === 'healthy' ? 'System All Healthy' : 'System Degraded') : 'Connecting...'}
          </span>
          <button className="btn-secondary btn-sm" onClick={fetchHealth} disabled={healthLoading}>
            {healthLoading ? 'Checking...' : 'Refresh Status'}
          </button>
        </div>
      </header>

      {/* ── Navigation Tabs Bar ── */}
      <nav className="nav-tabs-bar">
        <button
          className={`nav-tab-btn ${currentSection === 'overview' ? 'active' : ''}`}
          onClick={() => setCurrentSection('overview')}
        >
          📊 System Matrix & Auth Studio
        </button>
        <button
          className={`nav-tab-btn ${currentSection === 'employees' ? 'active' : ''}`}
          onClick={() => {
            if (!userSession) {
              alert('Please sign in or register an admin account first to manage company employees.');
            }
            setCurrentSection('employees');
          }}
        >
          👥 Employee Management (Module 8)
        </button>
        <button
          className={`nav-tab-btn ${currentSection === 'knowledge-sources' ? 'active' : ''}`}
          onClick={() => {
            if (!userSession) {
              alert('Please sign in first to manage knowledge sources.');
            }
            setCurrentSection('knowledge-sources');
          }}
        >
          📚 Knowledge Sources (Module 9)
        </button>
        <button
          className={`nav-tab-btn ${currentSection === 'documents' ? 'active' : ''}`}
          onClick={() => {
            if (!userSession) {
              alert('Please sign in first to view documents.');
            }
            setCurrentSection('documents');
          }}
        >
          📄 Document Ingestion (Module 10)
        </button>
        <button
          className={`nav-tab-btn ${currentSection === 'rag-assistant' ? 'active' : ''}`}
          onClick={() => setCurrentSection('rag-assistant')}
        >
          🤖 AI Knowledge Assistant (Module 11)
        </button>
        <button
          className={`nav-tab-btn ${currentSection === 'organization' ? 'active' : ''}`}
          onClick={() => {
            if (!userSession) {
              alert('Please sign in first to manage company organization & audit logs.');
            }
            setCurrentSection('organization');
          }}
        >
          🏢 Organization & Security (Module 6 & 13)
        </button>
      </nav>

      {/* ── Live Service Health Grid (Always Visible) ── */}
      <section className="health-grid-section">
        <h2 className="section-title">Core Infrastructure & Service Matrix</h2>
        <div className="health-grid">
          {/* Backend */}
          <div className="service-card">
            <div className="service-header">
              <div className="service-name">
                <span className="service-icon">🌐</span> Node.js Backend API
              </div>
              <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.backend)}`}>
                {healthData?.services?.backend?.toUpperCase() || 'OFFLINE'}
              </span>
            </div>
            <div className="service-meta">
              <span>Port: <strong>5000</strong></span>
              <span>Uptime: <strong>{healthData?.uptime ? `${healthData.uptime}s` : 'N/A'}</strong></span>
            </div>
          </div>

          {/* AI Service */}
          <div className="service-card">
            <div className="service-header">
              <div className="service-name">
                <span className="service-icon">🧠</span> Python AI Service
              </div>
              <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.aiService)}`}>
                {healthData?.services?.aiService?.toUpperCase() || 'DOWN'}
              </span>
            </div>
            <div className="service-meta">
              <span>Port: <strong>8002</strong></span>
              <span>Engine: <strong>FastAPI / PyTorch</strong></span>
            </div>
          </div>

          {/* MongoDB */}
          <div className="service-card">
            <div className="service-header">
              <div className="service-name">
                <span className="service-icon">🍃</span> MongoDB Database
              </div>
              <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.mongodb)}`}>
                {healthData?.services?.mongodb?.toUpperCase() || 'DISCONNECTED'}
              </span>
            </div>
            <div className="service-meta">
              <span>Port: <strong>27017</strong></span>
              <span>Tenant Isolation: <strong>Strict Mongoose</strong></span>
            </div>
          </div>

          {/* ChromaDB */}
          <div className="service-card">
            <div className="service-header">
              <div className="service-name">
                <span className="service-icon">🔍</span> ChromaDB Vector Store
              </div>
              <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.chromadb)}`}>
                {healthData?.services?.chromadb?.toUpperCase() || 'DISCONNECTED'}
              </span>
            </div>
            <div className="service-meta">
              <span>Port: <strong>8000</strong></span>
              <span>Collection: <strong>Multi-Tenant Vector Chunks</strong></span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 1: Overview & Auth Studio ── */}
      {currentSection === 'overview' && (
        <div className="dashboard-split">
          {/* Left Column: Auth Studio */}
          <section className="panel auth-panel">
            <div className="panel-header">
              <h2 className="panel-title">Authentication & Tenant Identity Studio</h2>
              <span className="panel-badge">Modules 5 & 6</span>
            </div>

            {authFeedback && (
              <div className={`feedback-alert feedback-${authFeedback.type}`}>
                {authFeedback.message}
              </div>
            )}

            {userSession ? (
              <div className="session-card">
                <div className="session-banner">
                  <div className="user-avatar">
                    {userSession.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h3 className="session-user-name">{userSession.name}</h3>
                    <p className="session-user-email">{userSession.email}</p>
                  </div>
                  <span className="role-tag">{userSession.role?.name || userSession.role || 'Super Admin'}</span>
                </div>

                <div className="session-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Tenant Company</span>
                    <span className="detail-value">{userSession.company?.name || 'Global Platform (Super Admin)'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Company Code</span>
                    <span className="detail-value">{userSession.company?.companyCode || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Account Status</span>
                    <span className="detail-value status-active">{userSession.status?.toUpperCase()}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Token Mode</span>
                    <span className="detail-value">Memory Access + HttpOnly Refresh</span>
                  </div>
                </div>

                <div className="permissions-section">
                  <span className="detail-label">Resolved Active Permissions ({userSession.permissions?.length || 0}):</span>
                  <div className="permission-chips">
                    {userSession.permissions && userSession.permissions.length > 0 ? (
                      userSession.permissions.map((perm, idx) => (
                        <span key={idx} className="perm-chip">
                          {typeof perm === 'object' ? perm.code || perm.name : perm}
                        </span>
                      ))
                    ) : (
                      <span className="perm-chip perm-wildcard">* (Full Global Access)</span>
                    )}
                  </div>
                </div>

                <div className="session-actions">
                  <button className="btn-secondary" onClick={handleRefreshToken} disabled={authLoading}>
                    🔄 Rotate Refresh Token
                  </button>
                  <button className="btn-secondary" onClick={() => setCurrentSection('employees')}>
                    👥 Manage Employees
                  </button>
                  <button className="btn-danger" onClick={handleLogout} disabled={authLoading}>
                    🚪 Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="auth-forms">
                <div className="tab-bar">
                  <button
                    className={`tab-btn ${activeTab === 'login' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('login')}
                  >
                    Sign In
                  </button>
                  <button
                    className={`tab-btn ${activeTab === 'register' ? 'tab-active' : ''}`}
                    onClick={() => setActiveTab('register')}
                  >
                    Register New Tenant Admin
                  </button>
                </div>

                {activeTab === 'login' ? (
                  <form onSubmit={handleLogin} className="form-stack">
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g., admin@acme.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Password</label>
                      <input
                        type="password"
                        required
                        placeholder="Enter password"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Company Slug (Optional for tenant scoping)</label>
                      <input
                        type="text"
                        placeholder="e.g., acme-corp"
                        value={loginForm.companySlug}
                        onChange={(e) => setLoginForm({ ...loginForm, companySlug: e.target.value })}
                      />
                    </div>
                    <button type="submit" className="btn-primary" disabled={authLoading}>
                      {authLoading ? 'Authenticating...' : 'Sign In via JWT'}
                    </button>
                  </form>
                ) : (
                  <form onSubmit={handleRegister} className="form-stack">
                    <div className="form-row">
                      <div className="form-group">
                        <label>Company Name</label>
                        <input
                          type="text"
                          required
                          value={registerForm.companyName}
                          onChange={(e) => setRegisterForm({ ...registerForm, companyName: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Company Slug</label>
                        <input
                          type="text"
                          required
                          value={registerForm.companySlug}
                          onChange={(e) => setRegisterForm({ ...registerForm, companySlug: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Company Code</label>
                        <input
                          type="text"
                          required
                          maxLength={6}
                          value={registerForm.companyCode}
                          onChange={(e) => setRegisterForm({ ...registerForm, companyCode: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Admin Full Name</label>
                        <input
                          type="text"
                          required
                          value={registerForm.adminName}
                          onChange={(e) => setRegisterForm({ ...registerForm, adminName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Admin Email</label>
                        <input
                          type="email"
                          required
                          value={registerForm.adminEmail}
                          onChange={(e) => setRegisterForm({ ...registerForm, adminEmail: e.target.value })}
                        />
                      </div>
                      <div className="form-group">
                        <label>Password</label>
                        <input
                          type="password"
                          required
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        />
                      </div>
                    </div>
                    <button type="submit" className="btn-primary" disabled={authLoading}>
                      {authLoading ? 'Provisioning...' : 'Provision Tenant & Admin'}
                    </button>
                  </form>
                )}
              </div>
            )}
          </section>

          {/* Right Column: Diagnostic Inspector */}
          <section className="panel payload-panel">
            <div className="panel-header">
              <h2 className="panel-title">Live API Diagnostic & Response Inspector</h2>
              <span className="panel-badge live-pulse">REAL HTTP RESPONSES</span>
            </div>
            <div className="inspector-content">
              {latestPayload ? (
                <div>
                  <div className="inspector-meta">
                    <span className="http-method-badge">{latestPayload.endpoint}</span>
                    <span className="inspector-time">{latestPayload.timestamp}</span>
                  </div>
                  <pre className="json-viewer">
                    {JSON.stringify(latestPayload.response, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="empty-inspector">
                  <p>Perform an action or query the health check to inspect real API response payloads.</p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* ── SECTION 2: Employee Management (Module 8) ── */}
      {currentSection === 'employees' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Company Employee Directory & RBAC Provisioning</h2>
              <p className="brand-subtitle">
                Scoped to: <strong>{userSession?.company?.name || 'Your Company Tenant'}</strong>
              </p>
            </div>
            <button className="btn-primary" onClick={openCreateEmployeeModal}>
              + Add New Employee
            </button>
          </div>

          {/* Stats Bar */}
          <div className="employee-stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Employees</span>
              <span className="stat-number">{employeeStats.total}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Active Accounts</span>
              <span className="stat-number active">{employeeStats.active}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Inactive / Suspended</span>
              <span className="stat-number inactive">{employeeStats.inactive}</span>
            </div>
          </div>

          {/* Controls: Search & Filter */}
          <div className="employee-control-bar">
            <div className="search-filter-group">
              <input
                type="text"
                className="search-input"
                placeholder="Search by name, email, or employee ID..."
                value={employeeFilter.search}
                onChange={(e) => setEmployeeFilter({ ...employeeFilter, search: e.target.value, page: 1 })}
              />
              <select
                className="filter-select"
                value={employeeFilter.status}
                onChange={(e) => setEmployeeFilter({ ...employeeFilter, status: e.target.value, page: 1 })}
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
            <button className="btn-secondary btn-sm" onClick={fetchEmployeesList} disabled={employeeLoading}>
              {employeeLoading ? 'Loading...' : '🔄 Refresh List'}
            </button>
          </div>

          {/* Employees Table */}
          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Employee</th>
                  <th>ID</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.length > 0 ? (
                  employees.map((emp) => (
                    <tr key={emp.id}>
                      <td>
                        <div className="user-cell">
                          <div className="emp-avatar">{emp.name?.charAt(0).toUpperCase() || 'E'}</div>
                          <div>
                            <div className="emp-name">{emp.name}</div>
                            <div className="emp-email">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{emp.employeeId || '—'}</code>
                      </td>
                      <td>{emp.department?.name || 'Unassigned'}</td>
                      <td>
                        <span className="role-tag">{emp.role?.name || 'Employee'}</span>
                      </td>
                      <td>
                        <span className={emp.status === 'active' ? 'status-badge-active' : 'status-badge-inactive'}>
                          ● {emp.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-group">
                          <button
                            className="btn-action-icon"
                            title="Edit employee"
                            onClick={() => openEditEmployeeModal(emp)}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn-action-icon"
                            title={emp.status === 'active' ? 'Deactivate account' : 'Activate account'}
                            onClick={() => handleToggleEmployeeStatus(emp)}
                          >
                            {emp.status === 'active' ? '⏸️ Deactivate' : '▶️ Activate'}
                          </button>
                          <button
                            className="btn-action-icon btn-action-delete"
                            title="Delete employee"
                            onClick={() => handleDeleteEmployee(emp)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {employeeLoading ? 'Loading employees...' : 'No employees found matching the filter criteria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="table-pagination">
              <span>
                Showing Page {employeePagination.page} of {employeePagination.pages || 1} ({employeePagination.total} total)
              </span>
              <div className="pagination-controls">
                <button
                  className="btn-secondary btn-sm"
                  disabled={employeePagination.page <= 1 || employeeLoading}
                  onClick={() => setEmployeeFilter({ ...employeeFilter, page: employeePagination.page - 1 })}
                >
                  ◀ Previous
                </button>
                <button
                  className="btn-secondary btn-sm"
                  disabled={employeePagination.page >= employeePagination.pages || employeeLoading}
                  onClick={() => setEmployeeFilter({ ...employeeFilter, page: employeePagination.page + 1 })}
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── Employee Create / Edit Modal ── */}
      {employeeModalOpen && (
        <div className="modal-overlay" onClick={() => setEmployeeModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingEmployee ? `Edit Employee: ${editingEmployee.name}` : 'Provision New Company Employee'}
              </h3>
              <button className="modal-close-btn" onClick={() => setEmployeeModalOpen(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSaveEmployee}>
              <div className="modal-body">
                <div className="form-stack">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Marcus Vance"
                      value={employeeForm.name}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="e.g., marcus@company.com"
                      value={employeeForm.email}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })}
                    />
                  </div>
                  {!editingEmployee && (
                    <div className="form-group">
                      <label>Initial Password</label>
                      <input
                        type="password"
                        placeholder="Default: Password123!"
                        value={employeeForm.password}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="form-row">
                    <div className="form-group">
                      <label>Employee ID</label>
                      <input
                        type="text"
                        placeholder="e.g., EMP-104"
                        value={employeeForm.employeeId}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Status</label>
                      <select
                        value={employeeForm.status}
                        onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEmployeeModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingEmployee ? 'Save Changes' : 'Create Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Knowledge Sources (Module 9) ── */}
      {currentSection === 'knowledge-sources' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Enterprise Knowledge Source Manager</h2>
              <p className="brand-subtitle">
                Scoped to: <strong>{userSession?.company?.name || 'Your Company Tenant'}</strong>
              </p>
            </div>
            <button className="btn-primary" onClick={openCreateKsModal} id="add-knowledge-source-btn">
              + Add Knowledge Source
            </button>
          </div>

          {/* Stats Bar */}
          <div className="employee-stats-grid ks-stats-grid">
            <div className="stat-card">
              <span className="stat-label">Total Sources</span>
              <span className="stat-number">{ksStats.total}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Active</span>
              <span className="stat-number active">{ksStats.active}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Syncing</span>
              <span className="stat-number" style={{ color: 'var(--accent-blue, #60a5fa)' }}>{ksStats.syncing}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Failed</span>
              <span className="stat-number inactive">{ksStats.failed}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Total Documents</span>
              <span className="stat-number">{ksStats.totalDocuments}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="employee-control-bar">
            <div className="search-filter-group">
              <input
                type="text"
                className="search-input"
                placeholder="Search by source name..."
                value={ksFilter.search}
                onChange={(e) => setKsFilter({ ...ksFilter, search: e.target.value, page: 1 })}
              />
              <select
                className="filter-select"
                value={ksFilter.type}
                onChange={(e) => setKsFilter({ ...ksFilter, type: e.target.value, page: 1 })}
              >
                <option value="">All Types</option>
                <option value="uploaded_file">Uploaded File</option>
                <option value="local_folder">Local Folder</option>
              </select>
              <select
                className="filter-select"
                value={ksFilter.status}
                onChange={(e) => setKsFilter({ ...ksFilter, status: e.target.value, page: 1 })}
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="syncing">Syncing</option>
                <option value="error">Error</option>
              </select>
            </div>
            <button className="btn-secondary btn-sm" onClick={fetchKnowledgeSources} disabled={ksLoading}>
              {ksLoading ? 'Loading...' : '🔄 Refresh'}
            </button>
          </div>

          {/* Sources Table */}
          <div className="employee-table-wrapper">
            <table className="employee-table" id="knowledge-sources-table">
              <thead>
                <tr>
                  <th>Source Name</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Documents</th>
                  <th>Last Sync</th>
                  <th>Created By</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {knowledgeSources.length > 0 ? (
                  knowledgeSources.map((src) => (
                    <tr key={src.id}>
                      <td>
                        <div className="user-cell">
                          <div className="emp-avatar ks-avatar">{src.type === 'local_folder' ? '📁' : '📄'}</div>
                          <div>
                            <div className="emp-name">{src.name}</div>
                            <div className="emp-email">{src.description || '—'}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="ks-type-badge">{getKsTypeLabel(src.type)}</span></td>
                      <td>
                        <span className={`status-badge-ks ${getKsStatusClass(src.status)}`}>
                          ● {src.status?.toUpperCase()}
                        </span>
                        {src.lastSyncStatus === 'failed' && src.lastSyncError && (
                          <div className="ks-sync-error" title={src.lastSyncError}>
                            ⚠ {src.lastSyncError.length > 40 ? src.lastSyncError.substring(0, 40) + '...' : src.lastSyncError}
                          </div>
                        )}
                      </td>
                      <td><strong>{src.documentCount || 0}</strong></td>
                      <td>{src.lastSyncAt ? new Date(src.lastSyncAt).toLocaleString() : 'Never'}</td>
                      <td>{src.createdBy?.name || '—'}</td>
                      <td>
                        <div className="action-buttons-group">
                          <button className="btn-action-icon" title="Edit" onClick={() => openEditKsModal(src)}>✏️</button>
                          <button
                            className="btn-action-icon"
                            title="Sync source files"
                            onClick={() => handleSyncKs(src)}
                            disabled={ksSyncing[src.id] || src.status === 'inactive' || src.type === 'uploaded_file'}
                          >
                            {ksSyncing[src.id] ? '⏳' : '🔄'}
                          </button>
                          <button
                            className="btn-action-icon"
                            title="Batch Ingest Pending Documents"
                            onClick={() => handleBatchProcessDocs(src.id)}
                            disabled={batchProcessing || src.status === 'inactive'}
                          >
                            ⚡
                          </button>
                          <button
                            className="btn-action-icon"
                            title={src.status === 'active' || src.status === 'error' ? 'Deactivate' : 'Activate'}
                            onClick={() => handleToggleKsStatus(src)}
                          >
                            {src.status === 'active' || src.status === 'error' ? '⏸️' : '▶️'}
                          </button>
                          <button className="btn-action-icon btn-action-delete" title="Delete" onClick={() => handleDeleteKs(src)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {ksLoading ? 'Loading knowledge sources...' : 'No knowledge sources found. Click "Add Knowledge Source" to get started.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="table-pagination">
              <span>Page {ksPagination.page} of {ksPagination.pages || 1} ({ksPagination.total} total)</span>
              <div className="pagination-controls">
                <button className="btn-secondary btn-sm" disabled={ksPagination.page <= 1 || ksLoading} onClick={() => setKsFilter({ ...ksFilter, page: ksPagination.page - 1 })}>◀ Previous</button>
                <button className="btn-secondary btn-sm" disabled={ksPagination.page >= ksPagination.pages || ksLoading} onClick={() => setKsFilter({ ...ksFilter, page: ksPagination.page + 1 })}>Next ▶</button>
              </div>
            </div>
          </div>

          {/* Future Connectors Notice */}
          <div className="ks-future-connectors">
            <h3 className="section-title" style={{ fontSize: '1rem', marginTop: '1.5rem' }}>Future Connectors</h3>
            <div className="ks-connector-grid">
              {['Google Drive', 'OneDrive', 'SharePoint', 'Dropbox', 'AWS S3', 'Azure Blob', 'SMB/Network', 'Custom'].map((name) => (
                <div key={name} className="ks-connector-card">
                  <span className="ks-connector-name">{name}</span>
                  <span className="ks-connector-status">Coming Soon</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 4: Document Ingestion & Vector Pipeline (Module 10) ── */}
      {currentSection === 'documents' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Document Ingestion & AI Vector Pipeline</h2>
              <p className="panel-desc" style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>
                Multi-tenant text extraction, deterministic chunking, SentenceTransformers embedding, and ChromaDB vector indexing.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className="btn-secondary"
                onClick={fetchDocumentsList}
                disabled={docLoading}
              >
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* Statistics Grid */}
          <div className="employee-stats-grid ks-stats-grid" style={{ marginTop: '16px' }}>
            <div className="stat-card">
              <span className="stat-label">Total Documents</span>
              <span className="stat-number">{docStats.total}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Indexed in ChromaDB</span>
              <span className="stat-number active">{docStats.indexed}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Vectors Stored</span>
              <span className="stat-number" style={{ color: '#38bdf8' }}>{docStats.totalVectors || 0}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Text Chunks</span>
              <span className="stat-number" style={{ color: '#818cf8' }}>{docStats.totalChunks || 0}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Pending Ingestion</span>
              <span className="stat-number" style={{ color: '#fbbf24' }}>{docStats.pending}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">Processing Failures</span>
              <span className="stat-number inactive">{docStats.error}</span>
            </div>
          </div>

          {/* Direct File Upload Zone with Size Limits, OCR Engine & Drag-and-Drop */}
          <div
            className={`upload-dropzone-container ${isDragOver ? 'drag-over' : ''}`}
            style={{ marginTop: '20px' }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="upload-icon-large">{isDragOver ? '📥' : '📤'}</div>
            <h3 style={{ margin: '0 0 6px 0', color: '#f8fafc', fontSize: '16px' }}>
              {isDragOver ? 'Drop Files Here to Upload' : 'Direct Document & Scanned Image Upload'}
            </h3>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '13px' }}>
              {isDragOver
                ? 'Release to add files for ingestion...'
                : 'Drag & drop files here, or click "Choose Files" below. Text extraction, chunk embedding, and ChromaDB indexing are automatic.'}
            </p>

            <div className="upload-limits-badge-group">
              <span className="limit-pill">🛡️ Limit: Max 10 Files / Batch</span>
              <span className="limit-pill">📦 Limit: Max 50MB / File</span>
              <span className="ocr-feature-pill">✨ Tesseract OCR Enabled (Scanned Images & PDFs)</span>
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                id="doc-file-upload-input"
                type="file"
                multiple
                accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp,.tiff,.bmp"
                style={{ display: 'none' }}
                onChange={(e) => {
                  if (e.target.files) {
                    if (e.target.files.length > 10) {
                      alert('You can upload a maximum of 10 files at once.');
                      return;
                    }
                    setSelectedUploadFiles(Array.from(e.target.files));
                  }
                }}
              />
              <button
                type="button"
                className="btn-primary btn-sm"
                onClick={() => document.getElementById('doc-file-upload-input').click()}
                disabled={uploadLoading}
              >
                📁 Choose Files (PDF, DOCX, TXT, Images)
              </button>

              <select
                className="table-filter-select"
                style={{ width: 'auto', padding: '6px 10px' }}
                value={uploadClassification}
                onChange={(e) => setUploadClassification(e.target.value)}
              >
                <option value="internal">Classification: Internal</option>
                <option value="public">Classification: Public</option>
                <option value="confidential">Classification: Confidential</option>
              </select>

              <select
                className="table-filter-select"
                style={{ width: 'auto', padding: '6px 10px' }}
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
              >
                <option value="General">Category: General</option>
                <option value="SOP">Category: SOP</option>
                <option value="Policy">Category: Policy</option>
                <option value="Manual">Category: Manual</option>
              </select>

              {selectedUploadFiles.length > 0 && (
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                  onClick={handleFileUpload}
                  disabled={uploadLoading}
                >
                  {uploadLoading ? '⏳ Uploading...' : `🚀 Upload ${selectedUploadFiles.length} Selected File(s)`}
                </button>
              )}
            </div>

            {selectedUploadFiles.length > 0 && (
              <div className="selected-files-preview">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>Selected Files ({selectedUploadFiles.length}/10):</span>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}
                    onClick={() => setSelectedUploadFiles([])}
                  >
                    Clear All
                  </button>
                </div>
                {selectedUploadFiles.map((file, idx) => (
                  <div key={idx} className="file-preview-item">
                    <span>📄 {file.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}

            {uploadFeedback && (
              <div
                className={`feedback-alert ${uploadFeedback.type === 'success' ? 'feedback-success' : 'feedback-error'}`}
                style={{ marginTop: '12px' }}
              >
                {uploadFeedback.type === 'success' ? '✅' : '⚠️'} {uploadFeedback.message}
              </div>
            )}
          </div>

          {/* Control Bar: Search & Filter */}
          <div className="employee-control-bar">
            <div className="search-filter-group">
              <input
                type="text"
                placeholder="🔍 Search documents by filename..."
                className="search-input"
                value={docFilter.search}
                onChange={(e) => setDocFilter({ ...docFilter, search: e.target.value, page: 1 })}
              />
              <select
                className="filter-select"
                value={docFilter.indexingStatus}
                onChange={(e) => setDocFilter({ ...docFilter, indexingStatus: e.target.value, page: 1 })}
              >
                <option value="">All Indexing Statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="indexed">Indexed</option>
                <option value="error">Error</option>
              </select>
              <select
                className="filter-select"
                value={docFilter.knowledgeSourceId}
                onChange={(e) => setDocFilter({ ...docFilter, knowledgeSourceId: e.target.value, page: 1 })}
              >
                <option value="">All Knowledge Sources</option>
                {knowledgeSources.map((ks) => (
                  <option key={ks.id} value={ks.id}>{ks.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Documents Table */}
          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Document</th>
                  <th>Knowledge Source</th>
                  <th>Format</th>
                  <th>Indexing Status</th>
                  <th>Vector Telemetry</th>
                  <th>Last Processed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.length > 0 ? (
                  documents.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <div className="user-cell">
                          <div className="emp-avatar" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
                            {doc.fileType ? doc.fileType.slice(0, 3).toUpperCase() : 'DOC'}
                          </div>
                          <div>
                            <div className="emp-name">{doc.originalFilename}</div>
                            <div className="emp-email">
                              {(doc.fileSize / 1024).toFixed(1)} KB • {doc.classification || 'internal'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="ks-type-badge">
                          {doc.knowledgeSourceId?.name || 'Application Upload'}
                        </span>
                      </td>
                      <td>
                        <span style={{ textTransform: 'uppercase', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)' }}>
                          .{doc.fileType}
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge-doc ${getDocIndexingStatusClass(doc.indexingStatus)}`}>
                          {doc.indexingStatus === 'processing' && <span className="pulse-dot"></span>}
                          {doc.indexingStatus?.toUpperCase()}
                        </span>
                        {doc.processingError && (
                          <div className="ks-sync-error" title={doc.processingError}>
                            ⚠️ {doc.processingError}
                          </div>
                        )}
                      </td>
                      <td>
                        <div style={{ fontSize: '12px', color: 'var(--text-main)' }}>
                          <strong>{doc.chunksCount || 0}</strong> chunks • <strong>{doc.vectorsCount || 0}</strong> vectors
                        </div>
                        {doc.embeddingModel && (
                          <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                            {doc.embeddingModel}
                          </div>
                        )}
                      </td>
                      <td>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                          {doc.lastProcessedAt ? new Date(doc.lastProcessedAt).toLocaleString() : 'Not yet processed'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-group">
                          <button
                            className="btn-action-icon"
                            title={doc.indexingStatus === 'error' ? 'Retry Ingestion' : 'Process / Ingest'}
                            onClick={() => handleProcessDoc(doc)}
                            disabled={processingDocIds[doc.id] || doc.indexingStatus === 'processing'}
                          >
                            {processingDocIds[doc.id] ? '⏳' : (doc.indexingStatus === 'error' ? '🔄' : '⚡')}
                          </button>
                          <button
                            className="btn-action-icon btn-action-delete"
                            title="Delete document and ChromaDB vectors"
                            onClick={() => handleDeleteDoc(doc)}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                      {docLoading ? 'Loading documents...' : 'No documents found. Sync an approved knowledge source to discover documents.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Pagination */}
            <div className="table-pagination">
              <span>Page {docPagination.page} of {docPagination.pages || 1} ({docPagination.total} total)</span>
              <div className="pagination-controls">
                <button
                  className="btn-secondary btn-sm"
                  disabled={docPagination.page <= 1 || docLoading}
                  onClick={() => setDocFilter({ ...docFilter, page: docPagination.page - 1 })}
                >
                  ◀ Previous
                </button>
                <button
                  className="btn-secondary btn-sm"
                  disabled={docPagination.page >= docPagination.pages || docLoading}
                  onClick={() => setDocFilter({ ...docFilter, page: docPagination.page + 1 })}
                >
                  Next ▶
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 5: Organization & Security (Module 6 & 13) ── */}
      {currentSection === 'organization' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Organization & Security Management</h2>
              <p className="brand-subtitle">
                Scoped to: <strong>{userSession?.company?.name || 'Your Company Tenant'}</strong>
              </p>
            </div>
          </div>

          {/* Org Sub-Tabs */}
          <div className="org-subtabs">
            <button
              className={`org-subtab-btn ${orgTab === 'departments' ? 'active' : ''}`}
              onClick={() => setOrgTab('departments')}
            >
              🏢 Departments
            </button>
            <button
              className={`org-subtab-btn ${orgTab === 'roles' ? 'active' : ''}`}
              onClick={() => setOrgTab('roles')}
            >
              🔑 Roles & Permissions
            </button>
            <button
              className={`org-subtab-btn ${orgTab === 'audit' ? 'active' : ''}`}
              onClick={() => { setOrgTab('audit'); fetchAuditLogsList(); }}
            >
              📋 Audit Logs
            </button>
          </div>

          {/* Departments Tab */}
          {orgTab === 'departments' && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  Manage company departments. Each department can be assigned to employees and used for document scoping.
                </p>
                <button className="btn-primary btn-sm" onClick={openCreateDeptModal}>+ Add Department</button>
              </div>
              <div className="employee-table-wrapper">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Department Name</th>
                      <th>Description</th>
                      <th>Created At</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {departmentsList.length > 0 ? (
                      departmentsList.map((dept) => (
                        <tr key={dept.id || dept._id}>
                          <td>
                            <div className="user-cell">
                              <div className="emp-avatar" style={{ background: 'linear-gradient(135deg, #14b8a6, #0d9488)' }}>🏢</div>
                              <div className="emp-name">{dept.name}</div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{dept.description || '—'}</td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button className="btn-action-icon" title="Edit" onClick={() => openEditDeptModal(dept)}>✏️</button>
                              <button className="btn-action-icon btn-action-delete" title="Delete" onClick={() => handleDeleteDept(dept)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No departments created yet. Add your first department to start organizing.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Roles & Permissions Tab */}
          {orgTab === 'roles' && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  Roles define what actions employees can perform. Each role bundles a set of granular permissions.
                </p>
                <button className="btn-primary btn-sm" onClick={() => { setRoleForm({ name: '', description: '', permissionIds: [] }); setRoleModalOpen(true); }}>+ Create Role</button>
              </div>
              <div className="employee-table-wrapper">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Role Name</th>
                      <th>Description</th>
                      <th>Permissions</th>
                      <th>System Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesList.length > 0 ? (
                      rolesList.map((role) => (
                        <tr key={role.id || role._id}>
                          <td>
                            <div className="user-cell">
                              <div className="emp-avatar" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>🔑</div>
                              <div className="emp-name">{role.name}</div>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{role.description || '—'}</td>
                          <td>
                            <div className="permission-chips" style={{ maxWidth: '400px', flexWrap: 'wrap' }}>
                              {role.permissions && role.permissions.length > 0 ? (
                                role.permissions.slice(0, 6).map((perm, idx) => (
                                  <span key={idx} className="perm-chip" style={{ fontSize: '10px' }}>
                                    {typeof perm === 'object' ? (perm.code || perm.name) : perm}
                                  </span>
                                ))
                              ) : (
                                <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No permissions</span>
                              )}
                              {role.permissions && role.permissions.length > 6 && (
                                <span className="perm-chip" style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)' }}>+{role.permissions.length - 6} more</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${role.isSystem ? 'status-active' : 'status-inactive'}`}>
                              {role.isSystem ? 'System' : 'Custom'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No roles found. Create a custom role to assign specific permissions.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Logs Tab */}
          {orgTab === 'audit' && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>
                  Security audit trail. All administrative actions are logged with user context and timestamps.
                </p>
                <button className="btn-secondary btn-sm" onClick={() => fetchAuditLogsList(auditPagination.page)} >🔄 Refresh Logs</button>
              </div>
              <div className="employee-table-wrapper">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>User</th>
                      <th>IP Address</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogsList.length > 0 ? (
                      auditLogsList.map((log) => (
                        <tr key={log.id || log._id}>
                          <td>
                            <span className="ks-type-badge" style={{ textTransform: 'uppercase', fontSize: '10px' }}>
                              {log.action || log.eventType || 'UNKNOWN'}
                            </span>
                          </td>
                          <td style={{ color: 'var(--text-main)', fontSize: '13px' }}>
                            {log.resource || log.targetType || '—'}
                            {log.resourceId || log.targetId ? <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}> ({(log.resourceId || log.targetId || '').toString().slice(-8)})</span> : null}
                          </td>
                          <td style={{ fontSize: '13px' }}>
                            {log.user?.name || log.userName || log.userId || '—'}
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '12px', fontFamily: 'monospace' }}>
                            {log.ipAddress || log.ip || '—'}
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : (log.timestamp ? new Date(log.timestamp).toLocaleString() : '—')}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" style={{ textAlign: 'center', padding: '36px', color: 'var(--text-muted)' }}>
                          No audit logs recorded yet. Logs are automatically generated for administrative actions.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Pagination */}
                <div className="table-pagination">
                  <span>Page {auditPagination.page} of {auditPagination.pages || 1} ({auditPagination.total} total)</span>
                  <div className="pagination-controls">
                    <button
                      className="btn-secondary btn-sm"
                      disabled={auditPagination.page <= 1}
                      onClick={() => fetchAuditLogsList(auditPagination.page - 1)}
                    >
                      ◀ Previous
                    </button>
                    <button
                      className="btn-secondary btn-sm"
                      disabled={auditPagination.page >= auditPagination.pages}
                      onClick={() => fetchAuditLogsList(auditPagination.page + 1)}
                    >
                      Next ▶
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 6: AI Knowledge Assistant (Module 11) ── */}
      {currentSection === 'rag-assistant' && (
        <section className="rag-assistant-section">
          {/* Header Bar */}
          <div className="rag-header-bar">
            <div className="rag-title-group">
              <div className="rag-icon">🤖</div>
              <div>
                <h2 className="panel-title" style={{ margin: 0 }}>Enterprise AI Knowledge Assistant</h2>
                <p className="brand-subtitle">Grounded semantic retrieval & Q&A powered by ChromaDB vectors</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <span>Top Chunks:</span>
                <select
                  className="table-filter-select"
                  style={{ width: '70px', padding: '4px 8px' }}
                  value={chatTopK}
                  onChange={(e) => setChatTopK(Number(e.target.value))}
                >
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>

              <button
                className="btn-secondary btn-sm"
                onClick={handleClearChat}
                disabled={chatMessages.length === 0 || chatLoading}
                title="Start a new conversation"
              >
                🔄 Clear / New Chat
              </button>
            </div>
          </div>

          {userSession && chatError && (
            <div className="feedback-alert feedback-error" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠️ {chatError}</span>
              {lastFailedQuery && (
                <button
                  type="button"
                  className="btn-secondary btn-sm"
                  onClick={() => handleSendChatMessage(null, lastFailedQuery)}
                  disabled={chatLoading}
                >
                  🔁 Retry Query
                </button>
              )}
            </div>
          )}

          {!userSession ? (
            <div className="rag-unauth-card">
              <div className="rag-empty-icon">🔒</div>
              <h3 style={{ color: '#f8fafc', marginBottom: '8px' }}>Authentication Required</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '500px', marginBottom: '16px', lineHeight: 1.5 }}>
                Please sign in with a registered company account or initialize an admin profile on the System Matrix tab to interact with the AI Knowledge Assistant.
              </p>
              <button
                type="button"
                className="btn-primary"
                onClick={() => setCurrentSection('overview')}
              >
                Go to Sign In / Auth Studio ➔
              </button>
            </div>
          ) : (
            <div className="rag-chat-container">
              {/* Chat Sessions Sidebar */}
              <div className="rag-sessions-sidebar">
                <div className="rag-sessions-header">
                  <span className="rag-sessions-title">💬 Sessions</span>
                  <button
                    type="button"
                    className="btn-primary btn-sm"
                    style={{ fontSize: '11px', padding: '4px 10px' }}
                    onClick={handleStartNewSession}
                    disabled={sessionsLoading}
                  >
                    + New
                  </button>
                </div>
                <div className="rag-sessions-list">
                  {chatSessions.length > 0 ? (
                    chatSessions.map((session) => (
                      <div
                        key={session.id || session._id}
                        className={`rag-session-item ${activeSessionId === (session.id || session._id) ? 'active' : ''}`}
                        onClick={() => handleSelectSession(session.id || session._id)}
                      >
                        <div className="rag-session-info">
                          <span className="rag-session-name">{session.title || 'Untitled'}</span>
                          <span className="rag-session-date">
                            {session.updatedAt ? new Date(session.updatedAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="rag-session-delete"
                          onClick={(e) => handleDeleteSession(e, session.id || session._id)}
                          title="Delete session"
                        >
                          ✕
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rag-sessions-empty">
                      <span>No saved sessions</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Message Stream */}
              <div className="rag-messages-stream">
                {chatMessages.length === 0 ? (
                  <div className="rag-empty-state">
                    <div className="rag-empty-icon">🧠</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
                      How can I help you today?
                    </h3>
                    <p style={{ maxWidth: '500px', fontSize: '13px', lineHeight: 1.5 }}>
                      Ask questions about your company's indexed documents, standard operating procedures, policies, or technical guides.
                    </p>
                    <div className="rag-starter-chips">
                      <button
                        type="button"
                        className="rag-chip"
                        onClick={() => handleSendChatMessage(null, 'What are our plant safety and emergency guidelines?')}
                      >
                        💡 Plant safety guidelines
                      </button>
                      <button
                        type="button"
                        className="rag-chip"
                        onClick={() => handleSendChatMessage(null, 'What is the equipment maintenance inspection frequency?')}
                      >
                        💡 Maintenance inspection frequency
                      </button>
                      <button
                        type="button"
                        className="rag-chip"
                        onClick={() => handleSendChatMessage(null, 'What is the company remote work policy?')}
                      >
                        💡 Remote work policy
                      </button>
                      <button
                        type="button"
                        className="rag-chip"
                        onClick={() => handleSendChatMessage(null, 'What are the API rate limits and protocols?')}
                      >
                        💡 API rate limits & protocols
                      </button>
                      <button
                        type="button"
                        className="rag-chip"
                        onClick={() => handleSendChatMessage(null, 'What are the data classification security rules?')}
                      >
                        💡 Data classification rules
                      </button>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div key={msg.id} className={`rag-message-row ${msg.role}`}>
                      <div className={`rag-avatar ${msg.role}`}>
                        {msg.role === 'user' ? '👤' : (msg.isError ? '⚠️' : '⚡')}
                      </div>
                      <div className={`rag-message-bubble ${msg.role} ${msg.isError ? 'error' : ''}`}>
                        {msg.role === 'assistant' && !msg.isError && (
                          <div className={`rag-grounding-pill ${msg.grounded ? 'grounded-true' : 'grounded-false'}`}>
                            {msg.grounded ? '✓ Verified Company Documentation' : '⚠️ Insufficient Documentation'}
                          </div>
                        )}
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                        {/* Error state with retry action */}
                        {msg.isError && msg.failedQuery && (
                          <button
                            type="button"
                            className="rag-retry-btn"
                            onClick={() => handleSendChatMessage(null, msg.failedQuery)}
                            disabled={chatLoading}
                          >
                            🔁 Retry Query
                          </button>
                        )}

                        {/* Citations block */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="rag-citations-container">
                            <div className="rag-citations-header">
                              📚 Sources & Provenance ({msg.sources.length}):
                            </div>
                            <div className="rag-citations-grid">
                              {msg.sources.map((src, sIdx) => (
                                <div key={sIdx} className="rag-citation-card">
                                  <div className="rag-citation-top">
                                    <span className="rag-citation-name">
                                      📄 {getSafeCitationFilename(src.source)}
                                    </span>
                                    <div className="rag-citation-meta">
                                      {src.page ? (
                                        <span className="rag-citation-page">Page {src.page}</span>
                                      ) : null}
                                      {src.classification ? (
                                        <span className={`rag-classification-badge ${getClassificationBadgeClass(src.classification)}`}>
                                          {src.classification.toUpperCase()}
                                        </span>
                                      ) : null}
                                      {typeof src.similarity === 'number' && (
                                        <span className="rag-citation-score">
                                          {Math.round(src.similarity * 100)}% Match
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  {src.snippet && (
                                    <div className="rag-citation-snippet">
                                      "{src.snippet}"
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="rag-message-time" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span>{msg.timestamp}</span>
                          {msg.durationMs ? <span>⏱️ {msg.durationMs}ms</span> : null}
                        </div>
                      </div>
                    </div>
                  ))
                )}


                {chatLoading && (
                  <div className="rag-message-row assistant">
                    <div className="rag-avatar assistant">⚡</div>
                    <div className="rag-message-bubble assistant">
                      <div className="rag-typing-indicator">
                        <span className="rag-dot-pulse"></span>
                        <span>Searching tenant vector collection & generating grounded response...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Bar */}
              <form className="rag-input-bar" onSubmit={handleSendChatMessage}>
                <input
                  type="text"
                  className="rag-input-field"
                  placeholder="Ask a question about company policies, SOPs, or technical manuals..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!chatInput.trim() || chatLoading}
                  style={{ minWidth: '90px' }}
                >
                  {chatLoading ? 'Thinking...' : 'Ask AI 🚀'}
                </button>
              </form>
            </div>
          )}
        </section>
      )}

      {/* ── Knowledge Source Create/Edit Modal ── */}
      {ksModalOpen && (
        <div className="modal-overlay" onClick={() => setKsModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSource ? `Edit Source: ${editingSource.name}` : 'Add Knowledge Source'}
              </h3>
              <button className="modal-close-btn" onClick={() => setKsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveKs}>
              <div className="modal-body">
                <div className="form-stack">
                  <div className="form-group">
                    <label>Source Name</label>
                    <input type="text" required placeholder="e.g., HR Policy Documents" value={ksForm.name} onChange={(e) => setKsForm({ ...ksForm, name: e.target.value })} />
                  </div>
                  {!editingSource && (
                    <div className="form-group">
                      <label>Source Type</label>
                      <select value={ksForm.type} onChange={(e) => setKsForm({ ...ksForm, type: e.target.value })}>
                        <option value="local_folder">📁 Local Folder</option>
                        <option value="uploaded_file">📄 Uploaded File</option>
                      </select>
                    </div>
                  )}
                  {(ksForm.type === 'local_folder' || editingSource?.type === 'local_folder') && (
                    <div className="form-group">
                      <label>Folder Path</label>
                      <input type="text" placeholder="e.g., D:\\Company\\Documents" value={ksForm.folderPath} onChange={(e) => setKsForm({ ...ksForm, folderPath: e.target.value })} required={!editingSource} />
                      <div className="ks-path-warning">
                        ⚠️ This folder path will be explicitly approved for backend access. The system will only scan files within this directory. It will NOT have access to your entire filesystem.
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label>Description (optional)</label>
                    <input type="text" placeholder="Brief description of this source" value={ksForm.description} onChange={(e) => setKsForm({ ...ksForm, description: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setKsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingSource ? 'Save Changes' : 'Add Source'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Department Create/Edit Modal ── */}
      {deptModalOpen && (
        <div className="modal-overlay" onClick={() => setDeptModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingDept ? `Edit Department: ${editingDept.name}` : 'Create New Department'}
              </h3>
              <button className="modal-close-btn" onClick={() => setDeptModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveDept}>
              <div className="modal-body">
                <div className="form-stack">
                  <div className="form-group">
                    <label>Department Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Engineering, Human Resources"
                      value={deptForm.name}
                      onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description (optional)</label>
                    <input
                      type="text"
                      placeholder="Brief description of this department"
                      value={deptForm.description}
                      onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setDeptModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingDept ? 'Save Changes' : 'Create Department'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Role Create Modal ── */}
      {roleModalOpen && (
        <div className="modal-overlay" onClick={() => setRoleModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Custom Role</h3>
              <button className="modal-close-btn" onClick={() => setRoleModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRole}>
              <div className="modal-body">
                <div className="form-stack">
                  <div className="form-group">
                    <label>Role Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Content Manager, Viewer"
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <input
                      type="text"
                      placeholder="What this role is for"
                      value={roleForm.description}
                      onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Assign Permissions ({roleForm.permissionIds.length} selected)</label>
                    <div className="permission-selector-grid">
                      {permissionsList.length > 0 ? (
                        permissionsList.map((perm) => (
                          <label key={perm.id || perm._id} className="permission-checkbox-label">
                            <input
                              type="checkbox"
                              checked={roleForm.permissionIds.includes(perm.id || perm._id)}
                              onChange={() => toggleRolePermission(perm.id || perm._id)}
                            />
                            <span>{perm.code || perm.name}</span>
                          </label>
                        ))
                      ) : (
                        <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>No permissions available. Seed the database first.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setRoleModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Role</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className="dashboard-footer">
        <span>Stitch AI System — Modules 4.6–11 Live Integrated</span>
        <span>Environment: <strong>development</strong></span>
      </footer>
    </div>
  );
}

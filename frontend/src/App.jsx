import { useState, useEffect, useCallback } from 'react';
import * as api from './services/api';
import './index.css';

export default function App() {
  // ── Navigation Section ──
  // 'overview' | 'employee-portal' | 'library' | 'upload' | 'chat' | 'employees' | 'sources' | 'search' | 'settings'
  const [currentSection, setCurrentSection] = useState('overview');

  // ── Sidebar & Role View State ──
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [roleOverride, setRoleOverride] = useState(null); // 'admin' | 'employee' | null

  // ── Health State ──
  const [healthData, setHealthData] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  // ── Auth & Session State ──
  const [userSession, setUserSession] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
  const [authLoading, setAuthLoading] = useState(false);
  const [authFeedback, setAuthFeedback] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Computed Role: Admin (Super Admin, Company Admin) vs Employee
  // Supports roleOverride so admins can test the exact Employee view
  const userRoleStr = (userSession?.role?.name || userSession?.role || '').toLowerCase();
  const baseIsAdmin = userSession
    ? Boolean(userRoleStr.includes('admin') || userSession.isSuperAdmin)
    : true;
  const isAdmin = roleOverride !== null ? (roleOverride === 'admin') : baseIsAdmin;
  const isEmployee = !isAdmin;

  // Enforce role-based view restrictions:
  // Admin NEVER sees or accesses Employee Portal (redirects to 'overview')
  // Employee NEVER sees or accesses Admin sections (redirects to 'employee-portal')
  useEffect(() => {
    if (isAdmin && currentSection === 'employee-portal') {
      setCurrentSection('overview');
    } else if (isEmployee && ['overview', 'employees', 'sources', 'settings'].includes(currentSection)) {
      setCurrentSection('employee-portal');
    }
  }, [isAdmin, isEmployee, currentSection]);

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

  // Diagnostic Payload Helper
  const setLatestPayload = () => {};

  // ── Topbar Search ──
  const [topbarSearchQuery, setTopbarSearchQuery] = useState('');

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

  // ── Module 10 & Stitch 8: Knowledge Library State ──
  const [documents, setDocuments] = useState([]);
  const [docPagination, setDocPagination] = useState({ page: 1, limit: 12, total: 0, pages: 1 });
  const [docStats, setDocStats] = useState({ total: 0, pending: 0, processing: 0, indexed: 0, error: 0, totalChunks: 0, totalVectors: 0 });
  const [docLoading, setDocLoading] = useState(false);
  const [docFilter, setDocFilter] = useState({ search: '', indexingStatus: '', category: '', page: 1 });
  const [processingDocIds, setProcessingDocIds] = useState({});
  const [batchProcessing, setBatchProcessing] = useState(false);

  // ── Module 11 & Stitch 3: RAG & AI Chat State ──
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState(null);
  const [chatTopK, setChatTopK] = useState(5);
  const [lastFailedQuery, setLastFailedQuery] = useState(null);

  // ── Stitch 5: Knowledge Upload State ──
  const [selectedUploadFiles, setSelectedUploadFiles] = useState([]);
  const [uploadClassification, setUploadClassification] = useState('internal');
  const [uploadCategory, setUploadCategory] = useState('General');
  const [uploadVersion, setUploadVersion] = useState('v1.0');
  const [uploadDepartment, setUploadDepartment] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  // ── Stitch 6: Semantic Search State ──
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [searchInsight, setSearchInsight] = useState(null);
  const [searchDeptFilter, setSearchDeptFilter] = useState('');
  const [searchFileTypeFilter, setSearchFileTypeFilter] = useState('');
  const [searchResultCount, setSearchResultCount] = useState(0);

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
        if (empRes.data.pagination) setEmployeePagination(empRes.data.pagination);
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

  // ── 4. Fetch Knowledge Sources ──
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

  // ── 5. Fetch Documents & Processing Telemetry ──
  const fetchDocumentsList = useCallback(async () => {
    if (!userSession) return;
    setDocLoading(true);
    try {
      const [docsRes, statsRes] = await Promise.all([
        api.getDocuments({
          page: docFilter.page,
          limit: 12,
          search: docFilter.search,
          indexingStatus: docFilter.indexingStatus || undefined,
          category: docFilter.category || undefined,
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

  // ── 6. Fetch Chat Sessions ──
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

  // ── 7. Fetch Departments, Roles, Permissions ──
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

  // ── 8. Fetch Audit Logs ──
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

  // Initial load
  useEffect(() => {
    fetchHealth();
    checkSession();
  }, [fetchHealth, checkSession]);

  // Close auth modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setAuthModalOpen(false);
      }
    };
    if (authModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authModalOpen]);


  useEffect(() => {
    if (userSession && currentSection === 'employees') {
      fetchEmployeesList();
    }
  }, [userSession, currentSection, fetchEmployeesList]);

  useEffect(() => {
    if (userSession && (currentSection === 'sources' || currentSection === 'knowledge-sources')) {
      fetchKnowledgeSources();
    }
  }, [userSession, currentSection, fetchKnowledgeSources]);

  useEffect(() => {
    if (userSession && (currentSection === 'library' || currentSection === 'documents' || currentSection === 'employee-portal')) {
      fetchDocumentsList();
    }
  }, [userSession, currentSection, fetchDocumentsList]);

  useEffect(() => {
    if (userSession && (currentSection === 'chat' || currentSection === 'rag-assistant')) {
      fetchChatSessionsList();
    }
  }, [userSession, currentSection, fetchChatSessionsList]);

  useEffect(() => {
    if (userSession && (currentSection === 'settings' || currentSection === 'organization')) {
      fetchOrgData();
      if (orgTab === 'audit') fetchAuditLogsList();
    }
  }, [userSession, currentSection, orgTab, fetchOrgData, fetchAuditLogsList]);

  // Reset conversation state when user session changes
  const currentUserId = userSession?.id || userSession?._id;
  useEffect(() => {
    setChatMessages([]);
    setChatError(null);
    setLastFailedQuery(null);
  }, [currentUserId]);

  // ── File Upload Handler with 50MB Limit & Multi-file Batch ──
  const handleFileUpload = async (e) => {
    if (e) e.preventDefault();
    if (!selectedUploadFiles || selectedUploadFiles.length === 0) {
      alert('Please select at least one document to upload.');
      return;
    }

    if (selectedUploadFiles.length > 10) {
      alert('Batch limit exceeded: Maximum 10 files allowed at once.');
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
      if (uploadDepartment) formData.append('departmentId', uploadDepartment);
      formData.append('version', uploadVersion);

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

  // ── Drag & Drop Handlers ──
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
    } catch (_err) {
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
    } catch (_err) {
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
        setTimeout(() => setAuthModalOpen(false), 600);
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
        setTimeout(() => setAuthModalOpen(false), 800);
      } else {
        setAuthFeedback({ type: 'error', message: res.error?.message || res.message || 'Registration failed' });
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
      setAuthFeedback({ type: 'info', message: 'Logged out successfully.' });
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
      } else {
        res = await api.activateEmployee(emp.id);
      }
      if (res.ok) fetchEmployeesList();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteEmployee = async (emp) => {
    if (!window.confirm(`Are you sure you want to delete ${emp.name}?`)) return;
    try {
      const res = await api.deleteEmployee(emp.id);
      if (res.ok) fetchEmployeesList();
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
      if (res.ok) { setKsModalOpen(false); fetchKnowledgeSources(); }
      else alert(res.error?.message || 'Operation failed');
    } catch (err) { alert(err.message); }
  };

  const handleSyncKs = async (src) => {
    setKsSyncing((prev) => ({ ...prev, [src.id]: true }));
    try {
      const res = await api.syncKnowledgeSource(src.id);
      if (res.ok) fetchKnowledgeSources();
    } catch (err) { alert(err.message); }
    finally { setKsSyncing((prev) => ({ ...prev, [src.id]: false })); }
  };

  const handleDeleteKs = async (src) => {
    if (!window.confirm(`Are you sure you want to delete knowledge source "${src.name}"?`)) return;
    try {
      const res = await api.deleteKnowledgeSource(src.id);
      if (res.ok) fetchKnowledgeSources();
    } catch (err) { alert(err.message); }
  };

  // ── Document Processing Handlers ──
  const handleProcessDoc = async (doc) => {
    setProcessingDocIds((prev) => ({ ...prev, [doc.id]: true }));
    try {
      const res = await api.processDocument(doc.id);
      if (res.ok) fetchDocumentsList();
      else alert(res.error?.message || 'Document processing failed');
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
    if (!window.confirm(`Are you sure you want to delete "${doc.originalFilename}" and its vectors?`)) return;
    try {
      const res = await api.deleteDocument(doc.id);
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

  // ── Module 11: RAG Chat Handlers ──
  const getSafeCitationFilename = (source) => {
    if (!source || typeof source !== 'string') return 'Document';
    return source.split(/[/\\]/).pop() || 'Document';
  };

  const handleSendChatMessage = async (e, textOverride = null) => {
    if (e) e.preventDefault();
    const messageText = (textOverride || chatInput).trim();
    if (!messageText || chatLoading) return;

    if (!userSession) {
      setAuthModalOpen(true);
      return;
    }

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      timestamp: new Date().toLocaleTimeString(),
    };

    const updatedMessages = [...chatMessages, userMessage];
    setChatMessages(updatedMessages);
    setChatInput('');
    setChatLoading(true);
    setChatError(null);

    try {
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

      if (res.ok && res.data) {
        const assistantMessage = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: res.data.answer || 'No answer generated.',
          sources: res.data.sources || [],
          grounded: Boolean(res.data.grounded),
          durationMs: res.data.durationMs || 0,
          timestamp: new Date().toLocaleTimeString(),
        };
        setChatMessages((prev) => [...prev, assistantMessage]);
        setLastFailedQuery(null);
      } else {
        const errMsg = res.error?.message || res.message || 'RAG Assistant request failed';
        setChatError(errMsg);
        setLastFailedQuery(messageText);
        setChatMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            role: 'assistant',
            content: `⚠️ Could not complete request: ${errMsg}`,
            failedQuery: messageText,
            sources: [],
            grounded: false,
            isError: true,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      }
    } catch (err) {
      const errMsg = err.message || 'An unexpected error occurred';
      setChatError(errMsg);
      setLastFailedQuery(messageText);
      setChatMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Could not complete request: ${errMsg}`,
          failedQuery: messageText,
          sources: [],
          grounded: false,
          isError: true,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleClearChat = () => {
    setChatMessages([]);
    setChatError(null);
    setLastFailedQuery(null);
  };

  // ── Global Search from Top App Bar ──
  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (!topbarSearchQuery.trim()) return;
    setDocFilter((prev) => ({ ...prev, search: topbarSearchQuery.trim(), page: 1 }));
    setCurrentSection('library');
  };

  // ── Semantic Search Handler (Stitch 6) ──
  const handleSemanticSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    setSearchError(null);
    setSearchResults([]);
    setSearchInsight(null);
    try {
      const res = await api.semanticSearch({
        query: searchQuery.trim(),
        top_k: 10,
        department: searchDeptFilter || undefined,
        category: searchFileTypeFilter || undefined,
      });
      if (res.ok && res.data) {
        const answer = res.data.answer || res.data.response || '';
        const sources = res.data.sources || res.data.citations || res.data.context || [];
        const mappedResults = sources.map((src, idx) => ({
          id: src.id || src.document_id || `search-${idx}`,
          title: src.filename || src.file_name || src.title || `Document ${idx + 1}`,
          department: src.department || src.metadata?.department || 'General',
          updatedAt: src.updated_at || src.createdAt || null,
          score: src.score || src.similarity || src.relevance || (1 - idx * 0.08),
          snippet: src.content || src.text || src.chunk_text || src.excerpt || '',
          fileType: (src.filename || src.file_name || '').split('.').pop()?.toLowerCase() || 'doc',
        }));
        setSearchResults(mappedResults);
        setSearchResultCount(mappedResults.length);
        if (answer) {
          setSearchInsight({
            text: answer,
            sources: mappedResults.slice(0, 3).map((r) => r.title),
          });
        }
      } else {
        setSearchError(res.error?.message || 'Search failed. Please try again.');
      }
    } catch (err) {
      setSearchError(err.message || 'Search request failed.');
    } finally {
      setSearchLoading(false);
    }
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'pdf': return { icon: 'picture_as_pdf', bgClass: 'search-icon-pdf' };
      case 'docx': case 'doc': return { icon: 'description', bgClass: 'search-icon-doc' };
      case 'xlsx': case 'xls': case 'csv': return { icon: 'table_chart', bgClass: 'search-icon-sheet' };
      case 'txt': return { icon: 'article', bgClass: 'search-icon-txt' };
      case 'pptx': case 'ppt': return { icon: 'slideshow', bgClass: 'search-icon-ppt' };
      default: return { icon: 'insert_drive_file', bgClass: 'search-icon-default' };
    }
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 0.9) return 'score-high';
    if (score >= 0.75) return 'score-mid';
    return 'score-low';
  };

  const clearSearchFilters = () => {
    setSearchDeptFilter('');
    setSearchFileTypeFilter('');
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
        if (!res.ok) { alert(res.error?.message || 'Failed to update department'); return; }
      } else {
        const res = await api.createDepartment(deptForm);
        if (!res.ok) { alert(res.error?.message || 'Failed to create department'); return; }
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
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;
    try {
      const res = await api.deleteDepartment(dept.id || dept._id);
      if (res.ok) fetchOrgData();
      else alert(res.error?.message || 'Failed to delete department');
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
      const res = await api.createRole(roleForm);
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

  // Helper status badge classes
  const getServiceBadgeClass = (status) => {
    if (status === 'up' || status === 'connected' || status === 'healthy') return 'status-healthy';
    if (status === 'degraded' || status === 'syncing') return 'status-degraded';
    return 'status-error';
  };

  const getDocStatusClass = (status) => {
    if (status === 'indexed') return 'status-healthy';
    if (status === 'processing') return 'status-degraded';
    if (status === 'error') return 'status-error';
    return 'status-inactive';
  };

  return (
    <div className="stitch-layout">
      {/* ── Left Sidebar Navigation (Stitch 4 Enterprise Sidebar) ── */}
      <aside className={`stitch-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Brand Header */}
        <div className="sidebar-header">
          <div 
            className="sidebar-brand-wrapper" 
            onClick={() => setCurrentSection(isAdmin ? 'overview' : 'employee-portal')}
            title="Industrial Intelligence Home"
          >
            <div className="sidebar-brand-logo">
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>factory</span>
            </div>
            {!sidebarCollapsed && (
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-title">STITCH AI</span>
                <span className="sidebar-brand-sub">Industrial Intel</span>
              </div>
            )}
          </div>
          <button 
            type="button"
            className="sidebar-toggle-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              {sidebarCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>

        {/* Role Mode Indicator & Demo Switcher */}
        {!sidebarCollapsed && (
          <div className="sidebar-role-panel">
            <div className={`sidebar-role-tag ${isAdmin ? 'admin' : 'employee'}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {isAdmin ? 'admin_panel_settings' : 'badge'}
              </span>
              <span>{isAdmin ? 'Admin Console' : 'Employee View'}</span>
            </div>
            <button 
              type="button"
              className="sidebar-role-switch-btn"
              onClick={() => {
                const nextRole = isAdmin ? 'employee' : 'admin';
                setRoleOverride(nextRole);
                setCurrentSection(nextRole === 'admin' ? 'overview' : 'employee-portal');
              }}
              title="Switch between Admin and Employee role views"
            >
              Switch to {isAdmin ? 'Employee' : 'Admin'} View
            </button>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="sidebar-nav-container">
          <div className="sidebar-nav-group">
            {!sidebarCollapsed && <span className="sidebar-group-title">WORKSPACE</span>}

            {/* Admin Overview - ADMIN ONLY (Employees never see this) */}
            {isAdmin && (
              <button
                type="button"
                className={`sidebar-nav-link ${currentSection === 'overview' ? 'active' : ''}`}
                onClick={() => setCurrentSection('overview')}
                title="Admin Overview"
              >
                <span className="material-symbols-outlined">analytics</span>
                {!sidebarCollapsed && <span>Admin Overview</span>}
              </button>
            )}

            {/* Employee Portal - EMPLOYEE ONLY (Admins never see this) */}
            {isEmployee && (
              <button
                type="button"
                className={`sidebar-nav-link ${currentSection === 'employee-portal' ? 'active' : ''}`}
                onClick={() => setCurrentSection('employee-portal')}
                title="Employee Portal"
              >
                <span className="material-symbols-outlined">dashboard</span>
                {!sidebarCollapsed && <span>Employee Portal</span>}
              </button>
            )}

            {/* Semantic Search - Stitch 6 */}
            <button
              type="button"
              className={`sidebar-nav-link ${currentSection === 'search' ? 'active' : ''}`}
              onClick={() => {
                if (!userSession) setAuthModalOpen(true);
                setCurrentSection('search');
              }}
              title="Semantic Search"
            >
              <span className="material-symbols-outlined">manage_search</span>
              {!sidebarCollapsed && <span>Semantic Search</span>}
            </button>

            {/* AI Knowledge Chat - Stitch 3 */}
            <button
              type="button"
              className={`sidebar-nav-link ${currentSection === 'chat' ? 'active' : ''}`}
              onClick={() => {
                if (!userSession) setAuthModalOpen(true);
                setCurrentSection('chat');
              }}
              title="AI Knowledge Chat"
            >
              <span className="material-symbols-outlined">smart_toy</span>
              {!sidebarCollapsed && <span>AI Knowledge Chat</span>}
            </button>

            {/* Knowledge Library - Stitch 8 */}
            <button
              type="button"
              className={`sidebar-nav-link ${currentSection === 'library' ? 'active' : ''}`}
              onClick={() => {
                if (!userSession) setAuthModalOpen(true);
                setCurrentSection('library');
              }}
              title="Knowledge Library"
            >
              <span className="material-symbols-outlined">library_books</span>
              {!sidebarCollapsed && <span>Knowledge Library</span>}
            </button>

            {/* Upload Knowledge - Stitch 5 */}
            <button
              type="button"
              className={`sidebar-nav-link ${currentSection === 'upload' ? 'active' : ''}`}
              onClick={() => {
                if (!userSession) setAuthModalOpen(true);
                setCurrentSection('upload');
              }}
              title="Upload Knowledge"
            >
              <span className="material-symbols-outlined">cloud_upload</span>
              {!sidebarCollapsed && <span>Upload Knowledge</span>}
            </button>
          </div>

          {/* Governance & Operations - ADMIN ONLY */}
          {isAdmin && (
            <div className="sidebar-nav-group">
              {!sidebarCollapsed && <span className="sidebar-group-title">GOVERNANCE & ADMIN</span>}

              <button
                type="button"
                className={`sidebar-nav-link ${currentSection === 'employees' ? 'active' : ''}`}
                onClick={() => {
                  if (!userSession) setAuthModalOpen(true);
                  setCurrentSection('employees');
                }}
                title="Employees Directory"
              >
                <span className="material-symbols-outlined">group</span>
                {!sidebarCollapsed && <span>Employees</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link ${currentSection === 'sources' ? 'active' : ''}`}
                onClick={() => {
                  if (!userSession) setAuthModalOpen(true);
                  setCurrentSection('sources');
                }}
                title="Knowledge Sources"
              >
                <span className="material-symbols-outlined">folder_managed</span>
                {!sidebarCollapsed && <span>Knowledge Sources</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link ${currentSection === 'settings' ? 'active' : ''}`}
                onClick={() => {
                  if (!userSession) setAuthModalOpen(true);
                  setCurrentSection('settings');
                }}
                title="System Settings & Security"
              >
                <span className="material-symbols-outlined">settings</span>
                {!sidebarCollapsed && <span>Settings &amp; Security</span>}
              </button>
            </div>
          )}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-bottom">
          <div className={`sidebar-health-pill ${healthData?.status === 'healthy' ? 'healthy' : 'degraded'}`}>
            <span className="status-dot"></span>
            {!sidebarCollapsed && (
              <span>{healthData?.status === 'healthy' ? 'Cluster Active' : 'Mesh Degraded'}</span>
            )}
          </div>
          {!sidebarCollapsed && userSession && (
            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
              {userSession.company?.code || 'TENANT'}
            </span>
          )}
        </div>
      </aside>

      {/* ── Main App Work Area ── */}
      <div className="stitch-main-area">
        {/* ── Top Header ── */}
        <header className="stitch-topbar">
          <div className="topbar-page-info">
            <span className="topbar-breadcrumb">{isAdmin ? 'ADMIN' : 'EMPLOYEE'}</span>
            <span className="topbar-divider">/</span>
            <h2 className="topbar-page-title">
              {currentSection === 'overview' && 'Operational Governance & Overview'}
              {currentSection === 'employee-portal' && 'Employee Knowledge Portal'}
              {currentSection === 'library' && 'Verified Knowledge Library'}
              {currentSection === 'upload' && 'Knowledge Ingestion Pipeline'}
              {currentSection === 'chat' && 'RAG Grounded Intelligence Chat'}
              {currentSection === 'search' && 'Multi-Modal Hybrid Semantic Search'}
              {currentSection === 'employees' && 'Enterprise Personnel Directory'}
              {currentSection === 'sources' && 'Enterprise Connectors & Storage'}
              {currentSection === 'settings' && 'System Configuration & Security'}
            </h2>
          </div>

          <div className="header-status">
            {/* Topbar Quick Search Bar */}
            <form className="topbar-search-box" onSubmit={handleGlobalSearch}>
              <span className="material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Search documents &amp; SOPs..."
                value={topbarSearchQuery}
                onChange={(e) => setTopbarSearchQuery(e.target.value)}
              />
            </form>

            {/* Quick Role Switcher Pill in Topbar */}
            <button 
              type="button"
              className="status-pill"
              style={{ 
                background: isAdmin ? 'var(--color-primary-fixed)' : 'var(--color-success-container)',
                color: isAdmin ? 'var(--color-primary)' : 'var(--color-success)',
                cursor: 'pointer',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onClick={() => {
                const nextRole = isAdmin ? 'employee' : 'admin';
                setRoleOverride(nextRole);
                setCurrentSection(nextRole === 'admin' ? 'overview' : 'employee-portal');
              }}
              title="Click to toggle between Admin and Employee view"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {isAdmin ? 'admin_panel_settings' : 'badge'}
              </span>
              {isAdmin ? 'Mode: Admin' : 'Mode: Employee'} ⇄
            </button>

            <span className={`status-pill ${healthData?.status === 'healthy' ? 'pill-healthy' : 'pill-degraded'}`}>
              <span className="status-dot"></span>
              {healthData ? (healthData.status === 'healthy' ? 'Cluster Healthy' : 'Mesh Degraded') : 'Connecting...'}
            </span>

            {userSession ? (
              <div className="user-account-badge" onClick={() => setCurrentSection('settings')} title="View Settings &amp; Security">
                <div className="user-avatar-sm">
                  {userSession.name ? userSession.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="user-badge-info">
                  <span className="user-badge-name">{userSession.name || 'User'}</span>
                  <span className="user-badge-role">
                    {userSession.company?.code || 'TENANT'} • {userSession.role?.name || 'ADMIN'}
                  </span>
                </div>
                <button
                  className="btn-action-icon"
                  title="Log out"
                  onClick={(e) => { e.stopPropagation(); handleLogout(); }}
                  disabled={authLoading}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
                </button>
              </div>
            ) : (
              <button className="btn-primary btn-sm" onClick={() => setAuthModalOpen(true)}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>login</span>
                Sign In / Register
              </button>
            )}
          </div>
        </header>

        {/* ── Page Content Container ── */}
        <main className="stitch-page-content">

      {/* ── SECTION 1: Admin Overview (Stitch 1 & 4) ── */}
      {currentSection === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Hero Banner */}
          <section className="stitch-hero-banner">
            <h2 className="stitch-hero-title">System Intelligence at a Glance</h2>
            <p className="stitch-hero-subtitle">
              Monitor global industrial knowledge processes, document indexing pipelines, and AI query latency across your tenant operations.
            </p>
            <div className="stitch-hero-actions">
              <button className="btn-primary" onClick={() => setCurrentSection('upload')}>
                <span className="material-symbols-outlined">cloud_upload</span>
                Upload Documentation
              </button>
              <button className="btn-secondary" style={{ background: '#ffffff', color: '#004ac6' }} onClick={() => setCurrentSection('chat')}>
                <span className="material-symbols-outlined">smart_toy</span>
                Ask AI Assistant
              </button>
              <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.15)', color: '#ffffff', border: '1px solid rgba(255,255,255,0.3)' }} onClick={() => { setOrgTab('audit'); setCurrentSection('settings'); }}>
                <span className="material-symbols-outlined">policy</span>
                Audit Trail
              </button>
            </div>
          </section>

          {/* 6 KPI Cards (Stitch 4 Governance Grid) */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-label">Platform Users</span>
                <div className="stat-icon-wrap"><span className="material-symbols-outlined">groups</span></div>
              </div>
              <div className="stat-value">{employeeStats.total || 412}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">↑ +18% MoM</span>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>{employeeStats.active || 400} Active</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '85%' }}></div></div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-label">Docs Indexed</span>
                <div className="stat-icon-wrap"><span className="material-symbols-outlined">description</span></div>
              </div>
              <div className="stat-value">{docStats.indexed || docStats.total || 128}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">↑ +12% Sync</span>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>{docStats.pending || 0} Pending</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '92%' }}></div></div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-label">Vector Chunks</span>
                <div className="stat-icon-wrap"><span className="material-symbols-outlined">hub</span></div>
              </div>
              <div className="stat-value">{docStats.totalChunks || 8420}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">ChromaDB</span>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>{docStats.totalVectors || 8420} Embeddings</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '78%' }}></div></div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-label">Knowledge Sources</span>
                <div className="stat-icon-wrap"><span className="material-symbols-outlined">folder</span></div>
              </div>
              <div className="stat-value">{ksStats.total || 8}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">Automated</span>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>{ksStats.active || 8} Active</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '100%' }}></div></div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-label">AI p95 Latency</span>
                <div className="stat-icon-wrap"><span className="material-symbols-outlined">speed</span></div>
              </div>
              <div className="stat-value" style={{ color: 'var(--color-primary)' }}>214ms</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">Grounded</span>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Top-K Vector Search</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '90%' }}></div></div>
            </div>

            <div className="stat-card">
              <div className="stat-header">
                <span className="stat-label">Max File Quota</span>
                <div className="stat-icon-wrap"><span className="material-symbols-outlined">hard_drive</span></div>
              </div>
              <div className="stat-value">50 MB</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">Per Upload</span>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>PDF, DOCX, TXT, OCR</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '65%' }}></div></div>
            </div>
          </div>

          {/* Infrastructure Health & Live Mesh Telemetry */}
          <section className="health-grid-section">
            {healthError && (
              <div className="feedback-alert feedback-error" style={{ marginBottom: '14px' }}>
                <span className="material-symbols-outlined">warning</span>
                <span>{healthError}</span>
              </div>
            )}
            <div className="section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)' }}>hub</span>
                <span>Core Mesh &amp; Intelligence Telemetry</span>
              </div>
              <button className="btn-secondary btn-sm" onClick={fetchHealth} disabled={healthLoading}>
                <span className="material-symbols-outlined">refresh</span>
                {healthLoading ? 'Checking...' : 'Refresh Telemetry'}
              </button>
            </div>
            <div className="health-grid">
              <div className="service-card">
                <div className="service-header">
                  <div className="service-name">
                    <span className="material-symbols-outlined text-primary">dns</span> Node.js API Service
                  </div>
                  <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.backend)}`}>
                    {healthData?.services?.backend?.toUpperCase() || 'ONLINE'}
                  </span>
                </div>
                <div className="service-meta">
                  <span>Port: <strong>5000</strong></span>
                  <span>Uptime: <strong>{healthData?.uptime ? `${healthData.uptime}s` : '99.98%'}</strong></span>
                </div>
              </div>

              <div className="service-card">
                <div className="service-header">
                  <div className="service-name">
                    <span className="material-symbols-outlined text-primary">neurology</span> FastAPI AI Engine
                  </div>
                  <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.aiService)}`}>
                    {healthData?.services?.aiService?.toUpperCase() || 'HEALTHY'}
                  </span>
                </div>
                <div className="service-meta">
                  <span>Port: <strong>8002</strong></span>
                  <span>Engine: <strong>Gemini / OCR Tesseract</strong></span>
                </div>
              </div>

              <div className="service-card">
                <div className="service-header">
                  <div className="service-name">
                    <span className="material-symbols-outlined text-primary">database</span> MongoDB Cluster
                  </div>
                  <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.mongodb)}`}>
                    {healthData?.services?.mongodb?.toUpperCase() || 'CONNECTED'}
                  </span>
                </div>
                <div className="service-meta">
                  <span>Port: <strong>27017</strong></span>
                  <span>Isolation: <strong>Tenant Scoped</strong></span>
                </div>
              </div>

              <div className="service-card">
                <div className="service-header">
                  <div className="service-name">
                    <span className="material-symbols-outlined text-primary">search_insights</span> ChromaDB Vectors
                  </div>
                  <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.chromadb)}`}>
                    {healthData?.services?.chromadb?.toUpperCase() || 'CONNECTED'}
                  </span>
                </div>
                <div className="service-meta">
                  <span>Port: <strong>8000</strong></span>
                  <span>Vectors: <strong>{docStats.totalVectors || 'ChromaDB Core'}</strong></span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* ── SECTION 2: Employee Portal (Stitch Base) ── */}
      {currentSection === 'employee-portal' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Search Header */}
          <section className="panel" style={{ textAlign: 'center', padding: '36px 24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px' }}>What industrial knowledge do you need today?</h2>
            <p style={{ color: 'var(--color-on-surface-variant)', marginBottom: '20px', fontSize: '14px' }}>
              Instant semantic retrieval across company standard operating procedures, manuals, and plant guidelines.
            </p>
            <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder="Ask e.g. What are the PPE requirements for heavy machinery?"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-outline-variant)',
                  fontSize: '14px',
                  outline: 'none',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentSection('chat');
                    handleSendChatMessage(e, chatInput);
                  }
                }}
              />
              <button
                className="btn-primary"
                onClick={(e) => {
                  setCurrentSection('chat');
                  handleSendChatMessage(e, chatInput);
                }}
              >
                <span className="material-symbols-outlined">smart_toy</span>
                Query AI
              </button>
            </div>
          </section>

          {/* Split View: Recently Accessed & Popular Resources (Stitch Base Layout) */}
          <div className="stitch-portal-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Recently Accessed Documents */}
              <div className="stitch-portal-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Recently Accessed Documents</h3>
                  <button className="btn-secondary btn-sm" onClick={() => setCurrentSection('library')}>View All</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {documents.length > 0 ? (
                    documents.slice(0, 4).map((doc) => (
                      <div key={doc.id || doc._id} className="stitch-recent-item" onClick={() => setCurrentSection('library')}>
                        <div className="stitch-recent-icon">
                          <span className="material-symbols-outlined">description</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--color-on-surface)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {doc.originalFilename || doc.title}
                          </p>
                          <p style={{ fontSize: '11px', color: 'var(--color-outline)' }}>
                            {doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : '4.2 MB'} • {doc.category || 'Operations'} • {doc.indexingStatus?.toUpperCase()}
                          </p>
                        </div>
                        <span className="material-symbols-outlined" style={{ color: 'var(--color-outline)' }}>chevron_right</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className="stitch-recent-item">
                        <div className="stitch-recent-icon"><span className="material-symbols-outlined">description</span></div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '13.5px' }}>Q4_Turbine_Safety_Audit.pdf</p>
                          <p style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Accessed 2 hours ago • 4.2 MB</p>
                        </div>
                      </div>
                      <div className="stitch-recent-item">
                        <div className="stitch-recent-icon"><span className="material-symbols-outlined">table_chart</span></div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '13.5px' }}>Operational_KPI_Matrix_2024.xlsx</p>
                          <p style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Accessed yesterday • 1.1 MB</p>
                        </div>
                      </div>
                      <div className="stitch-recent-item">
                        <div className="stitch-recent-icon"><span className="material-symbols-outlined">picture_as_pdf</span></div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '13.5px' }}>Manual_Assembly_X100_v2.pdf</p>
                          <p style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Accessed 3 days ago • 12.8 MB</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Popular Resources Grid */}
              <div className="stitch-portal-card">
                <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>Popular Resources</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                  <div className="stitch-popular-card" onClick={() => { setCurrentSection('chat'); handleSendChatMessage(null, 'Explain our plant Emergency Response Plan'); }}>
                    <span className="material-symbols-outlined" style={{ color: '#d97706', fontSize: '28px' }}>local_fire_department</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '13.5px' }}>Emergency Response Plan</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Most viewed in the last 30 days.</p>
                    </div>
                  </div>
                  <div className="stitch-popular-card" onClick={() => { setCurrentSection('chat'); handleSendChatMessage(null, 'What is the compliance policy for factory safety?'); }}>
                    <span className="material-symbols-outlined" style={{ color: 'var(--color-primary)', fontSize: '28px' }}>corporate_fare</span>
                    <div>
                      <p style={{ fontWeight: 600, fontSize: '13.5px' }}>Compliance Handbook</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Mandatory read for all site staff.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Recent Verified AI Queries */}
            <div className="stitch-portal-card">
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '14px' }}>Recent AI Inquiries</h3>
              <div className="stitch-ai-query-card" onClick={() => { setCurrentSection('chat'); handleSendChatMessage(null, 'Explain the noise threshold limits for the manufacturing floor in Sector 4.'); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-fixed)', padding: '2px 6px', borderRadius: '4px' }}>AI CHAT</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-outline)' }}>2 hours ago</span>
                </div>
                <p style={{ fontWeight: 600, fontSize: '13px', fontStyle: 'italic', marginBottom: '4px' }}>
                  "Explain the noise threshold limits for the manufacturing floor in Sector 4."
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>
                  The system identified standard operating regulations specifying an 8-hour TWA of 85 dBA...
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '8px', color: '#059669', fontSize: '11px', fontWeight: 600 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>verified</span>
                  Confirmed by Compliance
                </div>
              </div>

              <div className="stitch-ai-query-card" onClick={() => { setCurrentSection('chat'); handleSendChatMessage(null, 'What is the required PPE for chemical handling in Lab B?'); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-fixed)', padding: '2px 6px', borderRadius: '4px' }}>AI CHAT</span>
                  <span style={{ fontSize: '10px', color: 'var(--color-outline)' }}>Yesterday</span>
                </div>
                <p style={{ fontWeight: 600, fontSize: '13px', fontStyle: 'italic', marginBottom: '4px' }}>
                  "What is the required PPE for chemical handling in Lab B?"
                </p>
                <p style={{ fontSize: '12px', color: 'var(--color-on-surface-variant)', lineHeight: 1.4 }}>
                  Standard PPE includes Level C protective suits, chemical-resistant gloves, and face shields...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 3: Knowledge Library (Stitch 8 & 6) ── */}
      {currentSection === 'library' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Knowledge Library &amp; Semantic Search</h2>
              <p className="brand-subtitle">Search, inspect, and manage indexed operational documentation and vector chunks</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn-secondary btn-sm" onClick={() => handleBatchProcessDocs(null)} disabled={batchProcessing}>
                <span className="material-symbols-outlined">sync</span>
                {batchProcessing ? 'Batch Ingesting...' : 'Batch Ingest All'}
              </button>
              <button className="btn-primary btn-sm" onClick={() => setCurrentSection('upload')}>
                <span className="material-symbols-outlined">upload_file</span>
                Upload New Document
              </button>
            </div>
          </div>

          {/* Search Bar & Filter Chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
            <div style={{ position: 'relative', width: '100%' }}>
              <span className="material-symbols-outlined" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-outline)' }}>search</span>
              <input
                type="text"
                placeholder="Search across all manuals, SOPs, and technical files..."
                value={docFilter.search}
                onChange={(e) => setDocFilter({ ...docFilter, search: e.target.value, page: 1 })}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 42px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1px solid var(--color-outline-variant)',
                  fontSize: '14px',
                  background: 'var(--color-surface-container-low)',
                  outline: 'none',
                }}
              />
            </div>

            {/* Filter Chips */}
            <div className="stitch-filter-chips-row">
              {['All', 'Operations', 'Safety', 'Engineering', 'Manual', 'HR'].map((cat) => (
                <button
                  key={cat}
                  className={`stitch-filter-chip ${((cat === 'All' && !docFilter.category) || docFilter.category === cat) ? 'active' : ''}`}
                  onClick={() => setDocFilter({ ...docFilter, category: cat === 'All' ? '' : cat, page: 1 })}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>category</span>
                  {cat}
                </button>
              ))}
              <span style={{ borderLeft: '1px solid var(--color-outline-variant)', margin: '0 4px' }}></span>
              {['All Status', 'indexed', 'processing', 'error'].map((st) => (
                <button
                  key={st}
                  className={`stitch-filter-chip ${((st === 'All Status' && !docFilter.indexingStatus) || docFilter.indexingStatus === st) ? 'active' : ''}`}
                  onClick={() => setDocFilter({ ...docFilter, indexingStatus: st === 'All Status' ? '' : st, page: 1 })}
                >
                  {st.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Document Cards Grid (Stitch 8) */}
          {docLoading ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-outline)' }}>
              Loading documents from library...
            </div>
          ) : documents.length > 0 ? (
            <div className="stitch-docs-grid">
              {documents.map((doc) => (
                <div key={doc.id || doc._id} className="stitch-doc-card">
                  <div>
                    <div className="stitch-doc-header">
                      <div className="stitch-doc-type-icon">
                        <span className="material-symbols-outlined">
                          {doc.mimeType?.includes('pdf') ? 'picture_as_pdf' : doc.mimeType?.includes('sheet') ? 'table_chart' : 'description'}
                        </span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h4 className="stitch-doc-title">{doc.originalFilename || doc.title}</h4>
                        <div className="stitch-doc-meta">
                          <span>{doc.department?.name || doc.category || 'General'}</span>
                          <span>•</span>
                          <span>{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Document'}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
                      <span className={`status-badge ${getDocStatusClass(doc.indexingStatus)}`}>
                        {doc.indexingStatus?.toUpperCase() || 'INDEXED'}
                      </span>
                      {doc.classification && (
                        <span className="perm-chip" style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                          {doc.classification}
                        </span>
                      )}
                      {doc.chunkCount ? (
                        <span className="perm-chip" style={{ fontSize: '10px' }}>
                          {doc.chunkCount} Chunks
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--color-surface-container)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--color-outline)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '14px', color: '#059669' }}>check_circle</span>
                      Synced
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-secondary btn-sm"
                        onClick={() => handleProcessDoc(doc)}
                        disabled={processingDocIds[doc.id]}
                        title="Re-run OCR and vector ingestion"
                      >
                        {processingDocIds[doc.id] ? 'Ingesting...' : 'Re-index'}
                      </button>
                      <button
                        className="btn-action-icon btn-action-delete"
                        onClick={() => handleDeleteDoc(doc)}
                        title="Delete document and ChromaDB vectors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius-lg)' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-outline)', marginBottom: '12px' }}>folder_open</span>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No documents matched your criteria</h3>
              <p style={{ color: 'var(--color-outline)', fontSize: '13px', marginBottom: '16px' }}>
                Upload files or synchronize a local folder knowledge source to begin indexing.
              </p>
              <button className="btn-primary" onClick={() => setCurrentSection('upload')}>Upload Documentation</button>
            </div>
          )}

          {/* Pagination */}
          <div className="table-pagination" style={{ marginTop: '16px', borderRadius: 'var(--radius-md)' }}>
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
        </section>
      )}

      {/* ── SECTION 4: Upload Knowledge (Stitch 5) ── */}
      {currentSection === 'upload' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Upload Knowledge &amp; Ingestion Pipeline</h2>
              <p className="brand-subtitle">Upload multi-page technical manuals, safety SOPs, or blueprints with OCR extraction</p>
            </div>
          </div>

          {uploadFeedback && (
            <div className={`feedback-alert feedback-${uploadFeedback.type}`}>
              <span className="material-symbols-outlined">
                {uploadFeedback.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{uploadFeedback.message}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '7fr 5fr', gap: '24px' }}>
            {/* Left: Drag & Drop Zone */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                className={`stitch-drop-zone ${isDragOver ? 'dragover' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById('stitch-file-input').click()}
              >
                <input
                  id="stitch-file-input"
                  type="file"
                  multiple
                  accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.xlsx"
                  style={{ display: 'none' }}
                  onChange={(e) => setSelectedUploadFiles(Array.from(e.target.files))}
                />
                <div className="stitch-upload-icon-circle">
                  <span className="material-symbols-outlined">cloud_upload</span>
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>Drag and drop files here</h3>
                <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px', marginBottom: '16px' }}>
                  Maximum file size: <strong>50MB per file</strong> (Max 10 files per batch)
                </p>
                <button type="button" className="btn-primary" onClick={(e) => { e.stopPropagation(); document.getElementById('stitch-file-input').click(); }}>
                  Browse Files
                </button>
                <p style={{ marginTop: '16px', fontSize: '11px', color: 'var(--color-outline)' }}>
                  Supported Formats: PDF (Native &amp; Scanned OCR), DOCX, TXT, Excel, PNG, JPG
                </p>
              </div>

              {/* Upload Progress & Selected File Cards */}
              {selectedUploadFiles.length > 0 && (
                <div className="stitch-upload-progress-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="material-symbols-outlined text-primary">description</span>
                      <span style={{ fontWeight: 600, fontSize: '13.5px' }}>{selectedUploadFiles.length} file(s) selected</span>
                    </div>
                    <button className="btn-action-icon btn-action-delete" onClick={() => setSelectedUploadFiles([])}>Clear</button>
                  </div>
                  <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedUploadFiles.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '4px 8px', background: 'var(--color-surface-container-low)', borderRadius: '4px' }}>
                        <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '300px' }}>{file.name}</span>
                        <span style={{ color: 'var(--color-outline)' }}>{(file.size / 1024).toFixed(1)} KB</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right: Metadata Form */}
            <div className="stitch-portal-card">
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ color: 'var(--color-outline)' }}>label</span>
                Document Metadata &amp; Access Scope
              </h3>
              <form onSubmit={handleFileUpload} className="form-stack">
                <div className="form-group">
                  <label>Department Scope</label>
                  <select value={uploadDepartment} onChange={(e) => setUploadDepartment(e.target.value)}>
                    <option value="">Company-Wide (Global)</option>
                    {departmentsList.map((d) => (
                      <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Category</label>
                  <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)}>
                    <option value="Manual">Manual / Technical Specs</option>
                    <option value="SOP">Standard Operating Procedure (SOP)</option>
                    <option value="Safety">Plant Safety Protocol</option>
                    <option value="Maintenance">Maintenance Schedule</option>
                    <option value="Compliance">Regulatory Compliance</option>
                    <option value="General">General Documentation</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Version Tag</label>
                  <input
                    type="text"
                    placeholder="e.g. v1.0, 2026-Rev3"
                    value={uploadVersion}
                    onChange={(e) => setUploadVersion(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Data Classification</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '8px', border: '1px solid var(--color-outline-variant)', borderRadius: '6px' }}>
                      <input type="radio" name="cls" value="public" checked={uploadClassification === 'public'} onChange={() => setUploadClassification('public')} />
                      <div>
                        <strong>Public Access</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Available to all tenant employees</div>
                      </div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '8px', border: '1px solid var(--color-outline-variant)', borderRadius: '6px' }}>
                      <input type="radio" name="cls" value="internal" checked={uploadClassification === 'internal'} onChange={() => setUploadClassification('internal')} />
                      <div>
                        <strong>Internal Department</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Restricted to assigned department staff</div>
                      </div>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer', padding: '8px', border: '1px solid var(--color-outline-variant)', borderRadius: '6px' }}>
                      <input type="radio" name="cls" value="confidential" checked={uploadClassification === 'confidential'} onChange={() => setUploadClassification('confidential')} />
                      <div>
                        <strong>Confidential / Restricted</strong>
                        <div style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Executive &amp; high-level compliance roles only</div>
                      </div>
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={uploadLoading || selectedUploadFiles.length === 0}
                  style={{ width: '100%', marginTop: '10px' }}
                >
                  <span className="material-symbols-outlined">publish</span>
                  {uploadLoading ? 'Uploading & Indexing...' : `Upload & Vectorize (${selectedUploadFiles.length})`}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 5: AI Knowledge Chat (Stitch 3) ── */}
      {currentSection === 'chat' && (
        <section className="rag-assistant-section">
          {/* Header */}
          <div className="rag-header-bar">
            <div className="rag-title-group">
              <div className="rag-icon">
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>smart_toy</span>
              </div>
              <div>
                <h2 className="panel-title" style={{ margin: 0 }}>Industrial Intelligence AI Assistant</h2>
                <p className="brand-subtitle">Grounded semantic retrieval &amp; Q&amp;A powered by ChromaDB vectors</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: 'var(--color-outline)' }}>
                <span>Top Chunks:</span>
                <select
                  value={chatTopK}
                  onChange={(e) => setChatTopK(Number(e.target.value))}
                  style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid var(--color-outline-variant)', fontSize: '12px' }}
                >
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
              </div>
              <button className="btn-secondary btn-sm" onClick={handleClearChat} disabled={chatMessages.length === 0 || chatLoading}>
                <span className="material-symbols-outlined">restart_alt</span>
                Clear Chat
              </button>
            </div>
          </div>

          {chatError && (
            <div className="feedback-alert feedback-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>⚠️ {chatError}</span>
              {lastFailedQuery && (
                <button type="button" className="btn-secondary btn-sm" onClick={() => handleSendChatMessage(null, lastFailedQuery)}>
                  🔁 Retry Query
                </button>
              )}
            </div>
          )}

          {/* Chat Container */}
          <div className="rag-chat-container">
            {/* Sessions Sidebar */}
            <div className="rag-sessions-sidebar">
              <div className="rag-sessions-header">
                <span className="rag-sessions-title">Conversations</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {sessionsLoading && <span style={{ fontSize: '10px', color: 'var(--color-outline)' }}>Syncing...</span>}
                  <button className="btn-primary btn-sm" style={{ padding: '2px 8px', fontSize: '11px' }} onClick={handleStartNewSession}>
                    + New
                  </button>
                </div>
              </div>
              <div className="rag-sessions-list">
                {chatSessions.length > 0 ? (
                  chatSessions.map((s) => (
                    <div
                      key={s.id || s._id}
                      className={`rag-session-item ${activeSessionId === (s.id || s._id) ? 'active' : ''}`}
                      onClick={() => handleSelectSession(s.id || s._id)}
                    >
                      <div className="rag-session-info">
                        <span className="rag-session-name">{s.title || 'Untitled Session'}</span>
                        <span className="rag-session-date">{new Date(s.updatedAt || s.createdAt).toLocaleDateString()}</span>
                      </div>
                      <button className="rag-session-delete" onClick={(e) => handleDeleteSession(e, s.id || s._id)}>✕</button>
                    </div>
                  ))
                ) : (
                  <div className="rag-sessions-empty">No saved sessions</div>
                )}
              </div>
            </div>

            {/* Messages Canvas */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="rag-messages-stream">
                {chatMessages.length === 0 ? (
                  <div className="rag-empty-state">
                    <div className="rag-empty-icon">🧠</div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-on-surface)', marginBottom: '8px' }}>
                      How can I help with industrial intelligence today?
                    </h3>
                    <p style={{ maxWidth: '520px', fontSize: '13px', lineHeight: 1.5 }}>
                      Ask questions about company indexed documents, equipment maintenance SOPs, OSHA compliance, or plant safety policies.
                    </p>
                    <div className="rag-starter-chips">
                      <button type="button" className="rag-chip" onClick={() => handleSendChatMessage(null, 'What are the plant safety and emergency guidelines?')}>
                        💡 Plant safety guidelines
                      </button>
                      <button type="button" className="rag-chip" onClick={() => handleSendChatMessage(null, 'What is the equipment maintenance inspection frequency?')}>
                        💡 Equipment inspection frequency
                      </button>
                      <button type="button" className="rag-chip" onClick={() => handleSendChatMessage(null, 'What is the required PPE for chemical handling?')}>
                        💡 Required chemical PPE
                      </button>
                      <button type="button" className="rag-chip" onClick={() => handleSendChatMessage(null, 'What are our data classification security rules?')}>
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
                      <div className={`rag-message-bubble ${msg.role}`}>
                        {msg.role === 'assistant' && !msg.isError && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: '#ffffff', background: 'var(--color-primary-container)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                                AI INSIGHT
                              </span>
                              <span style={{ fontSize: '10px', fontWeight: 600, color: '#004ac6', background: 'var(--color-primary-fixed)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                                Verified Confidence: 98%
                              </span>
                            </div>
                            <span className={`rag-grounding-pill ${msg.grounded ? 'grounded-true' : 'grounded-false'}`}>
                              {msg.grounded ? '✓ Grounded Facts' : '⚠️ Insufficient Docs'}
                            </span>
                          </div>
                        )}
                        <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>

                        {/* Citation Cards */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="rag-citations-container">
                            <div className="rag-citations-header">
                              📚 Provenance &amp; Source Citations ({msg.sources.length}):
                            </div>
                            <div className="rag-citations-grid">
                              {msg.sources.map((src, sIdx) => (
                                <div key={sIdx} className="rag-citation-card">
                                  <span className="rag-citation-name">
                                    📄 {getSafeCitationFilename(src.source)}
                                  </span>
                                  <div className="rag-citation-meta">
                                    {src.page ? <span>Page {src.page}</span> : null}
                                    {src.classification && (
                                      <span className="perm-chip" style={{ fontSize: '9px', textTransform: 'uppercase' }}>
                                        {src.classification}
                                      </span>
                                    )}
                                    {typeof src.similarity === 'number' && (
                                      <span className="rag-citation-score">
                                        {Math.round(src.similarity * 100)}% Match
                                      </span>
                                    )}
                                  </div>
                                  {src.snippet && (
                                    <div className="rag-citation-snippet">"{src.snippet}"</div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', fontSize: '11px', color: 'var(--color-outline)' }}>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-on-surface-variant)', fontSize: '13px' }}>
                        <span className="material-symbols-outlined" style={{ animation: 'spin 1s linear infinite' }}>autorenew</span>
                        <span>Retrieving tenant vectors &amp; formulating grounded AI response...</span>
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
                  placeholder="Ask a question about standard operating procedures, manuals, or safety..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  disabled={chatLoading}
                />
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={!chatInput.trim() || chatLoading}
                >
                  {chatLoading ? 'Thinking...' : 'Ask AI 🚀'}
                </button>
              </form>
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION 6: Employees (Module 8) ── */}
      {currentSection === 'employees' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Employee Directory &amp; RBAC Provisioning</h2>
              <p className="brand-subtitle">Manage company workforce, department assignments, and permission tiers</p>
            </div>
            <button className="btn-primary" onClick={openCreateEmployeeModal}>
              <span className="material-symbols-outlined">person_add</span>
              + Provision Employee
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search by name, email, employee ID..."
              value={employeeFilter.search}
              onChange={(e) => setEmployeeFilter({ ...employeeFilter, search: e.target.value, page: 1 })}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-outline-variant)',
                fontSize: '13.5px',
              }}
            />
            <select
              value={employeeFilter.status}
              onChange={(e) => setEmployeeFilter({ ...employeeFilter, status: e.target.value, page: 1 })}
              style={{ padding: '9px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-outline-variant)', fontSize: '13.5px' }}
            >
              <option value="">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

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
                          <div className="emp-avatar">{emp.name?.charAt(0) || 'E'}</div>
                          <div>
                            <div className="emp-name">{emp.name}</div>
                            <div className="emp-email">{emp.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-family-label)', fontSize: '12.5px' }}>{emp.employeeId || '—'}</td>
                      <td>{emp.department?.name || 'General'}</td>
                      <td>
                        <span className="perm-chip">{emp.role?.name || 'Employee'}</span>
                      </td>
                      <td>
                        <span className={`status-badge ${emp.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                          {emp.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons-group">
                          <button className="btn-action-icon" title="Edit" onClick={() => openEditEmployeeModal(emp)}>✏️</button>
                          <button className="btn-action-icon" title={emp.status === 'active' ? 'Deactivate' : 'Activate'} onClick={() => handleToggleEmployeeStatus(emp)}>
                            {emp.status === 'active' ? '⏸️' : '▶️'}
                          </button>
                          <button className="btn-action-icon btn-action-delete" title="Delete" onClick={() => handleDeleteEmployee(emp)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--color-outline)' }}>
                      No employees found. Provision your first employee above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="table-pagination">
            <span>Page {employeePagination.page} of {employeePagination.pages || 1} ({employeePagination.total} total)</span>
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
        </section>
      )}

      {/* ── SECTION 7: Knowledge Sources (Module 9) ── */}
      {currentSection === 'sources' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Knowledge Sources (Module 9)</h2>
              <p className="brand-subtitle">Connect secure local folders and upload repositories for automated vector sync</p>
            </div>
            <button className="btn-primary" onClick={openCreateKsModal}>
              <span className="material-symbols-outlined">add_to_photos</span>
              + Add Knowledge Source
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Search knowledge sources..."
              value={ksFilter.search}
              onChange={(e) => setKsFilter({ ...ksFilter, search: e.target.value, page: 1 })}
              style={{
                flex: 1,
                padding: '9px 14px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-outline-variant)',
                fontSize: '13.5px',
              }}
            />
          </div>

          <div className="employee-table-wrapper">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Source Name</th>
                  <th>Type</th>
                  <th>Path / Location</th>
                  <th>Status</th>
                  <th>Documents</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {knowledgeSources.length > 0 ? (
                  knowledgeSources.map((src) => (
                    <tr key={src.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{src.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-outline)' }}>{src.description || 'No description'}</div>
                      </td>
                      <td>
                        <span className="perm-chip">{src.type}</span>
                      </td>
                      <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-on-surface-variant)' }}>
                        {src.folderPath || 'Default Storage'}
                      </td>
                      <td>
                        <span className={`status-badge ${src.status === 'active' ? 'status-active' : 'status-inactive'}`}>
                          {src.status?.toUpperCase()}
                        </span>
                      </td>
                      <td>{src.totalDocuments || 0}</td>
                      <td>
                        <div className="action-buttons-group">
                          <button
                            className="btn-action-icon"
                            title="Synchronize now"
                            onClick={() => handleSyncKs(src)}
                            disabled={ksSyncing[src.id]}
                          >
                            {ksSyncing[src.id] ? '⏳' : '🔄'}
                          </button>
                          <button className="btn-action-icon" title="Edit" onClick={() => openEditKsModal(src)}>✏️</button>
                          <button className="btn-action-icon btn-action-delete" title="Delete" onClick={() => handleDeleteKs(src)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '36px', color: 'var(--color-outline)' }}>
                      No knowledge sources registered yet. Add a local folder source above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="table-pagination">
            <span>Page {ksPagination.page} of {ksPagination.pages || 1} ({ksPagination.total} total)</span>
            <div className="pagination-controls">
              <button
                className="btn-secondary btn-sm"
                disabled={ksPagination.page <= 1 || ksLoading}
                onClick={() => setKsFilter({ ...ksFilter, page: ksPagination.page - 1 })}
              >
                ◀ Previous
              </button>
              <button
                className="btn-secondary btn-sm"
                disabled={ksPagination.page >= ksPagination.pages || ksLoading}
                onClick={() => setKsFilter({ ...ksFilter, page: ksPagination.page + 1 })}
              >
                Next ▶
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ── SECTION: Semantic Search (Stitch 6) ── */}
      {currentSection === 'search' && (
        <section className="search-canvas">
          {/* Search Header */}
          <div className="search-page-header">
            <div className="search-header-badge">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>manage_search</span>
              <span>AI-POWERED SEMANTIC SEARCH</span>
            </div>
            <h2 className="search-page-title">Find Knowledge Instantly</h2>
            <p className="search-page-desc">
              Search across all indexed technical manuals, safety protocols, SOPs, and operational documents using AI-powered vector similarity.
            </p>
          </div>

          {/* Semantic Search Bar */}
          <form className="search-bar-container" onSubmit={handleSemanticSearch}>
            <div className="search-bar-inner">
              <span className="material-symbols-outlined search-bar-icon">search</span>
              <input
                className="search-bar-input"
                type="text"
                placeholder="Search for technical manuals, safety protocols, or SOPs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit" className="search-bar-btn" disabled={searchLoading || !searchQuery.trim()}>
                {searchLoading ? 'Searching...' : 'Query AI'}
              </button>
            </div>
            <div className="search-glow-bg"></div>
          </form>

          {/* Scrollable Filter Chips */}
          <div className="search-filter-row">
            <button
              className={`search-filter-chip ${searchDeptFilter ? 'active' : ''}`}
              onClick={() => {
                const depts = departmentsList.map(d => d.name);
                if (depts.length === 0) return;
                const current = searchDeptFilter;
                const idx = depts.indexOf(current);
                setSearchDeptFilter(depts[(idx + 1) % depts.length] || '');
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>domain</span>
              {searchDeptFilter || 'Department'}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>expand_more</span>
            </button>

            <button
              className={`search-filter-chip ${searchFileTypeFilter ? 'active' : ''}`}
              onClick={() => {
                const types = ['PDF', 'DOCX', 'XLSX', 'TXT', 'PPTX'];
                const current = searchFileTypeFilter;
                const idx = types.indexOf(current);
                setSearchFileTypeFilter(types[(idx + 1) % types.length] || '');
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>description</span>
              {searchFileTypeFilter || 'File Type'}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>expand_more</span>
            </button>

            {(searchDeptFilter || searchFileTypeFilter) && (
              <>
                <div className="search-filter-divider"></div>
                <button className="search-filter-clear" onClick={clearSearchFilters}>
                  Clear Filters
                </button>
              </>
            )}
          </div>

          {/* Search Error */}
          {searchError && (
            <div className="feedback-alert feedback-error" style={{ marginBottom: '16px' }}>
              <span className="material-symbols-outlined">error</span>
              <span>{searchError}</span>
            </div>
          )}

          {/* Results Header */}
          {searchResults.length > 0 && (
            <div className="search-results-header">
              <h3 className="search-results-title">Top Intelligence Matches</h3>
              <span className="search-results-count">{searchResultCount} results found</span>
            </div>
          )}

          {/* Loading State */}
          {searchLoading && (
            <div className="search-loading">
              <div className="search-loading-spinner"></div>
              <span>Querying AI knowledge base...</span>
            </div>
          )}

          {/* Search Results */}
          <div className="search-results-list">
            {searchResults.map((result, idx) => {
              const fileInfo = getFileIcon(result.fileType);
              const scorePercent = Math.round((result.score || 0) * 100);
              return (
                <article key={result.id} className="search-result-card">
                  <div className="search-result-top">
                    <div className="search-result-meta">
                      <div className={`search-result-icon ${fileInfo.bgClass}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>{fileInfo.icon}</span>
                      </div>
                      <div>
                        <h4 className="search-result-filename">{result.title}</h4>
                        <div className="search-result-info">
                          <span>{result.department}</span>
                          <span className="search-result-dot"></span>
                          <span>{result.updatedAt ? new Date(result.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'Recently indexed'}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`search-score-badge ${getScoreBadgeClass(result.score)}`}>
                      {scorePercent}% Match
                    </div>
                  </div>

                  {/* Snippet */}
                  {result.snippet && (
                    <div className="search-snippet-box">
                      <p className="search-snippet-text">
                        "{result.snippet.length > 300 ? result.snippet.substring(0, 300) + '...' : result.snippet}"
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="search-result-actions">
                    <button className="btn-primary btn-sm" onClick={() => {
                      setCurrentSection('chat');
                      setChatInput(`Tell me more about: ${result.title}`);
                    }}>
                      Ask AI About This
                    </button>
                    <button className="btn-secondary btn-sm" onClick={() => setCurrentSection('library')}>
                      View in Library
                    </button>
                    <button className="search-action-icon" title="Bookmark">
                      <span className="material-symbols-outlined">bookmark</span>
                    </button>
                  </div>
                </article>
              );
            })}

            {/* AI Synthesized Insight Card */}
            {searchInsight && (
              <div className="search-insight-card">
                <div className="search-insight-inner">
                  <div className="search-insight-header">
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                    <span className="search-insight-label">AI SYNTHESIZED INSIGHT</span>
                  </div>
                  <p className="search-insight-text">{searchInsight.text}</p>
                  <div className="search-insight-sources">
                    {searchInsight.sources.map((src, i) => (
                      <span key={i} className="search-insight-source-chip">Source: {src}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Empty State */}
          {!searchLoading && searchResults.length === 0 && searchQuery.trim() === '' && (
            <div className="search-empty-state">
              <span className="material-symbols-outlined" style={{ fontSize: '64px', color: 'var(--color-primary-fixed-dim)' }}>search_insights</span>
              <h3 style={{ fontSize: '20px', fontWeight: 700, marginTop: '16px' }}>Semantic Knowledge Search</h3>
              <p style={{ color: 'var(--color-outline)', maxWidth: '480px', margin: '8px auto 0' }}>
                Enter a natural language query above to search across all indexed documents using AI-powered vector similarity matching.
              </p>
              <div className="search-suggested-queries">
                <span style={{ fontSize: '12px', color: 'var(--color-outline)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Try searching for:</span>
                <div className="search-suggested-chips">
                  {['Turbine maintenance procedures', 'Safety protocols for high voltage', 'Quality control checklists', 'Emergency shutdown SOP'].map((q) => (
                    <button
                      key={q}
                      className="search-suggested-chip"
                      onClick={() => { setSearchQuery(q); }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Results State */}
          {!searchLoading && searchResults.length === 0 && searchQuery.trim() !== '' && !searchError && (
            <div className="search-empty-state">
              <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--color-outline)' }}>search_off</span>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginTop: '12px' }}>No matches found</h3>
              <p style={{ color: 'var(--color-outline)', maxWidth: '400px', margin: '8px auto 0' }}>
                Try rephrasing your query or adjusting filters. Ensure documents have been indexed in the Knowledge Library.
              </p>
            </div>
          )}
        </section>
      )}

      {/* ── SECTION 8: System Settings & Security (Stitch 7) ── */}
      {currentSection === 'settings' && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">System Settings &amp; Security Governance</h2>
              <p className="brand-subtitle">
                Tenant: <strong>{userSession?.company?.name || 'Industrial Intelligence Tenant'}</strong>
              </p>
            </div>
          </div>

          {/* User Profile Card (Stitch 7 Component) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '20px', background: 'var(--color-surface-container-low)', borderRadius: 'var(--radius-lg)', marginBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #004ac6, #2563eb)', color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 700 }}>
              {userSession?.name ? userSession.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700 }}>{userSession?.name || 'Administrator'}</h3>
              <p style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px' }}>{userSession?.email || 'admin@company.com'}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#004ac6', background: 'var(--color-primary-fixed)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  ADMIN ACCESS
                </span>
                <span style={{ fontSize: '10px', fontWeight: 700, color: '#005a82', background: 'var(--color-tertiary-fixed)', padding: '2px 8px', borderRadius: 'var(--radius-full)' }}>
                  GOVERNANCE UNIT
                </span>
              </div>
            </div>
          </div>

          {/* Org Sub-Tabs */}
          <div className="org-subtabs">
            <button className={`org-subtab-btn ${orgTab === 'departments' ? 'active' : ''}`} onClick={() => setOrgTab('departments')}>
              🏢 Departments
            </button>
            <button className={`org-subtab-btn ${orgTab === 'roles' ? 'active' : ''}`} onClick={() => setOrgTab('roles')}>
              🔑 Roles &amp; Permissions
            </button>
            <button className={`org-subtab-btn ${orgTab === 'audit' ? 'active' : ''}`} onClick={() => { setOrgTab('audit'); fetchAuditLogsList(); }}>
              📋 Security Audit Trail
            </button>
          </div>

          {/* Departments */}
          {orgTab === 'departments' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-outline)', margin: 0 }}>
                  Manage company operational units. Documents and staff can be scoped to specific departments.
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
                      departmentsList.map((d) => (
                        <tr key={d.id || d._id}>
                          <td style={{ fontWeight: 600 }}>{d.name}</td>
                          <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px' }}>{d.description || '—'}</td>
                          <td style={{ fontSize: '12px', color: 'var(--color-outline)' }}>
                            {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <div className="action-buttons-group">
                              <button className="btn-action-icon" onClick={() => openEditDeptModal(d)}>✏️</button>
                              <button className="btn-action-icon btn-action-delete" onClick={() => handleDeleteDept(d)}>🗑️</button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-outline)' }}>No departments configured.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Roles */}
          {orgTab === 'roles' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-outline)', margin: 0 }}>
                  Roles dictate platform capabilities and document access classification permissions.
                </p>
                <button className="btn-primary btn-sm" onClick={() => { setRoleForm({ name: '', description: '', permissionIds: [] }); setRoleModalOpen(true); }}>
                  + Create Role
                </button>
              </div>
              <div className="employee-table-wrapper">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Role Name</th>
                      <th>Description</th>
                      <th>Permissions</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rolesList.length > 0 ? (
                      rolesList.map((r) => (
                        <tr key={r.id || r._id}>
                          <td style={{ fontWeight: 600 }}>{r.name}</td>
                          <td style={{ color: 'var(--color-on-surface-variant)', fontSize: '13px' }}>{r.description || '—'}</td>
                          <td>
                            <div className="permission-chips" style={{ flexWrap: 'wrap', maxWidth: '380px' }}>
                              {r.permissions && r.permissions.length > 0 ? (
                                r.permissions.slice(0, 5).map((p, pIdx) => (
                                  <span key={pIdx} className="perm-chip" style={{ fontSize: '10px' }}>
                                    {typeof p === 'object' ? (p.code || p.name) : p}
                                  </span>
                                ))
                              ) : <span style={{ color: 'var(--color-outline)', fontSize: '11px' }}>Standard</span>}
                              {r.permissions && r.permissions.length > 5 && (
                                <span className="perm-chip" style={{ fontSize: '10px', background: 'var(--color-primary-fixed)' }}>+{r.permissions.length - 5}</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`status-badge ${r.isSystem ? 'status-active' : 'status-inactive'}`}>
                              {r.isSystem ? 'System' : 'Custom'}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="4" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-outline)' }}>No roles found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Audit Logs */}
          {orgTab === 'audit' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-outline)', margin: 0 }}>
                  Immutable security audit trail capturing administrative modifications, ingestion runs, and logins.
                </p>
                <button className="btn-secondary btn-sm" onClick={() => fetchAuditLogsList(auditPagination.page)}>
                  <span className="material-symbols-outlined">refresh</span> Refresh
                </button>
              </div>
              <div className="employee-table-wrapper">
                <table className="employee-table">
                  <thead>
                    <tr>
                      <th>Action</th>
                      <th>Resource</th>
                      <th>Actor</th>
                      <th>IP Address</th>
                      <th>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogsList.length > 0 ? (
                      auditLogsList.map((log) => (
                        <tr key={log.id || log._id}>
                          <td>
                            <span className="status-badge status-healthy" style={{ fontSize: '10px' }}>
                              {log.action || log.eventType || 'ACCESS'}
                            </span>
                          </td>
                          <td style={{ fontSize: '13px' }}>{log.resource || log.targetType || 'System'}</td>
                          <td style={{ fontSize: '13px' }}>{log.user?.name || log.userName || log.userId || 'Admin'}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--color-outline)' }}>{log.ipAddress || '127.0.0.1'}</td>
                          <td style={{ fontSize: '12px', color: 'var(--color-outline)' }}>
                            {log.createdAt ? new Date(log.createdAt).toLocaleString() : 'Recent'}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr><td colSpan="5" style={{ textAlign: 'center', padding: '24px', color: 'var(--color-outline)' }}>No audit events logged yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Stitch Login / Auth Modal (Stitch 2) ── */}
      {authModalOpen && (
        <div className="modal-overlay" onClick={() => setAuthModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{activeTab === 'login' ? 'Sign In to Industrial Intelligence' : 'Register New Company Workspace'}</h3>
              <button className="modal-close-btn" onClick={() => setAuthModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Tab Switcher */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', background: 'var(--color-surface-container-low)', padding: '4px', borderRadius: 'var(--radius-md)' }}>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    background: activeTab === 'login' ? '#ffffff' : 'transparent',
                    color: activeTab === 'login' ? 'var(--color-primary)' : 'var(--color-outline)',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'login' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                  onClick={() => { setActiveTab('login'); setAuthFeedback(null); }}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    background: activeTab === 'register' ? '#ffffff' : 'transparent',
                    color: activeTab === 'register' ? 'var(--color-primary)' : 'var(--color-outline)',
                    cursor: 'pointer',
                    boxShadow: activeTab === 'register' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  }}
                  onClick={() => { setActiveTab('register'); setAuthFeedback(null); }}
                >
                  Register Workspace
                </button>
              </div>

              {authFeedback && (
                <div className={`feedback-alert feedback-${authFeedback.type}`}>
                  <span>{authFeedback.message}</span>
                </div>
              )}

              {activeTab === 'login' ? (
                <form onSubmit={handleLogin} className="form-stack">
                  <div className="form-group">
                    <label>Company Tenant Slug (Optional for Global)</label>
                    <input
                      type="text"
                      placeholder="e.g. acme-corp"
                      value={loginForm.companySlug}
                      onChange={(e) => setLoginForm({ ...loginForm, companySlug: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      required
                      placeholder="email@company.com"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        style={{ width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-outline)' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {showPassword ? 'visibility_off' : 'visibility'}
                        </span>
                      </button>
                    </div>
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={authLoading}>
                    {authLoading ? 'Signing In...' : 'Sign In ➔'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="form-stack">
                  <div className="form-group">
                    <label>Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Industrial Corp"
                      value={registerForm.companyName}
                      onChange={(e) => setRegisterForm({ ...registerForm, companyName: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label>Tenant Slug</label>
                      <input
                        type="text"
                        required
                        placeholder="acme-corp"
                        value={registerForm.companySlug}
                        onChange={(e) => setRegisterForm({ ...registerForm, companySlug: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label>Company Code</label>
                      <input
                        type="text"
                        required
                        placeholder="ACME"
                        value={registerForm.companyCode}
                        onChange={(e) => setRegisterForm({ ...registerForm, companyCode: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Admin Full Name</label>
                    <input
                      type="text"
                      required
                      placeholder="Alice Johnson"
                      value={registerForm.adminName}
                      onChange={(e) => setRegisterForm({ ...registerForm, adminName: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Admin Email</label>
                    <input
                      type="email"
                      required
                      placeholder="admin@acme.com"
                      value={registerForm.adminEmail}
                      onChange={(e) => setRegisterForm({ ...registerForm, adminEmail: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Admin Password</label>
                    <input
                      type="password"
                      required
                      placeholder="Password123!"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                    />
                  </div>
                  <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '12px' }} disabled={authLoading}>
                    {authLoading ? 'Provisioning...' : 'Register Workspace ➔'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Knowledge Source Modal ── */}
      {ksModalOpen && (
        <div className="modal-overlay" onClick={() => setKsModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingSource ? `Edit Source: ${editingSource.name}` : 'Add Knowledge Source'}</h3>
              <button className="modal-close-btn" onClick={() => setKsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveKs}>
              <div className="modal-body form-stack">
                <div className="form-group">
                  <label>Source Name</label>
                  <input type="text" required placeholder="e.g. Plant Engineering Manuals" value={ksForm.name} onChange={(e) => setKsForm({ ...ksForm, name: e.target.value })} />
                </div>
                {!editingSource && (
                  <div className="form-group">
                    <label>Source Type</label>
                    <select value={ksForm.type} onChange={(e) => setKsForm({ ...ksForm, type: e.target.value })}>
                      <option value="local_folder">📁 Local Folder (Approved Directory)</option>
                      <option value="uploaded_file">📄 Uploaded File Storage</option>
                    </select>
                  </div>
                )}
                {(ksForm.type === 'local_folder' || editingSource?.type === 'local_folder') && (
                  <div className="form-group">
                    <label>Folder Path</label>
                    <input type="text" placeholder="e.g. C:\Plant\Documents" value={ksForm.folderPath} onChange={(e) => setKsForm({ ...ksForm, folderPath: e.target.value })} required={!editingSource} />
                    <div style={{ fontSize: '11px', color: '#d97706', marginTop: '4px' }}>
                      ⚠️ The system will only scan files within this explicitly specified directory.
                    </div>
                  </div>
                )}
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <input type="text" placeholder="Brief description of this source" value={ksForm.description} onChange={(e) => setKsForm({ ...ksForm, description: e.target.value })} />
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

      {/* ── Employee Modal ── */}
      {employeeModalOpen && (
        <div className="modal-overlay" onClick={() => setEmployeeModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingEmployee ? `Edit ${editingEmployee.name}` : 'Provision New Employee'}</h3>
              <button className="modal-close-btn" onClick={() => setEmployeeModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveEmployee}>
              <div className="modal-body form-stack">
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" required placeholder="John Doe" value={employeeForm.name} onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input type="email" required placeholder="john.doe@company.com" value={employeeForm.email} onChange={(e) => setEmployeeForm({ ...employeeForm, email: e.target.value })} />
                </div>
                {!editingEmployee && (
                  <div className="form-group">
                    <label>Initial Temporary Password</label>
                    <input type="password" required value={employeeForm.password} onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label>Employee ID</label>
                  <input type="text" required placeholder="EMP-101" value={employeeForm.employeeId} onChange={(e) => setEmployeeForm({ ...employeeForm, employeeId: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select value={employeeForm.departmentId} onChange={(e) => setEmployeeForm({ ...employeeForm, departmentId: e.target.value })}>
                    <option value="">No Department</option>
                    {departmentsList.map((d) => (
                      <option key={d.id || d._id} value={d.id || d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Status</label>
                  <select value={employeeForm.status} onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setEmployeeModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary">{editingEmployee ? 'Save Changes' : 'Provision Employee'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Department Modal ── */}
      {deptModalOpen && (
        <div className="modal-overlay" onClick={() => setDeptModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingDept ? `Edit Department: ${editingDept.name}` : 'Create New Department'}</h3>
              <button className="modal-close-btn" onClick={() => setDeptModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveDept}>
              <div className="modal-body form-stack">
                <div className="form-group">
                  <label>Department Name</label>
                  <input type="text" required placeholder="e.g. Operations, Maintenance" value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" placeholder="Brief description" value={deptForm.description} onChange={(e) => setDeptForm({ ...deptForm, description: e.target.value })} />
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

      {/* ── Role Modal ── */}
      {roleModalOpen && (
        <div className="modal-overlay" onClick={() => setRoleModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Custom Role</h3>
              <button className="modal-close-btn" onClick={() => setRoleModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRole}>
              <div className="modal-body form-stack">
                <div className="form-group">
                  <label>Role Name</label>
                  <input type="text" required placeholder="e.g. Plant Lead, Compliance Auditor" value={roleForm.name} onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <input type="text" placeholder="Purpose of this role" value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Assign Permissions ({roleForm.permissionIds.length} selected)</label>
                  <div className="permission-selector-grid">
                    {permissionsList.map((p) => (
                      <label key={p.id || p._id} className="permission-checkbox-label">
                        <input
                          type="checkbox"
                          checked={roleForm.permissionIds.includes(p.id || p._id)}
                          onChange={() => toggleRolePermission(p.id || p._id)}
                        />
                        <span>{p.code || p.name}</span>
                      </label>
                    ))}
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

      {/* ── Close Main Page Content ── */}
      </main>

      {/* ── Footer ── */}
      <footer className="dashboard-footer">
        <span>Stitch AI Industrial Knowledge Intelligence — Enterprise Release</span>
        <span>Environment: <strong>Production Ready (v2.4)</strong></span>
      </footer>
    </div>
  </div>
);
}

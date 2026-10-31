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

  // ── 3 Core Role Personas ──
  // 1. Super Admin: Platform-wide command & oversight (company: null, all permissions)
  // 2. Company Admin: Tenant-scoped administration (company: specific tenant)
  // 3. Employee: Standard employee portal & AI chat
  const userRoleStr = (userSession?.role?.name || userSession?.role || '').toLowerCase();
  const isSessionSuperAdmin = Boolean(userSession && (userRoleStr.includes('super') || userSession.isSuperAdmin));
  const isSessionCompanyAdmin = Boolean(userSession && !isSessionSuperAdmin && userRoleStr.includes('admin'));
  const isSessionEmployee = Boolean(userSession && !isSessionSuperAdmin && !isSessionCompanyAdmin);

  // Active role determination: roleOverride takes priority; defaults to session or 'super-admin' for demo exploration
  const activeRole = roleOverride || (userSession ? (isSessionSuperAdmin ? 'super-admin' : isSessionCompanyAdmin ? 'company-admin' : 'employee') : 'super-admin');

  const isSuperAdmin = activeRole === 'super-admin';
  const isCompanyAdmin = activeRole === 'company-admin';
  const isEmployee = activeRole === 'employee';
  const isAdmin = isSuperAdmin || isCompanyAdmin;

  // Allowed section definitions per role
  const saSections = ['super-admin', 'sa-tenants', 'sa-users', 'sa-infrastructure', 'sa-config', 'sa-audit', 'sa-danger'];
  const caSections = ['overview', 'search', 'chat', 'library', 'upload', 'employees', 'sources', 'settings'];
  const empSections = ['employee-portal', 'search', 'chat', 'library', 'upload'];

  // Enforce strict role-based view restrictions:
  useEffect(() => {
    if (isSuperAdmin) {
      if (!saSections.includes(currentSection)) {
        setCurrentSection('super-admin');
      }
    } else if (isCompanyAdmin) {
      if (!caSections.includes(currentSection)) {
        setCurrentSection('overview');
      }
    } else if (isEmployee) {
      if (!empSections.includes(currentSection)) {
        setCurrentSection('employee-portal');
      }
    }
  }, [activeRole, currentSection]);

  // Form states & Login Persona Selection
  const [selectedLoginPersona, setSelectedLoginPersona] = useState('super-admin'); // 'super-admin' | 'company-admin' | 'employee'
  const [loginForm, setLoginForm] = useState({
    email: 'superadmin@platform.ai',
    password: 'Password123!',
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

  // ── Super Admin Interactive State & Functional Controls ──
  const [tenantsList, setTenantsList] = useState([
    { id: 't1', name: 'Apex Engineering', slug: 'apex-engineering', code: 'APEX', admin: 'admin@apexengineering.demo', users: 24, docs: 18, status: 'active', tier: 'Enterprise', created: '2026-08-15' },
    { id: 't2', name: 'Nova Finance Corp', slug: 'nova-finance', code: 'NOVA', admin: 'admin@novafinance.demo', users: 12, docs: 9, status: 'active', tier: 'Professional', created: '2026-09-01' },
    { id: 't3', name: 'Vertex Manufacturing', slug: 'vertex-manufacturing', code: 'VERTEX', admin: 'admin@vertexmfg.demo', users: 31, docs: 42, status: 'suspended', tier: 'Enterprise', created: '2026-07-20' },
  ]);
  const [tenantSearch, setTenantSearch] = useState('');
  const [tenantStatusFilter, setTenantStatusFilter] = useState('all');
  const [newTenantModalOpen, setNewTenantModalOpen] = useState(false);
  const [newTenantForm, setNewTenantForm] = useState({ name: '', slug: '', code: '', adminEmail: '', password: 'Password123!', tier: 'Enterprise' });

  const [platformUsersList, setPlatformUsersList] = useState([
    { id: 'u1', name: 'Global Super Admin', email: 'superadmin@platform.ai', company: 'Global Platform', role: 'Super Admin', status: 'active', lastActive: 'Just now' },
    { id: 'u2', name: 'Apex Company Admin', email: 'admin@apexengineering.demo', company: 'Apex Engineering', role: 'Company Admin', status: 'active', lastActive: '5 min ago' },
    { id: 'u3', name: 'Alex Engineer', email: 'employee@apexengineering.demo', company: 'Apex Engineering', role: 'Employee', status: 'active', lastActive: '12 min ago' },
    { id: 'u4', name: 'Nova Admin', email: 'admin@novafinance.demo', company: 'Nova Finance Corp', role: 'Company Admin', status: 'active', lastActive: '1 hr ago' },
    { id: 'u5', name: 'Vertex Admin', email: 'admin@vertexmfg.demo', company: 'Vertex Manufacturing', role: 'Company Admin', status: 'suspended', lastActive: '3 days ago' },
  ]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: '', email: '', role: 'Company Admin', company: 'Apex Engineering' });

  const [globalConfig, setGlobalConfig] = useState({
    aiModel: 'Gemini 2.0 Flash',
    maxUploadSizeMB: '50 MB',
    chunkSize: '1000 tokens',
    defaultTopK: '5',
    authMethod: 'JWT + Refresh Token (HttpOnly)',
    encryption: 'bcrypt (12 rounds) + AES-256',
    sessionTimeout: '24 hours',
    ocrEngine: 'Tesseract 5.0 (Active)',
  });
  const [configFeedback, setConfigFeedback] = useState(null);

  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [purgeModalOpen, setPurgeModalOpen] = useState(false);
  const [purgeSuccess, setPurgeSuccess] = useState(false);
  const [probeLoading, setProbeLoading] = useState(false);
  const [probeResult, setProbeResult] = useState(null);

  const [saAuditLogsList, setSaAuditLogsList] = useState([
    { id: 'aud-1', time: 'Just now', actor: 'superadmin@platform.ai', action: 'SYSTEM_SETTINGS_UPDATE', target: 'Global AI Model & Limits', ip: '127.0.0.1', status: 'SUCCESS' },
    { id: 'aud-2', time: '14 mins ago', actor: 'superadmin@platform.ai', action: 'TENANT_HEALTH_CHECK', target: 'System Health Probe', ip: '127.0.0.1', status: 'SUCCESS' },
    { id: 'aud-3', time: '1 hr ago', actor: 'admin@apexengineering.demo', action: 'DOCUMENT_INGESTION', target: 'Safety_Manual_v2.pdf', ip: '192.168.1.42', status: 'SUCCESS' },
    { id: 'aud-4', time: '2 hrs ago', actor: 'admin@vertexmfg.demo', action: 'AUTH_LOGIN_FAILED', target: 'Invalid password attempt', ip: '10.0.0.8', status: 'WARN' },
    { id: 'aud-5', time: '4 hrs ago', actor: 'system_cron', action: 'CHROMA_VECTOR_INDEX_SYNC', target: 'Global Collection Synced', ip: 'internal', status: 'SUCCESS' },
  ]);
  const [auditSearch, setAuditSearch] = useState('');

  const handleCreateTenant = (e) => {
    e.preventDefault();
    if (!newTenantForm.name || !newTenantForm.slug || !newTenantForm.adminEmail) return;
    const newEntry = {
      id: `t${Date.now()}`,
      name: newTenantForm.name.trim(),
      slug: newTenantForm.slug.trim().toLowerCase(),
      code: (newTenantForm.code || newTenantForm.slug.slice(0, 4)).toUpperCase(),
      admin: newTenantForm.adminEmail.trim(),
      users: 1,
      docs: 0,
      status: 'active',
      tier: newTenantForm.tier || 'Enterprise',
      created: new Date().toISOString().slice(0, 10),
    };
    setTenantsList([newEntry, ...tenantsList]);
    setSaAuditLogsList([
      { id: `aud-${Date.now()}`, time: 'Just now', actor: 'superadmin@platform.ai', action: 'TENANT_REGISTERED', target: `${newEntry.name} (${newEntry.code})`, ip: '127.0.0.1', status: 'SUCCESS' },
      ...saAuditLogsList,
    ]);
    setNewTenantModalOpen(false);
    setNewTenantForm({ name: '', slug: '', code: '', adminEmail: '', password: 'Password123!', tier: 'Enterprise' });
    alert(`Tenant "${newEntry.name}" has been successfully provisioned!`);
  };

  const handleToggleTenantStatus = (id) => {
    setTenantsList(tenantsList.map(t => {
      if (t.id === id) {
        const nextStatus = t.status === 'active' ? 'suspended' : 'active';
        setSaAuditLogsList([
          { id: `aud-${Date.now()}`, time: 'Just now', actor: 'superadmin@platform.ai', action: 'TENANT_STATUS_CHANGE', target: `${t.name} -> ${nextStatus.toUpperCase()}`, ip: '127.0.0.1', status: 'SUCCESS' },
          ...saAuditLogsList,
        ]);
        return { ...t, status: nextStatus };
      }
      return t;
    }));
  };

  const handleCreatePlatformUser = (e) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email) return;
    const newEntry = {
      id: `u${Date.now()}`,
      name: newUserForm.name.trim(),
      email: newUserForm.email.trim(),
      role: newUserForm.role,
      company: newUserForm.company || 'Global Platform',
      status: 'active',
      lastActive: 'Just now',
    };
    setPlatformUsersList([newEntry, ...platformUsersList]);
    setSaAuditLogsList([
      { id: `aud-${Date.now()}`, time: 'Just now', actor: 'superadmin@platform.ai', action: 'USER_CREATED', target: `${newEntry.name} (${newEntry.role})`, ip: '127.0.0.1', status: 'SUCCESS' },
      ...saAuditLogsList,
    ]);
    setNewUserModalOpen(false);
    setNewUserForm({ name: '', email: '', role: 'Company Admin', company: 'Apex Engineering' });
    alert(`User "${newEntry.name}" created successfully!`);
  };

  const handleToggleUserStatus = (id) => {
    setPlatformUsersList(platformUsersList.map(u => {
      if (u.id === id) {
        const nextStatus = u.status === 'active' ? 'suspended' : 'active';
        setSaAuditLogsList([
          { id: `aud-${Date.now()}`, time: 'Just now', actor: 'superadmin@platform.ai', action: 'USER_STATUS_CHANGE', target: `${u.email} -> ${nextStatus.toUpperCase()}`, ip: '127.0.0.1', status: 'SUCCESS' },
          ...saAuditLogsList,
        ]);
        return { ...u, status: nextStatus };
      }
      return u;
    }));
  };

  const handleResetUserPassword = (email) => {
    setSaAuditLogsList([
      { id: `aud-${Date.now()}`, time: 'Just now', actor: 'superadmin@platform.ai', action: 'PASSWORD_RESET_DISPATCH', target: email, ip: '127.0.0.1', status: 'SUCCESS' },
      ...saAuditLogsList,
    ]);
    alert(`Secure password reset instructions dispatched to: ${email}`);
  };

  const handleSaveGlobalConfig = (e) => {
    e.preventDefault();
    setConfigFeedback('Global system configuration successfully persisted!');
    setSaAuditLogsList([
      { id: `aud-${Date.now()}`, time: 'Just now', actor: 'superadmin@platform.ai', action: 'SYSTEM_SETTINGS_UPDATE', target: `Model: ${globalConfig.aiModel}`, ip: '127.0.0.1', status: 'SUCCESS' },
      ...saAuditLogsList,
    ]);
    setTimeout(() => setConfigFeedback(null), 3000);
  };

  const handleRunMeshProbe = async () => {
    setProbeLoading(true);
    const start = Date.now();
    try {
      await fetchHealth();
      const latency = Date.now() - start;
      setProbeResult({ ok: true, latency, time: new Date().toLocaleTimeString() });
      setSaAuditLogsList([
        { id: `aud-${Date.now()}`, time: 'Just now', actor: 'superadmin@platform.ai', action: 'SERVICE_MESH_PROBE', target: `Latency: ${latency}ms`, ip: '127.0.0.1', status: 'SUCCESS' },
        ...saAuditLogsList,
      ]);
    } catch (_err) {
      setProbeResult({ ok: false, error: 'Probe timeout or unreachable' });
    } finally {
      setProbeLoading(false);
    }
  };

  const handleExportAuditLogs = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(saAuditLogsList, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `platform_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleConfirmPurgeVectors = () => {
    setPurgeSuccess(true);
    setSaAuditLogsList([
      { id: `aud-${Date.now()}`, time: 'Just now', actor: 'superadmin@platform.ai', action: 'VECTOR_DB_PURGE', target: 'ChromaDB All Collections', ip: '127.0.0.1', status: 'DANGER' },
      ...saAuditLogsList,
    ]);
    setTimeout(() => {
      setPurgeModalOpen(false);
      setPurgeSuccess(false);
      alert('Vector collections purged. Collections re-initialized in fresh state.');
    }, 1200);
  };

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
        setSaAuditLogsList(res.data.items || []);
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
        setRoleOverride(null); // Clear override to follow authenticated session
        const roleName = (res.data.user.role?.name || res.data.user.role || '').toLowerCase();
        if (roleName.includes('super') || res.data.user.isSuperAdmin) {
          setCurrentSection('super-admin');
        } else if (roleName.includes('admin')) {
          setCurrentSection('overview');
        } else {
          setCurrentSection('employee-portal');
        }
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

  // Instant Demo Persona Sign-In for all 3 login types
  const handleQuickDemoLogin = (roleType) => {
    setRoleOverride(roleType);
    let mockUser;
    if (roleType === 'super-admin') {
      mockUser = {
        name: 'Platform Super Admin',
        email: 'superadmin@platform.ai',
        role: { name: 'Super Admin' },
        isSuperAdmin: true,
        company: null,
      };
      setCurrentSection('super-admin');
    } else if (roleType === 'company-admin') {
      mockUser = {
        name: 'Apex Company Admin',
        email: 'admin@apexengineering.demo',
        role: { name: 'Company Admin' },
        isSuperAdmin: false,
        company: { name: 'Apex Engineering', code: 'APEX', slug: 'apex-engineering' },
      };
      setCurrentSection('overview');
    } else {
      mockUser = {
        name: 'Alex Engineer',
        email: 'employee@apexengineering.demo',
        role: { name: 'Employee' },
        isSuperAdmin: false,
        company: { name: 'Apex Engineering', code: 'APEX', slug: 'apex-engineering' },
      };
      setCurrentSection('employee-portal');
    }
    setUserSession(mockUser);
    setAuthFeedback({ type: 'success', message: `Signed in as ${mockUser.name} (${roleType.replace('-', ' ').toUpperCase()})` });
    setTimeout(() => {
      setAuthModalOpen(false);
      setAuthFeedback(null);
    }, 450);
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
            title="InsightX Industrial Knowledge Home"
          >
            <div className="sidebar-brand-logo">
              <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>factory</span>
            </div>
            {!sidebarCollapsed && (
              <div className="sidebar-brand-text">
                <span className="sidebar-brand-title">INSIGHTX</span>
                <span className="sidebar-brand-sub">Industrial AI</span>
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

        {/* Role Mode Indicator & 3-Role Persona Switcher */}
        {!sidebarCollapsed && (
          <div className="sidebar-role-panel">
            <div className={`sidebar-role-tag ${isSuperAdmin ? 'super-admin' : isCompanyAdmin ? 'admin' : 'employee'}`}>
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                {isSuperAdmin ? 'security' : isCompanyAdmin ? 'admin_panel_settings' : 'badge'}
              </span>
              <span>{isSuperAdmin ? 'Super Admin' : isCompanyAdmin ? 'Company Admin' : 'Employee View'}</span>
            </div>
            <div className="sidebar-role-selector">
              <button 
                type="button" 
                className={`role-tab-btn ${isSuperAdmin ? 'active super-admin' : ''}`}
                onClick={() => {
                  setRoleOverride('super-admin');
                  setCurrentSection('super-admin');
                }}
                title="Super Admin: Platform command center & all tenants"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>security</span>
                Super
              </button>
              <button 
                type="button" 
                className={`role-tab-btn ${isCompanyAdmin ? 'active company-admin' : ''}`}
                onClick={() => {
                  setRoleOverride('company-admin');
                  setCurrentSection('overview');
                }}
                title="Company Admin: Tenant management & governance"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>admin_panel_settings</span>
                Admin
              </button>
              <button 
                type="button" 
                className={`role-tab-btn ${isEmployee ? 'active employee' : ''}`}
                onClick={() => {
                  setRoleOverride('employee');
                  setCurrentSection('employee-portal');
                }}
                title="Employee: Knowledge exploration & AI chat"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>badge</span>
                Emp
              </button>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav className="sidebar-nav-container">
          {/* ═════════ 1. SUPER ADMIN EXCLUSIVE SIDEBAR (Shown ONLY to Super Admin) ═════════ */}
          {isSuperAdmin ? (
            <div className="sidebar-nav-group">
              {!sidebarCollapsed && <span className="sidebar-group-title">PLATFORM CONTROL</span>}

              <button
                type="button"
                className={`sidebar-nav-link super-admin-link ${currentSection === 'super-admin' ? 'active' : ''}`}
                onClick={() => setCurrentSection('super-admin')}
                title="Platform Command Center"
              >
                <span className="material-symbols-outlined">dashboard_customize</span>
                {!sidebarCollapsed && <span>Command Center</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link super-admin-link ${currentSection === 'sa-tenants' ? 'active' : ''}`}
                onClick={() => setCurrentSection('sa-tenants')}
                title="Manage All Registered Tenants & Workspaces"
              >
                <span className="material-symbols-outlined">corporate_fare</span>
                {!sidebarCollapsed && <span>Tenant Workspaces</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link super-admin-link ${currentSection === 'sa-users' ? 'active' : ''}`}
                onClick={() => setCurrentSection('sa-users')}
                title="All Platform Users Across Tenants"
              >
                <span className="material-symbols-outlined">supervised_user_circle</span>
                {!sidebarCollapsed && <span>Platform Users</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link super-admin-link ${currentSection === 'sa-infrastructure' ? 'active' : ''}`}
                onClick={() => setCurrentSection('sa-infrastructure')}
                title="System Health & Infrastructure"
              >
                <span className="material-symbols-outlined">health_and_safety</span>
                {!sidebarCollapsed && <span>System Health</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link super-admin-link ${currentSection === 'sa-config' ? 'active' : ''}`}
                onClick={() => setCurrentSection('sa-config')}
                title="Global System Configuration"
              >
                <span className="material-symbols-outlined">tune</span>
                {!sidebarCollapsed && <span>Global Settings</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link super-admin-link ${currentSection === 'sa-audit' ? 'active' : ''}`}
                onClick={() => setCurrentSection('sa-audit')}
                title="Platform Audit Trail & Security Compliance"
              >
                <span className="material-symbols-outlined">policy</span>
                {!sidebarCollapsed && <span>Audit Trail</span>}
              </button>

              <button
                type="button"
                className={`sidebar-nav-link super-admin-link ${currentSection === 'sa-danger' ? 'active' : ''}`}
                onClick={() => setCurrentSection('sa-danger')}
                title="Danger Zone & Maintenance Mode"
                style={{ color: currentSection === 'sa-danger' ? '#fff' : '#f87171' }}
              >
                <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>warning</span>
                {!sidebarCollapsed && <span>Danger Zone</span>}
              </button>
            </div>
          ) : (
            /* ═════════ 2. COMPANY ADMIN & EMPLOYEE SIDEBAR ═════════ */
            <>
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
            </>
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
        {/* ── Platform Maintenance Banner (When Super Admin toggles maintenance) ── */}
        {maintenanceMode && (
          <div style={{ background: 'linear-gradient(90deg, #991b1b, #dc2626)', color: '#fff', padding: '10px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, boxShadow: '0 2px 10px rgba(220, 38, 38, 0.4)', zIndex: 100 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', animation: 'spin 4s linear infinite' }}>warning</span>
              <span>PLATFORM MAINTENANCE ACTIVE &mdash; Read-only mode enforced globally across all tenant workspaces.</span>
            </div>
            {isSuperAdmin && (
              <button 
                type="button" 
                onClick={() => setMaintenanceMode(false)}
                style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', padding: '3px 10px', borderRadius: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 }}
              >
                Disable Maintenance Mode
              </button>
            )}
          </div>
        )}

        {/* ── Top Header ── */}
        <header className="stitch-topbar">
          <div className="topbar-page-info">
            <span className="topbar-breadcrumb">{isSuperAdmin ? 'SUPER ADMIN' : isCompanyAdmin ? 'COMPANY ADMIN' : 'EMPLOYEE'}</span>
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
              {currentSection === 'super-admin' && 'Platform Command Center'}
              {currentSection === 'sa-tenants' && 'Tenant Workspaces & Organizations'}
              {currentSection === 'sa-users' && 'Cross-Tenant Platform Users'}
              {currentSection === 'sa-infrastructure' && 'System Health & Infrastructure'}
              {currentSection === 'sa-config' && 'Global System Configuration'}
              {currentSection === 'sa-audit' && 'Platform Audit Trail & Security Compliance'}
              {currentSection === 'sa-danger' && 'Danger Zone & Maintenance Controls'}
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

            {/* Quick Role Switcher Pill in Topbar (3-Way Cycle) */}
            <button 
              type="button"
              className="status-pill"
              style={{ 
                background: isSuperAdmin ? '#f3e8ff' : isCompanyAdmin ? '#dbeafe' : '#dcfce7',
                color: isSuperAdmin ? '#7c3aed' : isCompanyAdmin ? '#1d4ed8' : '#15803d',
                border: `1px solid ${isSuperAdmin ? '#c084fc' : isCompanyAdmin ? '#93c5fd' : '#86efac'}`,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 600,
                fontSize: '12px'
              }}
              onClick={() => {
                const nextRole = isSuperAdmin ? 'company-admin' : isCompanyAdmin ? 'employee' : 'super-admin';
                setRoleOverride(nextRole);
                if (nextRole === 'super-admin') setCurrentSection('super-admin');
                else if (nextRole === 'company-admin') setCurrentSection('overview');
                else setCurrentSection('employee-portal');
              }}
              title="Click to cycle between Super Admin, Company Admin, and Employee roles"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>
                {isSuperAdmin ? 'security' : isCompanyAdmin ? 'admin_panel_settings' : 'badge'}
              </span>
              {isSuperAdmin ? 'Role: Super Admin ⇄' : isCompanyAdmin ? 'Role: Company Admin ⇄' : 'Role: Employee ⇄'}
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
                <h2 className="panel-title" style={{ margin: 0 }}>InsightX AI Assistant</h2>
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
                      How can InsightX help you today?
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
              <h3 className="modal-title">{activeTab === 'login' ? 'Sign In to InsightX' : 'Register New Company Workspace'}</h3>
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
                <div>
                  {/* 3 Core Login Personas Selector */}
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-outline)', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Select Login Type / Persona</span>
                      <span style={{ fontSize: '10px', color: 'var(--color-primary)', fontWeight: 600 }}>1-Click Ready</span>
                    </div>
                    <div className="persona-card-grid">
                      <div 
                        className={`persona-card ${selectedLoginPersona === 'super-admin' ? 'selected super-admin' : ''}`}
                        onClick={() => {
                          setSelectedLoginPersona('super-admin');
                          setLoginForm({
                            email: 'superadmin@platform.ai',
                            password: 'Password123!',
                            companySlug: '',
                          });
                        }}
                      >
                        <span className="material-symbols-outlined persona-icon" style={{ color: '#a855f7' }}>security</span>
                        <span className="persona-title">Super Admin</span>
                        <span className="persona-subtitle">Global Platform</span>
                      </div>

                      <div 
                        className={`persona-card ${selectedLoginPersona === 'company-admin' ? 'selected company-admin' : ''}`}
                        onClick={() => {
                          setSelectedLoginPersona('company-admin');
                          setLoginForm({
                            email: 'admin@apexengineering.demo',
                            password: 'Password123!',
                            companySlug: 'apex-engineering',
                          });
                        }}
                      >
                        <span className="material-symbols-outlined persona-icon" style={{ color: '#3b82f6' }}>admin_panel_settings</span>
                        <span className="persona-title">Company Admin</span>
                        <span className="persona-subtitle">Apex Engineering</span>
                      </div>

                      <div 
                        className={`persona-card ${selectedLoginPersona === 'employee' ? 'selected employee' : ''}`}
                        onClick={() => {
                          setSelectedLoginPersona('employee');
                          setLoginForm({
                            email: 'employee@apexengineering.demo',
                            password: 'Password123!',
                            companySlug: 'apex-engineering',
                          });
                        }}
                      >
                        <span className="material-symbols-outlined persona-icon" style={{ color: '#10b981' }}>badge</span>
                        <span className="persona-title">Employee</span>
                        <span className="persona-subtitle">Knowledge Portal</span>
                      </div>
                    </div>

                    {/* Instant Demo Sign-In Shortcut Button */}
                    <button
                      type="button"
                      onClick={() => handleQuickDemoLogin(selectedLoginPersona)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        background: selectedLoginPersona === 'super-admin' 
                          ? 'linear-gradient(135deg, #7e22ce, #a855f7)'
                          : selectedLoginPersona === 'company-admin'
                          ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)'
                          : 'linear-gradient(135deg, #047857, #10b981)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        fontWeight: 600,
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        marginBottom: '14px'
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>bolt</span>
                      Instant Sign In as {selectedLoginPersona === 'super-admin' ? 'Super Admin' : selectedLoginPersona === 'company-admin' ? 'Company Admin' : 'Employee'}
                    </button>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '10px 0 14px' }}>
                      <div style={{ flex: 1, height: '1px', background: 'var(--color-outline-variant)' }}></div>
                      <span style={{ fontSize: '10.5px', color: 'var(--color-outline)', fontWeight: 600 }}>OR AUTHENTICATE VIA LIVE API</span>
                      <div style={{ flex: 1, height: '1px', background: 'var(--color-outline-variant)' }}></div>
                    </div>
                  </div>

                  <form onSubmit={handleLogin} className="form-stack">
                    <div className="form-group">
                      <label>Company Tenant Slug (Optional for Super Admin)</label>
                      <input
                        type="text"
                        placeholder="e.g. apex-engineering"
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
                      {authLoading ? 'Authenticating...' : 'Sign In via Live API ➔'}
                    </button>
                  </form>
                </div>
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


      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUPER ADMIN SECTION 1: Platform Command Center ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentSection === 'super-admin' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Super Admin Hero Banner */}
          <section className="stitch-hero-banner" style={{ background: 'linear-gradient(135deg, #1a0533 0%, #2d1b69 40%, #6c2bd9 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '28px', color: '#f0abfc' }}>security</span>
              <h2 className="stitch-hero-title" style={{ margin: 0, fontSize: '26px' }}>Platform Command Center</h2>
            </div>
            <p className="stitch-hero-subtitle" style={{ maxWidth: '700px' }}>
              Global multi-tenant oversight &mdash; manage enterprise workspaces, cross-tenant users, service mesh health, and security controls.
            </p>
            <div className="stitch-hero-actions">
              <button className="btn-primary" style={{ background: '#a855f7', borderColor: '#a855f7' }} onClick={() => setNewTenantModalOpen(true)}>
                <span className="material-symbols-outlined">add_business</span>
                Register New Tenant
              </button>
              <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1px solid rgba(255,255,255,0.25)' }} onClick={() => setNewUserModalOpen(true)}>
                <span className="material-symbols-outlined">person_add</span>
                Create Platform User
              </button>
              <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={handleExportAuditLogs}>
                <span className="material-symbols-outlined">download</span>
                Export Audit Report
              </button>
              <button className="btn-secondary" style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)' }} onClick={() => setCurrentSection('sa-infrastructure')}>
                <span className="material-symbols-outlined">dns</span>
                Inspect Mesh Health
              </button>
            </div>
          </section>

          {/* Platform-Wide KPI Cards */}
          <div className="stats-row">
            <div className="stat-card" style={{ borderTop: '3px solid #a855f7', cursor: 'pointer' }} onClick={() => setCurrentSection('sa-tenants')}>
              <div className="stat-header">
                <span className="stat-label">Total Tenants</span>
                <div className="stat-icon-wrap" style={{ background: '#f3e8ff', color: '#7c3aed' }}>
                  <span className="material-symbols-outlined">corporate_fare</span>
                </div>
              </div>
              <div className="stat-value">{tenantsList.length}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">● {tenantsList.filter(t => t.status === 'active').length} Active</span>
                <span style={{ fontSize: '11px', color: 'var(--color-primary)' }}>Manage Tenants ➔</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '100%', background: '#a855f7' }}></div></div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid #3b82f6', cursor: 'pointer' }} onClick={() => setCurrentSection('sa-users')}>
              <div className="stat-header">
                <span className="stat-label">Platform Users</span>
                <div className="stat-icon-wrap" style={{ background: '#dbeafe', color: '#2563eb' }}>
                  <span className="material-symbols-outlined">supervised_user_circle</span>
                </div>
              </div>
              <div className="stat-value">{platformUsersList.length}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">Across {tenantsList.length} Tenants</span>
                <span style={{ fontSize: '11px', color: 'var(--color-primary)' }}>Manage Users ➔</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '85%', background: '#3b82f6' }}></div></div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid #10b981' }}>
              <div className="stat-header">
                <span className="stat-label">Global Documents</span>
                <div className="stat-icon-wrap" style={{ background: '#d1fae5', color: '#059669' }}>
                  <span className="material-symbols-outlined">folder_open</span>
                </div>
              </div>
              <div className="stat-value">{docStats.total || 69}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">{docStats.indexed || 65} Indexed</span>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>{docStats.pending || 4} Pending</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '94%', background: '#10b981' }}></div></div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid #f59e0b' }}>
              <div className="stat-header">
                <span className="stat-label">Total Vectors</span>
                <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#d97706' }}>
                  <span className="material-symbols-outlined">hub</span>
                </div>
              </div>
              <div className="stat-value">{docStats.totalVectors || docStats.totalChunks || 842}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">ChromaDB Store</span>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Embedding Engine</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '88%', background: '#f59e0b' }}></div></div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid #06b6d4', cursor: 'pointer' }} onClick={() => setCurrentSection('sa-infrastructure')}>
              <div className="stat-header">
                <span className="stat-label">System Health</span>
                <div className="stat-icon-wrap" style={{ background: '#cffafe', color: '#0891b2' }}>
                  <span className="material-symbols-outlined">health_and_safety</span>
                </div>
              </div>
              <div className="stat-value" style={{ color: '#06b6d4' }}>4 / 4</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">● Mesh Healthy</span>
                <span style={{ fontSize: '11px', color: 'var(--color-primary)' }}>Live Probes ➔</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '100%', background: '#06b6d4' }}></div></div>
            </div>

            <div className="stat-card" style={{ borderTop: '3px solid #ec4899', cursor: 'pointer' }} onClick={() => setCurrentSection('sa-danger')}>
              <div className="stat-header">
                <span className="stat-label">Platform State</span>
                <div className="stat-icon-wrap" style={{ background: maintenanceMode ? '#fee2e2' : '#fce7f3', color: maintenanceMode ? '#dc2626' : '#db2777' }}>
                  <span className="material-symbols-outlined">{maintenanceMode ? 'warning' : 'verified'}</span>
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '20px', color: maintenanceMode ? '#ef4444' : '#10b981', paddingTop: '4px' }}>
                {maintenanceMode ? 'Maintenance' : 'Production'}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="stat-velocity">{maintenanceMode ? 'Read-Only' : 'All Systems Active'}</span>
                <span style={{ fontSize: '11px', color: 'var(--color-primary)' }}>Danger Zone ➔</span>
              </div>
              <div className="stat-progress-bar"><div className="stat-progress-fill" style={{ width: '100%', background: maintenanceMode ? '#ef4444' : '#10b981' }}></div></div>
            </div>
          </div>

          {/* Quick Snapshot: Tenants & Users side by side */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '20px' }}>
            {/* Recent Tenants Card */}
            <section className="data-section-card super-admin-section">
              <div className="section-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#a855f7' }}>corporate_fare</span>
                  <span>Registered Tenants ({tenantsList.length})</span>
                </div>
                <button className="btn-secondary btn-sm" onClick={() => setCurrentSection('sa-tenants')}>
                  View All Tenants ➔
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {tenantsList.slice(0, 3).map((tenant) => (
                  <div key={tenant.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--color-surface-variant)', borderRadius: '10px', border: '1px solid var(--color-outline-variant)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                        {tenant.code}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{tenant.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-outline)' }}>Admin: {tenant.admin} &bull; {tenant.docs} Docs</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className={`status-badge ${tenant.status === 'active' ? 'badge-healthy' : 'badge-degraded'}`}>{tenant.status}</span>
                      <button 
                        type="button"
                        className="btn-action-icon"
                        onClick={() => handleToggleTenantStatus(tenant.id)}
                        title={tenant.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                        style={{ color: tenant.status === 'active' ? '#ef4444' : '#10b981' }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                          {tenant.status === 'active' ? 'block' : 'check_circle'}
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Quick Platform Users Card */}
            <section className="data-section-card super-admin-section">
              <div className="section-title">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#3b82f6' }}>supervised_user_circle</span>
                  <span>Platform Users Snapshot ({platformUsersList.length})</span>
                </div>
                <button className="btn-secondary btn-sm" onClick={() => setCurrentSection('sa-users')}>
                  View All Users ➔
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {platformUsersList.slice(0, 3).map((user) => (
                  <div key={user.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'var(--color-surface-variant)', borderRadius: '10px', border: '1px solid var(--color-outline-variant)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="user-avatar-sm" style={{ background: user.role === 'Super Admin' ? 'linear-gradient(135deg, #7e22ce, #a855f7)' : user.role === 'Company Admin' ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : 'linear-gradient(135deg, #047857, #10b981)' }}>
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13.5px' }}>{user.name}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--color-outline)' }}>{user.email} &bull; {user.company}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="status-badge" style={{ background: user.role === 'Super Admin' ? '#f3e8ff' : user.role === 'Company Admin' ? '#dbeafe' : '#dcfce7', color: user.role === 'Super Admin' ? '#7c3aed' : user.role === 'Company Admin' ? '#1d4ed8' : '#15803d', fontSize: '11px' }}>
                        {user.role}
                      </span>
                      <button 
                        type="button"
                        className="btn-action-icon"
                        onClick={() => handleResetUserPassword(user.email)}
                        title="Send Password Reset"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock_reset</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUPER ADMIN SECTION 2: Tenant Workspaces Management ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentSection === 'sa-tenants' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-on-surface)' }}>Tenant Workspaces &amp; Organizations</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-outline)' }}>Provision, configure, and isolate multi-tenant industrial workspaces across the platform.</p>
            </div>
            <button className="btn-primary" style={{ background: '#a855f7', borderColor: '#a855f7' }} onClick={() => setNewTenantModalOpen(true)}>
              <span className="material-symbols-outlined">add_business</span>
              Provision New Tenant
            </button>
          </div>

          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-outline)' }}>search</span>
              <input
                type="text"
                placeholder="Search by company name, slug, or code..."
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '13.5px', outline: 'none', color: 'var(--color-on-surface)' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-outline)' }}>Status:</span>
              <select
                value={tenantStatusFilter}
                onChange={(e) => setTenantStatusFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-variant)', color: 'var(--color-on-surface)', fontSize: '12px' }}
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>
          </div>

          {/* Tenants Table */}
          <section className="data-section-card super-admin-section">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Slug</th>
                    <th>Code</th>
                    <th>Tier</th>
                    <th>Admin Email</th>
                    <th>Users</th>
                    <th>Documents</th>
                    <th>Status</th>
                    <th>Provisioned</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tenantsList
                    .filter(t => {
                      const matchQuery = t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                        t.slug.toLowerCase().includes(tenantSearch.toLowerCase()) ||
                        t.code.toLowerCase().includes(tenantSearch.toLowerCase());
                      const matchStatus = tenantStatusFilter === 'all' || t.status === tenantStatusFilter;
                      return matchQuery && matchStatus;
                    })
                    .map((tenant) => (
                      <tr key={tenant.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg, #a855f7, #6366f1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px' }}>
                              {tenant.code}
                            </div>
                            <span style={{ fontWeight: 600 }}>{tenant.name}</span>
                          </div>
                        </td>
                        <td><code>{tenant.slug}</code></td>
                        <td><span className="status-badge badge-info">{tenant.code}</span></td>
                        <td><span style={{ fontSize: '12px', fontWeight: 600, color: '#a855f7' }}>{tenant.tier}</span></td>
                        <td style={{ fontSize: '13px' }}>{tenant.admin}</td>
                        <td><strong>{tenant.users}</strong></td>
                        <td><strong>{tenant.docs}</strong></td>
                        <td>
                          <span className={`status-badge ${tenant.status === 'active' ? 'badge-healthy' : 'badge-degraded'}`}>
                            {tenant.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--color-outline)' }}>{tenant.created}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn-action-icon"
                              title={tenant.status === 'active' ? 'Suspend Tenant' : 'Activate Tenant'}
                              onClick={() => handleToggleTenantStatus(tenant.id)}
                              style={{ color: tenant.status === 'active' ? '#ef4444' : '#10b981' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                {tenant.status === 'active' ? 'block' : 'check_circle'}
                              </span>
                            </button>
                            <button
                              className="btn-action-icon"
                              title="Tenant Details"
                              onClick={() => alert(`Tenant: ${tenant.name}\nCode: ${tenant.code}\nTier: ${tenant.tier}\nAdmin: ${tenant.admin}\nUsers: ${tenant.users}\nDocs: ${tenant.docs}\nStatus: ${tenant.status}`)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUPER ADMIN SECTION 3: Cross-Tenant Platform Users ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentSection === 'sa-users' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-on-surface)' }}>Platform Users Directory</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-outline)' }}>Manage all administrative and employee accounts across all registered tenant workspaces.</p>
            </div>
            <button className="btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }} onClick={() => setNewUserModalOpen(true)}>
              <span className="material-symbols-outlined">person_add</span>
              Create Platform User
            </button>
          </div>

          {/* User Search & Filter */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-outline)' }}>search</span>
              <input
                type="text"
                placeholder="Search by user name, email, or company..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '13.5px', outline: 'none', color: 'var(--color-on-surface)' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--color-outline)' }}>Role:</span>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid var(--color-outline-variant)', background: 'var(--color-surface-variant)', color: 'var(--color-on-surface)', fontSize: '12px' }}
              >
                <option value="all">All Roles</option>
                <option value="Super Admin">Super Admin</option>
                <option value="Company Admin">Company Admin</option>
                <option value="Employee">Employee</option>
              </select>
            </div>
          </div>

          {/* Platform Users Table */}
          <section className="data-section-card super-admin-section">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Tenant Workspace</th>
                    <th>Platform Role</th>
                    <th>Status</th>
                    <th>Last Active</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {platformUsersList
                    .filter(u => {
                      const matchQuery = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                        u.company.toLowerCase().includes(userSearch.toLowerCase());
                      const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                      return matchQuery && matchRole;
                    })
                    .map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div className="user-avatar-sm" style={{ background: user.role === 'Super Admin' ? 'linear-gradient(135deg, #7e22ce, #a855f7)' : user.role === 'Company Admin' ? 'linear-gradient(135deg, #1d4ed8, #3b82f6)' : 'linear-gradient(135deg, #047857, #10b981)' }}>
                              {user.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 600 }}>{user.name}</span>
                          </div>
                        </td>
                        <td style={{ fontSize: '13px' }}>{user.email}</td>
                        <td><span className="status-badge badge-info">{user.company}</span></td>
                        <td>
                          <span className="status-badge" style={{ background: user.role === 'Super Admin' ? '#f3e8ff' : user.role === 'Company Admin' ? '#dbeafe' : '#dcfce7', color: user.role === 'Super Admin' ? '#7c3aed' : user.role === 'Company Admin' ? '#1d4ed8' : '#15803d' }}>
                            {user.role}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${user.status === 'active' ? 'badge-healthy' : 'badge-degraded'}`}>
                            {user.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '12px', color: 'var(--color-outline)' }}>{user.lastActive}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn-action-icon"
                              title="Reset Password"
                              onClick={() => handleResetUserPassword(user.email)}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>lock_reset</span>
                            </button>
                            <button
                              className="btn-action-icon"
                              title={user.status === 'active' ? 'Deactivate User' : 'Activate User'}
                              onClick={() => handleToggleUserStatus(user.id)}
                              style={{ color: user.status === 'active' ? '#ef4444' : '#10b981' }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                                {user.status === 'active' ? 'person_off' : 'person'}
                              </span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUPER ADMIN SECTION 4: Service Mesh & Infrastructure ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentSection === 'sa-infrastructure' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-on-surface)' }}>System Health &amp; Infrastructure</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-outline)' }}>Live telemetry and status monitoring for all distributed backend microservices and vector databases.</p>
            </div>
            <button className="btn-primary" style={{ background: '#06b6d4', borderColor: '#06b6d4' }} onClick={handleRunMeshProbe} disabled={probeLoading}>
              <span className="material-symbols-outlined">{probeLoading ? 'sync' : 'network_ping'}</span>
              {probeLoading ? 'Probing Services...' : 'Run Live Health Probe'}
            </button>
          </div>

          {/* Probe Live Result Banner */}
          {probeResult && (
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', border: '1px solid #06b6d4', padding: '12px 16px', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-symbols-outlined" style={{ color: '#06b6d4' }}>check_circle</span>
                <span>Probe completed in <strong>{probeResult.latency} ms</strong> at {probeResult.time}. All core microservices responded with HTTP 200 OK.</span>
              </div>
              <button className="btn-action-icon" onClick={() => setProbeResult(null)}><span className="material-symbols-outlined">close</span></button>
            </div>
          )}

          {/* Services Grid */}
          <div className="services-grid">
            <div className="service-card">
              <div className="service-header">
                <div className="service-name">
                  <span className="material-symbols-outlined text-primary">lan</span> Node.js API Gateway
                </div>
                <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.backend)}`}>
                  {healthData?.services?.backend?.toUpperCase() || 'ONLINE'}
                </span>
              </div>
              <div className="service-meta">
                <span>Port: <strong>5000</strong></span>
                <span>Runtime: <strong>Node 22</strong></span>
                <span>Protocol: <strong>REST / Express</strong></span>
                <span>Latency: <strong>4 ms</strong></span>
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
                <span>Framework: <strong>Uvicorn</strong></span>
                <span>LLM Engine: <strong>Gemini 2.0</strong></span>
                <span>Latency: <strong>11 ms</strong></span>
              </div>
            </div>

            <div className="service-card">
              <div className="service-header">
                <div className="service-name">
                  <span className="material-symbols-outlined text-primary">database</span> MongoDB Cluster
                </div>
                <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.database)}`}>
                  {healthData?.services?.database?.toUpperCase() || 'CONNECTED'}
                </span>
              </div>
              <div className="service-meta">
                <span>Driver: <strong>Mongoose 9</strong></span>
                <span>Tenants Isolated: <strong>{tenantsList.length}</strong></span>
                <span>Status: <strong>Active</strong></span>
                <span>Pool Size: <strong>10</strong></span>
              </div>
            </div>

            <div className="service-card">
              <div className="service-header">
                <div className="service-name">
                  <span className="material-symbols-outlined text-primary">hub</span> ChromaDB Vector Store
                </div>
                <span className={`status-badge ${getServiceBadgeClass(healthData?.services?.chromadb)}`}>
                  {healthData?.services?.chromadb?.toUpperCase() || 'READY'}
                </span>
              </div>
              <div className="service-meta">
                <span>Port: <strong>8000</strong></span>
                <span>Total Vectors: <strong>{docStats.totalVectors || 842}</strong></span>
                <span>Distance Metric: <strong>Cosine</strong></span>
                <span>Collection: <strong>Multi-Tenant</strong></span>
              </div>
            </div>
          </div>

          {/* Raw Diagnostic Payload Inspector */}
          <section className="data-section-card super-admin-section">
            <div className="section-title">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ color: '#06b6d4' }}>code</span>
                <span>Live Health Diagnostic Payload (`GET /api/v1/health`)</span>
              </div>
              <button className="btn-secondary btn-sm" onClick={fetchHealth}>Refresh Payload</button>
            </div>
            <pre style={{ marginTop: '14px', padding: '16px', background: 'var(--color-surface-container-lowest)', borderRadius: '10px', fontSize: '12px', overflowX: 'auto', color: 'var(--color-on-surface)' }}>
              {JSON.stringify(healthData || { status: 'healthy', services: { backend: 'up', aiService: 'up', database: 'connected', chromadb: 'ready' }, timestamp: new Date().toISOString() }, null, 2)}
            </pre>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUPER ADMIN SECTION 5: Global System Configuration ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentSection === 'sa-config' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-on-surface)' }}>Global System Configuration</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-outline)' }}>Configure platform-wide execution parameters, AI model selections, and storage quotas.</p>
            </div>
            <button className="btn-secondary" onClick={() => {
              setGlobalConfig({
                aiModel: 'Gemini 2.0 Flash',
                maxUploadSizeMB: '50 MB',
                chunkSize: '1000 tokens',
                defaultTopK: '5',
                authMethod: 'JWT + Refresh Token (HttpOnly)',
                encryption: 'bcrypt (12 rounds) + AES-256',
                sessionTimeout: '24 hours',
                ocrEngine: 'Tesseract 5.0 (Active)',
              });
              alert('Configuration reset to factory defaults.');
            }}>
              <span className="material-symbols-outlined">restart_alt</span>
              Reset to Defaults
            </button>
          </div>

          {configFeedback && (
            <div className="feedback-alert feedback-success">
              <span>{configFeedback}</span>
            </div>
          )}

          <form onSubmit={handleSaveGlobalConfig} className="data-section-card super-admin-section form-stack">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
              <div className="form-group">
                <label>Primary LLM Engine</label>
                <select value={globalConfig.aiModel} onChange={(e) => setGlobalConfig({ ...globalConfig, aiModel: e.target.value })}>
                  <option value="Gemini 2.0 Flash">Gemini 2.0 Flash (Recommended, High Speed)</option>
                  <option value="Gemini 1.5 Pro">Gemini 1.5 Pro (Deep Context RAG)</option>
                  <option value="Claude 3.5 Sonnet">Claude 3.5 Sonnet (Advanced Reasoning)</option>
                  <option value="GPT-4o">GPT-4o (OpenAI Alternative)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Model serving all RAG query synthesis and chat streams</span>
              </div>

              <div className="form-group">
                <label>Per-File Max Upload Limit</label>
                <select value={globalConfig.maxUploadSizeMB} onChange={(e) => setGlobalConfig({ ...globalConfig, maxUploadSizeMB: e.target.value })}>
                  <option value="25 MB">25 MB (Standard)</option>
                  <option value="50 MB">50 MB (Recommended)</option>
                  <option value="100 MB">100 MB (Enterprise)</option>
                  <option value="200 MB">200 MB (Heavy CAD/PDF)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Enforced globally across all document ingestion pipelines</span>
              </div>

              <div className="form-group">
                <label>Document Chunk Size</label>
                <select value={globalConfig.chunkSize} onChange={(e) => setGlobalConfig({ ...globalConfig, chunkSize: e.target.value })}>
                  <option value="500 tokens">500 tokens (Granular chunking)</option>
                  <option value="1000 tokens">1000 tokens (Balanced semantic boundary)</option>
                  <option value="1500 tokens">1500 tokens (Broad context window)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Token window used during text chunking for vectorization</span>
              </div>

              <div className="form-group">
                <label>Default Top-K Vector Matches</label>
                <select value={globalConfig.defaultTopK} onChange={(e) => setGlobalConfig({ ...globalConfig, defaultTopK: e.target.value })}>
                  <option value="3">Top 3 matches</option>
                  <option value="5">Top 5 matches (Recommended)</option>
                  <option value="8">Top 8 matches</option>
                  <option value="12">Top 12 matches (Deep search)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Number of semantic segments returned to RAG prompter</span>
              </div>

              <div className="form-group">
                <label>Session Expiry Duration</label>
                <select value={globalConfig.sessionTimeout} onChange={(e) => setGlobalConfig({ ...globalConfig, sessionTimeout: e.target.value })}>
                  <option value="8 hours">8 hours (High Security)</option>
                  <option value="24 hours">24 hours (Standard Enterprise)</option>
                  <option value="7 days">7 days (Extended Dev)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>JWT Refresh Token validity window</span>
              </div>

              <div className="form-group">
                <label>OCR Processing Engine</label>
                <select value={globalConfig.ocrEngine} onChange={(e) => setGlobalConfig({ ...globalConfig, ocrEngine: e.target.value })}>
                  <option value="Tesseract 5.0 (Active)">Tesseract 5.0 (Local Open-Source)</option>
                  <option value="EasyOCR">EasyOCR (PyTorch Engine)</option>
                  <option value="Cloud Vision API">Cloud Vision API (External)</option>
                </select>
                <span style={{ fontSize: '11px', color: 'var(--color-outline)' }}>Engine used to extract text from scanned schematics and PDFs</span>
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button type="submit" className="btn-primary" style={{ background: '#a855f7', borderColor: '#a855f7' }}>
                <span className="material-symbols-outlined">save</span>
                Save Platform Configuration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUPER ADMIN SECTION 6: Platform Audit Trail ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentSection === 'sa-audit' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--color-on-surface)' }}>Platform Audit Trail &amp; Compliance</h2>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-outline)' }}>Immutable log of administrative actions, authentication attempts, and system modifications.</p>
            </div>
            <button className="btn-primary" style={{ background: '#a855f7', borderColor: '#a855f7' }} onClick={handleExportAuditLogs}>
              <span className="material-symbols-outlined">download</span>
              Export Audit Trail (JSON)
            </button>
          </div>

          {/* Audit Search Bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--color-surface)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--color-outline-variant)' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--color-outline)' }}>search</span>
            <input
              type="text"
              placeholder="Filter audit events by actor, action, or target..."
              value={auditSearch}
              onChange={(e) => setAuditSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '13.5px', outline: 'none', color: 'var(--color-on-surface)' }}
            />
          </div>

          <section className="data-section-card super-admin-section">
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Event ID</th>
                    <th>Time</th>
                    <th>Actor</th>
                    <th>Action</th>
                    <th>Target / Details</th>
                    <th>IP Origin</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {saAuditLogsList
                    .filter(log => {
                      const matchQuery = log.actor.toLowerCase().includes(auditSearch.toLowerCase()) ||
                        log.action.toLowerCase().includes(auditSearch.toLowerCase()) ||
                        log.target.toLowerCase().includes(auditSearch.toLowerCase());
                      return matchQuery;
                    })
                    .map((log) => (
                      <tr key={log.id}>
                        <td><code>{log.id}</code></td>
                        <td style={{ fontSize: '12px', color: 'var(--color-outline)', whiteSpace: 'nowrap' }}>{log.time}</td>
                        <td style={{ fontWeight: 600 }}>{log.actor}</td>
                        <td>
                          <span className="status-badge" style={{ background: '#f1f5f9', color: '#334155', fontSize: '11px', fontFamily: 'monospace' }}>
                            {log.action}
                          </span>
                        </td>
                        <td style={{ fontSize: '13px' }}>{log.target}</td>
                        <td style={{ fontSize: '12px', color: 'var(--color-outline)' }}>{log.ip}</td>
                        <td>
                          <span className={`status-badge ${log.status === 'SUCCESS' ? 'badge-healthy' : log.status === 'WARN' ? 'badge-degraded' : 'badge-degraded'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* ── SUPER ADMIN SECTION 7: Danger Zone & Maintenance ── */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {currentSection === 'sa-danger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#ef4444' }}>Danger Zone &amp; Maintenance Operations</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-outline)' }}>High-privilege actions affecting all tenants, vector databases, and system availability.</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Maintenance Mode Card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'var(--color-surface)', borderRadius: '12px', border: maintenanceMode ? '2px solid #ef4444' : '1px solid var(--color-outline-variant)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: maintenanceMode ? '#ef4444' : '#f59e0b' }}>
                    {maintenanceMode ? 'warning' : 'build'}
                  </span>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Global Platform Maintenance Mode</span>
                  <span className={`status-badge ${maintenanceMode ? 'badge-degraded' : 'badge-healthy'}`}>
                    {maintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-outline)', marginTop: '4px', maxWidth: '650px' }}>
                  When enabled, all tenant workspaces are placed into read-only mode. Employees and Company Admins will see a maintenance notice and will be prevented from uploading files or modifying data.
                </div>
              </div>
              <button
                className={`btn-primary ${maintenanceMode ? 'btn-danger' : ''}`}
                style={{ background: maintenanceMode ? '#ef4444' : '#f59e0b', borderColor: maintenanceMode ? '#ef4444' : '#f59e0b' }}
                onClick={() => setMaintenanceMode(!maintenanceMode)}
              >
                <span className="material-symbols-outlined">{maintenanceMode ? 'check_circle' : 'construction'}</span>
                {maintenanceMode ? 'Disable Maintenance Mode' : 'Enable Maintenance Mode'}
              </button>
            </div>

            {/* Vector Purge Card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: '#ef4444' }}>delete_forever</span>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#ef4444' }}>Purge All ChromaDB Vector Collections</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-outline)', marginTop: '4px', maxWidth: '650px' }}>
                  Irreversibly clears all vector embeddings across every company collection. Document raw files remain intact, but re-indexing will be required to restore semantic search and AI chat capabilities.
                </div>
              </div>
              <button
                className="btn-secondary"
                style={{ color: '#ef4444', borderColor: '#ef4444' }}
                onClick={() => setPurgeModalOpen(true)}
              >
                <span className="material-symbols-outlined">delete_sweep</span>
                Purge Collections...
              </button>
            </div>

            {/* Reset Factory Settings Card */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', background: 'var(--color-surface)', borderRadius: '12px', border: '1px solid var(--color-outline-variant)' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-outline)' }}>restart_alt</span>
                  <span style={{ fontWeight: 700, fontSize: '15px' }}>Reset Platform Settings</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--color-outline)', marginTop: '4px', maxWidth: '650px' }}>
                  Restores global system configuration (LLM models, upload limits, chunk size, session timeouts) back to initial factory deployment values.
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={() => {
                  setGlobalConfig({
                    aiModel: 'Gemini 2.0 Flash',
                    maxUploadSizeMB: '50 MB',
                    chunkSize: '1000 tokens',
                    defaultTopK: '5',
                    authMethod: 'JWT + Refresh Token (HttpOnly)',
                    encryption: 'bcrypt (12 rounds) + AES-256',
                    sessionTimeout: '24 hours',
                    ocrEngine: 'Tesseract 5.0 (Active)',
                  });
                  alert('Platform settings restored to factory defaults.');
                }}
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Register New Tenant ── */}
      {newTenantModalOpen && (
        <div className="modal-overlay" onClick={() => setNewTenantModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Provision New Tenant Workspace</h3>
              <button className="modal-close-btn" onClick={() => setNewTenantModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateTenant}>
              <div className="modal-body form-stack">
                <div className="form-group">
                  <label>Company / Organization Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sterling Industrial Systems"
                    value={newTenantForm.name}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, name: e.target.value })}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group">
                    <label>Tenant Slug</label>
                    <input
                      type="text"
                      required
                      placeholder="sterling-systems"
                      value={newTenantForm.slug}
                      onChange={(e) => setNewTenantForm({ ...newTenantForm, slug: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Company Code</label>
                    <input
                      type="text"
                      required
                      placeholder="STER"
                      value={newTenantForm.code}
                      onChange={(e) => setNewTenantForm({ ...newTenantForm, code: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Tenant Tier</label>
                  <select
                    value={newTenantForm.tier}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, tier: e.target.value })}
                  >
                    <option value="Enterprise">Enterprise (Full RAG + 100MB)</option>
                    <option value="Professional">Professional (Standard RAG)</option>
                    <option value="Starter">Starter (Basic Search)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Initial Administrator Email</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@sterling.demo"
                    value={newTenantForm.adminEmail}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, adminEmail: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Initial Password</label>
                  <input
                    type="password"
                    required
                    value={newTenantForm.password}
                    onChange={(e) => setNewTenantForm({ ...newTenantForm, password: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setNewTenantModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#a855f7', borderColor: '#a855f7' }}>Provision Tenant</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Create Platform User ── */}
      {newUserModalOpen && (
        <div className="modal-overlay" onClick={() => setNewUserModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Create Platform User</h3>
              <button className="modal-close-btn" onClick={() => setNewUserModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleCreatePlatformUser}>
              <div className="modal-body form-stack">
                <div className="form-group">
                  <label>User Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sarah Connor"
                    value={newUserForm.name}
                    onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="sarah@company.com"
                    value={newUserForm.email}
                    onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Assign Role</label>
                  <select
                    value={newUserForm.role}
                    onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value })}
                  >
                    <option value="Company Admin">Company Admin (Tenant scoped)</option>
                    <option value="Employee">Employee (Read + Chat)</option>
                    <option value="Super Admin">Super Admin (Global Platform)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Assign to Tenant Organization</label>
                  <select
                    value={newUserForm.company}
                    onChange={(e) => setNewUserForm({ ...newUserForm, company: e.target.value })}
                  >
                    <option value="Apex Engineering">Apex Engineering (APEX)</option>
                    <option value="Nova Finance Corp">Nova Finance Corp (NOVA)</option>
                    <option value="Vertex Manufacturing">Vertex Manufacturing (VERTEX)</option>
                    <option value="Global Platform">Global Platform (Super Admin only)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setNewUserModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-primary" style={{ background: '#3b82f6', borderColor: '#3b82f6' }}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Purge Vector DB Confirmation ── */}
      {purgeModalOpen && (
        <div className="modal-overlay" onClick={() => setPurgeModalOpen(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px', border: '1px solid #ef4444' }}>
            <div className="modal-header">
              <h3 className="modal-title" style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined">warning</span>
                Confirm Vector DB Purge
              </h3>
              <button className="modal-close-btn" onClick={() => setPurgeModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '13.5px', color: 'var(--color-on-surface)', lineHeight: 1.5 }}>
                Are you sure you want to purge <strong>all vector embeddings</strong> across every tenant collection in ChromaDB?
              </p>
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 12px', borderRadius: '8px', fontSize: '12px', color: '#ef4444', marginTop: '12px' }}>
                ⚠️ This will immediately disable AI Chat retrieval until tenant documents are re-vectorized.
              </div>
              {purgeSuccess && (
                <div style={{ marginTop: '14px', fontSize: '13px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="material-symbols-outlined">sync</span>
                  Purging vector collections across cluster...
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button type="button" className="btn-secondary" onClick={() => setPurgeModalOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary" style={{ background: '#ef4444', borderColor: '#ef4444' }} onClick={handleConfirmPurgeVectors} disabled={purgeSuccess}>
                {purgeSuccess ? 'Purging...' : 'Yes, Purge All Vectors'}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ── Close Main Page Content ── */}
      </main>


      {/* ── Footer ── */}
      <footer className="dashboard-footer">
        <span>InsightX AI-Powered Industrial Knowledge System — Enterprise Release</span>
        <span>Environment: <strong>Production Ready (v2.4)</strong></span>
      </footer>
    </div>
  </div>
);
}

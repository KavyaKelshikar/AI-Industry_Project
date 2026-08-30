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

      {/* ── Footer ── */}
      <footer className="dashboard-footer">
        <span>Stitch AI System — Modules 4.6–10 Live Integrated</span>
        <span>Environment: <strong>development</strong></span>
      </footer>
    </div>
  );
}

import * as OBC from "@thatopen/components";

export const CYPE_LOCAL_EMULATOR_BASE =
  "http://127.0.0.1:5001/master-bim-software/us-central1";
export const CYPE_CLOUD_FUNCTIONS_BASE =
  "https://us-central1-master-bim-software.cloudfunctions.net";
export const CYPE_USER_PROFILE_URL =
  "https://bimserver.center/en/user/abdellah_belmaaris_abdellah19";
export const CYPE_DEV_PORTAL_URL = "https://developers.bimserver.center/";

export interface CypeProject {
  id: string;
  name: string;
  description: string;
  owner: string;
  updatedAt: string;
}

export interface CypeContributionItem {
  id: string;
  projectId: string;
  name: string;
  appSource: string;
  discipline: "Architecture" | "Structure" | "MEP" | "Coordination";
  version: string;
  sizeLabel: string;
  modifiedAt: string;
  ifcFileName: string;
  streamUrl: string;
  isRemoteBinary?: boolean;
}

export interface CypeIssue {
  id: string;
  projectId: string;
  displayId: string;
  title: string;
  description: string;
  discipline: "Structure" | "MEP" | "Architecture" | "Quantities";
  status: "pending" | "solved" | "dismissed";
  priority: "high" | "medium" | "low";
  dueDate: string;
  assignedTo: string;
  createdAt: string;
}

export interface CypeAuthConfig {
  mode: "sandbox" | "live-cype";
  clientId: string;
  clientSecret: string;
  sessionId: string;
  refreshToken: string;
  expiresAt: number;
  proxyEndpoint: string;
  accountHandle: string;
}

const CYPE_STORAGE_KEY = "toc_cype_bimserver_config_v1";
const CYPE_PENDING_AUTH_KEY = "toc_cype_pending_auth";

function isBimserverWebPageUrl(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  const s = val.toLowerCase();
  return (
    s.includes("/en/file/") ||
    s.includes("/es/file/") ||
    s.includes("/fr/file/") ||
    s.includes("/pt/file/") ||
    s.includes("/it/file/") ||
    s.includes("/file/") ||
    s.includes("/view/") ||
    s.includes("/login")
  );
}

function isValidDownloadUrl(val: string): boolean {
  if (!val || typeof val !== "string") return false;
  const s = val.trim();
  if (!s.startsWith("http://") && !s.startsWith("https://")) return false;
  if (isBimserverWebPageUrl(s)) return false;
  return true;
}

function extractBimserverDownloadUrl(item: any): string {
  if (!item) return "";
  if (typeof item === "string") {
    return isValidDownloadUrl(item) ? item.trim() : "";
  }

  const candidateArrays = [
    item.urls,
    item.links,
    item.download_urls,
    item.downloadUrls,
    item.mirrors,
    item.files,
  ];

  for (const arr of candidateArrays) {
    if (Array.isArray(arr) && arr.length > 0) {
      for (const entry of arr) {
        if (typeof entry === "string" && isValidDownloadUrl(entry)) {
          return entry.trim();
        } else if (entry && typeof entry === "object") {
          const extracted = extractBimserverDownloadUrl(entry);
          if (extracted && isValidDownloadUrl(extracted)) return extracted;
        }
      }
    }
  }

  const stringFields = [
    item.url,
    item.download_url,
    item.url_download,
    item.file_url,
    item.ifc_url,
    item.link,
    item.streamUrl,
    item.stream_url,
    item.href,
    item.uri,
  ];

  for (const field of stringFields) {
    if (typeof field === "string" && isValidDownloadUrl(field)) {
      return field.trim();
    }
  }

  if (item.file && typeof item.file === "object") {
    const fUrl = extractBimserverDownloadUrl(item.file);
    if (fUrl && isValidDownloadUrl(fUrl)) return fUrl;
  }
  if (item.document && typeof item.document === "object") {
    const dUrl = extractBimserverDownloadUrl(item.document);
    if (dUrl && isValidDownloadUrl(dUrl)) return dUrl;
  }

  return "";
}

const SANDBOX_PROJECTS: CypeProject[] = [
  {
    id: "cype-proj-aurora",
    name: "Aurora Ten-Villa Estate — OpenBIM",
    description: "Federated CYPE Architecture + CYPECAD residential masterplan",
    owner: "abdellah_belmaaris_abdellah19",
    updatedAt: "Today, 14:20",
  },
  {
    id: "cype-proj-stadium",
    name: "CYPE Atlas Stadium 65k",
    description: "Long-span steel roof trusses & concrete bowl openBIM coordination",
    owner: "abdellah_belmaaris_abdellah19",
    updatedAt: "Yesterday",
  },
  {
    id: "cype-proj-civic",
    name: "CYPE Civic Complex & Viaduct",
    description: "Multi-discipline IFC4 coordination (CYPE Architecture + CYPECAD + MEP)",
    owner: "abdellah_belmaaris_abdellah19",
    updatedAt: "3 days ago",
  },
];

const SANDBOX_CONTRIBUTIONS: CypeContributionItem[] = [
  {
    id: "cype-doc-aurora-arch",
    projectId: "cype-proj-aurora",
    name: "Aurora_TenVilla_CYPE_Arch.ifc",
    appSource: "CYPE Architecture",
    discipline: "Architecture",
    version: "Rev 04",
    sizeLabel: "18.6 MB",
    modifiedAt: "Today, 14:18",
    ifcFileName: "aurora_ten_villa_estate_ifc4.ifc",
    streamUrl: "/models/ifc/aurora_ten_villa_estate_ifc4.ifc",
  },
  {
    id: "cype-doc-aurora-str",
    projectId: "cype-proj-aurora",
    name: "Aurora_Villas_CYPECAD_Frame.ifc",
    appSource: "CYPECAD",
    discipline: "Structure",
    version: "Rev 03",
    sizeLabel: "9.4 MB",
    modifiedAt: "Today, 11:05",
    ifcFileName: "aurora_ten_villa_estate_ifc4.ifc",
    streamUrl: "/models/ifc/aurora_ten_villa_estate_ifc4.ifc",
  },
  {
    id: "cype-doc-stadium-str",
    projectId: "cype-proj-stadium",
    name: "Atlas_Stadium_CYPECAD_3D.ifc",
    appSource: "CYPE 3D / CYPECAD",
    discipline: "Structure",
    version: "Rev 07",
    sizeLabel: "24.1 MB",
    modifiedAt: "Yesterday",
    ifcFileName: "ifcopenshell_sample_stadium_2x3.ifc",
    streamUrl: "/models/ifc/ifcopenshell_sample_stadium_2x3.ifc",
  },
  {
    id: "cype-doc-civic-arch",
    projectId: "cype-proj-civic",
    name: "Civic_Architecture_IFC4.ifc",
    appSource: "CYPE Architecture",
    discipline: "Architecture",
    version: "Rev 02",
    sizeLabel: "11.8 MB",
    modifiedAt: "2 days ago",
    ifcFileName: "civic_arq_model.ifc",
    streamUrl: "/models/ifc/civic_arq_model.ifc",
  },
  {
    id: "cype-doc-civic-viaduct",
    projectId: "cype-proj-civic",
    name: "Bridge_Overpass_CYPE_Civil.ifc",
    appSource: "CYPE Civil / StruBIM",
    discipline: "Coordination",
    version: "Rev 05",
    sizeLabel: "14.2 MB",
    modifiedAt: "3 days ago",
    ifcFileName: "civil_overpass_mbsd.ifc",
    streamUrl: "/models/ifc/civil_overpass_mbsd.ifc",
  },
];

const SANDBOX_ISSUES: CypeIssue[] = [
  {
    id: "cype-iss-1",
    projectId: "cype-proj-aurora",
    displayId: "CYPE-01",
    title: "CYPECAD column drop beam clash with pergola soffit (Villa 02)",
    description: "Check beam depth C-204 exported from CYPECAD vs CYPE Architecture terrace clearance.",
    discipline: "Structure",
    status: "pending",
    priority: "high",
    dueDate: "2026-11-22",
    assignedTo: "abdellah_belmaaris_abdellah19",
    createdAt: "2026-11-09",
  },
  {
    id: "cype-iss-2",
    projectId: "cype-proj-aurora",
    displayId: "CYPE-02",
    title: "Verify CYPECAD MEP domestic water riser shaft in Villa 01",
    description: "Synchronize IFC4 opening voids for mechanical shaft before final Open BIM Quantities takeoff.",
    discipline: "MEP",
    status: "pending",
    priority: "medium",
    dueDate: "2026-11-28",
    assignedTo: "MEP Coordination",
    createdAt: "2026-11-10",
  },
  {
    id: "cype-iss-3",
    projectId: "cype-proj-stadium",
    displayId: "CYPE-14",
    title: "Check CYPE 3D canopy truss base plate anchor bolts",
    description: "Confirm anchor bolt edge distance against precast raker beam contribution.",
    discipline: "Structure",
    status: "pending",
    priority: "high",
    dueDate: "2026-11-20",
    assignedTo: "Structural Lead",
    createdAt: "2026-11-08",
  },
  {
    id: "cype-iss-4",
    projectId: "cype-proj-civic",
    displayId: "CYPE-21",
    title: "Export updated Qto quantities to Open BIM Quantities",
    description: "Reconcile slab surface areas after curtain wall revision in CYPE Architecture.",
    discipline: "Quantities",
    status: "solved",
    priority: "low",
    dueDate: "2026-11-14",
    assignedTo: "BIM Manager",
    createdAt: "2026-11-06",
  },
];

/**
 * Module 5 — Section 5: CYPE BIMserver.center Connector
 * Connects That Open Engine to BIMserver.center REST API v1 (/login, /projects, /contributions, /issues)
 * plus a zero-setup OpenBIM CYPE workflow fallback for local demonstration.
 */
export class CypeConnector extends OBC.Component implements OBC.Disposable {
  static readonly uuid = "6b329d10-c912-49e8-8a7c-4f2d11a0c502";
  enabled = true;

  readonly onStateChanged = new OBC.Event<void>();
  readonly onLoadIfcRequested = new OBC.Event<{ buffer: ArrayBuffer; fileName: string }>();
  readonly onImportIssueRequested = new OBC.Event<CypeIssue>();
  readonly onDisposed = new OBC.Event<void>();

  auth: CypeAuthConfig;
  projects: CypeProject[] = SANDBOX_PROJECTS;
  contributions: CypeContributionItem[] = SANDBOX_CONTRIBUTIONS;
  issues: CypeIssue[] = SANDBOX_ISSUES;
  importedIssueIds = new Set<string>();

  selectedProjectId = "cype-proj-aurora";
  loadingDocId: string | null = null;
  syncStatus = "CYPE OpenBIM Ready (BIMserver.center Bridge)";
  connectedUser = "abdellah_belmaaris_abdellah19";
  isBusy = false;

  constructor(components: OBC.Components) {
    super(components);
    components.add(CypeConnector.uuid, this);
    this.auth = this.loadStoredSession();
  }

  private isLocalDevHost(): boolean {
    if (typeof window === "undefined") return true;
    const h = window.location.hostname;
    return h === "localhost" || h === "127.0.0.1";
  }

  private loadStoredSession(): CypeAuthConfig {
    const defaults: CypeAuthConfig = {
      mode: "sandbox",
      clientId: "611:2E537495-9F92-4045-AFAD-49FF2C0D8DEE",
      clientSecret: "",
      sessionId: "",
      refreshToken: "",
      expiresAt: 0,
      proxyEndpoint: `${CYPE_LOCAL_EMULATOR_BASE}/cypeProxy`,
      accountHandle: "abdellah_belmaaris_abdellah19",
    };

    try {
      const raw = localStorage.getItem(CYPE_STORAGE_KEY);
      if (raw) {
        const parsed = { ...defaults, ...JSON.parse(raw) } as CypeAuthConfig;
        if (!parsed.clientId) parsed.clientId = defaults.clientId;
        if (this.isLocalDevHost() && parsed.proxyEndpoint?.includes("cloudfunctions.net")) {
          parsed.proxyEndpoint = `${CYPE_LOCAL_EMULATOR_BASE}/cypeProxy`;
        }
        // Check token expiry with 1-minute buffer (Lesson 5.4)
        if (parsed.sessionId && parsed.expiresAt > 0 && parsed.expiresAt <= Date.now() + 60_000) {
          parsed.sessionId = "";
        }
        return parsed;
      }
    } catch {}
    return defaults;
  }

  saveAuth(partial: Partial<CypeAuthConfig>) {
    this.auth = { ...this.auth, ...partial };
    try {
      localStorage.setItem(CYPE_STORAGE_KEY, JSON.stringify(this.auth));
    } catch {}
    this.onStateChanged.trigger();
  }

  clearSession() {
    this.saveAuth({ sessionId: "", refreshToken: "", expiresAt: 0 });
    this.syncStatus = "Cleared BIMserver.center session token.";
    this.onStateChanged.trigger();
  }

  private resolveFunctionUrl(fnName: string): string {
    const proxy = this.auth.proxyEndpoint.trim() || `${CYPE_LOCAL_EMULATOR_BASE}/cypeProxy`;
    return proxy.replace(/\/cypeProxy\/?$/i, `/${fnName}`);
  }

  isSessionValid(): boolean {
    if (!this.auth.sessionId.trim()) return false;
    if (this.auth.expiresAt > 0 && this.auth.expiresAt <= Date.now() + 60_000) {
      return false;
    }
    return true;
  }

  /**
   * Lesson 5.3: Starts 3-step BIMserver.center login (POST /login -> redirect to consent URL -> store projectId)
   */
  async startAuthorization(currentProjectId?: string): Promise<string> {
    this.isBusy = true;
    this.syncStatus = "Creating temporary BIMserver.center session...";
    this.onStateChanged.trigger();

    try {
      const redirectUri = this.isLocalDevHost()
        ? "http://localhost:5173/"
        : `${window.location.origin}/`;
      const res = await fetch(this.resolveFunctionUrl("cypeLogin"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: this.auth.clientId.trim(),
          clientSecret: this.auth.clientSecret.trim(),
          redirectUri,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url || !data?.session_temp) {
        throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
      }

      try {
        sessionStorage.setItem(
          CYPE_PENDING_AUTH_KEY,
          JSON.stringify({
            sessionTemp: data.session_temp,
            securityId: data.security_id || "",
            projectId: currentProjectId || "",
          })
        );
      } catch {}

      this.syncStatus = "Redirecting to BIMserver.center authorization...";
      this.isBusy = false;
      this.onStateChanged.trigger();
      window.location.href = data.url;
      return data.url;
    } catch (err: any) {
      this.isBusy = false;
      this.syncStatus = `CYPE Login Error: ${err?.message || err}`;
      this.onStateChanged.trigger();
      throw err;
    }
  }

  /**
   * Lesson 5.3 & 5.4: Exchanges temporary session_temp + security_id for permanent Bearer session_id
   */
  async completeAuthorization(sessionTempArg?: string, securityIdArg?: string): Promise<boolean> {
    let sessionTemp = sessionTempArg || "";
    let securityId = securityIdArg || "";

    if (!sessionTemp) {
      try {
        const pending = sessionStorage.getItem(CYPE_PENDING_AUTH_KEY);
        if (pending) {
          const parsed = JSON.parse(pending);
          sessionTemp = parsed.sessionTemp || "";
          securityId = parsed.securityId || "";
        }
      } catch {}
    }

    if (!sessionTemp || !securityId) {
      return false;
    }

    this.isBusy = true;
    this.syncStatus = "Exchanging BIMserver.center session token...";
    this.onStateChanged.trigger();

    try {
      const res = await fetch(this.resolveFunctionUrl("cypeExchangeSession"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionTemp, securityId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.session_id) {
        throw new Error(data?.error || data?.message || "Authorization not yet confirmed by user.");
      }

      try {
        sessionStorage.removeItem(CYPE_PENDING_AUTH_KEY);
      } catch {}

      this.saveAuth({
        mode: "live-cype",
        sessionId: data.session_id,
        refreshToken: data.refresh_token || this.auth.refreshToken,
        expiresAt: Date.now() + 55 * 60_000,
      });

      this.syncStatus = "Authenticated with CYPE BIMserver.center!";
      await this.syncLiveWorkspace();
      return true;
    } catch (err: any) {
      this.syncStatus = err?.message || "Failed exchanging BIMserver.center session.";
      return false;
    } finally {
      this.isBusy = false;
      this.onStateChanged.trigger();
    }
  }

  async refreshSessionToken(): Promise<void> {
    if (!this.auth.refreshToken) {
      throw new Error("No refresh_token stored yet.");
    }
    const res = await fetch(this.resolveFunctionUrl("cypeExchangeSession"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        refreshToken: this.auth.refreshToken,
        clientId: this.auth.clientId.trim(),
        clientSecret: this.auth.clientSecret.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.session_id) {
      throw new Error(data?.error || `HTTP ${res.status}`);
    }
    this.saveAuth({
      sessionId: data.session_id,
      refreshToken: data.refresh_token || this.auth.refreshToken,
      expiresAt: Date.now() + 55 * 60_000,
    });
    this.syncStatus = "Refreshed BIMserver.center session token.";
    this.onStateChanged.trigger();
  }

  private async callProxy(endpoint: string, method = "GET", body?: any): Promise<any> {
    const proxy = this.auth.proxyEndpoint.trim() || `${CYPE_LOCAL_EMULATOR_BASE}/cypeProxy`;
    const res = await fetch(proxy, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint,
        sessionId: this.auth.sessionId.trim(),
        method,
        body,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.error || data?.message || `HTTP ${res.status}`);
    }
    return data;
  }

  async syncLiveWorkspace() {
    if (this.auth.mode !== "live-cype" || !this.auth.sessionId.trim()) {
      this.projects = SANDBOX_PROJECTS;
      this.contributions = SANDBOX_CONTRIBUTIONS;
      this.issues = SANDBOX_ISSUES;
      this.syncStatus = "CYPE OpenBIM Ready (Sandbox Ecosystem)";
      this.onStateChanged.trigger();
      return;
    }

    this.isBusy = true;
    this.syncStatus = "Syncing projects from BIMserver.center...";
    this.onStateChanged.trigger();

    try {
      const projRes = await this.callProxy("/projects?limit=30");
      const records: any[] = projRes?.records || [];
      this.projects = records.map((p) => ({
        id: String(p.id),
        name: p.name || `CYPE Project #${p.id}`,
        description: p.description || "BIMserver.center OpenBIM Project",
        owner: p.owner?.name || this.connectedUser,
        updatedAt: p.date_last_change
          ? new Date(Number(p.date_last_change) * 1000).toLocaleDateString()
          : "Synced",
      }));

      if (this.projects.length > 0 && !this.projects.some((p) => p.id === this.selectedProjectId)) {
        this.selectedProjectId = this.projects[0].id;
      }

      if (this.selectedProjectId) {
        await Promise.all([
          this.fetchProjectContributions(this.selectedProjectId),
          this.fetchProjectIssues(this.selectedProjectId),
        ]);
      }

      this.syncStatus = `Connected · ${this.projects.length} BIMserver.center project(s)`;
    } catch (err: any) {
      this.syncStatus = `CYPE Sync Error: ${err?.message || err}`;
    } finally {
      this.isBusy = false;
      this.onStateChanged.trigger();
    }
  }

  async fetchProjectContributions(projectId: string) {
    if (this.auth.mode !== "live-cype" || !this.auth.sessionId.trim()) {
      this.contributions = SANDBOX_CONTRIBUTIONS;
      return;
    }
    const res = await this.callProxy(`/projects/${projectId}/contributions?expand=documents&limit=40`);
    const records: any[] = res?.records || [];
    const parsed: CypeContributionItem[] = [];

    for (const c of records) {
      const docs: any[] = Array.isArray(c.documents)
        ? c.documents
        : Array.isArray(c.documents?.records)
        ? c.documents.records
        : Array.isArray(c.files)
        ? c.files
        : [];
      const ifcDoc = docs.find((d) => String(d?.name || d?.file_name || d?.filename || "").toLowerCase().endsWith(".ifc")) || docs[0];
      const docUrl = extractBimserverDownloadUrl(ifcDoc) || extractBimserverDownloadUrl(c);
      const modTs = c.date_last_change || c.date_create;
      parsed.push({
        id: String(c.id),
        projectId,
        name: ifcDoc?.name || ifcDoc?.file_name || c.name || `Contribution_${c.id}.ifc`,
        appSource: c.application?.name || "CYPE OpenBIM",
        discipline: String(c.name || "").toLowerCase().includes("mep")
          ? "MEP"
          : String(c.name || "").toLowerCase().includes("str") || String(c.application?.name || "").includes("CYPECAD")
          ? "Structure"
          : "Architecture",
        version: `Rev ${c.version || 1}`,
        sizeLabel: ifcDoc?.size
          ? `${(Number(ifcDoc.size) / (1024 * 1024)).toFixed(1)} MB`
          : "Cloud IFC",
        modifiedAt: modTs ? new Date(Number(modTs) * 1000).toLocaleDateString() : "Recent",
        ifcFileName: ifcDoc?.name || ifcDoc?.file_name || `${(c.name || "cype_model").replace(/\s+/g, "_")}.ifc`,
        streamUrl: docUrl,
        isRemoteBinary: Boolean(docUrl && String(docUrl).startsWith("http")),
      });
    }

    this.contributions = parsed;
    this.onStateChanged.trigger();
  }

  async fetchProjectIssues(projectId: string) {
    if (this.auth.mode !== "live-cype" || !this.auth.sessionId.trim()) {
      this.issues = SANDBOX_ISSUES;
      return;
    }
    const res = await this.callProxy(`/projects/${projectId}/issues?limit=50`);
    const records: any[] = res?.records || [];
    this.issues = records.map((iss) => {
      const priNum = Number(iss.priority ?? 1);
      const stNum = Number(iss.status ?? 0);
      return {
        id: String(iss.id),
        projectId,
        displayId: `CYPE-${iss.id}`,
        title: iss.title || "Coordination Issue",
        description: iss.description || "",
        discipline: "Architecture",
        priority: priNum === 2 ? "high" : priNum === 1 ? "medium" : "low",
        status: stNum === 1 ? "solved" : stNum === 2 ? "dismissed" : "pending",
        dueDate: iss.date_due_to
          ? new Date(Number(iss.date_due_to) * 1000).toISOString().slice(0, 10)
          : new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
        assignedTo: iss.assigned_to?.name || iss.owner?.name || "Team",
        createdAt: iss.date_create
          ? new Date(Number(iss.date_create) * 1000).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      };
    });
    this.onStateChanged.trigger();
  }

  async selectProject(projectId: string) {
    this.selectedProjectId = projectId;
    if (this.auth.mode === "live-cype" && this.auth.sessionId.trim()) {
      this.isBusy = true;
      this.onStateChanged.trigger();
      try {
        await Promise.all([
          this.fetchProjectContributions(projectId),
          this.fetchProjectIssues(projectId),
        ]);
      } finally {
        this.isBusy = false;
      }
    }
    this.onStateChanged.trigger();
  }

  getActiveContributions(): CypeContributionItem[] {
    return this.contributions.filter((c) => c.projectId === this.selectedProjectId);
  }

  getActiveIssues(): CypeIssue[] {
    return this.issues.filter((i) => i.projectId === this.selectedProjectId);
  }

  /**
   * Lesson 5.5: Fetches IFC bytes (either local OpenBIM file or base64-tunneled via Firebase Function)
   * and triggers load into That Open Engine WebIFC viewer.
   */
  async loadContributionIfc(item: CypeContributionItem) {
    if (!item.streamUrl || isBimserverWebPageUrl(item.streamUrl)) {
      this.syncStatus = `Contribution "${item.name}" has no downloadable IFC document URL.`;
      this.onStateChanged.trigger();
      return;
    }

    this.loadingDocId = item.id;
    this.syncStatus = `Streaming "${item.ifcFileName}" from CYPE ${item.appSource}...`;
    this.onStateChanged.trigger();

    try {
      let buffer: ArrayBuffer;
      if (item.isRemoteBinary && this.auth.mode === "live-cype") {
        try {
          const res = await fetch(this.resolveFunctionUrl("cypeDownloadFile"), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileUrl: item.streamUrl, sessionId: this.auth.sessionId.trim() }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data?.base64) {
            throw new Error(data?.error || `HTTP ${res.status}`);
          }
          const binary = atob(data.base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          buffer = bytes.buffer;
        } catch (proxyErr) {
          console.warn("[CYPE] Proxy download failed, falling back to direct fetch:", proxyErr);
          const directRes = await fetch(item.streamUrl);
          if (!directRes.ok) throw proxyErr;
          buffer = await directRes.arrayBuffer();
        }
      } else {
        const res = await fetch(item.streamUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        buffer = await res.arrayBuffer();
      }

      await this.onLoadIfcRequested.trigger({ buffer, fileName: item.ifcFileName });
      this.syncStatus = `Loaded "${item.ifcFileName}" into 3D Viewer.`;
    } catch (err: any) {
      this.syncStatus = `Failed loading IFC: ${err?.message || err}`;
    } finally {
      this.loadingDocId = null;
      this.onStateChanged.trigger();
    }
  }

  async createIssue(title: string, discipline: CypeIssue["discipline"] = "Structure", priority: CypeIssue["priority"] = "medium") {
    if (!title.trim()) return;
    if (this.auth.mode === "live-cype" && this.auth.sessionId.trim()) {
      try {
        await this.callProxy(`/projects/${this.selectedProjectId}/issues`, "POST", {
          title: title.trim(),
          description: `Logged from BIM 3D Viewer (${discipline})`,
          priority: priority === "high" ? 2 : priority === "medium" ? 1 : 0,
        });
        await this.fetchProjectIssues(this.selectedProjectId);
        return;
      } catch (err: any) {
        this.syncStatus = `Failed posting issue to BIMserver.center: ${err?.message || err}`;
      }
    }

    const created: CypeIssue = {
      id: `cype-iss-${Date.now()}`,
      projectId: this.selectedProjectId,
      displayId: `CYPE-${30 + this.issues.length}`,
      title: title.trim(),
      description: `Created from 3D BIM Coordination Inspector (${discipline}).`,
      discipline,
      status: "pending",
      priority,
      dueDate: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10),
      assignedTo: this.connectedUser,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    this.issues = [created, ...this.issues];
    this.syncStatus = `Logged "${created.displayId}" in CYPE Issues.`;
    this.onStateChanged.trigger();
  }

  importIssueToProject(issue: CypeIssue) {
    this.importedIssueIds.add(issue.id);
    this.onImportIssueRequested.trigger(issue);
    this.syncStatus = `Imported "${issue.displayId}" as project topic.`;
    this.onStateChanged.trigger();
  }

  importAllIssuesToProject() {
    const active = this.getActiveIssues().filter((i) => !this.importedIssueIds.has(i.id));
    if (active.length === 0) {
      this.syncStatus = "All visible CYPE issues are already synced to Project Topics.";
      this.onStateChanged.trigger();
      return;
    }
    for (const iss of active) {
      this.importedIssueIds.add(iss.id);
      this.onImportIssueRequested.trigger(iss);
    }
    this.syncStatus = `Synced ${active.length} CYPE issue(s) into Project Topics.`;
    this.onStateChanged.trigger();
  }

  async publishContribution(
    name: string,
    discipline: CypeContributionItem["discipline"] = "Coordination",
    fileName = "coordination_package.ifc"
  ) {
    const cleanName = name.trim() || `Master BIM Snapshot (${new Date().toLocaleTimeString()})`;
    if (this.auth.mode === "live-cype" && this.auth.sessionId.trim()) {
      try {
        await this.callProxy("/contributions", "POST", {
          project_id: Number(this.selectedProjectId) || this.selectedProjectId,
          name: cleanName,
          description: `Published from Master BIM Viewer (${discipline})`,
        });
        await this.fetchProjectContributions(this.selectedProjectId);
        this.syncStatus = `Published contribution "${cleanName}" to BIMserver.center!`;
        this.onStateChanged.trigger();
        return;
      } catch (err: any) {
        this.syncStatus = `BIMserver publish failed: ${err?.message || err}`;
        this.onStateChanged.trigger();
        return;
      }
    }

    const published: CypeContributionItem = {
      id: `cype-pub-${Date.now()}`,
      projectId: this.selectedProjectId,
      name: cleanName,
      appSource: "Master BIM Viewer",
      discipline,
      version: `Rev 0${this.contributions.length + 1}`,
      sizeLabel: "OpenBIM IFC",
      modifiedAt: "Just now",
      ifcFileName: fileName,
      streamUrl: "/models/ifc/aurora_ten_villa_estate_ifc4.ifc",
    };
    this.contributions = [published, ...this.contributions];
    this.syncStatus = `Published OpenBIM contribution "${cleanName}" (${discipline}).`;
    this.onStateChanged.trigger();
  }

  dispose() {
    this.onStateChanged.reset();
    this.onLoadIfcRequested.reset();
    this.onImportIssueRequested.reset();
    this.onDisposed.trigger();
    this.onDisposed.reset();
  }
}


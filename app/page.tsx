"use client";

import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { HOSPITAL_UNITS, getUnitLoginEmail } from "@/lib/units";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PageKey = "home" | "report" | "investigation" | "quality";
type Grade = "BIRU" | "HIJAU" | "KUNING" | "MERAH";

type Incident = {
  id: string;
  date: string;
  reportedAt: string;
  patient: string;
  room: string;
  incident: string;
  grade: Grade;
  status: string;
};

type UserProfile = { unit: string; role: "pelapor" | "karu" | "pmkp" };

const pageTitles: Record<PageKey, string> = {
  home: "Beranda",
  report: "Buat Laporan IKP",
  investigation: "Investigasi",
  quality: "Laporan Saya",
};

function Icon({
  name,
  size = 19,
}: {
  name: string;
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    report: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8" /></>,
    investigation: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /></>,
    chart: <><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-5 5" /><path d="M19 14V9h-5" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6" /></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11" /><path d="m9 12 2 2 4-4" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    close: <><path d="m18 6-12 12M6 6l12 12" /></>,
    upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m17 8-5-5-5 5M12 3v12" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name] ?? paths.report}
    </svg>
  );
}

function GradeBadge({ grade }: { grade: Grade }) {
  const labels: Record<Grade, string> = {
    BIRU: "Rendah",
    HIJAU: "Sedang",
    KUNING: "Tinggi",
    MERAH: "Ekstrem",
  };
  return (
    <span className={`grade-badge grade-${grade.toLowerCase()}`}>
      <span className="grade-dot" />
      {grade}
      <span className="grade-level">{labels[grade]}</span>
    </span>
  );
}

function Field({
  label,
  children,
  className = "",
  hint,
}: {
  label: string;
  children: ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

function AuthScreen({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children?: ReactNode;
}) {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="brand-mark auth-brand-mark"><span>+</span></div>
        <div className="brand-name auth-brand-name">e-ikp<span>.</span></div>
        <div className="brand-subtitle auth-brand-subtitle">RSUD MERAH PUTIH</div>
        <h1>{title}</h1>
        <p>{message}</p>
        {children}
      </section>
    </main>
  );
}

export default function Portal() {
  const [page, setPage] = useState<PageKey>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [notification, setNotification] = useState("");
  const [search, setSearch] = useState("");
  const [gradeFilter, setGradeFilter] = useState("Semua grading");
  const [reportGrade, setReportGrade] = useState<Grade | null>(null);
  const [reportImpact, setReportImpact] = useState("");
  const [reportProbability, setReportProbability] = useState("");
  const [fileName, setFileName] = useState("");
  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [configurationError, setConfigurationError] = useState("");

  useEffect(() => {
    let active = true;
    let client: ReturnType<typeof createSupabaseBrowserClient>;

    try {
      client = createSupabaseBrowserClient();
      if (active) setSupabase(client);
    } catch (error) {
      setConfigurationError(error instanceof Error ? error.message : "Konfigurasi Supabase tidak valid.");
      setAuthReady(true);
      return;
    }

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (active) setSession(nextSession);
    });

    void client.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setAuthError(`Gagal memeriksa sesi: ${error.message}`);
      setSession(data.session);
      setAuthReady(true);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user.id) {
      setProfile(null);
      setIncidents([]);
      return;
    }

    let active = true;
    setProfile(null);
    setReportsLoading(true);
    setAuthError("");

    void supabase
      .from("user_profiles")
      .select("unit, role")
      .eq("id", session.user.id)
      .single()
      .then(async ({ data: userProfile, error: profileError }) => {
        if (!active) return;
        if (profileError) {
          setAuthError(`Profil akun tidak ditemukan: ${profileError.message}`);
          setReportsLoading(false);
          return;
        }
        if (userProfile.role !== "pelapor" || !HOSPITAL_UNITS.includes(userProfile.unit)) {
          setAuthError("Akun ini bukan akun Pelapor yang terdaftar.");
          setReportsLoading(false);
          await supabase.auth.signOut();
          return;
        }

        setProfile(userProfile as UserProfile);
        const { data: rows, error: reportsError } = await supabase
          .from("incident_reports")
          .select("id, report_code, reported_at, patient_name, room, incident_summary, initial_grade, final_grade, status")
          .order("reported_at", { ascending: false });

        if (!active) return;
        if (reportsError) {
          setAuthError(`Gagal memuat laporan: ${reportsError.message}`);
          setReportsLoading(false);
          return;
        }

        setIncidents(
          (rows ?? []).map((row) => ({
            id: row.report_code,
            date: new Date(row.reported_at).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            reportedAt: row.reported_at,
            patient: row.patient_name,
            room: row.room,
            incident: row.incident_summary,
            grade: (row.final_grade ?? row.initial_grade ?? "BIRU") as Grade,
            status: reportStatusLabel(row.status),
          })),
        );
        setReportsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [session?.user.id, supabase]);

  const filteredIncidents = incidents.filter((incident) => {
    const matchesText = `${incident.id} ${incident.patient} ${incident.room} ${incident.incident}`
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesGrade = gradeFilter === "Semua grading" || incident.grade === gradeFilter;
    return matchesText && matchesGrade;
  });

  function showNotice(message: string) {
    setNotification(message);
    window.setTimeout(() => setNotification(""), 5000);
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !selectedUnit) return;

    setAuthBusy(true);
    setAuthError("");
    const { error } = await supabase.auth.signInWithPassword({
      email: getUnitLoginEmail(selectedUnit),
      password,
    });
    setAuthBusy(false);
    if (error) setAuthError(`Login gagal: ${error.message}`);
  }

  async function handleLogout() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setAuthError(`Gagal keluar: ${error.message}`);
    else {
      setPage("home");
      setPassword("");
    }
  }

  async function refreshReports() {
    if (!supabase) return;
    setReportsLoading(true);
    const { data: rows, error } = await supabase
      .from("incident_reports")
      .select("id, report_code, reported_at, patient_name, room, incident_summary, initial_grade, final_grade, status")
      .order("reported_at", { ascending: false });

    if (error) {
      setAuthError(`Gagal memuat laporan: ${error.message}`);
      setReportsLoading(false);
      return;
    }

    setIncidents(
      (rows ?? []).map((row) => ({
        id: row.report_code,
        date: new Date(row.reported_at).toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        reportedAt: row.reported_at,
        patient: row.patient_name,
        room: row.room,
        incident: row.incident_summary,
        grade: (row.final_grade ?? row.initial_grade ?? "BIRU") as Grade,
        status: reportStatusLabel(row.status),
      })),
    );
    setReportsLoading(false);
  }

  async function handleReportSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase || !session?.user.id || !profile) {
      setAuthError("Sesi login tidak tersedia. Silakan login kembali.");
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const impact = String(formData.get("impact") ?? "");
    const probability = String(formData.get("probability") ?? "");
    const grade = calculateGrade(impact, probability);
    const file = formData.get("attachment");

    if (file instanceof File && file.size > 10 * 1024 * 1024) {
      showNotice("Ukuran lampiran melebihi batas 10 MB.");
      return;
    }
    if (file instanceof File && file.size > 0 && !["image/jpeg", "image/png", "application/pdf"].includes(file.type)) {
      showNotice("Lampiran harus berupa JPG, PNG, atau PDF.");
      return;
    }

    setReportSubmitting(true);
    setAuthError("");
    const reportId = crypto.randomUUID();
    let attachmentPath: string | null = null;

    if (file instanceof File && file.size > 0) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      attachmentPath = `${session.user.id}/${reportId}/${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from("ikp-attachments")
        .upload(attachmentPath, file, { contentType: file.type, upsert: false });

      if (uploadError) {
        setReportSubmitting(false);
        showNotice(`Lampiran gagal diunggah: ${uploadError.message}`);
        return;
      }
    }

    const payload = {
      id: reportId,
      created_by: session.user.id,
      reported_at: new Date(`${String(formData.get("reported_at"))}T12:00:00+07:00`).toISOString(),
      patient_name: String(formData.get("patient_name") ?? "").trim(),
      medical_record_number: String(formData.get("medical_record_number") ?? "").trim(),
      room: profile.unit,
      patient_age: String(formData.get("patient_age") ?? "").trim(),
      age_group: String(formData.get("age_group") ?? ""),
      gender: String(formData.get("gender") ?? ""),
      payer: String(formData.get("payer") ?? ""),
      incident_date: String(formData.get("incident_date") ?? ""),
      incident_time: String(formData.get("incident_time") ?? ""),
      incident_summary: String(formData.get("incident_summary") ?? "").trim(),
      chronology: String(formData.get("chronology") ?? "").trim(),
      incident_type: String(formData.get("incident_type") ?? ""),
      related_service: String(formData.get("related_service") ?? ""),
      impact,
      probability,
      first_reporter: String(formData.get("first_reporter") ?? ""),
      incident_concerns: String(formData.get("incident_concerns") ?? ""),
      incident_location: String(formData.get("incident_location") ?? "").trim(),
      responsible_department: String(formData.get("responsible_department") ?? ""),
      immediate_action: String(formData.get("immediate_action") ?? "").trim(),
      action_taken_by: String(formData.get("action_taken_by") ?? ""),
      happened_before: formData.get("happened_before") === "Ya",
      previous_prevention: String(formData.get("previous_prevention") ?? "").trim() || null,
      reporter_name: String(formData.get("reporter_name") ?? "").trim(),
      initial_grade: grade,
      status: "submitted",
      attachment_path: attachmentPath,
    };

    const { error } = await supabase.from("incident_reports").insert(payload);
    if (error) {
      if (attachmentPath) {
        const { error: cleanupError } = await supabase.storage
          .from("ikp-attachments")
          .remove([attachmentPath]);
        if (cleanupError) {
          setAuthError(`Laporan gagal disimpan (${error.message}); pembersihan lampiran juga gagal (${cleanupError.message}).`);
        } else {
          setAuthError(`Laporan gagal disimpan: ${error.message}`);
        }
      } else {
        setAuthError(`Laporan gagal disimpan: ${error.message}`);
      }
      setReportSubmitting(false);
      return;
    }

    form.reset();
    setReportGrade(null);
    setReportImpact("");
    setReportProbability("");
    setFileName("");
    await refreshReports();
    setReportSubmitting(false);
    setPage("quality");
    showNotice("Laporan berhasil disimpan ke Supabase.");
  }

  const navItems: { key: PageKey; label: string; icon: string }[] = [
    { key: "home", label: "Beranda", icon: "home" },
    { key: "report", label: "Buat Laporan", icon: "report" },
    { key: "quality", label: "Laporan Saya", icon: "chart" },
  ];
  const gradeCounts: Record<Grade, number> = {
    BIRU: incidents.filter((incident) => incident.grade === "BIRU").length,
    HIJAU: incidents.filter((incident) => incident.grade === "HIJAU").length,
    KUNING: incidents.filter((incident) => incident.grade === "KUNING").length,
    MERAH: incidents.filter((incident) => incident.grade === "MERAH").length,
  };
  const totalReports = incidents.length;
  const monthlySummary = getMonthlyReportCounts(incidents);
  const maxMonthlyReports = Math.max(1, ...monthlySummary.map((item) => item.count));
  const gradeRing = getGradeRing(gradeCounts, totalReports);

  if (!authReady) {
    return <AuthScreen title="Memeriksa sesi" message="Menghubungkan ke Supabase..." />;
  }

  if (configurationError) {
    return <AuthScreen title="Konfigurasi Supabase belum siap" message={configurationError} />;
  }

  if (!session) {
    return (
      <AuthScreen title="Masuk ke E-IKP" message="Pilih unit kerja sebagai username. Akun uji coba harus dibuat di Supabase Auth terlebih dahulu.">
        <form className="login-form" onSubmit={handleLogin}>
          <label className="field">
            <span className="field-label">Username / unit</span>
            <select required value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)}>
              <option value="" disabled>Pilih unit kerja</option>
              {HOSPITAL_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Password</span>
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {authError && <p className="auth-error" role="alert">{authError}</p>}
          <button className="button button-primary login-submit" disabled={authBusy || !selectedUnit}>
            {authBusy ? "Memeriksa akun..." : "Masuk"}
          </button>
          <p className="login-safety">Akun yang tersedia saat ini adalah akun Pelapor untuk uji coba. Jangan gunakan data pasien nyata dengan password bersama.</p>
        </form>
      </AuthScreen>
    );
  }

  if (!profile) {
    return (
      <AuthScreen title="Profil akun tidak tersedia" message={authError || "Memeriksa hak akses unit..."}>
        {authError && <button className="button button-secondary auth-logout" onClick={() => void handleLogout()}>Kembali ke login</button>}
      </AuthScreen>
    );
  }

  return (
    <main className="app-shell">
      {sidebarOpen && <button className="mobile-scrim" aria-label="Tutup menu" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><span>+</span></div>
          <div>
            <div className="brand-name">e-ikp<span>.</span></div>
            <div className="brand-subtitle">RSUD MERAH PUTIH</div>
          </div>
          <button className="icon-button sidebar-close" aria-label="Tutup menu" onClick={() => setSidebarOpen(false)}>
            <Icon name="close" />
          </button>
        </div>

        <div className="nav-caption">MENU UTAMA</div>
        <nav className="main-nav" aria-label="Navigasi utama">
          {navItems.map((item) => (
            <button
              key={item.key}
              className={`nav-item ${page === item.key ? "nav-item-active" : ""}`}
              onClick={() => {
                setPage(item.key);
                setSidebarOpen(false);
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.key === "report" && <span className="nav-new"><Icon name="plus" size={14} /></span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="help-card">
            <div className="help-icon"><Icon name="shield" size={18} /></div>
            <div className="help-title">Butuh bantuan?</div>
            <p>Hubungi tim PMKP untuk bantuan pelaporan.</p>
            <button onClick={() => showNotice("Silakan hubungi tim PMKP RSUD Merah Putih.")}>Hubungi PMKP <Icon name="arrow" size={14} /></button>
          </div>
          <div className="sidebar-foot">© 2026 RSUD Merah Putih <span>v1.0 UI</span></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="topbar-leading">
            <button className="icon-button menu-button" aria-label="Buka menu" onClick={() => setSidebarOpen(true)}><Icon name="menu" /></button>
            <div className="breadcrumb"><span>Portal E-IKP</span><b>/</b><strong>{pageTitles[page]}</strong></div>
          </div>
          <div className="topbar-actions">
            <span className="demo-indicator"><i /> Uji coba</span>
            <button className="icon-button notification-button" aria-label="Notifikasi" onClick={() => showNotice("Belum ada notifikasi baru.")}>
              <Icon name="bell" /><span />
            </button>
            <div className="user-profile">
              <div className="avatar">{profile.unit.slice(0, 2)}</div>
              <div className="user-copy"><strong>{profile.unit}</strong><span>Pelapor</span></div>
              <button className="button button-secondary logout-button" onClick={() => void handleLogout()}>Keluar</button>
            </div>
          </div>
        </header>

        {notification && <div className="toast" role="status">{notification}<button aria-label="Tutup notifikasi" onClick={() => setNotification("")}><Icon name="close" size={16} /></button></div>}

        <div className="page-content">
          {page === "home" && (
            <div className="page-stack">
              <div className="welcome-row">
                <div>
                  <div className="eyebrow"><span className="eyebrow-line" /> SISTEM KESELAMATAN PASIEN</div>
                  <h1>Selamat datang di <span>e-IKP</span></h1>
                  <p className="page-lead">Pusat pelaporan dan tindak lanjut Insiden Keselamatan Pasien.</p>
                </div>
                <button className="button button-primary" onClick={() => setPage("report")}><Icon name="plus" size={17} /> Buat laporan baru</button>
              </div>

              <section className="hero-panel">
                <div className="hero-pattern" />
                <div className="hero-copy">
                  <span className="hero-tag"><Icon name="shield" size={14} /> KESELAMATAN PASIEN ADALAH PRIORITAS</span>
                  <h2>Laporkan insiden.<br /><span>Bangun layanan lebih aman.</span></h2>
                  <p>Setiap laporan membantu kita belajar dan memperbaiki sistem. Laporkan dengan aman, tanpa budaya menyalahkan.</p>
                  <button className="hero-button" onClick={() => setPage("report")}>Mulai pelaporan <Icon name="arrow" size={16} /></button>
                </div>
                <div className="hero-illustration" aria-hidden="true">
                  <div className="illustration-ring ring-one" /><div className="illustration-ring ring-two" />
                  <div className="shield-card"><Icon name="shield" size={58} /><span>Patient<br />Safety</span></div>
                  <div className="float-pill pill-one">✓ Aman & rahasia</div>
                  <div className="float-pill pill-two"><span /> Fokus perbaikan sistem</div>
                </div>
              </section>

              <section className="metric-grid" aria-label="Ringkasan laporan">
                <MetricCard title="Laporan saya" value={String(totalReports)} note="Tersimpan di Supabase" icon="report" tone="red" />
                <MetricCard title="Menunggu tindak lanjut" value={String(incidents.filter((item) => item.status === "Terkirim").length)} note="Laporan terkirim" icon="clock" tone="amber" />
                <MetricCard title="Risiko tinggi / ekstrem" value={String(gradeCounts.KUNING + gradeCounts.MERAH)} note="Berdasarkan grading awal" icon="shield" tone="green" />
                <MetricCard title="Dalam investigasi" value={String(incidents.filter((item) => item.status === "Dalam investigasi").length)} note="Status tindak lanjut" icon="chart" tone="blue" />
              </section>

              <section className="home-panels">
                <div className="panel trend-panel">
                  <div className="panel-heading">
                    <div><h3>Ringkasan pelaporan</h3><p>Tren laporan insiden dalam 6 bulan terakhir</p></div>
                    <button className="select-like" onClick={() => showNotice("Periode yang ditampilkan: 6 bulan terakhir.")}>6 bulan terakhir <span>⌄</span></button>
                  </div>
                  <div className="chart-legend"><span><i className="legend-red" /> Laporan masuk</span><span><i className="legend-pale" /> Target</span></div>
                  <div className="bar-chart" aria-label="Grafik ringkasan laporan 6 bulan">
                    {monthlySummary.map(({ month, count }) => (
                      <div className="bar-column" key={month}>
                        <div className="bar-track"><div className="bar-value" style={{ height: `${(count / maxMonthlyReports) * 100}%` }} /></div>
                        <span>{month}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel grade-panel">
                  <div className="panel-heading"><div><h3>Grading risiko</h3><p>Distribusi laporan akun ini</p></div><button className="more-button" aria-label="Menu lainnya">•••</button></div>
                  <div className="grade-ring-wrap">
                    <div className="grade-ring" style={{ background: gradeRing }}><div><strong>{totalReports}</strong><span>laporan</span></div></div>
                    <div className="grade-legend">
                      <GradeLegend name="Merah" count={String(gradeCounts.MERAH)} percentage={percentage(gradeCounts.MERAH, totalReports)} tone="red" />
                      <GradeLegend name="Kuning" count={String(gradeCounts.KUNING)} percentage={percentage(gradeCounts.KUNING, totalReports)} tone="amber" />
                      <GradeLegend name="Hijau" count={String(gradeCounts.HIJAU)} percentage={percentage(gradeCounts.HIJAU, totalReports)} tone="green" />
                      <GradeLegend name="Biru" count={String(gradeCounts.BIRU)} percentage={percentage(gradeCounts.BIRU, totalReports)} tone="blue" />
                    </div>
                  </div>
                  <button className="text-link" onClick={() => setPage("quality")}>Lihat laporan saya <Icon name="arrow" size={15} /></button>
                </div>
              </section>

              <section className="panel recent-panel">
                <div className="panel-heading">
                  <div><h3>Laporan terbaru</h3><p>Ringkasan laporan dari unit {profile.unit}</p></div>
                  <button className="text-link" onClick={() => setPage("quality")}>Lihat semua <Icon name="arrow" size={15} /></button>
                </div>
                {reportsLoading ? <div className="empty-state">Memuat laporan...</div> : incidents.length === 0 ? <div className="empty-state">Belum ada laporan dari unit ini.</div> : <IncidentTable incidents={incidents.slice(0, 3)} onGrade={() => {}} compact />}
              </section>

              <div className="privacy-note"><Icon name="shield" size={16} /><span><strong>Budaya adil dan belajar.</strong> Informasi laporan digunakan untuk peningkatan mutu dan keselamatan pasien.</span></div>
            </div>
          )}

          {page === "report" && (
            <div className="page-stack">
              <div className="page-heading-row">
                <div><div className="eyebrow"><span className="eyebrow-line" /> FORMULIR PELAPORAN</div><h1>Buat laporan <span>IKP</span></h1><p className="page-lead">Isi informasi kejadian dengan lengkap. Data pasien hanya boleh dimasukkan pada sistem resmi yang sudah terhubung.</p></div>
                <span className="step-pill"><span>1</span> Laporan baru</span>
              </div>
              <div className="notice-banner"><Icon name="shield" /><div><strong>Pelaporan aman & rahasia</strong><span>Fokus laporan ini adalah perbaikan sistem, bukan menyalahkan individu.</span></div></div>
              {authError && <p className="auth-error form-error" role="alert">{authError}</p>}
              <form className="form-card" onSubmit={handleReportSubmit}>
                <FormSection number="01" title="Data pasien" description="Informasi dasar pasien yang terkait dengan insiden.">
                  <div className="form-grid">
                    <Field label="Nama pasien"><input required name="patient_name" type="text" placeholder="Masukkan nama sesuai data resmi" /></Field>
                    <Field label="Nomor rekam medis"><input required name="medical_record_number" type="text" placeholder="Contoh: 00-12-34" /></Field>
                    <Field label="Ruangan / unit pelapor"><input value={profile.unit} readOnly aria-readonly="true" /></Field>
                    <Field label="Umur pasien"><input required name="patient_age" type="text" placeholder="Contoh: 45 tahun" /></Field>
                    <Field label="Kelompok umur"><select required name="age_group" defaultValue=""><option value="" disabled>Pilih kelompok umur</option><option>0–1 bulan</option><option>&gt;1 bulan–1 tahun</option><option>&gt;1–5 tahun</option><option>&gt;5–15 tahun</option><option>&gt;15–30 tahun</option><option>&gt;30–65 tahun</option><option>&gt;65 tahun</option></select></Field>
                    <Field label="Jenis kelamin"><select required name="gender" defaultValue=""><option value="" disabled>Pilih jenis kelamin</option><option>Laki-laki</option><option>Perempuan</option></select></Field>
                    <Field label="Penanggung biaya"><select required name="payer" defaultValue=""><option value="" disabled>Pilih penanggung biaya</option><option>BPJS</option><option>Pribadi</option><option>Asuransi swasta</option><option>Jamkesda</option><option>Perusahaan</option><option>Lainnya</option></select></Field>
                  </div>
                </FormSection>

                <FormSection number="02" title="Rincian kejadian" description="Jelaskan apa yang terjadi, kapan, dan bagaimana dampaknya.">
                  <div className="form-grid">
                    <Field label="Tanggal insiden"><input required name="incident_date" type="date" /></Field>
                    <Field label="Waktu insiden"><input required name="incident_time" type="time" /></Field>
                    <Field label="Jenis insiden"><select required name="incident_type" defaultValue=""><option value="" disabled>Pilih jenis insiden</option><option value="KPC">Kondisi Potensial Cedera (KPC)</option><option value="KNC">Kejadian Nyaris Cedera (KNC)</option><option value="KTC">Kejadian Tidak Cedera (KTC)</option><option value="KTD">Kejadian Tidak Diharapkan (KTD)</option><option value="Sentinel">Kejadian Sentinel</option></select></Field>
                    <Field label="Insiden menyangkut"><select required name="incident_concerns" defaultValue=""><option value="" disabled>Pilih jenis pelayanan</option><option>Pasien rawat inap</option><option>Pasien rawat jalan</option><option>Pasien IGD</option><option>Lainnya</option></select></Field>
                    <Field label="Terkait pelayanan / pemeriksaan" className="field-full"><select required name="related_service" defaultValue=""><option value="" disabled>Pilih pelayanan</option><option>Penyakit Dalam dan Subspesialisasinya</option><option>Anak dan Subspesialisasinya</option><option>Bedah dan Subspesialisasinya</option><option>Obstetri Gynekologi dan Subspesialisasinya</option><option>THT dan Subspesialisasinya</option><option>Mata dan Subspesialisasinya</option><option>Saraf dan Subspesialisasinya</option><option>Anastesi dan Subspesialisasinya</option><option>Kulit & Kelamin dan Subspesialisasinya</option><option>Jantung dan Subspesialisasinya</option><option>Paru dan Subspesialisasinya</option><option>Jiwa dan Subspesialisasinya</option><option>Urologi dan Subspesialisasinya</option><option>Orthopedi dan Subspesialisasinya</option><option>Lain-lain</option></select></Field>
                    <Field label="Insiden (ringkasan)" className="field-full"><input required name="incident_summary" type="text" placeholder="Contoh: keterlambatan pemberian obat" /></Field>
                    <Field label="Kronologi kejadian" className="field-full"><textarea required name="chronology" rows={4} placeholder="Tuliskan urutan kejadian secara faktual dan jelas..." /></Field>
                    <Field label="Dampak terhadap pasien"><select required name="impact" defaultValue="" onChange={(event) => {
                      const impact = event.target.value;
                      setReportImpact(impact);
                      if (reportProbability) setReportGrade(calculateGrade(impact, reportProbability));
                    }}><option value="" disabled>Pilih dampak</option><option value="5">Kematian</option><option value="4">Cedera berat / irreversibel</option><option value="3">Cedera sedang / reversibel</option><option value="2">Cedera ringan</option><option value="1">Tidak ada cedera</option></select></Field>
                    <Field label="Probabilitas"><select required name="probability" defaultValue="" onChange={(event) => {
                      const probability = event.target.value;
                      setReportProbability(probability);
                      if (reportImpact) setReportGrade(calculateGrade(reportImpact, probability));
                    }}><option value="" disabled>Pilih kemungkinan terjadi</option><option value="1">Sangat jarang (&gt;5 tahun/kali)</option><option value="2">Jarang (&gt;2–5 tahun/kali)</option><option value="3">Mungkin (1–2 tahun/kali)</option><option value="4">Sering (beberapa kali/tahun)</option><option value="5">Sangat sering (tiap minggu/bulan)</option></select></Field>
                    <Field label="Lokasi kejadian"><input required name="incident_location" type="text" placeholder="Contoh: Ruang Melati" /></Field>
                    <Field label="Departemen terkait"><select required name="responsible_department" defaultValue=""><option value="" disabled>Pilih unit terkait</option>{HOSPITAL_UNITS.map((unit) => <option key={unit}>{unit}</option>)}</select></Field>
                    <Field label="Tindakan segera" className="field-full"><textarea required name="immediate_action" rows={3} placeholder="Tindakan yang dilakukan setelah insiden dan hasilnya..." /></Field>
                    <Field label="Dilakukan oleh"><select required name="action_taken_by" defaultValue=""><option value="" disabled>Pilih</option><option>Tim</option><option>Dokter</option><option>Perawat</option><option>Bidan</option><option>Petugas lainnya</option></select></Field>
                    <Field label="Pernah terjadi sebelumnya?"><select required name="happened_before" defaultValue=""><option value="" disabled>Pilih jawaban</option><option>Ya</option><option>Tidak</option></select></Field>
                    <Field label="Tindakan pencegahan sebelumnya"><input name="previous_prevention" type="text" placeholder="Jika pernah, jelaskan singkat" /></Field>
                    <Field label="Lampiran foto / dokumen" className="field-full">
                      <label className="upload-field">
                        <input name="attachment" type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} />
                        <span className="upload-icon"><Icon name="upload" /></span>
                        <span><strong>{fileName || "Pilih file atau tarik ke sini"}</strong><small>JPG, PNG, atau PDF. Maksimal 10 MB.</small></span>
                        <span className="upload-browse">Pilih file</span>
                      </label>
                    </Field>
                  </div>
                  {reportGrade && <div className="grading-preview"><div><strong>Grading risiko otomatis</strong><span>Estimasi awal berdasarkan dampak × probabilitas. Verifikasi tetap dilakukan atasan.</span></div><GradeBadge grade={reportGrade} /></div>}
                </FormSection>

                <FormSection number="03" title="Identitas pelapor" description="Informasi pelapor dan penerima laporan.">
                  <div className="form-grid">
                    <Field label="Nama pelapor"><input required name="reporter_name" type="text" placeholder="Nama lengkap pelapor" /></Field>
                    <Field label="Tanggal melapor"><input required name="reported_at" type="date" defaultValue={new Date().toISOString().slice(0, 10)} /></Field>
                    <Field label="Orang pertama yang melapor"><select required name="first_reporter" defaultValue=""><option value="" disabled>Pilih pelapor pertama</option><option>Karyawan (dokter / perawat / lainnya)</option><option>Pasien</option><option>Keluarga / pendamping</option><option>Pengunjung</option><option>Lainnya</option></select></Field>
                  </div>
                </FormSection>
                <div className="form-footer"><span><Icon name="shield" size={16} /> Laporan disimpan untuk unit {profile.unit}.</span><button className="button button-primary" type="submit" disabled={reportSubmitting}>{reportSubmitting ? "Menyimpan..." : "Simpan laporan"} <Icon name="arrow" size={16} /></button></div>
              </form>
            </div>
          )}

          {page === "investigation" && (
            <section className="panel role-placeholder">
              <div className="modal-icon"><Icon name="shield" size={22} /></div>
              <h2>Fitur investigasi belum tersedia untuk akun Pelapor</h2>
              <p>Investigasi akan diaktifkan setelah akun Kepala Ruangan/PMKP dan policy aksesnya disiapkan.</p>
            </section>
          )}

          {page === "quality" && (
            <div className="page-stack">
              <div className="page-heading-row">
                <div><div className="eyebrow"><span className="eyebrow-line" /> LAPORAN UNIT</div><h1>Laporan <span>saya</span></h1><p className="page-lead">Data dibatasi oleh hak akses akun Pelapor unit {profile.unit}.</p></div>
                <button className="button button-secondary" onClick={() => void refreshReports()} disabled={reportsLoading}><Icon name="clock" size={16} /> Muat ulang</button>
              </div>
              <div className="filter-toolbar">
                <div className="search-field"><Icon name="search" size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari ID, pasien, unit, atau insiden..." /></div>
                <select value={gradeFilter} onChange={(event) => setGradeFilter(event.target.value)} aria-label="Filter grading"><option>Semua grading</option><option>BIRU</option><option>HIJAU</option><option>KUNING</option><option>MERAH</option></select>
                <span className="data-count">{incidents.length} laporan</span>
              </div>
              <section className="metric-grid dashboard-metrics">
                <MetricCard title="Total laporan" value={String(totalReports)} note="Laporan unit ini" icon="report" tone="red" />
                <MetricCard title="Biru" value={String(gradeCounts.BIRU)} note="Risiko rendah" icon="chart" tone="blue" />
                <MetricCard title="Hijau" value={String(gradeCounts.HIJAU)} note="Risiko sedang" icon="shield" tone="green" />
                <MetricCard title="Kuning / merah" value={String(gradeCounts.KUNING + gradeCounts.MERAH)} note="Perlu perhatian" icon="clock" tone="amber" />
              </section>
              {authError && <p className="auth-error form-error" role="alert">{authError}</p>}
              <section className="panel data-panel">
                <div className="panel-heading"><div><h3>Daftar laporan insiden</h3><p>Data aktual dari Supabase, dibatasi oleh Row Level Security</p></div><span className="data-count">{filteredIncidents.length} laporan</span></div>
                {reportsLoading ? <div className="empty-state">Memuat laporan dari Supabase...</div> : filteredIncidents.length === 0 ? <div className="empty-state">Belum ada laporan yang cocok.</div> : <IncidentTable incidents={filteredIncidents} onGrade={() => {}} compact />}
                <div className="table-footnote"><span><i /> Unit: {profile.unit}</span><span>Akses akun Pelapor</span></div>
              </section>
            </div>
          )}
        </div>
      </section>

    </main>
  );
}

function MetricCard({ title, value, note, icon, tone, suffix }: { title: string; value: string; note: string; icon: string; tone: string; suffix?: string }) {
  return <article className="metric-card"><div className={`metric-icon metric-${tone}`}><Icon name={icon} size={19} /></div><div className="metric-title">{title}</div><div className="metric-value">{value}{suffix && <small> {suffix}</small>}</div><div className={`metric-note ${tone === "red" ? "note-up" : ""}`}><span>{tone === "red" ? "↗" : "•"}</span> {note}</div></article>;
}

function GradeLegend({ name, count, percentage, tone }: { name: string; count: string; percentage: string; tone: string }) {
  return <div className="grade-legend-row"><i className={`legend-${tone}`} /><span>{name}</span><strong>{count}</strong><small>{percentage}</small></div>;
}

function FormSection({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <section className="form-section"><div className="form-section-heading"><span className="section-number">{number}</span><div><h2>{title}</h2><p>{description}</p></div></div>{children}</section>;
}

function IncidentTable({ incidents, onGrade, compact = false }: { incidents: Incident[]; onGrade: (incident: Incident) => void; compact?: boolean }) {
  return (
    <div className={`table-scroll ${compact ? "table-compact" : ""}`}>
      <table className="incident-table">
        <thead><tr><th>ID laporan</th><th>Tanggal</th><th>Pasien / unit</th><th>Ringkasan insiden</th><th>Grading</th><th>Status</th>{!compact && <th />}</tr></thead>
        <tbody>
          {incidents.map((incident) => (
            <tr key={incident.id}>
              <td><strong className="report-id">{incident.id}</strong></td>
              <td className="date-cell">{incident.date}</td>
              <td><strong>{incident.patient}</strong><span className="cell-subtitle">{incident.room}</span></td>
              <td className="incident-summary">{incident.incident}</td>
              <td><GradeBadge grade={incident.grade} /></td>
              <td><span className="status-text"><i className={`status-dot status-${incident.status === "Selesai" ? "green" : incident.status === "Dalam investigasi" ? "blue" : "amber"}`} />{incident.status}</span></td>
              {!compact && <td><button className="table-action" onClick={() => onGrade(incident)}>Verifikasi</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function calculateGrade(impactValue: string, probabilityValue: string): Grade {
  const impact = Number(impactValue);
  const probability = Number(probabilityValue);
  const matrix: Record<number, Grade[]> = {
    1: ["BIRU", "BIRU", "HIJAU", "KUNING", "MERAH"],
    2: ["BIRU", "BIRU", "HIJAU", "KUNING", "MERAH"],
    3: ["BIRU", "HIJAU", "KUNING", "MERAH", "MERAH"],
    4: ["HIJAU", "HIJAU", "KUNING", "MERAH", "MERAH"],
    5: ["HIJAU", "HIJAU", "KUNING", "MERAH", "MERAH"],
  };
  return matrix[probability]?.[impact - 1] ?? "BIRU";
}

function reportStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Draf",
    submitted: "Terkirim",
    investigating: "Dalam investigasi",
    completed: "Selesai",
    rejected: "Ditolak",
  };
  return labels[status] ?? status;
}

function percentage(value: number, total: number): string {
  return total ? `${Math.round((value / total) * 100)}%` : "0%";
}

function getGradeRing(counts: Record<Grade, number>, total: number): string {
  if (!total) return "#edf0f2";

  const colors: Record<Grade, string> = {
    MERAH: "#9b303a",
    KUNING: "#db9a31",
    HIJAU: "#3b9c74",
    BIRU: "#6295c7",
  };
  let current = 0;
  const stops = (Object.keys(colors) as Grade[]).map((grade) => {
    const start = current;
    current += (counts[grade] / total) * 100;
    return `${colors[grade]} ${start}% ${current}%`;
  });
  return `conic-gradient(${stops.join(", ")})`;
}

function getMonthlyReportCounts(incidents: Incident[]) {
  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      month: date.toLocaleDateString("id-ID", { month: "short" }),
      count: 0,
    };
  });
  const counts = new Map(months.map((month) => [month.key, month]));

  incidents.forEach((incident) => {
    const date = new Date(incident.reportedAt);
    if (Number.isNaN(date.getTime())) return;
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const month = counts.get(key);
    if (month) month.count += 1;
  });

  return months;
}

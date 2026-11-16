const API = "/.netlify/functions/api";
let session = null;
let bootstrap = null;
let currentPage = "dashboard";
let residentsCache = [];

const $ = (id) => document.getElementById(id);
const rupiah = (n) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));

async function api(action, data={}) {
  const res = await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,token:session?.token,...data})});
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); }
  catch (e) { throw new Error("Server tidak mengirim JSON yang valid. Periksa deployment backend."); }
  if (!json.ok && json.message?.includes("Sesi berakhir")) logout(false);
  return json;
}

function setIdentity(identity={}) {
  const housing = identity.nama_perumahan || "Perum Guwosari Blok 6B";
  const appName = identity.nama_aplikasi || "Sistem Informasi Warga dan Keuangan";
  $("loginHousing").textContent = housing.toUpperCase();
  $("loginAppName").textContent = appName;
  $("loginSubtitle").textContent = identity.subjudul || "Jimpitan · Ronda · Kewajiban · Keuangan";
  $("dashHousing").textContent = housing;
  $("dashAppName").textContent = appName;
  const color = identity.warna_utama || "#193B63";
  document.documentElement.style.setProperty("--blue",color);
  if (identity.logo_url) {
    $("loginLogo").innerHTML = `<img src="${escapeHtml(identity.logo_url)}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:inherit">`;
    $("dashLogo").innerHTML = `<img src="${escapeHtml(identity.logo_url)}" alt="Logo" style="width:100%;height:100%;object-fit:contain;border-radius:inherit">`;
  }
}

function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}

$("loginForm").addEventListener("submit", async (e)=>{
  e.preventDefault();
  $("loginMessage").textContent="Memeriksa akun…";
  try {
    const result = await api("login",{username:$("username").value.trim(),password:$("password").value});
    if (!result.ok) { $("loginMessage").textContent=result.message; return; }
    session = {token:result.token,user:result.user};
    sessionStorage.setItem("g6b_session",JSON.stringify(session));
    await loadDashboard();
  } catch(err) {
    $("loginMessage").textContent=err.message || "Tidak dapat menghubungi server.";
  }
});

$("logoutBtn").addEventListener("click",()=>logout(true));
$("sideNav").addEventListener("click",e=>{
  const btn=e.target.closest("[data-page]");
  if(!btn)return;
  currentPage=btn.dataset.page;
  renderPage();
});

async function loadDashboard(){
  const result=await api("bootstrap");
  if(!result.ok){$("loginMessage").textContent=result.message;return;}
  bootstrap=result;
  setIdentity(result.identity);
  $("loginView").classList.add("hidden");
  $("dashboardView").classList.remove("hidden");
  $("userLabel").textContent=`${session.user.name||session.user.username} · ${session.user.role==="admin"?"Admin":"Warga"}`;
  document.querySelectorAll(".admin-only").forEach(el=>el.style.display=session.user.role==="admin"?"block":"none");
  renderPage();
}

function renderPage(){
  document.querySelectorAll(".nav-item").forEach(el=>el.classList.toggle("active",el.dataset.page===currentPage));
  const admin=session.user.role==="admin";
  const titleMap={dashboard:"Dashboard",warga:"Data Warga",ronda:"Jadwal & Presensi Ronda",jimpitan:"Entri Jimpitan",setoran:"Setoran Jimpitan",kewajiban:"Kewajiban & Pembayaran",keuangan:"Penerimaan & Distribusi Kas",whatsapp:"Pusat WhatsApp",laporan:"Laporan",pengaturan:"Pengaturan Identitas"};
  let html=`<h1 class="page-title">${titleMap[currentPage]||"Dashboard"}</h1><p class="page-sub">Perum Guwosari Blok 6B · Sistem administrasi warga</p>`;
  if(currentPage==="dashboard") html+=dashboardHtml(admin);
  else if(currentPage==="warga" && admin) {
    html+=`<div class="card"><div class="muted">Memuat data 92 rumah…</div></div>`;
  }
  else if(currentPage==="pengaturan" && admin) html+=settingsHtml();
  else html+=`<div class="empty-state"><strong>Modul ${titleMap[currentPage]} masuk tahap pengerjaan berikutnya.</strong><p>Modul ini akan diaktifkan bertahap sesuai blueprint.</p></div>`;
  $("pageContent").innerHTML=html;
  if(currentPage==="pengaturan") bindSettings();
  if(currentPage==="warga" && admin) loadResidentsPage();
}

function dashboardHtml(admin){
  if(!admin){
    const r=bootstrap.resident||{};
    return `<div class="card"><div class="card-label">Selamat datang</div><h2>${escapeHtml(r.name||session.user.name||"Warga")}</h2><p>Rumah nomor ${escapeHtml(r.house_no||session.user.username)} · Status ${escapeHtml(r.status||"isi")}</p></div>
    <div class="grid" style="margin-top:14px"><div class="card"><div class="card-label">Tunggakan Jimpitan</div><div class="metric">—</div></div><div class="card"><div class="card-label">Denda Ronda</div><div class="metric">—</div></div></div>
    <div class="notice">Ringkasan kewajiban pribadi akan tampil setelah modul kewajiban diaktifkan.</div>`;
  }
  const s=bootstrap.stats||{};
  const pockets=bootstrap.pockets||[];
  return `<div class="grid">
    <div class="card"><div class="card-label">Jumlah rumah</div><div class="metric">${s.totalHouses||92}</div></div>
    <div class="card"><div class="card-label">Rumah isi</div><div class="metric">${s.occupied||0}</div></div>
    <div class="card"><div class="card-label">Rumah kosong</div><div class="metric">${s.empty||0}</div></div>
    <div class="card"><div class="card-label">Kewajiban aktif</div><div class="metric">—</div></div>
  </div>
  <h2 class="section-title">Saldo enam kantong kas</h2>
  <div class="two-col"><div class="card">${pockets.map(p=>`<div class="list-row"><span>${escapeHtml(p.name)}</span><strong>${rupiah(p.balance)}</strong></div>`).join("")}</div>
  <div class="card"><strong>Fondasi aplikasi aktif</strong><p class="muted">Database, login, identitas aplikasi, dan ringkasan rumah telah disiapkan. Fitur operasional akan ditambahkan bertahap.</p><span class="pill">Tahap 1 · Fondasi</span></div></div>`;
}

async function loadResidentsPage(){
  const host=$("pageContent");
  try {
    const result=await api("listResidents");
    if(!result.ok) throw new Error(result.message||"Gagal memuat data warga.");
    residentsCache=result.residents||[];
    renderResidentsTable();
  } catch(err) {
    host.innerHTML+=`<div class="notice">${escapeHtml(err.message)}</div>`;
  }
}

function renderResidentsTable(filter=""){
  const q=filter.trim().toLowerCase();
  const rows=residentsCache.filter(r=>r.house_no.includes(q)||r.name.toLowerCase().includes(q)||r.whatsapp.toLowerCase().includes(q));
  const host=$("pageContent");
  host.innerHTML=`
    <h1 class="page-title">Data Warga</h1>
    <p class="page-sub">Kelola identitas, nomor WhatsApp, status rumah, dan akun login untuk 92 rumah.</p>
    <div class="grid" style="margin-bottom:14px">
      <div class="card"><div class="card-label">Total rumah</div><div class="metric">${residentsCache.length}</div></div>
      <div class="card"><div class="card-label">Rumah isi</div><div class="metric">${residentsCache.filter(r=>r.status_rumah==="isi").length}</div></div>
      <div class="card"><div class="card-label">Rumah kosong</div><div class="metric">${residentsCache.filter(r=>r.status_rumah==="kosong").length}</div></div>
      <div class="card"><div class="card-label">Akun warga aktif</div><div class="metric">${residentsCache.filter(r=>r.has_account).length}</div></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <h2 class="section-title" style="margin-top:0">Ubah data rumah</h2>
      <form id="residentForm" class="resident-form">
        <div class="resident-fields">
          <label>Nomor rumah
            <select id="residentHouse" required>${residentsCache.map(r=>`<option value="${r.house_no}">${r.house_no}</option>`).join("")}</select>
          </label>
          <label>Nama warga
            <input id="residentName" maxlength="100" placeholder="Nama kepala keluarga / warga">
          </label>
          <label>Nomor WhatsApp
            <input id="residentWhatsapp" maxlength="25" placeholder="Contoh: 62812xxxxxxx">
          </label>
          <label>Status rumah
            <select id="residentStatus"><option value="isi">Isi</option><option value="kosong">Kosong</option></select>
          </label>
        </div>
        <div class="toolbar"><button class="btn primary" type="submit">Simpan data rumah</button><span id="residentMessage" class="muted-small" aria-live="polite"></span></div>
      </form>
    </div>
    <div class="toolbar"><input id="residentSearch" placeholder="Cari nomor rumah, nama, atau WhatsApp..." value="${escapeHtml(filter)}"><span class="muted-small">Pilih tombol Edit untuk memuat data ke formulir.</span></div>
    <div class="table-wrap"><table>
      <thead><tr><th>No. Rumah</th><th>Nama warga</th><th>WhatsApp</th><th>Status</th><th>Akun</th><th>Aksi</th></tr></thead>
      <tbody>${rows.map(r=>`<tr>
        <td><strong>${r.house_no}</strong></td>
        <td>${escapeHtml(r.name||"—")}</td>
        <td>${escapeHtml(r.whatsapp||"—")}</td>
        <td><span class="pill ${r.status_rumah==="kosong"?"gray":""}">${r.status_rumah==="kosong"?"Kosong":"Isi"}</span></td>
        <td><span class="pill ${r.has_account?"":"warn"}">${r.has_account?"Aktif":"Belum dibuat"}</span></td>
        <td><div class="row-actions"><button class="btn ghost edit-resident" data-house="${r.house_no}">Edit</button><button class="btn ghost account-resident" data-house="${r.house_no}">${r.has_account?"Atur ulang sandi":"Buat akun"}</button></div></td>
      </tr>`).join("")||`<tr><td colspan="6">Data tidak ditemukan.</td></tr>`}</tbody>
    </table></div>
    <p class="muted-small" style="margin-top:10px">Catatan: perubahan status rumah hanya memperbarui data rumah. Akun login dikelola terpisah melalui tombol Buat akun / Atur ulang sandi.</p>
  `;
  const house=$("residentHouse");
  const loadSelected=()=>{
    const r=residentsCache.find(x=>x.house_no===house.value);
    if(!r)return;
    $("residentName").value=r.name;
    $("residentWhatsapp").value=r.whatsapp;
    $("residentStatus").value=r.status_rumah;
  };
  house.addEventListener("change",loadSelected);
  loadSelected();
  $("residentSearch").addEventListener("input",e=>renderResidentsTable(e.target.value));
  $("residentForm").addEventListener("submit",async e=>{
    e.preventDefault();
    const msg=$("residentMessage");
    msg.textContent="Menyimpan…";
    const payload={house_no:house.value,name:$("residentName").value,whatsapp:$("residentWhatsapp").value,status_rumah:$("residentStatus").value};
    try{
      const result=await api("saveResident",{resident:payload});
      msg.textContent=result.message;
      if(result.ok){
        const fresh=await api("listResidents");
        if(fresh.ok){residentsCache=fresh.residents;renderResidentsTable($("residentSearch")?.value||"");}
      }
    }catch(err){msg.textContent=err.message;}
  });
  document.querySelectorAll(".edit-resident").forEach(btn=>btn.addEventListener("click",()=>{
    house.value=btn.dataset.house;loadSelected();
    $("residentForm").scrollIntoView({behavior:"smooth",block:"center"});
  }));
  document.querySelectorAll(".account-resident").forEach(btn=>btn.addEventListener("click",async()=>{
    const no=btn.dataset.house;
    const password = prompt(
  `Masukkan PIN rumah ${no} (tepat 6 digit angka):`
);
    if(password===null)return;
    if (!/^\d{6}$/.test(password)) {
  alert("PIN harus tepat 6 digit angka.");
  return;
}
    try{
      const result=await api("setResidentPassword",{house_no:no,password});
      alert(result.message);
      if(result.ok){const fresh=await api("listResidents");if(fresh.ok){residentsCache=fresh.residents;renderResidentsTable($("residentSearch")?.value||"");}}
    }catch(err){alert(err.message);}
  }));
}

function settingsHtml(){
  const i=bootstrap.identity||{};
  const fields=[["nama_perumahan","Nama perumahan"],["nama_aplikasi","Nama aplikasi"],["subjudul","Subjudul"],["logo_url","URL logo (sementara)"],["warna_utama","Warna utama"],["nama_bendahara","Nama bendahara"],["nama_bank","Nama bank"],["nomor_rekening","Nomor rekening"],["atas_nama_rekening","Atas nama rekening"],["whatsapp_bendahara","WhatsApp bendahara"]];
  return `<div class="card settings-form"><p class="muted">Identitas dapat diubah tanpa mengubah kode aplikasi.</p>${fields.map(([k,l])=>`<label>${l}<input data-setting="${k}" value="${escapeHtml(i[k]||"")}" placeholder="${l}"></label>`).join("")}<button id="saveSettings" class="btn primary">Simpan pengaturan</button><p id="settingsMessage" class="muted-small"></p></div>`;
}

function bindSettings(){
  $("saveSettings").addEventListener("click",async()=>{
    const settings={};
    document.querySelectorAll("[data-setting]").forEach(el=>settings[el.dataset.setting]=el.value);
    $("settingsMessage").textContent="Menyimpan…";
    const result=await api("updateSettings",{settings});
    $("settingsMessage").textContent=result.message;
    if(result.ok){const b=await api("bootstrap");if(b.ok){bootstrap=b;setIdentity(b.identity);}}
  });
}

async function logout(callApi=true){
  if(callApi && session) { try { await api("logout"); } catch(e) {} }
  session=null;bootstrap=null;sessionStorage.removeItem("g6b_session");
  $("dashboardView").classList.add("hidden");$("loginView").classList.remove("hidden");$("password").value="";
}

(async function init(){
  const saved=sessionStorage.getItem("g6b_session");
  if(saved){
    try{session=JSON.parse(saved);await loadDashboard();}catch(e){await logout(false);}
  }
})();

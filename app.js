const API = "/.netlify/functions/api";
let session = null;
let bootstrap = null;
let currentPage = "dashboard";

const $ = (id) => document.getElementById(id);
const rupiah = (n) => new Intl.NumberFormat("id-ID",{style:"currency",currency:"IDR",maximumFractionDigits:0}).format(Number(n||0));

async function api(action, data={}) {
  const res = await fetch(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,token:session?.token,...data})});
  const json = await res.json();
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
  const result = await api("login",{username:$("username").value.trim(),password:$("password").value});
  if (!result.ok) { $("loginMessage").textContent=result.message; return; }
  session = {token:result.token,user:result.user};
  sessionStorage.setItem("g6b_session",JSON.stringify(session));
  await loadDashboard();
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
  else if(currentPage==="pengaturan" && admin) html+=settingsHtml();
  else html+=`<div class="empty-state"><strong>Modul ${titleMap[currentPage]} masuk tahap pengerjaan berikutnya.</strong><p>Fondasi login dan database sudah disiapkan. Modul ini akan diaktifkan bertahap sesuai blueprint.</p></div>`;
  $("pageContent").innerHTML=html;
  if(currentPage==="pengaturan") bindSettings();
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
  if(callApi && session) await api("logout");
  session=null;bootstrap=null;sessionStorage.removeItem("g6b_session");
  $("dashboardView").classList.add("hidden");$("loginView").classList.remove("hidden");$("password").value="";
}

(async function init(){
  const saved=sessionStorage.getItem("g6b_session");
  if(saved){
    try{session=JSON.parse(saved);await loadDashboard();}catch(e){logout(false);}
  }
})();

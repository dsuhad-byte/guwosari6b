const SHEETS = {
  USERS: ["user_id","username","password_hash","salt","role","house_no","name","active","created_at","updated_at"],
  WARGA: ["house_no","name","whatsapp","status_rumah","username","active","created_at","updated_at"],
  JADWAL_RONDA: ["schedule_id","period_id","day_name","house_no","is_carrier","active"],
  RIWAYAT_JADWAL: ["period_id","start_date","end_date","description","created_at","created_by"],
  ABSENSI_RONDA: ["attendance_id","date","house_no","status","fine_amount","created_by","created_at"],
  LIBUR_RONDA: ["holiday_id","date","reason","created_by","created_at"],
  ENTRI_JIMPITAN: ["entry_id","date","day_name","entered_by","entered_by_house","entered_at","total_collected","carrier_house","carrier_name","status"],
  DETAIL_ENTRI_JIMPITAN: ["detail_id","entry_id","house_no","resident_name","house_status","jimpitan_status","amount","created_at"],
  HARI_TANPA_ENTRI: ["record_id","date","day_name","reason","recorded_by","created_at"],
  SETORAN_JIMPITAN: ["deposit_id","entry_id","date","carrier_house","carrier_name","amount","status","validated_by","validated_at","created_at"],
  VALIDASI_SETORAN: ["validation_id","deposit_id","validated_by","validated_at","notes"],
  KEWAJIBAN: ["obligation_id","house_no","date","type","description","amount","paid_amount","remaining_amount","status","source_id","created_at"],
  PEMBAYARAN: ["payment_id","house_no","date","jimpitan_amount","fine_amount","total_amount","notes","recorded_by","created_at"],
  PENERIMAAN_DANA: ["receipt_id","date","physical_total","fine_amount","konblok_amount","distribution_remainder","recorded_by","created_at"],
  DISTRIBUSI_JIMPITAN: ["distribution_id","receipt_id","cash_pocket","amount","created_at"],
  KANTONG_KAS: ["pocket_id","pocket_name","opening_balance","current_balance","updated_at"],
  TRANSAKSI_KAS: ["transaction_id","date","type","pocket_id","amount","description","source_id","recorded_by","created_at"],
  DETAIL_TRANSAKSI: ["detail_id","transaction_id","pocket_id","amount","direction"],
  PENGELUARAN: ["expense_id","date","description","total_amount","recorded_by","created_at"],
  PENDAPATAN_LAIN: ["income_id","date","description","amount","pocket_id","recorded_by","created_at"],
  ASET: ["asset_id","asset_name","category","quantity","value","notes","created_at"],
  PENGUMUMAN: ["announcement_id","title","body","created_by","created_at"],
  PENGATURAN: ["key","value","updated_by","updated_at"],
  SALDO_AWAL: ["pocket_id","pocket_name","opening_balance","recorded_by","created_at"],
  LOG_AKTIVITAS: ["log_id","username","role","action","description","created_at"]
};

const POCKETS = [
  "Kas Besar","Kas Pembangunan","Kas Sosial",
  "Kas Denda Ronda","Kas Infak Pembangunan","Alokasi Konblok"
];

function setupDatabase() {
  const props = PropertiesService.getScriptProperties();
  let id = props.getProperty("SPREADSHEET_ID");
  let ss;
  if (id) {
    ss = SpreadsheetApp.openById(id);
  } else {
    ss = SpreadsheetApp.create("Database Perum Guwosari Blok 6B");
    id = ss.getId();
    props.setProperty("SPREADSHEET_ID", id);
  }

  Object.keys(SHEETS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, SHEETS[name].length).setValues([SHEETS[name]]);
      sh.setFrozenRows(1);
    }
  });

  const warga = ss.getSheetByName("WARGA");
  if (warga.getLastRow() === 1) {
    const rows = [];
    for (let i = 1; i <= 92; i++) {
      const no = String(i).padStart(2, "0");
      rows.push([no, "", "", "isi", no, true, new Date(), new Date()]);
    }
    warga.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  const kas = ss.getSheetByName("KANTONG_KAS");
  if (kas.getLastRow() === 1) {
    const rows = POCKETS.map((name, i) => ["KAS-" + (i+1), name, 0, 0, new Date()]);
    kas.getRange(2, 1, rows.length, rows[0].length).setValues(rows);
  }

  const settings = ss.getSheetByName("PENGATURAN");
  if (settings.getLastRow() === 1) {
    const rows = [
      ["nama_perumahan","Perum Guwosari Blok 6B","system",new Date()],
      ["nama_aplikasi","Sistem Informasi Warga dan Keuangan","system",new Date()],
      ["subjudul","Jimpitan, Ronda, Kewajiban dan Keuangan","system",new Date()],
      ["logo_url","","system",new Date()],
      ["warna_utama","#193B63","system",new Date()],
      ["target_konblok_bulanan","650000","system",new Date()],
      ["nama_bank","","system",new Date()],
      ["nomor_rekening","","system",new Date()],
      ["atas_nama_rekening","","system",new Date()],
      ["nama_bendahara","Nenda","system",new Date()],
      ["whatsapp_bendahara","","system",new Date()]
    ];
    settings.getRange(2, 1, rows.length, 4).setValues(rows);
  }

  Logger.log("Database siap: " + ss.getUrl());
  return ss.getUrl();
}

function createAdminUser(username, password, name) {
  if (!username || !password || password.length < 10) {
    throw new Error("Username wajib diisi dan password minimal 10 karakter.");
  }
  const ss = getDb_();
  const sh = ss.getSheetByName("USERS");
  const values = sh.getDataRange().getValues();
  if (values.slice(1).some(r => String(r[1]).toLowerCase() === String(username).toLowerCase())) {
    throw new Error("Username sudah digunakan.");
  }
  const salt = Utilities.getUuid() + Utilities.getUuid();
  const hash = hashPassword_(password, salt);
  sh.appendRow([Utilities.getUuid(), username, hash, salt, "admin", "", name || "Admin", true, new Date(), new Date()]);
  log_("system", "admin_created", "Akun admin dibuat: " + username);
  return "Admin berhasil dibuat.";
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const expected = PropertiesService.getScriptProperties().getProperty("APP_SECRET");
    if (!expected || payload.secret !== expected) return json_({ok:false,message:"Akses ditolak."});

    const action = String(payload.action || "");
    let result;
    if (action === "login") result = login_(payload.username, payload.password);
    else if (action === "me") result = withAuth_(payload.token, () => getMe_(payload.token));
    else if (action === "bootstrap") result = withAuth_(payload.token, () => getBootstrap_(payload.token));
    else if (action === "updateSettings") result = withAuth_(payload.token, user => updateSettings_(user, payload.settings));
    else if (action === "logout") result = logout_(payload.token);
    else result = {ok:false,message:"Fungsi belum tersedia pada tahap fondasi."};
    return json_(result);
  } catch (err) {
    return json_({ok:false,message:err.message || String(err)});
  }
}

function login_(username, password) {
  if (!username || !password) return {ok:false,message:"Username dan password wajib diisi."};
  const sh = getDb_().getSheetByName("USERS");
  const rows = sh.getDataRange().getValues();
  const user = rows.slice(1).find(r => String(r[1]).toLowerCase() === String(username).toLowerCase() && r[7] === true);
  if (!user || hashPassword_(password, user[3]) !== user[2]) {
    return {ok:false,message:"Username atau password tidak sesuai."};
  }
  const token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put("session_" + token, JSON.stringify({
    username:user[1], role:user[4], house_no:user[5], name:user[6]
  }), 21600);
  log_(user[1], "login", "Login berhasil");
  return {ok:true,token:token,user:{username:user[1],role:user[4],house_no:user[5],name:user[6]}};
}

function withAuth_(token, callback) {
  const raw = token && CacheService.getScriptCache().get("session_" + token);
  if (!raw) return {ok:false,message:"Sesi berakhir. Silakan login kembali."};
  return callback(JSON.parse(raw));
}

function getMe_(token) {
  const raw = CacheService.getScriptCache().get("session_" + token);
  return {ok:true,user:JSON.parse(raw)};
}

function getBootstrap_(user) {
  const ss = getDb_();
  const wargaRows = ss.getSheetByName("WARGA").getDataRange().getValues().slice(1);
  const settingsRows = ss.getSheetByName("PENGATURAN").getDataRange().getValues().slice(1);
  const kasRows = ss.getSheetByName("KANTONG_KAS").getDataRange().getValues().slice(1);
  const settings = {};
  settingsRows.forEach(r => settings[r[0]] = r[1]);
  const occupied = wargaRows.filter(r => String(r[3]).toLowerCase() === "isi").length;
  const empty = wargaRows.filter(r => String(r[3]).toLowerCase() === "kosong").length;
  const pockets = kasRows.map(r => ({name:r[1],balance:Number(r[3] || 0)}));
  let resident = null;
  if (user.role !== "admin") {
    const row = wargaRows.find(r => String(r[0]) === String(user.house_no || user.username));
    if (row) resident = {house_no:row[0],name:row[1],whatsapp:row[2],status:row[3]};
  }
  return {ok:true,identity:settings,stats:{totalHouses:92,occupied,empty},pockets,resident};
}

function updateSettings_(user, settings) {
  if (user.role !== "admin") return {ok:false,message:"Hanya admin yang dapat mengubah pengaturan."};
  if (!settings || typeof settings !== "object") return {ok:false,message:"Data pengaturan tidak valid."};
  const allowed = ["nama_perumahan","nama_aplikasi","subjudul","logo_url","warna_utama","nama_bank","nomor_rekening","atas_nama_rekening","nama_bendahara","whatsapp_bendahara"];
  const sh = getDb_().getSheetByName("PENGATURAN");
  const rows = sh.getDataRange().getValues();
  Object.keys(settings).forEach(key => {
    if (!allowed.includes(key)) return;
    const idx = rows.findIndex((r,i) => i > 0 && r[0] === key);
    if (idx > 0) sh.getRange(idx+1, 2, 1, 3).setValues([[String(settings[key]),user.username,new Date()]]);
    else sh.appendRow([key,String(settings[key]),user.username,new Date()]);
  });
  log_(user.username,"update_settings","Identitas/pengaturan aplikasi diperbarui");
  return {ok:true,message:"Pengaturan berhasil disimpan."};
}

function logout_(token) {
  if (token) CacheService.getScriptCache().remove("session_" + token);
  return {ok:true};
}

function getDb_() {
  const id = PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  if (!id) throw new Error("Database belum dibuat. Jalankan setupDatabase().");
  return SpreadsheetApp.openById(id);
}

function hashPassword_(password, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + String(password), Utilities.Charset.UTF_8);
  return bytes.map(b => (b + 256).toString(16).slice(-2)).join("");
}

function log_(username, action, description) {
  const sh = getDb_().getSheetByName("LOG_AKTIVITAS");
  if (sh) sh.appendRow([Utilities.getUuid(),username,"system",action,description,new Date()]);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

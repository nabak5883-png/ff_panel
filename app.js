import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs,
  deleteDoc, query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCxIXXfNW4vizhU3lpjfk2rjUd70Bj7QGI",
  authDomain: "nk-ff-a89ee.firebaseapp.com",
  projectId: "nk-ff-a89ee",
  storageBucket: "nk-ff-a89ee.firebasestorage.app",
  messagingSenderId: "106376072531",
  appId: "1:106376072531:web:ebb5be26decf66e25fe5a6",
  measurementId: "G-YTX39QEV12"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const ADMIN_EMAIL = "nabak5883@gmail.com";
const $ = id => document.getElementById(id);

let currentUser = null;
let currentProfile = null;

function toast(msg){
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.style.display = "none", 2500);
}

// Toggle Auth Forms
if ($("showRegister") && $("showLogin")) {
  $("showRegister").onclick = () => {
    $("loginForm")?.classList.add("hidden");
    $("registerForm")?.classList.remove("hidden");
  };
  $("showLogin").onclick = () => {
    $("registerForm")?.classList.add("hidden");
    $("loginForm")?.classList.remove("hidden");
  };
}

// Registration
if ($("registerForm")) {
  $("registerForm").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("regName")?.value.trim();
    const email = $("regEmail")?.value.trim();
    const password = $("regPassword")?.value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const assignedRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin" : "user";
      await setDoc(doc(db, "users", cred.user.uid), {
        name, email, role: assignedRole, coins: 0, points: 0, createdAt: serverTimestamp()
      });
      toast("Account registered successfully!");
    } catch(err) { toast(err.message); }
  });
}

// Login
if ($("loginForm")) {
  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, $("loginEmail")?.value.trim(), $("loginPassword")?.value);
    } catch(err) { toast(err.message); }
  });
}

// Auth State
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (!user) {
    $("authScreen")?.classList.remove("hidden");
    $("appScreen")?.classList.add("hidden");
    return;
  }
  $("authScreen")?.classList.add("hidden");
  $("appScreen")?.classList.remove("hidden");
  await refreshUser();
  await loadTournaments();
});

const doLogout = () => signOut(auth);
if ($("rowLogout")) $("rowLogout").onclick = doLogout;

// Refresh User Profile
async function refreshUser(){
  if (!currentUser) return;
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    currentProfile = snap.exists() ? snap.data() : {};
    if (currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      currentProfile.role = "admin";
    }

    const name = currentProfile.name || "Player";
    const email = currentProfile.email || currentUser.email || "";
    const coinsVal = Number(currentProfile.coins || 0).toFixed(2);

    if ($("coins")) $("coins").textContent = coinsVal;
    if ($("walletTotalBalance")) $("walletTotalBalance").textContent = coinsVal;
    if ($("walletDeposit")) $("walletDeposit").textContent = coinsVal;
    if ($("walletRowBalance")) $("walletRowBalance").textContent = coinsVal;

    if ($("profileDisplayName")) $("profileDisplayName").textContent = name;
    if ($("profileDisplayEmail")) $("profileDisplayEmail").textContent = email;
    if ($("profileAvatarLetter")) $("profileAvatarLetter").textContent = name.charAt(0).toUpperCase();
    if ($("profileDisplayUsername")) $("profileDisplayUsername").textContent = "@" + name.toLowerCase().replace(/\s+/g, '_');
    if ($("kycUsername")) $("kycUsername").textContent = name;

    if ($("adminPanel")) $("adminPanel").classList.toggle("hidden", currentProfile.role !== "admin");
  } catch(e) { console.error(e); }
}

// Tournaments
async function loadTournaments(){
  const list = $("tournamentList");
  if (!list) return;
  try {
    const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      list.innerHTML = '<div style="text-align:center; color:#888;">No tournaments yet.</div>';
      return;
    }
    list.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      const wrap = document.createElement("div");
      wrap.style.cssText = "background:#181920; padding:12px; border-radius:12px; margin-bottom:10px; border:1px solid rgba(255,255,255,0.06);";
      const admin = currentProfile?.role === "admin";
      wrap.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
          <h3 style="margin:0; font-size:14px; color:#fff;">${data.name}</h3>
          <span style="font-size:11px; color:#1a90ff;">${data.status || "upcoming"}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#aaa; margin-bottom:10px;">
          <div>Entry: <b style="color:#fff;">${data.entry || 0}</b></div>
          <div>Prize: <b style="color:#ffb703;">${data.prize || 0}</b></div>
          <div>Date: <b style="color:#fff;">${data.dateText || "-"}</b></div>
        </div>
        <div style="display:flex; gap:8px;">
          <button data-action="join" style="flex:1; padding:8px; border-radius:8px; background:#1a90ff; color:#fff; border:none; font-weight:700;">JOIN</button>
          ${admin ? '<button data-action="delete" style="padding:8px 12px; border-radius:8px; background:transparent; color:#ff5555; border:1px solid #ff5555;">DELETE</button>' : ''}
        </div>`;
      wrap.querySelector('[data-action="join"]').onclick = () => toast("Joined Tournament!");
      if (admin) {
        wrap.querySelector('[data-action="delete"]').onclick = async () => {
          if (confirm("Delete this tournament?")) {
            await deleteDoc(doc(db, "tournaments", d.id));
            toast("Deleted!");
            loadTournaments();
          }
        };
      }
      list.appendChild(wrap);
    });
  } catch(e) {
    list.innerHTML = '<div style="text-align:center; color:#888;">Could not load tournaments.</div>';
  }
}

if ($("refreshTournaments")) $("refreshTournaments").onclick = loadTournaments;

if ($("tournamentForm")) {
  $("tournamentForm").onsubmit = async (e) => {
    e.preventDefault();
    const name = $("tournamentName")?.value.trim();
    const entry = Number($("tournamentEntry")?.value);
    const prize = Number($("tournamentPrize")?.value);
    const dateValue = $("tournamentDate")?.value;
    const dateText = new Date(dateValue).toLocaleString();
    try {
      await addDoc(collection(db, "tournaments"), {
        name, entry, prize, status: "upcoming", dateText, createdAt: serverTimestamp()
      });
      toast("Tournament Created!");
      $("tournamentForm").reset();
      loadTournaments();
    } catch(err) { toast(err.message); }
  };
}

// 5-Tab Navigation System
const tabs = {
  navHome: $("homeView"),
  navVideo: $("videoView"),
  navEarn: $("earnView"),
  navWallet: $("walletView"),
  navProfile: $("profileView")
};

function switchTab(activeBtnId) {
  document.querySelectorAll(".bottom-nav .nav-item").forEach(btn => btn.classList.remove("active"));
  Object.values(tabs).forEach(view => view?.classList.add("hidden"));

  $(activeBtnId)?.classList.add("active");
  tabs[activeBtnId]?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

Object.keys(tabs).forEach(btnId => {
  const btn = $(btnId);
  if (btn) btn.onclick = () => switchTab(btnId);
});

// Quick Triggers
if ($("actionProfile")) $("actionProfile").onclick = () => switchTab("navProfile");
if ($("walletQuickBtn")) $("walletQuickBtn").onclick = () => switchTab("navWallet");
if ($("rowWallet")) $("rowWallet").onclick = () => switchTab("navWallet");

const openTelegram = () => window.open("https://t.me/nkwithprifut101", "_blank");
if ($("actionContact")) $("actionContact").onclick = openTelegram;
if ($("joinSupportBtn")) $("joinSupportBtn").onclick = openTelegram;
if ($("rowContact")) $("rowContact").onclick = openTelegram;

if ($("videoTutorialCard")) $("videoTutorialCard").onclick = () => window.open("https://youtube.com", "_blank");
if ($("addFundsBtn")) $("addFundsBtn").onclick = () => toast("Deposit options opening soon!");
if ($("withdrawBtnAction")) $("withdrawBtnAction").onclick = () => toast("Withdraw feature updating!");
if ($("earnCardRefer")) $("earnCardRefer").onclick = () => toast("Refer link copied!");
if ($("earnCardWatch")) $("earnCardWatch").onclick = () => toast("No ads available right now.");
if ($("earnCardLucky")) $("earnCardLucky").onclick = () => toast("Lucky draw starts at 8 PM!");
if ($("earnCardPlay")) $("earnCardPlay").onclick = () => switchTab("navHome");

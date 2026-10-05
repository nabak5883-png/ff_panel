import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  setPersistence, browserLocalPersistence, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs,
  query, orderBy, serverTimestamp
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

try { setPersistence(auth, browserLocalPersistence); } catch(e) {}

let supportUrl = "https://t.me/nkwithprifut101";
const $ = id => document.getElementById(id);
let currentUser = null;
let currentProfile = null;

function toast(msg) {
  const t = $("toast");
  if (!t) return;
  t.textContent = msg;
  t.style.display = "block";
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.style.display = "none", 2500);
}

// Login / Register Switch
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

// Create Account
if ($("registerForm")) {
  $("registerForm").onsubmit = async e => {
    e.preventDefault();
    const name = $("regName")?.value.trim();
    const email = $("regEmail")?.value.trim();
    const password = $("regPassword")?.value;
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", cred.user.uid), {
        name, email, role: "user", coins: 0, deposit: 0, winnings: 0, bonus: 0, referral: 0, createdAt: serverTimestamp()
      });
      toast("Welcome to FF PANEL!");
    } catch (err) { toast(err.message); }
  };
}

// Login
if ($("loginForm")) {
  $("loginForm").onsubmit = async e => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, $("loginEmail")?.value.trim(), $("loginPassword")?.value);
    } catch (err) { toast(err.message); }
  };
}

// Auth State Observer
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (!user) {
    $("authScreen")?.classList.remove("hidden");
    $("appScreen")?.classList.add("hidden");
    return;
  }
  $("authScreen")?.classList.add("hidden");
  $("appScreen")?.classList.remove("hidden");
  await loadGlobalSettings();
  await refreshUser();
  await loadTournaments();
});

if ($("rowLogout")) $("rowLogout").onclick = () => signOut(auth);

// Load Global Settings (Controlled from Separate Admin Panel)
async function loadGlobalSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "global"));
    if (snap.exists()) {
      const d = snap.data();
      if (d.notice && $("appNoticeText")) $("appNoticeText").textContent = d.notice;
      if (d.telegram) supportUrl = d.telegram;
    }
  } catch (e) {}
}

// Sync User Data Across All 5 Tabs
async function refreshUser() {
  if (!currentUser) return;
  try {
    const snap = await getDoc(doc(db, "users", currentUser.uid));
    currentProfile = snap.exists() ? snap.data() : {};

    const name = currentProfile.name || "Player";
    const email = currentProfile.email || currentUser.email || "";
    const username = name.toLowerCase().replace(/\s+/g, "") + currentUser.uid.slice(0, 3).toLowerCase();
    const coins = Number(currentProfile.coins || 0).toFixed(2);

    if ($("coins")) $("coins").textContent = coins;
    if ($("walletTotalBalance")) $("walletTotalBalance").textContent = coins;
    if ($("walletDeposit")) $("walletDeposit").textContent = Number(currentProfile.deposit || coins).toFixed(2);
    if ($("walletWinnings")) $("walletWinnings").textContent = Number(currentProfile.winnings || 0).toFixed(2);
    if ($("walletBonus")) $("walletBonus").textContent = Number(currentProfile.bonus || 0).toFixed(2);
    if ($("walletReferral")) $("walletReferral").textContent = Number(currentProfile.referral || 0).toFixed(2);
    if ($("walletRowBalance")) $("walletRowBalance").textContent = coins;

    if ($("profileAvatarLetter")) $("profileAvatarLetter").textContent = name.charAt(0).toUpperCase();
    if ($("profileDisplayName")) $("profileDisplayName").textContent = name.toUpperCase();
    if ($("profileDisplayEmail")) $("profileDisplayEmail").textContent = email;
    if ($("profileDisplayUsername")) $("profileDisplayUsername").textContent = "@" + username;
    if ($("kycUsername")) $("kycUsername").textContent = username;
  } catch (e) {}
}

// Load Live Tournaments for Users
async function loadTournaments() {
  const list = $("tournamentList");
  if (!list) return;
  try {
    const q = query(collection(db, "tournaments"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    if (snap.empty) {
      list.innerHTML = '<div style="text-align:center; color:#8a90a2; font-size:12px;">No matches scheduled right now.</div>';
      return;
    }
    list.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      const card = document.createElement("div");
      card.style.cssText = "background:#15171e; padding:14px; border-radius:12px; margin-bottom:10px; border:1px solid rgba(255,255,255,0.06);";
      card.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <b style="font-size:14px; color:#fff;">${data.name}</b>
          <span style="font-size:11px; color:#1a90ff; font-weight:700;">${(data.status || "LIVE").toUpperCase()}</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:12px; color:#8a90a2; margin-bottom:12px;">
          <span>Entry: <b style="color:#fff;">🪙 ${data.entry || 0}</b></span>
          <span>Prize: <b style="color:#ffb703;">🪙 ${data.prize || 0}</b></span>
          <span>${data.dateText || ""}</span>
        </div>
        <button data-join="true" style="width:100%; padding:10px; border-radius:8px; background:#1a90ff; color:#fff; border:none; font-weight:700; cursor:pointer;">JOIN MATCH</button>
      `;
      card.querySelector('[data-join="true"]').onclick = () => toast("Match Joined Successfully!");
      list.appendChild(card);
    });
  } catch (e) {}
}

if ($("refreshTournaments")) $("refreshTournaments").onclick = loadTournaments;

// 5-Tab Navigation & Back Button
const tabViews = {
  navHome: $("homeView"),
  navVideo: $("videoView"),
  navEarn: $("earnView"),
  navWallet: $("walletView"),
  navProfile: $("profileView")
};

function switchTab(btnId) {
  document.querySelectorAll(".bottom-nav .nav-btn").forEach(b => b.classList.remove("active"));
  Object.values(tabViews).forEach(v => v?.classList.add("hidden"));

  $(btnId)?.classList.add("active");
  tabViews[btnId]?.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

Object.keys(tabViews).forEach(btnId => {
  if ($(btnId))$(btnId).onclick = () => switchTab(btnId);
});

window.history.pushState({ tab: "home" }, "");
window.addEventListener("popstate", () => {
  if ($("withdrawModal") && !$("withdrawModal").classList.contains("hidden")) {
    $("withdrawModal").classList.add("hidden");
    window.history.pushState({ tab: "home" }, "");
    return;
  }
  if ($("homeView") && $("homeView").classList.contains("hidden")) {
    switchTab("navHome");
    window.history.pushState({ tab: "home" }, "");
  }
});

// Shortcuts
if ($("actionProfile")) $("actionProfile").onclick = () => switchTab("navProfile");
if ($("topWalletPill")) $("topWalletPill").onclick = () => switchTab("navWallet");
if ($("rowWallet")) $("rowWallet").onclick = () => switchTab("navWallet");
if ($("rowTransactions")) $("rowTransactions").onclick = () => switchTab("navWallet");

const scrollToMatches = () => {
  switchTab("navHome");
  setTimeout(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }), 150);
};
if ($("actionMatches")) $("actionMatches").onclick = scrollToMatches;
if ($("rowMyMatches")) $("rowMyMatches").onclick = scrollToMatches;
if ($("earnCardPlay")) $("earnCardPlay").onclick = scrollToMatches;

document.querySelectorAll(".esport-card").forEach(card => {
  card.onclick = () => {
    toast(`Selected: ${card.getAttribute("data-mode")}`);
    scrollToMatches();
  };
});

const openSupport = () => window.open(supportUrl, "_blank");
if ($("actionContact")) $("actionContact").onclick = openSupport;
if ($("promoSupportCard")) $("promoSupportCard").onclick = openSupport;
if ($("rowContact")) $("rowContact").onclick = openSupport;

if ($("videoTutorialCard")) $("videoTutorialCard").onclick = () => window.open("https://youtube.com", "_blank");
if ($("addFundsBtn")) $("addFundsBtn").onclick = () => toast("Add Funds via UPI opening soon!");
if ($("withdrawBtnAction")) $("withdrawBtnAction").onclick = () => $("withdrawModal")?.classList.remove("hidden");
if ($("closeWithdrawBtn")) $("closeWithdrawBtn").onclick = () => $("withdrawModal")?.classList.add("hidden");

if ($("withdrawForm")) {
  $("withdrawForm").onsubmit = async e => {
    e.preventDefault();
    const method = $("withdrawMethod")?.value;
    const number = $("withdrawNumber")?.value.trim();
    const coins = Number($("withdrawCoins")?.value);
    if ((currentProfile?.coins || 0) < coins) {
      toast("Insufficient Wallet Balance!");
      return;
    }
    try {
      await addDoc(collection(db, "withdrawals"), {
        userId: currentUser.uid, userEmail: currentUser.email, method, number, coins, createdAt: serverTimestamp()
      });
      toast("Withdrawal Request Submitted!");
      $("withdrawModal")?.classList.add("hidden");
      $("withdrawForm").reset();
    } catch (err) { toast(err.message); }
  };
}

if ($("actionTopPlayers") \vert{}\vert{} $("rowTopPlayers")) {
  const msg = () => toast("Leaderboard updating for current season!");
  if ($("actionTopPlayers")) $("actionTopPlayers").onclick = msg;
  if ($("rowTopPlayers")) $("rowTopPlayers").onclick = msg;
}
if ($("earnCardRefer") \vert{}\vert{} $("rowShare")) {
  const shareApp = () => {
    if (navigator.share) navigator.share({ title: "FF PANEL", url: window.location.href });
    else toast("Invite Link Copied!");
  };
  if ($("earnCardRefer")) $("earnCardRefer").onclick = shareApp;
  if ($("rowShare")) $("rowShare").onclick = shareApp;
}
if ($("earnCardWatch")) $("earnCardWatch").onclick = () => toast("Reward videos loading...");
if ($("earnCardLucky")) $("earnCardLucky").onclick = () => toast("Lucky Draw opens at 8:00 PM!");
if ($("rowGameRules")) $("rowGameRules").onclick = () => alert("Game Rules:\n1. Do not use hacks or emulators.\n2. Room ID & Password will be shared 15 mins before start.");

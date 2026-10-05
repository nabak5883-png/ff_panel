import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber,
  setPersistence, browserLocalPersistence, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
  getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs,
  updateDoc, deleteDoc, query, orderBy, serverTimestamp
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

// Keep user logged in until app data is cleared or app is deleted
setPersistence(auth, browserLocalPersistence);

const ADMIN_EMAIL = "nabak5883@gmail.com";
const $ = id => document.getElementById(id);
let currentUser = null;
let currentProfile = null;
let confirmationResult = null;

function toast(msg){
  const t = $("toast");
  if(t) {
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => t.style.display = "none", 2600);
  }
}

// ========== Splash Auto Hide ==========
window.addEventListener('load', () => {
  setTimeout(() => {
    const splash = $("splashScreen");
    if (splash) {
      splash.classList.add('fade-out');
      setTimeout(() => splash.style.display = 'none', 600);
    }
  }, 1600);
});

// ========== Auth Tab Switching ==========
$("tabPhoneBtn").onclick = () => {
  $("tabPhoneBtn").classList.add("active");
  $("tabEmailBtn").classList.remove("active");
  $("phoneAuthBox").classList.remove("hidden");
  $("emailAuthBox").classList.add("hidden");
};
$("tabEmailBtn").onclick = () => {
  $("tabEmailBtn").classList.add("active");
  $("tabPhoneBtn").classList.remove("active");
  $("emailAuthBox").classList.remove("hidden");
  $("phoneAuthBox").classList.add("hidden");
};

// ========== Phone OTP Auth Setup ==========
function setupRecaptcha() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible'
    });
  }
}

$("sendOtpBtn").onclick = async () => {
  const phone = $("phoneNumber").value.trim();
  if (!phone) { toast("Enter phone number with country code (e.g. +91...)"); return; }
  setupRecaptcha();
  try {
    toast("Sending OTP SMS...");
    confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
    $("phoneStep1").classList.add("hidden");
    $("phoneStep2").classList.remove("hidden");
    toast("OTP Sent Successfully!");
  } catch (err) {
    toast(err.message);
    if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
  }
};

$("verifyOtpBtn").onclick = async () => {
  const code = $("otpCode").value.trim();
  if (!code || !confirmationResult) { toast("Enter valid 6-digit OTP"); return; }
  try {
    const res = await confirmationResult.confirm(code);
    await initUserProfile(res.user, "Player " + res.user.phoneNumber.slice(-4));
    toast("Phone Verified Successfully!");
  } catch (err) {
    toast("Invalid OTP code!");
  }
};

// ========== Google Sign-In ==========
const googleProvider = new GoogleAuthProvider();
$("googleSignInBtn").onclick = async () => {
  try {
    const res = await signInWithPopup(auth, googleProvider);
    await initUserProfile(res.user, res.user.displayName || "Google Player");
    toast("Google Login Successful!");
  } catch (err) {
    toast(err.message);
  }
};

// ========== Email Login / Sign Up ==========
$("emailLoginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const email = $("userEmail").value.trim();
  const password = $("userPassword").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (loginErr) {
    // If not registered, automatically register new user
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await initUserProfile(cred.user, email.split("@")[0]);
      toast("Account created and logged in!");
    } catch (regErr) {
      toast(regErr.message);
    }
  }
});

// Initialize Profile in Firestore
async function initUserProfile(user, defaultName) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    const isTargetAdmin = user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
    await setDoc(ref, {
      name: defaultName,
      email: user.email || user.phoneNumber || "",
      role: isTargetAdmin ? "admin" : "user",
      coins: 0,
      points: 0,
      matches: 0,
      wins: 0,
      createdAt: serverTimestamp()
    });
  }
}

// ========== Auth Listener (Persistent Session) ==========
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (!user) {
    $("authScreen").classList.remove("hidden");
    $("appScreen").classList.add("hidden");
    return;
  }
  $("authScreen").classList.add("hidden");
  $("appScreen").classList.remove("hidden");
  await refreshUser();
  await loadTournaments();
});

$("logoutBtn").onclick = () => signOut(auth);
$("rowLogout").onclick = () => signOut(auth);
$("refreshTournaments").onclick = loadTournaments;

async function refreshUser(){
  if(!currentUser) return;
  const snap = await getDoc(doc(db,"users",currentUser.uid));
  currentProfile = snap.exists() ? snap.data() : {};

  if (currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    currentProfile.role = "admin";
  }

  const name = currentProfile.name || currentUser.displayName || "Player";
  const email = currentProfile.email || currentUser.email || currentUser.phoneNumber || "-";
  const coins = Number(currentProfile.coins || 0).toLocaleString();

  // Top Bar & Details
  $("coins").textContent = coins;
  $("playerName").textContent = name;
  $("playerEmail").textContent = email;

  // Profile View elements sync
  if ($("profileDisplayName")) $("profileDisplayName").textContent = name;
  if ($("profileDisplayEmail")) $("profileDisplayEmail").textContent = email;
  if ($("profileAvatarLetter")) $("profileAvatarLetter").textContent = name.charAt(0).toUpperCase();
  if ($("profileDisplayUsername")) $("profileDisplayUsername").textContent = "@" + name.toLowerCase().replace(/\s+/g, '_');
  if ($("kycUsername")) $("kycUsername").textContent = name;
  if ($("walletRowBalance")) $("walletRowBalance").textContent = coins;

  // Admin Panel Visibility
  $("adminPanel").classList.toggle("hidden", currentProfile.role !== "admin");
}

// ========== Tournament Logic ==========
async function loadTournaments(){
  const list = $("tournamentList");
  list.innerHTML = '<div class="loading">Loading tournaments...</div>';
  try{
    const q = query(collection(db,"tournaments"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    if(snap.empty){
      list.innerHTML = '<div class="loading" style="text-align:center; color:#888;">No tournaments yet.</div>';
      return;
    }
    list.innerHTML = "";
    snap.forEach(d => renderTournament(list, d.id, d.data()));
  }catch(err){
    list.innerHTML = '<div class="loading">Could not load tournaments.</div>';
  }
}

function renderTournament(list, id, data){
  const wrap = document.createElement("div");
  wrap.className = "tournament";
  wrap.style.cssText = "background:#161825; padding:12px; border-radius:12px; margin-bottom:10px; border:1px solid rgba(255,255,255,0.06);";
  const admin = currentProfile?.role === "admin";
  wrap.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
      <h3 style="margin:0; font-size:15px; color:#fff;">${data.name}</h3>
      <span style="font-size:12px; color:var(--accent-cyan);">${data.status || "upcoming"}</span>
    </div>
    <div style="display:flex; justify-content:space-between; font-size:12px; color:#aaa; margin-bottom:10px;">
      <div>Entry: <b style="color:#fff;">${data.entry || 0}</b></div>
      <div>Prize: <b style="color:var(--accent-gold);">${data.prize || 0}</b></div>
      <div>Date: <b style="color:#fff;">${data.dateText || "-"}</b></div>
    </div>
    <div style="display:flex; gap:8px;">
      <button class="primary" data-action="join" style="flex:1; padding:8px; border-radius:8px; background:var(--accent-cyan); border:none; font-weight:700;">JOIN</button>
      ${admin ? '<button class="ghost" data-action="delete" style="padding:8px 12px; border-radius:8px;">DELETE</button>' : ''}
    </div>`;
  wrap.querySelector('[data-action="join"]').onclick = () => toast("Joined Tournament!");
  if(admin){
    wrap.querySelector('[data-action="delete"]').onclick = async () => {
      if(confirm("Delete this tournament?")) {
        await deleteDoc(doc(db,"tournaments",id));
        toast("Deleted!");
        loadTournaments();
      }
    };
  }
  list.appendChild(wrap);
}

$("tournamentForm").addEventListener("submit", async e => {
  e.preventDefault();
  const name = $("tournamentName").value.trim();
  const entry = Number($("tournamentEntry").value);
  const prize = Number($("tournamentPrize").value);
  const dateValue = $("tournamentDate").value;
  const status = $("tournamentStatus").value;
  const dateText = new Date(dateValue).toLocaleString();
  try{
    await addDoc(collection(db,"tournaments"),{name, entry, prize, status, dateText, createdAt: serverTimestamp()});
    toast("Tournament created successfully!");
    $("tournamentForm").reset();
    await loadTournaments();
  }catch(err){ toast(err.message); }
});

// ========== UI Navigation / Tabs ==========
$("navHome").onclick = () => {
  $("homeView").classList.remove("hidden");
  $("profileView").classList.add("hidden");
  $("navHome").classList.add("active");
  $("navProfile").classList.remove("active");
};
$("navProfile").onclick = () => {
  $("profileView").classList.remove("hidden");
  $("homeView").classList.add("hidden");
  $("navProfile").classList.add("active");
  $("navHome").classList.remove("active");
};
$("actionProfile").onclick = () => $("navProfile").click();

// 3-Dot / Logo Dropdown Menu
$("threeDotsBtn").onclick = (e) => {
  e.stopPropagation();
  $("dropdownMenu").classList.toggle("hidden");
};
document.addEventListener("click", () => $("dropdownMenu").classList.add("hidden"));

// Withdraw Modal
const openWithdraw = () => $("withdrawModal").classList.remove("hidden");
$("walletQuickBtn").onclick = openWithdraw;
$("navWallet").onclick = openWithdraw;
$("closeWithdrawBtn").onclick = () => $("withdrawModal").classList.add("hidden");
$("withdrawForm").onsubmit = (e) => {
  e.preventDefault();
  toast("Withdrawal requested successfully!");
  $("withdrawModal").classList.add("hidden");
  $("withdrawForm").reset();
};

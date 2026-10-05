import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signInWithPopup, GoogleAuthProvider, RecaptchaVerifier, signInWithPhoneNumber,
  setPersistence, browserLocalPersistence, onAuthStateChanged, signOut
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

try {
  setPersistence(auth, browserLocalPersistence);
} catch (e) {
  console.log("Persistence mode:", e);
}

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
    window._toastTimer = setTimeout(() => t.style.display = "none", 2500);
  }
}

// Tab Switching
if ($("tabPhoneBtn") && $("tabEmailBtn")) {
  $("tabPhoneBtn").onclick = () => {
    $("tabPhoneBtn").classList.add("active");
    $("tabEmailBtn").classList.remove("active");
    $("phoneAuthBox")?.classList.remove("hidden");
    $("emailAuthBox")?.classList.add("hidden");
  };
  $("tabEmailBtn").onclick = () => {
    $("tabEmailBtn").classList.add("active");
    $("tabPhoneBtn").classList.remove("active");
    $("emailAuthBox")?.classList.remove("hidden");
    $("phoneAuthBox")?.classList.add("hidden");
  };
}

// Phone Auth
function setupRecaptcha() {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      'size': 'invisible'
    });
  }
}

if ($("sendOtpBtn")) {
  $("sendOtpBtn").onclick = async () => {
    const phone = $("phoneNumber")?.value.trim();
    if (!phone) { toast("Enter phone number with +91"); return; }
    try {
      setupRecaptcha();
      toast("Sending OTP...");
      confirmationResult = await signInWithPhoneNumber(auth, phone, window.recaptchaVerifier);
      $("phoneStep1")?.classList.add("hidden");
      $("phoneStep2")?.classList.remove("hidden");
      toast("OTP Sent!");
    } catch (err) {
      toast(err.message || "Could not send OTP");
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch(e){}
      }
    }
  };
}

if ($("verifyOtpBtn")) {
  $("verifyOtpBtn").onclick = async () => {
    const code = $("otpCode")?.value.trim();
    if (!code || !confirmationResult) { toast("Enter 6-digit OTP"); return; }
    try {
      const res = await confirmationResult.confirm(code);
      await initUserProfile(res.user, "Player");
      toast("Login Successful!");
    } catch (err) {
      toast("Invalid OTP code");
    }
  };
}

// Google Sign-In
if ($("googleSignInBtn")) {
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
}

// Email Sign-In
if ($("emailLoginForm")) {
  $("emailLoginForm").onsubmit = async (e) => {
    e.preventDefault();
    const email = $("userEmail")?.value.trim();
    const password = $("userPassword")?.value;
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await initUserProfile(cred.user, email.split("@")[0]);
        toast("Account created!");
      } catch (regErr) {
        toast(regErr.message);
      }
    }
  };
}

async function initUserProfile(user, defaultName) {
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      const isTargetAdmin = user.email && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
      await setDoc(ref, {
        name: defaultName,
        email: user.email || user.phoneNumber || "",
        role: isTargetAdmin ? "admin" : "user",
        coins: 0,
        createdAt: serverTimestamp()
      });
    }
  } catch(e){}
}

// Session State
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
if ($("logoutBtn")) $("logoutBtn").onclick = doLogout;
if ($("rowLogout")) $("rowLogout").onclick = doLogout;

async function refreshUser(){
  if(!currentUser) return;
  try {
    const snap = await getDoc(doc(db,"users",currentUser.uid));
    currentProfile = snap.exists() ? snap.data() : {};
    if (currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      currentProfile.role = "admin";
    }

    const name = currentProfile.name || currentUser.displayName || "Player";
    const email = currentProfile.email || currentUser.email || currentUser.phoneNumber || "-";
    const coins = Number(currentProfile.coins || 0).toLocaleString();

    if ($("coins")) $("coins").textContent = coins;
    if ($("profileDisplayName")) $("profileDisplayName").textContent = name;
    if ($("profileDisplayEmail")) $("profileDisplayEmail").textContent = email;
    if ($("profileAvatarLetter")) $("profileAvatarLetter").textContent = name.charAt(0).toUpperCase();
    if ($("adminPanel")) $("adminPanel").classList.toggle("hidden", currentProfile.role !== "admin");
  } catch(e){}
}

async function loadTournaments(){
  const list = $("tournamentList");
  if (!list) return;
  try {
    const q = query(collection(db,"tournaments"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    if(snap.empty){
      list.innerHTML = '<div style="text-align:center; color:#888;">No tournaments yet.</div>';
      return;
    }
    list.innerHTML = "";
    snap.forEach(d => {
      const data = d.data();
      const wrap = document.createElement("div");
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
          <button class="primary" data-action="join" style="flex:1; padding:8px; border-radius:8px; background:var(--accent-cyan); border:none; font-weight:700; color:#000;">JOIN</button>
          ${admin ? '<button class="ghost" data-action="delete" style="padding:8px 12px; border-radius:8px; background:transparent; color:#fff; border:1px solid #444;">DELETE</button>' : ''}
        </div>`;
      wrap.querySelector('[data-action="join"]').onclick = () => toast("Joined Tournament!");
      if(admin){
        wrap.querySelector('[data-action="delete"]').onclick = async () => {
          if(confirm("Delete this tournament?")) {
            await deleteDoc(doc(db,"tournaments",d.id));
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
    const status = $("tournamentStatus")?.value;
    const dateText = new Date(dateValue).toLocaleString();
    try {
      await addDoc(collection(db,"tournaments"),{name, entry, prize, status, dateText, createdAt: serverTimestamp()});
      toast("Tournament created!");
      $("tournamentForm").reset();
      loadTournaments();
    } catch(err) { toast(err.message); }
  };
}

// Navigation Tabs
if ($("navHome") && $("navProfile")) {
  $("navHome").onclick = () => {
    $("homeView")?.classList.remove("hidden");
    $("profileView")?.classList.add("hidden");
    $("navHome")?.classList.add("active");
    $("navProfile")?.classList.remove("active");
  };
  $("navProfile").onclick = () => {
    $("profileView")?.classList.remove("hidden");
    $("homeView")?.classList.add("hidden");
    $("navProfile")?.classList.add("active");
    $("navHome")?.classList.remove("active");
  };
}
if ($("actionProfile")) $("actionProfile").onclick = () => $("navProfile")?.click();
if ($("actionContact")) $("actionContact").onclick = () => window.open('https://t.me/nkwithprifut101', '_blank');
if ($("rowContact")) $("rowContact").onclick = () => window.open('https://t.me/nkwithprifut101', '_blank');

// Dropdown & Modals
if ($("threeDotsBtn")) {
  $("threeDotsBtn").onclick = (e) => {
    e.stopPropagation();
    $("dropdownMenu")?.classList.toggle("hidden");
  };
  document.addEventListener("click", () => $("dropdownMenu")?.classList.add("hidden"));
}

const openWithdraw = () => $("withdrawModal")?.classList.remove("hidden");
if ($("walletQuickBtn")) $("walletQuickBtn").onclick = openWithdraw;
if ($("navWallet")) $("navWallet").onclick = openWithdraw;
if ($("rowWallet")) $("rowWallet").onclick = openWithdraw;
if ($("closeWithdrawBtn")) $("closeWithdrawBtn").onclick = () => $("withdrawModal")?.classList.add("hidden");

if ($("withdrawForm")) {
  $("withdrawForm").onsubmit = (e) => {
    e.preventDefault();
    toast("Withdrawal requested successfully!");
    $("withdrawModal")?.classList.add("hidden");
    $("withdrawForm").reset();
  };
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut
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
  window._toastTimer = setTimeout(() => t.style.display = "none", 2600);
}

function escapeHtml(v){
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[c]));
}

if ($("showRegister") && $("showLogin")) {
  $("showRegister").onclick = () => {
    $("loginForm").classList.add("hidden");
    $("registerForm").classList.remove("hidden");
  };
  $("showLogin").onclick = () => {
    $("registerForm").classList.add("hidden");
    $("loginForm").classList.remove("hidden");
  };
}

if ($("registerForm")) {
  $("registerForm").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("regName").value.trim();
    const email = $("regEmail").value.trim();
    const password = $("regPassword").value;
    try{
      const cred = await createUserWithEmailAndPassword(auth,email,password);
      const assignedRole = email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin" : "user";
      await setDoc(doc(db,"users",cred.user.uid),{
        name,email,role:assignedRole,coins:0,points:0,matches:0,wins:0,createdAt:serverTimestamp()
      });
      toast("Account created successfully.");
    }catch(err){ toast(err.message); }
  });
}

if ($("loginForm")) {
  $("loginForm").addEventListener("submit", async e => {
    e.preventDefault();
    try{
      await signInWithEmailAndPassword(auth,$("loginEmail").value.trim(),$("loginPassword").value);
    }catch(err){ toast(err.message); }
  });
}

if ($("logoutBtn")) $("logoutBtn").onclick = () => signOut(auth);
if ($("refreshBtn")) $("refreshBtn").onclick = refreshUser;
if ($("refreshTournaments")) $("refreshTournaments").onclick = loadTournaments;

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if(!user){
    if ($("authScreen")) $("authScreen").classList.remove("hidden");
    if ($("appScreen")) $("appScreen").classList.add("hidden");
    return;
  }
  if ($("authScreen")) $("authScreen").classList.add("hidden");
  if ($("appScreen")) $("appScreen").classList.remove("hidden");
  await refreshUser();
  await loadTournaments();
});

async function refreshUser(){
  if(!currentUser) return;
  try {
    const snap = await getDoc(doc(db,"users",currentUser.uid));
    if(!snap.exists()){ toast("User profile not found."); return; }
    currentProfile = snap.data();

    if (currentUser.email && currentUser.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      currentProfile.role = "admin";
    }

    if ($("playerName")) $("playerName").textContent = currentProfile.name || "Player";
    if ($("playerEmail")) $("playerEmail").textContent = currentProfile.email || currentUser.email || "";
    if ($("playerRole")) $("playerRole").textContent = "Role: " + (currentProfile.role || "user");

    if ($("detailName")) $("detailName").textContent = currentProfile.name || "-";
    if ($("detailEmail")) $("detailEmail").textContent = currentProfile.email || currentUser.email || "-";
    if ($("detailRole")) $("detailRole").textContent = currentProfile.role || "user";
    if ($("detailUid")) $("detailUid").textContent = currentUser.uid;

    if ($("coins")) $("coins").textContent = Number(currentProfile.coins || 0).toLocaleString();
    if ($("points")) $("points").textContent = Number(currentProfile.points || 0).toLocaleString();
    if ($("matches")) $("matches").textContent = Number(currentProfile.matches || 0).toLocaleString();
    if ($("wins")) $("wins").textContent = Number(currentProfile.wins || 0).toLocaleString();

    if ($("adminPanel")) $("adminPanel").classList.toggle("hidden", currentProfile.role !== "admin");
  } catch(e) {
    console.error(e);
  }
}

async function loadTournaments(){
  const list = $("tournamentList");
  if (!list) return;
  list.innerHTML = '<div class="loading">Loading tournaments...</div>';
  try{
    const q = query(collection(db,"tournaments"), orderBy("createdAt","desc"));
    const snap = await getDocs(q);
    if(snap.empty){
      list.innerHTML = '<div class="loading">No tournaments yet.</div>';
      return;
    }
    list.innerHTML = "";
    snap.forEach(d => renderTournament(list,d.id,d.data()));
  }catch(err){
    list.innerHTML = '<div class="loading">Could not load tournaments.</div>';
    console.error(err);
  }
}

function renderTournament(list,id,data){
  const wrap = document.createElement("div");
  wrap.className = "tournament";
  const admin = currentProfile?.role === "admin";
  wrap.innerHTML = `
    <div class="t-top">
      <h3>${escapeHtml(data.name)}</h3>
      <span class="status">${escapeHtml(data.status || "upcoming")}</span>
    </div>
    <div class="t-info">
      <div>Entry<b>${Number(data.entry||0)}</b></div>
      <div>Prize<b>${Number(data.prize||0)}</b></div>
      <div>Date<b>${escapeHtml(data.dateText || "-")}</b></div>
    </div>
    <div class="actions">
      <button class="primary" data-action="join">JOIN</button>
      ${admin ? '<button class="ghost" data-action="edit">EDIT</button><button class="ghost" data-action="delete">DELETE</button>' : ''}
    </div>`;
  wrap.querySelector('[data-action="join"]').onclick = () => joinTournament(id,data);
  if(admin){
    wrap.querySelector('[data-action="edit"]').onclick = () => startEdit(id,data);
    wrap.querySelector('[data-action="delete"]').onclick = () => removeTournament(id);
  }
  list.appendChild(wrap);
}

async function joinTournament(id,data){
  if(data.status === "completed"){ toast("This tournament is completed."); return; }
  try{
    await setDoc(doc(db,"tournamentJoins",`${id}_${currentUser.uid}`),{
      tournamentId:id,userId:currentUser.uid,userName:currentProfile.name || "",
      createdAt:serverTimestamp()
    });
    toast("Tournament joined.");
  }catch(err){ toast(err.message); }
}

if ($("tournamentForm")) {
  $("tournamentForm").addEventListener("submit", async e => {
    e.preventDefault();
    const name = $("tournamentName").value.trim();
    const entry = Number($("tournamentEntry").value);
    const prize = Number($("tournamentPrize").value);
    const dateValue = $("tournamentDate").value;
    const status = $("tournamentStatus").value;
    if(!name || !dateValue){ toast("Fill all tournament fields."); return; }
    const dateText = new Date(dateValue).toLocaleString();
    const payload = {name,entry,prize,status,dateText};
    try{
      const editId = $("editTournamentId") ? $("editTournamentId").value : "";
      if(editId){
        await updateDoc(doc(db,"tournaments",editId),payload);
        toast("Tournament updated.");
      }else{
        await addDoc(collection(db,"tournaments"),{...payload,createdAt:serverTimestamp()});
        toast("Tournament created.");
      }
      resetTournamentForm();
      await loadTournaments();
    }catch(err){ toast(err.message); }
  });
}

function startEdit(id,data){
  if ($("editTournamentId")) $("editTournamentId").value = id;
  if ($("tournamentName")) $("tournamentName").value = data.name || "";
  if ($("tournamentEntry")) $("tournamentEntry").value = data.entry || 0;
  if ($("tournamentPrize")) $("tournamentPrize").value = data.prize || 0;
  if ($("tournamentStatus")) $("tournamentStatus").value = data.status || "upcoming";
  if ($("tournamentDate")) $("tournamentDate").value = "";
  if ($("saveTournament")) $("saveTournament").textContent = "UPDATE TOURNAMENT";
  if ($("cancelEdit")) $("cancelEdit").classList.remove("hidden");
  window.scrollTo({top:document.body.scrollHeight,behavior:"smooth"});
}

if ($("cancelEdit")) $("cancelEdit").onclick = resetTournamentForm;

function resetTournamentForm(){
  if ($("tournamentForm")) $("tournamentForm").reset();
  if ($("editTournamentId")) $("editTournamentId").value = "";
  if ($("saveTournament")) $("saveTournament").textContent = "Create Tournament";
  if ($("cancelEdit")) $("cancelEdit").classList.add("hidden");
}

async function removeTournament(id){
  if(!confirm("Delete this tournament?")) return;
  try{
    await deleteDoc(doc(db,"tournaments",id));
    toast("Tournament deleted.");
    await loadTournaments();
  }catch(err){ toast(err.message); }
}

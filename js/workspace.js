import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.10.0/firebase-auth.js";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-firestore.js";
import {
  getDownloadURL,
  ref,
  uploadBytes
} from "https://www.gstatic.com/firebasejs/12.10.0/firebase-storage.js";
import { auth, createAccount, db, ensureSignedIn, signInToAccount, signOutToGuest, storage } from "./firebase.js";

const DEFAULT_PROFILE = { name: "Wandering Player", color: "#d97706" };
const MAP_MIN = 480;
const MAP_MAX = 3200;
const TOKEN_MIN = 36;
const TOKEN_MAX = 256;

const state = {
  user: null,
  authSignature: "",
  authReady: false,
  authFailed: false,
  profile: loadProfile(),
  characters: [],
  activeCharacterId: null,
  activeView: "campaign",
  activeTool: "move",
  currentCampaignId: null,
  currentCampaign: null,
  currentMapId: null,
  campaigns: [],
  maps: [],
  members: [],
  tokens: [],
  drawings: [],
  fogActions: [],
  sharedPages: [],
  privatePages: [],
  activeSharedPageId: null,
  activePrivatePageId: null,
  selected: null,
  zoom: 1,
  pan: { x: 56, y: 56 },
  dragging: null,
  panning: null,
  pendingStroke: null,
  pendingFog: null,
  pendingPatches: new Map(),
  patchTimer: null,
  pendingPresence: null,
  presenceTimer: null,
  unsubs: [],
  mapUnsubs: [],
  overlayWatchKey: "",
  campaignListUnsub: null,
  userDocUnsub: null,
  characterUnsub: null,
  summaryTimer: null,
  noteTimers: { shared: null, private: null },
  characterSaveTimer: null,
  toolHintTimer: null,
  boardDragDepth: 0
};

const els = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  cacheEls();
  bindUi();
  renderProfile();
  renderAccountPanel();
  renderViews();
  renderCampaignList();
  renderMembers();
  renderMapList();
  renderCharacters();
  renderRosterEditor();
  renderNotes("shared");
  renderNotes("private");
  updateInspector();
  showToolHint();
  updateAuthControls();
  setStatus("Connecting to Firebase...");

  onAuthStateChanged(auth, async user => {
    if (!user) {
      const hadUser = !!state.user;
      state.user = null;
      state.authSignature = "";
      state.authReady = false;
      cleanupUserDataSubs();
      if (hadUser) {
        resetSessionForAccountSwitch();
      }
      renderAccountPanel();
      updateAuthControls();
      return;
    }

    const nextSignature = `${user.uid}:${user.isAnonymous}:${user.email || ""}`;
    if (state.authSignature === nextSignature && state.authReady) {
      return;
    }

    const previousUid = state.user?.uid || null;
    const uidChanged = !!previousUid && previousUid !== user.uid;

    state.user = user;
    state.authSignature = nextSignature;
    state.authReady = true;
    state.authFailed = false;
    renderAccountPanel();
    updateAuthControls();
    if (uidChanged) {
      resetSessionForAccountSwitch();
    }
    await syncUserProfileDoc();
    watchUserData();
    watchCampaignList();
    setStatus(user.isAnonymous ? `Connected as guest ${state.profile.name}` : `Signed in as ${user.email || state.profile.name}`);
  });

  try {
    await ensureSignedIn();
  } catch (error) {
    console.error("Anonymous sign-in failed", error);
    state.authFailed = true;
    updateAuthControls();
    setStatus("Firebase sign-in failed. Enable Anonymous Auth in Firebase Authentication.");
  }
  window.setInterval(() => {
    renderMembers();
    renderOverview();
    renderCursors();
  }, 10000);
}

function cacheEls() {
  [
    "displayNameInput", "playerColorInput", "saveProfileBtn", "authStatus",
    "accountModeLabel", "guestAuthForm", "accountActions", "accountEmailLabel",
    "authEmailInput", "authPasswordInput", "createAccountBtn", "signInBtn", "signOutBtn",
    "campaignNameInput", "createCampaignBtn", "joinCodeInput", "joinCampaignBtn",
    "campaignList", "memberList", "memberCount", "campaignTitle", "campaignMeta",
    "copyCodeBtn", "campaignView", "mapView", "sharedNotesView", "privateNotesView",
    "charactersView",
    "overviewName", "overviewCode", "overviewMapCount", "overviewPageCount",
    "overviewOnlineCount", "campaignOwnerLabel", "campaignSummaryInput", "campaignAdminHint", "rosterEditor",
    "mapUpload", "markerUpload", "uploadMapsBtn", "placePlayerMarkerBtn", "uploadMarkerBtn", "deleteSelectionBtn",
    "brushSizeInput", "drawColorInput", "zoomInput", "toggleFogBtn", "clearDrawingBtn",
    "clearFogBtn", "mapList", "mapCount", "activeMapName", "toolHint", "boardViewport", "boardDropHint",
    "boardStage", "mapBoard", "mapItemLayer", "tokenLayer", "cursorLayer", "drawCanvas",
    "fogCanvas", "selectionLabel", "inspectorEmpty", "inspectorForm", "selectedNameInput",
    "selectedSizeInput", "selectedXInput", "selectedYInput", "selectionMeta", "sizeLabel",
    "characterList", "characterAccountHint", "addCharacterBtn", "deleteCharacterBtn",
    "characterNameInput", "characterTitleInput", "characterClassInput", "characterLevelInput",
    "characterAncestryInput", "characterNotesInput", "characterSaveStatus",
    "sharedPageList", "privatePageList", "addSharedPageBtn", "addPrivatePageBtn",
    "sharedTitleInput", "sharedBodyInput", "sharedSaveStatus", "privateTitleInput",
    "privateBodyInput", "privateSaveStatus"
  ].forEach(id => {
    els[id] = document.getElementById(id);
  });
}

function bindUi() {
  els.saveProfileBtn.addEventListener("click", saveProfile);
  els.createAccountBtn.addEventListener("click", createAccountFromUi);
  els.signInBtn.addEventListener("click", signInFromUi);
  els.signOutBtn.addEventListener("click", signOutFromUi);
  els.authPasswordInput.addEventListener("keydown", onAuthPasswordKeyDown);
  els.createCampaignBtn.addEventListener("click", createCampaign);
  els.joinCampaignBtn.addEventListener("click", joinCampaign);
  els.campaignNameInput.addEventListener("keydown", onCampaignNameKeyDown);
  els.joinCodeInput.addEventListener("input", onJoinCodeInput);
  els.joinCodeInput.addEventListener("keydown", onJoinCodeKeyDown);
  els.copyCodeBtn.addEventListener("click", copyJoinCode);
  els.uploadMapsBtn.addEventListener("click", () => els.mapUpload.click());
  els.placePlayerMarkerBtn.addEventListener("click", placePlayerMarker);
  els.uploadMarkerBtn.addEventListener("click", () => els.markerUpload.click());
  els.mapUpload.addEventListener("change", () => uploadMaps([...els.mapUpload.files]));
  els.markerUpload.addEventListener("change", () => uploadMarker(els.markerUpload.files[0]));
  els.zoomInput.addEventListener("input", () => {
    state.zoom = clamp(Number(els.zoomInput.value) / 100, 0.4, 2.2);
    applyStageTransform();
  });
  els.toggleFogBtn.addEventListener("click", toggleFog);
  els.clearDrawingBtn.addEventListener("click", clearOverlayCollection.bind(null, "drawings"));
  els.clearFogBtn.addEventListener("click", clearOverlayCollection.bind(null, "fogActions"));
  els.deleteSelectionBtn.addEventListener("click", deleteSelection);
  els.campaignSummaryInput.addEventListener("input", scheduleSummarySave);
  els.addCharacterBtn.addEventListener("click", createCharacter);
  els.deleteCharacterBtn.addEventListener("click", deleteCharacter);
  els.characterNameInput.addEventListener("input", scheduleCharacterSave);
  els.characterTitleInput.addEventListener("input", scheduleCharacterSave);
  els.characterClassInput.addEventListener("input", scheduleCharacterSave);
  els.characterLevelInput.addEventListener("input", scheduleCharacterSave);
  els.characterAncestryInput.addEventListener("input", scheduleCharacterSave);
  els.characterNotesInput.addEventListener("input", scheduleCharacterSave);
  els.addSharedPageBtn.addEventListener("click", () => createNotePage("shared"));
  els.addPrivatePageBtn.addEventListener("click", () => createNotePage("private"));
  els.sharedTitleInput.addEventListener("input", () => scheduleNoteSave("shared"));
  els.sharedBodyInput.addEventListener("input", () => scheduleNoteSave("shared"));
  els.privateTitleInput.addEventListener("input", () => scheduleNoteSave("private"));
  els.privateBodyInput.addEventListener("input", () => scheduleNoteSave("private"));
  els.selectedNameInput.addEventListener("input", syncInspectorSelection);
  els.selectedSizeInput.addEventListener("input", syncInspectorSelection);
  els.selectedXInput.addEventListener("change", syncInspectorSelection);
  els.selectedYInput.addEventListener("change", syncInspectorSelection);
  els.boardViewport.addEventListener("pointerdown", onBoardDown);
  els.boardViewport.addEventListener("pointermove", onBoardMove);
  els.boardViewport.addEventListener("pointerup", onBoardUp);
  els.boardViewport.addEventListener("pointerleave", onBoardUp);
  els.boardViewport.addEventListener("wheel", onBoardWheel, { passive: false });
  els.boardViewport.addEventListener("dragenter", onBoardDragEnter);
  els.boardViewport.addEventListener("dragover", onBoardDragOver);
  els.boardViewport.addEventListener("dragleave", onBoardDragLeave);
  els.boardViewport.addEventListener("drop", onBoardDrop);
  window.addEventListener("dragover", onWindowFileDragOver);
  window.addEventListener("drop", onWindowFileDrop);

  document.querySelectorAll("[data-view]").forEach(button => {
    button.addEventListener("click", () => setView(button.dataset.view));
  });

  document.querySelectorAll("[data-tool]").forEach(button => {
    button.addEventListener("click", () => setTool(button.dataset.tool));
  });
}

function renderProfile() {
  els.displayNameInput.value = state.profile.name;
  els.playerColorInput.value = state.profile.color;
}

function setStatus(text) {
  els.authStatus.textContent = text;
}

function updateAuthControls() {
  const waitingForAuth = !state.authReady;
  els.createCampaignBtn.disabled = waitingForAuth;
  els.joinCampaignBtn.disabled = waitingForAuth;
  els.campaignNameInput.disabled = waitingForAuth;
  els.joinCodeInput.disabled = waitingForAuth;
  els.authEmailInput.disabled = waitingForAuth;
  els.authPasswordInput.disabled = waitingForAuth;
  els.createAccountBtn.disabled = waitingForAuth;
  els.signInBtn.disabled = waitingForAuth;
  els.signOutBtn.disabled = waitingForAuth || !state.user || state.user.isAnonymous;
}

function renderAccountPanel() {
  const accountUser = !!state.user && !state.user.isAnonymous;
  els.accountModeLabel.textContent = accountUser ? "Account" : "Guest";
  els.guestAuthForm.classList.toggle("hidden", accountUser);
  els.accountActions.classList.toggle("hidden", !accountUser);
  els.accountEmailLabel.textContent = accountUser
    ? `Signed in as ${state.user.email || state.profile.name}`
    : "";
  els.characterAccountHint.textContent = accountUser
    ? "Characters save to your account and follow you across devices."
    : "Guest mode: create an account to keep your characters across devices.";
}

function accountAuthError(error, fallback) {
  const messages = {
    "auth/email-already-in-use": "That email is already in use. Try signing in instead.",
    "auth/invalid-email": "That email address does not look valid.",
    "auth/invalid-credential": "That email and password did not match an account.",
    "auth/network-request-failed": "The network request failed. Check your connection and try again.",
    "auth/too-many-requests": "Too many attempts hit Firebase at once. Wait a moment and try again.",
    "auth/user-not-found": "No account was found for that email yet.",
    "auth/weak-password": "Use a password with at least 6 characters.",
    "auth/wrong-password": "That password did not match this account."
  };

  return messages[error?.code] || fallback;
}

function cleanupUserDataSubs() {
  state.userDocUnsub?.();
  state.characterUnsub?.();
  state.userDocUnsub = null;
  state.characterUnsub = null;
  state.characters = [];
  state.activeCharacterId = null;
  window.clearTimeout(state.characterSaveTimer);
  state.characterSaveTimer = null;
  renderCharacters();
}

function resetSessionForAccountSwitch() {
  state.campaignListUnsub?.();
  state.campaignListUnsub = null;
  cleanupCampaignSubs();
  cleanupMapSubs();
  state.currentCampaignId = null;
  state.currentCampaign = null;
  state.currentMapId = null;
  state.campaigns = [];
  state.maps = [];
  state.members = [];
  state.tokens = [];
  state.drawings = [];
  state.fogActions = [];
  state.sharedPages = [];
  state.privatePages = [];
  state.activeSharedPageId = null;
  state.activePrivatePageId = null;
  state.selected = null;
  state.dragging = null;
  state.panning = null;
  state.pendingStroke = null;
  state.pendingFog = null;
  state.pendingPresence = null;
  state.pendingPatches.clear();
  els.campaignTitle.textContent = "Choose or create a campaign";
  els.campaignMeta.textContent = "Your live map, campaign notes, and private notes will show up here.";
  els.campaignSummaryInput.value = "";
  window.clearTimeout(state.patchTimer);
  state.patchTimer = null;
  window.clearTimeout(state.presenceTimer);
  state.presenceTimer = null;
  window.clearTimeout(state.summaryTimer);
  state.summaryTimer = null;
  Object.keys(state.noteTimers).forEach(key => {
    window.clearTimeout(state.noteTimers[key]);
    state.noteTimers[key] = null;
  });
  setView("campaign");
  renderCampaignList();
  renderMembers();
  renderMapList();
  renderRosterEditor();
  renderNotes("shared");
  renderNotes("private");
  renderBoard();
  updateInspector();
  renderOverview();
}

async function syncUserProfileDoc({ preferRemote = false } = {}) {
  if (!state.user) return;

  const userRef = doc(db, "users", state.user.uid);
  const snap = await getDoc(userRef);
  const existing = snap.exists() ? snap.data() : null;
  const remoteProfile = existing?.profile || null;

  if (preferRemote && remoteProfile) {
    state.profile = {
      name: sanitizeName(remoteProfile.name || state.user.displayName || state.profile.name) || DEFAULT_PROFILE.name,
      color: remoteProfile.color || state.profile.color || DEFAULT_PROFILE.color
    };
  } else {
    state.profile = {
      name: sanitizeName(state.profile.name || state.user.displayName || remoteProfile?.name) || DEFAULT_PROFILE.name,
      color: state.profile.color || remoteProfile?.color || DEFAULT_PROFILE.color
    };
  }

  if (preferRemote && !state.activeCharacterId && existing?.activeCharacterId) {
    state.activeCharacterId = existing.activeCharacterId;
  }

  localStorage.setItem("campaign-chronicle-profile", JSON.stringify(state.profile));
  renderProfile();
  renderAccountPanel();

  await setDoc(userRef, {
    email: state.user.email || null,
    isAnonymous: !!state.user.isAnonymous,
    profile: state.profile,
    activeCharacterId: state.activeCharacterId || null,
    updatedAt: Date.now()
  }, { merge: true });
}

function watchUserData() {
  cleanupUserDataSubs();
  if (!state.user) {
    return;
  }

  state.userDocUnsub = onSnapshot(doc(db, "users", state.user.uid), snapshot => {
    const data = snapshot.exists() ? snapshot.data() : {};
    if (data.profile) {
      const nextProfile = {
        name: sanitizeName(data.profile.name || state.profile.name) || DEFAULT_PROFILE.name,
        color: data.profile.color || state.profile.color || DEFAULT_PROFILE.color
      };
      if (nextProfile.name !== state.profile.name || nextProfile.color !== state.profile.color) {
        state.profile = nextProfile;
        localStorage.setItem("campaign-chronicle-profile", JSON.stringify(state.profile));
        renderProfile();
        renderAccountPanel();
        renderMembers();
        renderRosterEditor();
      }
    }

    if ((data.activeCharacterId || null) !== state.activeCharacterId) {
      state.activeCharacterId = data.activeCharacterId || null;
      renderCharacters();
    }
  });

  state.characterUnsub = onSnapshot(
    query(collection(db, "users", state.user.uid, "characters"), orderBy("updatedAt", "desc")),
    snapshot => {
      state.characters = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

      if (!state.characters.length) {
        state.activeCharacterId = null;
      } else if (!state.activeCharacterId || !state.characters.some(character => character.id === state.activeCharacterId)) {
        state.activeCharacterId = state.characters[0].id;
        syncUserProfileDoc().catch(console.error);
      }

      renderCharacters();
    }
  );
}

function onCampaignNameKeyDown(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  createCampaign().catch(console.error);
}

function onAuthPasswordKeyDown(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  signInFromUi().catch(console.error);
}

function onJoinCodeInput() {
  const normalized = normalizeCampaignCode(els.joinCodeInput.value);
  if (els.joinCodeInput.value !== normalized) {
    els.joinCodeInput.value = normalized;
  }
}

function onJoinCodeKeyDown(event) {
  if (event.key !== "Enter") return;
  event.preventDefault();
  joinCampaign().catch(console.error);
}

async function createAccountFromUi() {
  const email = els.authEmailInput.value.trim();
  const password = els.authPasswordInput.value;
  if (!email || !password) {
    alert("Enter an email and password first.");
    return;
  }

  if (password.length < 6) {
    alert("Passwords need at least 6 characters.");
    return;
  }

  try {
    await createAccount(email, password, state.profile.name);
    await syncUserProfileDoc();
    els.authPasswordInput.value = "";
    renderAccountPanel();
    updateAuthControls();
    setStatus(`Account created for ${email}`);
  } catch (error) {
    console.error("Failed to create account", error);
    alert(accountAuthError(error, "Couldn't create that account."));
  }
}

async function signInFromUi() {
  const email = els.authEmailInput.value.trim();
  const password = els.authPasswordInput.value;
  if (!email || !password) {
    alert("Enter your email and password first.");
    return;
  }

  if (state.user?.isAnonymous && state.currentCampaignId && !confirm("Signing into an existing account will switch away from this guest profile. If you want to keep this guest's campaign access, create an account instead. Continue?")) {
    return;
  }

  try {
    await signInToAccount(email, password);
    els.authPasswordInput.value = "";
    setStatus(`Signed into ${email}`);
  } catch (error) {
    console.error("Failed to sign in", error);
    alert(accountAuthError(error, "Couldn't sign into that account."));
  }
}

async function signOutFromUi() {
  if (!state.user || state.user.isAnonymous) return;
  if (!confirm("Sign out of this account and continue as a guest?")) return;

  try {
    await signOutToGuest();
    els.authPasswordInput.value = "";
    setStatus("Signed out to guest mode.");
  } catch (error) {
    console.error("Failed to sign out", error);
    alert("Couldn't sign out right now. Try again in a moment.");
  }
}

async function requireSignedIn() {
  if (state.user) {
    return state.user;
  }

  if (!state.authFailed) {
    setStatus("Finishing Firebase sign-in...");
  }

  try {
    const user = await ensureSignedIn();
    state.user = user;
    state.authReady = true;
    state.authFailed = false;
    updateAuthControls();
    return user;
  } catch (error) {
    console.error("Anonymous sign-in failed", error);
    state.authFailed = true;
    updateAuthControls();
    setStatus("Firebase sign-in failed. Enable Anonymous Auth in Firebase Authentication.");
    alert("Sign-in is not ready yet. Enable Anonymous Auth in Firebase Authentication, then refresh and try again.");
    return null;
  }
}

async function createCampaign() {
  if (!await requireSignedIn()) return;
  const name = els.campaignNameInput.value.trim();
  if (!name) {
    alert("Add a campaign name first.");
    return;
  }

  try {
    const code = await generateCode();
    const now = Date.now();
    await setDoc(doc(db, "campaigns", code), {
      name,
      code,
      ownerId: state.user.uid,
      summary: "",
      createdAt: now,
      updatedAt: now
    });

    await setDoc(doc(db, "users", state.user.uid, "campaigns", code), {
      code,
      name,
      role: "DM",
      updatedAt: now
    });

    await setDoc(doc(db, "campaigns", code, "members", state.user.uid), {
      name: state.profile.name,
      color: state.profile.color,
      role: "DM",
      heartbeatAt: now,
      joinedAt: now,
      currentMapId: null,
      activeView: state.activeView
    });

    await setDoc(doc(db, "campaigns", code, "sharedPages", "session-log"), {
      title: "Session Log",
      content: "",
      createdAt: now,
      updatedAt: now,
      createdBy: state.user.uid
    });

    els.campaignNameInput.value = "";
    await openCampaign(code);
    setStatus(`Campaign created with join code ${code}`);
    alert(`Campaign created. Share join code ${code} with your players.`);
  } catch (error) {
    console.error("Failed to create campaign", error);
    setStatus("Campaign creation failed. Check Firebase Authentication and Firestore rules.");
    alert("Campaign creation failed. Refresh the page and try again.");
  }
}

async function joinCampaign() {
  if (!await requireSignedIn()) return;
  const code = normalizeCampaignCode(els.joinCodeInput.value);
  els.joinCodeInput.value = code;
  if (!code) {
    alert("Enter a join code first.");
    return;
  }

  if (code.length !== 6) {
    alert("Join codes are 6 characters. Double-check the code and try again.");
    return;
  }

  try {
    const snap = await getDoc(doc(db, "campaigns", code));
    if (!snap.exists()) {
      alert(`No campaign was found for code ${code}.`);
      return;
    }

    const campaign = snap.data();
    const now = Date.now();
    const batch = writeBatch(db);
    batch.set(doc(db, "users", state.user.uid, "campaigns", code), {
      code,
      name: campaign.name,
      role: campaign.ownerId === state.user.uid ? "DM" : "Player",
      updatedAt: now
    }, { merge: true });
    batch.set(doc(db, "campaigns", code, "members", state.user.uid), {
      name: state.profile.name,
      color: state.profile.color,
      role: campaign.ownerId === state.user.uid ? "DM" : "Player",
      heartbeatAt: now,
      joinedAt: now,
      currentMapId: null,
      activeView: state.activeView
    }, { merge: true });
    await batch.commit();
    els.joinCodeInput.value = "";
    await openCampaign(code);
    setStatus(`Joined ${campaign.name} with code ${code}`);
  } catch (error) {
    console.error("Failed to join campaign", error);
    setStatus("Join failed. Check Firebase Authentication and Firestore rules.");
    alert("Couldn't join that campaign right now. Refresh and try again.");
  }
}

function watchCampaignList() {
  state.campaignListUnsub?.();
  if (!state.user) {
    state.campaignListUnsub = null;
    state.campaigns = [];
    renderCampaignList();
    return;
  }

  state.campaignListUnsub = onSnapshot(
    query(collection(db, "users", state.user.uid, "campaigns"), orderBy("updatedAt", "desc")),
    snapshot => {
      state.campaigns = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      renderCampaignList();
      if (!state.currentCampaignId && state.campaigns.length) {
        openCampaign(state.campaigns[0].id);
      }
    }
  );
}

async function openCampaign(campaignId) {
  cleanupCampaignSubs();
  cleanupMapSubs();
  state.currentCampaignId = campaignId;
  state.currentCampaign = null;
  state.currentMapId = null;
  state.maps = [];
  state.tokens = [];
  state.drawings = [];
  state.fogActions = [];
  state.sharedPages = [];
  state.privatePages = [];
  state.selected = null;
  renderBoard();
  updateInspector();

  state.unsubs.push(onSnapshot(doc(db, "campaigns", campaignId), snapshot => {
    if (!snapshot.exists()) return;
    state.currentCampaign = { id: snapshot.id, ...snapshot.data() };
    els.campaignTitle.textContent = state.currentCampaign.name;
    els.campaignMeta.textContent = `Join code ${state.currentCampaign.code} • autosaved with Firebase`;
    if (document.activeElement !== els.campaignSummaryInput) {
      els.campaignSummaryInput.value = state.currentCampaign.summary || "";
    }
    renderOverview();
    renderCampaignList();
    renderRosterEditor();
  }));

  state.unsubs.push(onSnapshot(
    query(collection(db, "campaigns", campaignId, "maps"), orderBy("createdAt", "asc")),
    snapshot => {
      state.maps = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      if (!state.currentMapId || !state.maps.some(map => map.id === state.currentMapId)) {
        state.currentMapId = state.maps[0]?.id || null;
        resetBoardView();
        watchCurrentMap();
      }
      watchMapOverlays();
      renderMapList();
      renderBoard();
      renderOverview();
    }
  ));

  state.unsubs.push(onSnapshot(collection(db, "campaigns", campaignId, "members"), snapshot => {
    state.members = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
    renderMembers();
    renderRosterEditor();
    renderOverview();
    renderCursors();
  }));

  state.unsubs.push(onSnapshot(
    query(collection(db, "campaigns", campaignId, "tokens"), orderBy("createdAt", "asc")),
    snapshot => {
      state.tokens = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      renderBoard();
      updateInspector();
    }
  ));

  state.unsubs.push(onSnapshot(
    query(collection(db, "campaigns", campaignId, "sharedPages"), orderBy("createdAt", "asc")),
    snapshot => {
      state.sharedPages = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      if (!state.activeSharedPageId || !state.sharedPages.some(page => page.id === state.activeSharedPageId)) {
        state.activeSharedPageId = state.sharedPages[0]?.id || null;
      }
      renderNotes("shared");
      renderOverview();
    }
  ));

  state.unsubs.push(onSnapshot(
    query(collection(db, "users", state.user.uid, "campaignNotes", campaignId, "pages"), orderBy("createdAt", "asc")),
    snapshot => {
      state.privatePages = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      if (!state.activePrivatePageId || !state.privatePages.some(page => page.id === state.activePrivatePageId)) {
        state.activePrivatePageId = state.privatePages[0]?.id || null;
      }
      renderNotes("private");
    }
  ));

  await ensureMembership(campaignId);
}

async function ensureMembership(campaignId) {
  const snap = await getDoc(doc(db, "campaigns", campaignId));
  if (!snap.exists()) return;
  const campaign = snap.data();
  await setDoc(doc(db, "users", state.user.uid, "campaigns", campaignId), {
    code: campaign.code,
    name: campaign.name,
    role: campaign.ownerId === state.user.uid ? "DM" : "Player",
    updatedAt: Date.now()
  }, { merge: true });
  await syncPresence({ heartbeat: true });
}

function watchCurrentMap() {
  if (!state.currentCampaignId || !state.currentMapId) {
    renderBoard();
    renderOverlays();
    return;
  }
  syncPresence({ heartbeat: true }).catch(console.error);
}

function watchMapOverlays() {
  const watchKey = state.maps.map(map => map.id).sort().join("|");
  if (watchKey === state.overlayWatchKey) {
    return;
  }

  cleanupMapSubs();
  state.overlayWatchKey = watchKey;

  if (!state.currentCampaignId || !state.maps.length) {
    renderOverlays();
    return;
  }

  state.maps.forEach(map => {
    const path = ["campaigns", state.currentCampaignId, "maps", map.id];

    state.mapUnsubs.push(onSnapshot(
      query(collection(db, ...path, "drawings"), orderBy("createdAt", "asc")),
      snapshot => {
        state.drawings = state.drawings
          .filter(entry => entry.mapId !== map.id)
          .concat(snapshot.docs.map(docSnap => ({ id: docSnap.id, mapId: map.id, ...docSnap.data() })));
        renderOverlays();
      }
    ));

    state.mapUnsubs.push(onSnapshot(
      query(collection(db, ...path, "fogActions"), orderBy("createdAt", "asc")),
      snapshot => {
        state.fogActions = state.fogActions
          .filter(entry => entry.mapId !== map.id)
          .concat(snapshot.docs.map(docSnap => ({ id: docSnap.id, mapId: map.id, ...docSnap.data() })));
        renderOverlays();
      }
    ));
  });
}

function renderCampaignList() {
  if (!state.campaigns.length) {
    els.campaignList.innerHTML = `<div class="empty-state">Create a campaign or join one with a code.</div>`;
    return;
  }

  els.campaignList.innerHTML = state.campaigns.map(campaign => `
    <button class="list-item ${campaign.id === state.currentCampaignId ? "is-active" : ""}" data-campaign-id="${campaign.id}">
      <span class="list-item-title">${escapeHtml(campaign.name || campaign.id)}</span>
      <span class="list-item-meta">${escapeHtml(campaign.code || campaign.id)} • ${escapeHtml(campaign.role || "Player")}</span>
    </button>
  `).join("");

  els.campaignList.querySelectorAll("[data-campaign-id]").forEach(button => {
    button.addEventListener("click", () => openCampaign(button.dataset.campaignId));
  });
}

function renderMembers() {
  const members = [...state.members].sort((a, b) => (b.heartbeatAt || 0) - (a.heartbeatAt || 0));
  els.memberCount.textContent = String(members.length);
  els.memberList.innerHTML = members.length ? members.map(member => `
    <div class="member-card">
      <div class="member-card-head">
        <div class="member-swatch" style="background:${escapeHtml(member.color || DEFAULT_PROFILE.color)}"></div>
        <div class="member-copy">
          <strong>${escapeHtml(member.name || "Unknown player")}</strong>
          <span class="muted">${escapeHtml(memberMeta(member))}</span>
        </div>
      </div>
    </div>
  `).join("") : `<div class="empty-state">Player presence will show up here after someone joins.</div>`;
}

function isCampaignOwner() {
  return !!state.currentCampaignId && state.currentCampaign?.ownerId === state.user?.uid;
}

function memberMeta(member) {
  const bits = [];
  if (member.title) {
    bits.push(member.title);
  }
  bits.push(member.id === state.currentCampaign?.ownerId ? "DM" : (member.role || "Player"));
  bits.push(isOnline(member) ? "Online" : "Away");
  return bits.join(" | ");
}

function renderOverview() {
  const campaign = state.currentCampaign;
  els.overviewName.textContent = campaign?.name || "No campaign selected";
  els.overviewCode.textContent = campaign?.code || "-";
  els.overviewMapCount.textContent = String(state.maps.length);
  els.overviewPageCount.textContent = String(state.sharedPages.length);
  els.overviewOnlineCount.textContent = String(state.members.filter(isOnline).length);
  els.campaignOwnerLabel.textContent = `Owner: ${ownerName(campaign?.ownerId)}`;
}

function renderViews() {
  const views = {
    campaign: els.campaignView,
    map: els.mapView,
    characters: els.charactersView,
    "shared-notes": els.sharedNotesView,
    "private-notes": els.privateNotesView
  };
  Object.entries(views).forEach(([name, node]) => node.classList.toggle("is-active", state.activeView === name));
  document.querySelectorAll("[data-view]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.view === state.activeView);
  });
}

function renderMapList() {
  els.mapCount.textContent = String(state.maps.length);
  const map = getActiveMap();
  els.activeMapName.textContent = map ? `${map.name} (active map)` : "Upload a map to begin";
  els.toggleFogBtn.textContent = `Fog: ${map?.fogEnabled ? "On" : "Off"}`;
  els.mapList.innerHTML = state.maps.length ? state.maps.map(mapItem => `
    <button class="list-item ${mapItem.id === state.currentMapId ? "is-active" : ""}" data-map-id="${mapItem.id}">
      <span class="list-item-title">${escapeHtml(mapItem.name || "Unnamed map")}</span>
      <span class="list-item-meta">${Math.round(mapItem.width || 0)}px wide • ${mapItem.fogEnabled ? "Fog on" : "Fog off"}</span>
    </button>
  `).join("") : `<div class="empty-state">Upload one or many maps. They stay on the board together so you can stitch them into one scene.</div>`;

  els.mapList.querySelectorAll("[data-map-id]").forEach(button => {
    button.addEventListener("click", () => {
      state.currentMapId = button.dataset.mapId;
      state.selected = null;
      resetBoardView();
      watchCurrentMap();
      renderMapList();
      renderBoard();
      updateInspector();
    });
  });
}

function renderBoard() {
  const size = boardSize();
  els.mapBoard.style.width = `${size.width}px`;
  els.mapBoard.style.height = `${size.height}px`;
  resizeCanvas(els.drawCanvas, size);
  resizeCanvas(els.fogCanvas, size);

  els.mapItemLayer.innerHTML = state.maps.map(map => `
    <div class="scene-item map-item ${isSelected("map", map.id) ? "is-selected" : ""} ${map.id === state.currentMapId ? "is-active-map" : ""}" data-kind="map" data-id="${map.id}" style="left:${map.x}px;top:${map.y}px;width:${map.width}px;height:${map.height}px;">
      <img src="${escapeHtml(map.imageUrl)}" alt="${escapeHtml(map.name)}">
      <canvas class="map-overlay map-draw-layer"></canvas>
      <canvas class="map-overlay map-fog-layer"></canvas>
      <div class="scene-tag">${escapeHtml(map.id === state.currentMapId ? `${map.name} - active` : map.name)}</div>
    </div>
  `).join("");

  els.tokenLayer.innerHTML = state.tokens.map(token => `
    <div class="scene-item token-item ${isSelected("token", token.id) ? "is-selected" : ""}" data-kind="token" data-id="${token.id}" style="left:${token.x}px;top:${token.y}px;width:${token.size}px;height:${token.size}px;">
      ${renderTokenVisual(token)}
      <div class="scene-tag">${escapeHtml(token.name)}</div>
    </div>
  `).join("");

  renderCursors();
  renderOverlays();
  applyStageTransform();
}

function renderCursors() {
  if (!state.currentMapId) {
    els.cursorLayer.innerHTML = "";
    return;
  }

  els.cursorLayer.innerHTML = state.members.filter(member => {
    return member.id !== state.user?.uid && member.currentMapId === state.currentMapId && member.cursor && isOnline(member);
  }).map(member => `
    <div class="cursor-dot" style="left:${member.cursor.x}px;top:${member.cursor.y}px;background:${escapeHtml(member.color || DEFAULT_PROFILE.color)}"></div>
    <div class="cursor-label" style="left:${member.cursor.x}px;top:${member.cursor.y}px;">${escapeHtml(member.name || "Player")}</div>
  `).join("");
}

function renderOverlays() {
  const boardDrawCtx = els.drawCanvas.getContext("2d");
  const boardFogCtx = els.fogCanvas.getContext("2d");
  boardDrawCtx.clearRect(0, 0, els.drawCanvas.width, els.drawCanvas.height);
  boardFogCtx.clearRect(0, 0, els.fogCanvas.width, els.fogCanvas.height);

  state.maps.forEach(map => {
    const mapNode = els.mapItemLayer.querySelector(`[data-kind="map"][data-id="${map.id}"]`);
    if (!mapNode) return;

    const drawCanvas = mapNode.querySelector(".map-draw-layer");
    const fogCanvas = mapNode.querySelector(".map-fog-layer");
    resizeLocalOverlayCanvas(drawCanvas, map);
    resizeLocalOverlayCanvas(fogCanvas, map);

    const drawCtx = drawCanvas.getContext("2d");
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    [...state.drawings.filter(entry => entry.mapId === map.id), ...(state.pendingStroke?.mapId === map.id ? [state.pendingStroke] : [])]
      .forEach(stroke => drawPath(drawCtx, stroke, stroke.color || "#f97316", map));

    const fogCtx = fogCanvas.getContext("2d");
    fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    if (!map.fogEnabled) return;
    fogCtx.fillStyle = "rgba(8, 10, 14, 0.86)";
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    [...state.fogActions.filter(entry => entry.mapId === map.id), ...(state.pendingFog?.mapId === map.id ? [state.pendingFog] : [])]
      .forEach(action => drawFogAction(fogCtx, action, map));
  });
}

function renderNotes(kind) {
  const pages = kind === "shared" ? state.sharedPages : state.privatePages;
  const currentId = kind === "shared" ? state.activeSharedPageId : state.activePrivatePageId;
  const safeId = pages.some(page => page.id === currentId) ? currentId : pages[0]?.id || null;
  if (kind === "shared") state.activeSharedPageId = safeId;
  else state.activePrivatePageId = safeId;

  const list = kind === "shared" ? els.sharedPageList : els.privatePageList;
  const title = kind === "shared" ? els.sharedTitleInput : els.privateTitleInput;
  const body = kind === "shared" ? els.sharedBodyInput : els.privateBodyInput;

  if (!pages.length) {
    list.innerHTML = `<div class="empty-state">Create the first ${kind === "shared" ? "shared" : "private"} page.</div>`;
    title.value = "";
    body.value = "";
    return;
  }

  list.innerHTML = pages.map(page => `
    <button class="list-item ${page.id === safeId ? "is-active" : ""}" data-page-kind="${kind}" data-page-id="${page.id}">
      <span class="list-item-title">${escapeHtml(page.title || "Untitled page")}</span>
      <span class="list-item-meta">Autosaved notes page</span>
    </button>
  `).join("");

  list.querySelectorAll("[data-page-id]").forEach(button => {
    button.addEventListener("click", () => {
      if (kind === "shared") state.activeSharedPageId = button.dataset.pageId;
      else state.activePrivatePageId = button.dataset.pageId;
      renderNotes(kind);
    });
  });

  const page = pages.find(entry => entry.id === safeId);
  if (document.activeElement !== title) title.value = page?.title || "";
  if (document.activeElement !== body) body.value = page?.content || "";
}

function selectedCharacter() {
  return state.characters.find(character => character.id === state.activeCharacterId) || null;
}

function renderCharacters() {
  const character = selectedCharacter();
  const hasUser = !!state.user;
  const accountHint = state.user?.isAnonymous
    ? "Guest characters stay with this profile until you create or link an account."
    : "Character sheets autosave to your account.";

  els.characterAccountHint.textContent = hasUser
    ? accountHint
    : "Connecting to Firebase so your character sheets can load.";
  els.addCharacterBtn.disabled = !hasUser;
  els.deleteCharacterBtn.disabled = !character;

  if (!state.characters.length) {
    els.characterList.innerHTML = `<div class="empty-state">Create a character sheet to track names, class, notes, and titles.</div>`;
  } else {
    els.characterList.innerHTML = state.characters.map(entry => {
      const metaBits = [];
      if (entry.title) metaBits.push(entry.title);
      if (entry.level) metaBits.push(`Level ${entry.level}`);
      if (entry.className) metaBits.push(entry.className);
      if (entry.ancestry) metaBits.push(entry.ancestry);
      return `
        <button class="list-item ${entry.id === state.activeCharacterId ? "is-active" : ""}" data-character-id="${entry.id}">
          <span class="list-item-title">${escapeHtml(entry.name || "Untitled character")}</span>
          <span class="list-item-meta">${escapeHtml(metaBits.join(" | ") || "Character sheet")}</span>
        </button>
      `;
    }).join("");

    els.characterList.querySelectorAll("[data-character-id]").forEach(button => {
      button.addEventListener("click", () => {
        state.activeCharacterId = button.dataset.characterId;
        renderCharacters();
        syncUserProfileDoc().catch(console.error);
      });
    });
  }

  const inputs = [
    els.characterNameInput,
    els.characterTitleInput,
    els.characterClassInput,
    els.characterLevelInput,
    els.characterAncestryInput,
    els.characterNotesInput
  ];

  if (!character) {
    inputs.forEach(input => {
      input.disabled = true;
      input.value = "";
    });
    els.characterSaveStatus.textContent = state.characters.length ? "Pick a character sheet to edit it." : "Character sheets autosave after you create one.";
    return;
  }

  inputs.forEach(input => {
    input.disabled = false;
  });

  if (document.activeElement !== els.characterNameInput) els.characterNameInput.value = character.name || "";
  if (document.activeElement !== els.characterTitleInput) els.characterTitleInput.value = character.title || "";
  if (document.activeElement !== els.characterClassInput) els.characterClassInput.value = character.className || "";
  if (document.activeElement !== els.characterLevelInput) els.characterLevelInput.value = character.level ? String(character.level) : "";
  if (document.activeElement !== els.characterAncestryInput) els.characterAncestryInput.value = character.ancestry || "";
  if (document.activeElement !== els.characterNotesInput) els.characterNotesInput.value = character.notes || "";
  if (!state.characterSaveTimer) {
    els.characterSaveStatus.textContent = "Character sheet autosaves.";
  }
}

function renderRosterEditor() {
  if (!state.currentCampaignId || !state.currentCampaign) {
    els.campaignAdminHint.textContent = "No campaign";
    els.rosterEditor.innerHTML = `<div class="empty-state">Open a campaign to manage player titles and DM ownership.</div>`;
    return;
  }

  const draftTitles = {};
  els.rosterEditor.querySelectorAll("[data-title-input]").forEach(input => {
    draftTitles[input.dataset.titleInput] = input.value;
  });

  const owner = isCampaignOwner();
  const members = [...state.members].sort((a, b) => (b.heartbeatAt || 0) - (a.heartbeatAt || 0));
  els.campaignAdminHint.textContent = owner ? "DM tools" : "Read only";
  if (document.activeElement?.matches?.("[data-title-input]")) {
    return;
  }

  if (!members.length) {
    els.rosterEditor.innerHTML = `<div class="empty-state">Players will appear here after they join the campaign.</div>`;
    return;
  }

  els.rosterEditor.innerHTML = members.map(member => {
    const roleLabel = member.id === state.currentCampaign.ownerId ? "DM" : (member.role || "Player");
    const titleValue = draftTitles[member.id] ?? member.title ?? "";
    const adminTools = owner ? `
      <div class="member-admin">
        <label class="stacked-field">
          <span>Player title</span>
          <input data-title-input="${member.id}" value="${escapeHtml(titleValue)}" maxlength="36" placeholder="Scout captain, quartermaster, caller...">
        </label>
        <div class="member-admin-row">
          <button class="secondary" data-save-title="${member.id}">Save Title</button>
          ${member.id === state.user?.uid ? `<span class="muted">You are the current DM.</span>` : `<button class="ghost" data-transfer-owner="${member.id}">Make DM</button>`}
        </div>
      </div>
    ` : `
      <p class="muted">${escapeHtml(member.title || "No title set yet.")}</p>
    `;

    return `
      <div class="member-card">
        <div class="member-card-head">
          <div class="member-swatch" style="background:${escapeHtml(member.color || DEFAULT_PROFILE.color)}"></div>
          <div class="member-copy">
            <strong>${escapeHtml(member.name || "Unknown player")}</strong>
            <span class="muted">${escapeHtml(`${roleLabel} | ${isOnline(member) ? "Online" : "Away"}`)}</span>
          </div>
        </div>
        ${adminTools}
      </div>
    `;
  }).join("");

  els.rosterEditor.querySelectorAll("[data-save-title]").forEach(button => {
    button.addEventListener("click", () => saveMemberTitle(button.dataset.saveTitle));
  });
  els.rosterEditor.querySelectorAll("[data-transfer-owner]").forEach(button => {
    button.addEventListener("click", () => transferCampaignOwnership(button.dataset.transferOwner));
  });
}

function characterFormPayload() {
  const rawLevel = Number(els.characterLevelInput.value);
  return {
    name: sanitizeName(els.characterNameInput.value) || "Untitled character",
    title: sanitizeLabel(els.characterTitleInput.value),
    className: sanitizeLabel(els.characterClassInput.value),
    level: Number.isFinite(rawLevel) && rawLevel > 0 ? clamp(Math.round(rawLevel), 1, 20) : 1,
    ancestry: sanitizeLabel(els.characterAncestryInput.value),
    notes: els.characterNotesInput.value
  };
}

async function createCharacter() {
  if (!await requireSignedIn()) return;

  const now = Date.now();
  const nextNumber = state.characters.length + 1;
  const characterRef = await addDoc(collection(db, "users", state.user.uid, "characters"), {
    name: `New Character ${nextNumber}`,
    title: "",
    className: "",
    level: 1,
    ancestry: "",
    notes: "",
    createdAt: now,
    updatedAt: now
  });

  state.activeCharacterId = characterRef.id;
  els.characterSaveStatus.textContent = "Character sheet created.";
  setView("characters");
  await syncUserProfileDoc();
}

async function deleteCharacter() {
  const character = selectedCharacter();
  if (!character || !state.user) return;
  if (!confirm(`Delete ${character.name || "this character"}?`)) return;

  window.clearTimeout(state.characterSaveTimer);
  state.characterSaveTimer = null;
  const remaining = state.characters.filter(entry => entry.id !== character.id);
  state.activeCharacterId = remaining[0]?.id || null;
  await deleteDoc(doc(db, "users", state.user.uid, "characters", character.id));
  els.characterSaveStatus.textContent = remaining.length ? "Character removed." : "Character deleted.";
  await syncUserProfileDoc();
}

function scheduleCharacterSave() {
  const character = selectedCharacter();
  if (!character || !state.user) return;

  const payload = characterFormPayload();
  Object.assign(character, payload);
  renderCharacters();
  els.characterSaveStatus.textContent = "Saving...";
  window.clearTimeout(state.characterSaveTimer);
  state.characterSaveTimer = window.setTimeout(async () => {
    try {
      await updateDoc(doc(db, "users", state.user.uid, "characters", character.id), {
        ...payload,
        updatedAt: Date.now()
      });
      await setDoc(doc(db, "users", state.user.uid), {
        activeCharacterId: character.id,
        updatedAt: Date.now()
      }, { merge: true });
      els.characterSaveStatus.textContent = "Character sheet saved.";
    } catch (error) {
      console.error("Failed to save character", error);
      els.characterSaveStatus.textContent = "Character save failed. Try again.";
    } finally {
      state.characterSaveTimer = null;
    }
  }, 350);
}

async function saveMemberTitle(memberId) {
  if (!state.currentCampaignId || !isCampaignOwner()) return;
  const input = els.rosterEditor.querySelector(`[data-title-input="${memberId}"]`);
  if (!input) return;

  const member = state.members.find(entry => entry.id === memberId);
  const title = sanitizeLabel(input.value);
  await setDoc(doc(db, "campaigns", state.currentCampaignId, "members", memberId), {
    title,
    updatedAt: Date.now()
  }, { merge: true });
  setStatus(title ? `Saved title for ${member?.name || "player"}` : `Cleared title for ${member?.name || "player"}`);
}

async function transferCampaignOwnership(memberId) {
  if (!state.currentCampaignId || !isCampaignOwner() || memberId === state.user?.uid) return;
  const member = state.members.find(entry => entry.id === memberId);
  if (!member) return;
  if (!confirm(`Make ${member.name || "this player"} the DM for this campaign?`)) return;

  const now = Date.now();
  const batch = writeBatch(db);
  batch.update(doc(db, "campaigns", state.currentCampaignId), {
    ownerId: memberId,
    updatedAt: now
  });
  batch.set(doc(db, "campaigns", state.currentCampaignId, "members", state.user.uid), {
    role: "Player",
    updatedAt: now
  }, { merge: true });
  batch.set(doc(db, "campaigns", state.currentCampaignId, "members", memberId), {
    role: "DM",
    updatedAt: now
  }, { merge: true });
  batch.set(doc(db, "users", state.user.uid, "campaigns", state.currentCampaignId), {
    role: "Player",
    updatedAt: now
  }, { merge: true });
  batch.set(doc(db, "users", memberId, "campaigns", state.currentCampaignId), {
    role: "DM",
    updatedAt: now
  }, { merge: true });
  await batch.commit();
  setStatus(`${member.name || "Player"} is now the DM for this campaign.`);
}

function updateInspector() {
  const entity = selectedEntity();
  if (!entity) {
    els.selectionLabel.textContent = "Nothing selected";
    els.inspectorEmpty.classList.remove("hidden");
    els.inspectorForm.classList.add("hidden");
    return;
  }

  const isMap = state.selected.kind === "map";
  els.selectionLabel.textContent = isMap ? "Map selected" : "Marker selected";
  els.inspectorEmpty.classList.add("hidden");
  els.inspectorForm.classList.remove("hidden");
  els.selectedNameInput.value = entity.name || "";
  els.selectedXInput.value = String(Math.round(entity.x || 0));
  els.selectedYInput.value = String(Math.round(entity.y || 0));
  els.sizeLabel.textContent = isMap ? "Map width" : "Marker size";
  els.selectedSizeInput.min = String(isMap ? MAP_MIN : TOKEN_MIN);
  els.selectedSizeInput.max = String(isMap ? MAP_MAX : TOKEN_MAX);
  els.selectedSizeInput.value = String(Math.round(isMap ? entity.width : entity.size));
  els.selectionMeta.textContent = isMap
    ? `Height follows the original ratio. Current height: ${Math.round(entity.height)}px`
    : `Marker size: ${Math.round(entity.size)}px`;
}

function syncInspectorSelection() {
  const entity = selectedEntity();
  if (!entity) return;

  if (state.selected.kind === "map") {
    const width = clamp(Number(els.selectedSizeInput.value), MAP_MIN, MAP_MAX);
    const aspectRatio = entity.aspectRatio || 1;
    patchEntity("map", entity.id, {
      name: sanitizeLabel(els.selectedNameInput.value) || entity.name,
      x: Number(els.selectedXInput.value) || 0,
      y: Number(els.selectedYInput.value) || 0,
      width,
      height: Math.round(width / aspectRatio)
    });
    return;
  }

  patchEntity("token", entity.id, {
    name: sanitizeLabel(els.selectedNameInput.value) || entity.name,
    x: Number(els.selectedXInput.value) || 0,
    y: Number(els.selectedYInput.value) || 0,
    size: clamp(Number(els.selectedSizeInput.value), TOKEN_MIN, TOKEN_MAX)
  });
}

function onBoardWheel(event) {
  event.preventDefault();
  state.zoom = clamp(state.zoom + (event.deltaY > 0 ? -0.1 : 0.1), 0.4, 2.2);
  els.zoomInput.value = String(Math.round(state.zoom * 100));
  applyStageTransform();
}

function onWindowFileDragOver(event) {
  if (!extractImageFiles(event.dataTransfer).length) return;
  event.preventDefault();
}

function onWindowFileDrop(event) {
  if (!extractImageFiles(event.dataTransfer).length) return;
  event.preventDefault();
  state.boardDragDepth = 0;
  setBoardDropActive(false);
}

function onBoardDragEnter(event) {
  if (!extractImageFiles(event.dataTransfer).length) return;
  event.preventDefault();
  state.boardDragDepth += 1;
  setBoardDropActive(true);
}

function onBoardDragOver(event) {
  if (!extractImageFiles(event.dataTransfer).length) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "copy";
  setBoardDropActive(true);
}

function onBoardDragLeave(event) {
  if (!extractImageFiles(event.dataTransfer).length) return;
  event.preventDefault();
  state.boardDragDepth = Math.max(0, state.boardDragDepth - 1);
  if (!state.boardDragDepth) {
    setBoardDropActive(false);
  }
}

async function onBoardDrop(event) {
  const files = extractImageFiles(event.dataTransfer);
  if (!files.length) return;
  event.preventDefault();
  state.boardDragDepth = 0;
  setBoardDropActive(false);

  if (!state.currentCampaignId) {
    showToolHint("Open a campaign first, then drop map images onto the board.", 2600);
    return;
  }

  const dropPoint = boardPoint(event.clientX, event.clientY);
  await uploadMaps(files, { dropPoint });
  showToolHint("Map images added. Drag the new sections into place to stitch them together.", 2600);
}

function setBoardDropActive(isActive) {
  els.boardViewport.classList.toggle("is-drop-target", isActive);
}

function onBoardDown(event) {
  if (!state.currentCampaignId || !state.currentMapId) return;
  const item = event.target.closest(".scene-item");
  const point = boardPoint(event.clientX, event.clientY);

  if (state.activeTool === "pan") {
    event.preventDefault();
    els.boardViewport.setPointerCapture?.(event.pointerId);
    state.panning = {
      pointerId: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startPan: { ...state.pan }
    };
    return;
  }

  if (item && state.activeTool === "move") {
    event.preventDefault();
    els.boardViewport.setPointerCapture?.(event.pointerId);
    selectItem(item.dataset.kind, item.dataset.id);
    const entity = selectedEntity();
    state.dragging = {
      pointerId: event.pointerId,
      kind: item.dataset.kind,
      id: item.dataset.id,
      startPoint: point,
      startPosition: { x: entity.x, y: entity.y }
    };
    return;
  }

  if (state.activeTool === "draw") {
    const drawMap = mapAtBoardPoint(point);
    if (!drawMap) {
      showToolHint("Tap inside a map picture to draw on it.", 2200);
      return;
    }

    activateMap(drawMap.id);
    event.preventDefault();
    els.boardViewport.setPointerCapture?.(event.pointerId);
    state.pendingStroke = {
      coordinateSpace: "map",
      mapId: drawMap.id,
      color: els.drawColorInput.value,
      size: Number(els.brushSizeInput.value),
      points: [boardPointToMapPoint(point, drawMap)]
    };
    renderOverlays();
    return;
  }

  if (state.activeTool === "fog-cover" || state.activeTool === "fog-reveal") {
    const fogMap = mapAtBoardPoint(point);
    if (!fogMap) {
      showToolHint("Tap inside a map picture to use fog.", 2200);
      return;
    }

    activateMap(fogMap.id);
    if (!fogMap.fogEnabled) {
      showToolHint("Fog is off for the active map. Tap the Fog button first.", 2600);
      return;
    }

    event.preventDefault();
    els.boardViewport.setPointerCapture?.(event.pointerId);
    state.pendingFog = {
      coordinateSpace: "map",
      mapId: fogMap.id,
      mode: state.activeTool === "fog-reveal" ? "reveal" : "cover",
      size: Number(els.brushSizeInput.value),
      points: [boardPointToMapPoint(point, fogMap)]
    };
    renderOverlays();
    return;
  }

  if (item) {
    selectItem(item.dataset.kind, item.dataset.id);
  } else {
    state.selected = null;
    renderBoard();
    updateInspector();
  }
}

function onBoardMove(event) {
  if (!state.currentCampaignId || !state.currentMapId) return;
  const point = boardPoint(event.clientX, event.clientY);
  syncPresence({ cursor: point }).catch(console.error);

  if (state.panning && state.panning.pointerId === event.pointerId) {
    state.pan = {
      x: state.panning.startPan.x + (event.clientX - state.panning.startClient.x),
      y: state.panning.startPan.y + (event.clientY - state.panning.startClient.y)
    };
    applyStageTransform();
    return;
  }

  if (state.dragging && state.dragging.pointerId === event.pointerId) {
    patchEntity(state.dragging.kind, state.dragging.id, {
      x: Math.round(state.dragging.startPosition.x + (point.x - state.dragging.startPoint.x)),
      y: Math.round(state.dragging.startPosition.y + (point.y - state.dragging.startPoint.y))
    });
    return;
  }

  if (state.pendingStroke) {
    const map = findMapById(state.pendingStroke.mapId);
    if (map) {
      state.pendingStroke.points.push(boardPointToMapPoint(point, map));
    }
    renderOverlays();
    return;
  }

  if (state.pendingFog) {
    const map = findMapById(state.pendingFog.mapId);
    if (map) {
      state.pendingFog.points.push(boardPointToMapPoint(point, map));
    }
    renderOverlays();
  }
}

function onBoardUp(event) {
  if (state.panning && state.panning.pointerId === event.pointerId) {
    state.panning = null;
  }

  if (state.dragging && state.dragging.pointerId === event.pointerId) {
    flushPendingPatches().catch(console.error);
    state.dragging = null;
    return;
  }

  if (state.pendingStroke) {
    addOverlayDoc("drawings", {
      ...state.pendingStroke,
      points: compactPoints(state.pendingStroke.points),
      createdAt: Date.now(),
      createdBy: state.user.uid
    }).catch(console.error);
    state.pendingStroke = null;
    renderOverlays();
    return;
  }

  if (state.pendingFog) {
    addOverlayDoc("fogActions", {
      ...state.pendingFog,
      points: compactPoints(state.pendingFog.points),
      createdAt: Date.now(),
      createdBy: state.user.uid
    }).catch(console.error);
    state.pendingFog = null;
    renderOverlays();
  }

  if (els.boardViewport.hasPointerCapture?.(event.pointerId)) {
    els.boardViewport.releasePointerCapture(event.pointerId);
  }
}

function setView(view) {
  state.activeView = view;
  renderViews();
  syncPresence({}).catch(console.error);
}

function setTool(tool) {
  state.activeTool = tool;
  document.querySelectorAll("[data-tool]").forEach(button => {
    button.classList.toggle("is-active", button.dataset.tool === tool);
  });
  showToolHint();
}

function toolHintText(tool) {
  const hints = {
    move: "Drag maps and markers around the board. You can also drop image files onto the board to add new map sections exactly where you want them.",
    pan: "Drag the viewport to move across larger maps.",
    draw: "Sketch directly on the active map.",
    "fog-cover": "Paint fog back over unexplored areas.",
    "fog-reveal": "Reveal the map for players."
  };

  return hints[tool] || hints.move;
}

function showToolHint(message = toolHintText(state.activeTool), duration = 0) {
  window.clearTimeout(state.toolHintTimer);
  els.toolHint.textContent = message;

  if (!duration) {
    state.toolHintTimer = null;
    return;
  }

  state.toolHintTimer = window.setTimeout(() => {
    els.toolHint.textContent = toolHintText(state.activeTool);
    state.toolHintTimer = null;
  }, duration);
}

function selectItem(kind, id) {
  if (kind === "map") {
    activateMap(id);
  }
  state.selected = { kind, id };
  renderBoard();
  updateInspector();
}

function activateMap(mapId) {
  if (!mapId || state.currentMapId === mapId) {
    return;
  }

  state.currentMapId = mapId;
  watchCurrentMap();
  renderMapList();
}

function selectedEntity() {
  if (!state.selected) return null;
  if (state.selected.kind === "map") {
    return state.maps.find(map => map.id === state.selected.id) || null;
  }
  return state.tokens.find(token => token.id === state.selected.id) || null;
}

function isSelected(kind, id) {
  return state.selected?.kind === kind && state.selected?.id === id;
}

function patchEntity(kind, id, patch) {
  const entity = kind === "map"
    ? state.maps.find(entry => entry.id === id)
    : state.tokens.find(entry => entry.id === id);

  if (!entity) return;
  Object.assign(entity, patch, { updatedAt: Date.now() });

  const key = `${kind}:${id}`;
  const pending = state.pendingPatches.get(key) || {
    kind,
    id,
    mapId: state.currentMapId,
    patch: {}
  };
  pending.patch = { ...pending.patch, ...patch, updatedAt: Date.now() };
  state.pendingPatches.set(key, pending);

  if (!state.patchTimer) {
    state.patchTimer = window.setTimeout(() => flushPendingPatches().catch(console.error), 90);
  }

  renderBoard();
  updateInspector();
}

async function flushPendingPatches() {
  if (!state.pendingPatches.size) return;
  const items = [...state.pendingPatches.values()];
  state.pendingPatches.clear();
  window.clearTimeout(state.patchTimer);
  state.patchTimer = null;
  await Promise.all(items.map(item => {
    if (item.kind === "map") {
      return updateDoc(doc(db, "campaigns", state.currentCampaignId, "maps", item.id), item.patch);
    }
    return updateDoc(doc(db, "campaigns", state.currentCampaignId, "tokens", item.id), item.patch);
  }));
}

function applyStageTransform() {
  els.boardStage.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.zoom})`;
}

function resetBoardView() {
  state.zoom = 1;
  state.pan = { x: 56, y: 56 };
  els.zoomInput.value = "100";
  applyStageTransform();
}

function boardPoint(clientX, clientY) {
  const rect = els.boardViewport.getBoundingClientRect();
  return {
    x: Math.round((clientX - rect.left - state.pan.x) / state.zoom),
    y: Math.round((clientY - rect.top - state.pan.y) / state.zoom)
  };
}

function findMapById(mapId) {
  return state.maps.find(map => map.id === mapId) || null;
}

function mapAtBoardPoint(point) {
  return [...state.maps].reverse().find(map => {
    return point.x >= map.x &&
      point.x <= map.x + map.width &&
      point.y >= map.y &&
      point.y <= map.y + map.height;
  }) || null;
}

function boardPointToMapPoint(point, map) {
  return {
    x: clamp(Math.round(point.x - map.x), 0, Math.round(map.width)),
    y: clamp(Math.round(point.y - map.y), 0, Math.round(map.height))
  };
}

function overlayPointsForRender(entry, map) {
  const points = entry.points || [];
  if (entry.coordinateSpace !== "map") {
    return points.map(point => ({
      x: Math.round(point.x - map.x),
      y: Math.round(point.y - map.y)
    }));
  }

  return points;
}

function clipToMap(ctx, map) {
  ctx.beginPath();
  ctx.rect(0, 0, map.width, map.height);
  ctx.clip();
}

function boardSize() {
  let width = 2200;
  let height = 1400;
  state.maps.forEach(map => {
    width = Math.max(width, map.x + map.width + 240);
    height = Math.max(height, map.y + map.height + 240);
  });
  state.tokens.forEach(token => {
    width = Math.max(width, token.x + token.size + 180);
    height = Math.max(height, token.y + token.size + 180);
  });
  return { width, height };
}

function nextMapPlacement() {
  if (!state.maps.length) {
    return { x: 120, y: 120 };
  }

  return {
    x: Math.max(...state.maps.map(map => (map.x || 0) + (map.width || 0))) + 80,
    y: Math.max(120, Math.min(...state.maps.map(map => map.y || 120)))
  };
}

function resizeCanvas(canvas, size) {
  canvas.width = size.width;
  canvas.height = size.height;
  canvas.style.width = `${size.width}px`;
  canvas.style.height = `${size.height}px`;
}

function resizeLocalOverlayCanvas(canvas, map) {
  if (!canvas) return;
  const width = Math.max(1, Math.round(map.width));
  const height = Math.max(1, Math.round(map.height));
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
}

function drawPath(ctx, stroke, color, map = null) {
  const points = map ? overlayPointsForRender(stroke, map) : (stroke.points || []);
  if (points.length < 2) return;
  ctx.save();
  if (map) {
    clipToMap(ctx, map);
  }
  ctx.beginPath();
  ctx.lineWidth = stroke.size || 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
  ctx.stroke();
  ctx.restore();
}

function drawFogAction(ctx, action, map = null) {
  const points = map ? overlayPointsForRender(action, map) : (action.points || []);
  if (!points.length) return;
  ctx.save();
  if (map) {
    clipToMap(ctx, map);
  }
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = action.size || 42;
  if (action.mode === "reveal") {
    ctx.globalCompositeOperation = "destination-out";
    ctx.strokeStyle = "rgba(0,0,0,1)";
    ctx.fillStyle = "rgba(0,0,0,1)";
  } else {
    ctx.globalCompositeOperation = "source-over";
    ctx.strokeStyle = "rgba(8, 10, 14, 0.92)";
    ctx.fillStyle = "rgba(8, 10, 14, 0.92)";
  }
  if (points.length === 1) {
    ctx.beginPath();
    ctx.arc(points[0].x, points[0].y, (action.size || 42) / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach(point => ctx.lineTo(point.x, point.y));
  ctx.stroke();
  ctx.restore();
}

function renderTokenVisual(token) {
  if (token.imageUrl) {
    return `<img src="${escapeHtml(token.imageUrl)}" alt="${escapeHtml(token.name)}">`;
  }

  return `
    <div class="token-fallback" style="background:${escapeHtml(token.color || DEFAULT_PROFILE.color)}">
      ${escapeHtml(token.label || "P")}
    </div>
  `;
}

function findOwnedToken() {
  if (!state.user) return null;
  return state.tokens.find(token => token.ownerId === state.user.uid) || null;
}

function profileMarkerLabel() {
  const words = sanitizeName(state.profile.name).split(" ").filter(Boolean);
  const initials = words.slice(0, 2).map(word => word[0]).join("");
  return (initials || "P").toUpperCase();
}

function markerSpawnPoint() {
  const map = getActiveMap();
  if (map) {
    return {
      x: Math.round(map.x + Math.min(map.width * 0.18, 180)),
      y: Math.round(map.y + Math.min(map.height * 0.18, 180))
    };
  }

  return { x: 260, y: 260 };
}

function extractImageFiles(dataTransfer) {
  if (!dataTransfer?.files?.length) {
    return [];
  }

  return [...dataTransfer.files].filter(file => file.type.startsWith("image/"));
}

async function uploadMaps(files, { dropPoint = null } = {}) {
  if (!state.currentCampaignId) {
    alert("Open a campaign before uploading maps.");
    return;
  }

  const now = Date.now();
  const start = dropPoint || nextMapPlacement();
  let nextX = start.x;
  for (const [index, file] of files.entries()) {
    const meta = await readImageMeta(file);
    const storagePath = `campaigns/${state.currentCampaignId}/maps/${now + index}-${safeFileName(file.name)}`;
    const fileRef = ref(storage, storagePath);
    await uploadBytes(fileRef, file);
    const imageUrl = await getDownloadURL(fileRef);
    const width = clamp(meta.width, 800, 1800);
    const aspectRatio = meta.width / meta.height;
    const height = Math.round(width / aspectRatio);
    const x = Math.max(40, Math.round(index === 0 && dropPoint ? start.x - (width / 2) : nextX));
    const y = Math.max(40, Math.round(index === 0 && dropPoint ? start.y - (height / 2) : start.y + ((index % 2) * 36)));
    await addDoc(collection(db, "campaigns", state.currentCampaignId, "maps"), {
      name: fileBaseName(file.name),
      imageUrl,
      storagePath,
      x,
      y,
      width,
      height,
      aspectRatio,
      fogEnabled: false,
      createdAt: now + index,
      updatedAt: now + index
    });
    nextX = x + width + 80;
  }

  els.mapUpload.value = "";
  setView("map");
}

async function placePlayerMarker() {
  if (!state.currentCampaignId || !state.user) {
    alert("Open a campaign first.");
    return;
  }

  const existing = findOwnedToken();
  if (existing) {
    selectItem("token", existing.id);
    setView("map");
    setStatus(`Selected your marker for ${state.profile.name}`);
    return;
  }

  const now = Date.now();
  const spawn = markerSpawnPoint();
  const tokenRef = await addDoc(collection(db, "campaigns", state.currentCampaignId, "tokens"), {
    name: sanitizeLabel(state.profile.name) || DEFAULT_PROFILE.name,
    ownerId: state.user.uid,
    label: profileMarkerLabel(),
    color: state.profile.color,
    x: spawn.x,
    y: spawn.y,
    size: 84,
    createdAt: now,
    updatedAt: now
  });

  setView("map");
  selectItem("token", tokenRef.id);
  setStatus("Placed your player marker on the board");
}

async function uploadMarker(file) {
  if (!state.currentCampaignId || !state.user || !file) {
    if (!state.currentCampaignId) {
      alert("Open a campaign first.");
    }
    return;
  }

  const now = Date.now();
  const existing = findOwnedToken();
  const spawn = markerSpawnPoint();
  const storagePath = `campaigns/${state.currentCampaignId}/tokens/${state.user.uid}/${now}-${safeFileName(file.name)}`;
  const fileRef = ref(storage, storagePath);
  await uploadBytes(fileRef, file);
  const imageUrl = await getDownloadURL(fileRef);
  const payload = {
    name: sanitizeLabel(state.profile.name) || fileBaseName(file.name),
    imageUrl,
    storagePath,
    label: profileMarkerLabel(),
    color: state.profile.color,
    ownerId: state.user.uid,
    x: existing?.x ?? spawn.x,
    y: existing?.y ?? spawn.y,
    size: existing?.size ?? 84,
    updatedAt: now
  };

  if (existing) {
    await updateDoc(doc(db, "campaigns", state.currentCampaignId, "tokens", existing.id), payload);
    selectItem("token", existing.id);
  } else {
    const tokenRef = await addDoc(collection(db, "campaigns", state.currentCampaignId, "tokens"), {
      ...payload,
      createdAt: now
    });
    selectItem("token", tokenRef.id);
  }

  els.markerUpload.value = "";
  setView("map");
  setStatus("Updated your player marker");
}

async function toggleFog() {
  const map = getActiveMap();
  if (!map) return;
  const nextFogState = !map.fogEnabled;
  await updateDoc(doc(db, "campaigns", state.currentCampaignId, "maps", map.id), {
    fogEnabled: nextFogState,
    updatedAt: Date.now()
  });
  showToolHint(nextFogState ? "Fog is on for this map. Cover or reveal areas with the brush." : "Fog is off for this map.", 2200);
}

async function clearOverlayCollection(kind) {
  if (!state.currentCampaignId || !state.currentMapId) return;
  const docs = (kind === "drawings" ? state.drawings : state.fogActions)
    .filter(entry => entry.mapId === state.currentMapId);
  if (!docs.length) return;
  const label = kind === "drawings" ? "drawing" : "fog changes";
  if (!confirm(`Clear all ${label} from this map?`)) return;
  await Promise.all(docs.map(entry => {
    return deleteDoc(doc(db, "campaigns", state.currentCampaignId, "maps", state.currentMapId, kind, entry.id));
  }));
}

async function deleteSelection() {
  if (!state.selected || !state.currentCampaignId) return;
  if (!confirm("Delete the selected item?")) return;

  if (state.selected.kind === "map") {
    const map = selectedEntity();
    if (!map) return;
    await deleteDoc(doc(db, "campaigns", state.currentCampaignId, "maps", map.id));
  } else {
    const token = selectedEntity();
    if (!token) return;
    await deleteDoc(doc(db, "campaigns", state.currentCampaignId, "tokens", token.id));
  }

  state.selected = null;
  updateInspector();
}

async function createNotePage(kind) {
  if (!state.currentCampaignId) {
    alert("Open a campaign first.");
    return;
  }

  const title = prompt("Page title?", kind === "shared" ? "New shared page" : "New private page");
  if (title === null) return;

  const payload = {
    title: sanitizeLabel(title) || "Untitled page",
    content: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdBy: state.user.uid
  };

  if (kind === "shared") {
    const pageRef = await addDoc(collection(db, "campaigns", state.currentCampaignId, "sharedPages"), payload);
    state.activeSharedPageId = pageRef.id;
    setView("shared-notes");
    return;
  }

  const pageRef = await addDoc(collection(db, "users", state.user.uid, "campaignNotes", state.currentCampaignId, "pages"), payload);
  state.activePrivatePageId = pageRef.id;
  setView("private-notes");
}

function scheduleSummarySave() {
  window.clearTimeout(state.summaryTimer);
  state.summaryTimer = window.setTimeout(async () => {
    if (!state.currentCampaignId) return;
    await updateDoc(doc(db, "campaigns", state.currentCampaignId), {
      summary: els.campaignSummaryInput.value,
      updatedAt: Date.now()
    });
  }, 450);
}

function scheduleNoteSave(kind) {
  const status = kind === "shared" ? els.sharedSaveStatus : els.privateSaveStatus;
  const pageId = kind === "shared" ? state.activeSharedPageId : state.activePrivatePageId;
  if (!pageId || !state.currentCampaignId) return;
  status.textContent = "Saving...";
  window.clearTimeout(state.noteTimers[kind]);
  state.noteTimers[kind] = window.setTimeout(async () => {
    const payload = {
      title: (kind === "shared" ? els.sharedTitleInput.value : els.privateTitleInput.value).trim() || "Untitled page",
      content: kind === "shared" ? els.sharedBodyInput.value : els.privateBodyInput.value,
      updatedAt: Date.now()
    };

    if (kind === "shared") {
      await updateDoc(doc(db, "campaigns", state.currentCampaignId, "sharedPages", pageId), payload);
      status.textContent = "Shared page saved.";
      return;
    }

    await updateDoc(doc(db, "users", state.user.uid, "campaignNotes", state.currentCampaignId, "pages", pageId), payload);
    status.textContent = "Private page saved.";
  }, 400);
}

async function copyJoinCode() {
  if (!state.currentCampaign?.code) return;
  try {
    await navigator.clipboard.writeText(state.currentCampaign.code);
    setStatus(`Copied join code ${state.currentCampaign.code}`);
  } catch {
    alert(`Copy failed. Join code: ${state.currentCampaign.code}`);
  }
}

async function syncPresence({ cursor = null, heartbeat = false } = {}) {
  if (!state.currentCampaignId || !state.user) return;
  state.pendingPresence = {
    name: state.profile.name,
    color: state.profile.color,
    role: state.currentCampaign?.ownerId === state.user.uid ? "DM" : "Player",
    activeView: state.activeView,
    currentMapId: state.currentMapId || null
  };
  if (cursor) state.pendingPresence.cursor = cursor;
  if (cursor || heartbeat) state.pendingPresence.heartbeatAt = Date.now();

  if (state.presenceTimer && !heartbeat && !cursor) {
    return;
  }

  window.clearTimeout(state.presenceTimer);
  state.presenceTimer = window.setTimeout(async () => {
    if (!state.pendingPresence) return;
    const payload = state.pendingPresence;
    state.pendingPresence = null;
    state.presenceTimer = null;
    await setDoc(doc(db, "campaigns", state.currentCampaignId, "members", state.user.uid), payload, { merge: true });
  }, heartbeat ? 0 : 90);
}

async function addOverlayDoc(kind, payload) {
  const mapId = payload.mapId || state.currentMapId;
  if (!state.currentCampaignId || !mapId) return;
  await addDoc(collection(db, "campaigns", state.currentCampaignId, "maps", mapId, kind), payload);
}

function saveProfile() {
  state.profile = {
    name: sanitizeName(els.displayNameInput.value) || DEFAULT_PROFILE.name,
    color: els.playerColorInput.value || DEFAULT_PROFILE.color
  };
  localStorage.setItem("campaign-chronicle-profile", JSON.stringify(state.profile));
  renderProfile();
  renderAccountPanel();
  setStatus(`Saved profile for ${state.profile.name}`);
  syncPresence({ heartbeat: true }).catch(console.error);
  syncUserProfileDoc().catch(console.error);
}

function getActiveMap() {
  return state.maps.find(map => map.id === state.currentMapId) || null;
}

function ownerName(ownerId) {
  if (!ownerId) return "-";
  const owner = state.members.find(member => member.id === ownerId);
  return owner?.name || (ownerId === state.user?.uid ? state.profile.name : "Player");
}

function isOnline(member) {
  return Date.now() - (member.heartbeatAt || 0) < 20000;
}

function cleanupCampaignSubs() {
  state.unsubs.forEach(unsub => unsub());
  state.unsubs = [];
}

function cleanupMapSubs() {
  state.mapUnsubs.forEach(unsub => unsub());
  state.mapUnsubs = [];
  state.overlayWatchKey = "";
  state.drawings = [];
  state.fogActions = [];
}

function loadProfile() {
  try {
    const saved = JSON.parse(localStorage.getItem("campaign-chronicle-profile"));
    if (saved?.name && saved?.color) return saved;
  } catch (error) {
    console.warn("Failed to read saved profile", error);
  }
  return { ...DEFAULT_PROFILE, color: randomColor() };
}

async function generateCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  while (true) {
    let code = "";
    for (let index = 0; index < 6; index += 1) {
      code += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    const snap = await getDoc(doc(db, "campaigns", code));
    if (!snap.exists()) return code;
  }
}

function compactPoints(points) {
  return points.filter((point, index) => index === 0 || index === points.length - 1 || index % 2 === 0);
}

function readImageMeta(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = error => {
      URL.revokeObjectURL(url);
      reject(error);
    };
    image.src = url;
  });
}

function fileBaseName(fileName) {
  return fileName.replace(/\.[^.]+$/, "");
}

function safeFileName(fileName) {
  return fileName.replace(/[^\w.-]+/g, "-").toLowerCase();
}

function randomColor() {
  const palette = ["#d97706", "#2dd4bf", "#38bdf8", "#f97316", "#f43f5e", "#a3e635"];
  return palette[Math.floor(Math.random() * palette.length)];
}

function sanitizeName(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, 24);
}

function sanitizeLabel(value) {
  return value.trim().replace(/\s+/g, " ").slice(0, 36);
}

function normalizeCampaignCode(value) {
  return String(value)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

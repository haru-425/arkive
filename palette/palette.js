const firebaseConfig = {
  apiKey: "AIzaSyA_TQT0dB04nbVhGsVVvQsxlIkQuy2hJIQ",
  authDomain: "arkive-505f0.firebaseapp.com",
  projectId: "arkive-505f0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

auth.onAuthStateChanged(user => {
  currentUser = user;
  document.getElementById("status").textContent = user ? "ログイン中" : "ログインしていません。登録はログインが必要です。";
  document.getElementById("palette-form").style.display = user ? "block" : "none";
  if (user) loadTagSuggestions();
  loadPalettes();
});

function addColor() {
  const container = document.getElementById("color-container");
  const input = document.createElement("input");
  input.type = "color";
  input.value = "#ffffff";
  container.appendChild(input);
}

function removeColor() {
  const container = document.getElementById("color-container");
  if (container.children.length > 1) {
    container.removeChild(container.lastChild);
  }
}

function savePalette() {
  if (!currentUser) {
    alert("ログインが必要です");
    return;
  }

  const name = document.getElementById("palette-name").value.trim();
  const tagsRaw = document.getElementById("palette-tags").value.trim();
  const colorInputs = document.querySelectorAll("#color-container input[type='color']");
  const colors = Array.from(colorInputs).map(input => input.value);

  if (!name || !tagsRaw) {
    alert("パレット名とタグは必須です");
    return;
  }

  const tags = tagsRaw.split(",").map(tag => tag.trim().toLowerCase()).filter(tag => tag);

  db.collection("public_palettes").add({
    uid: currentUser.uid,
    name,
    tags,
    colors,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("パレットを登録しました！");
    document.getElementById("palette-name").value = "";
    document.getElementById("palette-tags").value = "";
    document.getElementById("color-container").innerHTML = `
      <input type="color" value="#ff0000" />
      <input type="color" value="#00ff00" />
      <input type="color" value="#0000ff" />
    `;
    loadPalettes();
  }).catch(error => {
    alert("登録に失敗しました: " + error.message);
  });
}

function loadTagSuggestions() {
  const tagSet = new Set();
  db.collection("public_palettes").get().then(snapshot => {
    snapshot.forEach(doc => {
      const data = doc.data();
      if (Array.isArray(data.tags)) {
        data.tags.forEach(tag => tagSet.add(tag.trim().toLowerCase()));
      }
    });
    const datalist = document.getElementById("tag-suggestions");
    datalist.innerHTML = "";
    Array.from(tagSet).sort().forEach(tag => {
      const option = document.createElement("option");
      option.value = tag;
      datalist.appendChild(option);
    });
  });
}

async function getUsernameByUid(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? doc.data().username || "匿名" : "匿名";
  } catch {
    return "匿名";
  }
}

function toggleFavorite(paletteId, isFavorited) {
  const ref = db.collection("users").doc(currentUser.uid).collection("favorites").doc(paletteId);
  if (isFavorited) {
    ref.delete().then(() => loadPalettes());
  } else {
    ref.set({ paletteId, savedAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => loadPalettes());
  }
}

async function loadPalettes() {
  const nameQuery = document.getElementById("search-name")?.value.trim().toLowerCase() || "";
  const tagQuery = document.getElementById("search-tag")?.value.trim().toLowerCase() || "";

  let query = db.collection("public_palettes").orderBy("createdAt", "desc");
  if (tagQuery) query = query.where("tags", "array-contains", tagQuery);

  const snapshot = await query.get();
  const favorites = currentUser
    ? await db.collection("users").doc(currentUser.uid).collection("favorites").get()
    : null;
  const favoriteIds = favorites ? favorites.docs.map(doc => doc.id) : [];

  const myList = [];
  const otherList = [];

  for (const doc of snapshot.docs
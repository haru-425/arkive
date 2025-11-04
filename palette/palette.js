// Firebase 初期化
const firebaseConfig = {
  apiKey: "AIzaSyA_TQT0dB04nbVhGsVVvQsxlIkQuy2hJIQ",
  authDomain: "arkive-505f0.firebaseapp.com",
  projectId: "arkive-505f0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;

// ログイン状態の監視
auth.onAuthStateChanged(user => {
  currentUser = user;
  document.getElementById("status").textContent = user
    ? "ログイン中"
    : "ログインしていません。登録はログインが必要です。";
  document.getElementById("palette-form").style.display = user ? "block" : "none";
  if (user) loadTagSuggestions();
  loadPalettes();
});

// 色追加・削除
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

// パレット保存
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

// タグ候補の読み込み
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

// UIDからユーザー名取得
async function getUsernameByUid(uid) {
  try {
    const doc = await db.collection("users").doc(uid).get();
    return doc.exists ? doc.data().username || "匿名" : "匿名";
  } catch {
    return "匿名";
  }
}

// お気に入り切り替え
function toggleFavorite(paletteId, isFavorited) {
  const ref = db.collection("users").doc(currentUser.uid).collection("favorites").doc(paletteId);
  if (isFavorited) {
    ref.delete().then(() => loadPalettes());
  } else {
    ref.set({ paletteId, savedAt: firebase.firestore.FieldValue.serverTimestamp() }).then(() => loadPalettes());
  }
}

// パレット削除
function deletePalette(paletteId) {
  if (confirm("本当に削除しますか？")) {
    db.collection("public_palettes").doc(paletteId).delete().then(() => {
      alert("削除しました");
      loadPalettes();
    }).catch(error => {
      alert("削除に失敗しました: " + error.message);
    });
  }
}

// パレット読み込み
async function loadPalettes() {
  const nameQuery = document.getElementById("search-name")?.value.trim().toLowerCase() || "";
  const tagQuery = document.getElementById("search-tag")?.value.trim().toLowerCase() || "";
  const authorQuery = document.getElementById("search-author")?.value.trim().toLowerCase() || "";
  const showFavoritesOnly = document.getElementById("filter-favorites")?.checked;

  let query = db.collection("public_palettes").orderBy("createdAt", "desc");
  if (tagQuery) query = query.where("tags", "array-contains", tagQuery);

  const snapshot = await query.get();
  const favorites = currentUser
    ? await db.collection("users").doc(currentUser.uid).collection("favorites").get()
    : null;
  const favoriteIds = favorites ? favorites.docs.map(doc => doc.id) : [];

  const myList = [];
  const otherList = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const id = doc.id;
    const username = await getUsernameByUid(data.uid);

    if (nameQuery && !data.name.toLowerCase().includes(nameQuery)) continue;
    if (authorQuery && !username.toLowerCase().includes(authorQuery)) continue;

    const isFavorited = favoriteIds.includes(id);
    if (showFavoritesOnly && !isFavorited) continue;

    const html = renderPalette(data.name, data.colors, data.tags, username, id, isFavorited, data.uid === currentUser?.uid);

    if (currentUser && data.uid === currentUser.uid) {
      myList.push(html);
      otherList.push(html);
    } else {
      otherList.push(html);
    }
  }

  document.getElementById("my-palettes").innerHTML = myList.length ? myList.join("") : "（まだ登録されていません）";
  document.getElementById("other-palettes").innerHTML = otherList.length ? otherList.join("") : "（まだ公開パレットがありません）";
}

// パレット表示HTML生成
function renderPalette(name, colors, tags, authorName, paletteId, isFavorited, isOwner) {
  let html = `<div class="palette"><strong>${name}</strong><br>`;
  colors.forEach(color => {
    html += `<span class="color-box" style="background:${color};"></span>`;
  });
  html += `<br><small>タグ: ${tags.join(", ")}</small>`;
  html += `<br><small>作者: ${authorName}</small>`;
  if (currentUser) {
    html += `<br><button onclick="toggleFavorite('${paletteId}', ${isFavorited})">` +
            `${isFavorited ? "💔 お気に入り解除" : "❤️ お気に入り"}</button>`;
  }
  if (isOwner) {
    html += `<br><button onclick="deletePalette('${paletteId}')">🗑️ 削除</button>`;
  }
  html += `</div>`;
  return html;
}
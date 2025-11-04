const firebaseConfig = {
  apiKey: "AIzaSyA_TQT0dB04nbVhGsVVvQsxlIkQuy2hJIQ",
  authDomain: "arkive-505f0.firebaseapp.com",
  projectId: "arkive-505f0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("status").textContent = `ログイン中：${user.email}`;
    document.getElementById("settings-form").style.display = "block";

    db.collection("users").doc(user.uid).get().then(doc => {
      const data = doc.data();
      document.getElementById("new-username").value = data?.username || "";
      document.getElementById("new-email").value = data?.email || user.email;
    });
  } else {
    document.getElementById("status").textContent = "ログインしていません。";
    document.getElementById("settings-form").style.display = "none";
  }
});

function updateUsername() {
  const newUsername = document.getElementById("new-username").value.trim();
  if (!newUsername) {
    alert("ユーザー名を入力してください");
    return;
  }

  db.collection("users").where("username", "==", newUsername).get()
    .then(snapshot => {
      if (!snapshot.empty) throw new Error("このユーザー名はすでに使われています");
      const uid = auth.currentUser.uid;
      return db.collection("users").doc(uid).update({ username: newUsername });
    })
    .then(() => alert("ユーザー名を変更しました！"))
    .catch(error => alert("変更失敗: " + error.message));
}

function updateEmail() {
  const newEmail = document.getElementById("new-email").value.trim();
  if (!newEmail) {
    alert("メールアドレスを入力してください");
    return;
  }

  auth.currentUser.updateEmail(newEmail)
    .then(() => {
      return db.collection("users").doc(auth.currentUser.uid).update({ email: newEmail });
    })
    .then(() => alert("メールアドレスを変更しました！"))
    .catch(error => alert("変更失敗: " + error.message));
}

function updatePassword() {
  const newPassword = document.getElementById("new-password").value;
  if (!newPassword) {
    alert("パスワードを入力してください");
    return;
  }

  auth.currentUser.updatePassword(newPassword)
    .then(() => alert("パスワードを変更しました！"))
    .catch(error => alert("変更失敗: " + error.message));
}
const firebaseConfig = {
  apiKey: "AIzaSyA_TQT0dB04nbVhGsVVvQsxlIkQuy2hJIQ",
  authDomain: "arkive-505f0.firebaseapp.com",
  projectId: "arkive-505f0"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

function showSignup() {
  document.getElementById("login-card").style.display = "none";
  document.getElementById("signup-card").style.display = "block";
}

function showLogin() {
  document.getElementById("signup-card").style.display = "none";
  document.getElementById("login-card").style.display = "block";
}

function signup() {
  const username = document.getElementById("signup-username").value.trim();
  const email = document.getElementById("signup-email").value.trim();
  const password = document.getElementById("signup-password").value;

  if (!username || !email || !password) {
    alert("すべての項目を入力してください");
    return;
  }

  db.collection("users").where("username", "==", username).get()
    .then(snapshot => {
      if (!snapshot.empty) throw new Error("このユーザー名はすでに使われています");
      return auth.createUserWithEmailAndPassword(email, password);
    })
    .then(result => {
      const user = result.user;
      return db.collection("users").doc(user.uid).set({
        username: username,
        email: email,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    })
    .then(() => {
      alert("登録が完了しました！");
      showLogin();
    })
    .catch(error => alert("登録失敗: " + error.message));
}

function login() {
  const identifier = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;

  if (!identifier || !password) {
    alert("ユーザー名またはメールアドレスとパスワードを入力してください");
    return;
  }

  const isEmail = identifier.includes("@");

  const loginWithEmail = (email) => {
    auth.signInWithEmailAndPassword(email, password)
      .catch(error => alert("ログイン失敗: " + error.message));
  };

  if (isEmail) {
    loginWithEmail(identifier);
  } else {
    db.collection("users").where("username", "==", identifier).limit(1).get()
      .then(snapshot => {
        if (snapshot.empty) throw new Error("ユーザー名が見つかりません");
        const userData = snapshot.docs[0].data();
        loginWithEmail(userData.email);
      })
      .catch(error => alert("ログイン失敗: " + error.message));
  }
}

function logout() {
  auth.signOut();
}

function registerUsername() {
  const username = document.getElementById("new-username").value.trim();
  if (!username) {
    alert("ユーザー名を入力してください");
    return;
  }

  db.collection("users").where("username", "==", username).get()
    .then(snapshot => {
      if (!snapshot.empty) throw new Error("このユーザー名はすでに使われています");
      const uid = auth.currentUser.uid;
      return db.collection("users").doc(uid).update({ username: username });
    })
    .then(() => {
      alert("ユーザー名を登録しました！");
      document.getElementById("username-card").style.display = "none";
      document.getElementById("user-name").textContent = `ようこそ、${username} さん`;
    })
    .catch(error => alert("登録に失敗しました: " + error.message));
}

auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("login-card").style.display = "none";
    document.getElementById("signup-card").style.display = "none";
    document.getElementById("user-card").style.display = "block";
    document.getElementById("extra-links").style.display = "block";

    db.collection("users").doc(user.uid).get().
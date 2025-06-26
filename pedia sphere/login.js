// login.js

const auth = firebase.auth();

// Check if user is already logged in
auth.onAuthStateChanged((user) => {
  if (user) {
    // If user is already logged in, go to dashboard
    window.location.href = "dashboard.html";
  }
});

// Login form
document.getElementById("login-form").addEventListener("submit", function (e) {
  e.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const rememberMe = document.getElementById("rememberMe").checked;

  // Set auth persistence based on "Remember Me"
  const persistence = rememberMe
    ? firebase.auth.Auth.Persistence.LOCAL // stays after closing browser
    : firebase.auth.Auth.Persistence.SESSION; // clears after tab close

  auth.setPersistence(persistence)
    .then(() => {
      return auth.signInWithEmailAndPassword(email, password);
    })
    .then((userCredential) => {
      alert("✅ Login successful!");
      window.location.href = "dashboard.html";
    })
    .catch((error) => {
      document.getElementById("error-message").innerText = "❌ " + error.message;
    });
});
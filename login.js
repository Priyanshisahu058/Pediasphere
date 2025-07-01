// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrfyU0RpyYgzMiMgZ_x2bWCh_ocwYuX5A",
  authDomain: "pediasphere-af39f.firebaseapp.com",
  projectId: "pediasphere-af39f",
  storageBucket: "pediasphere-af39f.firebasestorage.app",
  messagingSenderId: "623089231317",
  appId: "1:623089231317:web:6d5ae4af5709a0dc32495c",
  measurementId: "G-5K8NNS55M0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// DOM elements
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const rememberMeCheckbox = document.getElementById('rememberMe');
const spinner = document.getElementById('spinner');
const errorMessage = document.getElementById('error-message');

// Utility functions
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
}

function hideError() {
  errorMessage.textContent = '';
  errorMessage.style.display = 'none';
}

function showSpinner() {
  spinner.style.display = 'inline-block';
}

function hideSpinner() {
  spinner.style.display = 'none';
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Login function
async function loginUser() {
  console.log('Login function called');
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();
  
  console.log('Email:', email);
  console.log('Password length:', password.length);
  
  // Clear previous errors
  hideError();
  
  // Validation
  if (!email || !password) {
    showError('Please fill in all fields.');
    return;
  }
  
  if (!validateEmail(email)) {
    showError('Please enter a valid email address.');
    return;
  }
  
  if (password.length < 6) {
    showError('Password must be at least 6 characters long.');
    return;
  }
  
  // Show loading spinner
  showSpinner();
  
  try {
    // Sign in user
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Optional: Check if email is verified (currently disabled)
    // You can enable email verification by uncommenting the code below
    /*
    if (!user.emailVerified) {
      hideSpinner();
      showError('Please verify your email before logging in. Check your inbox for the verification link.');
      
      // Optional: Send verification email again
      const sendVerification = confirm('Email not verified. Would you like us to send another verification email?');
      if (sendVerification) {
        try {
          await user.sendEmailVerification();
          showError('Verification email sent. Please check your inbox and verify your email before logging in.');
        } catch (verificationError) {
          console.error('Error sending verification email:', verificationError);
          showError('Error sending verification email. Please try again later.');
        }
      }
      
      // Sign out the unverified user
      await auth.signOut();
      return;
    }
    */
    
    // Handle "Remember Me" functionality
    if (rememberMeCheckbox.checked) {
      // Store user preference (you can extend this as needed)
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('userEmail', email);
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('userEmail');
    }
    
    hideSpinner();
    
    // Successful login - redirect to dashboard or home
    alert('Login successful! Welcome to PediaSphere.');
    
    // Redirect to dashboard or main page
    window.location.href = 'dashboard.html'; // Change this to your desired page
    
  } catch (error) {
    hideSpinner();
    console.error('Login error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Handle specific Firebase errors
    switch (error.code) {
      case 'auth/user-not-found':
        showError('No account found with this email address. Please check your email or sign up first.');
        break;
      case 'auth/wrong-password':
        showError('Incorrect password. Please try again.');
        break;
      case 'auth/invalid-email':
        showError('Invalid email address format.');
        break;
      case 'auth/user-disabled':
        showError('This account has been disabled. Please contact support.');
        break;
      case 'auth/too-many-requests':
        showError('Too many failed login attempts. Please try again later or reset your password.');
        break;
      case 'auth/network-request-failed':
        showError('Network error. Please check your internet connection.');
        break;
      case 'auth/invalid-credential':
        showError('Invalid login credentials. Please check your email and password.');
        break;
      case 'auth/invalid-login-credentials':
        showError('Invalid login credentials. Please check your email and password.');
        break;
      case 'auth/missing-password':
        showError('Please enter your password.');
        break;
      case 'auth/weak-password':
        showError('Password is too weak. Please use a stronger password.');
        break;
      default:
        showError(`Login failed: ${error.message}`);
    }
  }
}

// Password reset function
async function resetPassword() {
  const email = emailInput.value.trim();
  
  if (!email) {
    showError('Please enter your email address first.');
    emailInput.focus();
    return;
  }
  
  if (!validateEmail(email)) {
    showError('Please enter a valid email address.');
    return;
  }
  
  hideError();
  
  try {
    await sendPasswordResetEmail(auth, email);
    alert('Password reset email sent! Please check your inbox and follow the instructions to reset your password.');
  } catch (error) {
    console.error('Password reset error:', error);
    
    switch (error.code) {
      case 'auth/user-not-found':
        showError('No account found with this email address.');
        break;
      case 'auth/invalid-email':
        showError('Invalid email address format.');
        break;
      case 'auth/too-many-requests':
        showError('Too many password reset requests. Please try again later.');
        break;
      default:
        showError('Error sending password reset email. Please try again.');
    }
  }
}

// Check authentication state on page load
onAuthStateChanged(auth, (user) => {
  if (user) {
    // User is signed in (email verification not required)
    console.log('User is already logged in:', user.email);
    // Optionally redirect to dashboard
    // window.location.href = 'dashboard.html';
  }
});

// Load remembered email on page load
window.addEventListener('DOMContentLoaded', () => {
  const rememberMe = localStorage.getItem('rememberMe');
  const savedEmail = localStorage.getItem('userEmail');
  
  if (rememberMe === 'true' && savedEmail) {
    emailInput.value = savedEmail;
    rememberMeCheckbox.checked = true;
  }
});

// Add enter key event listeners
emailInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    passwordInput.focus();
  }
});

passwordInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    loginUser();
  }
});

// Make functions available globally
window.loginUser = loginUser;
window.resetPassword = resetPassword;
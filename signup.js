// Import Firebase modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your Firebase config
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
const db = getFirestore(app);

// Sign Up Function
async function signUp(e) {
  e.preventDefault(); // Prevent form from submitting normally
  
  // Show loading state
  const submitButton = document.querySelector('button[type="submit"]');
  const originalText = submitButton.textContent;
  submitButton.textContent = 'Creating Account...';
  submitButton.disabled = true;
  
  try {
    // Get all form values
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const userName = document.getElementById("userName").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const childName = document.getElementById("childName").value.trim();
    const childAge = document.getElementById("childAge").value;
    const childGender = document.getElementById("childGender").value;
    const allergy = document.getElementById("allergy").value.trim();
    const foodType = document.getElementById("foodType").value;
    const country = document.getElementById("country").value.trim();

    // Validate required fields
    if (!email || !password || !userName || !phone ||
        !childName || !childAge || !childGender || !foodType || !country) {
      throw new Error("Please fill in all required fields");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address");
    }

    // Validate password length
    if (password.length < 6) {
      throw new Error("Password should be at least 6 characters long");
    }

    // Create user account with timeout
    console.log("Creating user account...");
    const userCredential = await Promise.race([
      createUserWithEmailAndPassword(auth, email, password),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Request timeout - please try again")), 15000))
    ]);
    
    const user = userCredential.user;
    console.log("User account created:", user.uid);

    // Update user profile with display name
    console.log("Updating user profile...");
    await updateProfile(user, {
      displayName: userName
    });

    // Store additional user data in Firestore
    console.log("Storing user data in Firestore...");
    await setDoc(doc(db, "users", user.uid), {
      // Guardian Details
      uid: user.uid,
      email: email,
      userName: userName,
      phone: phone,
      
      // Child Details
      childName: childName,
      childAge: parseInt(childAge),
      childGender: childGender,
      allergy: allergy || "None",
      foodType: foodType,
      country: country,
      
      // Metadata
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
      isActive: true
    });

    console.log("User data stored successfully");

    // Success message
    alert("✅ Account created successfully! Redirecting to dashboard...");
    
    // Small delay before redirect to show success message
    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1000);

  } catch (error) {
    console.error("Signup error:", error);
    
    // Reset button state
    submitButton.textContent = originalText;
    submitButton.disabled = false;
    
    // Handle different error types
    let errorMessage = "";
    
    if (error.code === "auth/email-already-in-use") {
      errorMessage = "⚠️ This email is already registered. Please try logging in or use a different email.";
    } else if (error.code === "auth/weak-password") {
      errorMessage = "⚠️ Password is too weak. Please use at least 6 characters.";
    } else if (error.code === "auth/invalid-email") {
      errorMessage = "⚠️ Please enter a valid email address.";
    } else if (error.code === "auth/operation-not-allowed") {
      errorMessage = "⚠️ Email/password authentication is not enabled. Please contact support.";
    } else if (error.code === "auth/network-request-failed") {
      errorMessage = "⚠️ Network error. Please check your internet connection and try again.";
    } else if (error.message) {
      errorMessage = "❌ " + error.message;
    } else {
      errorMessage = "❌ An unexpected error occurred. Please try again.";
    }
    
    alert(errorMessage);
  }
}

// Form validation helper functions
function validateForm() {
  const requiredFields = [
    'email', 'password', 'userName', 'phone', 
    'childName', 'childAge', 'childGender', 'foodType', 'country'
  ];
  
  for (let fieldId of requiredFields) {
    const field = document.getElementById(fieldId);
    if (!field.value.trim()) {
      field.style.borderColor = '#ff4444';
      field.focus();
      return false;
    } else {
      field.style.borderColor = '#ccc';
    }
  }
  return true;
}

// Add real-time validation
function addFieldValidation() {
  const fields = document.querySelectorAll('input[required], select[required]');
  fields.forEach(field => {
    field.addEventListener('blur', function() {
      if (!this.value.trim()) {
        this.style.borderColor = '#ff4444';
      } else {
        this.style.borderColor = '#ccc';
      }
    });
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log("DOM loaded, initializing signup form...");
  
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    console.log("Signup form found, adding event listener");
    signupForm.addEventListener('submit', signUp);
    
    // Add field validation
    addFieldValidation();
    
    console.log("Signup form initialized successfully");
  } else {
    console.error("Signup form not found!");
  }
});

// Export function for global access (if needed)
window.signUp = signUp;
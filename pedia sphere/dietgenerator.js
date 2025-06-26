// dietchart.js - Enhanced Diet Chart Page with Complementary Feeding
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrfyU0RpyYgzMiMgZ_x2bWCh_ocwYuX5A",
  authDomain: "pediasphere-af39f.firebaseapp.com",
  projectId: "pediasphere-af39f",
  storageBucket: "pediasphere-af39f.appspot.com",
  messagingSenderId: "623089231317",
  appId: "1:623089231317:web:6d5ae4af5709a0dc32495c",
  measurementId: "G-5K8NNS55M0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const agePlans = [
    {
        minMonths: 0,
        maxMonths: 5,
        stage: "Exclusive Breastfeeding",
        description: "Breast milk or formula only",
        caloriesPerDay: "550-650 calories (from breast milk/formula)",
        proteinPerDay: "9-11g protein (from breast milk/formula)"
    },
    {
        minMonths: 6,
        maxMonths: 8,
        stage: "Introduction to Solids",
        description: "Start with single-ingredient purees",
        caloriesPerDay: "650-850 calories (milk + solids)",
        proteinPerDay: "11-14g protein"
    },
    {
        minMonths: 9,
        maxMonths: 11,
        stage: "Expanding Textures",
        description: "Introduce finger foods and combination meals",
        caloriesPerDay: "750-900 calories",
        proteinPerDay: "11-14g protein"
    },
    {
        minMonths: 12,
        maxMonths: 23,
        stage: "Toddler Foods",
        description: "Family foods with appropriate textures",
        caloriesPerDay: "900-1,200 calories",
        proteinPerDay: "13-16g protein"
    },
    {
        minMonths: 24,
        maxMonths: 60,
        stage: "Preschool Nutrition",
        description: "Balanced meals with variety",
        caloriesPerDay: "1,200-1,600 calories",
        proteinPerDay: "16-24g protein"
    },
    {
        minMonths: 61,
        maxMonths: 144,
        stage: "School Age Nutrition",
        description: "Increased portions and nutritional needs",
        caloriesPerDay: "1,600-2,200 calories",
        proteinPerDay: "24-46g protein"
    }
];

// Diet Chart Manager Class
class DietChartManager {
  constructor() {
    this.currentUser = null;
    this.childData = null;
    this.weeklyDietPlan = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.checkAuthStatus();
  }
  getFeedingStage(ageInMonths) {
    if (ageInMonths < 6) return 'milk_only';
    if (ageInMonths < 12) return 'weaning';
    if (ageInMonths < 24) return 'toddler';
    if (ageInMonths < 60) return 'preschool';
    return 'school_age';
}

getCalorieRequirement(ageInMonths) {
    // Age-based calorie requirements (approximate)
    if (ageInMonths < 6) return 500;   // 0-6 months
    if (ageInMonths < 12) return 700;  // 6-12 months
    if (ageInMonths < 24) return 1000; // 1-2 years
    if (ageInMonths < 36) return 1200; // 2-3 years
    if (ageInMonths < 60) return 1400; // 3-5 years
    if (ageInMonths < 96) return 1600; // 5-8 years
    return 1800; // 8-12 years
}

getProteinRequirement(ageInMonths) {
    // Age-based protein requirements in grams
    if (ageInMonths < 6) return 10;
    if (ageInMonths < 12) return 15;
    if (ageInMonths < 24) return 20;
    if (ageInMonths < 36) return 25;
    if (ageInMonths < 60) return 30;
    if (ageInMonths < 96) return 35;
    return 40;
}
  getAgeInMonths(age) {
    if (typeof age === 'number') {
        return age * 12; // assuming the number was in years
    } else if (typeof age === 'object' && age !== null) {
        let totalMonths = 0;
        
        if (age.years !== undefined) {
            totalMonths += age.years * 12;
        }
        if (age.months !== undefined) {
            totalMonths += age.months;
        }
        if (age.days !== undefined) {
            totalMonths += age.days / 30; // approximate
        }
        
        return Math.round(totalMonths * 100) / 100;
    } else if (typeof age === 'string') {
        let totalMonths = 0;
        
        const yearsMatch = age.match(/(\d+)\s*years?/i);
        const monthsMatch = age.match(/(\d+)\s*months?/i);
        const daysMatch = age.match(/(\d+)\s*days?/i);
        
        if (yearsMatch) totalMonths += parseInt(yearsMatch[1]) * 12;
        if (monthsMatch) totalMonths += parseInt(monthsMatch[1]);
        if (daysMatch) totalMonths += parseInt(daysMatch[1]) / 30;
        
        return Math.round(totalMonths * 100) / 100;
    }
    
    return 0;
}

  // Setup event listeners
  setupEventListeners() {
    // Generate new plan button
    const generateBtn = document.getElementById('generate-new-plan');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => this.generateWeeklyDietPlan());
    }

    // Export plan button
    const exportBtn = document.getElementById('export-plan');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportDietPlan());
    }

    // Print plan button
    const printBtn = document.getElementById('print-plan');
    if (printBtn) {
      printBtn.addEventListener('click', () => window.print());
    }
  }

  // Check authentication status
  checkAuthStatus() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        this.currentUser = user;
        await this.loadUserData();
      } else {
        window.location.href = 'login.html';
      }
    });
  }

  // Load user data and child information from Firebase
  async loadUserData() {
    if (!this.currentUser) return;

    try {
      const userRef = doc(db, "users", this.currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        
        if (userData.childData) {
          this.childData = userData.childData;
          this.displayChildInfo(userData.childData);
          
          // Load or generate weekly diet plan
          await this.loadWeeklyDietPlan(userData);
        } else {
          this.showError("❌ Child profile not found. Please complete your profile first.");
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 3000);
        }
      } else {
        this.showError("❌ User data not found.");
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      this.showError("❌ Error loading profile data.");
    }
}
  // Display child information with feeding stage
  displayChildInfo(childData) {
    const childNameElement = document.getElementById('child-name');
    const childAgeElement = document.getElementById('child-age');
    const childDietElement = document.getElementById('child-diet');
    const childAllergiesElement = document.getElementById('child-allergies');
    const feedingStageElement = document.getElementById('feeding-stage');
    console.log("Full childData:", childData);
console.log("Available fields:", Object.keys(childData));
for (let key in childData) {
    console.log(`${key}:`, childData[key]);
}

    if (childNameElement) childNameElement.textContent = childData.name || 'Unknown';
    if (childAgeElement && childData.age) {
    const years = childData.age.years || 0;
    const months = childData.age.months || 0;
    const days = childData.age.days || 0;
    
    childAgeElement.textContent = `${years} years, ${months} months, ${days} days`;
}
    if (childDietElement) childDietElement.textContent = childData.diet || 'Not specified';
    if (childAllergiesElement) childAllergiesElement.textContent = childData.allergies || 'None';
    if (feedingStageElement && plan) {
        feedingStageElement.textContent = plan.description;
    }
  }

  // Load weekly diet plan from Firebase or generate new one
  async loadWeeklyDietPlan(userData) {
    const currentWeekStart = this.getCurrentWeekStart();
    
    // Check if we have a current diet plan for this week
    if (userData.weeklyDietPlan && userData.currentWeek === currentWeekStart) {
      this.weeklyDietPlan = userData.weeklyDietPlan;
      this.renderWeekPlan(this.weeklyDietPlan);
    } else {
      // Generate new weekly plan
      await this.generateWeeklyDietPlan();
    }
  }

  // Generate new weekly diet plan
  async generateWeeklyDietPlan() {
    if (!this.childData) return;

    // Show loading
    this.showLoading("Generating personalized diet plan...");

    const ageInMonths = this.getAgeInMonths(this.childData.age);

// Check if age is within valid range for diet planning
if (ageInMonths < 0 || ageInMonths > 144) {
    this.showError("❌ Age out of range for diet plan.");
    return;
}

// Create plan object with age-appropriate calorie requirements
const plan = {
    stage: this.getFeedingStage(ageInMonths),
    calories: this.getCalorieRequirement(ageInMonths),
    protein: this.getProteinRequirement(ageInMonths)
};
    // Get filtered food items based on age and preferences
    const foodItems = this.getFilteredFoodItems(plan.stage);
    
    const weeklyPlan = {};
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    
    days.forEach(day => {
      weeklyPlan[day] = this.generateDayPlan(plan.calories, plan.protein, foodItems, plan.stage);
    });

    // Save to Firebase
    try {
      const userDocRef = doc(db, 'users', this.currentUser.uid);
      await updateDoc(userDocRef, {
        weeklyDietPlan: weeklyPlan,
        currentWeek: this.getCurrentWeekStart(),
        feedingStage: plan.stage,
        updatedAt: new Date()
      });

      this.weeklyDietPlan = weeklyPlan;
      this.hideLoading();
      this.renderWeekPlan(weeklyPlan);
      this.showNotification("✅ New diet plan generated successfully!");

    } catch (error) {
      console.error('Error saving weekly diet plan:', error);
      this.hideLoading();
      this.showError("❌ Error saving diet plan.");
    }
  }

  // Get meal times
  getMealTime(mealType) {
    const times = {
      breakfast: '8:00 AM',
      lunch: '1:00 PM',
      snacks: '4:00 PM',
      dinner: '7:00 PM'
    };
    return times[mealType];
  }

  // Get comprehensive food database with Indian foods and age-specific portions
  getFoodDatabase() {
    return {
      // Milk for all ages
      milk: [
        { name: "Breast Milk", calories: 70, protein: 1, emoji: "🤱", type: "universal", ageMin: 0, ageMax: 12, portion: "150ml" },
        { name: "Formula Milk", calories: 70, protein: 1.5, emoji: "🍼", type: "universal", ageMin: 0, ageMax: 12, portion: "150ml" },
        { name: "Cow Milk", calories: 150, protein: 8, emoji: "🥛", type: "vegetarian", ageMin: 12, ageMax: 144, portion: "200ml" },
        { name: "Buffalo Milk", calories: 180, protein: 9, emoji: "🥛", type: "vegetarian", ageMin: 12, ageMax: 144, portion: "200ml" },
        { name: "Almond Milk", calories: 80, protein: 3, emoji: "🥛", type: "vegan", ageMin: 24, ageMax: 144, portion: "200ml" },
        { name: "Coconut Milk", calories: 90, protein: 2, emoji: "🥥", type: "vegan", ageMin: 24, ageMax: 144, portion: "200ml" },
        { name: "Soy Milk", calories: 100, protein: 7, emoji: "🥛", type: "vegan", ageMin: 24, ageMax: 144, portion: "200ml" }
      ],

      // First foods for 0.5-1 years
      firstFoods: [
        { name: "Rice Cereal", calories: 60, protein: 1, emoji: "🍚", type: "vegan", ageMin: 6, ageMax: 12, portion: "2-3 tbsp" },
        { name: "Mashed Banana", calories: 50, protein: 0.5, emoji: "🍌", type: "vegan", ageMin: 6, ageMax: 12, portion: "1/2 small banana" },
        { name: "Sweet Potato Puree", calories: 45, protein: 1, emoji: "🍠", type: "vegan", ageMin: 6, ageMax: 12, portion: "2-3 tbsp" },
        { name: "Carrot Puree", calories: 25, protein: 0.6, emoji: "🥕", type: "vegan", ageMin: 6, ageMax: 12, portion: "2-3 tbsp" },
        { name: "Apple Puree", calories: 40, protein: 0.2, emoji: "🍎", type: "vegan", ageMin: 6, ageMax: 12, portion: "2-3 tbsp" },
        { name: "Dal Water", calories: 25, protein: 2, emoji: "🍛", type: "vegan", ageMin: 7, ageMax: 12, portion: "2-3 tbsp" },
        { name: "Vegetable Puree", calories: 35, protein: 1, emoji: "🥬", type: "vegan", ageMin: 7, ageMax: 12, portion: "2-3 tbsp" },
        { name: "Pumpkin Puree", calories: 30, protein: 0.8, emoji: "🎃", type: "vegan", ageMin: 7, ageMax: 12, portion: "2-3 tbsp" },
        { name: "Pear Puree", calories: 35, protein: 0.3, emoji: "🍐", type: "vegan", ageMin: 7, ageMax: 12, portion: "2-3 tbsp" },
        { name: "Avocado Puree", calories: 60, protein: 1, emoji: "🥑", type: "vegan", ageMin: 9, ageMax: 12, portion: "2-3 tbsp" }
      ],

      // Main breakfast items for 1-5 years
      mainBreakfast: [
        { name: "Khichdi", calories: 120, protein: 4, emoji: "🍲", type: "vegan", ageMin: 12, ageMax: 60, portion: "1/2 cup (100g)" },
        { name: "Dalia", calories: 110, protein: 3, emoji: "🥣", type: "vegan", ageMin: 12, ageMax: 60, portion: "1/2 cup (80g)" },
        { name: "Oats", calories: 100, protein: 3, emoji: "🥣", type: "vegan", ageMin: 12, ageMax: 60, portion: "1/3 cup (40g)" },
        { name: "Upma", calories: 100, protein: 3, emoji: "🥣", type: "vegan", ageMin: 12, ageMax: 60, portion: "1/2 cup (80g)" },
        { name: "Vermicelli Upma", calories: 110, protein: 3.5, emoji: "🍝", type: "vegan", ageMin: 12, ageMax: 60, portion: "1/2 cup (80g)" },
        { name: "Ragi Porridge", calories: 90, protein: 2.5, emoji: "🥣", type: "vegan", ageMin: 12, ageMax: 60, portion: "1/2 cup (80g)" },
        { name: "Quinoa Porridge", calories: 120, protein: 4.5, emoji: "🥣", type: "vegan", ageMin: 24, ageMax: 60, portion: "1/2 cup (80g)"}
      ],
      // School breakfast items for 5-8 years (60-96 months)
schoolBreakfast: [
  { name: "Poha", calories: 110, protein: 2, emoji: "🥣", type: "vegan", ageMin: 60, ageMax: 96, portion: "1 cup (100g)" },
  { name: "Upma", calories: 100, protein: 3, emoji: "🥣", type: "vegan", ageMin: 60, ageMax: 96, portion: "1 cup (100g)" },
  { name: "Oats", calories: 150, protein: 5, emoji: "🥣", type: "vegan", ageMin: 60, ageMax: 96, portion: "1/2 cup (50g)" },
  { name: "Cheese Sandwich", calories: 200, protein: 8, emoji: "🥪", type: "vegetarian", ageMin: 60, ageMax: 96, portion: "1 sandwich (80g)" },
  { name: "Idli", calories: 85, protein: 3, emoji: "⚪", type: "vegan", ageMin: 60, ageMax: 96, portion: "2 pieces (100g)" },
  { name: "Dosa with Sambhar", calories: 180, protein: 6, emoji: "🥞", type: "vegan", ageMin: 60, ageMax: 96, portion: "1 dosa + 1/4 cup sambhar" },
  { name: "Uttapam", calories: 150, protein: 5, emoji: "🥞", type: "vegan", ageMin: 60, ageMax: 96, portion: "1 piece (100g)" },
  { name: "Dhokla", calories: 120, protein: 4, emoji: "🟡", type: "vegan", ageMin: 60, ageMax: 96, portion: "2 pieces (80g)" },
  { name: "Vegetable Sandwich", calories: 180, protein: 6, emoji: "🥪", type: "vegan", ageMin: 60, ageMax: 96, portion: "1 sandwich (80g)" },
  { name: "Peanut Butter Toast", calories: 200, protein: 8, emoji: "🍞", type: "vegan", ageMin: 60, ageMax: 96, portion: "2 slices (60g)" }
],

// Pre-teen breakfast items for 8-12 years (96-144 months)
preteenBreakfast: [
  { name: "Aloo Paratha", calories: 200, protein: 6, emoji: "🫓", type: "vegan", ageMin: 96, ageMax: 144, portion: "1 large (100g)" },
  { name: "Paneer Paratha", calories: 250, protein: 12, emoji: "🫓", type: "vegetarian", ageMin: 96, ageMax: 144, portion: "1 large (100g)" },
  { name: "Gobi Paratha", calories: 180, protein: 5, emoji: "🫓", type: "vegan", ageMin: 96, ageMax: 144, portion: "1 large (100g)" },
  { name: "Mooli Paratha", calories: 170, protein: 4, emoji: "🫓", type: "vegan", ageMin: 96, ageMax: 144, portion: "1 large (100g)" },
  { name: "Upma", calories: 150, protein: 4, emoji: "🥣", type: "vegan", ageMin: 96, ageMax: 144, portion: "1 cup (120g)" },
  { name: "Poha", calories: 140, protein: 3, emoji: "🥣", type: "vegan", ageMin: 96, ageMax: 144, portion: "1 cup (120g)" },
  { name: "Oats", calories: 200, protein: 6, emoji: "🥣", type: "vegan", ageMin: 96, ageMax: 144, portion: "2/3 cup (60g)" },
  { name: "Idli with Sambhar", calories: 150, protein: 6, emoji: "⚪", type: "vegan", ageMin: 96, ageMax: 144, portion: "3 idli + 1/2 cup sambhar" },
  { name: "Dosa with Chutney", calories: 180, protein: 6, emoji: "🥞", type: "vegan", ageMin: 96, ageMax: 144, portion: "1 dosa + chutney" },
  { name: "Masala Paratha", calories: 220, protein: 7, emoji: "🫓", type: "vegan", ageMin: 96, ageMax: 144, portion: "1 large (100g)" },
  { name: "Besan Chilla", calories: 160, protein: 8, emoji: "🥞", type: "vegan", ageMin: 96, ageMax: 144, portion: "2 pieces (100g)" },
  { name: "Egg Paratha", calories: 280, protein: 15, emoji: "🫓", type: "non-vegetarian", ageMin: 96, ageMax: 144, portion: "1 large (100g)" },
  { name: "Chicken Sandwich", calories: 220, protein: 18, emoji: "🥪", type: "non-vegetarian", ageMin: 96, ageMax: 144, portion: "1 sandwich (80g)" }
],

// Main carbs
mainCarbs: [
  { name: "Soft Chapati", calories: 80, protein: 3, emoji: "🌾", type: "vegan", ageMin: 12, ageMax: 60, portion: "1 small (30g)" },
  { name: "Chapati", calories: 80, protein: 3, emoji: "🌾", type: "vegan", ageMin: 60, ageMax: 144, portion: "2 medium (60g)" },
  { name: "Plain Rice", calories: 130, protein: 2.7, emoji: "🍚", type: "vegan", ageMin: 12, ageMax: 60, portion: "1/2 cup (100g)" },
  { name: "Rice", calories: 130, protein: 2.7, emoji: "🍚", type: "vegan", ageMin: 60, ageMax: 144, portion: "3/4 cup (150g)" },
  { name: "Brown Rice", calories: 110, protein: 2.5, emoji: "🍚", type: "vegan", ageMin: 60, ageMax: 144, portion: "3/4 cup (150g)" },
  { name: "Quinoa", calories: 120, protein: 4.5, emoji: "🌾", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Millet Rice", calories: 115, protein: 3.5, emoji: "🌾", type: "vegan", ageMin: 60, ageMax: 144, portion: "3/4 cup (150g)" },
  { name: "Ragi Roti", calories: 85, protein: 3, emoji: "🌾", type: "vegan", ageMin: 60, ageMax: 144, portion: "2 medium (60g)" },
  { name: "Jowar Roti", calories: 90, protein: 3.2, emoji: "🌾", type: "vegan", ageMin: 60, ageMax: 144, portion: "2 medium (60g)" }
],

// Dal/Protein
dal: [
  { name: "Dal", calories: 115, protein: 9, emoji: "🍛", type: "vegan", ageMin: 12, ageMax: 144, portion: "2-3 tbsp (50g)" },
  { name: "Masoor Dal", calories: 115, protein: 9, emoji: "🍛", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Moong Dal", calories: 105, protein: 7, emoji: "🍛", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Toor Dal", calories: 120, protein: 8, emoji: "🍛", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Rajma", calories: 140, protein: 8, emoji: "🫘", type: "vegan", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Chole", calories: 160, protein: 8, emoji: "🫘", type: "vegan", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Urad Dal", calories: 125, protein: 9, emoji: "🍛", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Chana Dal", calories: 120, protein: 8.5, emoji: "🍛", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Mixed Dal", calories: 118, protein: 8.2, emoji: "🍛", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Black Dal", calories: 130, protein: 9.5, emoji: "🍛", type: "vegan", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" }
],

// Vegetables/Sabzi (Enhanced with Jain-friendly options)
vegetables: [
  { name: "Vegetable Puree", calories: 40, protein: 1.5, emoji: "🥕", type: "vegan", ageMin: 12, ageMax: 60, portion: "3-4 tbsp (60g)" },
  { name: "Vegetable Sabzi", calories: 60, protein: 2, emoji: "🥬", type: "vegan", ageMin: 12, ageMax: 144, portion: "1/4 cup (50g)" },
  { name: "Green Vegetable Sabzi", calories: 80, protein: 3, emoji: "🥬", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Aloo Sabzi", calories: 90, protein: 2, emoji: "🥔", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Palak Sabzi", calories: 60, protein: 4, emoji: "🥬", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Bhindi Sabzi", calories: 70, protein: 2, emoji: "🌶️", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Lauki Sabzi", calories: 50, protein: 1.5, emoji: "🥒", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Tinda Sabzi", calories: 45, protein: 1.2, emoji: "🥒", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Parwal Sabzi", calories: 55, protein: 2, emoji: "🥒", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Karela Sabzi", calories: 40, protein: 1.8, emoji: "🥒", type: "vegan", ageMin: 96, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Cabbage Sabzi", calories: 55, protein: 2.5, emoji: "🥬", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Cauliflower Sabzi", calories: 65, protein: 3, emoji: "🥦", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Green Beans Sabzi", calories: 60, protein: 2.8, emoji: "🫛", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Pumpkin Sabzi", calories: 50, protein: 1.5, emoji: "🎃", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Drumstick Sabzi", calories: 65, protein: 3.2, emoji: "🥒", type: "vegan", ageMin: 96, ageMax: 144, portion: "1/2 cup (80g)" }
],

// Paneer items
paneer: [
  { name: "Paneer Sabzi", calories: 150, protein: 12, emoji: "🧀", type: "vegetarian", ageMin: 60, ageMax: 96, portion: "1/4 cup (60g)" },
  { name: "Paneer Sabzi", calories: 180, protein: 15, emoji: "🧀", type: "vegetarian", ageMin: 96, ageMax: 144, portion: "1/3 cup (80g)" },
  { name: "Palak Paneer", calories: 150, protein: 8, emoji: "🥬", type: "vegetarian", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Matar Paneer", calories: 160, protein: 9, emoji: "🟢", type: "vegetarian", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Paneer Butter Masala", calories: 200, protein: 12, emoji: "🧀", type: "vegetarian", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Paneer Tikka", calories: 180, protein: 14, emoji: "🧀", type: "vegetarian", ageMin: 96, ageMax: 144, portion: "4-5 pieces (80g)" }
],

// Non-Vegetarian Items
nonVeg: [
  { name: "Chicken Curry", calories: 200, protein: 25, emoji: "🍗", type: "non-vegetarian", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Chicken Biryani", calories: 300, protein: 20, emoji: "🍚", type: "non-vegetarian", ageMin: 96, ageMax: 144, portion: "1 cup (150g)" },
  { name: "Egg Curry", calories: 180, protein: 12, emoji: "🥚", type: "non-vegetarian", ageMin: 60, ageMax: 144, portion: "2 eggs with gravy" },
  { name: "Boiled Egg", calories: 70, protein: 6, emoji: "🥚", type: "non-vegetarian", ageMin: 60, ageMax: 144, portion: "1 egg" },
  { name: "Scrambled Eggs", calories: 140, protein: 12, emoji: "🍳", type: "non-vegetarian", ageMin: 60, ageMax: 144, portion: "2 eggs" },
  { name: "Fish Curry", calories: 180, protein: 22, emoji: "🐟", type: "non-vegetarian", ageMin: 96, ageMax: 144, portion: "1 piece (100g)" },
  { name: "Chicken Soup", calories: 120, protein: 15, emoji: "🍲", type: "non-vegetarian", ageMin: 60, ageMax: 144, portion: "1 cup (200ml)" },
  { name: "Mutton Curry", calories: 250, protein: 28, emoji: "🍖", type: "non-vegetarian", ageMin: 120, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Chicken Tikka", calories: 160, protein: 20, emoji: "🍗", type: "non-vegetarian", ageMin: 96, ageMax: 144, portion: "4-5 pieces (80g)" },
  { name: "Fish Fry", calories: 150, protein: 18, emoji: "🐟", type: "non-vegetarian", ageMin: 96, ageMax: 144, portion: "1 piece (80g)" }
],

// Vegan Protein Sources
veganProteins: [
  { name: "Tofu Curry", calories: 120, protein: 10, emoji: "🟡", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Soya Chunks Curry", calories: 140, protein: 12, emoji: "🟤", type: "vegan", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Tempeh", calories: 160, protein: 15, emoji: "🟫", type: "vegan", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Hummus", calories: 120, protein: 6, emoji: "🟡", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/4 cup (60g)" },
  { name: "Lentil Soup", calories: 100, protein: 8, emoji: "🍲", type: "vegan", ageMin: 60, ageMax: 144, portion: "1 cup (200ml)" },
  { name: "Quinoa Salad", calories: 140, protein: 6, emoji: "🥗", type: "vegan", ageMin: 96, ageMax: 144, portion: "1/2 cup (100g)" }
],

// Jain-Specific Items (No root vegetables, no onion/garlic)
jainSpecial: [
  { name: "Jain Dal", calories: 110, protein: 8, emoji: "🍛", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Cabbage Paratha", calories: 160, protein: 5, emoji: "🫓", type: "jain", ageMin: 96, ageMax: 144, portion: "1 large (100g)" },
  { name: "Tomato Rice", calories: 140, protein: 3, emoji: "🍚", type: "jain", ageMin: 60, ageMax: 144, portion: "3/4 cup (150g)" },
  { name: "Green Vegetable Khichdi", calories: 130, protein: 5, emoji: "🍲", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Capsicum Sabzi", calories: 70, protein: 2.5, emoji: "🫑", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Green Peas Curry", calories: 80, protein: 5, emoji: "🟢", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Corn Curry", calories: 90, protein: 3.5, emoji: "🌽", type: "jain", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Spinach Roti", calories: 85, protein: 4, emoji: "🌾", type: "jain", ageMin: 60, ageMax: 144, portion: "2 medium (60g)" }
],

// Dairy
dairy: [
  { name: "Yogurt", calories: 60, protein: 3.5, emoji: "🥛", type: "vegetarian", ageMin: 12, ageMax: 96, portion: "1/4 cup (60g)" },
  { name: "Greek Yogurt", calories: 100, protein: 10, emoji: "🥛", type: "vegetarian", ageMin: 60, ageMax: 144, portion: "1/4 cup (60g)" },
  { name: "Buttermilk", calories: 40, protein: 2, emoji: "🥛", type: "vegetarian", ageMin: 60, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Cottage Cheese", calories: 80, protein: 14, emoji: "🧀", type: "vegetarian", ageMin: 96, ageMax: 144, portion: "1/4 cup (60g)" },
  { name: "Lassi", calories: 120, protein: 5, emoji: "🥤", type: "vegetarian", ageMin: 60, ageMax: 144, portion: "1 glass (200ml)" }
],

// Fruits (Enhanced)
fruits: [
  { name: "Apple", calories: 52, protein: 0.3, emoji: "🍎", type: "vegan", ageMin: 12, ageMax: 144, portion: "1/2 medium (80g)" },
  { name: "Banana", calories: 89, protein: 1.1, emoji: "🍌", type: "vegan", ageMin: 12, ageMax: 144, portion: "1/2 medium (60g)" },
  { name: "Orange", calories: 47, protein: 0.9, emoji: "🍊", type: "vegan", ageMin: 12, ageMax: 144, portion: "1/2 medium (80g)" },
  { name: "Mango", calories: 60, protein: 0.8, emoji: "🥭", type: "vegan", ageMin: 12, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Grapes", calories: 62, protein: 0.6, emoji: "🍇", type: "vegan", ageMin: 24, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Papaya", calories: 43, protein: 0.5, emoji: "🧡", type: "vegan", ageMin: 12, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Watermelon", calories: 30, protein: 0.6, emoji: "🍉", type: "vegan", ageMin: 12, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Pear", calories: 57, protein: 0.4, emoji: "🍐", type: "vegan", ageMin: 12, ageMax: 144, portion: "1/2 medium (80g)" },
  { name: "Pomegranate", calories: 83, protein: 1.7, emoji: "🟥", type: "vegan", ageMin: 24, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Kiwi", calories: 61, protein: 1.1, emoji: "🥝", type: "vegan", ageMin: 24, ageMax: 144, portion: "1 medium (70g)" },
  { name: "Guava", calories: 68, protein: 2.6, emoji: "🟢", type: "vegan", ageMin: 24, ageMax: 144, portion: "1 medium (80g)" },
  { name: "Custard Apple", calories: 94, protein: 2.1, emoji: "🟢", type: "vegan", ageMin: 24, ageMax: 144, portion: "1/2 medium (80g)" },
  { name: "Chikoo", calories: 83, protein: 0.4, emoji: "🟤", type: "vegan", ageMin: 24, ageMax: 144, portion: "1 medium (80g)" },
  { name: "Pineapple", calories: 50, protein: 0.5, emoji: "🍍", type: "vegan", ageMin: 24, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Sweet Lime", calories: 43, protein: 0.8, emoji: "🟡", type: "vegan", ageMin: 12, ageMax: 144, portion: "1 medium (80g)" },
  { name: "Plum", calories: 46, protein: 0.7, emoji: "🟣", type: "vegan", ageMin: 24, ageMax: 144, portion: "2 medium (80g)" },
  { name: "Peach", calories: 39, protein: 0.9, emoji: "🍑", type: "vegan", ageMin: 24, ageMax: 144, portion: "1 medium (80g)" },
  { name: "Lychee", calories: 66, protein: 0.8, emoji: "🟥", type: "vegan", ageMin: 36, ageMax: 144, portion: "8-10 pieces (80g)" },
  { name: "Dragon Fruit", calories: 60, protein: 1.2, emoji: "🟥", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Fig", calories: 74, protein: 0.8, emoji: "🟤", type: "vegan", ageMin: 24, ageMax: 144, portion: "3-4 pieces (80g)" },
  { name: "Berries", calories: 57, protein: 0.7, emoji: "🫐", type: "vegan", ageMin: 24, ageMax: 144, portion: "1/2 cup (80g)" }
],

// Nuts & Seeds
nuts: [
  { name: "Almonds", calories: 164, protein: 6, emoji: "🌰", type: "vegan", ageMin: 24, ageMax: 144, portion: "10 pieces (20g)" },
  { name: "Walnuts", calories: 131, protein: 3, emoji: "🌰", type: "vegan", ageMin: 24, ageMax: 144, portion: "4 halves (20g)" },
  { name: "Cashews", calories: 111, protein: 4, emoji: "🌰", type: "vegan", ageMin: 24, ageMax: 144, portion: "10 pieces (20g)" },
  { name: "Pistachios", calories: 114, protein: 4, emoji: "🌰", type: "vegan", ageMin: 36, ageMax: 144, portion: "15 pieces (20g)" },
  { name: "Peanuts", calories: 113, protein: 5, emoji: "🥜", type: "vegan", ageMin: 36, ageMax: 144, portion: "20 pieces (20g)" },
  { name: "Dates", calories: 66, protein: 0.4, emoji: "🌰", type: "vegan", ageMin: 12, ageMax: 144, portion: "2-3 pieces (20g)" },
  { name: "Raisins", calories: 85, protein: 1, emoji: "🟫", type: "vegan", ageMin: 24, ageMax: 144, portion: "2 tbsp (20g)" },
  { name: "Sunflower Seeds", calories: 116, protein: 4, emoji: "🌻", type: "vegan", ageMin: 36, ageMax: 144, portion: "2 tbsp (20g)" },
  { name: "Pumpkin Seeds", calories: 110, protein: 5, emoji: "🎃", type: "vegan", ageMin: 36, ageMax: 144, portion: "2 tbsp (20g)" },
  { name: "Chia Seeds", calories: 97, protein: 3, emoji: "⚫", type: "vegan", ageMin: 60, ageMax: 144, portion: "2 tbsp (20g)" },
  { name: "Flax Seeds", calories: 107, protein: 4, emoji: "⚫", type: "vegan", ageMin: 60, ageMax: 144, portion: "2 tbsp (20g)" },
  { name: "Sesame Seeds", calories: 113, protein: 3, emoji: "⚪", type: "vegan", ageMin: 36, ageMax: 144, portion: "2 tbsp (20g)" },
  { name: "Pine Nuts", calories: 137, protein: 3, emoji: "🌰", type: "vegan", ageMin: 48, ageMax: 144, portion: "2 tbsp (20g)" },
  { name: "Brazil Nuts", calories: 133, protein: 3, emoji: "🌰", type: "vegan", ageMin: 48, ageMax: 144, portion: "3 pieces (20g)" }
],
// Healthy Snacks
healthySnacks: [
  { name: "Roasted Chana", calories: 110, protein: 6, emoji: "🟤", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/4 cup (30g)" },
  { name: "Puffed Rice", calories: 90, protein: 2, emoji: "🍚", type: "vegan", ageMin: 24, ageMax: 144, portion: "1/2 cup (20g)" },
  { name: "Rice Cakes", calories: 70, protein: 1.5, emoji: "🍘", type: "vegan", ageMin: 36, ageMax: 144, portion: "2 pieces (20g)" },
  { name: "Vegetable Sticks", calories: 25, protein: 1, emoji: "🥕", type: "vegan", ageMin: 24, ageMax: 144, portion: "1/2 cup (60g)" },
  { name: "Homemade Granola", calories: 130, protein: 4, emoji: "🥣", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/4 cup (30g)" },
  { name: "Fruit Salad", calories: 60, protein: 1, emoji: "🥗", type: "vegan", ageMin: 12, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Baked Sweet Potato", calories: 90, protein: 2, emoji: "🍠", type: "vegan", ageMin: 24, ageMax: 144, portion: "1 small (80g)" },
  { name: "Homemade Trail Mix", calories: 140, protein: 4, emoji: "🥜", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/4 cup (30g)" },
  { name: "Banana Chips", calories: 95, protein: 1, emoji: "🍌", type: "vegan", ageMin: 36, ageMax: 144, portion: "15 pieces (20g)" },
  { name: "Coconut Chips", calories: 120, protein: 2, emoji: "🥥", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/4 cup (20g)" },
  { name: "Seeded Crackers", calories: 80, protein: 3, emoji: "🍘", type: "vegan", ageMin: 36, ageMax: 144, portion: "4-5 pieces (20g)" },
  { name: "Hummus with Veggies", calories: 90, protein: 4, emoji: "🥕", type: "vegan", ageMin: 36, ageMax: 144, portion: "2 tbsp hummus + veggies" },
  { name: "Apple Slices with Peanut Butter", calories: 150, protein: 6, emoji: "🍎", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/2 apple + 1 tbsp PB" },
  { name: "Homemade Energy Balls", calories: 120, protein: 3, emoji: "⚫", type: "vegan", ageMin: 36, ageMax: 144, portion: "2 pieces (30g)" }
],

// Sprouts
sprouts: [
  { name: "Moong Sprouts", calories: 30, protein: 3, emoji: "🌱", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/2 cup (50g)" },
  { name: "Chana Sprouts", calories: 35, protein: 4, emoji: "🌱", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/2 cup (50g)" },
  { name: "Mixed Sprouts", calories: 32, protein: 3.5, emoji: "🌱", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/2 cup (50g)" },
  { name: "Alfalfa Sprouts", calories: 8, protein: 1.3, emoji: "🌱", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/2 cup (33g)" },
  { name: "Sprouts Salad", calories: 60, protein: 5, emoji: "🥗", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/2 cup (60g)" },
  { name: "Sprouts Chaat", calories: 80, protein: 5, emoji: "🥗", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (70g)" },
  { name: "Cooked Sprouts", calories: 45, protein: 4, emoji: "🌱", type: "vegan", ageMin: 36, ageMax: 144, portion: "1/2 cup (60g)" },
  { name: "Sprouts Curry", calories: 90, protein: 6, emoji: "🍛", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Methi Sprouts", calories: 40, protein: 4, emoji: "🌱", type: "vegan", ageMin: 60, ageMax: 144, portion: "1/2 cup (50g)" },
  { name: "Sprouts Sandwich", calories: 140, protein: 8, emoji: "🥪", type: "vegan", ageMin: 60, ageMax: 144, portion: "1 sandwich (80g)" }
],

// Shakes & Smoothies
shakes: [
  { name: "Banana Milkshake", calories: 200, protein: 9, emoji: "🥤", type: "vegetarian", ageMin: 24, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Mango Milkshake", calories: 220, protein: 8, emoji: "🥤", type: "vegetarian", ageMin: 24, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Strawberry Milkshake", calories: 180, protein: 7, emoji: "🥤", type: "vegetarian", ageMin: 24, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Chocolate Milkshake", calories: 250, protein: 9, emoji: "🥤", type: "vegetarian", ageMin: 36, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Green Smoothie", calories: 120, protein: 4, emoji: "🥤", type: "vegan", ageMin: 36, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Berry Smoothie", calories: 140, protein: 5, emoji: "🥤", type: "vegan", ageMin: 24, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Protein Smoothie", calories: 180, protein: 12, emoji: "🥤", type: "vegetarian", ageMin: 60, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Avocado Smoothie", calories: 160, protein: 6, emoji: "🥤", type: "vegan", ageMin: 36, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Oats Smoothie", calories: 170, protein: 7, emoji: "🥤", type: "vegan", ageMin: 36, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Coconut Water", calories: 45, protein: 2, emoji: "🥤", type: "vegan", ageMin: 12, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Fresh Fruit Juice", calories: 80, protein: 1, emoji: "🧃", type: "vegan", ageMin: 12, ageMax: 144, portion: "1 glass (150ml)" },
  { name: "Vegetable Juice", calories: 50, protein: 2, emoji: "🧃", type: "vegan", ageMin: 24, ageMax: 144, portion: "1 glass (150ml)" }
],

// Occasional Junk Food (Limited portions for special occasions)
junkFood: [
  { name: "Pizza Slice", calories: 250, protein: 12, emoji: "🍕", type: "vegetarian", ageMin: 60, ageMax: 144, portion: "1 slice (100g)" },
  { name: "French Fries", calories: 180, protein: 2, emoji: "🍟", type: "vegan", ageMin: 60, ageMax: 144, portion: "Small portion (60g)" },
  { name: "Burger", calories: 300, protein: 15, emoji: "🍔", type: "vegetarian", ageMin: 96, ageMax: 144, portion: "1 small (120g)" },
  { name: "Ice Cream", calories: 140, protein: 3, emoji: "🍦", type: "vegetarian", ageMin: 36, ageMax: 144, portion: "1 scoop (60g)" },
  { name: "Chocolate", calories: 150, protein: 2, emoji: "🍫", type: "vegetarian", ageMin: 36, ageMax: 144, portion: "2 squares (25g)" },
  { name: "Cookies", calories: 120, protein: 2, emoji: "🍪", type: "vegetarian", ageMin: 36, ageMax: 144, portion: "2 pieces (30g)" },
  { name: "Cake", calories: 200, protein: 3, emoji: "🍰", type: "vegetarian", ageMin: 36, ageMax: 144, portion: "1 small slice (60g)" },
  { name: "Pastry", calories: 180, protein: 4, emoji: "🥐", type: "vegetarian", ageMin: 60, ageMax: 144, portion: "1 small (50g)" },
  { name: "Donuts", calories: 220, protein: 3, emoji: "🍩", type: "vegetarian", ageMin: 60, ageMax: 144, portion: "1 piece (50g)" },
  { name: "Candy", calories: 80, protein: 0, emoji: "🍬", type: "vegan", ageMin: 36, ageMax: 144, portion: "5-6 pieces (20g)" },
  { name: "Soft Drink", calories: 100, protein: 0, emoji: "🥤", type: "vegan", ageMin: 60, ageMax: 144, portion: "1 small glass (200ml)" },
  { name: "Chips", calories: 150, protein: 2, emoji: "🟡", type: "vegan", ageMin: 60, ageMax: 144, portion: "Small pack (30g)" }
],

// Universal Foods (Suitable for all dietary preferences)
universalFoods: [
  { name: "Water", calories: 0, protein: 0, emoji: "💧", type: "universal", ageMin: 0, ageMax: 144, portion: "As needed" },
  { name: "Coconut Water", calories: 45, protein: 2, emoji: "🥥", type: "universal", ageMin: 12, ageMax: 144, portion: "1 glass (200ml)" },
  { name: "Plain Rice", calories: 130, protein: 2.7, emoji: "🍚", type: "universal", ageMin: 12, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Steamed Vegetables", calories: 50, protein: 2, emoji: "🥦", type: "universal", ageMin: 12, ageMax: 144, portion: "1/2 cup (80g)" },
  { name: "Fresh Fruits", calories: 60, protein: 1, emoji: "🍎", type: "universal", ageMin: 12, ageMax: 144, portion: "1 serving (80g)" },
  { name: "Herbal Tea", calories: 5, protein: 0, emoji: "🍵", type: "universal", ageMin: 24, ageMax: 144, portion: "1 cup (200ml)" },
  { name: "Vegetable Broth", calories: 20, protein: 2, emoji: "🍲", type: "universal", ageMin: 12, ageMax: 144, portion: "1 cup (200ml)" },
  { name: "Banana", calories: 89, protein: 1.1, emoji: "🍌", type: "universal", ageMin: 6, ageMax: 144, portion: "1/2 medium (60g)" },
  { name: "Apple Sauce", calories: 50, protein: 0.2, emoji: "🍎", type: "universal", ageMin: 6, ageMax: 144, portion: "1/4 cup (60g)" },
  { name: "Rice Porridge", calories: 80, protein: 2, emoji: "🍚", type: "universal", ageMin: 6, ageMax: 144, portion: "1/2 cup (100g)" },
  { name: "Vegetable Puree", calories: 40, protein: 1.5, emoji: "🥕", type: "universal", ageMin: 6, ageMax: 144, portion: "3-4 tbsp (60g)" },
  { name: "Fruit Puree", calories: 45, protein: 0.5, emoji: "🍑", type: "universal", ageMin: 6, ageMax: 144, portion: "3-4 tbsp (60g)" }
],
    };
  }

  // Updated methods for DietChartManager class

// Get filtered food items based on age, diet preferences, and feeding stage
getFilteredFoodItems(feedingStage) {
  const foodDb = this.getFoodDatabase();
  let filteredCategories = {};

  // Filter each category based on age, diet, and allergies
  Object.keys(foodDb).forEach(category => {
    filteredCategories[category] = foodDb[category].filter(item => {
      // Age filter
const ageInMonths = this.getAgeInMonths(this.childData.age);
if (ageInMonths < item.ageMin || ageInMonths > item.ageMax) {
    return false;
}
      // Diet filter
      if (this.childData.diet === 'Vegetarian' && item.type === 'non-vegetarian') {
        return false;
      }
      if (this.childData.diet === 'Vegan' && (item.type === 'vegetarian' || item.type === 'non-vegetarian')) {
        return false;
      }

      // Allergy filter
      if (this.childData.allergies && this.childData.allergies.toLowerCase() !== 'none') {
        const allergies = this.childData.allergies.toLowerCase().split(',').map(a => a.trim());
        if (allergies.some(allergy => item.name.toLowerCase().includes(allergy))) {
          return false;
        }
      }

      return true;
    });
  });

  return filteredCategories;
}

// Generate one day's meal plan with age-appropriate foods
generateDayPlan(calorieTarget, proteinTarget, foodCategories, feedingStage) {
  if (feedingStage === 'milk-only') {
    return this.generateMilkOnlyPlan();
  }

  const ageInMonths = this.getAgeInMonths(this.childData.age);
  const dayPlan = {};

  // Age-specific meal generation
  if (ageInMonths >= 6 && ageInMonths <= 60) {
    dayPlan.breakfast = this.generateAgeSpecificBreakfast(ageInMonths, foodCategories, 'toddler');
    dayPlan.lunch = this.generateAgeSpecificLunch(ageInMonths, foodCategories, 'toddler');
    dayPlan.snacks = this.generateAgeSpecificSnacks(ageInMonths, foodCategories, 'toddler');
    dayPlan.dinner = this.generateAgeSpecificDinner(ageInMonths, foodCategories, 'toddler');
  } else if (ageInMonths >= 60 && ageInMonths <= 96) {
    dayPlan.breakfast = this.generateAgeSpecificBreakfast(ageInMonths, foodCategories, 'school');
    dayPlan.lunch = this.generateAgeSpecificLunch(ageInMonths, foodCategories, 'school');
    dayPlan.snacks = this.generateAgeSpecificSnacks(ageInMonths, foodCategories, 'school');
    dayPlan.dinner = this.generateAgeSpecificDinner(ageInMonths, foodCategories, 'school');
  } else if (ageInMonths >= 96 && ageInMonths <= 144) {
    dayPlan.breakfast = this.generateAgeSpecificBreakfast(ageInMonths, foodCategories, 'preteen');
    dayPlan.lunch = this.generateAgeSpecificLunch(ageInMonths, foodCategories, 'preteen');
    dayPlan.snacks = this.generateAgeSpecificSnacks(ageInMonths, foodCategories, 'preteen');
    dayPlan.dinner = this.generateAgeSpecificDinner(ageInMonths, foodCategories, 'preteen');
  } else {
    // Default generation for other ages
    dayPlan.breakfast = this.generateDefaultMeal('breakfast', foodCategories);
    dayPlan.lunch = this.generateDefaultMeal('lunch', foodCategories);
    dayPlan.snacks = this.generateDefaultMeal('snacks', foodCategories);
    dayPlan.dinner = this.generateDefaultMeal('dinner', foodCategories);
  }

  // Calculate day totals
  const dayTotalCalories = Object.values(dayPlan).reduce((sum, meal) => sum + meal.totalCalories, 0);
  const dayTotalProtein = Object.values(dayPlan).reduce((sum, meal) => sum + meal.totalProtein, 0);
  
  dayPlan.dayTotals = {
    calories: dayTotalCalories,
    protein: Math.round(dayTotalProtein * 10) / 10
  };

  return dayPlan;
}

// Generate breakfast for specific age groups
generateAgeSpecificBreakfast(ageInMonths, foodCategories, ageGroup) {
  const selectedItems = [];
  let totalCalories = 0;
  let totalProtein = 0;

  if (ageGroup === 'toddler') { // 1-5 years
    // Morning milk + main breakfast
    const milkItem = this.selectRandomItem(foodCategories.milk);
    if (milkItem) {
      selectedItems.push(milkItem);
      totalCalories += milkItem.calories;
      totalProtein += milkItem.protein;
    }

    const breakfastItem = this.selectRandomItem(foodCategories.mainBreakfast);
    if (breakfastItem) {
      selectedItems.push(breakfastItem);
      totalCalories += breakfastItem.calories;
      totalProtein += breakfastItem.protein;
    }
  } else if (ageGroup === 'school') { // 5-8 years
    // School breakfast items
    const schoolBreakfastItems = this.selectMultipleItems(foodCategories.schoolBreakfast, 2);
    schoolBreakfastItems.forEach(item => {
      selectedItems.push(item);
      totalCalories += item.calories;
      totalProtein += item.protein;
    });
  } else if (ageGroup === 'preteen') { // 8-12 years
    // Preteen breakfast items
    const preteenBreakfastItems = this.selectMultipleItems(foodCategories.preteenBreakfast, 2);
    preteenBreakfastItems.forEach(item => {
      selectedItems.push(item);
      totalCalories += item.calories;
      totalProtein += item.protein;
    });
  }

  return this.createMealObject(selectedItems, totalCalories, totalProtein, '8:00 AM');
}

// Generate lunch for specific age groups
generateAgeSpecificLunch(age, foodCategories, ageGroup) {
  const selectedItems = [];
  let totalCalories = 0;
  let totalProtein = 0;

  if (ageGroup === 'toddler') { // 1-5 years
    // Chapati/rice + puree + yogurt
    const carbItem = this.selectRandomItem(foodCategories.mainCarbs);
    if (carbItem) {
      selectedItems.push(carbItem);
      totalCalories += carbItem.calories;
      totalProtein += carbItem.protein;
    }

    // Add puree (from first foods or vegetables)
    const pureeItem = this.selectRandomItem([...foodCategories.firstFoods, ...foodCategories.vegetables]);
    if (pureeItem) {
      selectedItems.push(pureeItem);
      totalCalories += pureeItem.calories;
      totalProtein += pureeItem.protein;
    }

    // Add yogurt
    const yogurtItem = this.selectRandomItem(foodCategories.dairy);
    if (yogurtItem) {
      selectedItems.push(yogurtItem);
      totalCalories += yogurtItem.calories;
      totalProtein += yogurtItem.protein;
    }
  } else if (ageGroup === 'school') { // 5-8 years
    // Chapati/rice + dal + sabzi + yogurt
    const carbItem = this.selectRandomItem(foodCategories.mainCarbs);
    if (carbItem) {
      selectedItems.push(carbItem);
      totalCalories += carbItem.calories;
      totalProtein += carbItem.protein;
    }

    const dalItem = this.selectRandomItem(foodCategories.dal);
    if (dalItem) {
      selectedItems.push(dalItem);
      totalCalories += dalItem.calories;
      totalProtein += dalItem.protein;
    }

    const vegetableItem = this.selectRandomItem(foodCategories.vegetables);
    if (vegetableItem) {
      selectedItems.push(vegetableItem);
      totalCalories += vegetableItem.calories;
      totalProtein += vegetableItem.protein;
    }

    const yogurtItem = this.selectRandomItem(foodCategories.dairy);
    if (yogurtItem) {
      selectedItems.push(yogurtItem);
      totalCalories += yogurtItem.calories;
      totalProtein += yogurtItem.protein;
    }
  } else if (ageGroup === 'preteen') { // 8-12 years
    // Chapati/rice + green vegetable/paneer + dal
    const carbItem = this.selectRandomItem(foodCategories.mainCarbs);
    if (carbItem) {
      selectedItems.push(carbItem);
      totalCalories += carbItem.calories;
      totalProtein += carbItem.protein;
    }

    // Green vegetable or paneer
    const proteinVegItem = Math.random() > 0.5 
      ? this.selectRandomItem(foodCategories.paneer)
      : this.selectRandomItem(foodCategories.vegetables);
    if (proteinVegItem) {
      selectedItems.push(proteinVegItem);
      totalCalories += proteinVegItem.calories;
      totalProtein += proteinVegItem.protein;
    }

    const dalItem = this.selectRandomItem(foodCategories.dal);
    if (dalItem) {
      selectedItems.push(dalItem);
      totalCalories += dalItem.calories;
      totalProtein += dalItem.protein;
    }
  }

  return this.createMealObject(selectedItems, totalCalories, totalProtein, '1:00 PM');
}

// Generate snacks for specific age groups
generateAgeSpecificSnacks(ageInMonths, foodCategories, ageGroup) {
  const selectedItems = [];
  let totalCalories = 0;
  let totalProtein = 0;

  if (ageGroup === 'toddler') { // 1-5 years
    // Fruits + milk
    const fruitItem = this.selectRandomItem(foodCategories.fruits);
    if (fruitItem) {
      selectedItems.push(fruitItem);
      totalCalories += fruitItem.calories;
      totalProtein += fruitItem.protein;
    }

    const milkItem = this.selectRandomItem(foodCategories.milk);
    if (milkItem) {
      selectedItems.push(milkItem);
      totalCalories += milkItem.calories;
      totalProtein += milkItem.protein;
    }
  } else if (ageGroup === 'school') { // 5-8 years
    // Fruits + milk + almonds + sprouts + occasionally junk food/shakes
    const fruitItem = this.selectRandomItem(foodCategories.fruits);
    if (fruitItem) {
      selectedItems.push(fruitItem);
      totalCalories += fruitItem.calories;
      totalProtein += fruitItem.protein;
    }

    const milkItem = this.selectRandomItem(foodCategories.milk);
    if (milkItem) {
      selectedItems.push(milkItem);
      totalCalories += milkItem.calories;
      totalProtein += milkItem.protein;
    }

    // Sometimes add nuts, sprouts, or healthy snacks
    if (Math.random() > 0.5) {
      const healthySnack = this.selectRandomItem([
        ...foodCategories.nuts,
        ...foodCategories.sprouts,
        ...foodCategories.healthySnacks
      ]);
      if (healthySnack) {
        selectedItems.push(healthySnack);
        totalCalories += healthySnack.calories;
        totalProtein += healthySnack.protein;
      }
    }

    // Occasionally add junk food or shakes (30% chance)
    if (Math.random() < 0.3) {
      const occasionalItem = this.selectRandomItem([
        ...foodCategories.junkFood,
        ...foodCategories.shakes
      ]);
      if (occasionalItem) {
        selectedItems.push(occasionalItem);
        totalCalories += occasionalItem.calories;
        totalProtein += occasionalItem.protein;
      }
    }
  } else if (ageGroup === 'preteen') { // 8-12 years
    // Roasted chana + fruits + similar to school age
    const roastedChanaItem = this.selectRandomItem(foodCategories.healthySnacks.filter(item => 
      item.name.toLowerCase().includes('chana') || item.name.toLowerCase().includes('roasted')
    ));
    if (roastedChanaItem) {
      selectedItems.push(roastedChanaItem);
      totalCalories += roastedChanaItem.calories;
      totalProtein += roastedChanaItem.protein;
    }

    const fruitItem = this.selectRandomItem(foodCategories.fruits);
    if (fruitItem) {
      selectedItems.push(fruitItem);
      totalCalories += fruitItem.calories;
      totalProtein += fruitItem.protein;
    }

    // Add other healthy snacks occasionally
    if (Math.random() > 0.4) {
      const healthySnack = this.selectRandomItem([
        ...foodCategories.nuts,
        ...foodCategories.sprouts
      ]);
      if (healthySnack) {
        selectedItems.push(healthySnack);
        totalCalories += healthySnack.calories;
        totalProtein += healthySnack.protein;
      }
    }
  }

  return this.createMealObject(selectedItems, totalCalories, totalProtein, '4:00 PM');
}

// Generate dinner for specific age groups
generateAgeSpecificDinner(age, foodCategories, ageGroup) {
  const selectedItems = [];
  let totalCalories = 0;
  let totalProtein = 0;

  if (ageGroup === 'toddler') { // 1-5 years
    // Chapati/rice + sabzi
    const carbItem = this.selectRandomItem(foodCategories.mainCarbs);
    if (carbItem) {
      selectedItems.push(carbItem);
      totalCalories += carbItem.calories;
      totalProtein += carbItem.protein;
    }

    const vegetableItem = this.selectRandomItem(foodCategories.vegetables);
    if (vegetableItem) {
      selectedItems.push(vegetableItem);
      totalCalories += vegetableItem.calories;
      totalProtein += vegetableItem.protein;
    }
  } else if (ageGroup === 'school') { // 5-8 years
    // Chapati/rice + sabzi + paneer
    const carbItem = this.selectRandomItem(foodCategories.mainCarbs);
    if (carbItem) {
      selectedItems.push(carbItem);
      totalCalories += carbItem.calories;
      totalProtein += carbItem.protein;
    }

    const vegetableItem = this.selectRandomItem(foodCategories.vegetables);
    if (vegetableItem) {
      selectedItems.push(vegetableItem);
      totalCalories += vegetableItem.calories;
      totalProtein += vegetableItem.protein;
    }

    const paneerItem = this.selectRandomItem(foodCategories.paneer);
    if (paneerItem) {
      selectedItems.push(paneerItem);
      totalCalories += paneerItem.calories;
      totalProtein += paneerItem.protein;
    }
  } else if (ageGroup === 'preteen') { // 8-12 years
    // Rice/chapati + dal + sabzi (no yogurt) + sometimes junk food
    const carbItem = this.selectRandomItem(foodCategories.mainCarbs);
    if (carbItem) {
      selectedItems.push(carbItem);
      totalCalories += carbItem.calories;
      totalProtein += carbItem.protein;
    }

    const dalItem = this.selectRandomItem(foodCategories.dal);
    if (dalItem) {
      selectedItems.push(dalItem);
      totalCalories += dalItem.calories;
      totalProtein += dalItem.protein;
    }

    const vegetableItem = this.selectRandomItem(foodCategories.vegetables);
    if (vegetableItem) {
      selectedItems.push(vegetableItem);
      totalCalories += vegetableItem.calories;
      totalProtein += vegetableItem.protein;
    }

    // Sometimes add junk food for 8-12 age group (20% chance)
    if (Math.random() < 0.2) {
      const junkItem = this.selectRandomItem(foodCategories.junkFood);
      if (junkItem) {
        selectedItems.push(junkItem);
        totalCalories += junkItem.calories;
        totalProtein += junkItem.protein;
      }
    }
  }

  return this.createMealObject(selectedItems, totalCalories, totalProtein, '7:00 PM');
}

// Helper method to select random item from array
selectRandomItem(itemArray) {
  if (!itemArray || itemArray.length === 0) return null;
  return itemArray[Math.floor(Math.random() * itemArray.length)];
}

// Helper method to select multiple unique items
selectMultipleItems(itemArray, count) {
  if (!itemArray || itemArray.length === 0) return [];
  
  const selectedItems = [];
  const availableItems = [...itemArray];
  
  for (let i = 0; i < count && availableItems.length > 0; i++) {
    const randomIndex = Math.floor(Math.random() * availableItems.length);
    selectedItems.push(availableItems[randomIndex]);
    availableItems.splice(randomIndex, 1);
  }
  
  return selectedItems;
}

// Helper method to create meal object
createMealObject(items, calories, protein, time) {
  return {
    items: items,
    totalCalories: Math.round(calories),
    totalProtein: Math.round(protein * 10) / 10,
    time: time
  };
}

// Generate default meal for ages not covered by specific rules
generateDefaultMeal(mealType, foodCategories) {
  const selectedItems = [];
  let totalCalories = 0;
  let totalProtein = 0;

  // Get all available foods
  const allFoods = Object.values(foodCategories).flat();
  
  // Select 2-3 random items
  const itemCount = Math.floor(Math.random() * 2) + 2;
  const selectedFoods = this.selectMultipleItems(allFoods, itemCount);
  
  selectedFoods.forEach(item => {
    selectedItems.push(item);
    totalCalories += item.calories;
    totalProtein += item.protein;
  });

  const mealTimes = {
    breakfast: '8:00 AM',
    lunch: '1:00 PM',
    snacks: '4:00 PM',
    dinner: '7:00 PM'
  };

  return this.createMealObject(selectedItems, totalCalories, totalProtein, mealTimes[mealType]);
}

  // Generate milk-only plan for infants under 6 months
  generateMilkOnlyPlan() {
    const milkFeeding = {
      name: this.childData.age < 0.25 ? "Breast Milk" : "Breast Milk/Formula",
      calories: 70,
      protein: 1.2,
      emoji: this.childData.age < 0.25 ? "🤱" : "🍼"
    };

    const feedingTimes = ['6:00 AM', '9:00 AM', '12:00 PM', '3:00 PM', '6:00 PM', '9:00 PM'];
    const dayPlan = {};

    // Create feeding schedule
    feedingTimes.forEach((time, index) => {
      const mealKey = `feeding${index + 1}`;
      dayPlan[mealKey] = {
        items: [milkFeeding],
        totalCalories: milkFeeding.calories,
        totalProtein: milkFeeding.protein,
        time: time
      };
    });

    dayPlan.dayTotals = {
      calories: milkFeeding.calories * feedingTimes.length,
      protein: milkFeeding.protein * feedingTimes.length
    };

    return dayPlan;
  }

  // Get meal calorie limits based on meal type and feeding stage
  getMealCalorieLimit(mealType, dailyTarget, feedingStage) {
    const limits = {
      'complementary-start': {
        breakfast: dailyTarget * 0.25,
        lunch: dailyTarget * 0.30,
        snacks: dailyTarget * 0.15,
        dinner: dailyTarget * 0.30
      },
      'family-foods': {
        breakfast: dailyTarget * 0.25,
        lunch: dailyTarget * 0.35,
        snacks: dailyTarget * 0.15,
        dinner: dailyTarget * 0.25
      },
      default: {
        breakfast: dailyTarget * 0.25,
        lunch: dailyTarget * 0.35,
        snacks: dailyTarget * 0.15,
        dinner: dailyTarget * 0.25
      }
    };

    const stageLimit = limits[feedingStage] || limits.default;
    return stageLimit[mealType] || dailyTarget * 0.25;
  }

  // Get meal times
  getMealTime(mealType) {
    const times = {
      breakfast: '8:00 AM',
      lunch: '1:00 PM',
      snacks: '4:00 PM',
      dinner: '7:00 PM'
    };
    return times[mealType];
  }

  // Get current week start date
  getCurrentWeekStart() {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day;
    const weekStart = new Date(now.setDate(diff));
    return weekStart.toISOString().split('T')[0];
  }

  // Render the weekly diet plan with enhanced styling
  renderWeekPlan(weekPlan) {
    const container = document.getElementById("diet-container");
    if (!container) return;

    container.innerHTML = "";

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    dayKeys.forEach((dayKey, index) => {
      const dayData = weekPlan[dayKey];
      if (!dayData) return;

      const dayBox = document.createElement("div");
      dayBox.className = "day-box";
      
      // Check if it's today
      const today = new Date().getDay();
      const isToday = index === today;
      
      // Handle different feeding patterns
      if (dayData.feeding1) {
        // Milk-only feeding schedule
        dayBox.innerHTML = this.renderMilkOnlyDay(days[index], dayData, isToday);
      } else {
        // Regular meal schedule
        dayBox.innerHTML = this.renderRegularDay(days[index], dayData, isToday);
      }
      
      container.appendChild(dayBox);
    });

    // Add summary statistics
    this.addWeekSummary(weekPlan);
  }

  // Render milk-only feeding day
  renderMilkOnlyDay(dayName, dayData, isToday) {
    const feedings = Object.keys(dayData).filter(key => key.startsWith('feeding'));
    
    return `
      <div class="day-header ${isToday ? 'today' : ''}">
        <h3>📅 ${dayName} ${isToday ? '(Today)' : ''}</h3>
        <div class="day-totals">
          <span class="total-calories">${dayData.dayTotals.calories} kcal</span>
          <span class="total-protein">${dayData.dayTotals.protein}g protein</span>
        </div>
        <div class="feeding-note">👶 Milk-only feeding schedule</div>
      </div>
      
      <div class="feedings-grid">
        ${feedings.map(feedingKey => {
          const feeding = dayData[feedingKey];
          return `
            <div class="feeding-time">
              <span class="time">${feeding.time}</span>
              <span class="feeding-item">${feeding.items[0].emoji} ${feeding.items[0].name}</span>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

 // Render regular meal day
  renderRegularDay(dayName, dayData, isToday) {
    return `
      <div class="day-header ${isToday ? 'today' : ''}">
        <h3>📅 ${dayName} ${isToday ? '(Today)' : ''}</h3>
        <div class="day-totals">
          <span class="total-calories">${dayData.dayTotals.calories} kcal</span>
          <span class="total-protein">${dayData.dayTotals.protein}g protein</span>
        </div>
      </div>
      
      <div class="meals-grid">
        <div class="meal-section">
          <h4>🌅 Breakfast - ${dayData.breakfast.time}</h4>
          <ul class="meal-items">
            ${dayData.breakfast.items.map(item => 
              `<li>${item.emoji} ${item.name} <span class="item-nutrition">${item.calories} kcal, ${item.protein}g protein</span></li>`
            ).join("")}
          </ul>
          <div class="meal-totals">${dayData.breakfast.totalCalories} kcal, ${dayData.breakfast.totalProtein}g protein</div>
        </div>

        <div class="meal-section">
          <h4>🌞 Lunch - ${dayData.lunch.time}</h4>
          <ul class="meal-items">
            ${dayData.lunch.items.map(item => 
              `<li>${item.emoji} ${item.name} <span class="item-nutrition">${item.calories} kcal, ${item.protein}g protein</span></li>`
            ).join("")}
          </ul>
          <div class="meal-totals">${dayData.lunch.totalCalories} kcal, ${dayData.lunch.totalProtein}g protein</div>
        </div>

        <div class="meal-section">
          <h4>🍎 Snacks - ${dayData.snacks.time}</h4>
          <ul class="meal-items">
            ${dayData.snacks.items.map(item => 
              `<li>${item.emoji} ${item.name} <span class="item-nutrition">${item.calories} kcal, ${item.protein}g protein</span></li>`
            ).join("")}
 </ul>
          <div class="meal-totals">${dayData.snacks.totalCalories} kcal, ${dayData.snacks.totalProtein}g protein</div>
        </div>

        <div class="meal-section">
          <h4>🌙 Dinner - ${dayData.dinner.time}</h4>  
          <ul class="meal-items">
            ${dayData.dinner.items.map(item => 
              `<li>${item.emoji} ${item.name} <span class="item-nutrition">${item.calories} kcal, ${item.protein}g protein</span></li>`
            ).join("")}
          </ul>
          <div class="meal-totals">${dayData.dinner.totalCalories} kcal, ${dayData.dinner.totalProtein}g protein</div>
        </div>
      </div>
    `;
  }

  // Add weekly summary statistics
  addWeekSummary(weekPlan) {
    const container = document.getElementById("diet-container");
    if (!container) return;

    const weekTotals = Object.values(weekPlan).reduce((totals, day) => {
      totals.calories += day.dayTotals.calories;
      totals.protein += day.dayTotals.protein;
      return totals;
    }, { calories: 0, protein: 0 });

    const avgDaily = {
      calories: Math.round(weekTotals.calories / 7),
      protein: Math.round(weekTotals.protein / 7)
    };

    // Get age-based recommended values for comparison
    const plan = agePlans.find(p => this.childData.age >= p.min && this.childData.age <= p.max);
    const recommendedCalories = plan ? plan.calories : 1200;
    const recommendedProtein = plan ? plan.protein : 18;

    const summaryBox = document.createElement("div");
    summaryBox.className = "week-summary";
    summaryBox.innerHTML = `
      <h3>📊 Weekly Summary & Nutritional Analysis</h3>
      <div class="summary-stats">
        <div class="stat-group">
          <h4>📈 Weekly Totals</h4>
          <div class="stat-item">
            <span class="stat-label">Total Calories:</span>
            <span class="stat-value">${weekTotals.calories} kcal</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Total Protein:</span>
            <span class="stat-value">${Math.round(weekTotals.protein * 10) / 10}g</span>
          </div>
        </div>

        <div class="stat-group">
          <h4>📊 Daily Averages</h4>
          <div class="stat-item">
            <span class="stat-label">Average Calories:</span>
            <span class="stat-value">${avgDaily.calories} kcal</span>
            <span class="stat-comparison ${avgDaily.calories >= recommendedCalories * 0.9 ? 'good' : 'needs-attention'}">(Target: ${recommendedCalories} kcal)</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Average Protein:</span>
            <span class="stat-value">${Math.round(avgDaily.protein * 10) / 10}g</span>
            <span class="stat-comparison ${avgDaily.protein >= recommendedProtein * 0.9 ? 'good' : 'needs-attention'}">(Target: ${recommendedProtein}g)</span>
          </div>
        </div>

        <div class="feeding-tips">
          <h4>💡 Feeding Tips for ${this.childData.name}</h4>
          ${this.generateFeedingTips()}
        </div>
      </div>
    `;

    container.appendChild(summaryBox);
  }

  // Generate age-appropriate feeding tips
  generateFeedingTips() {
    const age = this.childData.age;
    let tips = [];

    if (age < 0.5) {
      tips = [
        "🤱 Exclusive breastfeeding is recommended for the first 6 months",
        "🕐 Feed on demand, typically 8-12 times per day",
        "💧 No additional water needed if breastfeeding exclusively",
        "👩‍⚕️ Monitor weight gain and consult pediatrician regularly"
      ];
    } else if (age < 1) {
      tips = [
        "🥄 Start with single-ingredient purees and gradually increase texture",
        "🚫 Avoid honey, nuts, and choking hazards",
        "🥛 Continue breastfeeding or formula feeding alongside solids",
        "⏰ Offer new foods multiple times - it may take 8-10 exposures",
        "🧂 No added salt or sugar in baby's food"
      ];
    } else if (age < 2) {
      tips = [
        "👶 Encourage self-feeding with finger foods",
        "🥛 Transition to whole milk after 12 months",
        "🍽️ Offer variety and let them explore different textures",
        "💧 Introduce cup drinking gradually",
        "👨‍👩‍👧 Include baby in family meals when possible"
      ];
    } else if (age < 5) {
      tips = [
        "🍽️ Establish regular meal and snack times",
        "🥗 Encourage trying new foods without pressure",
        "🚰 Ensure adequate water intake throughout the day",
        "🏃‍♂️ Balance nutrition with physical activity",
        "👥 Make mealtimes social and enjoyable"
      ];
    } else {
      tips = [
        "🎯 Focus on balanced meals with all food groups",
        "🥤 Limit sugary drinks and processed foods",
        "🍎 Encourage healthy snacking habits",
        "🏫 Pack nutritious school lunches",
        "👨‍🍳 Involve child in meal planning and preparation"
      ];
    }

    return tips.map(tip => `<div class="tip-item">${tip}</div>`).join("");
  }

  // Setup event listeners
  setupEventListeners() {
    // Generate new plan button
    const generateBtn = document.getElementById('generateNewPlan');
    if (generateBtn) {
      generateBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to generate a new diet plan? This will replace the current plan.')) {
          this.generateWeeklyDietPlan();
        }
      });
    }

    // Back to dashboard button
    const backBtn = document.getElementById('backToDashboard');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        window.location.href = 'dashboard.html';
      });
    }

    // Print plan button
    const printBtn = document.getElementById('printPlan');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        this.printDietPlan();
      });
    }

    // Export plan button
    const exportBtn = document.getElementById('exportPlan');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        this.exportDietPlan();
      });
    }

    // Share plan button
    const shareBtn = document.getElementById('sharePlan');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => {
        this.shareDietPlan();
      });
    }
  }

  // Print diet plan with enhanced formatting
  printDietPlan() {
    const printWindow = window.open('', '_blank');
    const planHTML = this.generatePrintableHTML();
    
    printWindow.document.write(planHTML);
    printWindow.document.close();
    printWindow.print();
  }

  // Generate printable HTML
  generatePrintableHTML() {
    if (!this.weeklyDietPlan || !this.childData) return '';

    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Diet Plan for ${this.childData.name}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { text-align: center; margin-bottom: 30px; }
          .child-info { background: #f5f5f5; padding: 15px; margin-bottom: 20px; }
          .day-section { page-break-inside: avoid; margin-bottom: 20px; }
          .meals-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .meal-section { border: 1px solid #ddd; padding: 10px; }
          .meal-items { list-style: none; padding: 0; }
          .meal-items li { margin: 5px 0; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🍽️ Weekly Diet Plan</h1>
          <p>Generated on ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div class="child-info">
          <h3>Child Information</h3>
          <p><strong>Name:</strong> ${this.childData.name}</p>
          <p><strong>Age:</strong> ${this.childData.age} years</p>
          <p><strong>Diet Type:</strong> ${this.childData.diet}</p>
          <p><strong>Allergies:</strong> ${this.childData.allergies || 'None'}</p>
        </div>

        ${dayKeys.map((dayKey, index) => {
          const dayData = this.weeklyDietPlan[dayKey];
          if (!dayData) return '';

          return `
            <div class="day-section">
              <h2>${days[index]}</h2>
              <p><strong>Daily Totals:</strong> ${dayData.dayTotals.calories} kcal, ${dayData.dayTotals.protein}g protein</p>
              
              ${dayData.feeding1 ? this.generatePrintableMilkFeeding(dayData) : this.generatePrintableRegularMeals(dayData)}
            </div>
          `;
        }).join('')}
      </body>
      </html>
    `;
  }

  // Generate printable milk feeding schedule
  generatePrintableMilkFeeding(dayData) {
    const feedings = Object.keys(dayData).filter(key => key.startsWith('feeding'));
    
    return `
      <div class="feeding-schedule">
        <h4>Feeding Schedule</h4>
        ${feedings.map(feedingKey => {
          const feeding = dayData[feedingKey];
          return `<p>${feeding.time} - ${feeding.items[0].name}</p>`;
        }).join('')}
      </div>
    `;
  }

  // Generate printable regular meals
  generatePrintableRegularMeals(dayData) {
    return `
      <div class="meals-grid">
        <div class="meal-section">
          <h4>🌅 Breakfast (${dayData.breakfast.time})</h4>
          <ul class="meal-items">
            ${dayData.breakfast.items.map(item => `<li>${item.name} - ${item.calories} kcal</li>`).join('')}
          </ul>
        </div>
        
        <div class="meal-section">
          <h4>🌞 Lunch (${dayData.lunch.time})</h4>
          <ul class="meal-items">
            ${dayData.lunch.items.map(item => `<li>${item.name} - ${item.calories} kcal</li>`).join('')}
          </ul>
        </div>
        
        <div class="meal-section">
          <h4>🍎 Snacks (${dayData.snacks.time})</h4>
          <ul class="meal-items">
            ${dayData.snacks.items.map(item => `<li>${item.name} - ${item.calories} kcal</li>`).join('')}
          </ul>
        </div>
        
        <div class="meal-section">
          <h4>🌙 Dinner (${dayData.dinner.time})</h4>
          <ul class="meal-items">
            ${dayData.dinner.items.map(item => `<li>${item.name} - ${item.calories} kcal</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  }

  // Export diet plan as JSON
  exportDietPlan() {
    if (!this.weeklyDietPlan || !this.childData) {
      this.showNotification('❌ No diet plan available to export', 'error');
      return;
    }

    const exportData = {
      childInfo: {
        name: this.childData.name,
        age: this.childData.age,
        diet: this.childData.diet,
        allergies: this.childData.allergies
      },
      weeklyPlan: this.weeklyDietPlan,
      generatedDate: new Date().toISOString(),
      weekStart: this.getCurrentWeekStart()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `diet-plan-${this.childData.name}-${this.getCurrentWeekStart()}.json`;
    link.click();

    this.showNotification('✅ Diet plan exported successfully!');
  }

  // Share diet plan
  async shareDietPlan() {
    if (!navigator.share) {
      this.copyPlanToClipboard();
      return;
    }

    const shareText = this.generateShareText();
    
    try {
      await navigator.share({
        title: `Diet Plan for ${this.childData.name}`,
        text: shareText
      });
      this.showNotification('✅ Diet plan shared successfully!');
    } catch (error) {
      if (error.name !== 'AbortError') {
        this.copyPlanToClipboard();
      }
    }
  }

  // Generate text for sharing
  generateShareText() {
    const today = new Date();
    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = dayKeys[today.getDay()];
    const todayPlan = this.weeklyDietPlan[todayKey];

    if (!todayPlan) return '';

    let shareText = `🍽️ Today's Diet Plan for ${this.childData.name}\n\n`;
    
    if (todayPlan.feeding1) {
      shareText += "Feeding Schedule:\n";
      const feedings = Object.keys(todayPlan).filter(key => key.startsWith('feeding'));
      feedings.forEach(feedingKey => {
        const feeding = todayPlan[feedingKey];
        shareText += `${feeding.time}: ${feeding.items[0].name}\n`;
      });
    } else {
      shareText += `🌅 Breakfast (${todayPlan.breakfast.time}):\n`;
      todayPlan.breakfast.items.forEach(item => {
        shareText += `• ${item.name}\n`;
      });
      
      shareText += `\n🌞 Lunch (${todayPlan.lunch.time}):\n`;
      todayPlan.lunch.items.forEach(item => {
        shareText += `• ${item.name}\n`;
      });
      
      shareText += `\n🍎 Snacks (${todayPlan.snacks.time}):\n`;
      todayPlan.snacks.items.forEach(item => {
        shareText += `• ${item.name}\n`;
      });
      
      shareText += `\n🌙 Dinner (${todayPlan.dinner.time}):\n`;
      todayPlan.dinner.items.forEach(item => {
        shareText += `• ${item.name}\n`;
      });
    }

    shareText += `\n📊 Daily Total: ${todayPlan.dayTotals.calories} kcal, ${todayPlan.dayTotals.protein}g protein`;
    shareText += `\n\nGenerated by PediaSphere 👶`;

    return shareText;
  }

  // Copy plan to clipboard as fallback
  async copyPlanToClipboard() {
    const shareText = this.generateShareText();
    
    try {
      await navigator.clipboard.writeText(shareText);
      this.showNotification('✅ Diet plan copied to clipboard!');
    } catch (error) {
      this.showNotification('❌ Unable to copy to clipboard', 'error');
    }
  }

  // Utility functions for UI feedback
  showLoading(message) {
    const container = document.getElementById("diet-container");
    if (container) {
      container.innerHTML = `
        <div class="loading-message">
          <div class="spinner"></div>
          <p>${message}</p>
        </div>
      `;
    }
  }

  hideLoading() {
    // Loading will be hidden when renderWeekPlan is called
  }

  showError(message) {
    const container = document.getElementById("diet-container");
    if (container) {
      container.innerHTML = `<div class="error-message">${message}</div>`;
    }
  }

  showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#4CAF50' : '#f44336'};
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }

  // Method to get today's meals (can be called by dashboard)
  getTodaysMeals() {
    if (!this.weeklyDietPlan) return null;

    const today = new Date().getDay();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayKey = days[today];
    
    return this.weeklyDietPlan[todayKey] || null;
  }

  // Get nutrition progress for dashboard
  getNutritionProgress() {
    const todaysMeals = this.getTodaysMeals();
    if (!todaysMeals) return null;

    const plan = agePlans.find(p => this.childData.age >= p.min && this.childData.age <= p.max);
    if (!plan) return null;

    return {
      calories: {
        current: todaysMeals.dayTotals.calories,
        target: plan.calories,
        percentage: Math.round((todaysMeals.dayTotals.calories / plan.calories) * 100)
      },
      protein: {
        current: todaysMeals.dayTotals.protein,
        target: plan.protein,
        percentage: Math.round((todaysMeals.dayTotals.protein / plan.protein) * 100)
      }
    };
  }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new DietChartManager();
});

// Export for potential use by other modules
window.DietChartManager = DietChartManager;
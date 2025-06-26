// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

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
const db = getFirestore(app);

// 🎯 Age-based calorie and protein guide (same as diet generator)
const agePlans = [
    { min: 0, max: 0.5, calories: 600, protein: 9 },
    { min: 0.5, max: 1, calories: 850, protein: 11 },
    { min: 1, max: 2, calories: 1000, protein: 13 },
    { min: 2, max: 5, calories: 1200, protein: 18 },
    { min: 6, max: 7, calories: 1500, protein: 22 },
    { min: 8, max: 12, calories: 2000, protein: 35 }
];


// Dashboard functionality for PediaSphere
class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.childData = null;
        this.weeklyDietPlan = null;
        this.upcomingVaccinations=[];
        this.VaccinationProgress={};
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeChatbot();
        this.checkAuthStatus();
    }
    
    // Helper function to calculate total age in years (for diet plan matching)
calculateTotalAgeInYears(ageObj) {
    if (typeof ageObj === 'number') return ageObj; // backward compatibility
    return ageObj.years + (ageObj.months / 12) + (ageObj.days / 365);
}
calculateTotalAgeInMonths(ageObj) {
    if (typeof ageObj === 'number') return ageObj * 12; // backward compatibility
    if (!ageObj) return 0;
    return (ageObj.years * 12) + ageObj.months + (ageObj.days / 30);
}

// Helper function to format age display
formatAge(ageObj) {
    if (typeof ageObj === 'number') return `${ageObj} years old`; // backward compatibility
    
    let parts = [];
    if (ageObj.years > 0) parts.push(`${ageObj.years} year${ageObj.years !== 1 ? 's' : ''}`);
    if (ageObj.months > 0) parts.push(`${ageObj.months} month${ageObj.months !== 1 ? 's' : ''}`);
    if (ageObj.days > 0) parts.push(`${ageObj.days} day${ageObj.days !== 1 ? 's' : ''}`);
    
    return parts.length > 0 ? parts.join(', ') + ' old' : 'Not set';
}

    // Check authentication status
    checkAuthStatus() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.displayUserInfo(user);
                this.loadUserData();
            } else {
                // Redirect to login if no user
                window.location.href = 'login.html';
            }
        });
    }

    // Display user information
    displayUserInfo(user) {
        const userEmailElement = document.getElementById('userEmail');
        if (userEmailElement) {
            userEmailElement.textContent = user.email;
        }
    }

    // Load user and child data from Firestore
    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                if (userData.childData) {
                    this.childData = userData.childData;
                    this.displayChildProfile(userData.childData);
                    
                    // Load weekly diet plan and show today's meals
                    await this.loadWeeklyDietPlan();
                    this.displayTodaysMeals();
                    await this.loadVaccinationProgress();
                    } else {
                    this.showChildForm();
                }
            } else {
                // Create new user document
                await setDoc(userDocRef, {
                    email: this.currentUser.email,
                    createdAt: new Date(),
                    childData: null,
                    weeklyDietPlan: null,
                    currentWeek: null,
                    vaccinationShedule:{}
                });
                this.showChildForm();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
            this.showNotification('Error loading profile data', 'error');
        }
    }
    async loadVaccinationProgress() {
    if (!this.currentUser) return;

    try {
        const userDocRef = doc(db, 'users', this.currentUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            const userData = userDoc.data();
            this.vaccinationProgress = userData.vaccinationProgress || {};
            this.upcomingVaccinations=userData.upcomingVaccinations||[];
            this.displayUpcomingVaccinations();
        }
    } catch (error) {
        console.error('Error loading vaccination progress:', error);
    }
}

// Add this method after loadVaccinationProgress
displayUpcomingVaccinations() {
    if (!this.childData) return;

    const vaccinationContainer = document.getElementById('upcoming-vaccinations');
        if (!vaccinationContainer) return;

        // Clear the loading message
        vaccinationContainer.innerHTML = '';

        if (!this.childData) {
            vaccinationContainer.innerHTML = '<p>No child data available</p>';
            // Update vaccine count to 0
            const vaccineCountElement = document.getElementById('vaccine-count');
            if (vaccineCountElement) vaccineCountElement.textContent = '0';
            return;
        }

        // Calculate upcoming vaccinations based on child's age
        const upcomingVaccines = this.calculateUpcomingVaccinations();
        
        // Update the vaccine count in the stat card
        const vaccineCountElement = document.getElementById('vaccine-count');
        if (vaccineCountElement) {
            vaccineCountElement.textContent = upcomingVaccines.length;
        }
        
        if (upcomingVaccines.length === 0) {
            vaccinationContainer.innerHTML = '<p>No upcoming vaccinations scheduled</p>';
            return;
        }

        // Display the vaccinations
        upcomingVaccines.forEach(vaccine => {
            const vaccineElement = document.createElement('div');
            vaccineElement.className = 'vaccination-item';
            vaccineElement.innerHTML = `
                <div class="vaccine-info">
                    <h4>${vaccine.name}</h4>
                    <p>Due: ${vaccine.dueDate}</p>
                    <p>Age: ${vaccine.ageRequired}</p>
                </div>
            `;
            vaccinationContainer.appendChild(vaccineElement);
        });
    }
    

calculateUpcomingVaccinations() {
        if (!this.childData || !this.childData.age) return [];

        const childAge = this.calculateTotalAgeInMonths(this.childData.age);
        const upcomingVaccines = [];
const vaccinationSchedule = [
    { name: 'BCG', category: 'At Birth', ageInMonths: 0, ageWeeks: 0, description: 'Protects against: Tuberculosis', mandatory: true },
    { name: 'Hepatitis B (1st Dose)', category: 'At Birth', ageInMonths: 0, ageWeeks: 0, description: 'Protects against: Hepatitis B', mandatory: true },
    { name: 'OPV (Birth Dose)', category: 'At Birth', ageInMonths: 0, ageWeeks: 0, description: 'Protects against: Polio', mandatory: true },
    { name: 'Vitamin K', category: 'At Birth', ageInMonths: 0, ageWeeks: 0, description: 'Protects against: Bleeding Disorders', mandatory: true },

    // 6 Weeks vaccines
    { name: 'DPT (1st)', category: '6 Weeks', ageInMonths: 1.5, ageWeeks: 6, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV (1st)', category: '6 Weeks', ageInMonths: 1.5, ageWeeks: 6, description: 'Protects against: Polio', mandatory: true },
    { name: 'IPV (1st)', category: '6 Weeks', ageInMonths: 1.5, ageWeeks: 6, description: 'Protects against: Polio (Injectable)', mandatory: true },
    { name: 'Hepatitis B (2nd)', category: '6 Weeks', ageInMonths: 1.5, ageWeeks: 6, description: 'Protects against: Hepatitis B', mandatory: true },
    { name: 'Hib (1st)', category: '6 Weeks', ageInMonths: 1.5, ageWeeks: 6, description: 'Protects against: Haemophilus influenzae type b', mandatory: true },
    { name: 'PCV (1st)', category: '6 Weeks', ageInMonths: 1.5, ageWeeks: 6, description: 'Protects against: Pneumococcal Disease', mandatory: true },
    { name: 'Rotavirus (1st)', category: '6 Weeks', ageInMonths: 1.5, ageWeeks: 6, description: 'Protects against: Rotavirus Gastroenteritis', mandatory: true },

    // 10 Weeks vaccines
    { name: 'DPT (2nd)', category: '10 Weeks', ageInMonths: 2.5, ageWeeks: 10, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV (2nd)', category: '10 Weeks', ageInMonths: 2.5, ageWeeks: 10, description: 'Protects against: Polio', mandatory: true },
    { name: 'IPV (2nd)', category: '10 Weeks', ageInMonths: 2.5, ageWeeks: 10, description: 'Protects against: Polio (Injectable)', mandatory: true },
    { name: 'Hib (2nd)', category: '10 Weeks', ageInMonths: 2.5, ageWeeks: 10, description: 'Protects against: Haemophilus influenzae type b', mandatory: true },
    { name: 'PCV (2nd)', category: '10 Weeks', ageInMonths: 2.5, ageWeeks: 10, description: 'Protects against: Pneumococcal Disease', mandatory: true },
    { name: 'Rotavirus (2nd)', category: '10 Weeks', ageInMonths: 2.5, ageWeeks: 10, description: 'Protects against: Rotavirus Gastroenteritis', mandatory: true },

    // 14 Weeks vaccines
    { name: 'DPT (3rd)', category: '14 Weeks', ageInMonths: 3.5, ageWeeks: 14, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV (3rd)', category: '14 Weeks', ageInMonths: 3.5, ageWeeks: 14, description: 'Protects against: Polio', mandatory: true },
    { name: 'IPV (3rd)', category: '14 Weeks', ageInMonths: 3.5, ageWeeks: 14, description: 'Protects against: Polio (Injectable)', mandatory: true },
    { name: 'Hepatitis B (3rd)', category: '14 Weeks', ageInMonths: 3.5, ageWeeks: 14, description: 'Protects against: Hepatitis B', mandatory: true },
    { name: 'Hib (3rd)', category: '14 Weeks', ageInMonths: 3.5, ageWeeks: 14, description: 'Protects against: Haemophilus influenzae type b', mandatory: true },
    { name: 'PCV (3rd)', category: '14 Weeks', ageInMonths: 3.5, ageWeeks: 14, description: 'Protects against: Pneumococcal Disease', mandatory: true },
    { name: 'Rotavirus (3rd)', category: '14 Weeks', ageInMonths: 3.5, ageWeeks: 14, description: 'Protects against: Rotavirus Gastroenteritis', mandatory: true },

    // 6 Months vaccines
    { name: 'Influenza (Annual)', category: '6 Months', ageInMonths: 6, ageWeeks: 24, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'Hepatitis B (4th - if needed)', category: '6 Months', ageInMonths: 6, ageWeeks: 24, description: 'Protects against: Hepatitis B', mandatory: false },
    { name: 'Typhoid Conjugate Vaccine (TCV)', category: '6 Months', ageInMonths: 6, ageWeeks: 24, description: 'Protects against: Typhoid', mandatory: false },

    // 9 Months vaccines
    { name: 'Measles (1st)', category: '9 Months', ageInMonths: 9, ageWeeks: 36, description: 'Protects against: Measles', mandatory: true },
    { name: 'Japanese Encephalitis (1st)', category: '9 Months', ageInMonths: 9, ageWeeks: 36, description: 'Protects against: Japanese Encephalitis', mandatory: false },
    { name: 'Influenza (if due)', category: '9 Months', ageInMonths: 9, ageWeeks: 36, description: 'Protects against: Seasonal Flu', mandatory: false },

    // 12 Months vaccines
    { name: 'MMR (1st)', category: '12 Months', ageInMonths: 12, ageWeeks: 48, description: 'Protects against: Measles, Mumps, Rubella', mandatory: true },
    { name: 'Varicella (1st)', category: '12 Months', ageInMonths: 12, ageWeeks: 48, description: 'Protects against: Chickenpox', mandatory: false },
    { name: 'Hepatitis A (1st)', category: '12 Months', ageInMonths: 12, ageWeeks: 48, description: 'Protects against: Hepatitis A', mandatory: false },
    { name: 'PCV Booster', category: '12 Months', ageInMonths: 12, ageWeeks: 48, description: 'Protects against: Pneumococcal Disease', mandatory: true },
    { name: 'Japanese Encephalitis (2nd)', category: '12 Months', ageInMonths: 12, ageWeeks: 48, description: 'Protects against: Japanese Encephalitis', mandatory: false },
    { name: 'Typhoid Booster', category: '12 Months', ageInMonths: 12, ageWeeks: 48, description: 'Protects against: Typhoid', mandatory: false },

    // 15 Months vaccines
    { name: 'DPT Booster (1st)', category: '15 Months', ageInMonths: 15, ageWeeks: 60, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV Booster', category: '15 Months', ageInMonths: 15, ageWeeks: 60, description: 'Protects against: Polio', mandatory: true },
    { name: 'Hib Booster', category: '15 Months', ageInMonths: 15, ageWeeks: 60, description: 'Protects against: Haemophilus influenzae type b', mandatory: true },
    { name: 'Varicella (2nd)', category: '15 Months', ageInMonths: 15, ageWeeks: 60, description: 'Protects against: Chickenpox', mandatory: false },
    { name: 'MMR (2nd)', category: '15 Months', ageInMonths: 15, ageWeeks: 60, description: 'Protects against: Measles, Mumps, Rubella', mandatory: true },

    // 18 Months vaccines
    { name: 'Hepatitis A (2nd)', category: '18 Months', ageInMonths: 18, ageWeeks: 72, description: 'Protects against: Hepatitis A', mandatory: false },
    { name: 'Annual Influenza', category: '18 Months', ageInMonths: 18, ageWeeks: 72, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'Meningococcal A (MenA)', category: '18 Months', ageInMonths: 18, ageWeeks: 72, description: 'Protects against: Meningococcal A Disease', mandatory: false },

    // 2 Years vaccines
    { name: 'Typhoid Booster', category: '2 Years', ageInMonths: 24, ageWeeks: 96, description: 'Protects against: Typhoid', mandatory: false },
    { name: 'Meningococcal ACWY', category: '2 Years', ageInMonths: 24, ageWeeks: 96, description: 'Protects against: Meningococcal Disease', mandatory: false },
    { name: 'Annual Influenza', category: '2 Years', ageInMonths: 24, ageWeeks: 96, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'PCV Booster (if needed)', category: '2 Years', ageInMonths: 24, ageWeeks: 96, description: 'Protects against: Pneumococcal Disease', mandatory: false },

    // 4-6 Years vaccines
    { name: 'DPT Booster (2nd)', category: '4-6 Years', ageInMonths: 60, ageWeeks: 240, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV Booster (2nd)', category: '4-6 Years', ageInMonths: 60, ageWeeks: 240, description: 'Protects against: Polio', mandatory: true },
    { name: 'MMR Booster', category: '4-6 Years', ageInMonths: 60, ageWeeks: 240, description: 'Protects against: Measles, Mumps, Rubella', mandatory: true },
    { name: 'Varicella Booster', category: '4-6 Years', ageInMonths: 60, ageWeeks: 240, description: 'Protects against: Chickenpox', mandatory: false },
    { name: 'Annual Influenza', category: '4-6 Years', ageInMonths: 60, ageWeeks: 240, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'IPV Booster', category: '4-6 Years', ageInMonths: 60, ageWeeks: 240, description: 'Protects against: Polio', mandatory: true },

    // 9-14 Years vaccines
    { name: 'HPV (1st)', category: '9-14 Years', ageInMonths: 132, ageWeeks: 528, description: 'Protects against: Human Papillomavirus', mandatory: false },
    { name: 'Tdap', category: '9-14 Years', ageInMonths: 132, ageWeeks: 528, description: 'Protects against: Tetanus, Diphtheria, Pertussis', mandatory: true },
    { name: 'Meningococcal Booster', category: '9-14 Years', ageInMonths: 132, ageWeeks: 528, description: 'Protects against: Meningococcal Disease', mandatory: false },
    { name: 'Annual Influenza', category: '9-14 Years', ageInMonths: 132, ageWeeks: 528, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'Hepatitis B Booster (if needed)', category: '9-14 Years', ageInMonths: 132, ageWeeks: 528, description: 'Protects against: Hepatitis B', mandatory: false },

    // 11-12 Years vaccines
    { name: 'HPV (2nd)', category: '11-12 Years', ageInMonths: 144, ageWeeks: 576, description: 'Protects against: Human Papillomavirus', mandatory: false },
    { name: 'Tdap Booster', category: '11-12 Years', ageMonInths: 144, ageWeeks: 576, description: 'Protects against: Tetanus, Diphtheria, Pertussis', mandatory: true },
    { name: 'Meningococcal ACWY', category: '11-12 Years', ageInMonths: 144, ageWeeks: 576, description: 'Protects against: Meningococcal Disease', mandatory: false },
    { name: 'Annual Influenza', category: '11-12 Years', ageInMonths: 144, ageWeeks: 576, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'Typhoid Booster', category: '11-12 Years', ageInMonths: 144, ageWeeks: 576, description: 'Protects against: Typhoid', mandatory: false }
];
vaccinationSchedule.forEach(vaccine => {
        // Show vaccines that are due within the next 6 months and haven't passed yet
        if (childAge <= vaccine.ageInMonths && (vaccine.ageInMonths - childAge) <= 6) {
            const today = new Date();
            const dueDate = new Date(today);
            dueDate.setMonth(dueDate.getMonth() + (vaccine.ageInMonths - childAge));
            
            upcomingVaccines.push({
                ...vaccine,
                dueDate: dueDate.toLocaleDateString('en-IN', { 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                })
            });
        }
    });

    return upcomingVaccines.sort((a, b) => a.ageInMonths - b.ageInMonths);
}

    // ADD THIS NEW METHOD
    calculateChildAge(dateOfBirth) {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    let days = today.getDate() - birth.getDate();
    
    if (days < 0) {
        months--;
        const lastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        days += lastMonth.getDate();
    }
    
    if (months < 0) {
        years--;
        months += 12;
    }
    
    return {
        years,
        months,
        days,
        totalMonths: years * 12 + months
    };
}
    // Load weekly diet plan from Firebase
    async loadWeeklyDietPlan() {
        if (!this.currentUser || !this.childData) return;

        try {
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                const currentWeekStart = this.getCurrentWeekStart();
                
                // Check if we have a current diet plan for this week
                if (userData.weeklyDietPlan && userData.currentWeek === currentWeekStart) {
                    this.weeklyDietPlan = userData.weeklyDietPlan;
                } else {
                    // Generate new weekly plan
                    await this.generateWeeklyDietPlan();
                }
            }
        } catch (error) {
            console.error('Error loading weekly diet plan:', error);
        }
    }

    // Generate new weekly diet plan
    async generateWeeklyDietPlan() {
        if (!this.childData) return;

        // Find appropriate calorie plan based on child's age
        const totalAge= this.calculateTotalAgeInYears(this.childData.age);
        const plan = agePlans.find(p => totalAge >= p.min && totalAge <= p.max);
        if (!plan) return;

        // Food database (filtered based on diet preference and allergies)
        const foodItems = this.getFilteredFoodItems();
        
        const weeklyPlan = {};
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        
        days.forEach(day => {
            weeklyPlan[day] = this.generateDayPlan(plan.calories, plan.protein, foodItems);
        });

        // Save to Firebase
        try {
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            await updateDoc(userDocRef, {
                weeklyDietPlan: weeklyPlan,
                currentWeek: this.getCurrentWeekStart(),
                updatedAt: new Date()
            });

            this.weeklyDietPlan = weeklyPlan;
        } catch (error) {
            console.error('Error saving weekly diet plan:', error);
        }
    }

    // Get filtered food items based on diet preferences and allergies
    getFilteredFoodItems() {
        let baseItems = [
            { name: "Milk", calories: 150, protein: 8, emoji: "🥛", type: "vegetarian" },
            { name: "Boiled Egg", calories: 70, protein: 6, emoji: "🥚", type: "non-vegetarian" },
            { name: "Apple", calories: 95, protein: 0.5, emoji: "🍎", type: "vegan" },
            { name: "Banana", calories: 105, protein: 1, emoji: "🍌", type: "vegan" },
            { name: "Paneer", calories: 265, protein: 20, emoji: "🧀", type: "vegetarian" },
            { name: "Rice", calories: 200, protein: 4, emoji: "🍚", type: "vegan" },
            { name: "Lentils", calories: 230, protein: 18, emoji: "🍲", type: "vegan" },
            { name: "Carrot", calories: 25, protein: 0.6, emoji: "🥕", type: "vegan" },
            { name: "Chapati", calories: 120, protein: 3, emoji: "🌾", type: "vegan" },
            { name: "Chicken", calories: 250, protein: 27, emoji: "🐔", type: "non-vegetarian" },
            { name: "Oats", calories: 180, protein: 6, emoji: "🥣", type: "vegan" },
            { name: "Yogurt", calories: 100, protein: 10, emoji: "🥛", type: "vegetarian" }
        ];

        // Filter based on diet preference
        if (this.childData.diet === 'Vegetarian') {
            baseItems = baseItems.filter(item => item.type !== 'non-vegetarian');
        } else if (this.childData.diet === 'Vegan') {
            baseItems = baseItems.filter(item => item.type === 'vegan');
        }

        // Filter based on allergies (simplified logic)
        if (this.childData.allergies && this.childData.allergies.toLowerCase() !== 'none') {
            const allergies = this.childData.allergies.toLowerCase().split(',').map(a => a.trim());
            baseItems = baseItems.filter(item => 
                !allergies.some(allergy => item.name.toLowerCase().includes(allergy))
            );
        }

        return baseItems;
    }

    // Generate one day's meal plan
    generateDayPlan(calorieTarget, proteinTarget, foodItems) {
        const mealTypes = ['breakfast', 'lunch', 'snacks', 'dinner'];
        const dayPlan = {};
        
        mealTypes.forEach(mealType => {
            const mealCalories = Math.floor(calorieTarget / 4); // Distribute evenly
            const selectedItems = [];
            let totalCalories = 0;
            let totalProtein = 0;
            
            // Select 1-2 items per meal
            const itemCount = mealType === 'snacks' ? 1 : 2;
            
            for (let i = 0; i < itemCount && selectedItems.length < itemCount; i++) {
                const item = foodItems[Math.floor(Math.random() * foodItems.length)];
                if (!selectedItems.find(selected => selected.name === item.name)) {
                    selectedItems.push(item);
                    totalCalories += item.calories;
                    totalProtein += item.protein;
                }
            }
            
            dayPlan[mealType] = {
                items: selectedItems,
                totalCalories,
                totalProtein,
                time: this.getMealTime(mealType)
            };
        });
        
        return dayPlan;
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

    // Display today's meals on dashboard
    displayTodaysMeals() {
        if (!this.weeklyDietPlan) return;

        const today = new Date().getDay();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayKey = days[today];
        const todaysPlan = this.weeklyDietPlan[todayKey];

        if (!todaysPlan) return;

        // Update meal cards with today's plan
        this.updateMealCard('breakfast', todaysPlan.breakfast);
        this.updateMealCard('lunch', todaysPlan.lunch);
        this.updateMealCard('snacks', todaysPlan.snacks);
        this.updateMealCard('dinner', todaysPlan.dinner);

        // Update total calories
        const totalCalories = Object.values(todaysPlan).reduce((sum, meal) => sum + meal.totalCalories, 0);
        const caloriesElement = document.querySelector('.daily-calories strong');
        if (caloriesElement) {
            caloriesElement.textContent = `${totalCalories} kcal`;
        }
    }
    

    // Update individual meal card
    updateMealCard(mealType, mealData) {
        const mealCard = document.querySelector(`[data-meal="${mealType}"]`);
        if (!mealCard || !mealData) return;

        const mealDescription = mealCard.querySelector('.meal-description');
        const caloriesSpan = mealCard.querySelector('.calories');
        const timeSpan = mealCard.querySelector('.meal-time');

        if (mealDescription) {
            const itemNames = mealData.items.map(item => `${item.emoji} ${item.name}`).join(', ');
            mealDescription.textContent = itemNames;
        }

        if (caloriesSpan) {
            caloriesSpan.textContent = `${mealData.totalCalories} kcal`;
        }

        if (timeSpan) {
            timeSpan.textContent = mealData.time;
        }
    }

    // Save child data to Firestore
    async saveChildDataToFirebase(childData) {
        if (!this.currentUser) return;

        try {
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            await updateDoc(userDocRef, {
                childData: childData,
                updatedAt: new Date()
            });
            console.log('Child data saved to Firebase');
            return true;
        } catch (error) {
            console.error('Error saving child data:', error);
            this.showNotification('Error saving profile data', 'error');
            return false;
        }
    }

    // Display child profile information
    displayChildProfile(childData) {
        const elements = {
            'child-name': childData.name || 'Not set',
            'child-age': childData.age ? this.formatAge(childData.age) : 'Not set',
            'child-gender': childData.gender || 'Not set',
            'child-allergies': childData.allergies || 'None',
            'child-diet': childData.diet || 'Not set',
            'child-country': childData.country || 'Not set'
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    }

    // Setup all event listeners
    setupEventListeners() {
        // Dark mode toggle
        const darkModeToggle = document.getElementById('darkModeToggle');
        if (darkModeToggle) {
            darkModeToggle.addEventListener('click', this.toggleDarkMode.bind(this));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout.bind(this));
        }

        // Edit profile button
        const editProfileBtn = document.getElementById('editProfileBtn');
        if (editProfileBtn) {
            editProfileBtn.addEventListener('click', this.showChildForm.bind(this));
        }

        // Modal controls
        this.setupModalControls();

        // Meal checkboxes
        this.setupMealTracking();

        // Recipe buttons
        this.setupRecipeButtons();
    }

    // Handle logout
    async handleLogout() {
        try {
            await signOut(auth);
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Error signing out:', error);
            this.showNotification('Error signing out', 'error');
        }
    }

    // Toggle dark mode
    toggleDarkMode() {
        const body = document.body;
        const isDark = body.classList.contains('dark');
        
        if (isDark) {
            body.classList.remove('dark');
            body.classList.add('light');
        } else {
            body.classList.remove('light');
            body.classList.add('dark');
        }

        // Update icon
        const icon = document.querySelector('#darkModeToggle i');
        if (icon) {
            icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        }
    }

    // Setup modal controls
    setupModalControls() {
        const modal = document.getElementById('childFormModal');
        const closeBtn = document.getElementById('closeFormBtn');
        const cancelBtn = document.getElementById('cancelFormBtn');
        const saveBtn = document.getElementById('saveChildBtn');

        if (closeBtn) {
            closeBtn.addEventListener('click', this.hideChildForm.bind(this));
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.hideChildForm.bind(this));
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', this.saveChildProfile.bind(this));
        }

        // Close modal when clicking outside
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideChildForm();
                }
            });
        }
    }

    // Show child form modal
    showChildForm() {
        const modal = document.getElementById('childFormModal');
        if (modal) {
            modal.style.display = 'flex';
            
            // Pre-fill form if editing
            if (this.childData) {
                this.populateChildForm(this.childData);
            }
        }
    }

    // Hide child form modal
    hideChildForm() {
        const modal = document.getElementById('childFormModal');
        if (modal) {
            modal.style.display = 'none';
            this.clearChildForm();
        }
    }

    // Populate child form with existing data
    populateChildForm(data) {
        const fields = {
            'childName': data.name,
            'childAgeYears': data.age?.years || '',
'childAgeMonths': data.age?.months || '',
'childAgeDays': data.age?.days || '',
            'childGender': data.gender,
            'childCountry': data.country,
            'childAllergies': data.allergies,
            'childDiet': data.diet
        };

        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element && value) {
                element.value = value;
            }
        });
    }

    // Clear child form
    clearChildForm() {
        const form = document.getElementById('childForm');
        if (form) {
            form.reset();
        }
    }

    // Save child profile
    async saveChildProfile() {
        const formData = {
            name: document.getElementById('childName')?.value || '',
           age: {
    years: parseInt(document.getElementById('childAgeYears')?.value) || 0,
    months: parseInt(document.getElementById('childAgeMonths')?.value) || 0,
    days: parseInt(document.getElementById('childAgeDays')?.value) || 0
},
            gender: document.getElementById('childGender')?.value || '',
            country: document.getElementById('childCountry')?.value || '',
            allergies: document.getElementById('childAllergies')?.value || 'None',
            diet: document.getElementById('childDiet')?.value || ''
        };

        // Validate required fields
        if (!formData.name || !formData.age.months || !formData.gender || !formData.country || !formData.diet) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }

        // Save to Firebase
        const success = await this.saveChildDataToFirebase(formData);
        
        if (success) {
            this.childData = formData;
            this.displayChildProfile(formData);
            
            // Generate new weekly diet plan when child data changes
            await this.generateWeeklyDietPlan();
            this.displayTodaysMeals();
            await this.loadVaccinationProgress();
            this.hideChildForm();
            this.showNotification('Profile saved successfully! 🎉');
        }
    }

    // Setup meal tracking functionality
    setupMealTracking() {
        const checkboxes = document.querySelectorAll('.meal-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', this.handleMealComplete.bind(this));
        });
    }

    // Setup recipe buttons
    setupRecipeButtons() {
        window.viewRecipe = this.viewRecipe.bind(this);
    }

    // Handle meal completion
    handleMealComplete(event) {
        const checkbox = event.target;
        const mealCard = checkbox.closest('.meal-card');
        
        if (checkbox.checked) {
            mealCard.classList.add('completed');
            this.showNotification('Meal marked as completed! 🎉');
        } else {
            mealCard.classList.remove('completed');
        }

        this.updateMealProgress();
    }

    // Update meal progress
    updateMealProgress() {
        const completedMeals = document.querySelectorAll('.meal-checkbox:checked').length;
        const totalMeals = document.querySelectorAll('.meal-checkbox').length;
        
        // Update stats card
        const statCard = document.querySelector('.stat-card h3');
        if (statCard) {
            statCard.textContent = completedMeals;
        }
    }

    // View recipe function - now uses actual meal data
    viewRecipe(mealType) {
        if (!this.weeklyDietPlan) {
            this.showNotification('Diet plan not loaded yet', 'error');
            return;
        }

        const today = new Date().getDay();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const todayKey = days[today];
        const todaysPlan = this.weeklyDietPlan[todayKey];
        const mealData = todaysPlan[mealType.toLowerCase()];

        if (mealData) {
            this.showRecipeModal(mealType, mealData);
        }
    }

    // Show recipe modal with actual meal data
    showRecipeModal(mealType, mealData) {
        const modalHtml = `
            <div class="recipe-modal" id="recipeModal">
                <div class="recipe-content">
                    <div class="recipe-header">
                        <h3>${mealType} - ${mealData.items.map(item => item.emoji).join(' ')}</h3>
                        <button class="close-btn" onclick="closeRecipeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="recipe-body">
                        <div class="ingredients">
                            <h4>Items:</h4>
                            <ul>
                                ${mealData.items.map(item => 
                                    `<li>${item.emoji} ${item.name} - ${item.calories} kcal, ${item.protein}g protein</li>`
                                ).join('')}
                            </ul>
                        </div>
                        <div class="meal-info">
                            <h4>Meal Information:</h4>
                            <p><strong>Time:</strong> ${mealData.time}</p>
                            <p><strong>Total Calories:</strong> ${mealData.totalCalories} kcal</p>
                            <p><strong>Total Protein:</strong> ${mealData.totalProtein}g</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // Add close function to window
        window.closeRecipeModal = () => {
            const modal = document.getElementById('recipeModal');
            if (modal) {
                modal.remove();
            }
        };
    }

    // Show notification
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new DashboardManager();
});

// Add some CSS for notifications and recipe modal
const additionalStyles = `
    <style>
        .notification {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
        }

        .notification.success {
            background: #4CAF50;
        }

        .notification.error {
            background: #f44336;
        }

        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        .recipe-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1000;
        }

        .recipe-content {
            background: white;
            border-radius: 12px;
            padding: 0;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }

        .recipe-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px;
            border-bottom: 1px solid #eee;
        }

        .recipe-body {
            padding: 20px;
        }

        .recipe-body h4 {
            margin-bottom: 10px;
            color: #333;
        }

        .recipe-body ul, .recipe-body ol {
            margin-bottom: 20px;
        }

        .recipe-body li {
            margin-bottom: 5px;
            line-height: 1.5;
        }

        .chatbot-container.active {
            display: block;
        }

        .meal-card.completed {
            opacity: 0.7;
            background: #f0f8f0;
        }

        .meal-card.completed .meal-header h3 {
            text-decoration: line-through;
        }
        vaccination-schedule {
    display: flex;
    flex-direction: column;
    gap: 12px;
    max-height: 400px;
    overflow-y: auto;
}

.vaccination-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: #f8f9fa;
    border-radius: 12px;
    border-left: 4px solid #e9ecef;
    transition: all 0.3s ease;
}

.vaccination-item:hover {
    background: #e9ecef;
    transform: translateY(-2px);
}

.vaccination-item.due-soon {
    border-left-color: #ffc107;
    background: #fff8e1;
}

.vaccination-item.overdue {
    border-left-color: #dc3545;
    background: #ffebee;
}

.vaccination-item.upcoming {
    border-left-color: #28a745;
    background: #e8f5e8;
}

.vaccine-info h4 {
    margin: 0 0 4px 0;
    color: #333;
    font-size: 16px;
    font-weight: 600;
}

.vaccine-info p {
    margin: 0 0 8px 0;
    color: #666;
    font-size: 14px;
    line-height: 1.4;
}

.due-date {
    font-size: 12px;
    color: #888;
    font-weight: 500;
}

.vaccine-status {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
}

.status-badge {
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
}

.status-badge.due-soon {
    background: #ffc107;
    color: #000;
}

.status-badge.overdue {
    background: #dc3545;
    color: white;
}

.status-badge.upcoming {
    background: #28a745;
    color: white;
}

.vaccine-status small {
    font-size: 11px;
    color: #666;
    text-align: right;
}

.loading-message {
    text-align: center;
    color: #666;
    padding: 20px;
    font-style: italic;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.section-header h2 {
    margin: 0;
    color: #333;
}

.btn-secondary {
    background: #6c757d;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.3s;
}

.btn-secondary:hover {
    background: #5a6268;
}

@media (max-width: 768px) {
    .section-header {
        flex-direction: column;
        gap: 10px;
        align-items: flex-start;
    }
    
    .vaccination-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }
    
    .vaccine-status {
        align-items: flex-start;
        width: 100%;
    }
}    
    </style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);
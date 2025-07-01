// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js';

// Firebase configuration (same as dashboard)
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

// Comprehensive vaccination schedule data
const vaccinationSchedule = [
    // Birth vaccines
    { name: 'BCG', category: 'At Birth', ageMonths: 0, ageWeeks: 0, description: 'Protects against: Tuberculosis', mandatory: true },
    { name: 'Hepatitis B (1st Dose)', category: 'At Birth', ageMonths: 0, ageWeeks: 0, description: 'Protects against: Hepatitis B', mandatory: true },
    { name: 'OPV (Birth Dose)', category: 'At Birth', ageMonths: 0, ageWeeks: 0, description: 'Protects against: Polio', mandatory: true },
    { name: 'Vitamin K', category: 'At Birth', ageMonths: 0, ageWeeks: 0, description: 'Protects against: Bleeding Disorders', mandatory: true },

    // 6 Weeks vaccines
    { name: 'DPT (1st)', category: '6 Weeks', ageMonths: 1.5, ageWeeks: 6, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV (1st)', category: '6 Weeks', ageMonths: 1.5, ageWeeks: 6, description: 'Protects against: Polio', mandatory: true },
    { name: 'IPV (1st)', category: '6 Weeks', ageMonths: 1.5, ageWeeks: 6, description: 'Protects against: Polio (Injectable)', mandatory: true },
    { name: 'Hepatitis B (2nd)', category: '6 Weeks', ageMonths: 1.5, ageWeeks: 6, description: 'Protects against: Hepatitis B', mandatory: true },
    { name: 'Hib (1st)', category: '6 Weeks', ageMonths: 1.5, ageWeeks: 6, description: 'Protects against: Haemophilus influenzae type b', mandatory: true },
    { name: 'PCV (1st)', category: '6 Weeks', ageMonths: 1.5, ageWeeks: 6, description: 'Protects against: Pneumococcal Disease', mandatory: true },
    { name: 'Rotavirus (1st)', category: '6 Weeks', ageMonths: 1.5, ageWeeks: 6, description: 'Protects against: Rotavirus Gastroenteritis', mandatory: true },

    // 10 Weeks vaccines
    { name: 'DPT (2nd)', category: '10 Weeks', ageMonths: 2.5, ageWeeks: 10, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV (2nd)', category: '10 Weeks', ageMonths: 2.5, ageWeeks: 10, description: 'Protects against: Polio', mandatory: true },
    { name: 'IPV (2nd)', category: '10 Weeks', ageMonths: 2.5, ageWeeks: 10, description: 'Protects against: Polio (Injectable)', mandatory: true },
    { name: 'Hib (2nd)', category: '10 Weeks', ageMonths: 2.5, ageWeeks: 10, description: 'Protects against: Haemophilus influenzae type b', mandatory: true },
    { name: 'PCV (2nd)', category: '10 Weeks', ageMonths: 2.5, ageWeeks: 10, description: 'Protects against: Pneumococcal Disease', mandatory: true },
    { name: 'Rotavirus (2nd)', category: '10 Weeks', ageMonths: 2.5, ageWeeks: 10, description: 'Protects against: Rotavirus Gastroenteritis', mandatory: true },

    // 14 Weeks vaccines
    { name: 'DPT (3rd)', category: '14 Weeks', ageMonths: 3.5, ageWeeks: 14, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV (3rd)', category: '14 Weeks', ageMonths: 3.5, ageWeeks: 14, description: 'Protects against: Polio', mandatory: true },
    { name: 'IPV (3rd)', category: '14 Weeks', ageMonths: 3.5, ageWeeks: 14, description: 'Protects against: Polio (Injectable)', mandatory: true },
    { name: 'Hepatitis B (3rd)', category: '14 Weeks', ageMonths: 3.5, ageWeeks: 14, description: 'Protects against: Hepatitis B', mandatory: true },
    { name: 'Hib (3rd)', category: '14 Weeks', ageMonths: 3.5, ageWeeks: 14, description: 'Protects against: Haemophilus influenzae type b', mandatory: true },
    { name: 'PCV (3rd)', category: '14 Weeks', ageMonths: 3.5, ageWeeks: 14, description: 'Protects against: Pneumococcal Disease', mandatory: true },
    { name: 'Rotavirus (3rd)', category: '14 Weeks', ageMonths: 3.5, ageWeeks: 14, description: 'Protects against: Rotavirus Gastroenteritis', mandatory: true },

    // 6 Months vaccines
    { name: 'Influenza (Annual)', category: '6 Months', ageMonths: 6, ageWeeks: 24, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'Hepatitis B (4th - if needed)', category: '6 Months', ageMonths: 6, ageWeeks: 24, description: 'Protects against: Hepatitis B', mandatory: false },
    { name: 'Typhoid Conjugate Vaccine (TCV)', category: '6 Months', ageMonths: 6, ageWeeks: 24, description: 'Protects against: Typhoid', mandatory: false },

    // 9 Months vaccines
    { name: 'Measles (1st)', category: '9 Months', ageMonths: 9, ageWeeks: 36, description: 'Protects against: Measles', mandatory: true },
    { name: 'Japanese Encephalitis (1st)', category: '9 Months', ageMonths: 9, ageWeeks: 36, description: 'Protects against: Japanese Encephalitis', mandatory: false },
    { name: 'Influenza (if due)', category: '9 Months', ageMonths: 9, ageWeeks: 36, description: 'Protects against: Seasonal Flu', mandatory: false },

    // 12 Months vaccines
    { name: 'MMR (1st)', category: '12 Months', ageMonths: 12, ageWeeks: 48, description: 'Protects against: Measles, Mumps, Rubella', mandatory: true },
    { name: 'Varicella (1st)', category: '12 Months', ageMonths: 12, ageWeeks: 48, description: 'Protects against: Chickenpox', mandatory: false },
    { name: 'Hepatitis A (1st)', category: '12 Months', ageMonths: 12, ageWeeks: 48, description: 'Protects against: Hepatitis A', mandatory: false },
    { name: 'PCV Booster', category: '12 Months', ageMonths: 12, ageWeeks: 48, description: 'Protects against: Pneumococcal Disease', mandatory: true },
    { name: 'Japanese Encephalitis (2nd)', category: '12 Months', ageMonths: 12, ageWeeks: 48, description: 'Protects against: Japanese Encephalitis', mandatory: false },
    { name: 'Typhoid Booster', category: '12 Months', ageMonths: 12, ageWeeks: 48, description: 'Protects against: Typhoid', mandatory: false },

    // 15 Months vaccines
    { name: 'DPT Booster (1st)', category: '15 Months', ageMonths: 15, ageWeeks: 60, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV Booster', category: '15 Months', ageMonths: 15, ageWeeks: 60, description: 'Protects against: Polio', mandatory: true },
    { name: 'Hib Booster', category: '15 Months', ageMonths: 15, ageWeeks: 60, description: 'Protects against: Haemophilus influenzae type b', mandatory: true },
    { name: 'Varicella (2nd)', category: '15 Months', ageMonths: 15, ageWeeks: 60, description: 'Protects against: Chickenpox', mandatory: false },
    { name: 'MMR (2nd)', category: '15 Months', ageMonths: 15, ageWeeks: 60, description: 'Protects against: Measles, Mumps, Rubella', mandatory: true },

    // 18 Months vaccines
    { name: 'Hepatitis A (2nd)', category: '18 Months', ageMonths: 18, ageWeeks: 72, description: 'Protects against: Hepatitis A', mandatory: false },
    { name: 'Annual Influenza', category: '18 Months', ageMonths: 18, ageWeeks: 72, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'Meningococcal A (MenA)', category: '18 Months', ageMonths: 18, ageWeeks: 72, description: 'Protects against: Meningococcal A Disease', mandatory: false },

    // 2 Years vaccines
    { name: 'Typhoid Booster', category: '2 Years', ageMonths: 24, ageWeeks: 96, description: 'Protects against: Typhoid', mandatory: false },
    { name: 'Meningococcal ACWY', category: '2 Years', ageMonths: 24, ageWeeks: 96, description: 'Protects against: Meningococcal Disease', mandatory: false },
    { name: 'Annual Influenza', category: '2 Years', ageMonths: 24, ageWeeks: 96, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'PCV Booster (if needed)', category: '2 Years', ageMonths: 24, ageWeeks: 96, description: 'Protects against: Pneumococcal Disease', mandatory: false },

    // 4-6 Years vaccines
    { name: 'DPT Booster (2nd)', category: '4-6 Years', ageMonths: 60, ageWeeks: 240, description: 'Protects against: Diphtheria, Tetanus, Pertussis', mandatory: true },
    { name: 'OPV Booster (2nd)', category: '4-6 Years', ageMonths: 60, ageWeeks: 240, description: 'Protects against: Polio', mandatory: true },
    { name: 'MMR Booster', category: '4-6 Years', ageMonths: 60, ageWeeks: 240, description: 'Protects against: Measles, Mumps, Rubella', mandatory: true },
    { name: 'Varicella Booster', category: '4-6 Years', ageMonths: 60, ageWeeks: 240, description: 'Protects against: Chickenpox', mandatory: false },
    { name: 'Annual Influenza', category: '4-6 Years', ageMonths: 60, ageWeeks: 240, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'IPV Booster', category: '4-6 Years', ageMonths: 60, ageWeeks: 240, description: 'Protects against: Polio', mandatory: true },

    // 9-14 Years vaccines
    { name: 'HPV (1st)', category: '9-14 Years', ageMonths: 132, ageWeeks: 528, description: 'Protects against: Human Papillomavirus', mandatory: false },
    { name: 'Tdap', category: '9-14 Years', ageMonths: 132, ageWeeks: 528, description: 'Protects against: Tetanus, Diphtheria, Pertussis', mandatory: true },
    { name: 'Meningococcal Booster', category: '9-14 Years', ageMonths: 132, ageWeeks: 528, description: 'Protects against: Meningococcal Disease', mandatory: false },
    { name: 'Annual Influenza', category: '9-14 Years', ageMonths: 132, ageWeeks: 528, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'Hepatitis B Booster (if needed)', category: '9-14 Years', ageMonths: 132, ageWeeks: 528, description: 'Protects against: Hepatitis B', mandatory: false },

    // 11-12 Years vaccines
    { name: 'HPV (2nd)', category: '11-12 Years', ageMonths: 144, ageWeeks: 576, description: 'Protects against: Human Papillomavirus', mandatory: false },
    { name: 'Tdap Booster', category: '11-12 Years', ageMonths: 144, ageWeeks: 576, description: 'Protects against: Tetanus, Diphtheria, Pertussis', mandatory: true },
    { name: 'Meningococcal ACWY', category: '11-12 Years', ageMonths: 144, ageWeeks: 576, description: 'Protects against: Meningococcal Disease', mandatory: false },
    { name: 'Annual Influenza', category: '11-12 Years', ageMonths: 144, ageWeeks: 576, description: 'Protects against: Seasonal Flu', mandatory: false },
    { name: 'Typhoid Booster', category: '11-12 Years', ageMonths: 144, ageWeeks: 576, description: 'Protects against: Typhoid', mandatory: false }
];

class ImmunisationManager {
    constructor() {
        this.currentUser = null;
        this.childData = null;
        this.vaccinationProgress = {};
        this.init();
    }

    init() {
        this.checkAuthStatus();
        this.setupEventListeners();
    }

    // Check authentication status
    checkAuthStatus() {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this.currentUser = user;
                this.loadUserData();
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    // Load user data from Firebase
    async loadUserData() {
        if (!this.currentUser) return;

        try {
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = userDoc.data();
                this.childData = userData.childData;
                this.vaccinationProgress = userData.vaccinationProgress || {};
                
                if (this.childData) {
                    this.displayChildInfo();
                    this.updateVaccinationStatus();
                    this.updateProgressStats();
                    this.attachCheckboxListeners();
                } else {
                    this.showNoChildDataMessage();
                }
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    // Display child information
    displayChildInfo() {
        if (!this.childData) return;

        const childName = document.getElementById('childName');
        const childAge = document.getElementById('childAge');
        const childGender = document.getElementById('childGender');
        const childDOB = document.getElementById('childDOB');

        if (childName) childName.textContent = this.childData.name || 'Not set';
        if (childAge) childAge.textContent = this.formatAge(this.childData.age) || 'Not set';
        if (childGender) childGender.textContent = this.childData.gender || 'Not set';
        if (childDOB) childDOB.textContent = this.childData.dateOfBirth || 'Not set';
    }

    // Format age display
    formatAge(ageObj) {
        if (typeof ageObj === 'number') return `${ageObj} years old`;
        if (!ageObj) return 'Not set';
        
        let parts = [];
        if (ageObj.years > 0) parts.push(`${ageObj.years} year${ageObj.years !== 1 ? 's' : ''}`);
        if (ageObj.months > 0) parts.push(`${ageObj.months} month${ageObj.months !== 1 ? 's' : ''}`);
        if (ageObj.days > 0) parts.push(`${ageObj.days} day${ageObj.days !== 1 ? 's' : ''}`);
        
        return parts.length > 0 ? parts.join(', ') + ' old' : 'Not set';
    }

    // Calculate total age in months for comparison - FIXED VERSION
    calculateTotalAgeInMonths(ageObj) {
        if (typeof ageObj === 'number') return ageObj * 12;
        if (!ageObj) return 0;
        
        let totalMonths = 0;
        
        // Add years as months
        if (ageObj.years) totalMonths += ageObj.years * 12;
        
        // Add months
        if (ageObj.months) totalMonths += ageObj.months;
        
        // Add days as fraction of month (more precise calculation)
        if (ageObj.days) totalMonths += ageObj.days / 30.44; // Average days per month
        
        return totalMonths;
    }

    // Calculate precise age from date of birth
    calculateAgeFromDOB(dateOfBirth) {
        if (!dateOfBirth) return 0;
        
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        
        let ageMonths = (today.getFullYear() - birthDate.getFullYear()) * 12;
        ageMonths += today.getMonth() - birthDate.getMonth();
        
        // Adjust for days
        if (today.getDate() < birthDate.getDate()) {
            ageMonths--;
        }
        
        return Math.max(0, ageMonths);
    }

    // Get age group status based on child's age - FIXED VERSION
    getAgeGroupStatus(groupAgeMonths, childAgeInMonths, completedCount, totalCount) {
        // If all vaccines in the group are completed
        if (completedCount === totalCount && totalCount > 0) {
            return 'completed';
        }
        
        // Grace period for vaccines (2 months before and after)
        const gracePeriodBefore = 1; // 1 month before
        const gracePeriodAfter = 2; // 2 months after
        
        // Calculate age difference
        const ageDifference = childAgeInMonths - groupAgeMonths;
        
        // Determine status based on age comparison
        if (ageDifference >= -gracePeriodBefore && ageDifference <= gracePeriodAfter) {
            // Child is within the appropriate age range for these vaccines
            if (completedCount === 0) {
                return 'upcoming';
            } else if (completedCount < totalCount) {
                return 'upcoming'; // Partially completed but still in range
            }
        } else if (ageDifference > gracePeriodAfter) {
            // Child is older than the recommended age + grace period
            if (completedCount < totalCount) {
                return 'overdue';
            }
        } else if (ageDifference < -gracePeriodBefore) {
            // Child is younger than the recommended age - grace period
            return 'future';
        }
        
        return 'future';
    }

    // Update vaccination status based on child's age and progress - FIXED VERSION
    updateVaccinationStatus() {
        if (!this.childData) return;

        // Calculate child's age in months more accurately
        let childAgeInMonths;
        if (this.childData.dateOfBirth) {
            childAgeInMonths = this.calculateAgeFromDOB(this.childData.dateOfBirth);
        } else {
            childAgeInMonths = this.calculateTotalAgeInMonths(this.childData.age);
        }

        console.log('Child age in months:', childAgeInMonths); // Debug log

        const ageGroups = document.querySelectorAll('.age-group');

        ageGroups.forEach(ageGroup => {
            const ageTitle = ageGroup.querySelector('.age-title').textContent.trim();
            const vaccines = ageGroup.querySelectorAll('.vaccine-item');
            const statusBadge = ageGroup.querySelector('.status-badge');
            
            // Get age group vaccines from schedule
            const groupVaccines = vaccinationSchedule.filter(v => v.category === ageTitle);
            const groupAgeMonths = groupVaccines.length > 0 ? groupVaccines[0].ageMonths : 0;
            
            console.log(`Processing age group: ${ageTitle}, Group age: ${groupAgeMonths} months`); // Debug log
            
            // Count completed vaccines
            let completedCount = 0;
            let totalCount = vaccines.length;
            
            vaccines.forEach((vaccineItem, index) => {
                const checkbox = vaccineItem.querySelector('.vaccine-checkbox');
                const vaccineName = vaccineItem.querySelector('.vaccine-name').textContent.trim();
                
                // Check if vaccine is completed
                if (this.vaccinationProgress[vaccineName]) {
                    checkbox.checked = true;
                    vaccineItem.classList.add('completed');
                    completedCount++;
                } else {
                    checkbox.checked = false;
                    vaccineItem.classList.remove('completed');
                }
            });

            // Get status using the fixed function
            const status = this.getAgeGroupStatus(groupAgeMonths, childAgeInMonths, completedCount, totalCount);
            
            console.log(`Age group ${ageTitle}: Status = ${status}, Completed = ${completedCount}/${totalCount}`); // Debug log

            // Remove all status classes
            ageGroup.classList.remove('completed', 'upcoming', 'overdue', 'future');
            
            // Apply new status
            ageGroup.classList.add(status);
            
            // Update status badge
            switch (status) {
                case 'completed':
                    statusBadge.textContent = 'Completed';
                    statusBadge.className = 'status-badge completed';
                    break;
                case 'upcoming':
                    statusBadge.textContent = 'Due Now';
                    statusBadge.className = 'status-badge upcoming';
                    break;
                case 'overdue':
                    statusBadge.textContent = 'Overdue';
                    statusBadge.className = 'status-badge overdue';
                    break;
                case 'future':
                    statusBadge.textContent = 'Future';
                    statusBadge.className = 'status-badge future';
                    break;
                default:
                    statusBadge.textContent = 'Unknown';
                    statusBadge.className = 'status-badge';
            }
        });
    }

    // Attach event listeners to all checkboxes
    attachCheckboxListeners() {
        const checkboxes = document.querySelectorAll('.vaccine-checkbox');
        checkboxes.forEach(checkbox => {
            // Remove existing listeners to prevent duplicates
            checkbox.removeEventListener('change', this.handleVaccineToggle.bind(this));
            // Add new listener
            checkbox.addEventListener('change', this.handleVaccineToggle.bind(this));
        });
    }

    // Handle vaccine checkbox toggle
    async handleVaccineToggle(event) {
        const checkbox = event.target;
        const vaccineItem = checkbox.closest('.vaccine-item');
        const vaccineName = vaccineItem.querySelector('.vaccine-name').textContent.trim();
        const isChecked = checkbox.checked;

        // Update local state
        if (isChecked) {
            this.vaccinationProgress[vaccineName] = new Date().toISOString();
        } else {
            delete this.vaccinationProgress[vaccineName];
        }

        try {
            // Save to Firebase
            const userDocRef = doc(db, 'users', this.currentUser.uid);
            await updateDoc(userDocRef, {
                vaccinationProgress: this.vaccinationProgress,
                updatedAt: new Date()
            });

            // Update UI
            if (isChecked) {
                vaccineItem.classList.add('completed');
            } else {
                vaccineItem.classList.remove('completed');
            }

            // Refresh all statuses
            this.updateVaccinationStatus();
            this.updateProgressStats();
            
            this.showNotification(
                isChecked ? 'Vaccination marked as completed! 🎉' : 'Vaccination unmarked',
                isChecked ? 'success' : 'info'
            );
        } catch (error) {
            console.error('Error updating vaccination status:', error);
            // Revert checkbox state
            checkbox.checked = !isChecked;
            this.showNotification('Error updating vaccination status', 'error');
        }
    }

    // Update progress statistics - ENHANCED VERSION
    updateProgressStats() {
        if (!this.childData) return;

        const totalVaccines = vaccinationSchedule.length;
        const completedVaccines = Object.keys(this.vaccinationProgress).length;
        const progressPercentage = Math.round((completedVaccines / totalVaccines) * 100);

        // Update progress display
        const completedElement = document.getElementById('completedCount');
        const totalElement = document.getElementById('totalCount');
        const progressElement = document.getElementById('progressPercentage');
        const progressFill = document.getElementById('progressFill');
        const upcomingElement = document.getElementById('upcomingCount');
        const overdueElement = document.getElementById('overdueCount');

        if (completedElement) completedElement.textContent = completedVaccines;
        if (totalElement) totalElement.textContent = totalVaccines;
        if (progressElement) progressElement.textContent = `${progressPercentage}%`;
        if (progressFill) progressFill.style.width = `${progressPercentage}%`;

        // Calculate upcoming and overdue vaccines
        let childAgeInMonths;
        if (this.childData.dateOfBirth) {
            childAgeInMonths = this.calculateAgeFromDOB(this.childData.dateOfBirth);
        } else {
            childAgeInMonths = this.calculateTotalAgeInMonths(this.childData.age);
        }

        let upcomingCount = 0;
        let overdueCount = 0;

        // Group vaccines by age category to avoid counting duplicates
        const ageCategories = [...new Set(vaccinationSchedule.map(v => v.category))];
        
        ageCategories.forEach(category => {
            const categoryVaccines = vaccinationSchedule.filter(v => v.category === category);
            const categoryAgeMonths = categoryVaccines[0].ageMonths;
            
            // Count incomplete vaccines in this category
            const incompleteVaccines = categoryVaccines.filter(v => !this.vaccinationProgress[v.name]);
            const incompleteCount = incompleteVaccines.length;
            
            if (incompleteCount > 0) {
                const ageDifference = childAgeInMonths - categoryAgeMonths;
                
                if (ageDifference >= -1 && ageDifference <= 2) {
                    upcomingCount += incompleteCount;
                } else if (ageDifference > 2) {
                    overdueCount += incompleteCount;
                }
            }
        });

        if (upcomingElement) upcomingElement.textContent = upcomingCount;
        if (overdueElement) overdueElement.textContent = overdueCount;
    }

    // Show no child data message
    showNoChildDataMessage() {
        const container = document.getElementById('vaccinationTimeline');
        if (container) {
            container.innerHTML = `
                <div class="no-child-data" style="text-align: center; padding: 60px 20px; color: #666;">
                    <div style="font-size: 48px; color: #ddd; margin-bottom: 20px;">👶</div>
                    <h3>No Child Profile Found</h3>
                    <p>Please add your child's information in the dashboard first.</p>
                    <a href="dashboard.html" style="display: inline-block; padding: 12px 24px; background: #4CAF50; color: white; text-decoration: none; border-radius: 8px; margin-top: 20px;">Go to Dashboard</a>
                </div>
            `;
        }
    }

    // Setup event listeners
    setupEventListeners() {
        // Navigation event listeners can be added here if needed
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-item[href="dashboard.html"]')) {
                e.preventDefault();
                window.location.href = 'dashboard.html';
            }
        });
    }

    // Show notification
    showNotification(message, type = 'success') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(n => n.remove());

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            max-width: 300px;
        `;
        
        // Set background color based on type
        if (type === 'success') notification.style.background = '#4CAF50';
        else if (type === 'error') notification.style.background = '#f44336';
        else if (type === 'info') notification.style.background = '#2196F3';
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Add CSS animation for notifications
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .vaccine-item.completed {
        opacity: 0.7;
        background-color: #f0f8f0;
    }
    
    .age-group.completed .age-header {
        background-color: #d4edda;
    }
    
    .age-group.upcoming .age-header {
        background-color: #fff3cd;
    }
    
    .age-group.overdue .age-header {
        background-color: #f8d7da;
    }
    
    .status-badge.completed {
        background-color: #28a745;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .status-badge.upcoming {
        background-color: #ffc107;
        color: #212529;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
    
    .status-badge.overdue {
        background-color: #dc3545;
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
    }
`;
document.head.appendChild(style);

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.immunisationManager = new ImmunisationManager();
});

// Export for global access
window.ImmunisationManager = ImmunisationManager;
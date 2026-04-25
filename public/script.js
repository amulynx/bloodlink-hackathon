/**
 * BloodLink - Frontend JavaScript
 *
 * This file handles all user interactions:
 * - Searching for donors by blood group and city
 * - Emergency alert simulation
 * - Smart suggestions for compatible blood groups
 * - Loading animations and visual feedback
 *
 * The app tries to call the backend API first.
 * If the backend is not running, it falls back to embedded data.
 */

// ============================================
// EMBEDDED DONOR DATA (for static/demo mode)
// ============================================
// This data is a copy of what's in data/donors.json.
// It lets the app work even when the backend server is not running.
const EMBEDDED_DONORS = [
  { id: 1, name: "Rahul Sharma", bloodGroup: "O+", city: "Mumbai", phone: "+91-98765-43210", age: 28, lastDonated: "2025-12-15", available: true },
  { id: 2, name: "Priya Patel", bloodGroup: "A+", city: "Mumbai", phone: "+91-87654-32109", age: 32, lastDonated: "2026-01-10", available: true },
  { id: 3, name: "Arjun Reddy", bloodGroup: "B+", city: "Hyderabad", phone: "+91-76543-21098", age: 24, lastDonated: "2025-11-20", available: true },
  { id: 4, name: "Sneha Gupta", bloodGroup: "AB+", city: "Delhi", phone: "+91-65432-10987", age: 29, lastDonated: "2026-02-05", available: true },
  { id: 5, name: "Vikram Singh", bloodGroup: "O-", city: "Bangalore", phone: "+91-54321-09876", age: 35, lastDonated: "2025-10-30", available: true },
  { id: 6, name: "Ananya Iyer", bloodGroup: "A-", city: "Chennai", phone: "+91-43210-98765", age: 27, lastDonated: "2026-03-01", available: true },
  { id: 7, name: "Karan Malhotra", bloodGroup: "B-", city: "Mumbai", phone: "+91-32109-87654", age: 31, lastDonated: "2025-09-15", available: false },
  { id: 8, name: "Divya Nair", bloodGroup: "O+", city: "Bangalore", phone: "+91-21098-76543", age: 26, lastDonated: "2026-01-25", available: true },
  { id: 9, name: "Rohit Desai", bloodGroup: "AB-", city: "Pune", phone: "+91-10987-65432", age: 33, lastDonated: "2025-08-10", available: true },
  { id: 10, name: "Meera Joshi", bloodGroup: "A+", city: "Mumbai", phone: "+91-99887-76655", age: 30, lastDonated: "2026-02-20", available: true },
  { id: 11, name: "Naveen Kumar", bloodGroup: "B+", city: "Delhi", phone: "+91-88776-65544", age: 29, lastDonated: "2025-12-01", available: true },
  { id: 12, name: "Lakshmi Prasad", bloodGroup: "O-", city: "Hyderabad", phone: "+91-77665-54433", age: 37, lastDonated: "2026-03-10", available: true }
];

// ============================================
// BLOOD COMPATIBILITY CHART
// ============================================
// Maps each blood group to a list of compatible donor blood groups.
// Used for "Smart Suggestions" when no exact match is found.
const COMPATIBILITY = {
  "A+":  ["A+", "A-", "O+", "O-"],
  "A-":  ["A-", "O-"],
  "B+":  ["B+", "B-", "O+", "O-"],
  "B-":  ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  "AB-": ["A-", "B-", "AB-", "O-"],
  "O+":  ["O+", "O-"],
  "O-":  ["O-"]
};

// ============================================
// DOM ELEMENT REFERENCES
// ============================================
// We grab all the HTML elements we need to interact with.
const searchForm = document.getElementById("searchForm");
const bloodGroupSelect = document.getElementById("bloodGroup");
const cityInput = document.getElementById("city");
const emergencyBtn = document.getElementById("emergencyBtn");
const loadingSpinner = document.getElementById("loadingSpinner");
const alertBox = document.getElementById("alertBox");
const resultsSection = document.getElementById("resultsSection");
const donorsList = document.getElementById("donorsList");
const resultCount = document.getElementById("resultCount");
const suggestionsSection = document.getElementById("suggestionsSection");
const suggestionsList = document.getElementById("suggestionsList");
const noResults = document.getElementById("noResults");

// API base URL - empty string means same origin (works when served by Express)
const API_BASE = "";

// Track if backend is available (detected on first call)
let backendAvailable = true;

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show a message in the alert box.
 * @param {string} message - Text to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showAlert(message, type = "info") {
  alertBox.textContent = message;
  alertBox.className = `alert-box ${type}`;
  alertBox.classList.remove("hidden");
}

/**
 * Hide the alert box.
 */
function hideAlert() {
  alertBox.classList.add("hidden");
}

/**
 * Show the loading spinner.
 */
function showLoading() {
  loadingSpinner.classList.remove("hidden");
}

/**
 * Hide the loading spinner.
 */
function hideLoading() {
  loadingSpinner.classList.add("hidden");
}

/**
 * Hide all result sections.
 */
function hideAllResults() {
  resultsSection.classList.add("hidden");
  suggestionsSection.classList.add("hidden");
  noResults.classList.add("hidden");
  hideAlert();
}

/**
 * Create an HTML donor card element.
 * @param {Object} donor - Donor data object
 * @returns {HTMLElement} - The card div element
 */
function createDonorCard(donor) {
  const card = document.createElement("div");
  card.className = "donor-card";
  card.innerHTML = `
    <div class="blood-badge">${donor.bloodGroup}</div>
    <div class="donor-info">
      <div class="donor-name">${donor.name}</div>
      <div class="donor-meta">
        <span>&#128205; ${donor.city}</span>
        <span>&#128222; ${donor.phone}</span>
        <span>&#128113; Age ${donor.age}</span>
      </div>
    </div>
  `;
  return card;
}

// ============================================
// API FUNCTIONS (with fallback to embedded data)
// ============================================

/**
 * Search for donors matching blood group and city.
 * First tries the backend API, falls back to embedded data if backend is down.
 * @param {string} bloodGroup - e.g. "O+"
 * @param {string} city - e.g. "Mumbai"
 * @returns {Promise<Array>} - Array of matching donor objects
 */
async function searchDonors(bloodGroup, city) {
  // Try backend API first
  if (backendAvailable) {
    try {
      const response = await fetch(
        `${API_BASE}/api/donors?bloodGroup=${encodeURIComponent(bloodGroup)}&city=${encodeURIComponent(city)}`
      );
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      return data.data || [];
    } catch (err) {
      // Backend call failed - switch to embedded data mode
      console.log("Backend unavailable, using embedded data.", err);
      backendAvailable = false;
    }
  }

  // FALLBACK: Filter embedded data directly (client-side)
  return EMBEDDED_DONORS.filter(donor => {
    const bloodMatch = donor.bloodGroup.toUpperCase() === bloodGroup.toUpperCase();
    const cityMatch = donor.city.toLowerCase().includes(city.toLowerCase());
    return bloodMatch && cityMatch && donor.available;
  });
}

/**
 * Get smart suggestions: compatible blood groups with available donors.
 * @param {string} bloodGroup - The originally requested blood group
 * @param {string} city - The city to search in
 * @returns {Promise<Array>} - Array of suggestion objects with donor lists
 */
async function getSuggestions(bloodGroup, city) {
  // Try backend API first
  if (backendAvailable) {
    try {
      const response = await fetch(
        `${API_BASE}/api/donors/suggest?bloodGroup=${encodeURIComponent(bloodGroup)}&city=${encodeURIComponent(city)}`
      );
      if (!response.ok) throw new Error("API error");
      const data = await response.json();
      return data.data || [];
    } catch (err) {
      backendAvailable = false;
    }
  }

  // FALLBACK: Compute suggestions client-side
  const requestedGroup = bloodGroup.toUpperCase();
  const compatibleGroups = COMPATIBILITY[requestedGroup] || [];
  const suggestions = [];

  compatibleGroups.forEach(group => {
    if (group === requestedGroup) return; // Skip exact match (already searched)

    const groupDonors = EMBEDDED_DONORS.filter(donor => {
      return donor.bloodGroup.toUpperCase() === group &&
             donor.city.toLowerCase().includes(city.toLowerCase()) &&
             donor.available;
    });

    if (groupDonors.length > 0) {
      suggestions.push({
        bloodGroup: group,
        donorCount: groupDonors.length,
        donors: groupDonors
      });
    }
  });

  return suggestions;
}

/**
 * Send emergency alert to matching donors (simulated).
 * @param {string} bloodGroup - Blood group needed
 * @param {string} city - City to alert in
 * @returns {Promise<Object>} - Alert result with count and message
 */
async function sendEmergencyAlert(bloodGroup, city) {
  // Try backend API first
  if (backendAvailable) {
    try {
      const response = await fetch(`${API_BASE}/api/emergency`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bloodGroup, city })
      });
      if (!response.ok) throw new Error("API error");
      return await response.json();
    } catch (err) {
      backendAvailable = false;
    }
  }

  // FALLBACK: Simulate emergency alert client-side
  const matchingDonors = EMBEDDED_DONORS.filter(donor => {
    const bloodMatch = donor.bloodGroup.toUpperCase() === bloodGroup.toUpperCase();
    const cityMatch = donor.city.toLowerCase().includes(city.toLowerCase());
    return bloodMatch && cityMatch && donor.available;
  });

  // Fake delay to simulate network call
  await new Promise(resolve => setTimeout(resolve, 1500));

  return {
    success: true,
    message: `Emergency alert sent to ${matchingDonors.length} nearby donor${matchingDonors.length !== 1 ? "s" : ""}`,
    alertedDonors: matchingDonors
  };
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle the main search form submission.
 */
searchForm.addEventListener("submit", async function (event) {
  // Prevent the form from reloading the page
  event.preventDefault();

  // Get user input values
  const bloodGroup = bloodGroupSelect.value.trim();
  const city = cityInput.value.trim();

  // Basic validation
  if (!bloodGroup || !city) {
    showAlert("Please select a blood group and enter a city.", "error");
    return;
  }

  // Reset UI state
  hideAllResults();
  showLoading();

  // Wait a tiny bit so the spinner is visible (fake realism)
  await new Promise(r => setTimeout(r, 600));

  // Search for donors
  const donors = await searchDonors(bloodGroup, city);

  hideLoading();

  if (donors.length > 0) {
    // === EXACT MATCHES FOUND ===
    resultCount.textContent = `${donors.length} found`;
    donorsList.innerHTML = "";

    // Create and append donor cards
    donors.forEach((donor, index) => {
      const card = createDonorCard(donor);
      // Stagger animation slightly for each card
      card.style.animationDelay = `${index * 0.08}s`;
      donorsList.appendChild(card);
    });

    resultsSection.classList.remove("hidden");
    showAlert(`Found ${donors.length} donor${donors.length !== 1 ? "s" : ""} in ${city}!`, "success");
  } else {
    // === NO EXACT MATCHES ===
    // Try to find smart suggestions (compatible blood groups)
    const suggestions = await getSuggestions(bloodGroup, city);

    if (suggestions.length > 0) {
      // Show suggestions section
      suggestionsList.innerHTML = "";
      suggestions.forEach((suggestion, index) => {
        const card = document.createElement("div");
        card.className = "suggestion-card";
        card.style.animationDelay = `${index * 0.1}s`;

        let donorHTML = suggestion.donors.map(d => `
          <div class="suggestion-donor">
            <span>${d.name}</span>
            <span>${d.phone}</span>
          </div>
        `).join("");

        card.innerHTML = `
          <div class="suggestion-title">
            <span class="blood-badge">${suggestion.bloodGroup}</span>
            ${suggestion.donorCount} donor${suggestion.donorCount !== 1 ? "s" : ""} available
          </div>
          <div class="suggestion-donors">${donorHTML}</div>
        `;

        suggestionsList.appendChild(card);
      });

      suggestionsSection.classList.remove("hidden");
      showAlert(`No exact match for ${bloodGroup}. Here are compatible alternatives.`, "info");
    } else {
      // Truly nothing found
      noResults.classList.remove("hidden");
      showAlert("No donors or suggestions found. Try a different city.", "error");
    }
  }
});

/**
 * Handle the Emergency Mode button click.
 */
emergencyBtn.addEventListener("click", async function () {
  const bloodGroup = bloodGroupSelect.value.trim();
  const city = cityInput.value.trim();

  // Validate inputs first
  if (!bloodGroup || !city) {
    showAlert("Please select a blood group and enter a city before sending an emergency alert.", "error");
    bloodGroupSelect.focus();
    return;
  }

  // Visual feedback: disable button temporarily
  emergencyBtn.disabled = true;
  emergencyBtn.innerHTML = `<span class="pulse"></span> Sending Alert...`;
  hideAllResults();
  showLoading();

  // Call emergency API (or fallback)
  const result = await sendEmergencyAlert(bloodGroup, city);

  hideLoading();

  if (result.success) {
    showAlert(result.message, "success");

    // Also show the donors that were alerted
    const alertedDonors = result.alertedDonors || [];
    if (alertedDonors.length > 0) {
      resultCount.textContent = `${alertedDonors.length} alerted`;
      donorsList.innerHTML = "";
      alertedDonors.forEach((donor, index) => {
        const card = createDonorCard(donor);
        card.style.animationDelay = `${index * 0.08}s`;
        donorsList.appendChild(card);
      });
      resultsSection.classList.remove("hidden");
    }
  } else {
    showAlert("Failed to send emergency alert. Please try again.", "error");
  }

  // Restore button
  emergencyBtn.disabled = false;
  emergencyBtn.innerHTML = `<span class="pulse"></span> Emergency Mode`;
});

// ============================================
// INITIAL SETUP
// ============================================

// Focus on the blood group select when the page loads
bloodGroupSelect.focus();

console.log("%c BloodLink ", "background: #dc2626; color: white; font-size: 16px; font-weight: bold; padding: 4px 8px; border-radius: 4px;");
console.log("BloodLink frontend loaded successfully!");
console.log("Try searching for: Blood Group O+, City Mumbai");

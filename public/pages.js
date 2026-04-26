/**
 * BloodLink - Pages JavaScript
 * Handles all functionality for multi-page app
 */

// ============================================
// BLOOD COMPATIBILITY DATA
// ============================================
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

// Reverse compatibility - who can this blood type donate to
const DONATION_TO = {
  "A+":  ["A+", "AB+"],
  "A-":  ["A+", "A-", "AB+", "AB-"],
  "B+":  ["B+", "AB+"],
  "B-":  ["B+", "B-", "AB+", "AB-"],
  "AB+": ["AB+"],
  "AB-": ["AB+", "AB-"],
  "O+":  ["O+", "A+", "B+", "AB+"],
  "O-":  ["O-", "A-", "B-", "AB-", "O+", "A+", "B+", "AB+"]
};

const API_BASE = "";

// ============================================
// PAGE: FIND DONOR (find-donor.html)
// ============================================
function initFindDonor() {
  const searchForm = document.getElementById("searchForm");
  if (!searchForm) return; // Not on find-donor page

  const bloodGroupSelect = document.getElementById("bloodGroup");
  const cityInput = document.getElementById("city");
  const loadingSpinner = document.getElementById("loadingSpinner");
  const alertBox = document.getElementById("alertBox");
  const resultsSection = document.getElementById("resultsSection");
  const donorsList = document.getElementById("donorsList");
  const resultCount = document.getElementById("resultCount");
  const suggestionsSection = document.getElementById("suggestionsSection");
  const suggestionsList = document.getElementById("suggestionsList");
  const noResults = document.getElementById("noResults");

  // Search form handler
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const bloodGroup = bloodGroupSelect.value;
    const city = cityInput.value.trim();

    if (!bloodGroup || !city) {
      showAlert(alertBox, "Please fill in all fields", "error");
      return;
    }

    // Show loading
    showSpinner(loadingSpinner, true);
    hideAllResults();

    try {
      // Try to fetch from API
      const query = `bloodGroup=${encodeURIComponent(bloodGroup)}&city=${encodeURIComponent(city)}`;
      const response = await fetch(`${API_BASE}/api/donors?${query}`);
      const data = await response.json();

      showSpinner(loadingSpinner, false);

      if (data.success && data.data.length > 0) {
        displayDonors(data.data, donorsList, resultCount);
        resultsSection.classList.remove("hidden");
        showAlert(alertBox, `Found ${data.count} donor(s)!`, "success");
        
        // Fetch suggestions
        fetchSuggestions(bloodGroup, city, suggestionsList, suggestionsSection);
      } else {
        noResults.classList.remove("hidden");
        showAlert(alertBox, "No donors found. Check suggestions below.", "info");
        fetchSuggestions(bloodGroup, city, suggestionsList, suggestionsSection);
      }
    } catch (error) {
      showSpinner(loadingSpinner, false);
      showAlert(alertBox, "Error searching donors. Please try again.", "error");
      console.error("Search error:", error);
    }

    function hideAllResults() {
      resultsSection.classList.add("hidden");
      suggestionsSection.classList.add("hidden");
      noResults.classList.add("hidden");
      alertBox.classList.add("hidden");
    }
  });

  function displayDonors(donors, container, countEl) {
    const sortedDonors = [...donors].sort((a, b) => {
      const order = { available: 0, busy: 1, offline: 2 };
      const aStatus = (a.status || (a.available ? 'available' : 'offline')).toLowerCase();
      const bStatus = (b.status || (b.available ? 'available' : 'offline')).toLowerCase();
      return (order[aStatus] || 3) - (order[bStatus] || 3);
    });

    container.innerHTML = sortedDonors.map(donor => {
      const { label, cssClass } = getDonorStatusInfo(donor);
      return `
      <div class="donor-card">
        <div class="donor-info">
          <div class="donor-name">${donor.name}</div>
          <div class="donor-meta">
            <span>📞 ${donor.phone}</span>
            <span>🎂 Age: ${getDonorAge(donor)}</span>
            <span>💉 Last: ${donor.lastDonated}</span>
          </div>
        </div>
        <div class="card-badges">
          <div class="blood-badge">${donor.bloodGroup}</div>
          <span class="status-pill ${cssClass}">${label}</span>
        </div>
      </div>
    `;
    }).join("");
    
    countEl.textContent = `${donors.length} found`;
  }

  function getDonorAge(donor) {
    if (donor.age && donor.age > 20) {
      return donor.age;
    }
    return Math.floor(Math.random() * 20) + 21; // fallback age 21-40
  }

  function getDonorStatusInfo(donor) {
    const status = (donor.status || (donor.available ? 'available' : 'offline')).toString().toLowerCase();
    if (status === 'available') return { label: '🟢 Available', cssClass: 'available' };
    if (status === 'busy') return { label: '🟡 Busy', cssClass: 'busy' };
    return { label: '🔴 Not Available', cssClass: 'offline' };
  }

  function fetchSuggestions(bloodGroup, city, container, section) {
    const compatible = COMPATIBILITY[bloodGroup] || [];
    if (compatible.length === 0) return;

    section.classList.remove("hidden");
    container.innerHTML = `
      <div style="text-align: center; padding: 20px;">
        <p style="color: var(--color-text-light);">Compatible blood types: <strong>${compatible.join(", ")}</strong></p>
        <p style="font-size: 0.9rem; color: var(--color-text-light); margin-top: 8px;">These blood groups can donate to ${bloodGroup}</p>
      </div>
    `;
  }
}

// ============================================
// PAGE: REGISTER DONOR (register.html)
// ============================================
function initRegister() {
  const registerForm = document.getElementById("registerForm");
  if (!registerForm) return; // Not on register page

  const loadingSpinner = document.getElementById("regLoadingSpinner");
  const alertBox = document.getElementById("regAlertBox");

  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const bloodGroup = document.getElementById("regBloodGroup").value;
    const city = document.getElementById("regCity").value.trim();
    const phone = document.getElementById("phone").value.trim();

    if (!name || !bloodGroup || !city || !phone) {
      showAlert(alertBox, "Please fill in all fields", "error");
      return;
    }

    showSpinner(loadingSpinner, true);

    try {
      const response = await fetch(`${API_BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, bloodGroup, city, phone })
      });

      const data = await response.json();
      showSpinner(loadingSpinner, false);

      if (data.success) {
        showAlert(alertBox, "✅ " + data.message, "success");
        registerForm.reset();
        setTimeout(() => {
          alertBox.classList.add("hidden");
        }, 3000);
      } else {
        showAlert(alertBox, data.message || "Registration failed", "error");
      }
    } catch (error) {
      showSpinner(loadingSpinner, false);
      showAlert(alertBox, "Error registering. Please try again.", "error");
      console.error("Registration error:", error);
    }
  });
}

// ============================================
// PAGE: BLOOD COMPATIBILITY (compatibility.html)
// ============================================
function initCompatibility() {
  const bloodBtns = document.querySelectorAll(".blood-btn");
  if (bloodBtns.length === 0) return; // Not on compatibility page

  const compatSection = document.getElementById("compatSection");
  const compatTitle = document.getElementById("compatTitle");
  const compatDesc = document.getElementById("compatDesc");
  const donorsList = document.getElementById("donorsList");
  const recipientsList = document.getElementById("recipientsList");

  bloodBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      // Update active state
      bloodBtns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const bloodType = btn.dataset.type;
      displayCompatibility(bloodType);
    });
  });

  function displayCompatibility(bloodType) {
    const donors = COMPATIBILITY[bloodType] || [];
    const recipients = DONATION_TO[bloodType] || [];

    compatTitle.textContent = `${bloodType} - Blood Compatibility`;
    compatDesc.textContent = `Learn about the compatibility of ${bloodType} blood type`;

    // Display donors
    donorsList.innerHTML = donors.map(type => `
      <span class="compat-type">${type}</span>
    `).join("");

    // Display recipients
    recipientsList.innerHTML = recipients.map(type => `
      <span class="compat-type">${type}</span>
    `).join("");

    compatSection.classList.remove("hidden");
  }
}

// ============================================
// PAGE: REQUEST BLOOD (request.html)
// ============================================
function initRequestBlood() {
  const requestForm = document.getElementById("requestForm");
  if (!requestForm) return; // Not on request page

  const loadingSpinner = document.getElementById("reqLoadingSpinner");
  const alertBox = document.getElementById("reqAlertBox");
  const liveStatusPanel = document.getElementById("liveStatusPanel");
  const statusList = document.getElementById("statusList");
  const donorCards = document.getElementById("donorCards");

  requestForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const patientName = document.getElementById("patientName").value.trim();
    const bloodGroup = document.getElementById("reqBloodGroup").value;
    const city = document.getElementById("reqLocation").value.trim();
    const urgency = document.getElementById("urgency").value;
    const submitButton = requestForm.querySelector('button[type="submit"]');

    if (!patientName || !bloodGroup || !city || !urgency) {
      showAlert(alertBox, "Please fill in all required fields", "error");
      return;
    }

    // Prepare live broadcast mode
    submitButton.disabled = true;
    resetLiveStatusPanel();
    showLiveStatusPanel();
    showSpinner(loadingSpinner, true);
    alertBox.classList.add("hidden");

    const broadcastCount = getAcceptedDonorCount(urgency);
    const simulatedDonors = buildDonorCards(broadcastCount, bloodGroup);
    const requestPromise = fetch(`${API_BASE}/api/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientName, bloodGroup, city, urgency })
    }).then(res => res.json()).catch(error => ({ success: false, error }));

    appendStatusMessage("🚨 Broadcasting emergency request...");
    setTimeout(() => appendStatusMessage("📡 Notifying nearby donors..."), 1000);
    setTimeout(() => appendStatusMessage("📍 Matching donors based on location and blood type..."), 2000);
    setTimeout(async () => {
      appendStatusMessage(`✅ ${broadcastCount} donor${broadcastCount !== 1 ? "s" : ""} have accepted the request!`);
      showDonorCards(simulatedDonors);
      appendStatusMessage("⏱ Estimated response time: 5 minutes");
      setTimeout(() => appendStatusMessage("✅ Help is on the way"), 800);
      showSpinner(loadingSpinner, false);

      const responseData = await requestPromise;
      if (responseData.success) {
        showAlert(alertBox, `🚨 Emergency broadcast complete. ${broadcastCount} donor${broadcastCount !== 1 ? "s" : ""} are on their way!`, "success");
        requestForm.reset();
      } else {
        showAlert(alertBox, responseData.message || "Request failed. Please try again.", "error");
        donorCards.classList.add("hidden");
      }

      submitButton.disabled = false;
    }, 3000);
  });

  function resetLiveStatusPanel() {
    statusList.innerHTML = "";
    donorCards.innerHTML = "";
    donorCards.classList.add("hidden");
    liveStatusPanel.classList.add("hidden");
  }

  function showLiveStatusPanel() {
    liveStatusPanel.classList.remove("hidden");
  }

  function appendStatusMessage(message) {
    const item = document.createElement("li");
    item.className = "status-item";
    item.textContent = message;
    statusList.appendChild(item);
  }

  function getAcceptedDonorCount(urgency) {
    if (urgency === "emergency") {
      return Math.floor(Math.random() * 2) + 2; // 2-3 donors accept for emergency
    }
    if (urgency === "urgent") {
      return Math.floor(Math.random() * 2) + 1; // 1-2 donors accept for urgent
    }
    return 1; // normal requests show one donor response
  }

  function buildDonorCards(count, bloodGroup) {
    const sampleDonors = [
      { name: "Sujan Shrestha", group: bloodGroup, city: "Kathmandu" },
      { name: "Mina Gurung", group: bloodGroup, city: "Lalitpur" },
      { name: "Dipesh Shahi", group: bloodGroup, city: "Pokhara" },
      { name: "Sunita KC", group: bloodGroup, city: "Birgunj" },
      { name: "Suresh Tamang", group: bloodGroup, city: "Kathmandu" }
    ];

    const shuffled = sampleDonors.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count).map((donor, index) => ({
      ...donor,
      status: "Available",
      age: getRandomAge(),
      distance: getRandomDistance(index)
    }));
  }

  function getRandomAge() {
    return Math.floor(Math.random() * 18) + 22; // 22-39 years old
  }

  function getRandomDistance(index) {
    const base = 1.0 + index * 0.9;
    return `${(base + Math.random() * 0.7).toFixed(1)} km`;
  }

  function showDonorCards(donors) {
    donorCards.classList.remove("hidden");
    donorCards.innerHTML = donors.map(donor => `
      <div class="response-card">
        <div class="response-details">
          <div class="response-title">${donor.name}</div>
          <div class="response-meta">
            <span>${donor.group}</span>
            <span>Age ${donor.age}</span>
            <span>${donor.city}</span>
            <span>${donor.distance}</span>
            <span class="response-status">${donor.status}</span>
          </div>
        </div>
        <div class="response-actions">
          <button type="button" class="action-btn call-btn">📞 Call</button>
          <button type="button" class="action-btn message-btn">💬 Message</button>
        </div>
      </div>
    `).join("");
  }
}

// ============================================
// PAGE: HOSPITALS (hospitals.html)
// ============================================
function initHospitals() {
  const hospitalsList = document.getElementById("hospitalsList");
  if (!hospitalsList) return; // Not on hospitals page

  const loadingSpinner = document.getElementById("hospitalsLoadingSpinner");

  loadHospitals();

  async function loadHospitals() {
    showSpinner(loadingSpinner, true);

    try {
      const response = await fetch(`${API_BASE}/api/hospitals`);
      const data = await response.json();
      showSpinner(loadingSpinner, false);

      if (data.success) {
        displayHospitals(data.data);
      }
    } catch (error) {
      showSpinner(loadingSpinner, false);
      console.error("Error loading hospitals:", error);
    }
  }

  function displayHospitals(hospitals) {
    hospitalsList.innerHTML = hospitals.map(hospital => `
      <div class="hospital-card">
        <div class="hospital-header">
          <h3 class="hospital-name">${hospital.name}</h3>
          <span class="hospital-type">${hospital.type}</span>
        </div>
        <div class="hospital-info">
          <div class="info-item">
            <span class="info-label">📍 Location:</span>
            <span>${hospital.city}</span>
          </div>
          <div class="info-item">
            <span class="info-label">🏢 Address:</span>
            <span>${hospital.address}</span>
          </div>
          <div class="info-item">
            <span class="info-label">📞 Phone:</span>
            <span>${hospital.phone}</span>
          </div>
          <div class="info-item">
            <span class="info-label">✅ Status:</span>
            <span style="color: var(--color-accent); font-weight: 600;">${hospital.availability}</span>
          </div>
        </div>
      </div>
    `).join("");
  }
}

// ============================================
// PAGE: BLOOD BANK AVAILABILITY (bloodbank.html)
// ============================================
function initBloodBank() {
  const bankGrid = document.getElementById("bloodBankGrid");
  if (!bankGrid) return; // Not on blood bank page

  const errorBox = document.getElementById("bloodBankError");
  const statusMap = {
    ok: { label: "Sufficient", cssClass: "ok" },
    low: { label: "⚠️ Low Stock", cssClass: "low" },
    out: { label: "❌ Out of Stock", cssClass: "out" }
  };

  fetch("bloodbank.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error("Unable to load blood bank data.");
      }
      return response.json();
    })
    .then((banks) => {
      bankGrid.innerHTML = banks.map((bank) => {
        const inventoryRows = bank.inventory.map((item) => {
          const units = Number(item.units);
          const statusKey = units === 0 ? "out" : units < 3 ? "low" : "ok";
          const status = statusMap[statusKey];
          return `
            <div class="inventory-row ${status.cssClass}">
              <span class="inventory-group">${item.group}</span>
              <span class="inventory-units">${units}</span>
              <span class="inventory-status">${status.label}</span>
            </div>
          `;
        }).join("");

        return `
          <div class="bloodbank-card">
            <div class="bank-header">
              <div>
                <div class="bloodbank-group">${bank.name}</div>
                <div class="bloodbank-location">${bank.city}</div>
              </div>
              <div class="bank-contact">${bank.contact}</div>
            </div>
            <div class="bloodbank-inventory">
              ${inventoryRows}
            </div>
          </div>
        `;
      }).join("");
    })
    .catch((error) => {
      console.error(error);
      showAlert(errorBox, "Could not load blood bank availability.", "error");
    });
}

// ============================================
// PAGE: BLOOD DRIVES (drives.html)
// ============================================
function initDrives() {
  const drivesList = document.getElementById("drivesList");
  if (!drivesList) return; // Not on drives page

  const loadingSpinner = document.getElementById("drivesLoadingSpinner");

  loadDrives();

  async function loadDrives() {
    showSpinner(loadingSpinner, true);

    try {
      const response = await fetch(`${API_BASE}/api/drives`);
      const data = await response.json();
      showSpinner(loadingSpinner, false);

      if (data.success) {
        displayDrives(data.data);
      }
    } catch (error) {
      showSpinner(loadingSpinner, false);
      console.error("Error loading drives:", error);
    }
  }

  function displayDrives(drives) {
    drivesList.innerHTML = drives.map(drive => {
      const progress = (drive.currentDonations / drive.targetDonations) * 100;
      return `
        <div class="drive-card">
          <div class="drive-header">
            <h3 class="drive-name">${drive.eventName}</h3>
            <span class="drive-date">${drive.date}</span>
          </div>
          <div class="drive-info">
            <div class="info-item">
              <span class="info-label">📍 Location:</span>
              <span>${drive.location}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🕐 Time:</span>
              <span>${drive.startTime} - ${drive.endTime}</span>
            </div>
            <div class="info-item">
              <span class="info-label">🏢 Organized by:</span>
              <span>${drive.organized_by}</span>
            </div>
            <div class="info-item">
              <span class="info-label">📍 City:</span>
              <span>${drive.city}</span>
            </div>
          </div>
          <div class="drive-progress">
            <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.9rem;">
              <span>Donations: <strong>${drive.currentDonations}/${drive.targetDonations}</strong></span>
              <span><strong>${Math.round(progress)}%</strong></span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${progress}%"></div>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showAlert(element, message, type = "info") {
  element.textContent = message;
  element.className = `alert-box ${type}`;
  element.classList.remove("hidden");
}

function showSpinner(element, show) {
  if (show) {
    element.classList.remove("hidden");
  } else {
    element.classList.add("hidden");
  }
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener("DOMContentLoaded", () => {
  initFindDonor();
  initRegister();
  initCompatibility();
  initRequestBlood();
  initHospitals();
  initDrives();
  initBloodBank();
});

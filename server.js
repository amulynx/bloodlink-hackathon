/**
 * BloodLink - Express Backend Server
 * 
 * This server provides REST API endpoints for the BloodLink app.
 * It reads donor data from a local JSON file and serves the static frontend files.
 * 
 * To run: node server.js
 */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Enable CORS so frontend can call the API
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  next();
});

// Serve static frontend files (HTML, CSS, JS) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Path to our JSON database file
const DONORS_FILE = path.join(__dirname, 'data', 'donors.json');

/**
 * Helper: Load donors from JSON file
 * Returns array of donor objects
 */
function loadDonors() {
  try {
    const data = fs.readFileSync(DONORS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading donors.json:', err);
    return [];
  }
}

/**
 * GET /api/donors
 * Search donors by blood group and city (case-insensitive, partial match on city)
 * Query params: ?bloodGroup=A+&city=Kathmandu
 */
app.get('/api/donors', (req, res) => {
  const { bloodGroup, city } = req.query;
  
  // Validation: both parameters are required
  if (!bloodGroup || !city) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both bloodGroup and city query parameters'
    });
  }

  const donors = loadDonors();

  // Filter: exact blood group match, partial city match (case-insensitive), and available donors
  const matches = donors.filter(donor => {
    const bloodMatch = donor.bloodGroup.toUpperCase() === bloodGroup.toUpperCase();
    const cityMatch = donor.city.toLowerCase().includes(city.toLowerCase());
    const isAvailable = donor.available === true;
    return bloodMatch && cityMatch && isAvailable;
  });

  res.json({
    success: true,
    count: matches.length,
    data: matches
  });
});

/**
 * Blood group compatibility chart for smart suggestions
 * Returns alternative blood groups that can donate TO the requested group
 */
const COMPATIBILITY = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // universal recipient
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'] // universal donor
};

/**
 * GET /api/donors/suggest
 * If no exact match found, suggest compatible blood groups
 * Query params: ?bloodGroup=A+&city=Kathmandu
 */
app.get('/api/donors/suggest', (req, res) => {
  const { bloodGroup, city } = req.query;

  if (!bloodGroup || !city) {
    return res.status(400).json({
      success: false,
      message: 'Please provide both bloodGroup and city query parameters'
    });
  }

  const donors = loadDonors();
  const requestedGroup = bloodGroup.toUpperCase();

  // Get compatible blood groups for the requested group
  const compatibleGroups = COMPATIBILITY[requestedGroup] || [];

  // Find available donors in the same city with compatible blood groups
  // Exclude the exact match group (those would have been found already)
  const suggestions = [];

  compatibleGroups.forEach(group => {
    if (group === requestedGroup) return; // Skip exact match
    
    const groupDonors = donors.filter(donor => {
      return donor.bloodGroup.toUpperCase() === group &&
             donor.city.toLowerCase().includes(city.toLowerCase()) &&
             donor.available === true;
    });

    if (groupDonors.length > 0) {
      suggestions.push({
        bloodGroup: group,
        donorCount: groupDonors.length,
        donors: groupDonors
      });
    }
  });

  res.json({
    success: true,
    requestedGroup: requestedGroup,
    suggestionCount: suggestions.length,
    data: suggestions
  });
});

/**
 * POST /api/emergency
 * Simulate sending emergency alert to all matching donors
 * Body: { "bloodGroup": "O+", "city": "Kathmandu" }
 */
app.post('/api/emergency', (req, res) => {
  const { bloodGroup, city } = req.body;

  // Validation
  if (!bloodGroup || !city) {
    return res.status(400).json({
      success: false,
      message: 'Please provide bloodGroup and city in the request body'
    });
  }

  const donors = loadDonors();

  // Find matching donors for the emergency alert
  const matchingDonors = donors.filter(donor => {
    const bloodMatch = donor.bloodGroup.toUpperCase() === bloodGroup.toUpperCase();
    const cityMatch = donor.city.toLowerCase().includes(city.toLowerCase());
    const isAvailable = donor.available === true;
    return bloodMatch && cityMatch && isAvailable;
  });

  // Simulate alert delay (realistic feel)
  const alertCount = matchingDonors.length;
  const simulatedDelay = 1500; // 1.5 seconds

  setTimeout(() => {
    res.json({
      success: true,
      message: `Emergency alert sent to ${alertCount} nearby donor${alertCount !== 1 ? 's' : ''}`,
      alertedDonors: matchingDonors.map(d => ({
        name: d.name,
        phone: d.phone,
        bloodGroup: d.bloodGroup
      })),
      timestamp: new Date().toISOString()
    });
  }, simulatedDelay);
});

/**
 * GET /api/donors/all
 * Returns all donors (useful for debugging or admin view)
 */
app.get('/api/donors/all', (req, res) => {
  const donors = loadDonors();
  res.json({
    success: true,
    count: donors.length,
    data: donors
  });
});

/**
 * POST /api/register
 * Register a new donor
 * Body: { "name": "John Doe", "bloodGroup": "O+", "city": "Kathmandu", "phone": "+977-1234567890" }
 */
app.post('/api/register', (req, res) => {
  const { name, bloodGroup, city, phone } = req.body;

  // Validation
  if (!name || !bloodGroup || !city || !phone) {
    return res.status(400).json({
      success: false,
      message: 'Please provide name, bloodGroup, city, and phone'
    });
  }

  try {
    // Read existing donors
    let donors = loadDonors();

    // Create new donor object
    const newDonor = {
      id: donors.length > 0 ? Math.max(...donors.map(d => d.id)) + 1 : 1,
      name,
      bloodGroup: bloodGroup.toUpperCase(),
      city,
      phone,
      age: 0,
      lastDonated: new Date().toISOString().split('T')[0],
      available: true
    };

    // Add to donors array
    donors.push(newDonor);

    // Write back to file
    fs.writeFileSync(DONORS_FILE, JSON.stringify(donors, null, 2), 'utf8');

    res.json({
      success: true,
      message: 'Registered successfully! You are now part of the BloodLink network.',
      donor: newDonor
    });
  } catch (err) {
    console.error('Error registering donor:', err);
    res.status(500).json({
      success: false,
      message: 'Error registering donor. Please try again.'
    });
  }
});

/**
 * POST /api/request
 * Register a blood request (emergency or normal)
 * Body: { "patientName": "Jane Doe", "bloodGroup": "O+", "city": "Kathmandu", "urgency": "emergency" }
 */
app.post('/api/request', (req, res) => {
  const { patientName, bloodGroup, city, urgency } = req.body;

  // Validation
  if (!patientName || !bloodGroup || !city || !urgency) {
    return res.status(400).json({
      success: false,
      message: 'Please provide patientName, bloodGroup, city, and urgency'
    });
  }

  // Find matching donors
  const donors = loadDonors();
  const matchingDonors = donors.filter(donor => {
    const bloodMatch = donor.bloodGroup.toUpperCase() === bloodGroup.toUpperCase();
    const cityMatch = donor.city.toLowerCase().includes(city.toLowerCase());
    const isAvailable = donor.available === true;
    return bloodMatch && cityMatch && isAvailable;
  });

  // Simulate sending alerts
  const alertMessage = urgency === 'emergency' 
    ? `🚨 EMERGENCY ALERT: ${matchingDonors.length} donor(s) notified for ${patientName}`
    : `Request sent to ${matchingDonors.length} donor(s) in ${city}`;

  res.json({
    success: true,
    message: alertMessage,
    requestedBloodGroup: bloodGroup,
    urgency: urgency,
    donorsNotified: matchingDonors.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/hospitals
 * Returns list of blood banks and hospitals
 */
app.get('/api/hospitals', (req, res) => {
  const hospitals = [
    {
      id: 1,
      name: "National Blood Transfusion Service",
      city: "Kathmandu",
      address: "Teku, Kathmandu 44600",
      phone: "+977-1-423-4567",
      type: "Blood Bank",
      availability: "Available",
      location: { lat: 27.7065, lng: 85.3214 }
    },
    {
      id: 2,
      name: "Bir Hospital",
      city: "Kathmandu",
      address: "Sahid Gangalal Marg, Kathmandu 44600",
      phone: "+977-1-426-4202",
      type: "Hospital",
      availability: "Available",
      location: { lat: 27.7082, lng: 85.3271 }
    },
    {
      id: 3,
      name: "Norvic International Hospital",
      city: "Lalitpur",
      address: "Dillibazar, Lalitpur 44700",
      phone: "+977-1-552-3535",
      type: "Hospital",
      availability: "Available",
      location: { lat: 27.6600, lng: 85.3240 }
    },
    {
      id: 4,
      name: "Om Hospital & Research Centre",
      city: "Bhaktapur",
      address: "Suryabinayak, Bhaktapur 44800",
      phone: "+977-1-665-4512",
      type: "Hospital",
      availability: "Available",
      location: { lat: 27.6729, lng: 85.4298 }
    },
    {
      id: 5,
      name: "Western Regional Hospital",
      city: "Pokhara",
      address: "Gandaki Province, Pokhara 33700",
      phone: "+977-61-520-200",
      type: "Hospital",
      availability: "Available",
      location: { lat: 28.2096, lng: 83.9856 }
    },
    {
      id: 6,
      name: "Bheri Zonal Hospital Blood Bank",
      city: "Nepalgunj",
      address: "Banke, Nepalgunj 21900",
      phone: "+977-81-520-123",
      type: "Blood Bank",
      availability: "Available",
      location: { lat: 28.0560, lng: 81.6160 }
    }
  ];

  res.json({
    success: true,
    count: hospitals.length,
    data: hospitals
  });
});

/**
 * GET /api/drives
 * Returns upcoming blood donation drives
 */
app.get('/api/drives', (req, res) => {
  const drives = [
    {
      id: 1,
      eventName: "Kathmandu Community Blood Drive",
      city: "Kathmandu",
      location: "Basantapur Durbar Square, Kathmandu",
      date: "2026-05-20",
      startTime: "09:00 AM",
      endTime: "05:00 PM",
      targetDonations: 400,
      currentDonations: 210,
      organized_by: "Nepal Red Cross Society"
    },
    {
      id: 2,
      eventName: "Lalitpur Health Camp",
      city: "Lalitpur",
      location: "Patan Durbar Square, Lalitpur",
      date: "2026-06-05",
      startTime: "08:00 AM",
      endTime: "04:00 PM",
      targetDonations: 250,
      currentDonations: 130,
      organized_by: "Healthy Nepal"
    },
    {
      id: 3,
      eventName: "Pokhara Mountain Aid Drive",
      city: "Pokhara",
      location: "Shanti Stupa, Pokhara",
      date: "2026-06-12",
      startTime: "10:00 AM",
      endTime: "04:00 PM",
      targetDonations: 300,
      currentDonations: 165,
      organized_by: "Gandaki Health Foundation"
    },
    {
      id: 4,
      eventName: "Biratnagar Donor Festival",
      city: "Biratnagar",
      location: "Jeevanbimak Complex, Biratnagar",
      date: "2026-05-28",
      startTime: "09:30 AM",
      endTime: "05:30 PM",
      targetDonations: 220,
      currentDonations: 90,
      organized_by: "Eastern Blood Aid"
    },
    {
      id: 5,
      eventName: "Chitwan Emergency Drive",
      city: "Chitwan",
      location: "Bharatpur Hospital Grounds, Chitwan",
      date: "2026-06-18",
      startTime: "08:00 AM",
      endTime: "05:00 PM",
      targetDonations: 280,
      currentDonations: 175,
      organized_by: "Chitwan Care"
    },
    {
      id: 6,
      eventName: "Nepalgunj Volunteer Drive",
      city: "Nepalgunj",
      location: "Rapti River Park, Nepalgunj",
      date: "2026-06-22",
      startTime: "09:00 AM",
      endTime: "05:00 PM",
      targetDonations: 200,
      currentDonations: 105,
      organized_by: "Mid-West Health Alliance"
    }
  ];

  res.json({
    success: true,
    count: drives.length,
    data: drives
  });
});

/**
 * Health check endpoint
 * Returns 200 OK if server is running
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', service: 'BloodLink API', timestamp: new Date().toISOString() });
});

// Start the server
app.listen(PORT, () => {
  console.log('=================================');
  console.log('  BloodLink Server is running!');
  console.log(`  URL: http://localhost:${PORT}`);
  console.log('=================================');
  console.log('\nAvailable API endpoints:');
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  console.log(`  GET  http://localhost:${PORT}/api/donors?bloodGroup=O+&city=Kathmandu`);
  console.log(`  GET  http://localhost:${PORT}/api/donors/suggest?bloodGroup=O+&city=Kathmandu`);
  console.log(`  POST http://localhost:${PORT}/api/register`);
  console.log(`  POST http://localhost:${PORT}/api/request`);
  console.log(`  GET  http://localhost:${PORT}/api/hospitals`);
  console.log(`  GET  http://localhost:${PORT}/api/drives`);
  console.log(`  GET  http://localhost:${PORT}/api/donors/all`);
  console.log('\nOpen the frontend at: http://localhost:' + PORT);
  console.log('=================================');
});

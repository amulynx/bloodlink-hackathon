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
 * Query params: ?bloodGroup=A+&city=Mumbai
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
 * Query params: ?bloodGroup=A+&city=Mumbai
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
 * Body: { "bloodGroup": "O+", "city": "Mumbai" }
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
  console.log(`  GET  http://localhost:${PORT}/api/donors?bloodGroup=O+&city=Mumbai`);
  console.log(`  GET  http://localhost:${PORT}/api/donors/suggest?bloodGroup=O+&city=Mumbai`);
  console.log(`  POST http://localhost:${PORT}/api/emergency`);
  console.log(`  GET  http://localhost:${PORT}/api/donors/all`);
  console.log('\nOpen the frontend at: http://localhost:' + PORT);
  console.log('=================================');
});

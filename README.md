<<<<<<< HEAD
# BloodLink - Hackathon MVP

**Find nearby blood donors instantly during emergencies.**

A simple, beginner-friendly web application built for hackathons. Clean UI, smart suggestions, and emergency alert simulation.

---

## Project Structure

```
bloodlink/
├── public/                  # Frontend files
│   ├── index.html           # Main HTML page
│   ├── style.css            # Stylesheet
│   └── script.js            # Frontend JavaScript
├── data/
│   └── donors.json          # Local JSON database
├── server.js                # Express backend
├── package.json             # Node.js dependencies
└── README.md                # This file
```

---

## Quick Start (Run Locally)

### Prerequisites
- [Node.js](https://nodejs.org/) installed on your computer

### Step 1: Install Dependencies

Open a terminal in the project folder and run:

```bash
npm install
```

This downloads the only dependency: **Express** (our web server).

### Step 2: Start the Server

```bash
npm start
```

You should see:

```
=================================
  BloodLink Server is running!
  URL: http://localhost:3000
=================================
```

### Step 3: Open in Browser

Go to: **http://localhost:3000**

That's it! The app is running.

---

## How to Use the App

1. **Select a Blood Group** from the dropdown (e.g., `O+`, `A+`, `B-`).
2. **Type a City** (e.g., `Kathmandu`, `Lalitpur`, `Pokhara`).
3. Click **Find Donors** to search.
4. If no exact match is found, the app shows **Smart Suggestions** with compatible blood groups.
5. Click **Emergency Mode** to simulate sending an urgent alert to all matching donors.

### Demo Search Ideas

| Blood Group | City      | Expected Result                          |
|-------------|-----------|------------------------------------------|
| O+          | Kathmandu | 1 donor (Sujan Shrestha)                 |
| A+          | Lalitpur  | 1 donor (Mina Gurung)                    |
| O-          | Bhaktapur | 1 donor (Pratik Thapa)                   |
| B+          | Pokhara   | 1 donor (Nischal Rai)                    |

---

## API Endpoints

The backend provides the following REST API endpoints:

### 1. Search Donors

```
GET /api/donors?bloodGroup={group}&city={city}
```

**Example:** `GET /api/donors?bloodGroup=O+&city=Kathmandu`

**Response:**
```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "id": 1,
      "name": "Sujan Shrestha",
      "bloodGroup": "O+",
      "city": "Kathmandu",
      "phone": "+977-98010-12345",
      "age": 28,
      "lastDonated": "2026-03-10",
      "available": true
    }
  ]
}
```

---

### 2. Smart Suggestions

```
GET /api/donors/suggest?bloodGroup={group}&city={city}
```

Returns compatible blood groups with available donors when no exact match exists.

**Example:** `GET /api/donors/suggest?bloodGroup=AB+&city=Kathmandu`

**Response:**
```json
{
  "success": true,
  "requestedGroup": "AB+",
  "suggestionCount": 2,
  "data": [
    {
      "bloodGroup": "A+",
      "donorCount": 2,
      "donors": [...]
    }
  ]
}
```

---

### 3. Emergency Alert

```
POST /api/emergency
```

**Body:**
```json
{
  "bloodGroup": "O+",
  "city": "Kathmandu"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Emergency alert sent to 1 nearby donor",
  "alertedDonors": [...],
  "timestamp": "2026-04-25T10:00:00.000Z"
}
```

*Note: This simulates sending alerts. No real messages are sent.*

---

### 4. List All Donors

```
GET /api/donors/all
```

Returns all donors in the database (useful for debugging).

---

### 5. Health Check

```
GET /api/health
```

Returns server status.

---

## Key Features Explained

### Emergency Mode Button
- Simulates sending an urgent SMS/push notification to all matching donors.
- Shows a visual pulse animation.
- Displays which donors received the alert.

### Smart Suggestions
- Uses a blood compatibility chart to recommend alternative blood groups.
- Example: If you need `AB+`, donors with `A+`, `B+`, `O+`, etc. can also donate.
- Only shows suggestions that actually have available donors in that city.

### Fake Real-Time Effect
- A spinning loader appears for ~600ms before showing results.
- Makes the app feel dynamic and responsive.

### Works Without Backend
- The frontend has embedded donor data.
- If the Express server is not running, the frontend falls back to client-side filtering automatically.
- Perfect for static demos!

---

## Technologies Used

| Layer      | Technology                  |
|------------|-----------------------------|
| Frontend   | HTML5, CSS3, Vanilla JS     |
| Backend    | Node.js + Express           |
| Database   | Local JSON file (`donors.json`) |
| Styling    | CSS Custom Properties (variables) |
| Font       | Inter (Google Fonts)        |

---

## Customization Tips

### Add More Donors
Edit `data/donors.json` and add entries following this format:

```json
{
  "id": 13,
  "name": "Your Name",
  "bloodGroup": "A+",
  "city": "Kolkata",
  "phone": "+91-90000-00000",
  "age": 25,
  "lastDonated": "2026-01-01",
  "available": true
}
```

> Remember to also add the same entry to `public/script.js` in the `EMBEDDED_DONORS` array if you want the static version to work too.

### Change the Port
Edit `server.js` and modify:
```js
const PORT = process.env.PORT || 3000;
```

### Change Colors
Edit the CSS variables at the top of `public/style.css`:
```css
:root {
  --color-primary: #dc2626;  /* Change this to any color */
}
```

---

## Troubleshooting

| Problem                        | Solution                                      |
|--------------------------------|-----------------------------------------------|
| `npm install` fails            | Make sure Node.js is installed                |
| Port 3000 already in use       | Change the PORT in `server.js` or kill the other process |
| No results showing             | Check that `bloodGroup` and `city` are filled |
| CORS errors                    | The backend already enables CORS for all origins |
| Frontend loads but no styling  | Check that `style.css` is in the same folder as `index.html` |

---

## Why This Stack?

- **HTML + CSS + JS**: Every beginner knows it. No build step needed.
- **Express**: Minimal setup, single file, runs instantly.
- **JSON file**: No database setup. Just edit a text file.

---

## License

MIT - Free to use for hackathons, learning, and projects.

**Built with care for emergencies. Demo responsibly.**
=======
# bloodlink-hackathon
>>>>>>> 39958e4f312d92873c84b9852d4811a995d598d3

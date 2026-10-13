# PSG Bunker Web

> The dedicated attendance tracker, bunk planner, and academic hub for PSG College of Technology students.

---

## 🌟 Highlights

* **Direct eCampus Portal Sync**: Real-time attendance percentage, conducted hours, and subject attendance registers.
* **Safe Bunk Calculator**: Automatic threshold projection ensuring attendance stays strictly above the mandatory 75% limit.
* **Universal Mobile PWA**: Instant 1-tap installation on Android and iOS (Safari "Add to Home Screen") with 0ms offline app shell caching.
* **Academic Calendar Hub**: Real-time CA test schedules, semester timetable, and official holidays.
* **Continuous Assessment (CA) Marks**: Subject-wise internal test scores, assignment marks, and GPA calculator.
* **Vercel Hobby Plan Optimized**:
  * Response Gzip compression middleware (saving >85% bandwidth).
  * Direct client phone calendar fetching (0 Vercel function calls).
  * In-memory session pooling (sub-200ms consecutive calls).
  * Edge region Mumbai (`bom1`) deployment.
  * 24-hour navigation auto-fetch cooldown.

---

## 🚀 Tech Stack

* **Backend**: Python 3.11, Flask WSGI, BeautifulSoup4, Requests
* **Frontend**: HTML5, Vanilla JavaScript (ES6+), Tailwind CSS, FontAwesome, Anime.js
* **PWA**: Service Worker Cache API (`bunker-cache-v32`), Web App Manifest
* **Deployment**: Vercel Serverless Functions (`bom1` region)

---

## 🛠️ Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/akka-pixel/bunker-web.git
   cd bunker-web
   ```

2. **Set up virtual environment & install dependencies:**
   ```bash
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Run development server:**
   ```bash
   python3 -m flask --app api.index run --port 5000
   ```

4. **Open in browser:**
   ```
   http://localhost:5000
   ```

---

## 📱 Mobile Installation (PWA)

* **Android (Chrome)**: Tap the in-app "Install Bunker App" card or browser menu (⋮) -> *Install app*.
* **iOS (Safari)**: Tap the Share button (<i class="fas fa-arrow-up-from-bracket"></i>) -> *Add to Home Screen*.

---

## 📄 License

MIT License. Built with ❤️ for PSG Tech students.

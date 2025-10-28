# WildWatch — keep API key out of repo

This project includes a small local proxy so you do not have to store the API key in `script.js`.

Steps to run locally:


1. Copy `.env.example` to `.env` and set your key and model:

   - On Windows PowerShell (current session):

   ```powershell
   $env:GOOGLE_API_KEY = "sk_your_key_here"
   $env:MODEL = "models/gemini-2.5-flash-lite"
   ```

   Or create a `.env` file in the project root with:

   ```text
   GOOGLE_API_KEY=your_real_key_here
   MODEL=models/gemini-2.5-flash-lite
   PORT=3000
   ```

   The recommended default is `models/gemini-2.5-flash-lite` for best cost/speed. For higher quality, use `models/gemini-2.5-pro`.

2. Install dependencies and start the proxy server:

   ```powershell
   npm install
   npm start
   ```

3. Open `index.html` in the browser (or serve it via a static server). The frontend will POST to `http://localhost:3000/api/generate` and the server will attach the API key.

Git notes:

- `.gitignore` prevents the `.env` file from being committed. Do NOT add your real key to the repo.
- If you accidentally committed a secret, remove it and rotate the key. Use BFG or `git filter-repo` to purge history if needed.

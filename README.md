# Mathblitz

Main Framework, Next.js (React), Handles routing for profiles, leaderboards, and the landing page with elite performance.
State Management, Zustand, A tiny, fast state manager to keep track of the current math problem and the timer without lag.
Styling, Tailwind CSS, Perfect for ""Blitz"" aesthetics; easy to create pulsing animations for correct/incorrect answers.
Real-Time Client, Socket.io-client, The ""ear"" on the frontend that listens for new problems sent by the server.
Data Fetching, TanStack Query, Automatically caches leaderboard data so the UI feels instant when switching pages.

Server Runtime, Node.js, Uses an event-driven model that is perfect for handling thousands of concurrent game ""handshakes.""
API Framework, Express.js, Lightweight and flexible; used for simple tasks like updating a bio or fetching a match history.
Real-Time Server, Socket.io, Manages the ""rooms"" where two players compete and ensures the ""handshake"" stays alive.
Database (SQL), PostgreSQL, The ""source of truth"" for user accounts, Elo ratings, and lifetime statistics.
Cache (NoSQL), Redis, Essential for the Global Leaderboard. It calculates rankings in memory so they update in real-time.
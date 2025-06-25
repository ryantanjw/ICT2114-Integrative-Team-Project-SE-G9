## Getting Started

Follow these steps to set up this project:

### 1. Clone and cd into the Repository

### 2. Create a Virtual Environment

**On Windows:**

    python -m venv venv

**On macOS/Linux:**

    python3 -m venv venv

### 3. Activate the Virtual Environment

**On Windows (Command Prompt):**

    venv\Scripts\activate

**On Windows (PowerShell):**

    .\venv\Scripts\Activate.ps1

**On macOS/Linux:**

    source venv/bin/activate

### 4. Install Project Requirements

    pip install -r requirements.txt

### 5. Frontend and Backend Setup

> [!IMPORTANT]
> The frontend has shifted to be React-based, with a Flask backend.

To start the Flask server (interim example providing responses to the React frontend):

    python main.py

To start the React project:

    cd react-front-end
    npm install
    npm run dev

This will start the Vite server (typically at http://localhost:5173) so you can access the frontend.

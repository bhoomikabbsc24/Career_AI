# CareerAI – AI-Powered Interview Preparation Platform

CareerAI is an AI-powered interview preparation platform that helps candidates prepare for job interviews by analyzing their resumes, self-descriptions, and job descriptions. It generates personalized interview questions, identifies skill gaps, and provides a structured preparation plan.

## Features

- **AI-Powered Interview Analysis:** Generates a personalized interview preparation report using Google Gemini AI.
- **Resume Upload:** Upload a PDF resume for analysis.
- **Job Description Matching:** Evaluates how well a candidate's profile matches a job description.
- **Match Score:** Provides a score indicating the candidate's suitability for the target role.
- **Technical Interview Questions:** Generates technical questions with the interviewer's intention and suggested answers.
- **Behavioral Interview Questions:** Provides behavioral questions and guidance on how to answer them.
- **Skill Gap Analysis:** Identifies missing skills and categorizes their severity.
- **Preparation Roadmap:** Generates a day-wise plan to help candidates prepare for interviews.
- **User Authentication:** Supports user registration and login.
- **Interview Report Management:** Allows users to view and manage previously generated reports, including deleting reports.
- **PDF Generation:** Supports generating a PDF document for the tailored resume.

## Technologies Used

### Frontend
- React.js
- Vite
- JavaScript
- CSS
- Axios
- React Router

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JSON Web Tokens (JWT)
- Multer
- PDF parsing

### AI Integration
- Google Gemini API
- Zod
- zod-to-json-schema

### Additional Tools
- Puppeteer for PDF generation
- Git and GitHub for version control

## Project Structure

```text
CareerAI/
├── frontend/
│   ├── public/
│   └── src/
│       ├── features/
│       │   ├── auth/
│       │   └── interview/
│       ├── App.jsx
│       ├── app.routes.jsx
│       ├── index.css
│       └── main.jsx
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middlewares/
│   ├── models/
│   ├── routes/
│   ├── services/
│   └── app.js
├── .gitignore
├── package.json
├── package-lock.json
└── server.js
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- MongoDB connection
- Google Gemini API key

## Installation and Setup

### 1. Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/CareerAI.git
cd CareerAI
```

Replace `YOUR_USERNAME` with your GitHub username.

### 2. Install Backend Dependencies

From the project root:

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Configure Environment Variables

Create a `.env` file in the project root and add the environment variables required by your backend.

For example:

```env
GOOGLE_GENAI_API_KEY=your_gemini_api_key
```

Add your MongoDB connection variable using the exact name expected by `src/config/database.js`.

**Important:** Never commit your `.env` file or publish API keys to GitHub.

### 5. Start the Backend

From the project root:

```bash
npm run dev
```

The backend runs on port `3000`, provided that the development script is configured in `package.json`.

### 6. Start the Frontend

Open a second terminal:

```bash
cd frontend
npm run dev
```

Open the local URL displayed by Vite.

## How It Works

1. The user registers or logs in to CareerAI.
2. The user enters a job description and a self-description and uploads a resume.
3. The frontend sends the information to the Express backend.
4. The backend extracts text from the uploaded PDF resume.
5. Google Gemini AI analyzes the candidate's information and generates an interview preparation report.
6. The report is stored in MongoDB.
7. The frontend displays the report, including the match score, interview questions, skill gaps, and preparation roadmap.
8. Users can manage their generated reports and use the available PDF generation feature.

## API Routes

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/` | Authentication route base |
| POST | `/api/interview/` | Generate an interview report |
| GET | `/api/interview/` | Retrieve interview reports |
| GET | `/api/interview/report/:interviewId` | Retrieve a specific report |
| POST | `/api/interview/resume/pdf/:interviewReportId` | Generate a tailored resume PDF |

The authentication endpoints are handled by the authentication router. Refer to `src/routes/auth.routes.js` for the exact login and registration paths.

## Future Enhancements

- Add more interview practice modes.
- Improve the personalization of preparation roadmaps.
- Introduce additional report export options.
- Enhance the user experience with further UI improvements.

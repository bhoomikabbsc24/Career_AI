const { GoogleGenAI } = require("@google/genai")
const { z } = require("zod")
const puppeteer = require("puppeteer")
 
const ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENAI_API_KEY
})
 
// Stable models first, preview model last
const MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3-flash-preview"]
const MAX_ATTEMPTS_PER_MODEL = 2
 
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
 
// Errors worth retrying: overloaded / unavailable / rate limited
function isRetryable(err) {
    const status = err?.status ?? err?.code
    return [429, 500, 502, 503, 504].includes(Number(status))
}
 
// Calls Gemini and retries on temporary errors (like 503), then tries the next model.
async function generateWithRetry({ contents, config }) {
    let lastError
 
    for (const model of MODELS) {
        for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_MODEL; attempt++) {
            try {
                return await ai.models.generateContent({ model, contents, config })
            } catch (err) {
                lastError = err
 
                if (!isRetryable(err)) {
                    // Model not found: skip to the next model. Anything else: stop.
                    if (Number(err?.status) === 404) break
                    throw err
                }
 
                console.warn(`Gemini ${model} failed (status ${err.status}), attempt ${attempt}/${MAX_ATTEMPTS_PER_MODEL}`)
 
                if (attempt < MAX_ATTEMPTS_PER_MODEL) {
                    await sleep(1000 * attempt)
                }
            }
        }
        console.warn(`Switching away from ${model}...`)
    }
 
    throw lastError
}
 
// Converts a zod schema to JSON Schema.
// Uses zod v4's native converter if available, otherwise falls back to zod-to-json-schema (zod v3).
function toJsonSchema(schema) {
    if (typeof z.toJSONSchema === "function") {
        const { $schema, ...rest } = z.toJSONSchema(schema)
        return rest
    }
    const { zodToJsonSchema } = require("zod-to-json-schema")
    const { $schema, ...rest } = zodToJsonSchema(schema)
    return rest
}
 
const questionSchema = z.object({
    question: z.string().describe("The question that can be asked in the interview"),
    intention: z.string().describe("The intention of the interviewer behind asking this question"),
    answer: z.string().describe("How to answer this question, what points to cover, what approach to take etc.")
})
 
const interviewReportSchema = z.object({
    matchScore: z.number().describe("A score between 0 and 100 indicating how well the candidate's profile matches the job description"),
    technicalQuestions: z.array(questionSchema).describe("Technical questions that can be asked in the interview along with their intention and how to answer them"),
    behavioralQuestions: z.array(questionSchema).describe("Behavioral questions that can be asked in the interview along with their intention and how to answer them"),
    skillGaps: z.array(z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z.enum(["low", "medium", "high"]).describe("The severity of this skill gap, i.e. how important this skill is for the job and how much it can impact the candidate's chances")
    })).describe("List of skill gaps in the candidate's profile along with their severity"),
    preparationPlan: z.array(z.object({
        day: z.number().describe("The day number in the preparation plan, starting from 1"),
        focus: z.string().describe("The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc."),
        tasks: z.array(z.string()).describe("List of tasks to be done on this day, e.g. read a specific article, solve a set of problems, watch a video etc.")
    })).describe("A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively"),
    title: z.string().describe("The title of the job for which the interview report is generated")
})
 
 
// ─────────────────────────────────────────────────────────────────────────────
// SAMPLE FALLBACK (demo safety net)
// Used ONLY when every Gemini model is overloaded (503/429).
// This is pre-written sample data, NOT a real AI result. It is clearly logged.
// Remove or disable it after the presentation (set USE_SAMPLE_FALLBACK to false).
// ─────────────────────────────────────────────────────────────────────────────
const USE_SAMPLE_FALLBACK = true
 
function buildSampleReport(jobDescription = "") {
    const firstLine = String(jobDescription).split(/\r?\n/).find((l) => l.trim()) || ""
    const title = firstLine.replace(/^position:\s*/i, "").trim().slice(0, 80) || "Backend Developer (Sample Plan)"
 
    return {
        title,
        matchScore: 72,
        technicalQuestions: [
            {
                question: "How does the Node.js event loop work, and why does it matter for building scalable APIs?",
                intention: "Checks whether you understand asynchronous, non-blocking execution rather than just using async/await.",
                answer: "Explain the single thread, the call stack, the callback/microtask queues and the phases of the event loop. Mention that CPU-heavy work blocks it, and how worker threads or queues avoid that."
            },
            {
                question: "How would you optimize a slow MongoDB query?",
                intention: "Tests practical database performance skills.",
                answer: "Start with explain() to see whether an index is used. Add compound indexes that match the query and sort order, project only needed fields, avoid unbounded scans, paginate, and use aggregation pipelines carefully."
            },
            {
                question: "Where would you add Redis caching in an API, and how do you keep the cache correct?",
                intention: "Checks understanding of caching strategies and their trade-offs.",
                answer: "Cache read-heavy, rarely changing data with a TTL. Describe cache-aside, invalidating on writes, and the risks of stale data and cache stampedes."
            },
            {
                question: "How do you implement authentication and authorization in a REST API?",
                intention: "Verifies you can secure endpoints properly.",
                answer: "Describe JWT creation and verification, storing tokens safely (httpOnly cookies), hashing passwords with bcrypt, and role-based access control through middleware."
            },
            {
                question: "How would you break a monolith into services, and what problems can appear?",
                intention: "Probes system design thinking and microservices awareness.",
                answer: "Split by business domain, keep each service's data separate, communicate through APIs or message queues, and discuss added problems: network failures, data consistency, tracing and deployment complexity."
            }
        ],
        behavioralQuestions: [
            {
                question: "Tell me about a time you improved the performance of an application.",
                intention: "Looks for measurable impact and ownership.",
                answer: "Use the STAR format. Describe the slow query or endpoint, how you measured it, the fix (indexes, caching) and the result in numbers."
            },
            {
                question: "How do you handle disagreements with teammates on a technical decision?",
                intention: "Assesses collaboration and communication.",
                answer: "Show that you listen, compare options with data, and commit to the team's decision once it is made."
            },
            {
                question: "Describe a bug in production and how you fixed it.",
                intention: "Tests debugging approach and accountability.",
                answer: "Explain how you found the cause using logs, how you fixed and verified it, and what you changed so it doesn't happen again."
            }
        ],
        skillGaps: [
            { skill: "Message queues (Kafka / RabbitMQ)", severity: "medium" },
            { skill: "Redis in production", severity: "medium" },
            { skill: "Docker and CI/CD pipelines", severity: "medium" },
            { skill: "Distributed systems concepts", severity: "low" }
        ],
        preparationPlan: [
            { day: 1, focus: "Node.js fundamentals", tasks: ["Revise the event loop, promises and async/await", "Practise 3 questions on streams and error handling"] },
            { day: 2, focus: "MongoDB optimization", tasks: ["Practise explain() on sample queries", "Design indexes for 3 common access patterns"] },
            { day: 3, focus: "Caching with Redis", tasks: ["Add Redis cache-aside to one API endpoint", "Read about TTL and invalidation strategies"] },
            { day: 4, focus: "Authentication and security", tasks: ["Implement JWT with refresh tokens", "Review common API vulnerabilities"] },
            { day: 5, focus: "Docker and CI/CD", tasks: ["Containerize an Express app", "Set up a basic GitHub Actions workflow"] },
            { day: 6, focus: "System design", tasks: ["Design a URL shortener and a chat system", "Learn queues with a small RabbitMQ example"] },
            { day: 7, focus: "Mock interviews", tasks: ["Do two timed mock interviews", "Prepare 3 STAR stories from past projects"] }
        ]
    }
}
 
 
async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
 
    const prompt = `Generate an interview report for a candidate with the following details.
Return at least 8 technical questions, 5 behavioral questions, all relevant skill gaps, and a 7-day preparation plan.
 
Resume: ${resume}
 
Self Description: ${selfDescription}
 
Job Description: ${jobDescription}`
 
    try {
        const response = await generateWithRetry({
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseJsonSchema: toJsonSchema(interviewReportSchema),
            }
        })
 
        const raw = JSON.parse(response.text)
        console.log("RAW AI RESPONSE:", JSON.stringify(raw, null, 2))
 
        // Throws a clear error if the AI output doesn't match the schema,
        // instead of silently saving empty data.
        return interviewReportSchema.parse(raw)
    } catch (err) {
        if (USE_SAMPLE_FALLBACK && isRetryable(err)) {
            console.warn("!!! ALL GEMINI MODELS UNAVAILABLE: returning SAMPLE report (not real AI output) !!!")
            return buildSampleReport(jobDescription)
        }
        throw err
    }
}
 
 
async function generatePdfFromHtml(htmlContent) {
    const browser = await puppeteer.launch()
    const page = await browser.newPage()
    await page.setContent(htmlContent, { waitUntil: "networkidle0" })
 
    const pdfBuffer = await page.pdf({
        format: "A4",
        margin: {
            top: "20mm",
            bottom: "20mm",
            left: "15mm",
            right: "15mm"
        }
    })
 
    await browser.close()
 
    return pdfBuffer
}
 
async function generateResumePdf({ resume, selfDescription, jobDescription }) {
 
    const resumePdfSchema = z.object({
        html: z.string().describe("The HTML content of the resume which can be converted to PDF using any library like puppeteer")
    })
 
    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
 
                        the response should be a JSON object with a single field "html" which contains the HTML content of the resume which can be converted to PDF using any library like puppeteer.
                        The resume should be tailored for the given job description and should highlight the candidate's strengths and relevant experience. The HTML content should be well-formatted and structured, making it easy to read and visually appealing.
                        The content of resume should be not sound like it's generated by AI and should be as close as possible to a real human-written resume.
                        you can highlight the content using some colors or different font styles but the overall design should be simple and professional.
                        The content should be ATS friendly, i.e. it should be easily parsable by ATS systems without losing important information.
                        The resume should not be so lengthy, it should ideally be 1-2 pages long when converted to PDF. Focus on quality rather than quantity and make sure to include all the relevant information that can increase the candidate's chances of getting an interview call for the given job description.
                    `
 
    const response = await generateWithRetry({
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseJsonSchema: toJsonSchema(resumePdfSchema),
        }
    })
 
    const jsonContent = resumePdfSchema.parse(JSON.parse(response.text))
 
    const pdfBuffer = await generatePdfFromHtml(jsonContent.html)
 
    return pdfBuffer
}
 
module.exports = { generateInterviewReport, generateResumePdf }

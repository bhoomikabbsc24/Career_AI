const pdfParse = require("pdf-parse")
const {
    generateInterviewReport,
    generateResumePdf
} = require("../services/ai.service")
const interviewReportModel = require("../models/interviewReport.model")
 
 
/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 * The resume PDF is optional as long as a self description is provided.
 */
async function generateInterViewReportController(req, res) {
    try {
        const { selfDescription, jobDescription } = req.body
 
        let resumeText = ""
        if (req.file) {
            const parsed = await (new pdfParse.PDFParse(Uint8Array.from(req.file.buffer))).getText()
            resumeText = parsed.text
        }
 
        if (!jobDescription) {
            return res.status(400).json({
                message: "Job description is required."
            })
        }
 
        if (!resumeText && !selfDescription) {
            return res.status(400).json({
                message: "Provide either a resume PDF or a self description."
            })
        }
 
        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        })
 
        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            matchScore: interViewReportByAi.matchScore,
            title: interViewReportByAi.title || "Interview Preparation Report",
            technicalQuestions: interViewReportByAi.technicalQuestions,
            behavioralQuestions: interViewReportByAi.behavioralQuestions,
            skillGaps: interViewReportByAi.skillGaps,
            preparationPlan: interViewReportByAi.preparationPlan
        })
 
        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport
        })
    } catch (err) {
        console.error("Interview report error:", err)
        res.status(500).json({
            message: "Failed to generate interview report.",
            error: err.message
        })
    }
}
 
/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
 
    const { interviewId } = req.params
 
    const interviewReport = await interviewReportModel.findOne({ _id: interviewId, user: req.user.id })
 
    if (!interviewReport) {
        return res.status(404).json({
            message: "Interview report not found."
        })
    }
 
    res.status(200).json({
        message: "Interview report fetched successfully.",
        interviewReport
    })
}
 
 
/**
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    const interviewReports = await interviewReportModel
        .find({ user: req.user.id })
        .sort({ createdAt: -1 })
        .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan")
 
    res.status(200).json({
        message: "Interview reports fetched successfully.",
        interviewReports
    })
}
 
 
/**
 * @description Controller to delete an interview report of the logged in user.
 */
async function deleteInterviewReportController(req, res) {
    try {
        const { interviewId } = req.params
 
        const deletedReport = await interviewReportModel.findOneAndDelete({
            _id: interviewId,
            user: req.user.id
        })
 
        if (!deletedReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }
 
        res.status(200).json({
            message: "Interview report deleted successfully.",
            interviewId
        })
    } catch (err) {
        console.error("Delete report error:", err)
        res.status(500).json({
            message: "Failed to delete interview report.",
            error: err.message
        })
    }
}
 
 
/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
    try {
        const { interviewReportId } = req.params
 
        const interviewReport = await interviewReportModel.findById(interviewReportId)
 
        if (!interviewReport) {
            return res.status(404).json({
                message: "Interview report not found."
            })
        }
 
        const { resume, jobDescription, selfDescription } = interviewReport
 
        const pdfBuffer = await generateResumePdf({ resume, jobDescription, selfDescription })
 
        res.set({
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`
        })
 
        res.send(pdfBuffer)
    } catch (err) {
        console.error("Resume PDF error:", err)
        res.status(500).json({
            message: "Failed to generate resume PDF.",
            error: err.message
        })
    }
}
 
module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
    deleteInterviewReportController,
    generateResumePdfController
}
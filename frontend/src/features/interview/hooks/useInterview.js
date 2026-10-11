import { getAllInterviewReports, generateInterviewReport, getInterviewReportById, generateResumePdf, deleteInterviewReport } from "../services/interview.api"
import { useContext, useEffect } from "react"
import { InterviewContext } from "../interview.context.jsx"
import { useParams } from "react-router"
 
 
export const useInterview = () => {
 
    const context = useContext(InterviewContext)
    const { interviewId } = useParams()
 
    if (!context) {
        throw new Error("useInterview must be used within an InterviewProvider")
    }
 
    const { loading, setLoading, report, setReport, reports, setReports } = context
 
    // Returns the generated report, or null if the request failed
    const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
        setLoading(true)
        try {
            const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile })
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            console.log(error)
            return null
        } finally {
            setLoading(false)
        }
    }
 
    const getReportById = async (interviewId) => {
        setLoading(true)
        try {
            const response = await getInterviewReportById(interviewId)
            setReport(response.interviewReport)
            return response.interviewReport
        } catch (error) {
            console.log(error)
            return null
        } finally {
            setLoading(false)
        }
    }
 
    const getReports = async () => {
        setLoading(true)
        try {
            const response = await getAllInterviewReports()
            setReports(response.interviewReports)
            return response.interviewReports
        } catch (error) {
            console.log(error)
            return []
        } finally {
            setLoading(false)
        }
    }
 
    // Deletes a report on the server, then removes it from the list on screen.
    // Returns true on success, false on failure.
    // (Doesn't use the global loading flag, so the page doesn't flash a loading screen.)
    const deleteReport = async (reportId) => {
        try {
            await deleteInterviewReport(reportId)
            setReports((reports ?? []).filter((r) => r._id !== reportId))
            return true
        } catch (error) {
            console.log(error)
            return false
        }
    }
 
    const getResumePdf = async (interviewReportId) => {
        setLoading(true)
        try {
            const response = await generateResumePdf({ interviewReportId })
            const url = window.URL.createObjectURL(new Blob([ response ], { type: "application/pdf" }))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `resume_${interviewReportId}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.remove()
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.log(error)
        } finally {
            setLoading(false)
        }
    }
 
    // Only re-run when the route's interviewId changes
    useEffect(() => {
        if (interviewId) {
            getReportById(interviewId)
        } else {
            getReports()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ interviewId ])
 
    return { loading, report, reports, generateReport, getReportById, getReports, deleteReport, getResumePdf }
}
 

import pdfParse from "pdf-parse";

/**
 * Extract text content from PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
	try {
		const data = await pdfParse(buffer);
		return data.text;
	} catch (error) {
		console.error("Error parsing PDF:", error);
		throw new Error("Failed to parse PDF file");
	}
}


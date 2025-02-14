import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Define TypeScript interfaces for better type safety and readability.
 * - SaleRecord: Represents a single sales record with a category and amount.
 * - Insights: Represents the calculated insights from the sales data.
 */
interface SaleRecord {
  category: string;
  amount: number;
}

interface Insights {
  totalSales: number;
  averageSale: number;
  categorySales: Record<string, number>;
  bestPerformingCategory: string;
}

/**
 * Initialize the Google Generative AI client.
 * - Checks if the GEMINI_API_KEY environment variable is set.
 * - Throws an error if the API key is missing.
 */

if (!process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is not set');
}
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * POST function to handle incoming requests.
 * - Processes a POST request containing an array of sales records.
 * - Validates the input, calculates insights, and generates a summary using Google's Gemini API.
 * - Returns the insights and AI-generated summary as a JSON response.
 */
export async function POST(req: NextRequest) {
  try {
    const body: SaleRecord[] = await req.json();

    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json(
        { error: 'Invalid input: Expected an array of sales records' },
        { status: 400 }
      );
    }

    const categorySales: Record<string, number> = {};
    let totalSales = 0;

    for (const sale of body) {
      if (!sale.category || typeof sale.amount !== 'number' || sale.amount < 0) {
        return NextResponse.json(
          { error: 'Invalid sale record' },
          { status: 400 }
        );
      }

      // Update total sales and category-specific sales.
      totalSales += sale.amount;
      categorySales[sale.category] = (categorySales[sale.category] || 0) + sale.amount;
    }

    /**
     * Determine the best-performing category.
     * - Uses `Object.entries` and `reduce` to find the category with the highest sales.
     */
    const bestCategory = Object.entries(categorySales).reduce(
      (max, entry) => (entry[1] > max[1] ? entry : max),
      ['', 0]
    );

    /**
     * Compile the insights into an object.
     * - totalSales: Total sales amount.
     * - averageSale: Average sales amount per transaction.
     * - categorySales: Sales breakdown by category.
     * - bestPerformingCategory: The category with the highest sales.
     */
    const insights: Insights = {
      totalSales,
      averageSale: totalSales / body.length,
      categorySales,
      bestPerformingCategory: bestCategory[0],
    };

    /**
     * Construct the AI prompt.
     * - Includes the calculated insights in a structured format.
     * - Asks the AI to summarize the data in a business-friendly tone.
     */
    const aiPrompt = `
      Based on the sales data, here are some key insights:
      - Total sales: $${insights.totalSales.toFixed(2)}
      - Average sales per transaction: $${insights.averageSale.toFixed(2)}
      - Best performing product category: ${insights.bestPerformingCategory}
      - Breakdown per category: ${JSON.stringify(insights.categorySales, null, 2)}

      Summarize this data in a business-friendly tone.
    `;

    /**
     * Generate a summary using Google's Gemini API.
     * - Initializes the Gemini model.
     * - Sends the prompt and retrieves the AI-generated response.
     */
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const aiResponse = await model.generateContent(aiPrompt);
    const summary = aiResponse.response.text();

    /**
     * Return the insights and AI-generated summary as a JSON response.
     */
    return NextResponse.json({ insights, summary });
  } catch (error) {
    /**
     * Handle errors.
     * - Logs the error to the console.
     * - Returns a 500 error with a generic message.
     */
    console.error('Error processing sales insights:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
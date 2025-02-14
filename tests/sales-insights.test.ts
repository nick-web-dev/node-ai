import { GoogleGenerativeAI } from '@google/generative-ai';
import { POST } from '@/app/sales/insights/route';
import { NextRequest } from 'next/server';

jest.mock('@google/generative-ai');

describe('POST /sales/insights', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return insights and a summary for valid input', async () => {
    const mockGenerateContent = jest.fn().mockResolvedValue({
      response: { text: () => 'Mocked AI summary' },
    });
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: mockGenerateContent,
      }),
    }));

    const inputData = [
      { category: 'Electronics', amount: 100 },
      { category: 'Clothing', amount: 50 },
      { category: 'Electronics', amount: 200 },
    ];

    const req = new NextRequest('http://localhost/sales/insights', {
      method: 'POST',
      body: JSON.stringify(inputData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(req);

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      insights: {
        totalSales: 350,
        averageSale: 116.67,
        categorySales: {
          Electronics: 300,
          Clothing: 50,
        },
        bestPerformingCategory: 'Electronics',
      },
      summary: 'Mocked AI summary',
    });

    expect(mockGenerateContent).toHaveBeenCalled();
  });

  it('should return a 400 error for invalid input (empty array)', async () => {
    const req = new NextRequest('http://localhost/sales/insights', {
      method: 'POST',
      body: JSON.stringify([]),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(req);

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: 'Invalid input: Expected an array of sales records',
    });
  });

  it('should return a 400 error for invalid input (missing fields)', async () => {
    const inputData = [{ category: 'Electronics' }];

    const req = new NextRequest('http://localhost/sales/insights', {
      method: 'POST',
      body: JSON.stringify(inputData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(req);

    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      error: 'Invalid sale record',
    });
  });

  it('should return a 500 error if the Gemini API fails', async () => {
    const mockGenerateContent = jest.fn().mockRejectedValue(new Error('API failure'));
    (GoogleGenerativeAI as jest.Mock).mockImplementation(() => ({
      getGenerativeModel: () => ({
        generateContent: mockGenerateContent,
      }),
    }));

    const inputData = [
      { category: 'Electronics', amount: 100 },
    ];

    const req = new NextRequest('http://localhost/sales/insights', {
      method: 'POST',
      body: JSON.stringify(inputData),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await POST(req);

    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({
      error: 'Internal Server Error',
    });

    expect(mockGenerateContent).toHaveBeenCalled();
  });
});
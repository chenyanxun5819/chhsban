/**
 * Google Sheets API 工具函数
 * 用于与 Cloudflare Workers 后端通信
 */

const API_BASE = '/api';

export async function getSheetsData(sheetName: string) {
  try {
    const response = await fetch(`${API_BASE}/sheets/${sheetName}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching sheets data:', error);
    throw error;
  }
}

export async function updateSheetData(
  sheetName: string,
  rowIndex: number,
  data: Record<string, any>
) {
  try {
    const response = await fetch(`${API_BASE}/sheets/${sheetName}/${rowIndex}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error updating sheets data:', error);
    throw error;
  }
}

export async function appendSheetData(
  sheetName: string,
  data: Record<string, any>
) {
  try {
    const response = await fetch(`${API_BASE}/sheets/${sheetName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error appending sheets data:', error);
    throw error;
  }
}

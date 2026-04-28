import { GoogleGenAI } from '@google/genai';
import pool from '../config/database.js';
import { io } from '../index.js';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

export async function generateInsights() {
  try {
    // Get inventory stats
    const productsResult = await pool.query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE stock <= min_stock_alert) as low_stock FROM products');
    const ordersResult = await pool.query('SELECT SUM(total) as revenue, COUNT(*) as order_count FROM orders WHERE timestamp >= NOW() - INTERVAL \'30 days\'');
    const clientsResult = await pool.query('SELECT COUNT(*) as total FROM clients');
    const lowStockResult = await pool.query('SELECT name, stock, min_stock_alert FROM products WHERE stock <= min_stock_alert ORDER BY stock ASC');

    const context = {
      totalProducts: parseInt(productsResult.rows[0].total),
      lowStockItems: parseInt(productsResult.rows[0].low_stock),
      revenueLast30Days: parseFloat(ordersResult.rows[0].revenue || 0),
      ordersLast30Days: parseInt(ordersResult.rows[0].order_count || 0),
      totalClients: parseInt(clientsResult.rows[0].total),
      lowStockProducts: lowStockResult.rows
    };

    const prompt = `
You are an AI inventory analyst for a clothing retail business.
Current inventory data:
- Total products: ${context.totalProducts}
- Low stock items: ${context.lowStockItems}
- Revenue last 30 days: ${context.revenueLast30Days.toFixed(2)}
- Orders last 30 days: ${context.ordersLast30Days}
- Total clients: ${context.totalClients}

Low stock products: ${lowStockResult.rows.map(p => `${p.name}: ${p.stock} left`).join(', ')}

Generate 4 actionable insights. Return ONLY valid JSON in this format:
[{"title": "string", "description": "string", "type": "warning|success|info|trend"}]
`;

    const response = await model.generateContent(prompt);
    const text = response.response.text();
    
    const insights = JSON.parse(text);

    for (const insight of insights) {
      await pool.query(
        'INSERT INTO insights (type, message) VALUES ($1, $2)',
        [insight.type, `${insight.title}: ${insight.description}`]
      );
    }

    io.emit('insight:created');

    return insights;

  } catch (error) {
    console.error('Gemini API failed, using fallback insights:', error);
    
    // Fallback deterministic insights
    const fallbackInsights = [
      { title: "Stock Monitoring", description: "Check low stock items and reorder soon.", type: "warning" },
      { title: "Sales Performance", description: "Continue current sales strategy.", type: "info" },
      { title: "Inventory Health", description: "System operating normally.", type: "success" },
      { title: "Client Growth", description: "Focus on expanding wholesale accounts.", type: "trend" }
    ];

    for (const insight of fallbackInsights) {
      await pool.query(
        'INSERT INTO insights (type, message) VALUES ($1, $2)',
        [insight.type, `${insight.title}: ${insight.description}`]
      );
    }

    return fallbackInsights;
  }
}

export async function chatWithAI(message: string, history: any[]) {
  try {
    const statsResult = await pool.query(`
      SELECT 
        (SELECT COUNT(*) FROM products) as products,
        (SELECT COUNT(*) FILTER (WHERE stock <= min_stock_alert) FROM products) as low_stock,
        (SELECT COALESCE(SUM(total), 0) FROM orders WHERE timestamp >= NOW() - INTERVAL '30 days') as revenue
    `);

    const stats = statsResult.rows[0];

    const systemContext = `
System context:
- Current inventory items: ${stats.products}
- Low stock items: ${stats.low_stock}
- Revenue last 30 days: ${parseFloat(stats.revenue).toFixed(2)}

You are VaultStock AI, an inventory management assistant. Answer questions about inventory, sales, and clients.
`;

    const chat = model.startChat({
      history: history.map(h => ({ role: h.role, parts: [{ text: h.content }] }))
    });

    const result = await chat.sendMessage(`${systemContext}\n\nUser: ${message}`);
    return result.response.text();

  } catch (error) {
    console.error('AI chat failed:', error);
    return "I'm currently operating in offline mode. You can ask about inventory levels, stock status, and general business questions.";
  }
}
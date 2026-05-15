import { getDb } from "./db";
import type { Trade } from "@/types/trading";

export function ensurePortfolio(userId: number): void {
  const db = getDb();
  db.prepare(
    `INSERT OR IGNORE INTO portfolios (user_id) VALUES (?)`
  ).run(userId);
}

export function getCashBalance(userId: number): number {
  const db = getDb();
  ensurePortfolio(userId);
  const row = db
    .prepare(`SELECT cash_balance FROM portfolios WHERE user_id = ?`)
    .get(userId) as { cash_balance: number };
  return row.cash_balance;
}

export function getPositions(
  userId: number
): { ticker: string; quantity: number; avg_cost: number }[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT ticker, quantity, avg_cost FROM positions WHERE user_id = ? AND quantity > 0`
    )
    .all(userId) as { ticker: string; quantity: number; avg_cost: number }[];
}

export function executeBuy(
  userId: number,
  ticker: string,
  quantity: number,
  price: number
): void {
  const db = getDb();
  ensurePortfolio(userId);
  const total = quantity * price;

  const txn = db.transaction(() => {
    const portfolio = db
      .prepare(`SELECT cash_balance FROM portfolios WHERE user_id = ?`)
      .get(userId) as { cash_balance: number };

    if (portfolio.cash_balance < total) {
      throw new Error(
        `Insufficient funds. Need $${total.toFixed(2)}, have $${portfolio.cash_balance.toFixed(2)}`
      );
    }

    // Deduct cash
    db.prepare(
      `UPDATE portfolios SET cash_balance = cash_balance - ? WHERE user_id = ?`
    ).run(total, userId);

    // Record trade
    db.prepare(
      `INSERT INTO trades (user_id, ticker, side, quantity, price, total) VALUES (?, ?, 'buy', ?, ?, ?)`
    ).run(userId, ticker, quantity, price, total);

    // Update position (insert or update avg cost)
    const existing = db
      .prepare(
        `SELECT quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?`
      )
      .get(userId, ticker) as
      | { quantity: number; avg_cost: number }
      | undefined;

    if (existing) {
      const newQty = existing.quantity + quantity;
      const newAvg =
        (existing.avg_cost * existing.quantity + price * quantity) / newQty;
      db.prepare(
        `UPDATE positions SET quantity = ?, avg_cost = ? WHERE user_id = ? AND ticker = ?`
      ).run(newQty, newAvg, userId, ticker);
    } else {
      db.prepare(
        `INSERT INTO positions (user_id, ticker, quantity, avg_cost) VALUES (?, ?, ?, ?)`
      ).run(userId, ticker, quantity, price);
    }
  });

  txn();
}

export function executeSell(
  userId: number,
  ticker: string,
  quantity: number,
  price: number
): void {
  const db = getDb();
  const total = quantity * price;

  const txn = db.transaction(() => {
    const existing = db
      .prepare(
        `SELECT quantity, avg_cost FROM positions WHERE user_id = ? AND ticker = ?`
      )
      .get(userId, ticker) as
      | { quantity: number; avg_cost: number }
      | undefined;

    if (!existing || existing.quantity < quantity) {
      throw new Error(
        `Insufficient shares. Have ${existing?.quantity ?? 0}, trying to sell ${quantity}`
      );
    }

    // Add cash
    db.prepare(
      `UPDATE portfolios SET cash_balance = cash_balance + ? WHERE user_id = ?`
    ).run(total, userId);

    // Record trade
    db.prepare(
      `INSERT INTO trades (user_id, ticker, side, quantity, price, total) VALUES (?, ?, 'sell', ?, ?, ?)`
    ).run(userId, ticker, quantity, price, total);

    // Update position
    const newQty = existing.quantity - quantity;
    if (newQty === 0) {
      db.prepare(
        `DELETE FROM positions WHERE user_id = ? AND ticker = ?`
      ).run(userId, ticker);
    } else {
      db.prepare(
        `UPDATE positions SET quantity = ? WHERE user_id = ? AND ticker = ?`
      ).run(newQty, userId, ticker);
    }
  });

  txn();
}

export function getTradeHistory(userId: number, ticker?: string): Trade[] {
  const db = getDb();
  if (ticker) {
    return db
      .prepare(
        `SELECT id, ticker, side, quantity, price, total, executed_at as executedAt
         FROM trades WHERE user_id = ? AND ticker = ? ORDER BY executed_at DESC LIMIT 100`
      )
      .all(userId, ticker) as Trade[];
  }
  return db
    .prepare(
      `SELECT id, ticker, side, quantity, price, total, executed_at as executedAt
       FROM trades WHERE user_id = ? ORDER BY executed_at DESC LIMIT 100`
    )
    .all(userId) as Trade[];
}

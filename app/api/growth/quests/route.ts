import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import QuestProgress from '@/models/QuestProgress';
import Quest from '@/models/Quest';
import { ALL_QUESTS } from '@/lib/growth/quest-definitions';
import mongoose from 'mongoose';

function todayKey() {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

function weekKey() {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

async function seedIfEmpty() {
  const allQuests = await Quest.find({}).sort({ createdAt: 1 });
  
  // 1. Cleanup duplicates if any exist
  const seen = new Set();
  const toDelete = [];
  for (const q of allQuests) {
    if (seen.has(q.questId)) {
      toDelete.push(q._id);
    } else {
      seen.add(q.questId);
    }
  }
  if (toDelete.length > 0) {
    await Quest.deleteMany({ _id: { $in: toDelete } });
  }

  // 2. Insert missing static quests
  for (const q of ALL_QUESTS) {
    const exists = await Quest.findOne({ questId: q.id });
    if (!exists) {
      await Quest.create({ ...q, questId: q.id, isCustom: false, active: true });
    }
  }
}

export async function GET(req: NextRequest) {
  try {
    if (process.env.ENABLE_GROWTH_ENGINE !== 'true') {
      return NextResponse.json({ error: 'Growth engine is disabled' }, { status: 403 });
    }

    const auth = await getAuthUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    await seedIfEmpty();
    const userId = new mongoose.Types.ObjectId(auth.id);

    // 1. Fetch Active Quests from DB
    const dbQuests = await Quest.find({ active: true }).lean();
    
    // 2. Fetch Progress for current periods
    const tk = todayKey();
    const wk = weekKey();

    const progressDocs = await QuestProgress.find({
      userId,
      periodKey: { $in: [tk, wk] }
    }).lean();

    const progressMap = new Map(progressDocs.map(p => [p.questId, p]));

    // 3. Merge Quests with Progress
    const processedQuests = dbQuests.map(q => {
      const p = progressMap.get(q.questId);
      return {
        _id: (q as any)._id.toString(),
        id: q.questId, // Map questId back to id for frontend compatibility
        title: q.title,
        description: q.description,
        kind: q.kind,
        target: q.target,
        metric: q.metric,
        xpAward: q.xpAward,
        coinAward: q.coinAward,
        count: p?.count || 0,
        claimed: p?.claimed || false,
        isCompleted: (p?.count || 0) >= q.target
      };
    });

    const daily = processedQuests.filter(q => q.kind === 'daily');
    const weekly = processedQuests.filter(q => q.kind === 'weekly');

    return NextResponse.json({
      ok: true,
      periods: { today: tk, week: wk },
      quests: {
        daily,
        weekly
      }
    });

  } catch (e: unknown) {
    console.error('API error in /api/growth/quests:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

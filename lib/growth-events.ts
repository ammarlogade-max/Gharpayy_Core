import { connectDB } from './db';
import GrowthProfile from '@/models/GrowthProfile';
import GrowthEvent from '@/models/GrowthEvent';
import QuestProgress from '@/models/QuestProgress';
import Quest from '@/models/Quest';
import { XP_EVENTS, XPEventKey } from './growth/quest-definitions';
import { calculateAwardedXP, calculateLevelFromXP } from './growth/xp-engine';
import { GrowthLogger } from './growth/logger';
import mongoose from 'mongoose';

/**
 * Gharpayy Growth Event Emitter
 * Safe, non-blocking, and idempotent event processing.
 */

export interface GrowthEventPayload {
  userId: string;
  event: XPEventKey | string;
  sourceId: string;
  sourceType: string;
  amount?: number;
  note?: string;
}

function todayKey() {
  // Use IST timezone consistently
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
}

function weekKey() {
  const d = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
  const onejan = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${week}`;
}

/**
 * Emit a growth event. This is fire-and-forget.
 * Failures here will NEVER affect the parent business logic.
 */
export function emitGrowthEvent(payload: GrowthEventPayload) {
  // Feature flag check
  if (process.env.ENABLE_GROWTH_ENGINE !== 'true') return;

  // Background execution
  (async () => {
    try {
      await connectDB();
      const { userId, event, sourceId, sourceType, amount, note } = payload;

      if (!userId || !event || !sourceId) {
        GrowthLogger.warn('INVALID_EVENT_PAYLOAD', { payload });
        return;
      }

      // 1. Idempotency Check (Duplicate Event Protection)
      const existing = await GrowthEvent.findOne({ sourceId, event }).lean();
      if (existing) {
        return; // Silent skip for duplicates is fine
      }

      // 2. Fetch/Create Growth Profile
      let profile = await GrowthProfile.findOne({ userId });
      if (!profile) {
        profile = await GrowthProfile.create({ 
          userId: new mongoose.Types.ObjectId(userId),
          lastActiveDate: todayKey(),
          streakDays: 1,
          xp: 0,
          coins: 0,
          level: 1
        });
      }

      // 3. Update Streak Logic
      const today = todayKey();
      if (profile.lastActiveDate !== today) {
        const lastDateStr = profile.lastActiveDate;
        if (lastDateStr) {
          const lastDate = new Date(lastDateStr);
          const currentToday = new Date(today);
          const diffDays = Math.round((currentToday.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === 1) {
            profile.streakDays += 1;
          } else if (diffDays > 1) {
            profile.streakDays = 1;
          }
        } else {
          profile.streakDays = 1;
        }
        profile.lastActiveDate = today;
      }

      // 4. Calculate XP
      const baseAmount = amount ?? (XP_EVENTS as any)[event] ?? 0;
      const awardedXP = calculateAwardedXP(baseAmount, profile.streakDays);

      // Economy Protection: Cap XP to prevent runaway inflation
      if (awardedXP > 5000) {
        GrowthLogger.suspicious(userId, 'EXCESSIVE_XP_AWARD', { event, awardedXP });
      }

      // 5. Create Event Record
      await GrowthEvent.create({
        userId: new mongoose.Types.ObjectId(userId),
        event,
        xpAwarded: awardedXP,
        sourceId,
        sourceType,
        note,
        ts: new Date()
      });

      // 6. Update Profile XP and Level
      profile.xp += awardedXP;
      const newLevel = calculateLevelFromXP(profile.xp);
      profile.level = newLevel;
      
      // Also add coins if applicable (optional: could be tied to level up)
      // For now, coins are only from quests.
      
      await profile.save();

      // 7. Update Quest Progress
      const matchingQuests = await Quest.find({ 
        active: true, 
        $or: [{ metric: event }, { questId: event }] 
      }).lean();

      for (const quest of matchingQuests) {
        const periodKey = quest.kind === 'daily' ? today : weekKey();
        
        await QuestProgress.findOneAndUpdate(
          { userId: new mongoose.Types.ObjectId(userId), questId: quest.questId, periodKey },
          { $inc: { count: 1 } },
          { upsert: true, new: true }
        );
      }

      GrowthLogger.info('EVENT_PROCESSED', { userId, event, xp: awardedXP });

    } catch (error) {
      // Defensive: Never throw back to the caller
      GrowthLogger.error('EVENT_PROCESS_FAILED', error, { payload });
    }
  })();
}

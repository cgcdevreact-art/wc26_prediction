import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    
    // Overview Stats
    const [totalUsers, totalMatches, totalPredictions, paidSubscribers, recentUsers] = await Promise.all([
      prisma.user.count(),
      prisma.match.count(),
      prisma.prediction.count(),
      prisma.user.count({ where: { subscriptionTier: { not: "free" } } }),
      prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
        }
      })
    ]);

    // Calculate changes (this week vs total)
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [newUsers, newMatches, newPredictions, newPaid] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.match.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.prediction.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
      prisma.user.count({ where: { subscriptionTier: { not: "free" }, createdAt: { gte: sevenDaysAgo } } })
    ]);

    // Generate chart data efficiently
    const fourMonthsAgo = new Date(now);
    fourMonthsAgo.setMonth(fourMonthsAgo.getMonth() - 4);
    
    const [baseUsers, baseMatches, basePredictions, basePaid] = await Promise.all([
      prisma.user.count({ where: { createdAt: { lt: fourMonthsAgo } } }),
      prisma.match.count({ where: { createdAt: { lt: fourMonthsAgo } } }),
      prisma.prediction.count({ where: { createdAt: { lt: fourMonthsAgo } } }),
      prisma.user.count({ where: { subscriptionTier: { not: "free" }, createdAt: { lt: fourMonthsAgo } } })
    ]);
    
    const recentRecords = await Promise.all([
      prisma.user.findMany({ where: { createdAt: { gte: fourMonthsAgo } }, select: { createdAt: true, subscriptionTier: true } }),
      prisma.match.findMany({ where: { createdAt: { gte: fourMonthsAgo } }, select: { createdAt: true } }),
      prisma.prediction.findMany({ where: { createdAt: { gte: fourMonthsAgo } }, select: { createdAt: true } })
    ]);
    
    const recUsers = recentRecords[0];
    const recMatches = recentRecords[1];
    const recPredictions = recentRecords[2];

    const getCountsUpTo = (dateEnd: Date) => {
      const uCount = baseUsers + recUsers.filter(u => u.createdAt <= dateEnd).length;
      const sCount = basePaid + recUsers.filter(u => u.subscriptionTier !== "free" && u.createdAt <= dateEnd).length;
      const mCount = baseMatches + recMatches.filter(m => m.createdAt <= dateEnd).length;
      const pCount = basePredictions + recPredictions.filter(p => p.createdAt <= dateEnd).length;
      return { users: uCount, subscribers: sCount, matches: mCount, predictions: pCount };
    };

    const dataDays = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(23, 59, 59, 999);
      dataDays.push({
        date: d.toLocaleDateString("en-US", { weekday: "short" }),
        ...getCountsUpTo(d)
      });
    }

    const dataMonths = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      d.setHours(23, 59, 59, 999);
      dataMonths.push({
        date: `Week ${4-i}`,
        ...getCountsUpTo(d)
      });
    }

    const dataYears = [];
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setMonth(d.getMonth() - i);
      d.setDate(0); 
      d.setMonth(d.getMonth() + 1);
      d.setDate(0);
      d.setHours(23, 59, 59, 999);
      dataYears.push({
        date: d.toLocaleDateString("en-US", { month: "short" }),
        ...getCountsUpTo(d)
      });
    }

    return NextResponse.json({
      overview: {
        totalUsers, newUsers,
        totalMatches, newMatches,
        totalPredictions, newPredictions,
        paidSubscribers, newPaid,
        recentUsers
      },
      charts: {
        dataDays, dataMonths, dataYears
      }
    });

  } catch (error: any) {
    console.error("Admin stats API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

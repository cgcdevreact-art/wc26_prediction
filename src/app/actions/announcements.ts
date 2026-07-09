"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function getActiveAnnouncement() {
  try {
    // Safety check in case Prisma client hasn't been re-generated yet
    if (!prisma.announcement) {
      return null;
    }

    const announcement = await prisma.announcement.findFirst({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return announcement;
  } catch (error) {
    console.error("Failed to fetch active announcement:", error);
    return null;
  }
}

export async function getAnnouncements() {
  try {
    if (!prisma.announcement) return [];

    const session = await auth();
    if (session?.user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    const announcements = await prisma.announcement.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return announcements;
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    return [];
  }
}

export async function createAnnouncement(data: { title: string; description: string; isActive: boolean }) {
  try {
    if (!prisma.announcement) {
      return { success: false, error: "Database needs update. Please run 'npm run prisma:generate' and restart the server." };
    }

    const session = await auth();
    if (session?.user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    if (data.isActive) {
      // Deactivate all others first
      await prisma.announcement.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const announcement = await prisma.announcement.create({
      data,
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/");
    
    return { success: true, announcement };
  } catch (error) {
    console.error("Failed to create announcement:", error);
    return { success: false, error: "Failed to create announcement" };
  }
}

export async function updateAnnouncement(id: string, data: { title: string; description: string; isActive: boolean }) {
  try {
    if (!prisma.announcement) {
      return { success: false, error: "Database needs update. Please run 'npm run prisma:generate' and restart the server." };
    }

    const session = await auth();
    if (session?.user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    if (data.isActive) {
      // Deactivate all others first
      await prisma.announcement.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }

    const announcement = await prisma.announcement.update({
      where: { id },
      data,
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/");
    
    return { success: true, announcement };
  } catch (error) {
    console.error("Failed to update announcement:", error);
    return { success: false, error: "Failed to update announcement" };
  }
}

export async function deleteAnnouncement(id: string) {
  try {
    if (!prisma.announcement) {
      return { success: false, error: "Database needs update. Please run 'npm run prisma:generate' and restart the server." };
    }

    const session = await auth();
    if (session?.user?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await prisma.announcement.delete({
      where: { id },
    });

    revalidatePath("/admin/announcements");
    revalidatePath("/");
    
    return { success: true };
  } catch (error) {
    console.error("Failed to delete announcement:", error);
    return { success: false, error: "Failed to delete announcement" };
  }
}

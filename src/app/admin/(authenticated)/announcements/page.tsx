import { getAnnouncements } from "@/app/actions/announcements";
import AnnouncementsClient from "./AnnouncementsClient";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin - Announcements",
  description: "Manage global announcements",
};

export default async function AnnouncementsPage() {
  const announcements = await getAnnouncements();
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <AnnouncementsClient initialAnnouncements={announcements} />
    </div>
  );
}

"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Megaphone } from "lucide-react";
import { sanitizeRichTextHtml } from "@/lib/rich-text";

type Announcement = {
  id: string;
  title: string;
  description: string;
};

export function GlobalAnnouncementModal({ announcement }: { announcement: Announcement | null }) {
  const [dismissed, setDismissed] = useState(() => {
    if (!announcement || typeof window === "undefined") {
      return false;
    }

    return Boolean(localStorage.getItem(`hasSeenUpdate_${announcement.id}`));
  });

  const dismissAnnouncement = () => {
    if (announcement) {
      localStorage.setItem(`hasSeenUpdate_${announcement.id}`, "true");
    }
    setDismissed(true);
  };

  const handleDismiss = () => {
    dismissAnnouncement();
  };

  if (!announcement) return null;

  const sanitizedDescription = sanitizeRichTextHtml(announcement.description);

  return (
    <Dialog
      open={!dismissed}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          dismissAnnouncement();
        }
      }}
    >
      <DialogContent className="sm:max-w-[42rem]">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="bg-primary/10 p-2 rounded-full">
              <Megaphone className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-xl">{announcement.title}</DialogTitle>
          </div>
          <DialogDescription
            className="pt-4 text-base text-foreground [&_a]:text-primary [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
            dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
          />
        </DialogHeader>
        <DialogFooter className="sm:justify-start pt-4">
          <Button type="button" onClick={handleDismiss} className="w-full sm:w-auto">
            Got it!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

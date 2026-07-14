"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { createAnnouncement, updateAnnouncement, deleteAnnouncement } from "@/app/actions/announcements";
import { getPlainTextFromRichText, sanitizeRichTextHtml } from "@/lib/rich-text";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type Announcement = {
  id: string;
  title: string;
  description: string;
  isActive: boolean;
  createdAt: string | Date;
};

export default function AnnouncementsClient({ initialAnnouncements }: { initialAnnouncements: Announcement[] }) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const router = useRouter();

  const resetForm = () => {
    setIsEditing(false);
    setCurrentId(null);
    setTitle("");
    setDescription("");
    setIsActive(false);
  };

  const handleEdit = (announcement: Announcement) => {
    setIsEditing(true);
    setCurrentId(announcement.id);
    setTitle(announcement.title);
    setDescription(announcement.description);
    setIsActive(announcement.isActive);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedDescription = sanitizeRichTextHtml(description);
    const plainDescription = getPlainTextFromRichText(sanitizedDescription);

    if (!title.trim() || !plainDescription) {
      toast.error("Title and description are required");
      return;
    }

    try {
      if (isEditing && currentId) {
        const res = await updateAnnouncement(currentId, {
          title: title.trim(),
          description: sanitizedDescription,
          isActive,
        });
        if (res.success) {
          toast.success("Announcement updated!");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to update");
        }
      } else {
        const res = await createAnnouncement({
          title: title.trim(),
          description: sanitizedDescription,
          isActive,
        });
        if (res.success) {
          toast.success("Announcement created!");
          router.refresh();
        } else {
          toast.error(res.error || "Failed to create");
        }
      }
      resetForm();
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      const res = await deleteAnnouncement(id);
      if (res.success) {
        toast.success("Deleted");
        router.refresh();
      } else {
        toast.error("Failed to delete");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  const handleToggleActive = async (announcement: Announcement, newActiveState: boolean) => {
    try {
      const res = await updateAnnouncement(announcement.id, {
        title: announcement.title,
        description: announcement.description,
        isActive: newActiveState,
      });
      if (res.success) {
        toast.success(newActiveState ? "Announcement activated!" : "Announcement deactivated!");
        router.refresh();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("An error occurred");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Announcements</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Announcement" : "Create New Announcement"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input 
                id="title" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="E.g., Huge New Feature!" 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <RichTextEditor
                id="description" 
                value={description} 
                onChange={setDescription}
                placeholder="Describe the new updates here..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch 
                id="active" 
                checked={isActive} 
                onCheckedChange={setIsActive} 
              />
              <Label htmlFor="active">Set as Active (shows to users)</Label>
            </div>
            <div className="flex space-x-2">
              <Button type="submit">{isEditing ? "Update" : "Create"}</Button>
              {isEditing && (
                <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Announcements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialAnnouncements.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.title}</TableCell>
                  <TableCell>
                    <Switch 
                      checked={a.isActive}
                      onCheckedChange={(c) => handleToggleActive(a, c)}
                    />
                  </TableCell>
                  <TableCell>{new Date(a.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => handleEdit(a)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(a.id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
              {initialAnnouncements.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No announcements found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

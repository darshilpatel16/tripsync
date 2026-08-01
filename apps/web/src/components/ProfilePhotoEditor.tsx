import { useRef, useState, type ChangeEvent } from "react";

import { useAuth } from "../auth/useAuth";
import { Avatar } from "./Avatar";

const maximumPhotoBytes = 1_000_000;
const acceptedPhotoTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export function ProfilePhotoEditor() {
  const { updateAvatar, user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const choosePhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage("");

    if (!acceptedPhotoTypes.has(file.type)) {
      setMessage("Choose a JPEG, PNG or WebP photo.");
      return;
    }
    if (file.size > maximumPhotoBytes) {
      setMessage("Choose a photo smaller than 1 MB.");
      return;
    }

    setSaving(true);
    try {
      const photo = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Could not read the photo"));
        reader.readAsDataURL(file);
      });
      if (!updateAvatar) throw new Error("Profile updates are unavailable");
      await updateAvatar(photo);
      setMessage("Profile photo updated.");
    } catch {
      setMessage("TripSync could not save your photo.");
    } finally {
      setSaving(false);
      event.target.value = "";
    }
  };

  const removePhoto = async () => {
    setSaving(true);
    setMessage("");
    try {
      if (!updateAvatar) throw new Error("Profile updates are unavailable");
      await updateAvatar(null);
      setMessage("Profile photo removed.");
    } catch {
      setMessage("TripSync could not remove your photo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="profile-photo-card" aria-label="Profile photo">
      <Avatar name={user.displayName} photo={user.avatarDataUrl} size="large" />
      <div>
        <strong>{user.displayName}</strong>
        <span>{user.email}</span>
        <div className="profile-photo-actions">
          <button className="text-button" disabled={saving} type="button" onClick={() => inputRef.current?.click()}>
            {saving ? "Saving…" : user.avatarDataUrl ? "Change photo" : "Add photo"}
          </button>
          {user.avatarDataUrl ? <button className="text-button danger-text" disabled={saving} type="button" onClick={() => void removePhoto()}>Remove</button> : null}
        </div>
        <input ref={inputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void choosePhoto(event)} />
        {message ? <small role="status">{message}</small> : null}
      </div>
    </section>
  );
}

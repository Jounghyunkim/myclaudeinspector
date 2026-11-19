import { UpdateSettings } from "./update-settings";

export const metadata = { title: "설정 — My Claude Inspector" };

export default function AppSettings() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="font-heading text-[1.3em] font-semibold">설정</h1>
      <UpdateSettings />
    </div>
  );
}

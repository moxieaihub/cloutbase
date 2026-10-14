import { UniversityHeader } from "@/features/university/components/UniversityHeader";
import {
  UniversityMobileTabs,
  UniversitySidebar,
} from "@/features/university/components/UniversitySidebar";

export function UniversityShell({
  children,
  hideTabs = false,
}: {
  children: React.ReactNode;
  /** Hides the phone tab row on course/classroom pages. The desktop sidebar always shows. */
  hideTabs?: boolean;
}) {
  return (
    <div className="min-h-screen">
      <UniversityHeader />

      <div className="mx-auto w-full max-w-md px-6 pb-28 pt-8 md:max-w-3xl md:px-8 lg:grid lg:max-w-6xl lg:grid-cols-[220px_1fr] lg:gap-10 lg:px-12 lg:pb-12 lg:pt-10">
        <UniversitySidebar />

        <main className="min-w-0">
          {hideTabs ? null : <UniversityMobileTabs />}
          {children}
        </main>
      </div>
    </div>
  );
}
